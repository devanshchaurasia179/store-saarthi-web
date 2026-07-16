/**
 * src/controllers/print.controller.js
 *
 * Endpoints:
 *   POST /api/print/test          — test receipt (no auth needed)
 *   POST /api/print/bill/:billId  — fetch bill from DB, decrypt, print (auth required)
 *
 * Strategy: plain-text receipt → .txt + .ps1 temp files
 *           → PowerShell PrintDocument (zero margins, X=5)
 *           → cleanup temp files after print
 */

import { exec }          from "child_process";
import fs                from "fs";
import path              from "path";
import { fileURLToPath } from "url";

import Bill     from "../models/Bill.js";
import Shop     from "../models/Shop.js";
import Customer from "../models/Customer.js";
import { decrypt } from "../utils/encrypt.js";
import { buildReceiptText } from "../utils/textGenerator.js";

// ── __dirname shim for ES modules ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// temp/ at Backend project root (two levels up from src/controllers/)
const TEMP_DIR = path.join(__dirname, "../../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const PRINTER_NAME = process.env.PRINTER_NAME || "POS58 Printer";

// ── Decrypt all encrypted bill fields ────────────────────────────────────────
const ENCRYPTED_FIELDS = ["items", "subTotal", "discount", "taxPercentage", "totalAmount", "paidAmount"];

function decryptBill(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject({ virtuals: true }) : { ...doc };
  for (const field of ENCRYPTED_FIELDS) {
    if (obj[field] == null) continue;
    obj[field] = decrypt(obj[field]);
  }
  return obj;
}

// ── PowerShell: 10pt body, content block centered on 58mm roll ───────────────
function buildPsScript(printerName, txtPath) {
  const safeTxt = txtPath.replace(/\\/g, "\\\\");
  // Must match COL in textGenerator.js
  const COL = 20;
  return `
Add-Type -AssemblyName System.Drawing

$printerName = '${printerName}'
$filePath    = '${safeTxt}'
$colWidth    = ${COL}
$lines       = [System.IO.File]::ReadAllLines($filePath)
$idx         = 0

$fontRegular = New-Object System.Drawing.Font('Courier New', 10, [System.Drawing.FontStyle]::Regular)
$fontBold    = New-Object System.Drawing.Font('Courier New', 10, [System.Drawing.FontStyle]::Bold)
$fontHeader  = New-Object System.Drawing.Font('Courier New', 11, [System.Drawing.FontStyle]::Bold)
$brush       = [System.Drawing.Brushes]::Black
$fmt         = New-Object System.Drawing.StringFormat
$fmt.Trimming = [System.Drawing.StringTrimming]::None
$fmt.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap

$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.PrinterName = $printerName
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

$pd.add_PrintPage({
    param($sender, $e)
    $y     = [float]4
    $pageH = [float]($e.MarginBounds.Height)
    if ($pageH -le 0) { $pageH = [float]($e.PageBounds.Height) }
    $pageW = [float]($e.MarginBounds.Width)
    if ($pageW -le 0) { $pageW = [float]($e.PageBounds.Width) }

    # Center the fixed-width receipt block on the paper
    $sample   = '0' * $colWidth
    $contentW = [float]($e.Graphics.MeasureString($sample, $fontRegular).Width)
    $x        = [float]([Math]::Max(0, ($pageW - $contentW) / 2.0))
    $maxW     = [float]($contentW + 2)

    while ($idx -lt $lines.Length) {
        $raw = $lines[$idx]
        $font = $fontRegular
        $text = $raw
        if ($raw.StartsWith('!H!')) {
            $font = $fontHeader
            $text = $raw.Substring(3)
        } elseif ($raw.StartsWith('!B!')) {
            $font = $fontBold
            $text = $raw.Substring(3)
        }
        $lh = [float]($font.GetHeight($e.Graphics)) + 1
        $rect = New-Object System.Drawing.RectangleF($x, $y, $maxW, $lh)
        $e.Graphics.DrawString($text, $font, $brush, $rect, $fmt)
        $y   += $lh
        $idx += 1
        if (($y + $lh) -gt ($pageH - 4)) {
            $e.HasMorePages = $true
            break
        }
    }
})

$pd.Print()
$fontRegular.Dispose()
$fontBold.Dispose()
$fontHeader.Dispose()
$pd.Dispose()
`;
}

// ── Write files → run PS1 → cleanup ──────────────────────────────────────────
function sendToPrinter(txtPath, text) {
  return new Promise((resolve, reject) => {
    const ps1Path = txtPath.replace(/\.txt$/, ".ps1");

    const cleanup = () => {
      [txtPath, ps1Path].forEach((f) => {
        fs.unlink(f, (e) => {
          if (e) console.warn("[print] Could not delete temp file:", e.message);
        });
      });
    };

    fs.writeFile(ps1Path, buildPsScript(PRINTER_NAME, txtPath), "utf8", (psErr) => {
      if (psErr) return reject(psErr);

      fs.writeFile(txtPath, text, "utf8", (txtErr) => {
        if (txtErr) { cleanup(); return reject(txtErr); }

        const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${ps1Path}"`;
        console.log("[print] Sending to printer:", PRINTER_NAME);

        exec(cmd, (execErr, stdout, stderr) => {
          cleanup();
          if (execErr) {
            console.error("[print] exec error:", execErr.message);
            if (stderr) console.error("[print] stderr:", stderr);
            return reject(new Error(stderr || execErr.message));
          }
          if (stdout) console.log("[print] stdout:", stdout);
          console.log("[print] Done");
          resolve();
        });
      });
    });
  });
}

// ── POST /api/print/test ──────────────────────────────────────────────────────
export const printTest = async (req, res) => {
  console.log("[print] /test called");
  const txtPath = path.join(TEMP_DIR, `test-${Date.now()}.txt`);
  try {
    await sendToPrinter(txtPath, buildReceiptText(null));
    return res.json({ success: true, message: "Test receipt printed" });
  } catch (err) {
    console.error("[print] Failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/print/bill/:billId ──────────────────────────────────────────────
// Protected — req.user is the authenticated shop (set by protectRoute middleware)
export const printBillById = async (req, res) => {
  const { billId } = req.params;
  console.log("[print] /bill/:billId called →", billId);

  try {
    // 1. Fetch bill — must belong to this shop
    const rawBill = await Bill.findOne({ _id: billId, shopId: req.user._id });
    if (!rawBill) {
      return res.status(404).json({ success: false, error: "Bill not found" });
    }

    // 2. Decrypt all encrypted fields
    const bill = decryptBill(rawBill);

    // 3. Fetch shop name
    const shop = await Shop.findById(req.user._id).select("shopName");

    // 4. Fetch customer name (optional — bill may have no customer)
    let customerName = null;
    if (bill.customerId) {
      const customer = await Customer.findById(bill.customerId).select("name");
      if (customer) customerName = customer.name;
    }

    // 5. Build receipt data
    const receiptData = {
      shopName:     shop?.shopName || "StoreSaarthi",
      customerName,
      billNumber:   bill.dailyBillNumber,
      createdAt:    bill.createdAt,
      items: (bill.items || []).map((item) => ({
        name:  item.name,
        qty:   item.quantity,
        price: item.price,
        total: item.total,
        unit:  item.unit,
      })),
      subtotal:    bill.subTotal,
      discount:    bill.discount    || 0,
      tax:         bill.taxPercentage || 0,
      total:       bill.totalAmount,
      paid:        bill.paidAmount,
      paymentMode: bill.paymentMode,
      paymentStatus: bill.paymentStatus,
    };

    // 6. Build text and print
    const text    = buildReceiptText(receiptData);
    const txtPath = path.join(TEMP_DIR, `bill-${billId}-${Date.now()}.txt`);
    await sendToPrinter(txtPath, text);

    return res.json({ success: true, message: "Bill printed successfully" });
  } catch (err) {
    console.error("[print] Failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

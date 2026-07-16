/**
 * index.js
 * Print-agent HTTP server.
 *
 * Strategy: build plain-text receipt → write temp .txt + .ps1 files
 *           → execute PowerShell script that uses .NET PrintDocument
 *           → zero margins, draws from X=5 so output is left-aligned
 *             on the 58 mm thermal roll.
 */

const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const fs       = require("fs");
const { exec } = require("child_process");

const config           = require("./config");
const buildReceiptText = require("./utils/textGenerator");

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.use((_req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${_req.method} ${_req.path}`);
  next();
});

const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─── Build PowerShell script content ─────────────────────────────────────────
/**
 * 10 pt body; receipt block is horizontally centered on the 58 mm roll.
 * !H! → 11 Bold header, !B! → 10 Bold emphasis.
 * COL must match utils/textGenerator.js
 */
function buildPsScript(printerName, txtPath) {
  const safeTxt = txtPath.replace(/\\/g, "\\\\");
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

// ─── Core print helper ────────────────────────────────────────────────────────
/**
 * Writes receipt text + a .ps1 helper script to temp/,
 * executes the script to print via .NET PrintDocument,
 * then deletes both temp files.
 *
 * @param {string} txtPath  Full path for the temp .txt receipt file.
 * @param {string} text     Plain-text receipt content.
 * @returns {Promise<void>}
 */
function sendToPrinter(txtPath, text) {
  return new Promise((resolve, reject) => {
    const printerName = config.PRINTER_NAME;
    const ps1Path     = txtPath.replace(/\.txt$/, ".ps1");

    const cleanup = () => {
      [txtPath, ps1Path].forEach((f) => {
        fs.unlink(f, (e) => {
          if (e) console.warn("Could not delete temp file:", e.message);
        });
      });
    };

    // 1. Write the .ps1 script
    const psContent = buildPsScript(printerName, txtPath);
    fs.writeFile(ps1Path, psContent, "utf8", (psErr) => {
      if (psErr) return reject(psErr);

      // 2. Write the .txt receipt
      fs.writeFile(txtPath, text, "utf8", (txtErr) => {
        if (txtErr) { cleanup(); return reject(txtErr); }

        // 3. Execute the script
        const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${ps1Path}"`;
        console.log("Sending to printer:", printerName);

        exec(cmd, (execErr, stdout, stderr) => {
          cleanup();

          if (execErr) {
            console.error("exec error:", execErr.message);
            if (stderr) console.error("stderr:", stderr);
            return reject(new Error(stderr || execErr.message));
          }

          if (stdout) console.log("powershell stdout:", stdout);
          console.log("Print completed");
          resolve();
        });
      });
    });
  });
}

// ─── POST /print-test ─────────────────────────────────────────────────────────
app.post("/print-test", async (req, res) => {
  console.log("--- /print-test ---");
  const txtPath = path.join(TEMP_DIR, "test-receipt.txt");
  try {
    const text = buildReceiptText(null);
    console.log("Receipt text built");
    await sendToPrinter(txtPath, text);
    return res.json({ success: true, message: "Printed successfully" });
  } catch (err) {
    console.error("Print failed:", err.stack || err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /print-bill ─────────────────────────────────────────────────────────
/**
 * Body (shop/customer aliases supported for older clients):
 * {
 *   "shop" | "shopName", "customer" | "customerName",
 *   "billNumber", "createdAt",
 *   "items": [{ "name", "qty", "price", "total", "unit" }],
 *   "subtotal", "discount", "tax", "total", "paid",
 *   "paymentMode", "paymentStatus"
 * }
 */
app.post("/print-bill", async (req, res) => {
  console.log("--- /print-bill ---");
  const body = req.body;

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ success: false, error: "items array is required and must not be empty" });
  }

  const receiptData = {
    shopName:       body.shopName || body.shop || "StoreSaarthi",
    customerName:   body.customerName || body.customer || null,
    billNumber:     body.billNumber ?? null,
    createdAt:      body.createdAt || new Date().toISOString(),
    items:          body.items,
    subtotal:       body.subtotal ?? body.total,
    discount:       body.discount || 0,
    tax:            body.tax || 0,
    total:          body.total ?? body.subtotal,
    paid:           body.paid ?? body.total ?? body.subtotal,
    paymentMode:    body.paymentMode || null,
    paymentStatus:  body.paymentStatus || "PAID",
  };

  const txtPath = path.join(TEMP_DIR, `bill-${Date.now()}.txt`);
  try {
    const text = buildReceiptText(receiptData);
    console.log("Receipt text built");
    await sendToPrinter(txtPath, text);
    return res.json({ success: true, message: "Printed successfully" });
  } catch (err) {
    console.error("Print failed:", err.stack || err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled:", err.stack);
  res.status(500).json({ success: false, error: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  console.log("─────────────────────────────────────");
  console.log(`  print-agent started`);
  console.log(`  http://localhost:${config.PORT}`);
  console.log(`  Printer : ${config.PRINTER_NAME}`);
  console.log("─────────────────────────────────────");
});

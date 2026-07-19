/**
 * server/index.js
 * Express HTTP print server – runs as a forked child process.
 *
 * Communication with the Electron main process happens via process.send()
 * and process.on("message", ...).
 *
 * Config is read fresh on every print request so the user can change the
 * printer without restarting the server.
 */

const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const fs       = require("fs");
const { exec } = require("child_process");

const buildReceiptText = require("./textGenerator");

// ─── Resolve paths passed from the main process ───────────────────────────────
const CONFIG_FILE = process.env.PRINT_AGENT_CONFIG
  || path.join(__dirname, "..", "config", "config.json");

const LOGS_DIR = process.env.PRINT_AGENT_LOGS
  || path.join(__dirname, "..", "logs");

// ─── Logger (server-side, writes to same log file) ───────────────────────────
const logger = require("./logger")({ logsDir: LOGS_DIR });

// ─── Config helpers ───────────────────────────────────────────────────────────
function loadConfig() {
  const defaults = { printerName: "", port: 4000, fontSize: 10 };
  if (!fs.existsSync(CONFIG_FILE)) return defaults;
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) };
  } catch {
    return defaults;
  }
}

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

const TEMP_DIR = path.join(__dirname, "..", "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─── PowerShell print script builder ─────────────────────────────────────────
/**
 * Builds the PowerShell script content that prints a receipt via .NET PrintDocument.
 * 10 pt body; content is horizontally centered on the 58 mm roll.
 * !H! → 11pt Bold header  |  !B! → 10pt Bold emphasis
 */
function buildPsScript(printerName, txtPath) {
  const safeTxt = txtPath.replace(/\\/g, "\\\\");
  const COL = 20;

  return `
Add-Type -AssemblyName System.Drawing

$printerName = '${printerName.replace(/'/g, "''")}'
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

    $sample   = '0' * $colWidth
    $contentW = [float]($e.Graphics.MeasureString($sample, $fontRegular).Width)
    $x        = [float]([Math]::Max(0, ($pageW - $contentW) / 2.0))
    $maxW     = [float]($contentW + 2)

    while ($idx -lt $lines.Length) {
        $raw  = $lines[$idx]
        $font = $fontRegular
        $text = $raw
        if ($raw.StartsWith('!H!')) {
            $font = $fontHeader
            $text = $raw.Substring(3)
        } elseif ($raw.StartsWith('!B!')) {
            $font = $fontBold
            $text = $raw.Substring(3)
        }
        $lh   = [float]($font.GetHeight($e.Graphics)) + 1
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
 * Writes receipt text + a .ps1 helper to temp/, executes it, then cleans up.
 *
 * @param {string} txtPath  Path for the temporary .txt file
 * @param {string} text     Plain-text receipt content
 * @returns {Promise<void>}
 */
function sendToPrinter(txtPath, text) {
  return new Promise((resolve, reject) => {
    const cfg         = loadConfig();        // fresh read every time
    const printerName = cfg.printerName;
    const ps1Path     = txtPath.replace(/\.txt$/, ".ps1");

    if (!printerName) {
      return reject(new Error("No printer configured. Please select a printer in the Print Agent window."));
    }

    const cleanup = () => {
      [txtPath, ps1Path].forEach((f) => {
        fs.unlink(f, (e) => {
          if (e) logger.warn("Could not delete temp file: " + e.message);
        });
      });
    };

    const psContent = buildPsScript(printerName, txtPath);

    fs.writeFile(ps1Path, psContent, "utf8", (psErr) => {
      if (psErr) return reject(psErr);

      fs.writeFile(txtPath, text, "utf8", (txtErr) => {
        if (txtErr) { cleanup(); return reject(txtErr); }

        const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${ps1Path}"`;
        logger.info(`Sending to printer: ${printerName}`);

        exec(cmd, (execErr, stdout, stderr) => {
          cleanup();

          if (execErr) {
            logger.error("Print exec error: " + execErr.message);
            if (stderr) logger.error("stderr: " + stderr);
            // Notify Electron main
            if (process.send) process.send({ type: "print:failure", error: stderr || execErr.message });
            return reject(new Error(stderr || execErr.message));
          }

          if (stdout) logger.info("PS stdout: " + stdout.trim());
          logger.info("Print completed successfully");
          // Notify Electron main
          if (process.send) process.send({ type: "print:success" });
          resolve();
        });
      });
    });
  });
}

// ─── POST /print-test ─────────────────────────────────────────────────────────
app.post("/print-test", async (req, res) => {
  logger.info("--- /print-test ---");
  const txtPath = path.join(TEMP_DIR, `test-${Date.now()}.txt`);
  try {
    const text = buildReceiptText(null);
    await sendToPrinter(txtPath, text);
    return res.json({ success: true, message: "Printed successfully" });
  } catch (err) {
    logger.error("Print-test failed: " + err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /print-bill ─────────────────────────────────────────────────────────
/**
 * Expected body (shop/customer aliases supported for older clients):
 * {
 *   "shop" | "shopName", "customer" | "customerName",
 *   "billNumber", "createdAt",
 *   "items": [{ "name", "qty", "price", "total", "unit" }],
 *   "subtotal", "discount", "tax", "total", "paid",
 *   "paymentMode", "paymentStatus"
 * }
 */
app.post("/print-bill", async (req, res) => {
  logger.info("--- /print-bill ---");
  const body = req.body;

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ success: false, error: "items array is required and must not be empty" });
  }

  const receiptData = {
    shopName      : body.shopName      || body.shop     || "StoreSaarthi",
    customerName  : body.customerName  || body.customer || null,
    billNumber    : body.billNumber    ?? null,
    createdAt     : body.createdAt     || new Date().toISOString(),
    items         : body.items,
    subtotal      : body.subtotal      ?? body.total,
    discount      : body.discount      || 0,
    tax           : body.tax           || 0,
    total         : body.total         ?? body.subtotal,
    paid          : body.paid          ?? body.total ?? body.subtotal,
    paymentMode   : body.paymentMode   || null,
    paymentStatus : body.paymentStatus || "PAID",
  };

  const txtPath = path.join(TEMP_DIR, `bill-${Date.now()}.txt`);
  try {
    const text = buildReceiptText(receiptData);
    await sendToPrinter(txtPath, text);
    return res.json({ success: true, message: "Printed successfully" });
  } catch (err) {
    logger.error("Print-bill failed: " + err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /print-kot ───────────────────────────────────────────────────────
/**
 * Print a Kitchen Order Ticket (KOT).
 * Expected body:
 * {
 *   "shopName", "billNumber" (optional), "createdAt",
 *   "items": [{ "name", "qty", "unit" }],
 *   "customerName" (optional), "tableInfo" (optional)
 * }
 */
app.post("/print-kot", async (req, res) => {
  logger.info("--- /print-kot ---");
  const body = req.body;

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ success: false, error: "items array is required and must not be empty" });
  }

  // Build KOT text (simpler than a full receipt)
  const lines = [];
  lines.push("!H!--- KOT ---");
  lines.push("");
  lines.push("!B!" + (body.shopName || "StoreSaarthi"));
  if (body.customerName) lines.push("Customer: " + body.customerName);
  if (body.tableInfo) lines.push("Table: " + body.tableInfo);
  lines.push("Date: " + new Date(body.createdAt || Date.now()).toLocaleString("en-IN"));
  if (body.billNumber) lines.push("Bill #" + body.billNumber);
  lines.push("--------------------");
  lines.push("!B!Item             Qty");
  lines.push("--------------------");

  for (const item of body.items) {
    const name = (item.name || "").substring(0, 14).padEnd(14);
    const qty  = String(item.qty || 1) + (item.unit ? " " + item.unit : "");
    lines.push(name + "  " + qty);
  }

  lines.push("--------------------");
  lines.push("Total items: " + body.items.length);
  lines.push("");
  lines.push("!H!--- END KOT ---");
  lines.push("");

  const text = lines.join("\n");
  const txtPath = path.join(TEMP_DIR, `kot-${Date.now()}.txt`);

  try {
    await sendToPrinter(txtPath, text);
    return res.json({ success: true, message: "KOT printed successfully" });
  } catch (err) {
    logger.error("Print-kot failed: " + err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error("Unhandled: " + err.stack);
  res.status(500).json({ success: false, error: err.message });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const cfg  = loadConfig();
const PORT = cfg.port || 4000;

app.listen(PORT, () => {
  logger.info(`Express server running on http://localhost:${PORT}`);
  logger.info(`Printer: ${cfg.printerName || "(not configured)"}`);

  // Notify the Electron main process that we are ready
  if (process.send) process.send({ type: "server:ready", port: PORT });
});

// ─── Listen for messages from Electron main process ───────────────────────────
process.on("message", (msg) => {
  if (!msg || typeof msg !== "object") return;

  switch (msg.type) {
    case "config:reload":
      // Config was changed; next print will pick it up automatically since
      // we call loadConfig() fresh inside sendToPrinter.
      logger.info("Config reload signal received");
      break;

    case "trigger:testPrint": {
      // Tray menu "Test Print" clicked
      const txtPath = path.join(TEMP_DIR, `tray-test-${Date.now()}.txt`);
      const text    = buildReceiptText(null);
      sendToPrinter(txtPath, text).catch((e) => {
        logger.error("Tray test print failed: " + e.message);
      });
      break;
    }
  }
});

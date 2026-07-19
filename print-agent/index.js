/**
 * index.js
 * StoreSaarthi Print Agent — standalone headless server.
 *
 * Packaged with `pkg` into a single Windows exe (dist/print-agent.exe).
 * Can also be run directly with `node index.js` for development.
 *
 * Startup flow:
 *  1. Locate config.json next to the running exe (or cwd in dev).
 *  2. If config.json exists → load it and start the server.
 *  3. If config.json is missing AND we have an interactive console (isTTY)
 *     → run first-time setup: list printers, ask for selection, save config.
 *  4. If config.json is missing AND no interactive console (running as a
 *     headless Windows Service via NSSM) → write error log and exit(1).
 */

"use strict";

const express    = require("express");
const cors       = require("cors");
const path       = require("path");
const fs         = require("fs");
const readline   = require("readline");
const { exec }   = require("child_process");
const QRCode     = require("qrcode");

// ─── Path resolution (works both in dev and when packaged with pkg) ───────────
//
// pkg bundles the source into a snapshot filesystem (e.g. C:\snapshot\...).
// Writing config.json there would be lost on restart.  We must resolve paths
// relative to the directory that contains the exe (process.execPath when
// packaged, or process.cwd() in dev).
//
// process.pkg is set by pkg at runtime; we use it to detect packaged mode.

const IS_PKG = typeof process.pkg !== "undefined";

/**
 * Base directory: next to the exe when packaged, cwd when running via node.
 */
const BASE_DIR = IS_PKG
  ? path.dirname(process.execPath)
  : process.cwd();

const CONFIG_FILE = path.join(BASE_DIR, "config.json");
const LOGS_DIR    = path.join(BASE_DIR, "logs");
const TEMP_DIR    = path.join(BASE_DIR, "temp");

// ─── Ensure runtime directories exist ────────────────────────────────────────
for (const dir of [LOGS_DIR, TEMP_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Simple logger ────────────────────────────────────────────────────────────
/**
 * Writes timestamped lines to both console and a rolling daily log file.
 * NSSM redirects stdout/stderr to files, so console.log/error is sufficient
 * for service logging — we just add structured prefixes for easy grepping.
 */
const logger = {
  _write(level, msg) {
    const ts   = new Date().toISOString();
    const line = `[${ts}] [print-agent] [${level}] ${msg}`;
    if (level === "ERROR") {
      console.error(line);
    } else {
      console.log(line);
    }
    // Also write to a rolling daily file
    try {
      const today = new Date();
      const name  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.log`;
      fs.appendFileSync(path.join(LOGS_DIR, name), line + "\n", "utf8");
    } catch {
      // Best-effort — console already has the line
    }
  },
  info  (msg) { this._write("INFO",  msg); },
  warn  (msg) { this._write("WARN",  msg); },
  error (msg) { this._write("ERROR", msg); },
};

// ─── Config helpers ───────────────────────────────────────────────────────────
const CONFIG_DEFAULTS = { printerName: "", port: 4000 };

/** Load config from disk. Returns defaults if file is missing or malformed. */
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...CONFIG_DEFAULTS };
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    return { ...CONFIG_DEFAULTS, ...JSON.parse(raw) };
  } catch (err) {
    logger.warn(`Could not parse config.json: ${err.message} — using defaults`);
    return { ...CONFIG_DEFAULTS };
  }
}

/** Persist a config object to disk. */
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
  logger.info(`config.json saved → printer="${cfg.printerName}" port=${cfg.port}`);
}

// In-memory config — updated by POST /config without restart
let runtimeConfig = loadConfig();

// ─── Windows printer enumeration ──────────────────────────────────────────────
/**
 * Lists installed Windows printers via PowerShell.
 *
 * Strategy (most-to-least capable):
 *  1. Get-Printer           — PrintManagement module, Win8.1+ / Server 2012+
 *  2. Get-WmiObject Win32_Printer — WMI, available on ALL Windows versions (Win7+)
 *
 * Returns a Promise<string[]> (empty array on failure).
 */
function listPrinters() {
  return new Promise((resolve) => {
    // Single PS script: try Get-Printer first, fall back to WMI.
    // Output is always a JSON array of name strings on stdout.
    const psScript = [
      "try {",
      "  $names = Get-Printer -ErrorAction Stop | Select-Object -ExpandProperty Name",
      "} catch {",
      "  $names = Get-WmiObject Win32_Printer | Select-Object -ExpandProperty Name",
      "}",
      "if ($names -eq $null) { $names = @() }",
      "$arr = @($names) | Where-Object { $_ -ne $null -and $_.Trim() -ne '' }",
      "ConvertTo-Json -InputObject $arr -Compress",
    ].join("; ");

    const cmd = `powershell.exe -NoProfile -NonInteractive -Command "${psScript}"`;
    logger.info("Enumerating printers...");

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        logger.error(`listPrinters error: ${stderr || err.message}`);
        return resolve([]);
      }
      try {
        const raw = stdout.trim();
        if (!raw) return resolve([]);
        const parsed = JSON.parse(raw);
        // PS returns a bare string (not array) when there is exactly one item
        const printers = Array.isArray(parsed) ? parsed : [parsed];
        resolve(printers.filter(Boolean));
      } catch (parseErr) {
        logger.error(`listPrinters parse error: ${parseErr.message}`);
        resolve([]);
      }
    });
  });
}

// ─── First-run interactive setup ──────────────────────────────────────────────
/**
 * Prompts the user to select a printer from the installed list.
 * Saves the selection to config.json and resolves when done.
 * Only called when process.stdin.isTTY === true.
 *
 * @returns {Promise<void>}
 */
async function runFirstTimeSetup() {
  console.log("\n[print-agent] ── FIRST-TIME SETUP ──────────────────────────");
  console.log("[print-agent] config.json not found. Let's set it up.");
  console.log("[print-agent] Detecting installed printers...\n");

  const printers = await listPrinters();

  if (printers.length === 0) {
    console.error("[print-agent] ERROR: No printers found via PowerShell.");
    console.error("[print-agent] Make sure your thermal printer is installed in Windows");
    console.error("[print-agent] (Settings → Bluetooth & devices → Printers & scanners).");
    process.exit(1);
  }

  console.log("[print-agent] Installed printers:");
  printers.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
  console.log("");

  const rl = readline.createInterface({
    input : process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) => {
    const ask = () => {
      rl.question(
        `[print-agent] Enter the number of your thermal printer (1–${printers.length}): `,
        (answer) => {
          const n = parseInt(answer.trim(), 10);
          if (isNaN(n) || n < 1 || n > printers.length) {
            console.log(`[print-agent] Please enter a number between 1 and ${printers.length}.`);
            return ask();
          }
          const chosen = printers[n - 1];
          const cfg = { printerName: chosen, port: CONFIG_DEFAULTS.port };
          try {
            saveConfig(cfg);
            runtimeConfig = cfg;
            console.log(`\n[print-agent] ✓ Printer set to: "${chosen}"`);
            console.log(`[print-agent] ✓ config.json created at: ${CONFIG_FILE}`);
            console.log("[print-agent] ──────────────────────────────────────────\n");
          } catch (writeErr) {
            console.error(`[print-agent] ERROR: Could not write config.json: ${writeErr.message}`);
            process.exit(1);
          }
          rl.close();
          resolve();
        }
      );
    };
    ask();
  });
}

// ─── PowerShell print script builder ─────────────────────────────────────────
/**
 * Generates the .ps1 script that prints a receipt via .NET PrintDocument.
 * 10 pt body; receipt block is horizontally centered on the 58 mm roll.
 * Line prefixes:  !H! → 11 pt Bold header  |  !B! → 10 pt Bold emphasis
 *
 * @param {string} printerName  Exact Windows printer name
 * @param {string} txtPath      Full path to the temp .txt receipt file
 * @returns {string}
 */
function buildPsScript(printerName, txtPath, qrImagePath) {
  // Escape single quotes for PowerShell string literals
  const safePrinter = printerName.replace(/'/g, "''");
  const safeTxt     = txtPath.replace(/\\/g, "\\\\");
  const COL         = 20;

  // QR image path for PowerShell (only included if QR exists)
  const safeQrPath  = qrImagePath ? qrImagePath.replace(/\\/g, "\\\\") : "";

  return `
Add-Type -AssemblyName System.Drawing

$printerName = '${safePrinter}'
$filePath    = '${safeTxt}'
$qrPath      = '${safeQrPath}'
$colWidth    = ${COL}
$lines       = [System.IO.File]::ReadAllLines($filePath)
$idx         = 0

$fontRegular = New-Object System.Drawing.Font('Courier New', 10, [System.Drawing.FontStyle]::Regular)
$fontBold    = New-Object System.Drawing.Font('Courier New', 10, [System.Drawing.FontStyle]::Bold)
$fontHeader  = New-Object System.Drawing.Font('Courier New', 11, [System.Drawing.FontStyle]::Bold)
$brush       = [System.Drawing.Brushes]::Black
$fmt         = New-Object System.Drawing.StringFormat
$fmt.Trimming    = [System.Drawing.StringTrimming]::None
$fmt.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap

# Load QR image if path provided
$qrImage = $null
if ($qrPath -and (Test-Path $qrPath)) {
    $qrImage = [System.Drawing.Image]::FromFile($qrPath)
}

$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.PrinterName     = $printerName
$pd.DefaultPageSettings.Margins     = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

$pd.add_PrintPage({
    param($sender, $e)

    $y     = [float]4
    $pageH = [float]10000
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

        # Handle QR code marker line — draw the QR image instead of text
        if ($raw.StartsWith('!QR!')) {
            if ($qrImage) {
                # Draw QR image centered on paper
                $qrSize = [int][Math]::Min(100, $pageW - 20)
                $qrX    = [int](($pageW - $qrSize) / 2)
                $destRect = New-Object System.Drawing.Rectangle($qrX, [int]$y, $qrSize, $qrSize)
                $e.Graphics.DrawImage($qrImage, $destRect)
                $y += ($qrSize + 4)
            }
            $idx += 1
            continue
        }

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
if ($qrImage) { $qrImage.Dispose() }
$pd.Dispose()
`;
}

// ─── Core print helper ────────────────────────────────────────────────────────
/**
 * Writes the receipt text + a generated .ps1 script to TEMP_DIR,
 * executes the script to print via .NET PrintDocument, then cleans up.
 *
 * @param {string} txtPath      Absolute path for the temp .txt file
 * @param {string} text         Plain-text receipt content
 * @param {string} [qrImagePath]  Optional QR code PNG path
 * @returns {Promise<void>}
 */
function sendToPrinter(txtPath, text, qrImagePath) {
  return new Promise((resolve, reject) => {
    const printerName = runtimeConfig.printerName;

    if (!printerName) {
      return reject(new Error(
        "No printer configured. POST /config with { printerName } or restart after setting config.json."
      ));
    }

    const ps1Path = txtPath.replace(/\.txt$/, ".ps1");

    const cleanup = () => {
      const filesToClean = [txtPath, ps1Path];
      if (qrImagePath) filesToClean.push(qrImagePath);
      for (const f of filesToClean) {
        fs.unlink(f, (e) => {
          if (e) logger.warn(`Could not delete temp file ${f}: ${e.message}`);
        });
      }
    };

    const psContent = buildPsScript(printerName, txtPath, qrImagePath || null);

    // Write .ps1 first, then .txt, then execute
    fs.writeFile(ps1Path, psContent, "utf8", (psErr) => {
      if (psErr) return reject(psErr);

      fs.writeFile(txtPath, text, "utf8", (txtErr) => {
        if (txtErr) {
          cleanup();
          return reject(txtErr);
        }

        const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${ps1Path}"`;
        logger.info(`Sending to printer: "${printerName}"`);

        exec(cmd, (execErr, stdout, stderr) => {
          cleanup();

          if (execErr) {
            logger.error(`Print exec error: ${execErr.message}`);
            if (stderr) logger.error(`stderr: ${stderr.trim()}`);
            return reject(new Error(stderr || execErr.message));
          }

          if (stdout) logger.info(`PS stdout: ${stdout.trim()}`);
          logger.info("Print completed successfully");
          resolve();
        });
      });
    });
  });
}

// ─── Receipt text builder (re-uses server/textGenerator.js if available) ──────
/**
 * When packaged with pkg, server/textGenerator.js is bundled.
 * Falls back to an inline minimal builder so the standalone exe works
 * even if the file tree differs.
 */
let buildReceiptText;
try {
  // Works in both dev (relative path) and pkg (bundled snapshot)
  buildReceiptText = require("./server/textGenerator");
} catch {
  // Minimal inline fallback
  buildReceiptText = (data) => {
    if (!data) {
      return [
        "!H!  StoreSaarthi  ",
        "   TEST PRINT   ",
        "--------------------",
        "Test receipt",
        "--------------------",
        "    Thank you!      ",
        "",
        "",
      ].join("\r\n");
    }
    const lines = [];
    lines.push(`!H!${data.shopName || "StoreSaarthi"}`);
    lines.push("--------------------");
    (data.items || []).forEach((it) => {
      lines.push(`${it.name}  x${it.qty}  ${it.total}`);
    });
    lines.push("--------------------");
    lines.push(`TOTAL  ${data.total}`);
    lines.push("");
    lines.push("");
    return lines.join("\r\n");
  };
}

// ─── QR Code generation helper ────────────────────────────────────────────────
/**
 * Generates a UPI QR code as a PNG file.
 *
 * @param {string} upiId   The UPI ID (e.g. "shop@upi")
 * @param {string} shopName  The shop name for the payee
 * @param {number} amount  The amount to pay
 * @param {string} outPath  File path to write the PNG
 * @returns {Promise<string>} resolves with outPath on success
 */
async function generateUpiQr(upiId, shopName, amount, outPath) {
  // Build standard UPI deep link URI
  const params = new URLSearchParams({
    pa: upiId,
    pn: shopName || "StoreSaarthi",
    am: String(amount || 0),
    cu: "INR",
  });
  const upiUri = `upi://pay?${params.toString()}`;

  await QRCode.toFile(outPath, upiUri, {
    type: "png",
    width: 150,          // 150px wide — compact QR for 58mm roll
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return outPath;
}

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  logger.info(`→ ${req.method} ${req.path}`);
  next();
});

// ── GET / — health check ──────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    success     : true,
    service     : "StoreSaarthi Print Agent",
    version     : "2.0.0",
    printer     : runtimeConfig.printerName || "(not configured)",
    port        : runtimeConfig.port,
    configFile  : CONFIG_FILE,
    uptime      : Math.floor(process.uptime()) + "s",
  });
});

// ── GET /printers — list all installed Windows printers ───────────────────────
app.get("/printers", async (_req, res) => {
  logger.info("Listing installed printers");
  try {
    const printers = await listPrinters();
    logger.info(`Found ${printers.length} printer(s)`);
    return res.json({ success: true, printers });
  } catch (err) {
    logger.error(`GET /printers error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /config — update printer name (no restart needed) ───────────────────
app.post("/config", (req, res) => {
  const { printerName, port } = req.body || {};

  if (printerName !== undefined && typeof printerName !== "string") {
    return res.status(400).json({ success: false, error: "printerName must be a string" });
  }

  const updated = {
    printerName : printerName !== undefined ? printerName.trim() : runtimeConfig.printerName,
    port        : port        !== undefined ? Number(port)        : runtimeConfig.port,
  };

  try {
    saveConfig(updated);
    runtimeConfig = updated;
    logger.info(`Config updated via API → printer="${updated.printerName}" port=${updated.port}`);
    return res.json({ success: true, config: updated });
  } catch (err) {
    logger.error(`POST /config write error: ${err.message}`);
    return res.status(500).json({ success: false, error: `Could not save config.json: ${err.message}` });
  }
});

// ── POST /print-test — send a test receipt to the printer ─────────────────────
app.post("/print-test", async (_req, res) => {
  logger.info("--- /print-test ---");
  const txtPath = path.join(TEMP_DIR, `test-${Date.now()}.txt`);
  try {
    const text = buildReceiptText(null);
    logger.info("Test receipt text built");
    await sendToPrinter(txtPath, text);
    return res.json({ success: true, message: "Test receipt printed successfully" });
  } catch (err) {
    logger.error(`/print-test failed: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /print-bill — print a real bill ──────────────────────────────────────
/**
 * Body:
 * {
 *   "shopName"      | "shop",
 *   "customerName"  | "customer",
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
    return res.status(400).json({
      success: false,
      error: "items array is required and must not be empty",
    });
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
    upiId         : body.upiId         || null,
  };

  const ts      = Date.now();
  const txtPath = path.join(TEMP_DIR, `bill-${ts}.txt`);
  let qrPath    = null;

  try {
    // Generate UPI QR code if upiId is provided
    if (receiptData.upiId) {
      qrPath = path.join(TEMP_DIR, `qr-${ts}.png`);
      await generateUpiQr(
        receiptData.upiId,
        receiptData.shopName,
        receiptData.total,
        qrPath,
      );
      logger.info(`UPI QR generated → ${qrPath}`);
    }

    const text = buildReceiptText(receiptData);
    logger.info("Bill receipt text built");
    await sendToPrinter(txtPath, text, qrPath);
    return res.json({ success: true, message: "Bill printed successfully" });
  } catch (err) {
    logger.error(`/print-bill failed: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── KOT helpers ───────────────────────────────────────────────────────────────
function centre(text, width) {
  text = String(text);
  if (text.length >= width) return text.substring(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return (" ".repeat(pad) + text).padEnd(width);
}

// ── POST /print-kot — Kitchen Order Ticket ───────────────────────────────────
/**
 * Body:
 * {
 *   "shopName", "billNumber", "createdAt",
 *   "items": [{ "name", "qty", "unit" }],
 *   "customerName", "tableInfo"
 * }
 */
app.post("/print-kot", async (req, res) => {
  logger.info("--- /print-kot ---");
  const body = req.body;

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: "items array is required and must not be empty",
    });
  }

  const COL = 20;
  const DIVIDER = "-".repeat(COL);

  // Build KOT receipt text
  const lines = [];
  const shop = String(body.shopName || "StoreSaarthi").trim();
  lines.push(`!H!${centre(shop, COL)}`);
  lines.push(`!B!${centre("-- KOT --", COL)}`);
  lines.push(DIVIDER);

  if (body.billNumber != null) {
    lines.push(`Bill #${body.billNumber}`);
  }

  const dt = body.createdAt ? new Date(body.createdAt) : new Date();
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  let h = dt.getHours();
  const min = String(dt.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  lines.push(`${dd}/${mm}/${yy}  ${h}:${min}${ap}`);

  if (body.customerName) {
    lines.push(`Cust: ${body.customerName}`);
  }
  if (body.tableInfo) {
    lines.push(`Table: ${body.tableInfo}`);
  }

  lines.push(DIVIDER);
  lines.push(`!B!${"Item".padEnd(COL - 4)}Qty`);
  lines.push(DIVIDER);

  (body.items || []).forEach((item) => {
    const name = String(item.name || "Item");
    const qty = Number(item.qty) || 1;
    const unit = item.unit ? ` ${item.unit}` : "";
    const qtyStr = `${qty}${unit}`;
    const maxName = COL - qtyStr.length - 1;
    const displayName = name.length > maxName ? name.substring(0, maxName) : name;
    const spaces = Math.max(1, COL - displayName.length - qtyStr.length);
    lines.push(displayName + " ".repeat(spaces) + qtyStr);
  });

  lines.push(DIVIDER);
  lines.push(centre("** KITCHEN COPY **", COL));
  // Feed lines for paper cut
  lines.push("");
  lines.push("");
  lines.push("");
  lines.push("");
  lines.push("");

  const text = lines.join("\r\n");

  const ts = Date.now();
  const txtPath = path.join(TEMP_DIR, `kot-${ts}.txt`);

  try {
    await sendToPrinter(txtPath, text);
    return res.json({ success: true, message: "KOT printed successfully" });
  } catch (err) {
    logger.error(`/print-kot failed: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `${req.method} ${req.path} — route not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(`Unhandled express error: ${err.stack || err.message}`);
  res.status(500).json({ success: false, error: err.message });
});

// ─── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  logger.info("Starting StoreSaarthi Print Agent...");
  logger.info(`Mode: ${IS_PKG ? "packaged (pkg)" : "development (node)"}`);
  logger.info(`Base dir: ${BASE_DIR}`);
  logger.info(`Config file: ${CONFIG_FILE}`);
  logger.info(`Logs dir: ${LOGS_DIR}`);

  const configExists = fs.existsSync(CONFIG_FILE);

  if (!configExists) {
    // ── Case A: interactive console → first-time setup ──────────────────────
    if (process.stdin.isTTY) {
      await runFirstTimeSetup();
    } else {
      // ── Case B: headless service, no config → fail fast ─────────────────
      const msg = [
        "[print-agent] FATAL: config.json not found and no interactive console available.",
        "[print-agent] This agent must be run manually ONCE before being installed as a service.",
        "[print-agent] Steps:",
        "[print-agent]   1. Copy print-agent.exe to C:\\print-agent\\",
        "[print-agent]   2. Run it from a Command Prompt: print-agent.exe",
        "[print-agent]   3. Select your printer from the numbered list.",
        "[print-agent]   4. Confirm config.json was created in C:\\print-agent\\",
        "[print-agent]   5. Then install as a Windows Service (see README.md).",
        `[print-agent] Expected config location: ${CONFIG_FILE}`,
      ].join("\n");

      console.error(msg);

      // Write to a dedicated error.log so NSSM's service log is clear
      try {
        const errorLog = path.join(LOGS_DIR, "error.log");
        const ts       = new Date().toISOString();
        fs.appendFileSync(
          errorLog,
          `\n[${ts}] FATAL STARTUP ERROR\n${msg}\n`,
          "utf8"
        );
        console.error(`[print-agent] Error details written to: ${errorLog}`);
      } catch {
        // Can't write log — stderr already has the message
      }

      process.exit(1);
    }
  }

  // Config is now guaranteed to exist — (re)load it
  runtimeConfig = loadConfig();

  const PORT = runtimeConfig.port || 4000;

  app.listen(PORT, () => {
    logger.info("─────────────────────────────────────────");
    logger.info("  StoreSaarthi Print Agent started");
    logger.info(`  http://localhost:${PORT}`);
    logger.info(`  Printer : ${runtimeConfig.printerName || "(not set — POST /config to configure)"}`);
    logger.info(`  Config  : ${CONFIG_FILE}`);
    logger.info("─────────────────────────────────────────");
  });
}

main().catch((err) => {
  logger.error(`Fatal startup error: ${err.stack || err.message}`);
  process.exit(1);
});

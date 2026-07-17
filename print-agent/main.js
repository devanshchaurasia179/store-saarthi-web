/**
 * main.js
 * Electron main process for StoreSaarthi Print Agent.
 *
 * Responsibilities:
 *  - Create & manage the BrowserWindow (the UI)
 *  - Manage the system tray icon + menu
 *  - Start the Express print server in a worker thread
 *  - Handle all IPC calls from the renderer (UI) process
 *  - Manage config.json reads/writes
 *  - Handle Windows auto-start via the registry
 *  - Emit real-time stats back to the renderer
 */

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  dialog,
  shell,
} = require("electron");
const path   = require("path");
const fs     = require("fs");
const { exec } = require("child_process");

// ─── Paths ────────────────────────────────────────────────────────────────────
// In production (packaged) the app.getPath("exe") dir is the install folder.
// We store config next to the exe so it survives updates.
const IS_PACKAGED = app.isPackaged;

const CONFIG_DIR = IS_PACKAGED
  ? path.join(path.dirname(app.getPath("exe")), "config")
  : path.join(__dirname, "config");

const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const LOGS_DIR    = IS_PACKAGED
  ? path.join(path.dirname(app.getPath("exe")), "logs")
  : path.join(__dirname, "logs");

// Ensure folders exist
[CONFIG_DIR, LOGS_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── Logger ───────────────────────────────────────────────────────────────────
const logger = require("./server/logger")({ logsDir: LOGS_DIR });

// ─── Config helpers ───────────────────────────────────────────────────────────
/**
 * Load config from disk. Merges with defaults so missing keys are safe.
 */
function loadConfig() {
  const defaults = { printerName: "", port: 4000, autoStart: false, fontSize: 10 };
  if (!fs.existsSync(CONFIG_FILE)) return defaults;
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch (err) {
    logger.warn("Could not read config.json, using defaults. " + err.message);
    return defaults;
  }
}

/**
 * Persist config to disk.
 * @param {object} cfg
 */
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
}

// ─── Print-server state ───────────────────────────────────────────────────────
let serverProcess = null;   // child_process for the Express server
let printStats = {
  lastPrintTime : null,
  successCount  : 0,
  failureCount  : 0,
  serverRunning : false,
  printerOnline : null,   // true / false / null (unknown)
};

// ─── Start Express server ─────────────────────────────────────────────────────
/**
 * Spawns the Express print server as a child process.
 * The server file reads config.json on every request so changes take effect
 * immediately without restarting.
 */
function startServer() {
  if (serverProcess) return;   // already running

  // In a packaged app, files in asarUnpack live at app.asar.unpacked/
  // instead of inside app.asar. We must spawn from there so Node can load
  // express/cors natively.
  const serverEntry = IS_PACKAGED
    ? path.join(process.resourcesPath, "app.asar.unpacked", "server", "index.js")
    : path.join(__dirname, "server", "index.js");

  // Pass paths as environment variables so the server knows where config/logs live
  const env = {
    ...process.env,
    PRINT_AGENT_CONFIG : CONFIG_FILE,
    PRINT_AGENT_LOGS   : LOGS_DIR,
  };

  // Use spawn with the system node binary instead of fork().
  // Electron's fork() re-invokes the Electron binary which cannot run a plain
  // Node.js Express server correctly. spawn("node", ...) uses the system Node.
  const { spawn } = require("child_process");

  // Resolve the node executable.
  // In dev: use the system "node" on PATH.
  // In packaged: look for a bundled node.exe next to the exe, then fall back
  // to the system node. We do NOT use process.execPath because in Electron
  // that is the Electron binary, not Node.js.
  let nodeExec = "node";
  if (IS_PACKAGED) {
    const bundledNode = path.join(path.dirname(app.getPath("exe")), "node.exe");
    nodeExec = fs.existsSync(bundledNode) ? bundledNode : "node";
  }

  serverProcess = spawn(nodeExec, [serverEntry], {
    env,
    stdio: ["pipe", "pipe", "pipe", "ipc"],   // keep IPC channel open
  });

  // Relay stdout/stderr to the Electron console so errors are visible
  serverProcess.stdout.on("data", (data) => {
    process.stdout.write(data);
  });
  serverProcess.stderr.on("data", (data) => {
    process.stderr.write(data);
    logger.error("Server stderr: " + data.toString().trim());
  });

  serverProcess.on("message", (msg) => {
    // Messages from the server process to update stats / notify UI
    if (!msg || typeof msg !== "object") return;

    switch (msg.type) {
      case "server:ready":
        printStats.serverRunning = true;
        logger.info("Express server ready on port " + msg.port);
        broadcastStats();
        break;

      case "print:success":
        printStats.successCount++;
        printStats.lastPrintTime = new Date().toISOString();
        logger.info("Print successful");
        broadcastStats();
        break;

      case "print:failure":
        printStats.failureCount++;
        logger.error("Print failed: " + msg.error);
        broadcastStats();
        break;

      case "printer:status":
        printStats.printerOnline = msg.online;
        broadcastStats();
        break;
    }
  });

  serverProcess.on("exit", (code) => {
    printStats.serverRunning = false;
    serverProcess = null;
    logger.warn("Server process exited with code " + code);
    broadcastStats();
    // Auto-restart after 3 seconds unless we are quitting
    if (!app.isQuiting) {
      setTimeout(startServer, 3000);
    }
  });

  serverProcess.on("error", (err) => {
    logger.error("Server process error: " + err.message);
  });
}

// ─── Windows & Tray ──────────────────────────────────────────────────────────
let mainWindow = null;
let tray       = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width           : 480,
    height          : 560,
    minWidth        : 420,
    minHeight       : 480,
    resizable       : true,
    frame           : true,
    title           : "StoreSaarthi Print Agent",
    icon            : path.join(__dirname, "assets", "icon.ico"),
    webPreferences  : {
      preload         : path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration : false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // ── Hide instead of close ──
  mainWindow.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon({
          iconType : "info",
          title    : "StoreSaarthi Print Agent",
          content  : "Running in the system tray. Double-click the icon to reopen.",
        });
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a PNG if the ICO is not yet generated (fallback to nativeImage.createEmpty)
  const iconPath = path.join(__dirname, "assets", "tray-icon.png");
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip("StoreSaarthi Print Agent");
  updateTrayMenu();

  tray.on("double-click", () => {
    showWindow();
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label : "Open",
      click : () => showWindow(),
    },
    {
      label : "Test Print",
      click : () => triggerTestPrint(),
    },
    { type: "separator" },
    {
      label : "Exit",
      click : () => quitApp(),
    },
  ]);
  tray.setContextMenu(menu);
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function quitApp() {
  app.isQuiting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
}

// ─── Broadcast stats to renderer ─────────────────────────────────────────────
function broadcastStats() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("stats:update", { ...printStats });
  }
  // Also update tray tooltip
  if (tray) {
    const status = printStats.serverRunning ? "Running" : "Stopped";
    tray.setToolTip(`StoreSaarthi Print Agent — ${status}`);
  }
}

// ─── Get installed printers via PowerShell ────────────────────────────────────
/**
 * Uses PowerShell to enumerate Windows printers.
 * Returns a Promise that resolves to an array of printer name strings.
 */
function getInstalledPrinters() {
  return new Promise((resolve) => {
    const cmd = `powershell.exe -NoProfile -NonInteractive -Command "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        logger.error("Could not enumerate printers: " + (stderr || err.message));
        return resolve([]);
      }
      try {
        const raw = stdout.trim();
        if (!raw) return resolve([]);
        const parsed = JSON.parse(raw);
        // If only one printer, PowerShell returns a string instead of an array
        const printers = Array.isArray(parsed) ? parsed : [parsed];
        resolve(printers.filter(Boolean));
      } catch {
        resolve([]);
      }
    });
  });
}

/**
 * Checks whether a named printer is online/ready.
 * Returns a Promise<boolean>.
 */
function checkPrinterOnline(printerName) {
  return new Promise((resolve) => {
    if (!printerName) return resolve(false);
    const safeName = printerName.replace(/'/g, "\\'");
    const cmd = `powershell.exe -NoProfile -NonInteractive -Command "try { $p = Get-Printer -Name '${safeName}' -ErrorAction Stop; if ($p.PrinterStatus -eq 'Normal' -or $p.PrinterStatus -eq 'Idle' -or $p.PrinterStatus -eq 'Unknown') { 'online' } else { 'offline' } } catch { 'offline' }"`;
    exec(cmd, (err, stdout) => {
      if (err) return resolve(false);
      resolve(stdout.trim().toLowerCase() === "online");
    });
  });
}

// ─── Auto-start via Windows registry ─────────────────────────────────────────
const REG_KEY  = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const REG_NAME = "StoreSaarthiPrintAgent";

function setAutoStart(enabled) {
  const exePath = IS_PACKAGED ? `"${process.execPath}"` : `"${process.execPath}" "${__filename}"`;
  if (enabled) {
    const cmd = `reg add "${REG_KEY}" /v "${REG_NAME}" /d ${exePath} /f`;
    exec(cmd, (err) => {
      if (err) logger.error("Auto-start enable failed: " + err.message);
      else logger.info("Auto-start enabled");
    });
  } else {
    const cmd = `reg delete "${REG_KEY}" /v "${REG_NAME}" /f`;
    exec(cmd, (err) => {
      if (err && !err.message.includes("not found"))
        logger.error("Auto-start disable failed: " + err.message);
      else logger.info("Auto-start disabled");
    });
  }
}

// ─── Test print helper (called from tray or renderer) ────────────────────────
function triggerTestPrint() {
  if (serverProcess) {
    serverProcess.send({ type: "trigger:testPrint" });
  }
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  // Renderer requests full config + current stats
  ipcMain.handle("config:get", () => {
    return { config: loadConfig(), stats: { ...printStats } };
  });

  // Renderer requests list of installed printers
  ipcMain.handle("printers:list", async () => {
    return await getInstalledPrinters();
  });

  // Renderer saves a new printer selection
  ipcMain.handle("printer:set", async (_e, printerName) => {
    const cfg = loadConfig();
    cfg.printerName = printerName;
    saveConfig(cfg);
    logger.info(`Printer changed to: ${printerName}`);
    // Tell the server process so it picks it up immediately (no restart needed)
    if (serverProcess) serverProcess.send({ type: "config:reload" });
    // Check if new printer is online
    const online = await checkPrinterOnline(printerName);
    printStats.printerOnline = online;
    broadcastStats();
    return { success: true };
  });

  // Renderer triggers a test print
  ipcMain.handle("print:test", () => {
    triggerTestPrint();
    return { success: true };
  });

  // Renderer toggles auto-start
  ipcMain.handle("autoStart:set", (_e, enabled) => {
    const cfg = loadConfig();
    cfg.autoStart = !!enabled;
    saveConfig(cfg);
    setAutoStart(cfg.autoStart);
    logger.info(`Auto-start set to: ${cfg.autoStart}`);
    return { success: true };
  });

  // Renderer asks for a fresh stats snapshot
  ipcMain.handle("stats:get", () => {
    return { ...printStats };
  });

  // Open logs folder in Explorer
  ipcMain.handle("logs:open", () => {
    shell.openPath(LOGS_DIR);
    return { success: true };
  });
}

// ─── Periodic printer-status poll ────────────────────────────────────────────
function startPrinterPoller() {
  setInterval(async () => {
    const cfg     = loadConfig();
    if (!cfg.printerName) return;
    const online  = await checkPrinterOnline(cfg.printerName);
    if (online !== printStats.printerOnline) {
      printStats.printerOnline = online;
      broadcastStats();
      if (!online) {
        logger.warn(`Printer "${cfg.printerName}" appears to be offline`);
        // Show tray notification
        if (tray) {
          tray.displayBalloon({
            iconType : "warning",
            title    : "Printer Offline",
            content  : `"${cfg.printerName}" is not responding. Please check the connection.`,
          });
        }
      }
    }
  }, 15_000);  // every 15 seconds
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  logger.info("Application started");

  registerIpcHandlers();
  createTray();
  createWindow();

  // Start the Express print server
  startServer();
  startPrinterPoller();

  // Initial printer check
  const cfg = loadConfig();
  if (cfg.printerName) {
    checkPrinterOnline(cfg.printerName).then((online) => {
      printStats.printerOnline = online;
      broadcastStats();
    });
  }
});

// Prevent the default quit-on-all-windows-closed behavior
app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("before-quit", () => {
  app.isQuiting = true;
  logger.info("Application shutting down");
});

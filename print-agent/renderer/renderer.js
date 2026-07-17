/**
 * renderer.js
 * UI logic for the StoreSaarthi Print Agent window.
 *
 * All communication with the Electron main process goes through
 * the `window.printAgent` API exposed by preload.js.
 *
 * No direct Node.js or Electron APIs are used here.
 */

// ─── DOM references ───────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const statusDot        = $("statusDot");
const statusText       = $("statusText");
const printerNameEl    = $("printerName");
const printerStatusEl  = $("printerStatus");
const serverUrlEl      = $("serverUrl");
const statSuccess      = $("statSuccess");
const statFail         = $("statFail");
const statLastPrint    = $("statLastPrint");

const btnChangePrinter = $("btnChangePrinter");
const btnTestPrint     = $("btnTestPrint");
const btnMinimize      = $("btnMinimize");
const btnOpenLogs      = $("btnOpenLogs");
const chkAutoStart     = $("chkAutoStart");

const printerModal     = $("printerModal");
const printerList      = $("printerList");
const btnModalCancel   = $("btnModalCancel");

// ─── State ────────────────────────────────────────────────────────────────────
let currentConfig = {};

// ─── Toast helper ────────────────────────────────────────────────────────────
let toastTimer = null;

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
function showToast(message, type = "info") {
  const toast = $("toast");
  toast.textContent  = message;
  toast.className    = `toast ${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ─── Stats rendering ─────────────────────────────────────────────────────────
/**
 * Refresh all UI elements from a stats object.
 * @param {{ serverRunning: boolean, printerOnline: boolean|null,
 *           successCount: number, failureCount: number,
 *           lastPrintTime: string|null }} stats
 */
function renderStats(stats) {
  // Server status
  if (stats.serverRunning) {
    statusDot.className  = "dot green";
    statusText.textContent = "Running";
  } else {
    statusDot.className  = "dot red";
    statusText.textContent = "Stopped";
  }

  // Printer online status
  if (stats.printerOnline === true) {
    printerStatusEl.textContent = "🟢 Online";
    printerStatusEl.style.color = "var(--green)";
  } else if (stats.printerOnline === false) {
    printerStatusEl.textContent = "🔴 Offline";
    printerStatusEl.style.color = "var(--red)";
  } else {
    printerStatusEl.textContent = "—";
    printerStatusEl.style.color = "";
  }

  // Counters
  statSuccess.textContent = stats.successCount ?? 0;
  statFail.textContent    = stats.failureCount  ?? 0;

  // Last print time
  if (stats.lastPrintTime) {
    const d   = new Date(stats.lastPrintTime);
    const fmt = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    statLastPrint.textContent = fmt;
  } else {
    statLastPrint.textContent = "—";
  }
}

/**
 * Render the currently configured printer name in the UI.
 * @param {string} name
 */
function renderPrinterName(name) {
  printerNameEl.textContent = name || "Not configured";
  printerNameEl.style.color = name ? "var(--text)" : "var(--amber)";
}

// ─── Initialise UI from config ────────────────────────────────────────────────
async function init() {
  try {
    const { config, stats } = await window.printAgent.getConfig();
    currentConfig = config;

    renderStats(stats);
    renderPrinterName(config.printerName);
    chkAutoStart.checked = !!config.autoStart;
    serverUrlEl.textContent = `http://localhost:${config.port || 4000}`;

    // If no printer is configured, prompt immediately
    if (!config.printerName) {
      showToast("Please select a printer to get started.", "info");
      openPrinterModal();
    }
  } catch (err) {
    showToast("Could not load configuration.", "error");
    console.error(err);
  }
}

// ─── Live stats updates ───────────────────────────────────────────────────────
// Subscribe to real-time stats pushed from the main process
window.printAgent.onStatsUpdate((stats) => {
  renderStats(stats);
});

// ─── Printer modal ────────────────────────────────────────────────────────────
async function openPrinterModal() {
  printerModal.hidden = false;

  // Show spinner while loading
  printerList.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const printers = await window.printAgent.listPrinters();

    if (!printers || printers.length === 0) {
      printerList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:16px">No printers found.<br>Make sure a printer is installed in Windows Settings.</p>';
      return;
    }

    printerList.innerHTML = "";

    printers.forEach((name) => {
      const item = document.createElement("div");
      item.className   = "printer-item";
      if (name === currentConfig.printerName) item.classList.add("selected");
      item.textContent = name;
      item.title       = name;
      item.addEventListener("click", () => selectPrinter(name));
      printerList.appendChild(item);
    });
  } catch (err) {
    printerList.innerHTML = '<p style="color:var(--red);text-align:center;padding:16px">Failed to load printers.</p>';
    console.error(err);
  }
}

async function selectPrinter(name) {
  // Highlight selection immediately
  document.querySelectorAll(".printer-item").forEach((el) => {
    el.classList.toggle("selected", el.textContent === name);
  });

  try {
    await window.printAgent.setPrinter(name);
    currentConfig.printerName = name;
    renderPrinterName(name);
    printerModal.hidden = true;
    showToast(`Printer set: ${name}`, "success");
  } catch (err) {
    showToast("Could not save printer selection.", "error");
    console.error(err);
  }
}

// ─── Test print ───────────────────────────────────────────────────────────────
async function doTestPrint() {
  if (!currentConfig.printerName) {
    showToast("Please select a printer first.", "error");
    openPrinterModal();
    return;
  }

  btnTestPrint.disabled   = true;
  btnTestPrint.textContent = "Printing…";

  try {
    await window.printAgent.testPrint();
    showToast("Test print sent!", "success");
  } catch (err) {
    showToast("Test print failed. Check logs.", "error");
    console.error(err);
  } finally {
    btnTestPrint.disabled   = false;
    btnTestPrint.textContent = "🖶 Test Print";
  }
}

// ─── Auto-start toggle ────────────────────────────────────────────────────────
chkAutoStart.addEventListener("change", async () => {
  const enabled = chkAutoStart.checked;
  try {
    await window.printAgent.setAutoStart(enabled);
    showToast(enabled ? "Will start with Windows." : "Auto-start disabled.", "success");
  } catch (err) {
    chkAutoStart.checked = !enabled; // revert
    showToast("Could not change auto-start setting.", "error");
    console.error(err);
  }
});

// ─── Button wiring ────────────────────────────────────────────────────────────
btnChangePrinter.addEventListener("click", () => openPrinterModal());
btnTestPrint.addEventListener("click",     () => doTestPrint());
btnOpenLogs.addEventListener("click",      () => window.printAgent.openLogs());

// "Minimize to Tray" just closes the window (main.js intercepts and hides it)
btnMinimize.addEventListener("click", () => window.close());

btnModalCancel.addEventListener("click", () => {
  printerModal.hidden = true;
});

// Close modal when clicking the overlay background
printerModal.addEventListener("click", (e) => {
  if (e.target === printerModal) printerModal.hidden = true;
});

// Close modal with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !printerModal.hidden) printerModal.hidden = true;
});

// ─── Boot ────────────────────────────────────────────────────────────────────
init();

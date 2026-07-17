/**
 * preload.js
 * Runs in the renderer process with access to Node APIs, but exposes only a
 * safe, explicit API surface to the renderer via contextBridge.
 *
 * This follows Electron's security best practices:
 *  - contextIsolation: true  (renderer cannot access Node directly)
 *  - nodeIntegration: false  (renderer is a plain web page)
 *  - Only named methods are exposed — no raw ipcRenderer access
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("printAgent", {
  // ── Config & stats ──────────────────────────────────────────────────────────
  /** Get current config + stats snapshot */
  getConfig: () => ipcRenderer.invoke("config:get"),

  /** Get latest stats snapshot */
  getStats: () => ipcRenderer.invoke("stats:get"),

  // ── Printers ────────────────────────────────────────────────────────────────
  /** List all installed Windows printers */
  listPrinters: () => ipcRenderer.invoke("printers:list"),

  /** Save a printer selection */
  setPrinter: (name) => ipcRenderer.invoke("printer:set", name),

  // ── Actions ─────────────────────────────────────────────────────────────────
  /** Trigger a test print */
  testPrint: () => ipcRenderer.invoke("print:test"),

  /** Enable / disable Windows auto-start */
  setAutoStart: (enabled) => ipcRenderer.invoke("autoStart:set", enabled),

  /** Open the logs folder in Windows Explorer */
  openLogs: () => ipcRenderer.invoke("logs:open"),

  // ── Real-time events (main → renderer) ──────────────────────────────────────
  /**
   * Subscribe to live stats updates pushed from the main process.
   * Returns an unsubscribe function.
   *
   * @param {function(stats: object): void} callback
   * @returns {function(): void}  call to remove listener
   */
  onStatsUpdate: (callback) => {
    const listener = (_event, stats) => callback(stats);
    ipcRenderer.on("stats:update", listener);
    return () => ipcRenderer.removeListener("stats:update", listener);
  },
});

/**
 * server/logger.js
 * Simple file + console logger with timestamps.
 * Used by both the main process and the Express server process.
 *
 * Usage:
 *   const logger = require('./logger')({ logsDir: '/path/to/logs' });
 *   logger.info('Server started');
 *   logger.warn('Something unusual');
 *   logger.error('It broke');
 */

const fs   = require("fs");
const path = require("path");

/**
 * @param {{ logsDir: string }} options
 * @returns {{ info: Function, warn: Function, error: Function }}
 */
module.exports = function createLogger({ logsDir }) {
  // Ensure the logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  /**
   * Get today's log file path: logs/YYYY-MM-DD.log
   */
  function getLogFilePath() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return path.join(logsDir, `${y}-${m}-${d}.log`);
  }

  /**
   * Format a log entry with ISO timestamp and level.
   * @param {"INFO"|"WARN"|"ERROR"} level
   * @param {string} message
   */
  function format(level, message) {
    const ts = new Date().toISOString();
    return `[${ts}] [${level.padEnd(5)}] ${message}`;
  }

  /**
   * Write a line to today's log file (non-blocking, append).
   * @param {string} line
   */
  function writeLine(line) {
    try {
      fs.appendFileSync(getLogFilePath(), line + "\n", "utf8");
    } catch {
      // If we can't write to disk, at least console still works
    }
  }

  return {
    info(message) {
      const line = format("INFO", message);
      console.log(line);
      writeLine(line);
    },

    warn(message) {
      const line = format("WARN", message);
      console.warn(line);
      writeLine(line);
    },

    error(message) {
      const line = format("ERROR", message);
      console.error(line);
      writeLine(line);
    },
  };
};

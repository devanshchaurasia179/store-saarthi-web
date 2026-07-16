/**
 * config.js
 * Central configuration for the print agent.
 *
 * HOW TO FIND YOUR PRINTER NAME:
 *   Settings → Bluetooth & devices → Printers & scanners
 *   Copy the printer name exactly as shown and paste it below.
 *
 * Example:
 *   PRINTER_NAME: "POS-58 Printer"
 *   PRINTER_NAME: "MUNBYN Printer"
 */

module.exports = {
  // Port the HTTP server will listen on
  PORT: 4000,

  // Replace this with the exact printer name from Windows Settings
  PRINTER_NAME: "POS58 Printer",

  // Receipt body: Courier New 10pt, 18-char lines (fits 58mm without clipping)
  FONT_SIZE: 10,
};

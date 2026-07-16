# print-agent

A lightweight local Node.js server that receives HTTP requests from your MERN website and sends print jobs to your Windows-installed thermal printer.

No Bluetooth, no USB, no serial port — it uses the printer exactly as Windows already knows it.

---

## Project Structure

```
print-agent/
├── package.json
├── config.js          ← set your printer name here
├── index.js           ← Express server + routes
├── utils/
│   └── pdfGenerator.js ← reusable PDF receipt builder
├── temp/              ← temporary PDFs (auto-deleted after printing)
├── .gitignore
└── README.md
```

---

## 1. Installation

Open a terminal inside the `print-agent` folder and run:

```bash
npm install
```

---

## 2. Set Your Printer Name

1. Open **Windows Settings**
2. Go to **Bluetooth & devices → Printers & scanners**
3. Find your thermal printer and copy its name **exactly** (spelling, spaces, capitalisation)
4. Open `config.js` and replace the placeholder:

```js
module.exports = {
  PORT: 4000,
  PRINTER_NAME: "POS-58 Printer",   // ← paste your printer name here
};
```

---

## 3. Running the Server

```bash
npm start
```

You should see:

```
─────────────────────────────────────
  print-agent started
  Listening on http://localhost:4000
  Printer: POS-58 Printer
─────────────────────────────────────
  POST /print-test  → quick test print
  POST /print-bill  → full receipt print
─────────────────────────────────────
```

---

## 4. Testing

### Option A — curl

```bash
curl -X POST http://localhost:4000/print-test
```

### Option B — Postman

- Method: `POST`
- URL: `http://localhost:4000/print-test`
- No body needed

### Expected response

```json
{ "success": true, "message": "Printed successfully" }
```

---

## 5. Printing a Full Bill (POST /print-bill)

Send a `POST` request with a JSON body:

```json
{
  "shop": "ABC Store",
  "customer": "John",
  "items": [
    { "name": "Milk",  "qty": 2, "price": 30 },
    { "name": "Bread", "qty": 1, "price": 40 }
  ],
  "subtotal": 100,
  "discount": 10,
  "total": 90,
  "paymentMode": "Cash"
}
```

From your MERN frontend:

```js
const response = await fetch("http://localhost:4000/print-bill", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(receiptData),
});
const result = await response.json();
console.log(result); // { success: true, message: "Printed successfully" }
```

---

## 6. Troubleshooting

### ❌ `printer not found` or similar error

- Double-check the printer name in `config.js` — it must match **exactly** what Windows shows.
- Go to **Settings → Printers & scanners**, hover over the printer to confirm the full name.

### ❌ Printer is offline

- Make sure the printer is turned on and Bluetooth is connected.
- Open **Devices and Printers** in Control Panel and confirm it shows **Ready**.

### ❌ Nothing prints but no error

- Open **Windows Print Queue** (right-click the printer → See what's printing).
- If jobs are stuck, cancel them, restart the print spooler:
  ```
  net stop spooler
  net start spooler
  ```

### ❌ Windows Print Spooler issues

Run as Administrator:
```bash
net stop spooler
del /Q /F /S "%systemroot%\System32\spool\PRINTERS\*.*"
net start spooler
```

### ❌ Port 4000 already in use

Change `PORT` in `config.js` to any free port (e.g. `5000`) and update your frontend fetch URL accordingly.

### ❌ `pdf-to-printer` not found

Run `npm install` again inside the `print-agent` folder.

---

## Notes

- The `temp/` folder stores PDFs briefly during printing. They are deleted automatically after a successful print.
- The server never crashes on print errors — it always returns a JSON response.
- CORS is enabled so your frontend running on any localhost port can call it freely.

# StoreSaarthi Print Agent

A lightweight, standalone Windows service that bridges the **StoreSaarthi web app** (or any HTTP client) with a locally-connected **Bluetooth / USB thermal printer**.

```
StoreSaarthi website  →  POST /print-bill  →  print-agent.exe  →  Windows printer  →  58 mm receipt
```

The agent is a small Express HTTP server packaged into a single `.exe` with [pkg](https://github.com/vercel/pkg).  
It has **no installer** and **no UI** — it runs quietly in the background (ideally as a Windows Service via NSSM) and accepts print jobs over a local HTTP port.

---

## Contents

1. [What's in this folder](#whats-in-this-folder)  
2. [First-time setup](#first-time-setup)  
3. [Install as a Windows Service (NSSM)](#install-as-a-windows-service-nssm)  
4. [API routes](#api-routes)  
5. [Changing the printer later](#changing-the-printer-later)  
6. [Rebuilding after code changes](#rebuilding-after-code-changes)  
7. [Logs and troubleshooting](#logs-and-troubleshooting)  
8. [Quick test commands](#quick-test-commands)  

---

## What's in this folder

| File / Folder | Purpose |
|---|---|
| `index.js` | Standalone print-agent server (entry point for pkg build) |
| `server/textGenerator.js` | Builds plain-text receipt layout for 58 mm roll |
| `package.json` | npm config + pkg build config |
| `dist/print-agent.exe` | Compiled standalone exe (after `npm run build`) |
| `config.json` | **Created at first run** — stores printer name and port |
| `logs/` | Rolling daily log files + `error.log` for fatal startup errors |
| `temp/` | Temporary print files (auto-cleaned after each job) |
| `main.js` | Electron UI version (separate; see Electron section below) |

---

## First-time setup

### 1 — Prerequisites

- Windows 10 / 11  
- Your thermal printer is **already installed** in Windows  
  *(Settings → Bluetooth & devices → Printers & scanners)*  
- Node.js 18+ installed (only needed to build; not needed to run the exe)

### 2 — Build the exe

```cmd
cd C:\path\to\print-agent
npm install
npm run build
```

This produces **`dist/print-agent.exe`** (~50 MB, self-contained Node 18 runtime).

### 3 — Copy the exe to its permanent home

Create a dedicated folder (the agent writes `config.json` and `logs/` next to itself):

```cmd
mkdir C:\print-agent
copy dist\print-agent.exe C:\print-agent\print-agent.exe
```

> ⚠️ **Do NOT run the exe from inside `dist\` while developing** if you also have NSSM pointing there — use a separate production folder.

### 4 — Run it manually ONCE for first-time printer selection

Open a **Command Prompt** (not PowerShell, not a hidden window) and run:

```cmd
C:\print-agent\print-agent.exe
```

Because `config.json` doesn't exist yet, the agent detects the interactive console and runs setup:

```
[print-agent] ── FIRST-TIME SETUP ──────────────────────────
[print-agent] config.json not found. Let's set it up.
[print-agent] Detecting installed printers...

[print-agent] Installed printers:
  1. Microsoft Print to PDF
  2. POS58 Printer
  3. MUNBYN Thermal

[print-agent] Enter the number of your thermal printer (1–3): 2

[print-agent] ✓ Printer set to: "POS58 Printer"
[print-agent] ✓ config.json created at: C:\print-agent\config.json
```

After selection the server starts normally. You can press `Ctrl+C` to stop it — the config is already saved.

### 5 — Verify config.json was created

```cmd
type C:\print-agent\config.json
```

Expected output:
```json
{
  "printerName": "POS58 Printer",
  "port": 4000
}
```

### 6 — Send a test print

```cmd
curl -X POST http://localhost:4000/print-test
```

A test receipt should print. If it does, you're ready to install as a service.

---

## Install as a Windows Service (NSSM)

NSSM (Non-Sucking Service Manager) wraps any `.exe` as a proper Windows Service.

### Download NSSM

→ [https://nssm.cc/download](https://nssm.cc/download)  
Extract and put `nssm.exe` somewhere on your PATH (e.g. `C:\Windows\System32\`), or reference it by full path below.

### Register the service

Run the following in an **Administrator** Command Prompt:

```cmd
nssm install PrintAgent "C:\print-agent\print-agent.exe"
nssm set PrintAgent AppDirectory "C:\print-agent"
nssm set PrintAgent AppStdout "C:\print-agent\logs\output.log"
nssm set PrintAgent AppStderr "C:\print-agent\logs\error.log"
nssm set PrintAgent AppStdoutCreationDisposition 4
nssm set PrintAgent AppStderrCreationDisposition 4
nssm set PrintAgent Start SERVICE_AUTO_START
nssm start PrintAgent
```

| Setting | Meaning |
|---|---|
| `AppDirectory` | Working directory — where config.json and logs/ live |
| `AppStdout / AppStderr` | NSSM redirects console output to these files |
| `AppStdoutCreationDisposition 4` | Append to log files rather than overwrite |
| `Start SERVICE_AUTO_START` | Service starts automatically on Windows boot |

### Verify it's running

```cmd
nssm status PrintAgent
curl http://localhost:4000/
```

The health check should return:
```json
{
  "success": true,
  "service": "StoreSaarthi Print Agent",
  "printer": "POS58 Printer",
  "port": 4000
}
```

### Manage the service

```cmd
nssm stop PrintAgent          :: Stop
nssm start PrintAgent         :: Start
nssm restart PrintAgent       :: Restart
nssm remove PrintAgent confirm :: Uninstall the service (confirm is required)
```

Or use the Windows Services panel (`services.msc`) — look for "PrintAgent".

### ⚠️ IMPORTANT: complete first-time setup BEFORE installing as a service

If `config.json` does not exist when the service starts, the agent **cannot prompt for a printer** (there is no console attached to a Windows Service). It will:

1. Write a clear error to `C:\print-agent\logs\error.log`  
2. Exit with code 1 (NSSM logs this as a failed start)  
3. **Not hang silently**

This is intentional — a silent hang is far worse than a fast fail. Always complete the manual first-run setup (step 4 above) before registering the service.

---

## API routes

All routes respond with JSON.

### `GET /`
Health check. Returns service status, configured printer, uptime.

```cmd
curl http://localhost:4000/
```

---

### `GET /printers`
Lists all Windows-installed printers. Useful for a settings UI.

```cmd
curl http://localhost:4000/printers
```

Response:
```json
{
  "success": true,
  "printers": ["POS58 Printer", "Microsoft Print to PDF"]
}
```

---

### `POST /config`
Updates the printer name (and optionally port) **without restarting** the service.  
The new value is saved to `config.json` immediately.

```cmd
curl -X POST http://localhost:4000/config ^
  -H "Content-Type: application/json" ^
  -d "{\"printerName\": \"MUNBYN Thermal\"}"
```

Response:
```json
{
  "success": true,
  "config": { "printerName": "MUNBYN Thermal", "port": 4000 }
}
```

---

### `POST /print-test`
Sends a sample receipt to the configured printer.

```cmd
curl -X POST http://localhost:4000/print-test
```

---

### `POST /print-bill`
Prints a real bill receipt.

```cmd
curl -X POST http://localhost:4000/print-bill ^
  -H "Content-Type: application/json" ^
  -d "{\"shopName\":\"My Shop\",\"billNumber\":42,\"items\":[{\"name\":\"Momos\",\"qty\":2,\"price\":120,\"total\":240}],\"subtotal\":240,\"total\":240,\"paid\":240,\"paymentMode\":\"CASH\",\"paymentStatus\":\"PAID\"}"
```

**Body fields:**

| Field | Required | Notes |
|---|---|---|
| `items` | ✅ | Array of `{ name, qty, price, total }` |
| `shopName` / `shop` | No | Defaults to "StoreSaarthi" |
| `customerName` / `customer` | No | Shown on receipt |
| `billNumber` | No | Shown as "Bill #N" |
| `createdAt` | No | ISO date string; defaults to now |
| `subtotal` | No | |
| `discount` | No | |
| `tax` | No | Percentage (e.g. `5` = 5%) |
| `total` | No | |
| `paid` | No | |
| `paymentMode` | No | `CASH`, `UPI`, etc. |
| `paymentStatus` | No | `PAID`, `PARTIAL`, `UNPAID` |

---

## Changing the printer later

**Option A — Edit config.json directly** (requires service restart):

```cmd
nssm stop PrintAgent
notepad C:\print-agent\config.json
nssm start PrintAgent
```

**Option B — POST /config** (no restart, takes effect immediately):

```cmd
curl -X POST http://localhost:4000/config ^
  -H "Content-Type: application/json" ^
  -d "{\"printerName\": \"New Printer Name\"}"
```

The agent updates its in-memory config and writes the new value to `config.json` in one step.

---

## Rebuilding after code changes

1. Stop the service (so the exe isn't locked):
   ```cmd
   nssm stop PrintAgent
   ```

2. Rebuild the exe:
   ```cmd
   cd C:\path\to\print-agent-source
   npm run build
   ```

3. Replace the exe:
   ```cmd
   copy /Y dist\print-agent.exe C:\print-agent\print-agent.exe
   ```

4. Start the service:
   ```cmd
   nssm start PrintAgent
   ```

> `config.json` in `C:\print-agent\` is **not overwritten** by a rebuild — your printer selection is preserved.

---

## Logs and troubleshooting

| Location | Contents |
|---|---|
| `C:\print-agent\logs\YYYY-MM-DD.log` | Rolling daily log — all requests, print jobs, errors |
| `C:\print-agent\logs\output.log` | NSSM redirect of stdout (same content as daily log) |
| `C:\print-agent\logs\error.log` | Fatal startup errors only (e.g. missing config.json) |

All log lines are prefixed with `[print-agent]` for easy filtering:

```cmd
findstr /C:"[print-agent]" C:\print-agent\logs\output.log
findstr /C:"ERROR" C:\print-agent\logs\output.log
```

### Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Service fails to start, `error.log` says "config.json not found" | First-time setup not done | Run exe manually in a cmd window, select printer |
| `/print-test` returns 500 "No printer configured" | `config.json` exists but `printerName` is empty | POST /config with the correct name |
| Receipt prints blank or garbled | Wrong printer driver | Verify in Windows Settings → Printers |
| `/printers` returns empty array | PowerShell execution policy blocks Get-Printer | Run `powershell Set-ExecutionPolicy RemoteSigned -Scope LocalMachine` as admin |
| Port 4000 already in use | Another process on port 4000 | Edit `config.json` → set a different `port`, restart service |

---

## Electron UI version

This repo also contains an **Electron-based** version (`main.js`, `renderer/`) that wraps the same print server with a system tray GUI.  
The standalone `print-agent.exe` (pkg) and the Electron version share `server/textGenerator.js` for receipt layout but are otherwise independent.  
For server deployments / VMs with no display, use the pkg exe + NSSM. For a shop PC where the owner wants a visible tray icon and GUI, use the Electron app (`npm run dist`).

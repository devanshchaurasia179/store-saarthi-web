@echo off
:: ============================================================
:: StoreSaarthi Print Agent — Windows Service Installer
:: Run this script as Administrator (right-click → Run as admin)
:: ============================================================

setlocal EnableDelayedExpansion

:: ── Config ───────────────────────────────────────────────────
set "SERVICE_NAME=PrintAgent"
set "SERVICE_DIR=C:\print-agent"
set "EXE_NAME=print-agent-x64.exe"
set "NSSM_URL=https://nssm.cc/release/nssm-2.24.zip"
set "NSSM_ZIP=%TEMP%\nssm.zip"
set "NSSM_DIR=%TEMP%\nssm-extract"
set "NSSM_EXE=%NSSM_DIR%\nssm-2.24\win64\nssm.exe"
set "WMF_URL=https://download.microsoft.com/download/6/F/5/6F5FF66C-6775-42B0-86C4-47D41F2DA187/Win7AndW2K8R2-KB3191566-x64.msu"
set "WMF_MSU=%TEMP%\wmf51.msu"

echo.
echo ============================================================
echo   StoreSaarthi Print Agent — Service Installer
echo ============================================================
echo.

:: ── Check Admin ──────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] This script must be run as Administrator.
    echo         Right-click the .bat file and choose "Run as administrator".
    pause
    exit /b 1
)
echo [OK] Running as Administrator.

:: ── Check PowerShell version (need 5.0+ for Get-Printer, Expand-Archive) ─────
echo [..] Checking PowerShell version...
for /f "usebackq delims=" %%V in (
    `powershell.exe -NoProfile -NonInteractive -Command "$PSVersionTable.PSVersion.Major"  2^>nul`
) do set "PS_MAJOR=%%V"

if not defined PS_MAJOR (
    echo [WARN] Could not detect PowerShell version. Assuming it is old.
    set "PS_MAJOR=0"
)

echo [INFO] PowerShell major version: %PS_MAJOR%

if %PS_MAJOR% LSS 5 (
    echo.
    echo [WARN] PowerShell %PS_MAJOR%.x detected — version 5.1 is required.
    echo [..] Downloading Windows Management Framework 5.1 ^(WMF 5.1^)...
    echo       This is a one-time upgrade needed on Windows 7 / 8 / 8.1.
    echo.

    :: Use bitsadmin (available on all Windows versions) to download WMF installer
    bitsadmin /transfer WMF51Download /download /priority normal "%WMF_URL%" "%WMF_MSU%" >nul 2>&1
    if %errorLevel% NEQ 0 (
        echo [ERROR] bitsadmin download failed. Trying certutil...
        certutil -urlcache -split -f "%WMF_URL%" "%WMF_MSU%" >nul 2>&1
    )

    if not exist "%WMF_MSU%" (
        echo [ERROR] Failed to download WMF 5.1.
        echo         Please download and install it manually from:
        echo         https://www.microsoft.com/en-us/download/details.aspx?id=54616
        echo         Then re-run this installer.
        pause
        exit /b 1
    )

    echo [OK] WMF 5.1 downloaded. Installing now ^(Windows will restart after^)...
    echo [..] Running installer silently — this may take a few minutes...
    wusa.exe "%WMF_MSU%" /quiet /norestart
    if %errorLevel% NEQ 0 (
        echo [ERROR] WMF 5.1 installation failed ^(code: %errorLevel%^).
        echo         Please install it manually, then re-run this script.
        pause
        exit /b 1
    )

    echo.
    echo [OK] WMF 5.1 installed successfully.
    echo.
    echo ============================================================
    echo   RESTART REQUIRED
    echo.
    echo   Windows needs to restart to finish the PowerShell upgrade.
    echo   After restarting:
    echo     1. Right-click install-service.bat
    echo     2. Choose "Run as administrator"
    echo   The installer will skip this upgrade step and install
    echo   the PrintAgent service automatically.
    echo ============================================================
    echo.
    set /p "DORESTART=Restart now? (Y/N): "
    if /i "%DORESTART%"=="Y" (
        shutdown /r /t 5 /c "Restarting to complete WMF 5.1 upgrade for StoreSaarthi Print Agent"
    ) else (
        echo [INFO] Please restart manually, then re-run this installer as Administrator.
    )
    pause
    exit /b 0
)
echo [OK] PowerShell %PS_MAJOR%.x — OK.

:: ── Find the source exe ──────────────────────────────────────
set "SCRIPT_DIR=%~dp0"
set "SRC_EXE="

:: Check if pkg-built exe exists in dist\
if exist "%SCRIPT_DIR%dist\%EXE_NAME%" (
    set "SRC_EXE=%SCRIPT_DIR%dist\%EXE_NAME%"
    echo [OK] Found pkg exe at: %SCRIPT_DIR%dist\%EXE_NAME%
    goto :exe_found
)

:: Check if it already exists in SERVICE_DIR (re-run scenario)
if exist "%SERVICE_DIR%\%EXE_NAME%" (
    echo [OK] Exe already at: %SERVICE_DIR%\%EXE_NAME%
    goto :skip_copy
)

echo [ERROR] Could not find dist\print-agent.exe
echo.
echo Please build it first:
echo   cd %SCRIPT_DIR%
echo   npm install
echo   npm run build
echo.
pause
exit /b 1

:exe_found
:: ── Create service directory ──────────────────────────────────
if not exist "%SERVICE_DIR%" (
    mkdir "%SERVICE_DIR%"
    echo [OK] Created: %SERVICE_DIR%
)

:: ── Copy exe ──────────────────────────────────────────────────
echo [..] Copying exe to %SERVICE_DIR%\%EXE_NAME% ...
copy /Y "%SRC_EXE%" "%SERVICE_DIR%\%EXE_NAME%" >nul
if %errorLevel% NEQ 0 (
    echo [ERROR] Failed to copy exe. Is the service already running?
    echo         Try: nssm stop %SERVICE_NAME%  then re-run this script.
    pause
    exit /b 1
)
echo [OK] Exe copied.

:: ── Copy config.json if it doesn't exist in service dir ──────
:skip_copy
if not exist "%SERVICE_DIR%\config.json" (
    if exist "%SCRIPT_DIR%dist\config.json" (
        copy /Y "%SCRIPT_DIR%dist\config.json" "%SERVICE_DIR%\config.json" >nul
        echo [OK] Copied config.json to %SERVICE_DIR%
    ) else if exist "%SCRIPT_DIR%config.json" (
        copy /Y "%SCRIPT_DIR%config.json" "%SERVICE_DIR%\config.json" >nul
        echo [OK] Copied config.json to %SERVICE_DIR%
    ) else (
        echo [WARN] No config.json found. The service will need first-time setup.
        echo        Run:  %SERVICE_DIR%\%EXE_NAME%
        echo        Select your printer, then re-run this installer.
        pause
        exit /b 1
    )
)

echo [OK] Config:
type "%SERVICE_DIR%\config.json"
echo.

:: ── Create logs directory ─────────────────────────────────────
if not exist "%SERVICE_DIR%\logs" mkdir "%SERVICE_DIR%\logs"
if not exist "%SERVICE_DIR%\temp" mkdir "%SERVICE_DIR%\temp"
echo [OK] Directories ready.

:: ── Download NSSM if not present ─────────────────────────────
where nssm >nul 2>&1
if %errorLevel% EQU 0 (
    echo [OK] NSSM already on PATH.
    set "NSSM_EXE=nssm"
    goto :install_service
)

if exist "%NSSM_EXE%" (
    echo [OK] NSSM already downloaded.
    goto :install_service
)

echo [..] Downloading NSSM (Non-Sucking Service Manager)...
powershell -NoProfile -NonInteractive -Command ^
  "Invoke-WebRequest -Uri '%NSSM_URL%' -OutFile '%NSSM_ZIP%' -UseBasicParsing"
if %errorLevel% NEQ 0 (
    echo [ERROR] Failed to download NSSM. Check your internet connection.
    echo         Or manually download from https://nssm.cc/download
    echo         and copy nssm.exe to C:\Windows\System32\
    pause
    exit /b 1
)

echo [..] Extracting NSSM...
powershell -NoProfile -NonInteractive -Command ^
  "Expand-Archive -Path '%NSSM_ZIP%' -DestinationPath '%NSSM_DIR%' -Force"
echo [OK] NSSM ready.

:: ── Install / reinstall the service ──────────────────────────
:install_service

:: Remove existing service first (clean reinstall)
"%NSSM_EXE%" status %SERVICE_NAME% >nul 2>&1
if %errorLevel% EQU 0 (
    echo [..] Removing existing %SERVICE_NAME% service...
    "%NSSM_EXE%" stop %SERVICE_NAME% >nul 2>&1
    timeout /t 2 /nobreak >nul
    "%NSSM_EXE%" remove %SERVICE_NAME% confirm >nul 2>&1
    echo [OK] Old service removed.
)

echo [..] Installing %SERVICE_NAME% Windows Service...
"%NSSM_EXE%" install %SERVICE_NAME% "%SERVICE_DIR%\%EXE_NAME%"
"%NSSM_EXE%" set %SERVICE_NAME% AppDirectory        "%SERVICE_DIR%"
"%NSSM_EXE%" set %SERVICE_NAME% AppStdout           "%SERVICE_DIR%\logs\output.log"
"%NSSM_EXE%" set %SERVICE_NAME% AppStderr           "%SERVICE_DIR%\logs\error.log"
"%NSSM_EXE%" set %SERVICE_NAME% AppStdoutCreationDisposition 4
"%NSSM_EXE%" set %SERVICE_NAME% AppStderrCreationDisposition 4
"%NSSM_EXE%" set %SERVICE_NAME% AppRestartDelay     3000
"%NSSM_EXE%" set %SERVICE_NAME% Start               SERVICE_AUTO_START
"%NSSM_EXE%" set %SERVICE_NAME% DisplayName         "StoreSaarthi Print Agent"
"%NSSM_EXE%" set %SERVICE_NAME% Description         "Handles thermal receipt printing for StoreSaarthi POS"

echo [..] Starting service...
"%NSSM_EXE%" start %SERVICE_NAME%

timeout /t 3 /nobreak >nul

:: ── Verify ────────────────────────────────────────────────────
"%NSSM_EXE%" status %SERVICE_NAME%
echo.

:: Quick health check
powershell -NoProfile -NonInteractive -Command ^
  "try { $r = Invoke-RestMethod http://localhost:4000/ -TimeoutSec 5; Write-Host '[OK] Health check passed — printer:' $r.printer } catch { Write-Host '[WARN] Service starting up... check again in a few seconds.' }"

echo.
echo ============================================================
echo   DONE! PrintAgent service installed and running.
echo.
echo   Starts automatically on Windows boot.
echo   No console window — fully silent background service.
echo.
echo   Check health:  curl http://localhost:4000/
echo   View logs:     %SERVICE_DIR%\logs\output.log
echo   Stop service:  nssm stop %SERVICE_NAME%
echo   Uninstall:     run uninstall-service.bat as Admin
echo ============================================================
echo.
pause
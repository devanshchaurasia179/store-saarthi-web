@echo off
:: ============================================================
:: StoreSaarthi Print Agent — 32-bit (x86) Launcher
::
:: Used on genuine 32-bit Windows machines where the x64 exe
:: cannot run. Downloads a portable Node.js 18 x86 binary
:: on first run, then starts the print agent.
::
:: Place this file next to index.js (or in C:\print-agent\)
:: and double-click (or run from Command Prompt).
:: ============================================================

setlocal EnableDelayedExpansion

set "AGENT_DIR=%~dp0"
if "%AGENT_DIR:~-1%"=="\" set "AGENT_DIR=%AGENT_DIR:~0,-1%"

set "NODE_DIR=%AGENT_DIR%\node-x86"
set "NODE_EXE=%NODE_DIR%\node.exe"
set "INDEX_JS=%AGENT_DIR%\index.js"

:: Node 18 LTS x86 portable zip
set "NODE_VERSION=18.20.8"
set "NODE_ZIP=%TEMP%\node-x86.zip"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-win-x86.zip"
set "NODE_FOLDER=node-v%NODE_VERSION%-win-x86"

echo.
echo ============================================================
echo   StoreSaarthi Print Agent -- x86 Launcher
echo ============================================================
echo.

:: Check if index.js exists here
if not exist "%INDEX_JS%" (
    echo [ERROR] index.js not found at: %INDEX_JS%
    echo         Place this .bat file next to index.js
    pause
    exit /b 1
)

:: If node.exe already present, skip download
if exist "%NODE_EXE%" (
    echo [OK] Node.js x86 already present.
    goto :run
)

echo [..] Node.js x86 not found. Downloading portable Node.js %NODE_VERSION% x86...
echo      This is a one-time download (~18 MB).
echo.

:: Download using bitsadmin (available on all Windows)
bitsadmin /transfer NodeX86Download /download /priority normal "%NODE_URL%" "%NODE_ZIP%" >nul 2>&1
if not exist "%NODE_ZIP%" (
    echo [..] bitsadmin failed. Trying certutil...
    certutil -urlcache -split -f "%NODE_URL%" "%NODE_ZIP%" >nul 2>&1
)
if not exist "%NODE_ZIP%" (
    echo [ERROR] Failed to download Node.js x86.
    echo         Please check your internet connection, or manually download:
    echo         %NODE_URL%
    echo         Extract it to: %NODE_DIR%
    echo         so that %NODE_EXE% exists, then re-run this script.
    pause
    exit /b 1
)
echo [OK] Downloaded.

echo [..] Extracting...

:: Try Expand-Archive (PS5+)
powershell.exe -NoProfile -NonInteractive -Command ^
  "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%TEMP%\node-x86-extract' -Force" >nul 2>&1

if not exist "%TEMP%\node-x86-extract\%NODE_FOLDER%\node.exe" (
    :: .NET ZipFile fallback (PS3+ / .NET 4.5)
    echo [..] Trying .NET ZipFile fallback...
    powershell.exe -NoProfile -NonInteractive -Command ^
      "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%NODE_ZIP%', '%TEMP%\node-x86-extract')" >nul 2>&1
)

if not exist "%TEMP%\node-x86-extract\%NODE_FOLDER%\node.exe" (
    echo [ERROR] Could not extract Node.js zip.
    echo         Manually extract %NODE_ZIP% to %NODE_DIR%
    echo         so that node.exe is at: %NODE_EXE%
    pause
    exit /b 1
)

:: Move to final location
if not exist "%NODE_DIR%" mkdir "%NODE_DIR%"
xcopy /E /I /Y "%TEMP%\node-x86-extract\%NODE_FOLDER%\*" "%NODE_DIR%\" >nul
del "%NODE_ZIP%" >nul 2>&1
rmdir /s /q "%TEMP%\node-x86-extract" >nul 2>&1

echo [OK] Node.js x86 installed to: %NODE_DIR%

:run
echo [..] Starting StoreSaarthi Print Agent...
echo      Press Ctrl+C to stop.
echo.
"%NODE_EXE%" "%INDEX_JS%"

pause

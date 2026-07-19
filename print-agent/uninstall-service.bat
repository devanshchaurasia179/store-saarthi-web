@echo off
:: ============================================================
:: StoreSaarthi Print Agent — Windows Service Uninstaller
:: Supports Windows 7 / 8 / 8.1 / 10 / 11  (x86 and x64)
:: Run this script as Administrator
:: ============================================================

setlocal
set "SERVICE_NAME=PrintAgent"

echo.
echo ============================================================
echo   StoreSaarthi Print Agent -- Service Uninstaller
echo ============================================================
echo.

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Run as Administrator.
    pause
    exit /b 1
)

:: ── Detect architecture to find correct NSSM binary ──────────
set "ARCH=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="x86" (
    if not defined PROCESSOR_ARCHITEW6432 (
        set "ARCH=x86"
    )
)

:: ── Locate NSSM ───────────────────────────────────────────────
set "NSSM_EXE="

where nssm >nul 2>&1
if %errorLevel% EQU 0 (
    set "NSSM_EXE=nssm"
    goto :do_uninstall
)

:: Check the arch-appropriate extracted binary from the installer
if "%ARCH%"=="x86" (
    if exist "%TEMP%\nssm-extract\nssm-2.24\win32\nssm.exe" (
        set "NSSM_EXE=%TEMP%\nssm-extract\nssm-2.24\win32\nssm.exe"
        goto :do_uninstall
    )
) else (
    if exist "%TEMP%\nssm-extract\nssm-2.24\win64\nssm.exe" (
        set "NSSM_EXE=%TEMP%\nssm-extract\nssm-2.24\win64\nssm.exe"
        goto :do_uninstall
    )
)

echo [ERROR] NSSM not found. Cannot uninstall service automatically.
echo.
echo To remove the service manually, run as Administrator:
echo   sc stop %SERVICE_NAME%
echo   sc delete %SERVICE_NAME%
echo.
pause
exit /b 1

:do_uninstall
echo [..] Stopping %SERVICE_NAME%...
"%NSSM_EXE%" stop %SERVICE_NAME% >nul 2>&1
timeout /t 2 /nobreak >nul

echo [..] Removing %SERVICE_NAME% service...
"%NSSM_EXE%" remove %SERVICE_NAME% confirm

echo.
echo [OK] Service removed. Files in C:\print-agent\ are kept.
echo      Delete C:\print-agent\ manually if you want a full cleanup.
echo.
pause

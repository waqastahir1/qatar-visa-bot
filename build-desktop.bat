@echo off
title Qatar Visa Bot - Building Standalone Installer
color 0A

echo ============================================================
echo   Qatar Visa Bot - Standalone Installer Builder
echo ============================================================
echo.

set ROOT=%~dp0
set FRONTEND=%ROOT%frontend
set BUNDLE_DIR=%FRONTEND%\python-bundle
set BROWSERS_DIR=%FRONTEND%\playwright-browsers

:: ── Step 1: Prepare Python bundle (if not already done) ──────────
if exist "%BUNDLE_DIR%" (
    echo Python bundle already exists. Skipping download.
    echo (Delete frontend\python-bundle\ to re-download)
    echo.
) else (
    echo Python bundle not found. Running prepare-bundle.bat first...
    echo.
    call "%ROOT%prepare-bundle.bat"
    if %errorlevel% neq 0 (
        echo ERROR: Bundle preparation failed.
        pause & exit /b 1
    )
)

cd /d "%FRONTEND%"

:: ── Step 2: Install npm dependencies ─────────────────────────────
echo [1/3] Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause & exit /b 1
)
echo Done.
echo.

:: ── Step 3: Build Next.js static files ───────────────────────────
echo [2/3] Building app UI (Next.js static export)...
call npm run build:standalone
if %errorlevel% neq 0 (
    echo ERROR: Next.js build failed.
    pause & exit /b 1
)
echo Done.
echo.

:: ── Step 4: Package with electron-builder ────────────────────────
echo [3/3] Packaging installer (this may take a few minutes)...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo ERROR: Packaging failed.
    pause & exit /b 1
)

echo.
echo ============================================================
echo   SUCCESS! Installer created at:
echo   %FRONTEND%\dist\Qatar Visa Bot Setup 1.0.0.exe
echo.
echo   This installer is fully self-contained.
echo   No Python or Node.js required on the target machine.
echo ============================================================
echo.
pause

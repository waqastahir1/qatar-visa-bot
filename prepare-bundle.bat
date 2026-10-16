@echo off
title Qatar Visa Bot - Preparing Python Bundle
color 0A

set ROOT=%~dp0
set FRONTEND=%ROOT%frontend
set BUNDLE_DIR=%FRONTEND%\python-bundle
set BROWSERS_DIR=%FRONTEND%\playwright-browsers
set REQS=%ROOT%backend\requirements.txt

echo ============================================================
echo   Qatar Visa Bot - Self-Contained Bundle Preparation
echo ============================================================
echo.
echo This script will:
echo   - Download a portable Python 3.12 (no system install needed)
echo   - Install all required Python packages into it
echo   - Download the Playwright Chromium browser into it
echo.
echo Estimated download: ~260 MB. Please stay connected.
echo.
pause

:: ── Clean previous bundle ─────────────────────────────────────────
if exist "%BUNDLE_DIR%" (
    echo Removing old Python bundle...
    rmdir /s /q "%BUNDLE_DIR%"
)
if exist "%BROWSERS_DIR%" (
    echo Removing old Playwright browsers...
    rmdir /s /q "%BROWSERS_DIR%"
)
echo.

:: ── Step 1: Download Python 3.12 embeddable ──────────────────────
echo [1/5] Downloading portable Python 3.12...
set PY_URL=https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip
set PY_ZIP=%TEMP%\python312-embed.zip

powershell -NoProfile -Command "Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_ZIP%' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo ERROR: Failed to download Python. Check your internet connection.
    pause & exit /b 1
)
echo Done.
echo.

:: ── Step 2: Extract Python ────────────────────────────────────────
echo [2/5] Extracting Python...
powershell -NoProfile -Command "Expand-Archive -Path '%PY_ZIP%' -DestinationPath '%BUNDLE_DIR%' -Force"
if %errorlevel% neq 0 (
    echo ERROR: Failed to extract Python.
    pause & exit /b 1
)
del "%PY_ZIP%"
echo Done.
echo.

:: ── Step 3: Enable pip in embeddable Python ───────────────────────
echo [3/5] Configuring Python and installing pip...

:: Uncomment "import site" in the ._pth file so pip-installed packages are found
powershell -NoProfile -Command ^
    "(Get-Content '%BUNDLE_DIR%\python312._pth') -replace '#import site', 'import site' | Set-Content '%BUNDLE_DIR%\python312._pth'"

:: Download get-pip.py
powershell -NoProfile -Command ^
    "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%BUNDLE_DIR%\get-pip.py' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo ERROR: Failed to download pip.
    pause & exit /b 1
)

:: Install pip
"%BUNDLE_DIR%\python.exe" "%BUNDLE_DIR%\get-pip.py" --no-warn-script-location
if %errorlevel% neq 0 (
    echo ERROR: Failed to install pip.
    pause & exit /b 1
)
del "%BUNDLE_DIR%\get-pip.py"
echo Done.
echo.

:: ── Step 4: Install Python packages ──────────────────────────────
echo [4/5] Installing Python packages (this may take a few minutes)...
"%BUNDLE_DIR%\python.exe" -m pip install --no-warn-script-location -r "%REQS%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python packages.
    pause & exit /b 1
)
echo Done.
echo.

:: ── Step 5: Install Playwright Chromium ──────────────────────────
echo [5/5] Downloading Playwright Chromium browser (~130 MB)...
set PLAYWRIGHT_BROWSERS_PATH=%BROWSERS_DIR%
"%BUNDLE_DIR%\python.exe" -m playwright install chromium
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Playwright Chromium.
    pause & exit /b 1
)
echo Done.
echo.

echo ============================================================
echo   Bundle prepared successfully!
echo.
echo   python-bundle\    = Portable Python + all packages
echo   playwright-browsers\ = Chromium browser
echo.
echo   You can now run build-desktop.bat to create the installer.
echo ============================================================
echo.
pause

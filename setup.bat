@echo off
title Qatar Visa Bot - Setup

echo ============================================
echo  Qatar Visa Bot - First Time Setup
echo ============================================

:: Backend setup
echo.
echo [1/4] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt

echo.
echo [2/4] Installing Playwright browsers...
playwright install chromium

:: Frontend setup
echo.
echo [3/4] Installing Node.js dependencies...
cd /d "%~dp0frontend"
npm install

:: Create .env from example
echo.
echo [4/4] Setting up environment...
cd /d "%~dp0backend"
if not exist ".env" (
    copy ".env.example" ".env"
    echo Created .env file - please edit it with your API keys.
) else (
    echo .env already exists - skipping.
)

echo.
echo ============================================
echo  Setup complete!
echo  Next: Edit backend\.env with your API keys
echo  Then: Run start.bat to launch the app
echo ============================================
pause

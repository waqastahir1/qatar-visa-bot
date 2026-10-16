@echo off
title Qatar Visa Bot - Desktop App

echo ============================================
echo  Qatar Visa Bot - Launching Desktop App...
echo ============================================
echo.
echo The app window will open once both servers are ready.
echo This may take up to 30 seconds on first launch.
echo.

cd /d "%~dp0frontend"
.\node_modules\.bin\electron .

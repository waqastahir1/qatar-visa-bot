@echo off
title Qatar Visa Bot

echo ============================================
echo  Qatar Visa Bot - Starting...
echo ============================================

:: Start backend using full Python path
start "Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && "C:\Program Files\Python312\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to be ready
timeout /t 4 /nobreak >nul

:: Start frontend
start "Frontend - Next.js" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Open browser after frontend starts
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo Both servers started!
echo Dashboard: http://localhost:3000
echo API:       http://localhost:8000
echo.

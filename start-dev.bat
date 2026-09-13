@echo off
title Vartule AI Assistant Launcher
echo ===================================================
echo     Starting Vartule AI Assistant (Backend & Frontend)
echo ===================================================
echo.

echo [1/2] Starting Backend Server (Port 8080)...
start "Vartule Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo [2/2] Starting Frontend Server (Vite)...
start "Vartule Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo  Servers are starting in separate windows!
echo  Backend: http://localhost:8080
echo  Frontend: http://localhost:5173
echo ===================================================
pause

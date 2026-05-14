@echo off
title Sufi Perfumes — Dev Startup
color 0A

echo =======================================================
echo  SUFI PERFUMES — SAFE DEV STARTUP
echo =======================================================

:: ── TASK 1: Kill all stale Node processes ───────────────
echo [1/4] Killing any running Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo       Done (ignore errors if nothing was running).

:: ── TASK 6: Clear Vite and build caches ─────────────────
echo [2/4] Clearing Vite and build caches...
if exist "node_modules\.cache" (
    rmdir /S /Q "node_modules\.cache"
    echo       Deleted node_modules\.cache
)
if exist ".vite" (
    rmdir /S /Q ".vite"
    echo       Deleted .vite
)
if exist "dist" (
    rmdir /S /Q "dist"
    echo       Deleted dist
)
if exist "build" (
    rmdir /S /Q "build"
    echo       Deleted build
)

:: ── Verify Google credentials are filled in ─────────────
echo [3/4] Checking root .env for placeholder credentials...
findstr /C:"PASTE_YOUR_ACTIVE_GOOGLE_CLIENT_ID_HERE" .env >nul 2>&1
if %ERRORLEVEL%==0 (
    echo.
    echo  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo  WARNING: GOOGLE_CLIENT_ID is still a placeholder!
    echo  Open .env and paste your REAL Google OAuth credentials
    echo  before testing Google Login.
    echo  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo.
    pause
)

:: ── TASK 10: Launch dev stack ────────────────────────────
echo [4/4] Starting dev server (npm run dev)...
echo.
npm run dev

pause

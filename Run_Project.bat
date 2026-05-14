@echo off
setlocal enabledelayedexpansion

title Sufi Startup Orchestrator
echo [SYSTEM] Starting Sufi Perfumes Development Environment...
echo.

:: 1. Start the Flask Backend in a background window
echo [BACKEND] Launching Flask Server...
start "Sufi Backend" cmd /k "title Sufi Backend && cd backend && ..\.venv\Scripts\python.exe app.py"

:: 2. Wait for Backend to be ready
echo [WAITING] Waiting for backend to initialize on port 5000...
echo [STATUS] This may take a few seconds (loading AI weights)...
echo.

:wait_loop
:: Using PowerShell to check TCP connection silently
powershell -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 5000); if ($c.Connected) { $c.Close(); exit 0 } } catch { exit 1 }" >nul 2>&1

if %errorlevel% neq 0 (
    :: Print dots to show progress
    set /p="." <nul
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

echo.
echo [SUCCESS] Backend is ONLINE!
echo.

:: 3. Start the Vite Frontend
echo [FRONTEND] Launching Vite Frontend...
start "Sufi Frontend" cmd /k "title Sufi Frontend && echo Starting Frontend... && npm run dev:frontend"

echo.
echo ===================================================
echo [ONLINE] Sufi Perfumes is running!
echo - Backend: http://127.0.0.1:5000
echo - Frontend: http://localhost:5173
echo ===================================================
echo.
echo Press any key to exit this orchestrator (servers will keep running).
pause >nul
exit

@echo off
setlocal enabledelayedexpansion

title Sufi Startup Orchestrator
echo [SYSTEM] Starting Sufi Perfumes Development Environment...
echo.

:: --- START ALL SERVICES ---

echo [1/4] Starting Flask AI ^& Product Backend (Port 5000)...
start "Sufi Backend" cmd /k "title Sufi Backend && cd backend && ..\.venv\Scripts\python.exe app.py"

echo [2/4] Starting Node.js Auth & OTP Service (Port 5001)...
start "Sufi Auth" cmd /k "title Sufi Auth && cd auth_service_node && npm start"

echo [3/4] Starting Node.js Payment Gateway (Port 3000)...
start "Sufi Payment" cmd /k "title Sufi Payment && cd payment_service_node && npm start"

echo [4/4] Starting Vite Luxury Frontend (Port 5173)...
:: Poll for backend readiness
:wait_for_backend
powershell -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 5000); if ($c.Connected) { $c.Close(); exit 0 } } catch { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    timeout /t 2 /nobreak >nul
    goto wait_for_backend
)

start "Sufi Frontend" cmd /k "title Sufi Frontend && npm run dev:frontend"

echo.
echo ======================================================
echo ✅ SUFI PERFUMES ORCHESTRATOR IS LIVE
echo ======================================================
echo.
echo [AI Backend]    : http://localhost:5000
echo [Auth Service]  : http://localhost:5001
echo [Payment Svc]   : http://localhost:3000
echo [Storefront]    : http://localhost:5173
echo.
echo Keep these terminal windows open for development.
echo.
echo Press any key to exit this orchestrator (servers will keep running).
pause >nul
exit

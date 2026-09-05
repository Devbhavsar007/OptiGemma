@echo off
title DrishtiAI — SIH Live Demo
color 0A

echo.
echo  ===========================================================
echo   ____        _     _     _   _    _    ___
echo  ^|  _ \  _ __(_)___^| |__ ^| ^|_(_)  / \  ^|_ _^|
echo  ^| ^| ^| ^|/ '__^| / __^| '_ \^| __^| ^| / _ \  ^| ^|
echo  ^| ^|_^| ^| ^|  ^| \__ \ ^| ^| ^| ^|_^| ^|/ ___ \ ^| ^|
echo  ^|____/^|_^|  ^|_^|___/_^| ^|_^|\__^|_/_/   \_\___|
echo.
echo   AI-Powered Preventive Retinal Health Platform
echo   SIH 2026 Grand Finale — Live Demo
echo  ===========================================================
echo.

:: Check Python
where python >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Python not found! Install Python 3.11+
    pause
    exit /b 1
)

:: Check Node
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js not found! Install Node 20+
    pause
    exit /b 1
)

echo  [1/3] Starting Flask Backend on port 5000...
start /B "DrishtiAI Backend" cmd /c "python app.py"
timeout /t 3 /nobreak >nul

echo  [2/3] Starting Vite Frontend on port 3000...
start /B "DrishtiAI Frontend" cmd /c "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo  ===========================================================
echo   DrishtiAI is LIVE!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:5000
echo   API Docs:  http://localhost:5000/api/health
echo   Metrics:   http://localhost:5000/api/analytics/metrics
echo  ===========================================================
echo.
echo  Press any key to stop the demo servers...
pause >nul

:: Cleanup
taskkill /FI "WINDOWTITLE eq DrishtiAI Backend" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq DrishtiAI Frontend" /F >nul 2>nul
echo  Demo servers stopped. Goodbye!

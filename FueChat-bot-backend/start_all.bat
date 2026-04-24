@echo off
echo =========================================
echo Starting FueBot Complete System
echo =========================================

echo Starting Python AI Backend (Port 8000)...
start "Python Backend" cmd /k "python main.py"

echo Starting Node.js API Backend (Port 5000)...
start "Node.js Backend" cmd /k "cd fuebot-backend && npm run dev"

echo Starting React Frontend (Port 3000)...
start "React Frontend" cmd /k "cd ..\..\frontend\frontend && npm start"

echo =========================================
echo All services are starting in separate windows.
echo React Frontend will open your browser automatically.
echo =========================================
pause

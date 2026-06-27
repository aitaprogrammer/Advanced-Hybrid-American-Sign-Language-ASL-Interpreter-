@echo off
echo Starting ASL Bridge Server...
cd /d "%~dp0"
start "" /min cmd /c "node server.js"
timeout /t 3 /nobreak > nul
echo Server started!
@echo off
echo Stopping app...
taskkill /f /im node.exe 2>nul
echo Done. App stopped.
pause

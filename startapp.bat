@echo off
cd /d "%~dp0"

echo [1/2] Starting app...
start "Actor Platform" cmd /c "npx tsx src/index.ts & pause"
timeout /t 10 /nobreak >nul

echo [2/2] Opening browser...
start http://localhost:3000/console
start http://localhost:3000/docs

echo.
echo ============================================
echo  Actor Platform is running!
echo ============================================
echo.
echo  Console: http://localhost:3000/console
echo  API Docs: http://localhost:3000/docs
echo.
echo  Login token: tok_3d946a48709a46a0b6574aab
echo.
echo  NOTE: Database is on Supabase (free plan, IPv6 only).
echo  Local DB-backed routes will return 500 without IPv6.
echo  Deploy to Vercel for full IPv6 support.
echo.
echo  Close the "Actor Platform" window to stop.
echo ============================================
pause

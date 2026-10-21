@echo off
REM Quick script to launch the AI Matching UI

REM 1. Verify Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo Node.js not found. Please install Node.js (>=22) from https://nodejs.org
  pause
  exit /b 1
)

REM 2. Install npm dependencies if they are missing
if not exist "node_modules" (
  echo Installing npm dependencies...\r\n  npm install\r\n  if %errorlevel% neq 0 (
    echo npm install failed. Check the error above.\r\n    pause
    exit /b %errorlevel%
  )
)

REM 3. Start the Next.js dev server in a new console window
start "Hanoi Artisan Bridge Dev Server" cmd /c "npm run dev"

REM 4. Give the server a moment to start (adjust if needed)
timeout /t 5 >nul

REM 5. Open the AI‑Matching UI in the default browser
start "" http://localhost:3000/ai-matching

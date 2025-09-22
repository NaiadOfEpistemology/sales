@echo off
echo Starting Ruby Auto Parts Test Suite...
echo.

echo 1. Starting development server...
start /B npm run dev

echo 2. Waiting for server to start...
timeout /t 5 /nobreak > nul

echo 3. Running automated tests...
npx playwright test

echo.
echo Tests completed! Check the test-results folder for detailed reports.
pause

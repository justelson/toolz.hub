@echo off
echo ========================================
echo MCP Analyzer - Installation Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Node.js found: 
node --version
echo.

echo [2/4] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo [3/4] Setting up environment...
if not exist .env (
    copy .env.example .env
    echo [INFO] Created .env file
    echo [ACTION REQUIRED] Please add your Groq API key to .env
) else (
    echo [INFO] .env file already exists
)
echo.

echo [4/4] Installation complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Get Groq API key: https://console.groq.com
echo 2. Add key to .env file
echo 3. Run: npm run dev
echo.
echo ========================================
pause

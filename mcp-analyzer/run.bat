@echo off
echo ========================================
echo MCP Analyzer - Starting Development Mode
echo ========================================
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo [ERROR] Dependencies not installed!
    echo Please run: install.bat
    pause
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo.
    echo [ACTION REQUIRED] Please add your Groq API key to .env
    echo Then run this script again.
    pause
    exit /b 1
)

echo [INFO] Starting MCP Analyzer...
echo.
call npm run dev

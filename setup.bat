@echo off
echo ==============================================
echo   TenderMind Docker Compose Setup
echo ==============================================
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not found. Install Docker Desktop from https://docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker found

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose not found. Install Docker Desktop which includes Compose
    pause
    exit /b 1
)
echo [OK] Docker Compose found

echo.
echo Checking .env file...
if not exist ".env" (
    echo Creating .env file (you MUST edit this with your GEMINI_API_KEY)
    echo GEMINI_API_KEY=your_gemini_api_key_here > .env
    echo ERROR: .env file created but empty!
    echo.
    echo NEXT STEPS:
    echo   1. Edit .env and set GEMINI_API_KEY=your_actual_key
    echo   2. Run setup.bat again
    echo.
    pause
    exit /b 1
)

REM Check if GEMINI_API_KEY is set
for /f "tokens=2 delims==" %%i in (findstr /i "GEMINI_API_KEY" .env) do set GEMINI_KEY=%%i
if "%GEMINI_KEY%"=="" (
    echo ERROR: GEMINI_API_KEY not set in .env
    pause
    exit /b 1
)
echo [OK] GEMINI_API_KEY found

echo.
echo ==============================================
echo   Setup Complete!
echo ==============================================
echo.
echo NEXT STEPS:
echo   Start the system:
echo      docker-compose up -d
echo.
echo   View logs:
echo      docker-compose logs -f api
echo.
echo   Services available:
echo      - API:     http://localhost:8000/api/docs
echo      - Frontend: http://localhost:3000
echo      - Flower:   http://localhost:5555
echo      - Health:   http://localhost:8000/health
echo.
echo   Stop the system:
echo      docker-compose down
echo.
pause


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
    echo Creating default .env file for Mock AI Simulation
    echo MOCK_LLM="true" > .env
    echo OLLAMA_BASE_URL="http://192.168.1.55:11434" >> .env
    echo [OK] Created .env file
) else (
    echo [OK] .env file found
)
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


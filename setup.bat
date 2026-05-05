@echo off
echo ==============================================
echo   TenderMind Setup Script
echo ==============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
echo [OK] Python found

cd backend

REM Create virtual environment if missing
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

REM Activate and install packages
call venv\Scripts\activate.bat
echo Installing dependencies (this may take a few minutes)...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Create uploads directory
if not exist "uploads" (
    mkdir uploads
    echo [OK] Created uploads directory
)

echo.
echo ==============================================
echo   Setup Complete!
echo ==============================================
echo.
echo NEXT STEPS:
echo   1. Edit backend\.env and set:
echo      - REDIS_URL      (get a free Redis from https://upstash.com)
echo      - GEMINI_API_KEY (get from https://aistudio.google.com)
echo      - TESSERACT_CMD  (install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki)
echo.
echo   2. Run the Supabase schema:
echo      - Open backend\supabase_schema.sql in Supabase SQL editor and run it
echo.
echo   3. Start the API:
echo      Double-click start-api.bat
echo.
echo   4. Start the Worker (in a separate terminal):
echo      Double-click start-worker.bat
echo.
echo   5. Test the system:
echo      cd backend
echo      venv\Scripts\python test_e2e.py --skip-wait
echo.
pause

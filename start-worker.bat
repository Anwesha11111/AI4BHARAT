@echo off
echo ==============================================
echo   Starting TenderMind Celery Worker
echo ==============================================
echo.
echo   IMPORTANT: Ensure .env has valid REDIS_URL and GEMINI_API_KEY
echo              before starting the worker.
echo.
cd backend
if not exist "venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found in backend\venv
    echo Run: python -m venv venv
    echo Then: venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)
call venv\Scripts\activate.bat
echo Virtual environment activated.
echo Starting Celery worker (solo pool, concurrency=1 for Windows stability)...
celery -A workers.tasks worker --loglevel=info --pool=solo --concurrency=1
pause

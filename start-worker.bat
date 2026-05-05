@echo off
echo ==============================================
echo   Starting TenderMind Celery Worker
echo ==============================================
cd backend
if not exist "venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found in backend\venv
    echo Please run 'python -m venv venv' and 'pip install -r requirements.txt'
    pause
    exit /b 1
)
call venv\Scripts\activate.bat
echo Virtual environment activated.
echo Starting Celery worker (solo pool for Windows)...
celery -A workers.tasks worker --loglevel=info --pool=solo
pause

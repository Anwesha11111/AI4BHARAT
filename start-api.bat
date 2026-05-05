@echo off
echo ==============================================
echo   Starting TenderMind API (FastAPI + Supabase)
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
echo Starting FastAPI server...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause

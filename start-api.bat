@echo off
echo ==============================================
echo   Starting TenderMind (FastAPI + PostgreSQL + Celery + LangChain)
echo ==============================================
echo.
echo This script starts all services using Docker Compose:
echo   - PostgreSQL 15 (database)
echo   - Redis 7 (broker)
echo   - FastAPI (API server)
echo   - Celery Worker (async processing)
echo   - Flower (monitoring)
echo   - React (frontend)
echo.
echo Services will be available at:
echo   - API:     http://localhost:8000/api/docs
echo   - Frontend: http://localhost:3000
echo   - Flower:   http://localhost:5555
echo.

docker-compose up

pause

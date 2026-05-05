@echo off
echo ==============================================
echo   TenderMind Celery Worker (Docker Compose)
echo ==============================================
echo.
echo IMPORTANT: Celery worker is now part of docker-compose
echo.
echo The worker automatically starts when you run:
echo    start-api.bat
echo.
echo View worker logs:
echo    docker-compose logs -f celery-worker
echo.
echo View Flower monitoring dashboard:
echo    http://localhost:5555
echo.
pause

pause

@echo off
REM Build and bring up Docker containers

cd /d C:\Users\dell\Documents\GitHub\towruins

echo.
echo ========================================
echo Step 1: Building backend and frontend containers...
echo ========================================
docker compose build backend frontend --parallel
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed with exit code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Step 2: Bringing up all services...
echo ========================================
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Up failed with exit code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Step 3: Checking container status...
echo ========================================
docker compose ps

echo.
echo ========================================
echo SUCCESS: All containers are running!
echo ========================================
echo.
echo Useful commands:
echo   View logs:     docker compose logs -f
echo   View specific: docker compose logs backend
echo   Stop all:      docker compose down
echo   Rebuild:       docker compose build --no-cache
echo.
pause

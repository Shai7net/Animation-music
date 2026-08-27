@echo off
title RetroViz Studio - 1-Click Updater
color 0b
cls
echo ================================================================
echo           RetroViz Studio - Auto Updater (GitHub Sync)
echo ================================================================
echo.
echo [1/3] Checking for Git repository...
if not exist ".git" (
    echo [ERROR] No .git directory found!
    echo Please make sure you cloned this project using 'git clone ^<repo-url^>'.
    echo.
    pause
    exit /b 1
)

echo [2/3] Pulling latest updates from GitHub...
echo.
git pull
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Git pull encountered an error.
    echo If you have local unsaved changes, stash them with 'git stash' or check your connection.
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Checking and updating dependencies (npm install)...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Dependency installation had issues.
    pause
    exit /b %errorlevel%
)

echo.
echo ================================================================
echo           RetroViz Studio is completely up to date!
echo ================================================================
echo.
set /p launch="Do you want to start the application now? (Y/N, default=Y): "
if "%launch%"=="" set launch=Y
if /i "%launch%"=="Y" (
    echo.
    echo Starting RetroViz Studio on http://localhost:3000 ...
    timeout /t 2 /nobreak >nul
    start http://localhost:3000
    npm run dev
)

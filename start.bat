@echo off
title RetroViz Studio - Launch
color 0a
cls
echo ================================================================
echo                   Launching RetroViz Studio
echo ================================================================
echo.
echo Opening browser at http://localhost:3000 ...
timeout /t 2 /nobreak >nul
start http://localhost:3000
npm run dev

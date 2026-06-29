@echo off
cd /d "%~dp0"
echo =====================================
echo Rodemnamu CAFE public link launcher
echo =====================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not found.
  echo Please install Node.js first: https://nodejs.org/
  echo.
  pause
  exit /b 1
)
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared is not installed, so a public link cannot be created yet.
  echo.
  echo Opening the official Cloudflare download page...
  start "" "https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/"
  echo.
  echo After installing cloudflared, run this file again.
  echo.
  pause
  exit /b 1
)
echo Starting cafe server...
start "Rodemnamu CAFE server" cmd /k "cd /d %~dp0 && node server.js"
echo Waiting for the server...
timeout /t 3 /nobreak >nul
echo.
echo Creating public link now.
echo Copy the https://....trycloudflare.com address shown below.
echo Keep this window open while using the link.
echo.
cloudflared tunnel --url http://localhost:3000
echo.
echo The public link has stopped.
pause

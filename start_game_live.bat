@echo off
title DEADRISE.IO - Multiplayer Game & Live Tunnel Server
echo ========================================================
echo   DEADRISE.IO - Starting 3D Multiplayer FPS Server
echo ========================================================
echo.

start "DEADRISE Game Server" node server.js
timeout /t 2 /nobreak >nul

echo Starting Public HTTPS Cloudflare Tunnel...
start "DEADRISE Public Tunnel" npx -y cloudflared tunnel --url http://localhost:3000

echo.
echo ========================================================
echo Game Server & Public Tunnel are RUNNING!
echo Local Link: http://localhost:3000
echo ========================================================

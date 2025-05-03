@echo off
echo Stopping all services...

:: Kill Python server
taskkill /F /IM python.exe /T

:: Kill PeerJS server
taskkill /F /IM node.exe /T

:: Kill npm processes
taskkill /F /IM npm.exe /T

echo All services stopped! You can close this window. 
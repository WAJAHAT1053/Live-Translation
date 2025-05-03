@echo off
echo Starting all services...

:: Start Python server
start cmd /k "python .\server.py"

:: Start PeerJS server
start cmd /k "peerjs --port 9000 --path /myapp"

:: Start frontend
cd frontend
start cmd /k "npm run dev"

:: Start backend
cd ..\backend
start cmd /k "node app.js"

echo All services started! You can close this window. 
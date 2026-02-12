@echo off
echo Starting Biryani POS System...

start "Backend Server" cmd /k "cd Backend && mvn spring-boot:run"
timeout /t 10

echo Starting Frontend...
start "Frontend App" cmd /k "cd Frontend && npm run dev -- --host"

echo System starting up.
echo Access Waiter App at: http://192.168.137.1:5173/waiter
echo Access Kitchen Display at: http://192.168.137.1:5173/kitchen
pause

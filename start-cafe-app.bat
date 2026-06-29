@echo off
cd /d "%~dp0"
echo 로뎀나무 CAFE 주문 앱을 시작합니다.
echo.
echo 직원 PC: http://localhost:3000/
echo 같은 Wi-Fi 공유 주소: http://172.30.1.41:3000/
echo.
echo 이 창을 닫으면 주문 앱 서버가 종료됩니다.
echo.
node server.js
pause

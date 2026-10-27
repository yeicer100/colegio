@echo off
cd /d "%~dp0"
echo Instalando dependencias de EduGest...
call npm install
if errorlevel 1 pause & exit /b 1
echo.
echo Dependencias instaladas correctamente.
echo Copia .env.example como .env y configura tu MySQL.
pause

@echo off
echo.
echo ==========================================
echo    InterTand - Servidor de Open Payments
echo ==========================================
echo.

REM Cambiar al directorio del script
cd /d "%~dp0"

REM Verificar que Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js no está instalado o no está en el PATH
    echo    Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar que existe server.js
if not exist "server.js" (
    echo ❌ Error: No se encuentra server.js en el directorio actual
    echo    Directorio actual: %CD%
    echo    Asegúrate de ejecutar este script desde el directorio InterTand
    pause
    exit /b 1
)

REM Verificar que existe package.json
if not exist "package.json" (
    echo ❌ Error: No se encuentra package.json
    echo    Ejecutando npm init...
    npm init -y
)

REM Verificar que las dependencias están instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
)

REM Verificar que existe el archivo .env
if not exist ".env" (
    echo ⚙️ Creando archivo .env por defecto...
    copy ".env.example" ".env" >nul 2>&1
)

echo ✅ Verificaciones completadas
echo 🚀 Iniciando servidor InterTand...
echo.
echo    URL de la aplicación: http://localhost:3001
echo    URL de la demo: http://localhost:3001/interledger-demo.html
echo.
echo    Presiona Ctrl+C para detener el servidor
echo.

REM Iniciar el servidor
node server.js

echo.
echo 👋 Servidor detenido
pause
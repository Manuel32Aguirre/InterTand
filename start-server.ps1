# InterTand - Script de inicio para servidor de Open Payments

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   InterTand - Servidor de Open Payments" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verificar que Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Por favor instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar que existe server.js
if (-not (Test-Path "server.js")) {
    Write-Host "❌ Error: No se encuentra server.js en el directorio actual" -ForegroundColor Red
    Write-Host "   Directorio actual: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Asegúrate de ejecutar este script desde el directorio InterTand" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar que existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encuentra package.json" -ForegroundColor Red
    Write-Host "📦 Ejecutando npm init..." -ForegroundColor Yellow
    npm init -y
}

# Verificar que las dependencias están instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Verificar que existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚙️ Creando archivo .env por defecto..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    }
}

Write-Host "✅ Verificaciones completadas" -ForegroundColor Green
Write-Host "🚀 Iniciando servidor InterTand..." -ForegroundColor Cyan
Write-Host ""
Write-Host "   URL de la aplicación: " -NoNewline
Write-Host "http://localhost:3001" -ForegroundColor Blue
Write-Host "   URL de la demo: " -NoNewline  
Write-Host "http://localhost:3001/interledger-demo.html" -ForegroundColor Blue
Write-Host ""
Write-Host "   Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar el servidor
try {
    node server.js
} catch {
    Write-Host ""
    Write-Host "❌ Error al iniciar el servidor: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "👋 Servidor detenido" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
}
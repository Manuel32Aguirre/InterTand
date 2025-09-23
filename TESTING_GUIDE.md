# 🧪 Guía Completa para Probar la Implementación de Interledger

## 🚀 **Paso 1: Iniciar el Servidor**

1. **Abrir PowerShell** en el directorio del proyecto:
   ```powershell
   cd "C:\Users\vale_\Documents\ESCUELA\ESCOM\7mo semestre\Hackathon\inter-tand\InterTand"
   ```

2. **Verificar que estás en el directorio correcto**:
   ```powershell
   Get-Location
   ls server.js
   ```

3. **Iniciar el servidor**:
   ```powershell
   node server.js
   ```

4. **Verificar que el servidor inició correctamente** - Deberías ver:
   ```
   🔧 Modo de desarrollo activado - Saltando autenticación real de Interledger
   ✅ Cliente mock de Open Payments inicializado (modo desarrollo)
   ✅ Servicio de automatización inicializado
   InterTand ejecutándose en http://localhost:3001
   🚀 Servicios de Interledger inicializados correctamente
   ```

## 🌐 **Paso 2: Acceder a las Páginas de Prueba**

### **2.1 Demo Principal de Interledger**
- **URL**: http://localhost:3001/interledger-demo.html
- **Descripción**: Interfaz completa para probar todas las funcionalidades

### **2.2 Dashboard Principal**
- **URL**: http://localhost:3001/dashboard.html
- **Descripción**: Dashboard principal del sistema de tandas

### **2.3 Página de Inicio**
- **URL**: http://localhost:3001/
- **Descripción**: Página de inicio del sistema

## 🧪 **Paso 3: Pruebas Funcionales**

### **3.1 Validar Wallet Address**

**En la demo** (http://localhost:3001/interledger-demo.html):

1. **Ir a la sección "Validar Wallet Address"**
2. **Usar una de estas URLs de ejemplo**:
   - `https://ilp.interledger-test.dev/alice`
   - `https://ilp.interledger-test.dev/bob`
   - `https://cloud-nine-wallet.com/alice`

3. **Hacer clic en "🔍 Validar Wallet"**

**Resultado esperado**:
```
✅ Wallet válida!
Nombre: Mock Wallet
Asset: USD
Escala: 2
```

### **3.2 Obtener Información de Wallet**

1. **Con la misma URL de wallet**
2. **Hacer clic en "ℹ️ Obtener Info"**

**Resultado esperado**:
- Información detallada de la wallet
- Servidores de autenticación y recursos
- Capacidades soportadas

### **3.3 Contribuir a una Tanda**

1. **Completar el formulario de contribución**:
   - **ID de Tanda**: 1
   - **ID de Usuario**: 1
   - **Monto**: 100.00
   - **Wallet del Emisor**: `https://ilp.interledger-test.dev/alice`
   - **Wallet del Receptor**: `https://ilp.interledger-test.dev/bob`

2. **Hacer clic en "🚀 Iniciar Contribución"**

**Resultado esperado**:
```
✅ Contribución iniciada!
Pago ID: [número]

🔗 Redirigiendo para autorización...
```

3. **Se abrirá un popup simulando la autorización**
4. **El popup se cerrará automáticamente** y mostrará:
```
✅ ¡Pago autorizado correctamente!
```

### **3.4 Consultar Estado de Tanda**

1. **En la sección "Estado de Tanda"**
2. **Ingresar ID de tanda**: 1
3. **Hacer clic en "📊 Obtener Estado"**

**Resultado esperado**:
```
✅ Estado de Tanda 1:
Nombre: [nombre de la tanda]
Monto Total: $[monto]
Participantes: [número]
Turno Actual: [número]
```

### **3.5 Ver Historial de Pagos**

1. **Con el mismo ID de tanda**
2. **Hacer clic en "📋 Ver Historial"**

**Resultado esperado**:
- Lista de todos los pagos de la tanda
- Estados de cada pago
- Fechas y montos

### **3.6 Actualizar Wallet de Usuario**

1. **En la sección "Configuración de Usuario"**
2. **Ingresar**:
   - **ID de Usuario**: 1
   - **Nueva Wallet**: `https://ilp.interledger-test.dev/alice`
3. **Hacer clic en "💾 Actualizar Wallet"**

**Resultado esperado**:
```
✅ Wallet address actualizada correctamente para usuario 1
```

## 🛠️ **Paso 4: Pruebas de API (Opcional)**

Si quieres probar los endpoints directamente, puedes usar herramientas como Postman o extensiones de navegador:

### **4.1 Validar Wallet**
```http
POST http://localhost:3001/api/interledger/validate-wallet
Content-Type: application/json

{
  "walletUrl": "https://ilp.interledger-test.dev/alice"
}
```

### **4.2 Contribución**
```http
POST http://localhost:3001/api/interledger/contribute
Content-Type: application/json

{
  "tandaId": 1,
  "userId": 1,
  "senderWalletUrl": "https://ilp.interledger-test.dev/alice",
  "amount": 100.00
}
```

### **4.3 Estado de Tanda**
```http
GET http://localhost:3001/api/interledger/tanda/1/status
```

## 🔧 **Paso 5: Verificar Logs del Servidor**

En la terminal donde ejecutaste el servidor, deberías ver logs como:

```
🔍 Validando wallet address: https://ilp.interledger-test.dev/alice
✅ Wallet address obtenida: Mock Wallet
🚀 Iniciando proceso de pago de tanda 1
📥 Incoming payment creado para receptor
💱 Quote creado - Costo total: 10200 USD
📤 Grant de outgoing payment creado
```

## ✅ **Verificación de Éxito**

Tu implementación está funcionando correctamente si:

1. ✅ El servidor inicia sin errores
2. ✅ La demo web carga correctamente
3. ✅ Puedes validar wallet addresses
4. ✅ Puedes iniciar contribuciones
5. ✅ Los logs muestran actividad de Interledger
6. ✅ Los estados de tanda se pueden consultar

## 🔄 **Modo de Desarrollo vs Producción**

**Actualmente en Modo de Desarrollo**:
- ✅ Usa clientes mock de Interledger
- ✅ No requiere credenciales reales
- ✅ Perfecto para desarrollo y pruebas
- ✅ Simula toda la funcionalidad

**Para Producción** (cuando tengas credenciales reales):
1. Cambiar `DEVELOPMENT_MODE=false` en `.env`
2. Configurar credenciales reales de Interledger
3. Reiniciar el servidor

## 🚨 **Solución de Problemas**

### **Si el servidor no inicia**:
1. Verificar que estás en el directorio correcto
2. Ejecutar `npm install` si faltan dependencias
3. Verificar que MySQL esté corriendo
4. Revisar el archivo `.env`

### **Si aparecen errores de autenticación**:
- Es normal en modo desarrollo
- Los mocks simulan la funcionalidad real

### **Si no cargan las páginas**:
- Verificar que el servidor esté en puerto 3001
- Revisar la consola del navegador por errores

## 🎯 **Próximos Pasos**

1. **Prueba todas las funcionalidades** en la demo
2. **Experimenta con diferentes valores** de tandas y usuarios
3. **Revisa los logs** para entender el flujo
4. **Personaliza la UI** según tus necesidades
5. **Integra con credenciales reales** cuando las tengas

¡La implementación está completa y lista para usar! 🎉
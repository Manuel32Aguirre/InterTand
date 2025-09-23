# API de Open Payments - InterTand

## Configuración Requerida

Antes de usar la API, asegúrate de tener configuradas las siguientes variables en tu archivo `.env`:

```env
# Interledger Open Payments Configuration
WALLET_ADDRESS_URL=https://ilp.interledger-test.dev/alice
KEY_ID=tu-key-id-unico
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIOze4qF6atnlqvEqWWwqKv89vml5/0bZ+xK7FLFUKbqW\n-----END PRIVATE KEY-----
DOMAIN=http://localhost:3001
```

## Endpoints Disponibles

### 1. Validar Wallet Address

**POST** `/api/interledger/validate-wallet`

Valida que una wallet address sea válida y obtenga su información.

```json
{
  "walletUrl": "https://ilp.interledger-test.dev/alice"
}
```

**Respuesta:**
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "walletAddress": {
      "id": "https://ilp.interledger-test.dev/alice",
      "publicName": "Alice",
      "assetCode": "USD",
      "assetScale": 2,
      "authServer": "https://ilp.interledger-test.dev/auth",
      "resourceServer": "https://ilp.interledger-test.dev/op"
    },
    "supports": {
      "incomingPayments": true,
      "outgoingPayments": true,
      "assetCode": "USD",
      "assetScale": 2
    }
  }
}
```

### 2. Obtener Información de Wallet

**GET** `/api/interledger/wallet-info/{walletUrl}`

Obtiene información detallada de una wallet address (URL debe estar codificada).

**Ejemplo:**
```
GET /api/interledger/wallet-info/https%3A%2F%2Filp.interledger-test.dev%2Falice
```

### 3. Iniciar Contribución a Tanda

**POST** `/api/interledger/contribute`

Inicia una contribución a una tanda usando Open Payments.

```json
{
  "tandaId": 1,
  "userId": 1,
  "senderWalletUrl": "https://ilp.interledger-test.dev/alice",
  "amount": 100.00
}
```

**Respuesta:**
```json
{
  "success": true,
  "paymentId": 123,
  "interactUrl": "https://ilp.interledger-test.dev/interact/8bb1d236-835d-45b6-8336-430ce084f678/60E93BB0A6C643C6?clientName=InterTand&clientUri=http%3A%2F%2Flocalhost%3A3001",
  "message": "Contribución iniciada. El usuario debe autorizar el pago.",
  "paymentData": {
    "incomingPayment": {
      "id": "https://ilp.interledger-test.dev/incoming-payments/08394f02-7b7b-45e2-b645-51d04e7c330c",
      "walletAddress": "https://ilp.interledger-test.dev/bob/",
      "incomingAmount": {
        "value": "10000",
        "assetCode": "USD",
        "assetScale": 2
      },
      "receivedAmount": {
        "value": "0",
        "assetCode": "USD",
        "assetScale": 2
      },
      "completed": false,
      "expiresAt": "2025-09-23T23:20:50.52Z",
      "metadata": {
        "externalRef": "TANDA-1-1727036850520",
        "description": "Contribución a tanda Ejemplo - Turno 1"
      },
      "createdAt": "2025-09-22T23:20:50.52Z"
    },
    "quote": {
      "id": "https://ilp.interledger-test.dev/quotes/ab03296b-0c8b-4776-b94e-7ee27d868d4d",
      "walletAddress": "https://ilp.interledger-test.dev/alice/",
      "receiver": "https://ilp.interledger-test.dev/incoming-payments/08394f02-7b7b-45e2-b645-51d04e7c330c",
      "debitAmount": {
        "value": "10200",
        "assetCode": "USD",
        "assetScale": 2
      },
      "receiveAmount": {
        "value": "10000",
        "assetCode": "USD",
        "assetScale": 2
      },
      "expiresAt": "2025-09-22T23:30:50.52Z",
      "createdAt": "2025-09-22T23:20:50.52Z"
    }
  }
}
```

### 2. Completar Pago

**POST** `/api/interledger/complete`

Completa un pago después de la autorización del usuario.

```json
{
  "interactRef": "reference-from-callback",
  "grantInfo": {
    "continueUri": "https://...",
    "accessToken": "token",
    "quote": {...}
  },
  "paymentId": 123
}
```

### 3. Obtener Estado de Tanda

**GET** `/api/interledger/tanda/{tandaId}/status`

Obtiene el estado completo de una tanda incluyendo participantes, pagos y estado actual.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "tanda": {...},
    "participants": [...],
    "currentReceiver": {...},
    "paymentHistory": [...],
    "readyForPayout": true,
    "currentAmount": 500.00,
    "expectedAmount": 500.00
  }
}
```

### 4. Actualizar Wallet Address

**PUT** `/api/interledger/user/{userId}/wallet`

Actualiza la wallet address de un usuario.

```json
{
  "walletAddress": "https://happy-life-bank.com/alice"
}
```

### 5. Obtener Historial de Pagos

**GET** `/api/interledger/tanda/{tandaId}/history`

Obtiene el historial completo de pagos de una tanda.

### 6. Callback de Pago

**GET** `/api/interledger/callback/tanda/{tandaId}/payment/{paymentId}`

Endpoint para el callback después de que el usuario autoriza un pago.

## Flujo de Pago Completo

### 1. Preparación
```javascript
// Actualizar wallet address del usuario
await fetch('/api/interledger/user/1/wallet', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: 'https://cloud-nine-wallet.com/alice'
  })
});
```

### 2. Iniciar Contribución
```javascript
const response = await fetch('/api/interledger/contribute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tandaId: 1,
    userId: 1,
    senderWalletUrl: 'https://cloud-nine-wallet.com/alice',
    amount: 100.00
  })
});

const result = await response.json();
if (result.success) {
  // Redirigir al usuario a result.interactUrl para autorizar el pago
  window.open(result.interactUrl, 'payment', 'width=600,height=800');
}
```

### 3. Manejar Callback
```javascript
// Escuchar el mensaje del popup de autorización
window.addEventListener('message', async (event) => {
  if (event.data.type === 'payment_result') {
    if (event.data.result === 'grant_accepted') {
      // El pago fue autorizado, se procesará automáticamente
      console.log('Pago autorizado correctamente');
      
      // Refrescar el estado de la tanda
      const status = await fetch(`/api/interledger/tanda/${event.data.tandaId}/status`);
      const tandaStatus = await status.json();
      
      // Actualizar la UI con el nuevo estado
    }
  }
});
```

## Ejemplo de Integración Frontend

```html
<!DOCTYPE html>
<html>
<head>
  <title>Contribuir a Tanda</title>
</head>
<body>
  <div>
    <h2>Contribuir a Tanda</h2>
    <form id="contributionForm">
      <input type="number" id="tandaId" placeholder="ID de Tanda" required>
      <input type="text" id="walletUrl" placeholder="Tu Wallet URL" required>
      <input type="number" id="amount" step="0.01" placeholder="Monto" required>
      <button type="submit">Contribuir</button>
    </form>
    
    <div id="status"></div>
  </div>

  <script>
    document.getElementById('contributionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const tandaId = document.getElementById('tandaId').value;
      const walletUrl = document.getElementById('walletUrl').value;
      const amount = document.getElementById('amount').value;
      const userId = 1; // Obtener del contexto de usuario logueado
      
      try {
        const response = await fetch('/api/interledger/contribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tandaId: parseInt(tandaId),
            userId: userId,
            senderWalletUrl: walletUrl,
            amount: parseFloat(amount)
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          document.getElementById('status').innerHTML = 
            '<p>Contribución iniciada. Autorizando pago...</p>';
          
          // Abrir popup para autorización
          const popup = window.open(result.interactUrl, 'payment', 
            'width=600,height=800,scrollbars=yes,resizable=yes');
          
          // Escuchar el resultado
          window.addEventListener('message', (event) => {
            if (event.data.type === 'payment_result') {
              popup.close();
              
              if (event.data.result === 'grant_accepted') {
                document.getElementById('status').innerHTML = 
                  '<p style="color: green;">✅ Contribución completada exitosamente!</p>';
              } else {
                document.getElementById('status').innerHTML = 
                  '<p style="color: red;">❌ Pago cancelado o rechazado</p>';
              }
            }
          });
          
        } else {
          document.getElementById('status').innerHTML = 
            `<p style="color: red;">Error: ${result.message}</p>`;
        }
        
      } catch (error) {
        document.getElementById('status').innerHTML = 
          `<p style="color: red;">Error: ${error.message}</p>`;
      }
    });
  </script>
</body>
</html>
```

## Notas Importantes

1. **Configuración de Dominio**: Asegúrate de que tu `WALLET_ADDRESS_URL` y `KEY_ID` estén correctamente configurados en tu proveedor de wallet.

2. **Claves Privadas**: La clave privada debe estar en formato PEM y escapada correctamente en el archivo `.env`.

3. **HTTPS**: En producción, asegúrate de usar HTTPS para todas las comunicaciones.

4. **Webhooks**: La API incluye soporte para webhooks de Interledger para automatizar las actualizaciones de estado.

5. **Seguridad**: Siempre valida y sanitiza los datos de entrada en el backend.

## Estructura de Base de Datos

Asegúrate de que tu base de datos tenga las columnas adicionales:

```sql
-- Agregar wallet_address a usuarios
ALTER TABLE users ADD COLUMN wallet_address VARCHAR(255);

-- Agregar campos adicionales a pagos
ALTER TABLE payments 
ADD COLUMN interledger_payment_id VARCHAR(255),
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Agregar status a tandas
ALTER TABLE tandas ADD COLUMN status ENUM('active', 'completed', 'cancelled') DEFAULT 'active';
```
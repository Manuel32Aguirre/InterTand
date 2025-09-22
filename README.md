# TandaPay - Tandas Digitales Inteligentes

## 🚀 Descripción del Proyecto

**TandaPay** es una aplicación innovadora que digitaliza y automatiza el sistema tradicional de tandas (rifas/susus), utilizando la API de Open Payments de Interledger para garantizar transparencia y pagos automáticos.

### 🎯 Problema que Resuelve

Las tandas tradicionales tienen varios problemas:
- Requieren confianza manual entre participantes
- Gestión engorrosa de pagos y sorteos
- Falta de transparencia en los procesos
- Riesgo de fraude o incumplimiento
- Dificultad para seguimiento de pagos

### 💡 Solución Innovadora

TandaPay automatiza todo el proceso:
- **Pagos automáticos** vía Interledger
- **Sorteos transparentes** con registro inmutable
- **Notificaciones automáticas** de pagos y sorteos
- **Sistema de reputación** basado en historial
- **Interfaz moderna** y fácil de usar

## 🏗️ Arquitectura del Sistema

### Backend
- **Node.js + Express**: API REST
- **SQLite**: Base de datos ligera
- **Open Payments**: Integración con Interledger
- **Cron Jobs**: Automatización de pagos

### Frontend
- **HTML5 + TailwindCSS**: Interfaz responsive
- **Vanilla JavaScript**: Funcionalidad dinámica
- **Font Awesome**: Iconografía

### Integración Interledger
- **Simulación de Open Payments**: Para demostración
- **Wallets virtuales**: Gestión de direcciones de pago
- **Transacciones automáticas**: Pagos y distribución de premios

## 📁 Estructura del Proyecto

```
InterTand/
├── package.json                      # Dependencias y scripts
├── Schema.sql                        # Esquema de base de datos
├── server.js                         # Servidor principal
├── tandapay.db                       # Base de datos SQLite (generada)
├── public/                           # Frontend estático
│   ├── index.html                    # Página principal
│   └── js/
│       └── app.js                    # JavaScript del frontend
├── routes/                           # Rutas de API
│   ├── users.js                      # Gestión de usuarios
│   ├── tandas.js                     # Gestión de tandas
│   └── payments.js                   # Gestión de pagos
└── server/
    └── services/
        ├── databaseService.js        # Servicio de base de datos
        └── interledgerService.js     # Servicio de Interledger
```

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Node.js (v16 o superior)
- npm

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/Manuel32Aguirre/InterTand.git
cd InterTand
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Iniciar el servidor**
```bash
npm start
```

4. **Abrir en navegador**
```
http://localhost:3001
```

## 🔧 Scripts Disponibles

```bash
npm start      # Iniciar servidor de producción
npm run dev    # Iniciar servidor de desarrollo (con nodemon)
```

## 🎮 Funcionalidades Principales

### 1. Gestión de Tandas
- **Crear tanda**: Definir monto, participantes y duración
- **Unirse a tanda**: Participar en tandas existentes
- **Ver detalles**: Información completa de cada tanda
- **Realizar sorteos**: Selección automática de ganadores

### 2. Sistema de Pagos
- **Pagos automáticos**: Cobro mensual automatizado
- **Distribución de premios**: Pago instantáneo al ganador
- **Historial completo**: Seguimiento de todas las transacciones
- **Integración Interledger**: Pagos descentralizados

### 3. Panel de Usuario
- **Dashboard**: Vista general de tandas y estadísticas
- **Mis tandas**: Tandas en las que participa
- **Historial de pagos**: Registro completo de transacciones
- **Configuración de wallet**: Gestión de direcciones de pago

## 🌐 API Endpoints

### Tandas
- `GET /api/tandas` - Listar todas las tandas
- `POST /api/tandas` - Crear nueva tanda
- `GET /api/tandas/:id` - Obtener detalles de tanda
- `POST /api/tandas/:id/join` - Unirse a tanda
- `POST /api/tandas/:id/draw` - Realizar sorteo

### Pagos
- `GET /api/payments` - Historial de pagos
- `POST /api/payments` - Procesar pago
- `POST /api/payments/interledger` - Pago vía Interledger
- `GET /api/payments/status/:txId` - Estado de transacción

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/:id` - Obtener usuario

### Sistema
- `GET /api/status` - Estado del sistema
- `POST /api/wallet/create` - Crear wallet demo

## 💾 Base de Datos

### Tablas Principales

1. **users**: Información de usuarios y wallets
2. **tandas**: Definición de tandas
3. **tanda_participants**: Participantes en cada tanda
4. **payments**: Registro de pagos
5. **draws**: Historial de sorteos
6. **interledger_transactions**: Transacciones de Interledger

## 🔗 Integración con Interledger

### Open Payments Simulation

Para esta demostración, se implementa una simulación completa de la API de Open Payments que incluye:

- **Creación de wallets**: Direcciones virtuales de pago
- **Procesamiento de pagos**: Transacciones simuladas
- **Verificación de estado**: Seguimiento de transacciones
- **Distribución de premios**: Pagos automáticos a ganadores

### Flujo de Pagos

1. **Usuario se une a tanda** → Crear wallet address
2. **Fecha de pago** → Procesar pago automático
3. **Sorteo realizado** → Distribuir premio al ganador
4. **Notificaciones** → Informar a todos los participantes

## 🎯 Casos de Uso

### Caso 1: Tanda Familiar
- 12 familiares, $1,000 mensuales
- Sorteo mensual automático
- Pagos vía Interledger
- Transparencia total del proceso

### Caso 2: Tanda de Amigos
- 6 amigos, $500 mensuales
- Tanda rápida de 6 meses
- Gestión automática de pagos
- Sistema de recordatorios

### Caso 3: Tanda Empresarial
- Empleados de una empresa
- Descuentos automáticos de nómina
- Sorteos públicos y transparentes
- Integración con sistemas de RH

## 🔮 Funcionalidades Futuras

### Fase 2
- [ ] Integración real con Open Payments
- [ ] Sistema de notificaciones push
- [ ] App móvil (React Native)
- [ ] Contratos inteligentes

### Fase 3
- [ ] Tandas con intereses
- [ ] Sistema de seguros
- [ ] Integración con otros protocolos
- [ ] Análisis predictivo

## 🛡️ Seguridad

- **Encriptación**: Datos sensibles protegidos
- **Validaciones**: Entrada de datos validada
- **Rate Limiting**: Protección contra ataques
- **Logs de auditoría**: Seguimiento de operaciones

## 📊 Métricas y Monitoreo

- **Estado del sistema**: Endpoint de salud
- **Transacciones**: Seguimiento en tiempo real
- **Errores**: Logging centralizado
- **Performance**: Métricas de respuesta

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

- **Desarrollo**: Manuel Aguirre
- **Concept**: Sistema de Tandas Digitales
- **Tecnología**: Open Payments de Interledger

## 📞 Contacto

- **GitHub**: [Manuel32Aguirre](https://github.com/Manuel32Aguirre)
- **Proyecto**: [InterTand](https://github.com/Manuel32Aguirre/InterTand)

---

> **Nota**: Esta es una demostración técnica que simula la integración con Open Payments de Interledger. Para un entorno de producción, se requiere configuración real con proveedores de Interledger autorizados.

**¡TandaPay - Revolucionando las tandas tradicionales! 🚀💰**

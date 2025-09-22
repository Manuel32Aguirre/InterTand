// Importar dependencias
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar servicios
const databaseService = require('./server/services/databaseService');
const interledgerService = require('./server/services/interledgerService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static('public'));

// Importar rutas (cada una conecta a su controlador)
const userRoutes = require('./routes/users');
const tandaRoutes = require('./routes/tandas');
const paymentRoutes = require('./routes/payments');

// Usar rutas de API
app.use('/api/users', userRoutes);
app.use('/api/tandas', tandaRoutes);
app.use('/api/payments', paymentRoutes);

// Ruta raíz - servir la aplicación web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de estado de la API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    message: '🚀 TandaPay API funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: databaseService.db ? 'connected' : 'disconnected',
      interledger: interledgerService.initialized ? 'ready' : 'demo-mode'
    }
  });
});

// Ruta especial para crear wallet demo
app.post('/api/wallet/create', async (req, res) => {
  try {
    const { email } = req.body;
    const wallet = await interledgerService.createWalletAddress(email);
    res.json({
      success: true,
      wallet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: 'La ruta solicitada no existe en el servidor'
  });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: 'Algo salió mal en el servidor'
  });
});

// Inicializar servicios y arrancar servidor
async function startServer() {
  try {
    // Inicializar base de datos
    await databaseService.initialize();
    
    // Inicializar servicio Interledger
    await interledgerService.initialize();
    
    // Arrancar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor TandaPay corriendo en http://localhost:${PORT}`);
      console.log(`📡 API disponible en http://localhost:${PORT}/api/status`);
      console.log(`💳 Servicio Interledger: ${interledgerService.initialized ? 'Conectado' : 'Modo Demo'}`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  databaseService.close();
  process.exit(0);
});

// Iniciar el servidor
startServer();

module.exports = app;

// TandaPay Simple - Express + MySQL
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware básico
app.use(express.json());
app.use(express.static('public'));

// Configuración de MySQL
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Cambia esto por tu password de MySQL
    database: 'tandapay',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Pool de conexiones MySQL
const pool = mysql.createPool(dbConfig);

// --- RUTAS SIMPLES ---

// Registrar usuario
app.post('/api/register', async (req, res) => {
    try {
        const { name, email } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO users (name, email) VALUES (?, ?)', 
            [name, email]
        );
        
        res.json({ 
            success: true, 
            userId: result.insertId,
            message: 'Usuario registrado exitosamente' 
        });
    } catch (error) {
        console.error('Error registro:', error);
        res.status(400).json({ error: 'Email ya existe o error en base de datos' });
    }
});

// Login simple (solo verifica si existe)
app.post('/api/login', async (req, res) => {
    try {
        const { email } = req.body;
        
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        
        const user = rows[0];
        res.json({ 
            success: true,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

// Obtener todas las tandas
app.get('/api/tandas', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM tandas ORDER BY created_at DESC');
        res.json({ tandas: rows });
    } catch (error) {
        console.error('Error obteniendo tandas:', error);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

// Crear nueva tanda
app.post('/api/tandas', async (req, res) => {
    try {
        const { name, total_amount, max_participants } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO tandas (name, total_amount, max_participants) VALUES (?, ?, ?)',
            [name, total_amount, max_participants]
        );
        
        res.json({ 
            success: true, 
            tandaId: result.insertId,
            message: 'Tanda creada exitosamente' 
        });
    } catch (error) {
        console.error('Error creando tanda:', error);
        res.status(500).json({ error: 'Error creando tanda' });
    }
});

// Obtener pagos de un usuario
app.get('/api/payments/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [rows] = await pool.execute(
            `SELECT p.*, t.name as tanda_name 
             FROM payments p 
             JOIN tandas t ON p.tanda_id = t.id 
             WHERE p.user_id = ? 
             ORDER BY p.created_at DESC`,
            [userId]
        );
        
        res.json({ payments: rows });
    } catch (error) {
        console.error('Error obteniendo pagos:', error);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

// Crear nuevo pago
app.post('/api/payments', async (req, res) => {
    try {
        const { tanda_id, user_id, amount, type } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO payments (tanda_id, user_id, amount, type, status) VALUES (?, ?, ?, ?, ?)',
            [tanda_id, user_id, amount, type, 'pending']
        );
        
        res.json({ 
            success: true, 
            paymentId: result.insertId,
            message: 'Pago registrado' 
        });
    } catch (error) {
        console.error('Error creando pago:', error);
        res.status(500).json({ error: 'Error creando pago' });
    }
});

// *** ENDPOINT ESPECIAL PARA TU IMPLEMENTACIÓN DE INTERLEDGER/OPEN PAYMENTS ***
app.post('/api/interledger/payment', async (req, res) => {
    try {
        // AQUÍ PUEDES IMPLEMENTAR TU INTEGRACIÓN CON OPEN PAYMENTS
        console.log('💳 Procesando pago con Interledger:', req.body);
        
        // IMPLEMENTA AQUÍ:
        // - Conectar con tu wallet provider
        // - Crear incoming/outgoing payments  
        // - Manejar quotes y grants
        // - Integrar con MySQL para actualizar el estado
        
        const { paymentId, amount, walletAddress } = req.body;
        
        // Ejemplo: actualizar estado del pago en MySQL después del procesamiento
        if (paymentId) {
            await pool.execute(
                'UPDATE payments SET status = ? WHERE id = ?',
                ['completed', paymentId]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Listo para tu implementación de Open Payments',
            data: req.body
        });
    } catch (error) {
        console.error('Error en Interledger payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ruta para servir las páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Inicializar servidor
async function startServer() {
    try {
        // Probar conexión a MySQL
        const connection = await pool.getConnection();
        console.log('✅ Conectado a MySQL exitosamente');
        connection.release();
        
        app.listen(PORT, () => {
            console.log(`🚀 TandaPay Simple ejecutándose en http://localhost:${PORT}`);
            console.log('📊 Base de datos: MySQL');
            console.log('🔗 Endpoint Interledger: /api/interledger/payment');
            console.log('💡 Listo para implementar Open Payments API');
        });
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.log('🔧 Asegúrate de que MySQL esté ejecutándose y la base de datos "tandapay" exista');
        process.exit(1);
    }
}

startServer();

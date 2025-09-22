const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const { createAuthenticatedClient } = require('@interledger/open-payments');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static('public'));

const dbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'manuel',
    password: '1234',
    database: 'inter_tand',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Configuración inicial
async function setupInterledgerClient() {
    try {
        const privateKeyPath = './private-key.pem';
        
        // a. Importar dependencias y configurar el cliente
        // async () => {
        const client = await createAuthenticatedClient({
            walletAddressUrl: 'https://ilp.interledger-test.dev/alice/test',
            privateKey: privateKeyPath,
            keyId: 'b042f0dc-0e5c-4a38-b928-b85b1cbddbc6'
        });
        
        // b. Crear una instancia del cliente Open Payments
        // c. Cargar la clave privada del archivo
        // d. Configurar las direcciones de las billeteras del remitente y el receptor
        
        // Flujo de pago entre pares
        
        // 1. Obtener una concesión para un pago entrante)
        // 2. Obtener una concesión para un pago entrante  
        // 3. Crear un pago entrante para el receptor
        
        return client;
    } catch (error) {
        console.error('Error configurando cliente Interledger:', error);
        return null;
    }
}

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
        res.status(400).json({ error: 'Email ya existe o error en base de datos' });
    }
});

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
        res.status(500).json({ error: 'Error en servidor' });
    }
});

app.get('/api/tandas', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM tandas ORDER BY created_at DESC');
        res.json({ tandas: rows });
    } catch (error) {
        res.status(500).json({ error: 'Error en servidor' });
    }
});

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
        res.status(500).json({ error: 'Error creando tanda' });
    }
});

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
        res.status(500).json({ error: 'Error en servidor' });
    }
});

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
        res.status(500).json({ error: 'Error creando pago' });
    }
});

app.post('/api/interledger/payment', async (req, res) => {
    try {
        const { paymentId, amount, walletAddress } = req.body;
        
        const client = await setupInterledgerClient();
        if (!client) {
            return res.status(500).json({ error: 'Error configurando cliente Interledger' });
        }
        
        console.log('Procesando pago con Interledger:', req.body);
        
        if (paymentId) {
            await pool.execute(
                'UPDATE payments SET status = ? WHERE id = ?',
                ['completed', paymentId]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Pago procesado con Interledger',
            data: req.body
        });
    } catch (error) {
        console.error('Error en Interledger payment:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

async function startServer() {
    try {
        const connection = await pool.getConnection();
        connection.release();
        app.listen(PORT, () => {
            console.log(`InterTand ejecutándose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error conectando a MySQL:', error.message);
        process.exit(1);
    }
}

startServer();

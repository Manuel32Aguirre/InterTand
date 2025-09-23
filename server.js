const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
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
            walletAddressUrl: '',
            privateKey: privateKeyPath,
            keyId: ''
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

app.get('/api/setup-db', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Crear tablas si no existen
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                turno INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tandas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                current_amount DECIMAL(10,2) DEFAULT 0.00,
                max_participants INT NOT NULL,
                current_turn INT DEFAULT 1,
                period ENUM('semanal', 'quincenal', 'mensual') NOT NULL DEFAULT 'mensual',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanda_id INT,
                user_id INT,
                amount DECIMAL(10,2) NOT NULL,
                type ENUM('contribution', 'payout') NOT NULL,
                status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tanda_id) REFERENCES tandas(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tanda_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanda_id INT,
                user_id INT,
                turn_order INT NOT NULL,
                has_received BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tanda_id) REFERENCES tandas(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE KEY unique_tanda_user (tanda_id, user_id),
                UNIQUE KEY unique_tanda_turn (tanda_id, turn_order)
            )
        `);

        res.json({ 
            success: true, 
            message: 'Base de datos configurada exitosamente'
        });
    } catch (error) {
        console.error('Error configurando base de datos:', error);
        res.status(500).json({ 
            error: 'Error configurando base de datos: ' + error.message 
        });
    } finally {
        connection.release();
    }
});

app.get('/api/test', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.execute('SELECT 1 as test');
        connection.release();
        res.json({ 
            success: true, 
            message: 'Conexión a base de datos exitosa',
            data: result
        });
    } catch (error) {
        console.error('Error en test de DB:', error);
        res.status(500).json({ error: 'Error conectando a base de datos: ' + error.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        console.log('Datos recibidos en registro:', req.body);
        const { name, email, password } = req.body;
        
        // Validar que la contraseña tenga al menos 6 caracteres
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
            [name, email, hashedPassword]
        );
        
        console.log('Usuario registrado exitosamente:', result.insertId);
        res.json({ 
            success: true, 
            userId: result.insertId,
            message: 'Usuario registrado exitosamente' 
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(400).json({ error: 'Email ya existe o error en base de datos' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        
        const user = rows[0];
        
        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }
        
        res.json({ 
            success: true,
            user: { id: user.id, name: user.name, email: user.email, turno: user.turno }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

app.get('/api/tandas', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT t.*, 
                   tp_current.user_id as current_user_id,
                   u_current.name as current_user_name
            FROM tandas t 
            LEFT JOIN tanda_participants tp_current ON t.id = tp_current.tanda_id AND tp_current.turn_order = t.current_turn
            LEFT JOIN users u_current ON tp_current.user_id = u_current.id
            ORDER BY t.created_at DESC
        `);
        res.json({ tandas: rows });
    } catch (error) {
        console.error('Error obteniendo tandas:', error);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

app.post('/api/tandas/:id/join', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id: tanda_id } = req.params;
        const { user_id } = req.body;
        
        // Verificar que la tanda existe y no esté llena
        const [tandaInfo] = await connection.execute(
            'SELECT max_participants FROM tandas WHERE id = ?',
            [tanda_id]
        );
        
        if (tandaInfo.length === 0) {
            return res.status(404).json({ error: 'Tanda no encontrada' });
        }
        
        // Contar participantes actuales
        const [participantCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM tanda_participants WHERE tanda_id = ?',
            [tanda_id]
        );
        
        if (participantCount[0].count >= tandaInfo[0].max_participants) {
            return res.status(400).json({ error: 'La tanda está llena' });
        }
        
        // Verificar si el usuario ya está en la tanda
        const [existing] = await connection.execute(
            'SELECT id FROM tanda_participants WHERE tanda_id = ? AND user_id = ?',
            [tanda_id, user_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Ya estás participando en esta tanda' });
        }
        
        // Asignar el siguiente turno disponible
        const nextTurnOrder = participantCount[0].count + 1;
        
        // Agregar participante
        await connection.execute(
            'INSERT INTO tanda_participants (tanda_id, user_id, turn_order) VALUES (?, ?, ?)',
            [tanda_id, user_id, nextTurnOrder]
        );
        
        // Actualizar el turno del usuario
        await connection.execute(
            'UPDATE users SET turno = ? WHERE id = ?',
            [nextTurnOrder, user_id]
        );
        
        await connection.commit();
        res.json({
            success: true,
            message: 'Te has unido a la tanda exitosamente',
            turnOrder: nextTurnOrder
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error uniéndose a tanda:', error);
        res.status(500).json({ error: 'Error uniéndose a la tanda' });
    } finally {
        connection.release();
    }
});

app.get('/api/tandas/:id/participants', async (req, res) => {
    try {
        const { id: tanda_id } = req.params;
        const [rows] = await pool.execute(
            `SELECT tp.turn_order, tp.has_received, u.name, u.email 
             FROM tanda_participants tp 
             JOIN users u ON tp.user_id = u.id 
             WHERE tp.tanda_id = ? 
             ORDER BY tp.turn_order`,
            [tanda_id]
        );
        res.json({ participants: rows });
    } catch (error) {
        console.error('Error obteniendo participantes:', error);
        res.status(500).json({ error: 'Error obteniendo participantes' });
    }
});

app.post('/api/tandas', async (req, res) => {
    try {
        const { name, total_amount, max_participants, period } = req.body;
        
        if (!period || !['semanal', 'quincenal', 'mensual'].includes(period)) {
            return res.status(400).json({ error: 'Periodo debe ser: semanal, quincenal o mensual' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO tandas (name, total_amount, max_participants, period) VALUES (?, ?, ?, ?)',
            [name, total_amount, max_participants, period]
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
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { tanda_id, user_id, amount, type } = req.body;
        
        // Obtener información de la tanda y verificar el turno actual
        const [tandaInfo] = await connection.execute(
            'SELECT t.*, tp.user_id as current_user_id FROM tandas t ' +
            'LEFT JOIN tanda_participants tp ON t.id = tp.tanda_id AND tp.turn_order = t.current_turn ' +
            'WHERE t.id = ?',
            [tanda_id]
        );
        
        if (tandaInfo.length === 0) {
            return res.status(404).json({ error: 'Tanda no encontrada' });
        }
        
        const tanda = tandaInfo[0];
        
        // REGLA: El usuario del turno actual NO puede pagar
        if (type === 'contribution' && tanda.current_user_id === user_id) {
            return res.status(400).json({ 
                error: 'No puedes pagar durante tu turno. Es tu momento de recibir la tanda.' 
            });
        }
        
        // Calcular el monto individual que cada persona debe aportar
        const montoIndividual = tanda.total_amount / tanda.max_participants;
        
        // Registrar el pago
        const [result] = await connection.execute(
            'INSERT INTO payments (tanda_id, user_id, amount, type, status) VALUES (?, ?, ?, ?, ?)',
            [tanda_id, user_id, amount, type, 'completed']
        );
        
        if (type === 'contribution') {
            // Actualizar current_amount de la tanda
            await connection.execute(
                'UPDATE tandas SET current_amount = current_amount + ? WHERE id = ?',
                [amount, tanda_id]
            );
            
            // Verificar si ya se completó la ronda (todos menos el turno actual han pagado)
            const [paymentInfo] = await connection.execute(
                'SELECT SUM(amount) as total_paid FROM payments WHERE tanda_id = ? AND type = ? AND status = ?',
                [tanda_id, 'contribution', 'completed']
            );
            
            const totalPaid = paymentInfo[0].total_paid || 0;
            const expectedTotal = montoIndividual * (tanda.max_participants - 1); // Todos menos el turno actual
            
            if (totalPaid >= expectedTotal) {
                // El turno actual recibe el dinero (total menos su aportación)
                const montoARecibir = totalPaid; // Ya está descontado porque el turno actual no pagó
                
                // Registrar el pago de salida para el turno actual
                await connection.execute(
                    'INSERT INTO payments (tanda_id, user_id, amount, type, status) VALUES (?, ?, ?, ?, ?)',
                    [tanda_id, tanda.current_user_id, montoARecibir, 'payout', 'completed']
                );
                
                // Marcar que la persona actual ha recibido su pago
                await connection.execute(
                    'UPDATE tanda_participants SET has_received = TRUE WHERE tanda_id = ? AND turn_order = ?',
                    [tanda_id, tanda.current_turn]
                );
                
                // Avanzar al siguiente turno
                const nextTurn = tanda.current_turn >= tanda.max_participants ? 1 : tanda.current_turn + 1;
                await connection.execute(
                    'UPDATE tandas SET current_turn = ?, current_amount = 0 WHERE id = ?',
                    [nextTurn, tanda_id]
                );
            }
        }
        
        await connection.commit();
        res.json({ 
            success: true, 
            paymentId: result.insertId,
            message: 'Pago registrado exitosamente' 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creando pago:', error);
        res.status(500).json({ error: 'Error creando pago' });
    } finally {
        connection.release();
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

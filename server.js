const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const interledgerService = require('./services/interledgerService');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static('public'));

// Configuración de base de datos usando variables de entorno
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'D+Oscar08',
    database: process.env.DB_NAME || 'inter_tand',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Configuración inicial con Interledger
async function setupServer() {
    try {
        console.log('🔧 Iniciando servidor con integración Interledger...');
        
        // Inicializar servicio de Interledger
        const interledgerReady = await interledgerService.initialize();
        
        if (interledgerReady) {
            console.log('✅ Servidor listo con Interledger');
        } else {
            console.log('⚠️ Servidor iniciado sin Interledger (modo fallback)');
        }
        
        return interledgerReady;
    } catch (error) {
        console.error('❌ Error en setup:', error);
        return false;
    }
}

// Configuración inicial simplificada (sin Interledger por ahora)
async function setupBasicServer() {
    try {
        console.log('🔧 Modo de desarrollo - Sin integración de Interledger');
        return true;
    } catch (error) {
        console.error('❌ Error en configuración básica:', error.message);
        return false;
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
                saldo DECIMAL(10,2) DEFAULT 1000.00,
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
        
        // Validar que la contraseña tenga entre 6 y 20 caracteres
        if (!password || password.length < 6 || password.length > 20) {
            return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 20 caracteres' });
        }
        
        // Registrar usuario sin encriptar contraseña
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, saldo) VALUES (?, ?, ?, ?)', 
            [name, email, password, 1000.00]
        );
        
        console.log('Usuario registrado exitosamente:', result.insertId);
        res.json({ 
            success: true, 
            userId: result.insertId,
            saldo: 1000.00,
            message: 'Usuario registrado exitosamente con saldo inicial de $1,000' 
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
        
        // Validar longitud de contraseña
        if (password.length > 20) {
            return res.status(400).json({ error: 'Contraseña demasiado larga (máximo 20 caracteres)' });
        }
        
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        
        const user = rows[0];
        
        // Verificar contraseña sin encriptación
        if (password !== user.password) {
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }
        
        res.json({ 
            success: true,
            user: { id: user.id, name: user.name, email: user.email, turno: user.turno, saldo: user.saldo }
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

app.get('/api/tandas/:id/user-status/:userId', async (req, res) => {
    try {
        const { id: tanda_id, userId: user_id } = req.params;
        
        const [participation] = await pool.execute(
            'SELECT turn_order FROM tanda_participants WHERE tanda_id = ? AND user_id = ?',
            [tanda_id, user_id]
        );
        
        res.json({
            isParticipant: participation.length > 0,
            turnOrder: participation.length > 0 ? participation[0].turn_order : null
        });
    } catch (error) {
        console.error('Error verificando estado del usuario:', error);
        res.status(500).json({ error: 'Error verificando estado del usuario' });
    }
});

app.get('/api/tandas/:id/available-turns', async (req, res) => {
    try {
        const { id: tanda_id } = req.params;
        
        // Obtener información de la tanda
        const [tandaInfo] = await pool.execute(
            'SELECT max_participants FROM tandas WHERE id = ?',
            [tanda_id]
        );
        
        if (tandaInfo.length === 0) {
            return res.status(404).json({ error: 'Tanda no encontrada' });
        }
        
        // Obtener turnos ocupados
        const [occupiedTurns] = await pool.execute(
            'SELECT turn_order FROM tanda_participants WHERE tanda_id = ?',
            [tanda_id]
        );
        
        const occupied = occupiedTurns.map(row => row.turn_order);
        const maxParticipants = tandaInfo[0].max_participants;
        
        // Generar lista de turnos disponibles
        const availableTurns = [];
        for (let i = 1; i <= maxParticipants; i++) {
            if (!occupied.includes(i)) {
                availableTurns.push(i);
            }
        }
        
        res.json({ 
            availableTurns,
            occupiedTurns: occupied,
            maxParticipants
        });
    } catch (error) {
        console.error('Error obteniendo turnos disponibles:', error);
        res.status(500).json({ error: 'Error obteniendo turnos disponibles' });
    }
});

app.post('/api/tandas/:id/join', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id: tanda_id } = req.params;
        const { user_id, selected_turn } = req.body;
        
        // Verificar que la tanda existe y no esté llena
        const [tandaInfo] = await connection.execute(
            'SELECT max_participants FROM tandas WHERE id = ?',
            [tanda_id]
        );
        
        if (tandaInfo.length === 0) {
            return res.status(404).json({ error: 'Tanda no encontrada' });
        }
        
        // Validar que el turno seleccionado es válido
        if (!selected_turn || selected_turn < 1 || selected_turn > tandaInfo[0].max_participants) {
            return res.status(400).json({ error: 'Turno seleccionado no es válido' });
        }
        
        // Verificar que el turno esté disponible
        const [turnCheck] = await connection.execute(
            'SELECT id FROM tanda_participants WHERE tanda_id = ? AND turn_order = ?',
            [tanda_id, selected_turn]
        );
        
        if (turnCheck.length > 0) {
            return res.status(400).json({ error: 'El turno seleccionado ya está ocupado' });
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
        
        // Agregar participante con el turno seleccionado
        await connection.execute(
            'INSERT INTO tanda_participants (tanda_id, user_id, turn_order) VALUES (?, ?, ?)',
            [tanda_id, user_id, selected_turn]
        );
        
        // Actualizar el turno del usuario
        await connection.execute(
            'UPDATE users SET turno = ? WHERE id = ?',
            [selected_turn, user_id]
        );
        
        await connection.commit();
        res.json({
            success: true,
            message: 'Te has unido a la tanda exitosamente',
            turnOrder: selected_turn
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
        
        // Crear la tanda sin asignar participantes
        const [result] = await pool.execute(
            'INSERT INTO tandas (name, total_amount, max_participants, period) VALUES (?, ?, ?, ?)',
            [name, total_amount, max_participants, period]
        );
        
        res.json({ 
            success: true, 
            tandaId: result.insertId,
            message: 'Tanda creada exitosamente. Ahora puedes unirte y seleccionar tu turno.'
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
        
        // 🌟 INTEGRACIÓN INTERLEDGER - Enviar pago real
        let paymentInfo = null;
        if (type === 'contribution') {
            try {
                // Obtener wallets de emisor y receptor
                const [senderInfo] = await connection.execute(
                    'SELECT wallet_address FROM users WHERE id = ?', [user_id]
                );
                const [receiverInfo] = await connection.execute(
                    'SELECT wallet_address FROM users WHERE id = ?', [tanda.current_user_id]
                );
                
                if (senderInfo[0]?.wallet_address && receiverInfo[0]?.wallet_address) {
                    console.log(`💸 Enviando $${amount} via Interledger`);
                    console.log(`De: ${senderInfo[0].wallet_address} -> A: ${receiverInfo[0].wallet_address}`);
                    
                    paymentInfo = await interledgerService.sendPayment(
                        senderInfo[0].wallet_address,
                        receiverInfo[0].wallet_address,
                        amount
                    );
                    
                    console.log('✅ Pago Interledger iniciado:', paymentInfo.success);
                } else {
                    console.log('⚠️ Wallets no configuradas, continuando sin Interledger');
                }
            } catch (interledgerError) {
                console.error('❌ Error en Interledger (continuando):', interledgerError.message);
                // Continuar con el proceso normal aunque falle Interledger
            }
        }
        
        // Registrar el pago (como pending si hay Interledger)
        const paymentStatus = paymentInfo ? 'pending' : 'completed';
        const interledgerData = paymentInfo ? JSON.stringify({
            continueUri: paymentInfo.continueUri,
            continueToken: paymentInfo.continueToken,
            quoteId: paymentInfo.quote.id,
            walletResourceServer: paymentInfo.sendingWalletAddress.resourceServer,
            walletAddress: paymentInfo.sendingWalletAddress.id
        }) : null;
        
        const [result] = await connection.execute(
            'INSERT INTO payments (tanda_id, user_id, amount, type, status, interledger_payment_id) VALUES (?, ?, ?, ?, ?, ?)',
            [tanda_id, user_id, amount, type, paymentStatus, interledgerData]
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
        
        // Preparar respuesta base
        let responseData = { 
            success: true, 
            paymentId: result.insertId,
            message: 'Pago registrado exitosamente' 
        };
        
        // Si hay información de Interledger, incluirla en la respuesta
        if (paymentInfo && paymentInfo.interactionUrl) {
            // Agregar el paymentId a la URL de redirección
            const redirectUrl = `${paymentInfo.interactionUrl}&paymentId=${result.insertId}`;
            responseData.interledger = {
                interactionUrl: redirectUrl,
                paymentId: result.insertId
            };
            responseData.message = 'Pago registrado. Redirigiendo para completar transferencia...';
        }
        
        res.json(responseData);
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
        
        console.log('🔧 Modo desarrollo - Simulando pago con Interledger:', req.body);
        
        if (paymentId) {
            await pool.execute(
                'UPDATE payments SET status = ? WHERE id = ?',
                ['completed', paymentId]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Pago simulado en modo desarrollo',
            data: req.body,
            note: 'En producción se procesaría con Interledger real'
        });
    } catch (error) {
        console.error('Error en endpoint de pago:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para confirmar pagos de Interledger
app.get('/api/interledger/confirm', async (req, res) => {
    try {
        const { interact_ref, hash, paymentId } = req.query;
        
        if (!interact_ref || !hash) {
            return res.status(400).json({ 
                error: 'Faltan parámetros de confirmación' 
            });
        }
        
        console.log('🔄 Confirmando pago Interledger:', { interact_ref, hash, paymentId });
        
        // Si tenemos el paymentId, buscar la información del pago
        if (paymentId) {
            const [paymentRows] = await pool.execute(
                'SELECT * FROM payments WHERE id = ? AND status = "pending"',
                [paymentId]
            );
            
            if (paymentRows.length > 0) {
                const payment = paymentRows[0];
                const interledgerData = JSON.parse(payment.interledger_payment_id);
                
                // Confirmar el pago usando el servicio
                const confirmationResult = await interledgerService.confirmPayment(
                    interledgerData.continueUri,
                    interledgerData.continueToken,
                    interledgerData.walletResourceServer,
                    interledgerData.continueToken,
                    interledgerData.walletAddress,
                    interledgerData.quoteId
                );
                
                if (confirmationResult.success) {
                    // Actualizar el estado del pago
                    await pool.execute(
                        'UPDATE payments SET status = "completed" WHERE id = ?',
                        [paymentId]
                    );
                    
                    res.redirect(`/dashboard.html?payment=success&id=${paymentId}`);
                } else {
                    res.redirect(`/dashboard.html?payment=error&message=${encodeURIComponent('Error confirmando pago')}`);
                }
            } else {
                res.redirect(`/dashboard.html?payment=error&message=${encodeURIComponent('Pago no encontrado')}`);
            }
        } else {
            res.redirect(`/dashboard.html?payment=error&message=${encodeURIComponent('ID de pago faltante')}`);
        }
        
    } catch (error) {
        console.error('Error confirmando pago:', error);
        res.redirect(`/dashboard.html?payment=error&message=${encodeURIComponent('Error de confirmación')}`);
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
        // Probar conexión a la base de datos
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL exitosa');
        connection.release();
        
        // Configuración del servidor con Interledger
        await setupServer();
        
        app.listen(PORT, () => {
            console.log(`✅ InterTand ejecutándose en http://localhost:${PORT}`);
            console.log('� Servidor iniciado en modo desarrollo (sin Interledger)');
            console.log('📋 Accede a:');
            console.log(`   - Inicio: http://localhost:${PORT}`);
            console.log(`   - Dashboard: http://localhost:${PORT}/dashboard`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error.message);
        console.log('\n🔧 Posibles soluciones:');
        console.log('   1. Verificar que MySQL esté ejecutándose');
        console.log('   2. Verificar credenciales en archivo .env');
        console.log('   3. Verificar que la base de datos "inter_tand" exista');
        process.exit(1);
    }
}

startServer();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../../tandapay.db');
        this.schemaPath = path.join(__dirname, '../../Schema.sql');
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error conectando a la base de datos:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conectado a la base de datos SQLite');
                    this.initializeTables()
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    async initializeTables() {
        try {
            const schema = fs.readFileSync(this.schemaPath, 'utf8');
            return new Promise((resolve, reject) => {
                this.db.exec(schema, (err) => {
                    if (err) {
                        console.error('❌ Error inicializando tablas:', err.message);
                        reject(err);
                    } else {
                        console.log('✅ Tablas inicializadas correctamente');
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('❌ Error leyendo schema:', error.message);
            throw error;
        }
    }

    // Métodos para usuarios
    async createUser(userData) {
        const { name, email, walletAddress, paymentPointer } = userData;
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO users (name, email, wallet_address, payment_pointer) 
                        VALUES (?, ?, ?, ?)`;
            
            this.db.run(sql, [name, email, walletAddress, paymentPointer], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...userData });
                }
            });
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE id = ?`;
            this.db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE email = ?`;
            this.db.get(sql, [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Métodos para tandas
    async createTanda(tandaData) {
        const { name, description, totalAmount, monthlyPayment, maxParticipants, createdBy } = tandaData;
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO tandas (name, description, total_amount, monthly_payment, max_participants, created_by) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
            
            this.db.run(sql, [name, description, totalAmount, monthlyPayment, maxParticipants, createdBy], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...tandaData });
                }
            });
        });
    }

    async getAllTandas() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT t.*, u.name as creator_name 
                        FROM tandas t 
                        LEFT JOIN users u ON t.created_by = u.id 
                        ORDER BY t.created_at DESC`;
            
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getTandaById(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT t.*, u.name as creator_name 
                        FROM tandas t 
                        LEFT JOIN users u ON t.created_by = u.id 
                        WHERE t.id = ?`;
            
            this.db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updateTandaStatus(id, status) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE tandas SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, [status, id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    // Métodos para participantes
    async addParticipantToTanda(tandaId, userId) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                // Añadir participante
                const sql1 = `INSERT INTO tanda_participants (tanda_id, user_id) VALUES (?, ?)`;
                this.db.run(sql1, [tandaId, userId], function(err) {
                    if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    // Actualizar contador de participantes
                    const sql2 = `UPDATE tandas SET current_participants = current_participants + 1 WHERE id = ?`;
                    this.db.run(sql2, [tandaId], function(err) {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                        } else {
                            this.db.run('COMMIT');
                            resolve({ participantId: this.lastID });
                        }
                    });
                });
            });
        });
    }

    async getTandaParticipants(tandaId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT tp.*, u.name, u.email, u.wallet_address 
                        FROM tanda_participants tp 
                        JOIN users u ON tp.user_id = u.id 
                        WHERE tp.tanda_id = ? 
                        ORDER BY tp.joined_at`;
            
            this.db.all(sql, [tandaId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Métodos para pagos
    async createPayment(paymentData) {
        const { tandaId, userId, amount, type, status, dueDate, interledgerTxId } = paymentData;
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO payments (tanda_id, user_id, amount, type, status, due_date, interledger_tx_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            this.db.run(sql, [tandaId, userId, amount, type, status, dueDate, interledgerTxId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...paymentData });
                }
            });
        });
    }

    async updatePaymentStatus(paymentId, status, interledgerTxId = null) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE payments SET status = ?, interledger_tx_id = COALESCE(?, interledger_tx_id), 
                        paid_date = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE paid_date END,
                        updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?`;
            
            this.db.run(sql, [status, interledgerTxId, status, paymentId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    async getPaymentsByTanda(tandaId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT p.*, u.name as user_name 
                        FROM payments p 
                        JOIN users u ON p.user_id = u.id 
                        WHERE p.tanda_id = ? 
                        ORDER BY p.created_at DESC`;
            
            this.db.all(sql, [tandaId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getPendingPayments() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT p.*, u.name as user_name, u.wallet_address, t.name as tanda_name 
                        FROM payments p 
                        JOIN users u ON p.user_id = u.id 
                        JOIN tandas t ON p.tanda_id = t.id 
                        WHERE p.status = 'pending' AND p.due_date <= date('now') 
                        ORDER BY p.due_date`;
            
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Métodos para sorteos
    async createDraw(drawData) {
        const { tandaId, roundNumber, winnerUserId, prizeAmount, drawDate } = drawData;
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO draws (tanda_id, round_number, winner_user_id, prize_amount, draw_date) 
                        VALUES (?, ?, ?, ?, ?)`;
            
            this.db.run(sql, [tandaId, roundNumber, winnerUserId, prizeAmount, drawDate], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...drawData });
                }
            });
        });
    }

    async getDrawsByTanda(tandaId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT d.*, u.name as winner_name 
                        FROM draws d 
                        JOIN users u ON d.winner_user_id = u.id 
                        WHERE d.tanda_id = ? 
                        ORDER BY d.round_number`;
            
            this.db.all(sql, [tandaId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Método para cerrar la conexión
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error cerrando la base de datos:', err.message);
                } else {
                    console.log('✅ Conexión a la base de datos cerrada');
                }
            });
        }
    }
}

module.exports = new DatabaseService();

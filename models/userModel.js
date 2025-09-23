const pool = require('../config/db');
const bcrypt = require('bcrypt');

class User {
    static async create(userData) {
        const { name, email, password } = userData;
        
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        
        return {
            id: result.insertId,
            name,
            email
        };
    }
    
    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        return rows[0] || null;
    }
    
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        
        return rows[0] || null;
    }
    
    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
    
    static async updateTurno(userId, turno) {
        await pool.execute(
            'UPDATE users SET turno = ? WHERE id = ?',
            [turno, userId]
        );
    }
}

module.exports = User;

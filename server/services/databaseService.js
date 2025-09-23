const pool = require('../../config/db');

class DatabaseService {
  /**
   * Guarda un pago de tanda en la base de datos
   * @param {Object} paymentData - Datos del pago
   */
  async savePayment(paymentData) {
    try {
      const connection = await pool.getConnection();
      
      const [result] = await connection.execute(
        `INSERT INTO payments (tanda_id, user_id, amount, type, status, interledger_payment_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          paymentData.tanda_id,
          paymentData.user_id,
          paymentData.amount,
          paymentData.type,
          paymentData.status,
          paymentData.interledger_payment_id
        ]
      );
      
      connection.release();
      return { success: true, paymentId: result.insertId };
    } catch (error) {
      console.error('Error al guardar pago:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de un pago
   * @param {number} paymentId - ID del pago
   * @param {string} status - Nuevo estado
   * @param {Object} additionalData - Datos adicionales
   */
  async updatePaymentStatus(paymentId, status, additionalData = {}) {
    try {
      const connection = await pool.getConnection();
      
      const [result] = await connection.execute(
        `UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?`,
        [status, paymentId]
      );
      
      connection.release();
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Error al actualizar estado del pago:', error);
      throw error;
    }
  }

  /**
   * Obtiene información de una tanda
   * @param {number} tandaId - ID de la tanda
   */
  async getTanda(tandaId) {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute(
        `SELECT * FROM tandas WHERE id = ?`,
        [tandaId]
      );
      
      connection.release();
      return rows[0] || null;
    } catch (error) {
      console.error('Error al obtener tanda:', error);
      throw error;
    }
  }

  /**
   * Obtiene los participantes de una tanda
   * @param {number} tandaId - ID de la tanda
   */
  async getTandaParticipants(tandaId) {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute(
        `SELECT tp.*, u.name, u.email, u.wallet_address 
         FROM tanda_participants tp 
         JOIN users u ON tp.user_id = u.id 
         WHERE tp.tanda_id = ? 
         ORDER BY tp.turn_order`,
        [tandaId]
      );
      
      connection.release();
      return rows;
    } catch (error) {
      console.error('Error al obtener participantes de tanda:', error);
      throw error;
    }
  }

  /**
   * Obtiene el participante actual de una tanda (quien debe recibir el pago)
   * @param {number} tandaId - ID de la tanda
   */
  async getCurrentTandaReceiver(tandaId) {
    try {
      const connection = await pool.getConnection();
      
      const [tandaRows] = await connection.execute(
        `SELECT current_turn FROM tandas WHERE id = ?`,
        [tandaId]
      );
      
      if (!tandaRows.length) {
        throw new Error('Tanda no encontrada');
      }
      
      const currentTurn = tandaRows[0].current_turn;
      
      const [participantRows] = await connection.execute(
        `SELECT tp.*, u.name, u.email, u.wallet_address 
         FROM tanda_participants tp 
         JOIN users u ON tp.user_id = u.id 
         WHERE tp.tanda_id = ? AND tp.turn_order = ?`,
        [tandaId, currentTurn]
      );
      
      connection.release();
      return participantRows[0] || null;
    } catch (error) {
      console.error('Error al obtener receptor actual de tanda:', error);
      throw error;
    }
  }

  /**
   * Actualiza el monto actual de una tanda
   * @param {number} tandaId - ID de la tanda
   * @param {number} amount - Monto a agregar
   */
  async updateTandaCurrentAmount(tandaId, amount) {
    try {
      const connection = await pool.getConnection();
      
      const [result] = await connection.execute(
        `UPDATE tandas SET current_amount = current_amount + ? WHERE id = ?`,
        [amount, tandaId]
      );
      
      connection.release();
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Error al actualizar monto actual de tanda:', error);
      throw error;
    }
  }

  /**
   * Avanza al siguiente turno de una tanda
   * @param {number} tandaId - ID de la tanda
   */
  async advanceTandaTurn(tandaId) {
    try {
      const connection = await pool.getConnection();
      
      // Obtener información actual de la tanda
      const [tandaRows] = await connection.execute(
        `SELECT current_turn, max_participants FROM tandas WHERE id = ?`,
        [tandaId]
      );
      
      if (!tandaRows.length) {
        throw new Error('Tanda no encontrada');
      }
      
      const { current_turn, max_participants } = tandaRows[0];
      const nextTurn = current_turn + 1;
      
      if (nextTurn > max_participants) {
        // La tanda ha terminado
        await connection.execute(
          `UPDATE tandas SET current_turn = ?, current_amount = 0, status = 'completed' WHERE id = ?`,
          [nextTurn, tandaId]
        );
      } else {
        // Avanzar al siguiente turno y resetear el monto actual
        await connection.execute(
          `UPDATE tandas SET current_turn = ?, current_amount = 0 WHERE id = ?`,
          [nextTurn, tandaId]
        );
      }
      
      connection.release();
      return { success: true, nextTurn };
    } catch (error) {
      console.error('Error al avanzar turno de tanda:', error);
      throw error;
    }
  }

  /**
   * Marca que un participante ha recibido su pago
   * @param {number} tandaId - ID de la tanda
   * @param {number} userId - ID del usuario
   */
  async markParticipantAsReceived(tandaId, userId) {
    try {
      const connection = await pool.getConnection();
      
      const [result] = await connection.execute(
        `UPDATE tanda_participants SET has_received = true WHERE tanda_id = ? AND user_id = ?`,
        [tandaId, userId]
      );
      
      connection.release();
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Error al marcar participante como recibido:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de pagos de una tanda
   * @param {number} tandaId - ID de la tanda
   */
  async getTandaPaymentHistory(tandaId) {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute(
        `SELECT p.*, u.name, u.email 
         FROM payments p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.tanda_id = ? 
         ORDER BY p.created_at DESC`,
        [tandaId]
      );
      
      connection.release();
      return rows;
    } catch (error) {
      console.error('Error al obtener historial de pagos:', error);
      throw error;
    }
  }

  /**
   * Verifica si una tanda está lista para el siguiente pago
   * @param {number} tandaId - ID de la tanda
   */
  async isTandaReadyForPayout(tandaId) {
    try {
      const connection = await pool.getConnection();
      
      const [tandaRows] = await connection.execute(
        `SELECT total_amount, current_amount, max_participants FROM tandas WHERE id = ?`,
        [tandaId]
      );
      
      if (!tandaRows.length) {
        throw new Error('Tanda no encontrada');
      }
      
      const { total_amount, current_amount, max_participants } = tandaRows[0];
      const expectedAmount = total_amount / max_participants;
      
      connection.release();
      
      return {
        isReady: current_amount >= expectedAmount,
        currentAmount: current_amount,
        expectedAmount: expectedAmount,
        totalAmount: total_amount
      };
    } catch (error) {
      console.error('Error al verificar si tanda está lista:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por ID
   * @param {number} userId - ID del usuario
   */
  async getUser(userId) {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute(
        `SELECT * FROM users WHERE id = ?`,
        [userId]
      );
      
      connection.release();
      return rows[0] || null;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza la wallet address de un usuario
   * @param {number} userId - ID del usuario
   * @param {string} walletAddress - Nueva wallet address
   */
  async updateUserWalletAddress(userId, walletAddress) {
    try {
      const connection = await pool.getConnection();
      
      const [result] = await connection.execute(
        `UPDATE users SET wallet_address = ? WHERE id = ?`,
        [walletAddress, userId]
      );
      
      connection.release();
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Error al actualizar wallet address:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseService();

const express = require('express');
const router = express.Router();
const databaseService = require('../server/services/databaseService');
const interledgerService = require('../server/services/interledgerService');

// GET /payments - Obtener historial de pagos
router.get('/', async (req, res) => {
  try {
    const { tandaId, userId } = req.query;
    
    let payments;
    if (tandaId) {
      payments = await databaseService.getPaymentsByTanda(tandaId);
    } else {
      // Por ahora, obtenemos todos los pagos para demo
      payments = await databaseService.getPaymentsByTanda(1); // Tanda demo
    }
    
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      tandaId: payment.tanda_id,
      userId: payment.user_id,
      userName: payment.user_name,
      amount: payment.amount,
      type: payment.type,
      status: payment.status,
      dueDate: payment.due_date,
      paidDate: payment.paid_date,
      interledgerTxId: payment.interledger_tx_id,
      createdAt: payment.created_at
    }));

    res.json({ 
      message: 'Historial de pagos',
      payments: formattedPayments
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({
      error: 'Error obteniendo historial de pagos',
      message: error.message
    });
  }
});

// POST /payments - Procesar un pago
router.post('/', async (req, res) => {
  try {
    const { tandaId, userId, amount, type, fromWallet, toWallet } = req.body;
    
    if (!tandaId || !userId || !amount || !type) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requieren: tandaId, userId, amount, type'
      });
    }

    // Crear registro de pago en la base de datos
    const paymentData = {
      tandaId: parseInt(tandaId),
      userId: parseInt(userId),
      amount: parseFloat(amount),
      type,
      status: 'pending',
      dueDate: new Date().toISOString().split('T')[0]
    };

    const payment = await databaseService.createPayment(paymentData);

    // Procesar pago a través de Interledger si se proporcionan wallets
    if (fromWallet && toWallet) {
      try {
        const interledgerResult = await interledgerService.processPayment(
          fromWallet,
          toWallet,
          amount,
          `TandaPay - ${type} - Tanda #${tandaId}`
        );

        // Actualizar el pago con la información de Interledger
        await databaseService.updatePaymentStatus(
          payment.id,
          interledgerResult.status,
          interledgerResult.interledgerTxId
        );

        res.json({ 
          message: 'Pago procesado exitosamente',
          payment: {
            id: payment.id,
            tandaId,
            userId,
            amount,
            type,
            status: interledgerResult.status,
            interledgerTxId: interledgerResult.interledgerTxId,
            isSimulated: interledgerResult.isSimulated,
            createdAt: payment.createdAt
          }
        });
      } catch (interledgerError) {
        // Si falla Interledger, mantener el pago como pendiente
        console.error('Error Interledger:', interledgerError);
        res.json({ 
          message: 'Pago creado, procesamiento pendiente',
          payment: {
            id: payment.id,
            tandaId,
            userId,
            amount,
            type,
            status: 'pending',
            error: 'Error en procesamiento Interledger',
            createdAt: payment.createdAt
          }
        });
      }
    } else {
      res.json({ 
        message: 'Pago registrado exitosamente',
        payment: {
          id: payment.id,
          tandaId,
          userId,
          amount,
          type,
          status: 'pending',
          createdAt: payment.createdAt
        }
      });
    }
  } catch (error) {
    console.error('Error procesando pago:', error);
    res.status(500).json({
      error: 'Error procesando pago',
      message: error.message
    });
  }
});

// GET /payments/:id - Obtener detalles de un pago
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Por ahora simulamos datos para demo
    res.json({
      message: `Detalles del pago ${id}`,
      payment: {
        id,
        tandaId: 1,
        userId: 1,
        amount: 1000,
        type: 'monthly_payment',
        status: 'completed',
        date: '2025-09-22',
        transactionId: `tx_${id}`,
        interledgerDetails: {
          walletAddress: '$ilp.example.com/user123',
          paymentPointer: '$wallet.example/payments'
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo detalles del pago:', error);
    res.status(500).json({
      error: 'Error obteniendo detalles del pago',
      message: error.message
    });
  }
});

// POST /payments/interledger - Procesar pago vía Interledger directamente
router.post('/interledger', async (req, res) => {
  try {
    const { fromWallet, toWallet, amount, description } = req.body;
    
    if (!fromWallet || !toWallet || !amount) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requieren: fromWallet, toWallet, amount'
      });
    }

    const result = await interledgerService.processPayment(
      fromWallet,
      toWallet,
      parseFloat(amount),
      description || 'Pago TandaPay'
    );

    res.json({
      message: 'Pago Interledger procesado',
      payment: result
    });
  } catch (error) {
    console.error('Error en pago Interledger:', error);
    res.status(500).json({
      error: 'Error procesando pago Interledger',
      message: error.message
    });
  }
});

// GET /payments/pending/all - Obtener pagos pendientes (para cron jobs)
router.get('/pending/all', async (req, res) => {
  try {
    const pendingPayments = await databaseService.getPendingPayments();
    
    res.json({
      message: 'Pagos pendientes',
      count: pendingPayments.length,
      payments: pendingPayments
    });
  } catch (error) {
    console.error('Error obteniendo pagos pendientes:', error);
    res.status(500).json({
      error: 'Error obteniendo pagos pendientes',
      message: error.message
    });
  }
});

// POST /payments/:id/retry - Reintentar un pago fallido
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const { fromWallet, toWallet } = req.body;
    
    // Obtener información del pago
    // Por ahora simulamos para demo
    const mockPayment = {
      id,
      amount: 1000,
      tandaId: 1,
      userId: 1
    };

    if (!fromWallet || !toWallet) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requieren fromWallet y toWallet para reintentar'
      });
    }

    const result = await interledgerService.processPayment(
      fromWallet,
      toWallet,
      mockPayment.amount,
      `Reintento pago #${id} - TandaPay`
    );

    // Aquí actualizaríamos el estado en la base de datos
    res.json({
      message: 'Pago reintentado exitosamente',
      payment: {
        id,
        status: result.status,
        interledgerTxId: result.interledgerTxId,
        retryAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error reintentando pago:', error);
    res.status(500).json({
      error: 'Error reintentando pago',
      message: error.message
    });
  }
});

// GET /payments/status/:txId - Verificar estado de transacción Interledger
router.get('/status/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    
    const status = await interledgerService.checkPaymentStatus(txId);
    
    res.json({
      message: 'Estado de transacción',
      transactionId: txId,
      status
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({
      error: 'Error verificando estado de transacción',
      message: error.message
    });
  }
});

module.exports = router;
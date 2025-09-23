const express = require('express');
const router = express.Router();
const interledgerController = require('../controllers/interledgerController');

// Ruta para iniciar una contribución
router.post('/contribute', interledgerController.initiateContribution);

// Ruta para completar un pago
router.post('/complete', interledgerController.completePayment);

// Ruta para obtener el estado de una tanda
router.get('/tanda/:tandaId/status', interledgerController.getTandaStatus);

// Ruta para obtener historial de pagos
router.get('/tanda/:tandaId/history', interledgerController.getPaymentHistory);

// Ruta para manejar webhooks
router.post('/webhook', interledgerController.handleWebhook);

// Ruta para actualizar wallet address de usuario
router.put('/user/:userId/wallet', interledgerController.updateWalletAddress);

// Ruta para validar wallet address
router.post('/validate-wallet', interledgerController.validateWallet);

// Ruta para obtener información de wallet
router.get('/wallet-info/:walletUrl', interledgerController.getWalletInfo);

// Ruta callback para pagos completados
router.get('/callback/tanda/:tandaId/payment/:paymentId', interledgerController.paymentCallback);

module.exports = router;
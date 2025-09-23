const automationService = require('../server/services/automationService');
const databaseService = require('../server/services/databaseService');

class InterledgerController {
  /**
   * Inicia una contribución a una tanda
   */
  async initiateContribution(req, res) {
    try {
      const { tandaId, userId, senderWalletUrl, amount } = req.body;

      // Validar datos de entrada
      if (!tandaId || !userId || !senderWalletUrl || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Faltan parámetros requeridos: tandaId, userId, senderWalletUrl, amount'
        });
      }

      // Validar que el monto sea positivo
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }

      console.log(`🚀 Iniciando contribución para usuario ${userId} en tanda ${tandaId}`);

      // Procesar la contribución
      const result = await automationService.processContribution({
        tandaId: parseInt(tandaId),
        userId: parseInt(userId),
        senderWalletUrl,
        amount: parseFloat(amount)
      });

      console.log(`✅ Contribución iniciada exitosamente`);

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        tandaId: parseInt(tandaId),
        userId: parseInt(userId)
      });

    } catch (error) {
      console.error('Error en initiateContribution:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Completa un pago después de la autorización
   */
  async completePayment(req, res) {
    try {
      const { interactRef, grantInfo, paymentId } = req.body;

      if (!interactRef || !grantInfo || !paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Faltan parámetros para completar el pago'
        });
      }

      const result = await automationService.completePayment({
        interactRef,
        grantInfo,
        paymentId: parseInt(paymentId)
      });

      res.json(result);

    } catch (error) {
      console.error('Error en completePayment:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtiene el estado de una tanda
   */
  async getTandaStatus(req, res) {
    try {
      const { tandaId } = req.params;

      if (!tandaId) {
        return res.status(400).json({
          success: false,
          message: 'ID de tanda requerido'
        });
      }

      const status = await automationService.getTandaStatus(parseInt(tandaId));

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error en getTandaStatus:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Maneja webhooks de Interledger
   */
  async handleWebhook(req, res) {
    try {
      const webhookData = req.body;

      await automationService.handleInterledgerWebhook(webhookData);

      res.json({
        success: true,
        message: 'Webhook procesado correctamente'
      });

    } catch (error) {
      console.error('Error en handleWebhook:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Actualiza la wallet address de un usuario
   */
  async updateWalletAddress(req, res) {
    try {
      const { userId } = req.params;
      const { walletAddress } = req.body;

      if (!userId || !walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario y wallet address son requeridos'
        });
      }

      const result = await databaseService.updateUserWalletAddress(
        parseInt(userId),
        walletAddress
      );

      res.json({
        success: true,
        message: 'Wallet address actualizada correctamente',
        data: result
      });

    } catch (error) {
      console.error('Error en updateWalletAddress:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtiene el historial de pagos de una tanda
   */
  async getPaymentHistory(req, res) {
    try {
      const { tandaId } = req.params;

      if (!tandaId) {
        return res.status(400).json({
          success: false,
          message: 'ID de tanda requerido'
        });
      }

      const history = await databaseService.getTandaPaymentHistory(parseInt(tandaId));

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error en getPaymentHistory:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Callback para cuando el usuario completa la autorización
   */
  async paymentCallback(req, res) {
    try {
      const { interact_ref, result } = req.query;
      const { tandaId, paymentId } = req.params;

      if (!interact_ref) {
        return res.status(400).send('Referencia de interacción requerida');
      }

      console.log(`📥 Callback recibido para tanda ${tandaId}, pago ${paymentId}`);
      console.log(`   Interact Ref: ${interact_ref}`);
      console.log(`   Resultado: ${result}`);

      // Aquí puedes procesar el resultado y completar el pago
      // Por ahora, mostramos una página de confirmación
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pago InterTand</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 500px; 
              margin: 100px auto; 
              text-align: center;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
            }
            .card {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 30px;
              border-radius: 15px;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .success { color: #4ade80; font-size: 1.2em; }
            .error { color: #f87171; font-size: 1.2em; }
            .btn { 
              background: rgba(255, 255, 255, 0.2); 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 8px; 
              display: inline-block;
              margin-top: 20px;
              border: 1px solid rgba(255, 255, 255, 0.3);
              transition: all 0.3s ease;
            }
            .btn:hover {
              background: rgba(255, 255, 255, 0.3);
              transform: translateY(-2px);
            }
            .details {
              background: rgba(0, 0, 0, 0.2);
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              font-family: monospace;
              font-size: 0.9em;
            }
            .icon {
              font-size: 3em;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">
              ${result === 'grant_accepted' ? '✅' : '❌'}
            </div>
            <h1>Estado del Pago</h1>
            ${result === 'grant_accepted' ? 
              '<p class="success">¡Pago autorizado correctamente!</p>' : 
              '<p class="error">Pago cancelado o rechazado</p>'
            }
            <div class="details">
              <strong>Detalles de la transacción:</strong><br>
              Tanda ID: ${tandaId}<br>
              Pago ID: ${paymentId}<br>
              Referencia: ${interact_ref}<br>
              Timestamp: ${new Date().toLocaleString()}
            </div>
            <a href="/dashboard.html" class="btn">🏠 Volver al Dashboard</a>
          </div>
          
          <script>
            // Notificar al parent window si está en un popup
            if (window.opener) {
              console.log('Enviando mensaje al parent window...');
              window.opener.postMessage({
                type: 'payment_result',
                interactRef: '${interact_ref}',
                result: '${result}',
                tandaId: '${tandaId}',
                paymentId: '${paymentId}',
                timestamp: new Date().toISOString()
              }, '*');
              
              // Cerrar popup después de 3 segundos
              setTimeout(() => {
                window.close();
              }, 3000);
            }
            
            // Auto refresh para cerrar ventana si no es popup
            if (!window.opener) {
              setTimeout(() => {
                window.location.href = '/dashboard.html';
              }, 5000);
            }
          </script>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('Error en paymentCallback:', error);
      res.status(500).send(`
        <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Error</h1>
          <p>Error al procesar callback de pago: ${error.message}</p>
          <a href="/dashboard.html">Volver al Dashboard</a>
        </body>
        </html>
      `);
    }
  }

  /**
   * Valida una wallet address
   */
  async validateWallet(req, res) {
    try {
      const { walletUrl } = req.body;

      if (!walletUrl) {
        return res.status(400).json({
          success: false,
          message: 'walletUrl es requerida'
        });
      }

      const interledgerService = require('../server/services/interledgerService');
      const validation = await interledgerService.validateWalletAddress(walletUrl);

      res.json({
        success: true,
        validation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en validateWallet:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Obtiene información de una wallet address
   */
  async getWalletInfo(req, res) {
    try {
      const { walletUrl } = req.params;

      if (!walletUrl) {
        return res.status(400).json({
          success: false,
          message: 'walletUrl es requerida'
        });
      }

      const interledgerService = require('../server/services/interledgerService');
      const walletInfo = await interledgerService.getWalletAddress(decodeURIComponent(walletUrl));

      res.json({
        success: true,
        walletInfo,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en getWalletInfo:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new InterledgerController();
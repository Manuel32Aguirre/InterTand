const interledgerService = require('./interledgerService');
const databaseService = require('./databaseService');

class AutomationService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Inicializa los servicios
   */
  async initialize() {
    try {
      await interledgerService.initializeAuthenticatedClient();
      await interledgerService.initializeUnauthenticatedClient();
      this.isInitialized = true;
      console.log('✅ Servicio de automatización inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar servicio de automatización:', error);
      throw error;
    }
  }

  /**
   * Procesa una contribución a una tanda
   * @param {Object} contributionData - Datos de la contribución
   * @param {number} contributionData.tandaId - ID de la tanda
   * @param {number} contributionData.userId - ID del usuario que contribuye
   * @param {string} contributionData.senderWalletUrl - URL de la wallet del emisor
   * @param {number} contributionData.amount - Monto de la contribución
   */
  async processContribution(contributionData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { tandaId, userId, senderWalletUrl, amount } = contributionData;

      // 1. Obtener información de la tanda
      const tanda = await databaseService.getTanda(tandaId);
      if (!tanda) {
        throw new Error('Tanda no encontrada');
      }

      // 2. Obtener el receptor actual (quien debe recibir en este turno)
      const currentReceiver = await databaseService.getCurrentTandaReceiver(tandaId);
      if (!currentReceiver) {
        throw new Error('No se encontró receptor para el turno actual');
      }

      // 3. Verificar que el usuario no sea el receptor actual
      if (userId === currentReceiver.user_id) {
        throw new Error('No puedes contribuir cuando es tu turno de recibir');
      }

      // 4. Guardar la contribución en estado pendiente
      const pendingPayment = await databaseService.savePayment({
        tanda_id: tandaId,
        user_id: userId,
        amount: amount,
        type: 'contribution',
        status: 'pending',
        interledger_payment_id: null
      });

      // 5. Procesar el pago a través de Interledger
      const paymentResult = await interledgerService.processTandaPayment({
        senderWalletUrl: senderWalletUrl,
        receiverWalletUrl: currentReceiver.wallet_address,
        amount: {
          value: amount,
          currency: 'USD',
          scale: 2
        },
        tandaId: tandaId,
        description: `Contribución a tanda ${tanda.name} - Turno ${tanda.current_turn}`
      });

      // 6. Actualizar el pago con información de Interledger
      await databaseService.updatePaymentStatus(
        pendingPayment.paymentId,
        'processing',
        { interledger_payment_id: paymentResult.incomingPayment.id }
      );

      return {
        success: true,
        paymentId: pendingPayment.paymentId,
        interactUrl: paymentResult.interactUrl,
        message: 'Contribución iniciada. El usuario debe autorizar el pago.',
        paymentData: paymentResult
      };

    } catch (error) {
      console.error('Error al procesar contribución:', error);
      throw error;
    }
  }

  /**
   * Completa un pago después de la autorización del usuario
   * @param {Object} completionData - Datos para completar el pago
   * @param {string} completionData.interactRef - Referencia de interacción
   * @param {Object} completionData.grantInfo - Información del grant
   * @param {number} completionData.paymentId - ID del pago en la base de datos
   */
  async completePayment(completionData) {
    try {
      const { interactRef, grantInfo, paymentId } = completionData;

      // 1. Continuar el grant
      const finalizedGrant = await interledgerService.continueGrant({
        continueUri: grantInfo.continueUri,
        accessToken: grantInfo.accessToken,
        interactRef: interactRef
      });

      // 2. Finalizar el outgoing payment
      const finalPayment = await interledgerService.finalizeOutgoingPayment({
        finalizedGrant: finalizedGrant.grant,
        quote: grantInfo.quote,
        description: 'Contribución a tanda completada'
      });

      // 3. Actualizar estado del pago a completado
      await databaseService.updatePaymentStatus(paymentId, 'completed');

      // 4. Obtener información del pago
      const payment = await this.getPaymentInfo(paymentId);
      
      // 5. Actualizar el monto actual de la tanda
      await databaseService.updateTandaCurrentAmount(payment.tanda_id, payment.amount);

      // 6. Verificar si la tanda está lista para el pago
      const readyStatus = await databaseService.isTandaReadyForPayout(payment.tanda_id);

      let result = {
        success: true,
        payment: finalPayment.outgoingPayment,
        paymentCompleted: true
      };

      // 7. Si está lista, procesar el pago al receptor
      if (readyStatus.isReady) {
        await this.processPayout(payment.tanda_id);
        result.payoutProcessed = true;
      }

      return result;

    } catch (error) {
      console.error('Error al completar pago:', error);
      throw error;
    }
  }

  /**
   * Procesa el pago al receptor cuando la tanda está completa
   * @param {number} tandaId - ID de la tanda
   */
  async processPayout(tandaId) {
    try {
      // 1. Obtener el receptor actual
      const currentReceiver = await databaseService.getCurrentTandaReceiver(tandaId);
      if (!currentReceiver) {
        throw new Error('No se encontró receptor para el turno actual');
      }

      // 2. Obtener información de la tanda
      const tanda = await databaseService.getTanda(tandaId);
      const payoutAmount = tanda.total_amount / tanda.max_participants;

      // 3. Crear registro de pago de salida
      const payoutPayment = await databaseService.savePayment({
        tanda_id: tandaId,
        user_id: currentReceiver.user_id,
        amount: payoutAmount,
        type: 'payout',
        status: 'completed',
        interledger_payment_id: null
      });

      // 4. Marcar al participante como que ha recibido
      await databaseService.markParticipantAsReceived(tandaId, currentReceiver.user_id);

      // 5. Avanzar al siguiente turno
      await databaseService.advanceTandaTurn(tandaId);

      console.log(`✅ Pago procesado para ${currentReceiver.name} por $${payoutAmount}`);

      return {
        success: true,
        receiverName: currentReceiver.name,
        amount: payoutAmount,
        paymentId: payoutPayment.paymentId
      };

    } catch (error) {
      console.error('Error al procesar pago de salida:', error);
      throw error;
    }
  }

  /**
   * Obtiene información detallada de un pago
   * @param {number} paymentId - ID del pago
   */
  async getPaymentInfo(paymentId) {
    try {
      // Implementar lógica para obtener información del pago
      // Por ahora, retornamos información básica
      return {
        id: paymentId,
        tanda_id: 1, // Esto debería venir de la base de datos
        amount: 100 // Esto debería venir de la base de datos
      };
    } catch (error) {
      console.error('Error al obtener información del pago:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de una tanda
   * @param {number} tandaId - ID de la tanda
   */
  async getTandaStatus(tandaId) {
    try {
      const tanda = await databaseService.getTanda(tandaId);
      const participants = await databaseService.getTandaParticipants(tandaId);
      const currentReceiver = await databaseService.getCurrentTandaReceiver(tandaId);
      const paymentHistory = await databaseService.getTandaPaymentHistory(tandaId);
      const readyStatus = await databaseService.isTandaReadyForPayout(tandaId);

      return {
        tanda,
        participants,
        currentReceiver,
        paymentHistory,
        readyForPayout: readyStatus.isReady,
        currentAmount: readyStatus.currentAmount,
        expectedAmount: readyStatus.expectedAmount
      };

    } catch (error) {
      console.error('Error al obtener estado de tanda:', error);
      throw error;
    }
  }

  /**
   * Maneja webhooks de Interledger (si están disponibles)
   * @param {Object} webhookData - Datos del webhook
   */
  async handleInterledgerWebhook(webhookData) {
    try {
      console.log('🔗 Webhook recibido:', webhookData);
      
      // Validar que el webhook tenga datos mínimos
      if (!webhookData.type) {
        throw new Error('Webhook sin tipo especificado');
      }

      // Procesar según el tipo de webhook
      switch (webhookData.type) {
        case 'payment.completed':
          await this.handlePaymentCompleted(webhookData);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(webhookData);
          break;
        default:
          console.log(`⚠️  Tipo de webhook no manejado: ${webhookData.type}`);
      }

      console.log('✅ Webhook procesado exitosamente');
      return { success: true, message: 'Webhook procesado correctamente' };

    } catch (error) {
      console.error('❌ Error al manejar webhook:', error);
      throw error;
    }
  }

  /**
   * Maneja webhook de pago completado
   */
  async handlePaymentCompleted(webhookData) {
    try {
      console.log('✅ Procesando pago completado');
      
      if (webhookData.paymentId) {
        // Actualizar estado del pago a completado
        await databaseService.updatePaymentStatus(
          parseInt(webhookData.paymentId),
          'completed'
        );
        
        console.log(`💰 Pago ${webhookData.paymentId} marcado como completado`);
      }

    } catch (error) {
      console.error('Error procesando pago completado:', error);
      throw error;
    }
  }

  /**
   * Maneja webhook de pago fallido
   */
  async handlePaymentFailed(webhookData) {
    try {
      console.log('❌ Procesando pago fallido');
      
      if (webhookData.paymentId) {
        // Actualizar estado del pago a fallido
        await databaseService.updatePaymentStatus(
          parseInt(webhookData.paymentId),
          'failed'
        );
        
        console.log(`💔 Pago ${webhookData.paymentId} marcado como fallido`);
      }

    } catch (error) {
      console.error('Error procesando pago fallido:', error);
      throw error;
    }
  }

  /**
   * Verifica pagos pendientes y los actualiza
   */
  async checkPendingPayments() {
    try {
      // Implementar lógica para verificar pagos pendientes
      // y actualizar sus estados consultando Interledger
      console.log('Verificando pagos pendientes...');
      
    } catch (error) {
      console.error('Error al verificar pagos pendientes:', error);
    }
  }

  /**
   * Programa verificaciones automáticas
   */
  scheduleAutomaticChecks() {
    // Verificar pagos pendientes cada 5 minutos
    setInterval(() => {
      this.checkPendingPayments();
    }, 5 * 60 * 1000);

    console.log('✅ Verificaciones automáticas programadas');
  }
}

module.exports = new AutomationService();

const { 
  createAuthenticatedClient, 
  createUnauthenticatedClient,
  OpenPaymentsClientError 
} = require('@interledger/open-payments');
const { v4: uuid } = require('uuid');
require('dotenv').config();

class InterledgerService {
  constructor() {
    this.authenticatedClient = null;
    this.unauthenticatedClient = null;
  }

  /**
   * Inicializa el cliente autenticado de Open Payments
   */
  async initializeAuthenticatedClient() {
    try {
      // Modo de desarrollo - omitir autenticación real
      if (process.env.DEVELOPMENT_MODE === 'true') {
        console.log('🔧 Modo de desarrollo activado - Saltando autenticación real de Interledger');
        this.authenticatedClient = {
          // Mock client para desarrollo
          grant: {
            request: async () => ({ access_token: { value: 'mock-token' } }),
            continue: async () => ({ access_token: { value: 'mock-token', manage: 'mock-manage' } })
          },
          incomingPayment: {
            create: async () => ({
              id: 'https://mock-provider.com/incoming-payments/mock-id',
              walletAddress: 'https://mock-provider.com/wallet',
              incomingAmount: { value: '10000', assetCode: 'USD', assetScale: 2 },
              receivedAmount: { value: '0', assetCode: 'USD', assetScale: 2 },
              completed: false,
              metadata: { description: 'Mock payment' }
            })
          },
          quote: {
            create: async () => ({
              id: 'https://mock-provider.com/quotes/mock-id',
              walletAddress: 'https://mock-provider.com/wallet',
              debitAmount: { value: '10200', assetCode: 'USD', assetScale: 2 },
              receiveAmount: { value: '10000', assetCode: 'USD', assetScale: 2 }
            })
          },
          outgoingPayment: {
            create: async () => ({
              id: 'https://mock-provider.com/outgoing-payments/mock-id',
              failed: false,
              receiver: 'https://mock-provider.com/incoming-payments/mock-id',
              debitAmount: { value: '10200', assetCode: 'USD', assetScale: 2 },
              sentAmount: { value: '10000', assetCode: 'USD', assetScale: 2 },
              receiveAmount: { value: '10000', assetCode: 'USD', assetScale: 2 }
            })
          }
        };
        console.log('✅ Cliente mock de Open Payments inicializado (modo desarrollo)');
        return this.authenticatedClient;
      }

      if (!process.env.WALLET_ADDRESS_URL || !process.env.KEY_ID || !process.env.PRIVATE_KEY) {
        throw new Error('Faltan configuraciones de Interledger en variables de entorno');
      }

      this.authenticatedClient = await createAuthenticatedClient({
        walletAddressUrl: process.env.WALLET_ADDRESS_URL,
        keyId: process.env.KEY_ID,
        privateKey: process.env.PRIVATE_KEY
      });

      console.log('✅ Cliente autenticado de Open Payments inicializado');
      return this.authenticatedClient;
    } catch (error) {
      console.error('❌ Error al inicializar cliente autenticado:', error.message);
      throw error;
    }
  }

  /**
   * Inicializa el cliente no autenticado de Open Payments
   */
  async initializeUnauthenticatedClient() {
    try {
      // Modo de desarrollo - usar mock client
      if (process.env.DEVELOPMENT_MODE === 'true') {
        console.log('🔧 Modo de desarrollo activado - Usando cliente mock no autenticado');
        this.unauthenticatedClient = {
          walletAddress: {
            get: async ({ url }) => ({
              id: url,
              publicName: 'Mock Wallet',
              assetCode: 'USD',
              assetScale: 2,
              authServer: 'https://mock-provider.com/auth',
              resourceServer: 'https://mock-provider.com/op'
            })
          },
          incomingPayment: {
            getPublic: async ({ url }) => ({
              id: url,
              walletAddress: 'https://mock-provider.com/wallet',
              incomingAmount: { value: '10000', assetCode: 'USD', assetScale: 2 },
              receivedAmount: { value: '5000', assetCode: 'USD', assetScale: 2 },
              completed: false,
              metadata: { description: 'Mock public payment' }
            })
          }
        };
        console.log('✅ Cliente mock no autenticado inicializado (modo desarrollo)');
        return this.unauthenticatedClient;
      }

      this.unauthenticatedClient = await createUnauthenticatedClient();
      console.log('✅ Cliente no autenticado de Open Payments inicializado');
      return this.unauthenticatedClient;
    } catch (error) {
      console.error('❌ Error al inicializar cliente no autenticado:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene información de una wallet address
   * @param {string} walletUrl - URL de la wallet
   * @returns {Object} Información de la wallet con id, publicName, assetCode, assetScale, authServer, resourceServer
   */
  async getWalletAddress(walletUrl) {
    try {
      if (!this.unauthenticatedClient) {
        await this.initializeUnauthenticatedClient();
      }

      const walletAddress = await this.unauthenticatedClient.walletAddress.get({
        url: walletUrl
      });

      console.log(`✅ Wallet address obtenida: ${walletAddress.publicName || walletAddress.id}`);
      console.log(`   Asset: ${walletAddress.assetCode} (escala: ${walletAddress.assetScale})`);

      return walletAddress;
    } catch (error) {
      this.handleError(error, 'Error al obtener wallet address');
      throw error;
    }
  }

  /**
   * Crea un incoming payment
   * @param {Object} params - Parámetros del pago
   * @param {string} params.walletAddressUrl - URL de la wallet receptora
   * @param {Object} params.amount - Monto del pago {value, currency, scale}
   * @param {string} params.description - Descripción del pago
   * @param {string} params.externalRef - Referencia externa
   * @returns {Object} Resultado con incoming payment creado
   */
  async createIncomingPayment({ walletAddressUrl, amount, description, externalRef }) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      // Obtener información de la wallet
      const walletAddress = await this.getWalletAddress(walletAddressUrl);

      // Solicitar grant para incoming payment
      const incomingPaymentGrant = await this.authenticatedClient.grant.request(
        { url: walletAddress.authServer },
        {
          access_token: {
            access: [
              {
                type: 'incoming-payment',
                actions: ['read', 'create']
              }
            ]
          }
        }
      );

      console.log('✅ Grant para incoming payment obtenido');

      // Preparar el payload del incoming payment
      const incomingPaymentData = {
        walletAddress: walletAddress.id,
        incomingAmount: {
          value: Math.round(amount.value * Math.pow(10, walletAddress.assetScale)).toString(),
          assetCode: walletAddress.assetCode,
          assetScale: walletAddress.assetScale
        },
        metadata: {
          description: description
        }
      };

      // Agregar referencia externa si se proporciona
      if (externalRef) {
        incomingPaymentData.metadata.externalRef = externalRef;
      }

      // Crear incoming payment
      const incomingPayment = await this.authenticatedClient.incomingPayment.create(
        {
          url: walletAddress.resourceServer,
          accessToken: incomingPaymentGrant.access_token.value
        },
        incomingPaymentData
      );

      console.log(`✅ Incoming payment creado: ${incomingPayment.id}`);
      console.log(`   Monto esperado: ${incomingPayment.incomingAmount.value} ${incomingPayment.incomingAmount.assetCode}`);
      console.log(`   Monto recibido: ${incomingPayment.receivedAmount.value} ${incomingPayment.receivedAmount.assetCode}`);
      console.log(`   Completado: ${incomingPayment.completed}`);

      return {
        success: true,
        incomingPayment,
        grant: incomingPaymentGrant,
        walletInfo: walletAddress
      };

    } catch (error) {
      this.handleError(error, 'Error al crear incoming payment');
      throw error;
    }
  }

  /**
   * Crea una cotización para un pago
   * @param {Object} params - Parámetros de la cotización
   * @param {string} params.senderWalletUrl - URL de la wallet emisora
   * @param {string} params.receiverPaymentUrl - URL del incoming payment
   * @returns {Object} Resultado con quote creado
   */
  async createQuote({ senderWalletUrl, receiverPaymentUrl }) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      // Obtener información de la wallet del emisor
      const senderWallet = await this.getWalletAddress(senderWalletUrl);

      // Solicitar grant para quote
      const quoteGrant = await this.authenticatedClient.grant.request(
        { url: senderWallet.authServer },
        {
          access_token: {
            access: [
              {
                type: 'quote',
                actions: ['create', 'read']
              }
            ]
          }
        }
      );

      console.log('✅ Grant para quote obtenido');

      // Crear quote
      const quote = await this.authenticatedClient.quote.create(
        {
          url: senderWallet.resourceServer,
          accessToken: quoteGrant.access_token.value
        },
        {
          walletAddress: senderWallet.id,
          receiver: receiverPaymentUrl,
          method: 'ilp'
        }
      );

      console.log(`✅ Quote creado: ${quote.id}`);
      console.log(`   Monto a debitar: ${quote.debitAmount.value} ${quote.debitAmount.assetCode}`);
      console.log(`   Monto a recibir: ${quote.receiveAmount?.value || 'N/A'} ${quote.receiveAmount?.assetCode || ''}`);
      console.log(`   Expira: ${quote.expiresAt}`);

      return {
        success: true,
        quote,
        grant: quoteGrant,
        senderWalletInfo: senderWallet
      };

    } catch (error) {
      this.handleError(error, 'Error al crear quote');
      throw error;
    }
  }

  /**
   * Crea un outgoing payment
   * @param {Object} params - Parámetros del pago saliente
   * @param {string} params.senderWalletUrl - URL de la wallet emisora
   * @param {Object} params.quote - Cotización del pago
   * @param {string} params.redirectUri - URI de redirección para interacción
   */
  async createOutgoingPayment({ senderWalletUrl, quote, redirectUri }) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      // Obtener información de la wallet del emisor
      const senderWallet = await this.getWalletAddress(senderWalletUrl);

      // Solicitar grant para outgoing payment
      const outgoingPaymentGrant = await this.authenticatedClient.grant.request(
        { url: senderWallet.authServer },
        {
          access_token: {
            access: [
              {
                type: 'outgoing-payment',
                actions: ['read', 'create', 'list'],
                identifier: senderWallet.id,
                limits: {
                  debitAmount: quote.debitAmount
                }
              }
            ]
          },
          interact: {
            start: ['redirect'],
            finish: {
              method: 'redirect',
              uri: redirectUri || 'https://your-domain.com/complete-payment',
              nonce: uuid()
            }
          }
        }
      );

      return {
        success: true,
        grant: outgoingPaymentGrant,
        interactUrl: outgoingPaymentGrant.interact?.redirect
      };

    } catch (error) {
      this.handleError(error, 'Error al crear outgoing payment grant');
      throw error;
    }
  }

  /**
   * Continúa un grant después de la interacción del usuario
   * @param {Object} params - Parámetros para continuar el grant
   * @param {string} params.continueUri - URI para continuar
   * @param {string} params.accessToken - Token de acceso
   * @param {string} params.interactRef - Referencia de interacción
   */
  async continueGrant({ continueUri, accessToken, interactRef }) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      const finalizedGrant = await this.authenticatedClient.grant.continue(
        {
          url: continueUri,
          accessToken: accessToken
        },
        { interact_ref: interactRef }
      );

      return {
        success: true,
        grant: finalizedGrant
      };

    } catch (error) {
      this.handleError(error, 'Error al continuar grant');
      throw error;
    }
  }

  /**
   * Finaliza un outgoing payment
   * @param {Object} params - Parámetros para finalizar el pago
   * @param {Object} params.finalizedGrant - Grant finalizado
   * @param {Object} params.quote - Cotización del pago
   * @param {string} params.description - Descripción del pago
   * @param {string} params.externalRef - Referencia externa
   * @returns {Object} Resultado con outgoing payment creado
   */
  async finalizeOutgoingPayment({ finalizedGrant, quote, description, externalRef }) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      // Preparar metadata del pago
      const metadata = {};
      if (description) metadata.description = description;
      if (externalRef) metadata.externalRef = externalRef;

      // Crear outgoing payment
      const outgoingPayment = await this.authenticatedClient.outgoingPayment.create(
        {
          url: finalizedGrant.access_token.manage,
          accessToken: finalizedGrant.access_token.value
        },
        {
          walletAddress: quote.walletAddress,
          quoteId: quote.id,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined
        }
      );

      console.log(`✅ Outgoing payment creado: ${outgoingPayment.id}`);
      console.log(`   Estado fallido: ${outgoingPayment.failed}`);
      console.log(`   Receptor: ${outgoingPayment.receiver}`);
      console.log(`   Monto debitado: ${outgoingPayment.debitAmount.value} ${outgoingPayment.debitAmount.assetCode}`);
      console.log(`   Monto enviado: ${outgoingPayment.sentAmount.value} ${outgoingPayment.sentAmount.assetCode}`);
      console.log(`   Monto a recibir: ${outgoingPayment.receiveAmount.value} ${outgoingPayment.receiveAmount.assetCode}`);

      return {
        success: true,
        outgoingPayment
      };

    } catch (error) {
      this.handleError(error, 'Error al finalizar outgoing payment');
      throw error;
    }
  }

  /**
   * Procesa un pago completo de tanda con monitoreo automático
   * @param {Object} params - Parámetros del pago de tanda
   * @param {string} params.senderWalletUrl - URL de la wallet emisora
   * @param {string} params.receiverWalletUrl - URL de la wallet receptora
   * @param {Object} params.amount - Monto del pago {value}
   * @param {string} params.tandaId - ID de la tanda
   * @param {string} params.description - Descripción del pago
   * @param {boolean} params.autoMonitor - Si debe monitorear automáticamente (default: true)
   * @returns {Object} Resultado completo del proceso de pago
   */
  async processTandaPayment({ senderWalletUrl, receiverWalletUrl, amount, tandaId, description, autoMonitor = true }) {
    try {
      console.log(`🚀 Iniciando proceso de pago de tanda ${tandaId}`);
      console.log(`   Emisor: ${senderWalletUrl}`);
      console.log(`   Receptor: ${receiverWalletUrl}`);
      console.log(`   Monto: $${amount.value}`);

      // 1. Validar wallet addresses
      const [senderValidation, receiverValidation] = await Promise.all([
        this.validateWalletAddress(senderWalletUrl),
        this.validateWalletAddress(receiverWalletUrl)
      ]);

      if (!senderValidation.isValid) {
        throw new Error(`Wallet del emisor inválida: ${senderValidation.error}`);
      }

      if (!receiverValidation.isValid) {
        throw new Error(`Wallet del receptor inválida: ${receiverValidation.error}`);
      }

      // 2. Crear incoming payment
      const incomingPaymentResult = await this.createIncomingPayment({
        walletAddressUrl: receiverWalletUrl,
        amount: amount,
        description: description,
        externalRef: `TANDA-${tandaId}-${Date.now()}`
      });

      console.log(`📥 Incoming payment creado para receptor`);

      // 3. Crear quote
      const quoteResult = await this.createQuote({
        senderWalletUrl: senderWalletUrl,
        receiverPaymentUrl: incomingPaymentResult.incomingPayment.id
      });

      console.log(`💱 Quote creado - Costo total: ${quoteResult.quote.debitAmount.value} ${quoteResult.quote.debitAmount.assetCode}`);

      // 4. Crear outgoing payment grant
      const outgoingPaymentResult = await this.createOutgoingPayment({
        senderWalletUrl: senderWalletUrl,
        quote: quoteResult.quote,
        redirectUri: `${process.env.DOMAIN || 'http://localhost:3001'}/api/interledger/callback/tanda/${tandaId}/payment`
      });

      console.log(`📤 Grant de outgoing payment creado`);

      const result = {
        success: true,
        incomingPayment: incomingPaymentResult.incomingPayment,
        quote: quoteResult.quote,
        outgoingPaymentGrant: outgoingPaymentResult.grant,
        interactUrl: outgoingPaymentResult.interactUrl,
        walletInfo: {
          sender: senderValidation.walletAddress,
          receiver: receiverValidation.walletAddress
        },
        expectedAmount: parseInt(incomingPaymentResult.incomingPayment.incomingAmount.value),
        instructions: 'El usuario debe ser redirigido a interactUrl para autorizar el pago'
      };

      // 5. Monitoreo automático opcional
      if (autoMonitor) {
        console.log(`🔍 Iniciando monitoreo automático del pago`);
        
        // Monitorear en segundo plano
        this.monitorIncomingPayment(
          incomingPaymentResult.incomingPayment.id,
          result.expectedAmount
        ).then(monitorResult => {
          console.log(`📊 Resultado del monitoreo:`, monitorResult);
          // Aquí podrías emitir eventos o actualizar la base de datos
        }).catch(monitorError => {
          console.error(`❌ Error en monitoreo automático:`, monitorError);
        });
      }

      return result;

    } catch (error) {
      this.handleError(error, 'Error al procesar pago de tanda');
      throw error;
    }
  }

  /**
   * Maneja errores de Open Payments
   * @param {Error} error - Error a manejar
   * @param {string} context - Contexto del error
   */
  handleError(error, context) {
    if (error instanceof OpenPaymentsClientError) {
      console.error(`❌ ${context}:`, {
        message: error.message,
        description: error.description,
        status: error.status,
        code: error.code,
        validationErrors: error.validationErrors,
        details: error.details
      });
    } else {
      console.error(`❌ ${context}:`, error.message);
    }
  }

  /**
   * Monitorea el progreso de un incoming payment
   * @param {string} incomingPaymentUrl - URL del incoming payment
   * @param {number} expectedAmount - Monto esperado (en unidades menores)
   * @param {number} checkInterval - Intervalo de verificación en ms (default: 5000)
   * @param {number} maxChecks - Máximo número de verificaciones (default: 60)
   * @returns {Promise<Object>} Estado final del pago
   */
  async monitorIncomingPayment(incomingPaymentUrl, expectedAmount, checkInterval = 5000, maxChecks = 60) {
    let checks = 0;
    
    return new Promise((resolve, reject) => {
      const monitor = setInterval(async () => {
        try {
          checks++;
          console.log(`🔍 Verificando incoming payment... (${checks}/${maxChecks})`);
          
          const payment = await this.getPublicIncomingPayment(incomingPaymentUrl);
          const receivedAmount = parseInt(payment.receivedAmount.value);
          
          console.log(`   Recibido: ${receivedAmount}, Esperado: ${expectedAmount}`);
          
          if (payment.completed || receivedAmount >= expectedAmount) {
            clearInterval(monitor);
            console.log('✅ Pago completado exitosamente');
            resolve({
              success: true,
              completed: true,
              payment,
              receivedAmount,
              expectedAmount
            });
          } else if (checks >= maxChecks) {
            clearInterval(monitor);
            console.log('⏰ Tiempo de espera agotado para el pago');
            resolve({
              success: false,
              completed: false,
              payment,
              receivedAmount,
              expectedAmount,
              reason: 'timeout'
            });
          }
          
        } catch (error) {
          console.error('Error monitoreando pago:', error);
          if (checks >= maxChecks) {
            clearInterval(monitor);
            reject(error);
          }
        }
      }, checkInterval);
    });
  }

  /**
   * Obtiene las tasas de cambio entre diferentes activos
   * @param {string} fromAsset - Activo origen (ej: USD)
   * @param {string} toAsset - Activo destino (ej: EUR)
   * @returns {Object} Información de tasa de cambio
   */
  async getExchangeRate(fromAsset, toAsset) {
    try {
      // Nota: Este es un método de ejemplo, la implementación real depende
      // de si el proveedor de Open Payments soporta consulta de tasas
      console.log(`ℹ️ Consultando tasa de cambio ${fromAsset} -> ${toAsset}`);
      
      // Por ahora retornamos una tasa de ejemplo
      return {
        fromAsset,
        toAsset,
        rate: 1.0, // Tasa de ejemplo
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'Error al obtener tasa de cambio');
      throw error;
    }
  }

  /**
   * Valida que una wallet address sea válida
   * @param {string} walletUrl - URL de la wallet a validar
   * @returns {Object} Resultado de la validación
   */
  async validateWalletAddress(walletUrl) {
    try {
      console.log(`🔍 Validando wallet address: ${walletUrl}`);
      
      const walletAddress = await this.getWalletAddress(walletUrl);
      
      const validation = {
        isValid: true,
        walletAddress,
        supports: {
          incomingPayments: true,
          outgoingPayments: true,
          assetCode: walletAddress.assetCode,
          assetScale: walletAddress.assetScale
        }
      };
      
      console.log(`✅ Wallet address válida: ${walletAddress.publicName || walletAddress.id}`);
      
      return validation;
      
    } catch (error) {
      console.log(`❌ Wallet address inválida: ${walletUrl}`);
      
      return {
        isValid: false,
        error: error.message,
        supports: {
          incomingPayments: false,
          outgoingPayments: false
        }
      };
    }
  }

  /**
   * Obtiene información pública de un incoming payment
   * @param {string} incomingPaymentUrl - URL del incoming payment
   * @returns {Object} Información del incoming payment
   */
  async getPublicIncomingPayment(incomingPaymentUrl) {
    try {
      if (!this.unauthenticatedClient) {
        await this.initializeUnauthenticatedClient();
      }

      const incomingPayment = await this.unauthenticatedClient.incomingPayment.getPublic({
        url: incomingPaymentUrl
      });

      console.log(`✅ Incoming payment obtenido: ${incomingPayment.id}`);
      console.log(`   Monto esperado: ${incomingPayment.incomingAmount?.value || 'N/A'} ${incomingPayment.incomingAmount?.assetCode || ''}`);
      console.log(`   Monto recibido: ${incomingPayment.receivedAmount.value} ${incomingPayment.receivedAmount.assetCode}`);
      console.log(`   Completado: ${incomingPayment.completed}`);

      return incomingPayment;
    } catch (error) {
      this.handleError(error, 'Error al obtener incoming payment público');
      throw error;
    }
  }

  /**
   * Obtiene un incoming payment autenticado
   * @param {string} incomingPaymentUrl - URL del incoming payment
   * @param {string} accessToken - Token de acceso
   * @returns {Object} Información completa del incoming payment
   */
  async getIncomingPayment(incomingPaymentUrl, accessToken) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      const incomingPayment = await this.authenticatedClient.incomingPayment.get({
        url: incomingPaymentUrl,
        accessToken: accessToken
      });

      return incomingPayment;
    } catch (error) {
      this.handleError(error, 'Error al obtener incoming payment autenticado');
      throw error;
    }
  }

  /**
   * Completa un incoming payment
   * @param {string} incomingPaymentUrl - URL del incoming payment
   * @param {string} accessToken - Token de acceso
   * @returns {Object} Incoming payment completado
   */
  async completeIncomingPayment(incomingPaymentUrl, accessToken) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      const completedPayment = await this.authenticatedClient.incomingPayment.complete({
        url: `${incomingPaymentUrl}/complete`,
        accessToken: accessToken
      });

      console.log(`✅ Incoming payment completado: ${completedPayment.id}`);
      console.log(`   Monto final recibido: ${completedPayment.receivedAmount.value} ${completedPayment.receivedAmount.assetCode}`);

      return {
        success: true,
        completedPayment
      };

    } catch (error) {
      this.handleError(error, 'Error al completar incoming payment');
      throw error;
    }
  }

  /**
   * Lista incoming payments de una wallet
   * @param {Object} params - Parámetros de la consulta
   * @param {string} params.walletUrl - URL de la wallet
   * @param {string} params.accessToken - Token de acceso
   * @param {string} params.cursor - Cursor para paginación
   * @param {number} params.first - Número de elementos a obtener
   * @returns {Object} Lista paginada de incoming payments
   */
  async listIncomingPayments({ walletUrl, accessToken, cursor, first = 10 }) {
    try {
      if (!this.authenticatedClient) {
        await this.initializeAuthenticatedClient();
      }

      const walletAddress = await this.getWalletAddress(walletUrl);

      const params = {
        url: `${walletAddress.resourceServer}/incoming-payments`,
        accessToken: accessToken
      };

      // Agregar parámetros de paginación si se proporcionan
      const queryParams = new URLSearchParams();
      if (cursor) queryParams.append('cursor', cursor);
      if (first) queryParams.append('first', first.toString());

      if (queryParams.toString()) {
        params.url += `?${queryParams.toString()}`;
      }

      const incomingPayments = await this.authenticatedClient.incomingPayment.list(params);

      console.log(`✅ ${incomingPayments.result.length} incoming payments obtenidos`);

      return incomingPayments;
    } catch (error) {
      this.handleError(error, 'Error al listar incoming payments');
      throw error;
    }
  }
}

module.exports = new InterledgerService();

// Ejemplo de uso y configuración adicional
/*
EJEMPLO DE USO COMPLETO:

1. Inicializar el servicio:
   await interledgerService.initializeAuthenticatedClient();
   await interledgerService.initializeUnauthenticatedClient();

2. Validar wallets antes de procesar:
   const validation = await interledgerService.validateWalletAddress('https://wallet.example.com/alice');
   if (!validation.isValid) throw new Error('Wallet inválida');

3. Procesar pago de tanda:
   const paymentResult = await interledgerService.processTandaPayment({
     senderWalletUrl: 'https://wallet.example.com/alice',
     receiverWalletUrl: 'https://wallet.example.com/bob',
     amount: { value: 100.00 },
     tandaId: '123',
     description: 'Contribución a tanda mensual',
     autoMonitor: true
   });

4. Redirigir usuario para autorización:
   window.open(paymentResult.interactUrl, 'payment_auth');

5. Después de autorización, continuar grant:
   const finalResult = await interledgerService.continueGrant({
     continueUri: grantInfo.continueUri,
     accessToken: grantInfo.accessToken,
     interactRef: interactRef
   });

6. Finalizar pago:
   const completedPayment = await interledgerService.finalizeOutgoingPayment({
     finalizedGrant: finalResult.grant,
     quote: paymentResult.quote,
     description: 'Pago de tanda completado',
     externalRef: `TANDA-123-FINAL`
   });

CONFIGURACIÓN REQUERIDA EN .env:
WALLET_ADDRESS_URL=https://tu-wallet.provider.com/tu-wallet
KEY_ID=tu-key-id-unico
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----
DOMAIN=https://tu-dominio.com (para callbacks)
*/

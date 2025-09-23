const { createAuthenticatedClient, isFinalizedGrant } = require("@interledger/open-payments");
const fs = require("fs");

class InterledgerService {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Leer la clave privada del archivo
            const privateKey = fs.readFileSync("private.key", "utf8");

            // Crear cliente autenticado usando la misma configuración de index.js
            this.client = await createAuthenticatedClient({
                walletAddressUrl: "https://ilp.interledger-test.dev/birdsclient",
                privateKey,
                keyId: "858468ca-b8c7-468d-95f6-89e59325d311"
            });

            this.initialized = true;
            console.log("✅ Servicio Interledger inicializado correctamente");
            return true;
        } catch (error) {
            console.error("❌ Error inicializando servicio Interledger:", error);
            return false;
        }
    }

    async sendPayment(senderWalletUrl, receiverWalletUrl, amount) {
        if (!this.initialized) {
            throw new Error("Servicio Interledger no inicializado");
        }

        try {
            console.log(`💸 Enviando pago: $${amount} de ${senderWalletUrl} a ${receiverWalletUrl}`);

            // 1. Obtener direcciones de wallets
            const sendingWalletAddress = await this.client.walletAddress.get({
                url: senderWalletUrl
            });

            const receivingWalletAddress = await this.client.walletAddress.get({
                url: receiverWalletUrl
            });

            // 2. Crear concesión para pago entrante
            const incomingPaymentGrant = await this.client.grant.request({
                url: receivingWalletAddress.authServer,
            }, {
                access_token: {
                    access: [{
                        type: "incoming-payment",
                        actions: ["create"],
                    }]
                }
            });

            if (!isFinalizedGrant(incomingPaymentGrant)) {
                throw new Error("Falló la concesión de pago entrante");
            }

            // 3. Crear pago entrante
            const incomingPayment = await this.client.incomingPayment.create({
                url: receivingWalletAddress.resourceServer,
                accessToken: incomingPaymentGrant.access_token.value,
            }, {
                walletAddress: receivingWalletAddress.id,
                incomingAmount: {
                    assetCode: receivingWalletAddress.assetCode,
                    assetScale: receivingWalletAddress.assetScale,
                    value: (amount * Math.pow(10, receivingWalletAddress.assetScale)).toString(),
                },
            });

            // 4. Crear concesión para cotización
            const quoteGrant = await this.client.grant.request({
                url: sendingWalletAddress.authServer,
            }, {
                access_token: {
                    access: [{
                        type: "quote",
                        actions: ["create"],
                    }]
                }
            });

            if (!isFinalizedGrant(quoteGrant)) {
                throw new Error("Falló la concesión de cotización");
            }

            // 5. Obtener cotización
            const quote = await this.client.quote.create({
                url: receivingWalletAddress.resourceServer,
                accessToken: quoteGrant.access_token.value,
            }, {
                walletAddress: sendingWalletAddress.id,
                receiver: incomingPayment.id,
                method: "ilp",
            });

            // 6. Crear concesión para pago saliente
            const outgoingPaymentGrant = await this.client.grant.request({
                url: sendingWalletAddress.authServer
            }, {
                access_token: {
                    access: [{
                        type: "outgoing-payment",
                        actions: ["create"],
                        limits: {
                            debitAmount: quote.debitAmount,
                        },
                        identifier: sendingWalletAddress.id,
                    }]
                },
                interact: {
                    start: ["redirect"],
                    finish: {
                        method: "redirect",
                        uri: "http://localhost:3001/api/interledger/confirm",
                        nonce: Math.random().toString(36).substring(7)
                    }
                }
            });

            // 7. Retornar información del pago para manejo en el controlador
            return {
                success: true,
                quote,
                outgoingPaymentGrant,
                incomingPayment,
                sendingWalletAddress,
                receivingWalletAddress,
                // Esta URL será usada para redirección de confirmación
                interactionUrl: outgoingPaymentGrant.interact?.redirect,
                continueUri: outgoingPaymentGrant.continue?.uri,
                continueToken: outgoingPaymentGrant.continue?.access_token?.value
            };

        } catch (error) {
            console.error("❌ Error en pago Interledger:", error);
            throw error;
        }
    }

    async confirmPayment(continueUri, continueToken, walletResourceServer, accessToken, walletAddress, quoteId) {
        try {
            // 8. Finalizar la concesión del pago saliente
            const finalizedOutgoingPaymentGrant = await this.client.grant.continue({
                url: continueUri,
                accessToken: continueToken,
            });

            if (!isFinalizedGrant(finalizedOutgoingPaymentGrant)) {
                throw new Error("Falló la finalización de la concesión");
            }

            // 9. Crear el pago saliente final
            const outgoingPayment = await this.client.outgoingPayment.create({
                url: walletResourceServer,
                accessToken: finalizedOutgoingPaymentGrant.access_token.value,
            }, {
                walletAddress: walletAddress,
                quoteId: quoteId,
            });

            return {
                success: true,
                outgoingPayment,
                finalizedGrant: finalizedOutgoingPaymentGrant
            };

        } catch (error) {
            console.error("❌ Error confirmando pago:", error);
            throw error;
        }
    }
}

module.exports = new InterledgerService();
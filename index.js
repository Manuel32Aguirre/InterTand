import { createAuthenticatedClient, isFinalizedGrant } from "@interledger/open-payments";
import fs from "fs";
import ReadLine from "readline/promises";

(async () => {
    try {
        // 🔑 Leer la llave privada
        const privateKey = fs.readFileSync("private.key", "utf8");

        // 1. Crear cliente autenticado
        const client = await createAuthenticatedClient({
            walletAddressUrl: "https://ilp.interledger-test.dev/birdsclient",
            privateKey,
            keyId: "858468ca-b8c7-468d-95f6-89e59325d311"
        });

        // 2. Flujo de pagos entre pares
        // Dirección que envía
        const sendingWalletAddress = await client.walletAddress.get({
            url: "https://ilp.interledger-test.dev/birdsemisor"
        });

        // Dirección que recibe
        const receivingWalletAddress = await client.walletAddress.get({
            url: "https://ilp.interledger-test.dev/totaltanda"
        });

        console.log("Emisor:", sendingWalletAddress);
        console.log("Receptor:", receivingWalletAddress);

        //Crear una consecion para pago entrante
        const incomingPaymentGrant = await client.grant.request({
            url: receivingWalletAddress.authServer,
        },
            {
                access_token: {
                    access: [
                        {
                            type: "incoming-payment",
                            actions: ["create"],
                        }
                    ]
                }
            }

        );
        if (!isFinalizedGrant(incomingPaymentGrant)) {
            throw new Error("Se espera finalice la conseción");
        }

        console.log(incomingPaymentGrant)

        const incomingPayment = await client.incomingPayment.create(
            {
                url: receivingWalletAddress.resourceServer,
                accessToken: incomingPaymentGrant.access_token.value,
            },
            {
                walletAddress: receivingWalletAddress.id,
                incomingAmount: {
                    assetCode: receivingWalletAddress.assetCode,
                    assetScale: receivingWalletAddress.assetScale,
                    value: "1000",
                },
            }
        );
        console.log({ incomingPayment });
        //4. Crear la consecion para una cotización
        const quoteGrant = await client.grant.request(
            {
                url: sendingWalletAddress.authServer,
            },
            {
                access_token: {
                    access: [
                        {
                            type: "quote",
                            actions: ["create"],
                        }
                    ]
                }
            }
        )
        if (!isFinalizedGrant(quoteGrant)) {
            throw new Error("Se espera finalice la conseción");
        }

        //Obtener una cotización para el remitente
        const quote = await client.quote.create(
            {
                url: receivingWalletAddress.resourceServer,
                accessToken: quoteGrant.access_token.value,
            },
            {
                walletAddress: sendingWalletAddress.id,
                receiver: incomingPayment.id,
                method: "ilp",
            }
        );
        console.log({ quote });


        //Obtener una consecion para un pago saliente
        const outgoingPaymentGrant = await client.grant.request(
            {
                url: sendingWalletAddress.authServer
            },
            {
                access_token: {
                    access: [
                        {
                            type: "outgoing-payment",
                            actions: ["create"],
                            limits: {
                                debitAmount: quote.debitAmount,
                            },
                            identifier: sendingWalletAddress.id,
                        }
                    ]
                },
                interact: {
                    start: ["redirect"],
                }
            }
        );
        console.log({ outgoingPaymentGrant });
        //7. Continuar con la consecion del pago saliente
        await ReadLine
            .createInterface({
                input: process.stdin,
                output: process.stdout
            }).question("Presiona Enter para continuar con la conseción del pago saliente...");
        //8. Finalizar la consesion del pago saliente
        const finalizedOutgoingPaymentGrant = await client.grant.continue({
            url: outgoingPaymentGrant.continue.uri,
            accessToken: outgoingPaymentGrant.continue.access_token.value,
        });
        if (!isFinalizedGrant(finalizedOutgoingPaymentGrant)) {
            throw new Error("Se espera finalice la conseción");
        }

        //9. Continuar con la cotirazión del pago saliente
        const outgoingPayment = await client.outgoingPayment.create(
            {
                url: sendingWalletAddress.resourceServer,
                accessToken: finalizedOutgoingPaymentGrant.access_token.value,
            },
            {
                walletAddress: sendingWalletAddress.id,
                quoteId: quote.id,
            }
        );
        console.log({ outgoingPayment });
    } catch (err) {
        console.error("❌ Error en flujo Interledger:", err);
    }
})();

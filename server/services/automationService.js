const cron = require('node-cron');
const databaseService = require('./server/services/databaseService');
const interledgerService = require('./server/services/interledgerService');

class AutomationService {
    constructor() {
        this.jobs = [];
    }

    async initialize() {
        console.log('🤖 Inicializando servicio de automatización...');
        
        // Verificar pagos pendientes cada día a las 9:00 AM
        const dailyPaymentsJob = cron.schedule('0 9 * * *', async () => {
            await this.processPendingPayments();
        }, {
            scheduled: false
        });

        // Verificar sorteos pendientes cada lunes a las 10:00 AM
        const weeklyDrawsJob = cron.schedule('0 10 * * 1', async () => {
            await this.processScheduledDraws();
        }, {
            scheduled: false
        });

        // Enviar recordatorios cada día a las 8:00 AM
        const remindersJob = cron.schedule('0 8 * * *', async () => {
            await this.sendPaymentReminders();
        }, {
            scheduled: false
        });

        this.jobs = [
            { name: 'Pagos Pendientes', job: dailyPaymentsJob },
            { name: 'Sorteos Programados', job: weeklyDrawsJob },
            { name: 'Recordatorios', job: remindersJob }
        ];

        // Iniciar todos los trabajos
        this.startAll();
    }

    startAll() {
        this.jobs.forEach(({ name, job }) => {
            job.start();
            console.log(`✅ Trabajo "${name}" iniciado`);
        });
    }

    stopAll() {
        this.jobs.forEach(({ name, job }) => {
            job.stop();
            console.log(`🛑 Trabajo "${name}" detenido`);
        });
    }

    async processPendingPayments() {
        try {
            console.log('🔄 Procesando pagos pendientes...');
            
            const pendingPayments = await databaseService.getPendingPayments();
            console.log(`📊 Encontrados ${pendingPayments.length} pagos pendientes`);

            for (const payment of pendingPayments) {
                try {
                    // Simular procesamiento de pago
                    const result = await interledgerService.processPayment(
                        payment.wallet_address,
                        '$ilp.tandapay.com/main',
                        payment.amount,
                        `Pago automático - Tanda ${payment.tanda_name}`
                    );

                    if (result.status === 'completed') {
                        await databaseService.updatePaymentStatus(
                            payment.id,
                            'completed',
                            result.interledgerTxId
                        );
                        
                        console.log(`✅ Pago ${payment.id} procesado exitosamente`);
                    } else {
                        console.log(`⚠️  Pago ${payment.id} falló: ${result.error}`);
                    }
                } catch (error) {
                    console.error(`❌ Error procesando pago ${payment.id}:`, error.message);
                }
            }

            console.log('✅ Procesamiento de pagos completado');
        } catch (error) {
            console.error('❌ Error en procesamiento automático de pagos:', error);
        }
    }

    async processScheduledDraws() {
        try {
            console.log('🎲 Verificando sorteos programados...');
            
            // Obtener tandas activas que necesitan sorteo
            const activeTandas = await databaseService.getAllTandas();
            const tandasForDraw = activeTandas.filter(tanda => 
                tanda.status === 'active' && 
                tanda.next_draw_date && 
                new Date(tanda.next_draw_date) <= new Date()
            );

            console.log(`🎯 Encontradas ${tandasForDraw.length} tandas para sorteo`);

            for (const tanda of tandasForDraw) {
                try {
                    await this.performAutomaticDraw(tanda);
                } catch (error) {
                    console.error(`❌ Error en sorteo de tanda ${tanda.id}:`, error.message);
                }
            }

            console.log('✅ Verificación de sorteos completada');
        } catch (error) {
            console.error('❌ Error en procesamiento de sorteos:', error);
        }
    }

    async performAutomaticDraw(tanda) {
        console.log(`🎲 Realizando sorteo automático para tanda: ${tanda.name}`);

        // Obtener participantes elegibles
        const participants = await databaseService.getTandaParticipants(tanda.id);
        const eligibleParticipants = participants.filter(p => !p.has_won);

        if (eligibleParticipants.length === 0) {
            console.log(`⚠️  No hay participantes elegibles en tanda ${tanda.id}`);
            return;
        }

        // Seleccionar ganador aleatorio
        const winner = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
        const roundNumber = tanda.current_round + 1;

        // Crear registro del sorteo
        const draw = await databaseService.createDraw({
            tandaId: tanda.id,
            roundNumber,
            winnerUserId: winner.user_id,
            prizeAmount: tanda.total_amount,
            drawDate: new Date().toISOString().split('T')[0]
        });

        // Procesar pago del premio
        const prizePayment = await interledgerService.distributePrize(
            winner.wallet_address,
            tanda.total_amount,
            tanda.id,
            roundNumber
        );

        console.log(`🎉 Sorteo completado - Ganador: ${winner.name}, Premio: $${tanda.total_amount}`);

        // Programar próximo sorteo si no es la última ronda
        if (roundNumber < tanda.max_participants) {
            const nextDrawDate = new Date();
            nextDrawDate.setMonth(nextDrawDate.getMonth() + 1);
            
            // Aquí se actualizaría la fecha del próximo sorteo
            console.log(`📅 Próximo sorteo programado para: ${nextDrawDate.toISOString().split('T')[0]}`);
        } else {
            // Marcar tanda como completada
            await databaseService.updateTandaStatus(tanda.id, 'completed');
            console.log(`🏁 Tanda ${tanda.name} marcada como completada`);
        }
    }

    async sendPaymentReminders() {
        try {
            console.log('📢 Enviando recordatorios de pago...');
            
            // Obtener pagos que vencen en los próximos 3 días
            const upcomingPayments = await databaseService.getPendingPayments();
            const reminderPayments = upcomingPayments.filter(payment => {
                const dueDate = new Date(payment.due_date);
                const threeDaysFromNow = new Date();
                threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
                return dueDate <= threeDaysFromNow;
            });

            console.log(`📊 ${reminderPayments.length} recordatorios a enviar`);

            for (const payment of reminderPayments) {
                // En una implementación real, aquí se enviarían emails/SMS
                console.log(`📧 Recordatorio enviado a ${payment.user_name} - Pago de $${payment.amount} vence el ${payment.due_date}`);
            }

            console.log('✅ Recordatorios enviados');
        } catch (error) {
            console.error('❌ Error enviando recordatorios:', error);
        }
    }

    // Método para ejecutar manualmente tareas específicas
    async runTask(taskName) {
        switch (taskName) {
            case 'payments':
                await this.processPendingPayments();
                break;
            case 'draws':
                await this.processScheduledDraws();
                break;
            case 'reminders':
                await this.sendPaymentReminders();
                break;
            default:
                console.log('❌ Tarea no reconocida. Opciones: payments, draws, reminders');
        }
    }

    getStatus() {
        return {
            jobs: this.jobs.map(({ name, job }) => ({
                name,
                running: job.getStatus() !== null
            })),
            nextRuns: {
                payments: '9:00 AM (diario)',
                draws: '10:00 AM (lunes)',
                reminders: '8:00 AM (diario)'
            }
        };
    }
}

module.exports = new AutomationService();

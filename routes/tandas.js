const express = require('express');
const router = express.Router();
const databaseService = require('../server/services/databaseService');
const interledgerService = require('../server/services/interledgerService');

// GET /tandas - Obtener todas las tandas
router.get('/', async (req, res) => {
  try {
    const tandas = await databaseService.getAllTandas();
    
    // Formatear datos para el frontend
    const formattedTandas = tandas.map(tanda => ({
      id: tanda.id,
      name: tanda.name,
      description: tanda.description,
      totalAmount: tanda.total_amount,
      monthlyPayment: tanda.monthly_payment,
      participants: tanda.current_participants,
      maxParticipants: tanda.max_participants,
      status: tanda.status,
      currentRound: tanda.current_round,
      nextDraw: tanda.next_draw_date,
      createdBy: tanda.creator_name,
      createdAt: tanda.created_at
    }));

    res.json({ 
      message: 'Lista de tandas activas',
      tandas: formattedTandas
    });
  } catch (error) {
    console.error('Error obteniendo tandas:', error);
    res.status(500).json({
      error: 'Error obteniendo tandas',
      message: error.message
    });
  }
});

// POST /tandas - Crear una nueva tanda
router.post('/', async (req, res) => {
  try {
    const { name, description, totalAmount, participants, monthlyPayment } = req.body;
    
    // Validaciones básicas
    if (!name || !totalAmount || !participants || !monthlyPayment) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requieren: name, totalAmount, participants, monthlyPayment'
      });
    }

    if (participants < 3 || participants > 24) {
      return res.status(400).json({
        error: 'Número de participantes inválido',
        message: 'Debe ser entre 3 y 24 participantes'
      });
    }

    // Por ahora, usar usuario demo
    const createdBy = 1; // Usuario demo

    const tandaData = {
      name,
      description: description || `Tanda de ${participants} participantes`,
      totalAmount: parseInt(totalAmount),
      monthlyPayment: parseInt(monthlyPayment),
      maxParticipants: parseInt(participants),
      createdBy
    };

    const nuevaTanda = await databaseService.createTanda(tandaData);
    
    res.json({ 
      message: 'Tanda creada exitosamente',
      tanda: {
        id: nuevaTanda.id,
        name: nuevaTanda.name,
        description: nuevaTanda.description,
        totalAmount: nuevaTanda.totalAmount,
        monthlyPayment: nuevaTanda.monthlyPayment,
        participants: 0,
        maxParticipants: nuevaTanda.maxParticipants,
        status: 'recruiting',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creando tanda:', error);
    res.status(500).json({
      error: 'Error creando tanda',
      message: error.message
    });
  }
});

// GET /tandas/:id - Obtener información de una tanda específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tanda = await databaseService.getTandaById(id);
    
    if (!tanda) {
      return res.status(404).json({
        error: 'Tanda no encontrada',
        message: `No existe una tanda con ID ${id}`
      });
    }

    // Obtener participantes y sorteos
    const participants = await databaseService.getTandaParticipants(id);
    const draws = await databaseService.getDrawsByTanda(id);

    const tandaInfo = {
      id: tanda.id,
      name: tanda.name,
      description: tanda.description,
      totalAmount: tanda.total_amount,
      monthlyPayment: tanda.monthly_payment,
      participants: tanda.current_participants,
      maxParticipants: tanda.max_participants,
      status: tanda.status,
      currentRound: tanda.current_round,
      nextDraw: tanda.next_draw_date,
      createdBy: tanda.creator_name,
      createdAt: tanda.created_at,
      participantsList: participants,
      drawHistory: draws
    };

    res.json({ 
      message: `Información de la tanda ${id}`,
      tanda: tandaInfo
    });
  } catch (error) {
    console.error('Error obteniendo tanda:', error);
    res.status(500).json({
      error: 'Error obteniendo información de la tanda',
      message: error.message
    });
  }
});

// POST /tandas/:id/join - Unirse a una tanda
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Verificar que la tanda existe y está disponible
    const tanda = await databaseService.getTandaById(id);
    if (!tanda) {
      return res.status(404).json({
        error: 'Tanda no encontrada',
        message: `No existe una tanda con ID ${id}`
      });
    }

    if (tanda.status !== 'recruiting') {
      return res.status(400).json({
        error: 'Tanda no disponible',
        message: 'Esta tanda ya no acepta nuevos participantes'
      });
    }

    if (tanda.current_participants >= tanda.max_participants) {
      return res.status(400).json({
        error: 'Tanda llena',
        message: 'Esta tanda ya tiene el máximo de participantes'
      });
    }

    // Por ahora usar usuario demo si no se especifica
    const finalUserId = userId || 1;

    // Agregar participante
    await databaseService.addParticipantToTanda(id, finalUserId);

    // Verificar si la tanda está completa para activarla
    const tandaActualizada = await databaseService.getTandaById(id);
    if (tandaActualizada.current_participants >= tandaActualizada.max_participants) {
      await databaseService.updateTandaStatus(id, 'active');
    }

    res.json({
      message: `Usuario ${finalUserId} se unió exitosamente a la tanda ${id}`,
      success: true,
      participantNumber: tandaActualizada.current_participants
    });
  } catch (error) {
    console.error('Error uniéndose a tanda:', error);
    res.status(500).json({
      error: 'Error uniéndose a la tanda',
      message: error.message
    });
  }
});

// POST /tandas/:id/draw - Realizar sorteo (solo para demo)
router.post('/:id/draw', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tanda = await databaseService.getTandaById(id);
    if (!tanda) {
      return res.status(404).json({
        error: 'Tanda no encontrada'
      });
    }

    if (tanda.status !== 'active') {
      return res.status(400).json({
        error: 'Tanda no activa',
        message: 'Solo se pueden realizar sorteos en tandas activas'
      });
    }

    // Obtener participantes que no han ganado
    const participants = await databaseService.getTandaParticipants(id);
    const availableParticipants = participants.filter(p => !p.has_won);

    if (availableParticipants.length === 0) {
      return res.status(400).json({
        error: 'No hay participantes elegibles',
        message: 'Todos los participantes ya han ganado'
      });
    }

    // Seleccionar ganador aleatorio
    const winner = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];
    const roundNumber = tanda.current_round + 1;
    const prizeAmount = tanda.total_amount;

    // Crear registro del sorteo
    const draw = await databaseService.createDraw({
      tandaId: id,
      roundNumber,
      winnerUserId: winner.user_id,
      prizeAmount,
      drawDate: new Date().toISOString().split('T')[0]
    });

    // Simular pago del premio usando Interledger
    const prizePayment = await interledgerService.distributePrize(
      winner.wallet_address,
      prizeAmount,
      id,
      roundNumber
    );

    res.json({
      message: 'Sorteo realizado exitosamente',
      draw: {
        id: draw.id,
        roundNumber,
        winner: {
          id: winner.user_id,
          name: winner.name,
          walletAddress: winner.wallet_address
        },
        prizeAmount,
        drawDate: draw.drawDate,
        paymentStatus: prizePayment.success ? 'completed' : 'pending',
        interledgerTx: prizePayment.transactionId
      }
    });
  } catch (error) {
    console.error('Error realizando sorteo:', error);
    res.status(500).json({
      error: 'Error realizando sorteo',
      message: error.message
    });
  }
});

module.exports = router;
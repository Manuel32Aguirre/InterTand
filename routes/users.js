const express = require('express');
const router = express.Router();

// GET /users - Obtener todos los usuarios
router.get('/', (req, res) => {
  res.json({ 
    message: 'Lista de usuarios',
    users: [] 
  });
});

// POST /users - Crear un nuevo usuario
router.post('/', (req, res) => {
  const { name, email, walletAddress } = req.body;
  res.json({ 
    message: 'Usuario creado exitosamente',
    user: { id: 1, name, email, walletAddress }
  });
});

// GET /users/:id - Obtener un usuario específico
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: `Usuario ${id}`,
    user: { id, name: 'Usuario Demo', email: 'demo@tandapay.com' }
  });
});

module.exports = router;
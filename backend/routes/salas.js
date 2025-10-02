const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las salas
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, u.nombre AS encargado_nombre 
      FROM salas s
      JOIN usuarios u ON s.encargado_id = u.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener salas' });
  }
});

// Obtener dispositivos de una sala
router.get('/:id/dispositivos', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT d.*, 
        (SELECT COUNT(*) 
         FROM horarios_dispositivos h 
         WHERE h.dispositivo_id = d.id 
         AND h.estado_esperado = 'Encendido') AS horarios_activos
      FROM dispositivos d
      WHERE d.sala_id = ?
    `, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener dispositivos de la sala' });
  }
});

module.exports = router;
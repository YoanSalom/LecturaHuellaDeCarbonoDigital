const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los dispositivos
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM dispositivos');
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener un dispositivo específico
router.get('/:id', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM dispositivos WHERE id = ?', [req.params.id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Agregar un dispositivo
router.post('/', async (req, res) => {
  const { id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util } = req.body;
  
  try {
    const [result] = await db.query(
      'INSERT INTO dispositivos (id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util]
    );
    
    res.json({ 
      id, 
      nombre_modelo, 
      descripcion, 
      tipo, 
      años_uso, 
      sala_id, 
      watts_encendido, 
      watts_apagado, 
      horas_vida_util 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
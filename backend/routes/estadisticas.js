const express = require('express');
const router = express.Router();
const db = require('../db'); // tu conexión MySQL

// Obtener todos los registros de carbon_intensity
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM carbon_intensity ORDER BY datetime_utc ASC');
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener registros filtrando por fecha (YYYY-MM-DD)
router.get('/fecha/:fecha', async (req, res) => {
  try {
    const fecha = req.params.fecha;
    const [results] = await db.query(
      'SELECT * FROM carbon_intensity WHERE DATE(datetime_utc) = ? ORDER BY datetime_utc ASC',
      [fecha]
    );
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener registros por año (YYYY)
router.get('/anio/:anio', async (req, res) => {
  try {
    const anio = req.params.anio;
    const [results] = await db.query(
      'SELECT * FROM carbon_intensity WHERE YEAR(datetime_utc) = ? ORDER BY datetime_utc ASC',
      [anio]
    );
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

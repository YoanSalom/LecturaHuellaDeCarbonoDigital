const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { dispositivo, año, mes } = req.query;

    let query = `
      SELECT 
        l.id,
        l.dispositivo_id,
        d.nombre_modelo,
        DATE_FORMAT(l.fecha, '%Y-%m-%d') AS fecha,
        TIME_FORMAT(l.hora_inicio, '%H:%i:%s') AS hora_inicio,
        TIME_FORMAT(l.hora_fin, '%H:%i:%s') AS hora_fin,
        l.estado,
        l.consumo_w,
        l.horas,
        l.consumo_kwh,
        l.intensidad_co2,
        l.emisiones_kgco2,
        l.trafico_mb,
        l.consumo_trafico_kwh,
        l.emisiones_trafico_kg
      FROM lecturas l
      JOIN dispositivos d ON l.dispositivo_id = d.id
      WHERE 1=1
    `;

    const params = [];

    if (dispositivo) {
      query += ` AND l.dispositivo_id = ?`;
      params.push(dispositivo);
    }

    if (año) {
      query += ` AND YEAR(l.fecha) = ?`;
      params.push(parseInt(año));
    }

    if (mes) {
      query += ` AND MONTH(l.fecha) = ?`;
      params.push(parseInt(mes));
    }

    query += ` ORDER BY l.fecha ASC, l.hora_inicio ASC`;

    const [rows] = await db.execute(query, params);

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });

  } catch (error) {
    console.error('Error en /api/lecturas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener lecturas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
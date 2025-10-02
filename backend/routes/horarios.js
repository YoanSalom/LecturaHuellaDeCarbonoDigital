const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha } = req.query;
    
    // Validación de entrada
    if (!id || !id.startsWith('D-')) {
      return res.status(400).json({ error: 'ID de dispositivo inválido' });
    }

    // Consulta segura con manejo de fechas
    const [rows] = await db.query(`
      SELECT 
        h.dia_semana, 
        TIME_FORMAT(h.hora_inicio, '%H:%i:%s') as hora_inicio,
        TIME_FORMAT(h.hora_fin, '%H:%i:%s') as hora_fin,
        h.estado_esperado,
        d.watts_encendido,
        d.watts_apagado
      FROM horarios_dispositivos h
      JOIN dispositivos d ON h.dispositivo_id = d.id
      WHERE h.dispositivo_id = ?
      AND h.dia_semana = (
        SELECT 
          CASE DAYNAME(?)
            WHEN 'Monday' THEN 'Lunes'
            WHEN 'Tuesday' THEN 'Martes'
            WHEN 'Wednesday' THEN 'Miércoles'
            WHEN 'Thursday' THEN 'Jueves'
            WHEN 'Friday' THEN 'Viernes'
            WHEN 'Saturday' THEN 'Sábado'
            WHEN 'Sunday' THEN 'Domingo'
          END
      )
    `, [id, fecha || new Date()]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron horarios',
        details: `No hay horarios configurados para el dispositivo ${id} en la fecha especificada`
      });
    }
    
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /horarios:', err);
    res.status(500).json({ 
      error: 'Error al obtener horarios',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
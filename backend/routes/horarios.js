const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// ✅ Obtener todos los horarios
router.get('/', async (req, res) => {
  try {
    const { dispositivo_id, dia_semana } = req.query;
    
    let query = `
      SELECT 
        h.*,
        d.nombre_modelo as dispositivo_nombre,
        d.tipo as dispositivo_tipo,
        s.nombre as sala_nombre
      FROM horarios_dispositivos h
      JOIN dispositivos d ON h.dispositivo_id = d.id
      LEFT JOIN salas s ON d.sala_id = s.id
      WHERE 1=1
    `;
    const params = [];
    
    if (dispositivo_id) {
      query += ' AND h.dispositivo_id = ?';
      params.push(dispositivo_id);
    }
    
    if (dia_semana) {
      query += ' AND h.dia_semana = ?';
      params.push(dia_semana);
    }
    
    query += ' ORDER BY h.dispositivo_id, h.dia_semana, h.hora_inicio';
    
    const [rows] = await db.query(query, params);
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al obtener horarios' });
  }
});

// ✅ Obtener horarios agrupados por día de la semana
router.get('/por-dia', async (req, res) => {
  try {
    const { dispositivo_id } = req.query;
    
    if (!dispositivo_id) {
      return res.status(400).json({ success: false, error: 'dispositivo_id es requerido' });
    }
    
    const [rows] = await db.query(`
      SELECT *
      FROM horarios_dispositivos
      WHERE dispositivo_id = ?
      ORDER BY 
        FIELD(dia_semana, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        hora_inicio
    `, [dispositivo_id]);
    
    // Agrupar por día
    const porDia = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };
    
    rows.forEach(row => {
      porDia[row.dia_semana].push(row);
    });
    
    res.json({ success: true, data: porDia });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al obtener horarios' });
  }
});

// ✅ Verificar conflictos de horarios
router.post('/verificar-conflicto', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { dispositivo_id, dia_semana, hora_inicio, hora_fin, excluir_id } = req.body;
    
    let query = `
      SELECT id, hora_inicio, hora_fin, estado_esperado
      FROM horarios_dispositivos
      WHERE dispositivo_id = ?
        AND dia_semana = ?
        AND (
          (hora_inicio < ? AND hora_fin > ?)
          OR (hora_inicio < ? AND hora_fin > ?)
          OR (hora_inicio >= ? AND hora_fin <= ?)
        )
    `;
    
    const params = [
      dispositivo_id,
      dia_semana,
      hora_fin, hora_inicio,
      hora_fin, hora_fin,
      hora_inicio, hora_fin
    ];
    
    if (excluir_id) {
      query += ' AND id != ?';
      params.push(excluir_id);
    }
    
    const [conflictos] = await db.query(query, params);
    
    res.json({
      success: true,
      tiene_conflicto: conflictos.length > 0,
      conflictos: conflictos
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al verificar conflictos' });
  }
});

// ✅ Crear horario (con validación)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { dispositivo_id, dia_semana, hora_inicio, hora_fin, estado_esperado } = req.body;
    
    // Validar que hora_fin > hora_inicio
    if (hora_inicio >= hora_fin) {
      return res.status(400).json({ 
        success: false, 
        error: 'La hora de fin debe ser mayor que la hora de inicio' 
      });
    }
    
    // Verificar conflictos
    const [conflictos] = await db.query(`
      SELECT id, hora_inicio, hora_fin
      FROM horarios_dispositivos
      WHERE dispositivo_id = ?
        AND dia_semana = ?
        AND (
          (hora_inicio < ? AND hora_fin > ?)
          OR (hora_inicio < ? AND hora_fin > ?)
          OR (hora_inicio >= ? AND hora_fin <= ?)
        )
    `, [dispositivo_id, dia_semana, hora_fin, hora_inicio, hora_fin, hora_fin, hora_inicio, hora_fin]);
    
    if (conflictos.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Conflicto de horario detectado',
        conflictos: conflictos
      });
    }
    
    // Generar ID automático
    const [lastId] = await db.query(
      'SELECT id FROM horarios_dispositivos ORDER BY id DESC LIMIT 1'
    );
    
    let newId = 'H-0001';
    if (lastId.length > 0) {
      const num = parseInt(lastId[0].id.split('-')[1]) + 1;
      newId = `H-${num.toString().padStart(4, '0')}`;
    }
    
    await db.query(
      `INSERT INTO horarios_dispositivos 
       (id, dispositivo_id, dia_semana, hora_inicio, hora_fin, estado_esperado) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, dispositivo_id, dia_semana, hora_inicio, hora_fin, estado_esperado]
    );
    
    res.json({ success: true, mensaje: 'Horario creado correctamente', id: newId });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al crear horario' });
  }
});

// ✅ Actualizar horario
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { dispositivo_id, dia_semana, hora_inicio, hora_fin, estado_esperado } = req.body;
    
    // Validar
    if (hora_inicio >= hora_fin) {
      return res.status(400).json({ 
        success: false, 
        error: 'La hora de fin debe ser mayor que la hora de inicio' 
      });
    }
    
    // Verificar conflictos (excluyendo el propio registro)
    const [conflictos] = await db.query(`
      SELECT id, hora_inicio, hora_fin
      FROM horarios_dispositivos
      WHERE dispositivo_id = ?
        AND dia_semana = ?
        AND id != ?
        AND (
          (hora_inicio < ? AND hora_fin > ?)
          OR (hora_inicio < ? AND hora_fin > ?)
          OR (hora_inicio >= ? AND hora_fin <= ?)
        )
    `, [dispositivo_id, dia_semana, id, hora_fin, hora_inicio, hora_fin, hora_fin, hora_inicio, hora_fin]);
    
    if (conflictos.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Conflicto de horario detectado',
        conflictos: conflictos
      });
    }
    
    await db.query(
      `UPDATE horarios_dispositivos 
       SET dispositivo_id = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, estado_esperado = ?
       WHERE id = ?`,
      [dispositivo_id, dia_semana, hora_inicio, hora_fin, estado_esperado, id]
    );
    
    res.json({ success: true, mensaje: 'Horario actualizado correctamente' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar horario' });
  }
});

// ✅ Eliminar horario
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM horarios_dispositivos WHERE id = ?', [req.params.id]);
    res.json({ success: true, mensaje: 'Horario eliminado correctamente' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar horario' });
  }
});

// ✅ Aplicar plantilla de horarios a todos los dispositivos de una sala
router.post('/sala/:sala_id/aplicar', authMiddleware, requireAdmin, async (req, res) => {
  const { sala_id } = req.params;
  const { horarios, modo = 'reemplazar' } = req.body;

  if (!horarios || horarios.length === 0) {
    return res.status(400).json({ success: false, error: 'No se enviaron horarios para aplicar' });
  }

  try {
    const [dispositivos] = await db.query(
      'SELECT id FROM dispositivos WHERE sala_id = ?', [sala_id]
    );
    if (dispositivos.length === 0) {
      return res.status(404).json({ success: false, error: 'No hay dispositivos en esta sala' });
    }

    const [lastId] = await db.query(
      'SELECT id FROM horarios_dispositivos ORDER BY id DESC LIMIT 1'
    );
    let nextNum = lastId.length > 0 ? parseInt(lastId[0].id.split('-')[1]) + 1 : 1;

    let creados = 0;
    for (const disp of dispositivos) {
      if (modo === 'reemplazar') {
        await db.query('DELETE FROM horarios_dispositivos WHERE dispositivo_id = ?', [disp.id]);
      }
      for (const h of horarios) {
        const newId = `H-${nextNum.toString().padStart(4, '0')}`;
        nextNum++;
        await db.query(
          'INSERT INTO horarios_dispositivos (id, dispositivo_id, dia_semana, hora_inicio, hora_fin, estado_esperado) VALUES (?, ?, ?, ?, ?, ?)',
          [newId, disp.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.estado_esperado]
        );
        creados++;
      }
    }

    res.json({
      success: true,
      mensaje: `Horarios aplicados a ${dispositivos.length} dispositivo(s)`,
      dispositivos: dispositivos.length,
      creados
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
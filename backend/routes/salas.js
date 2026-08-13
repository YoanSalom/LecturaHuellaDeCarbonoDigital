const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// Nombres de perfil P1-P9 (mismo diccionario que frontend/src/components/ModuloSugerencias.js,
// solo número→nombre; se mantiene una copia mínima acá porque el backend no importa código de React)
const PERFIL_NOMBRES = {
  1: 'Líder Sostenible',
  2: 'Consciente Equilibrado',
  3: 'Intensivo Informado',
  4: 'Eficiente Pasivo',
  5: 'Promedio Estándar',
  6: 'Alto Consumidor',
  7: 'Básico Eficiente',
  8: 'Desconectado Moderado',
  9: 'Crítico Urgente',
};

// Solo oficinas individuales tienen perfil ecológico evaluable; salas de uso
// colectivo (labs, halls, bodegas, servidores) no, aunque su id caiga en el rango "OF-"
// (caso conocido: OF-0023 es una bodega, no una oficina personal).
const IDS_OFICINA_EXCLUIDOS = new Set(['OF-0023']);

function esOficinaIndividual(sala) {
  if (IDS_OFICINA_EXCLUIDOS.has(sala.id)) return false;
  return /^OF/i.test(sala.id) || /^OF/i.test(sala.nombre || '');
}

function conPerfilEcologico(sala) {
  const oficina = esOficinaIndividual(sala);
  const numero = oficina ? sala.encargado_perfil_num : null;
  const { encargado_perfil_num, ...resto } = sala;
  return {
    ...resto,
    perfil_ecologico_numero: numero ?? null,
    perfil_ecologico_nombre: numero != null ? `${numero} - ${PERFIL_NOMBRES[numero]}` : null,
  };
}

//  Obtener todas las salas (con encargado)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.*,
        u.nombre AS encargado_nombre,
        u.perfil AS encargado_perfil_num,
        (SELECT COUNT(*) FROM dispositivos WHERE sala_id = s.id) as total_dispositivos
      FROM salas s
      JOIN usuarios u ON s.encargado_id = u.id
      ORDER BY s.edificio, s.piso, s.numero
    `);
    res.json({ success: true, total: rows.length, data: rows.map(conPerfilEcologico) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener salas' });
  }
});

//  Obtener una sala específica
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.*,
        u.nombre AS encargado_nombre,
        u.perfil AS encargado_perfil_num
      FROM salas s
      JOIN usuarios u ON s.encargado_id = u.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sala no encontrada' });
    }
    res.json({ success: true, data: conPerfilEcologico(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener sala' });
  }
});

//  Obtener dispositivos de una sala
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
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener dispositivos de la sala' });
  }
});

//  Crear sala
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id, nombre, numero, piso, edificio, encargado_id } = req.body;
    
    // Verificar que no exista
    const [existing] = await db.query('SELECT id FROM salas WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'El ID ya existe' });
    }
    
    await db.query(
      'INSERT INTO salas (id, nombre, numero, piso, edificio, encargado_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, nombre, numero, piso, edificio, encargado_id]
    );
    
    res.json({ success: true, mensaje: 'Sala creada correctamente', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al crear sala' });
  }
});

//  Actualizar sala
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, numero, piso, edificio, encargado_id } = req.body;
    
    await db.query(
      'UPDATE salas SET nombre = ?, numero = ?, piso = ?, edificio = ?, encargado_id = ? WHERE id = ?',
      [nombre, numero, piso, edificio, encargado_id, id]
    );
    
    res.json({ success: true, mensaje: 'Sala actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al actualizar sala' });
  }
});

//  Eliminar sala
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si tiene dispositivos
    const [dispositivos] = await db.query('SELECT COUNT(*) as count FROM dispositivos WHERE sala_id = ?', [id]);
    if (dispositivos[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `No se puede eliminar: tiene ${dispositivos[0].count} dispositivo(s) asignado(s)` 
      });
    }
    
    await db.query('DELETE FROM salas WHERE id = ?', [id]);
    res.json({ success: true, mensaje: 'Sala eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al eliminar sala' });
  }
});

module.exports = router;
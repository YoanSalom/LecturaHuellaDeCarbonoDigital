const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

let getTipoImages;
try {
  getTipoImages = require('./tipos-imagen').getTipoImages;
} catch (e) {
  console.warn('[dispositivos] tipos-imagen no disponible:', e.message);
  getTipoImages = () => ({});
}

function aplicarImagenEfectiva(dispositivos, tipoImages) {
  return dispositivos.map(d => ({
    ...d,
    // imagen_url: imagen personalizada del dispositivo (puede ser null)
    // imagen_efectiva: imagen a mostrar (individual > tipo > null)
    imagen_efectiva: d.imagen_url || tipoImages[d.tipo] || null
  }));
}

// ✅ Obtener todos los dispositivos (con info de sala)
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT
        d.*,
        s.nombre as sala_nombre,
        s.edificio
      FROM dispositivos d
      LEFT JOIN salas s ON d.sala_id = s.id
      ORDER BY d.nombre_modelo ASC
    `);
    const tipoImages = getTipoImages();
    const data = aplicarImagenEfectiva(results, tipoImages);
    res.json({ success: true, total: data.length, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Obtener un dispositivo específico
router.get('/:id', async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT
        d.*,
        s.nombre as sala_nombre
      FROM dispositivos d
      LEFT JOIN salas s ON d.sala_id = s.id
      WHERE d.id = ?
    `, [req.params.id]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
    }
    const tipoImages = getTipoImages();
    const [data] = aplicarImagenEfectiva(results, tipoImages);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Crear dispositivo
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
const { id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util, usa_internet } = req.body;
  try {
    // Verificar que no exista
    const [existing] = await db.query('SELECT id FROM dispositivos WHERE id = ?', [id]);
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'El ID ya existe' });
    }
    
    await db.query(
      `INSERT INTO dispositivos 
       (id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util, imagen_url, usa_internet) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util, usa_internet]
    );
    
    res.json({ success: true, mensaje: 'Dispositivo creado correctamente', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Actualizar dispositivo
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util,  usa_internet} = req.body;
  
  try {
    await db.query(
      `UPDATE dispositivos 
       SET nombre_modelo = ?, descripcion = ?, tipo = ?, años_uso = ?, 
           sala_id = ?, watts_encendido = ?, watts_apagado = ?, horas_vida_util = ?, usa_internet = ?
       WHERE id = ?`,
      [nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util, usa_internet, id]
    );
    
    res.json({ success: true, mensaje: 'Dispositivo actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Duplicar dispositivo (crea N copias con variación de watts)
router.post('/duplicar', authMiddleware, requireAdmin, async (req, res) => {
  const { dispositivo_id, cantidad = 1, variacion_watts = 0, sala_id } = req.body;

  if (!dispositivo_id) {
    return res.status(400).json({ success: false, error: 'Se requiere dispositivo_id' });
  }
  if (cantidad < 1 || cantidad > 50) {
    return res.status(400).json({ success: false, error: 'La cantidad debe estar entre 1 y 50' });
  }

  try {
    // Obtener el dispositivo fuente
    const [fuente] = await db.query('SELECT * FROM dispositivos WHERE id = ?', [dispositivo_id]);
    if (fuente.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispositivo fuente no encontrado' });
    }
    const base = fuente[0];

    // Calcular siguiente ID disponible
    const [todos] = await db.query('SELECT id FROM dispositivos WHERE id REGEXP "^D-[0-9]+"');
    const nums = todos.map(d => {
      const m = d.id.match(/D-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });
    let siguiente = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    const variacion = parseFloat(variacion_watts) / 100;
    const salaDestino = sala_id || base.sala_id;
    const creados = [];

    for (let i = 0; i < cantidad; i++) {
      const nuevoId = `D-${siguiente.toString().padStart(4, '0')}`;
      siguiente++;

      // Aplicar variación aleatoria dentro del rango ±variacion_watts%
      const factorOn = 1 + (Math.random() * 2 - 1) * variacion;
      const factorOff = 1 + (Math.random() * 2 - 1) * variacion;
      const wattsOn = Math.max(0.01, parseFloat((base.watts_encendido * factorOn).toFixed(2)));
      const wattsOff = Math.max(0, parseFloat((base.watts_apagado * factorOff).toFixed(2)));

      await db.query(
        `INSERT INTO dispositivos
         (id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util, imagen_url, usa_internet)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        [nuevoId, base.nombre_modelo, base.descripcion, base.tipo, base.años_uso,
          salaDestino, wattsOn, wattsOff, base.horas_vida_util, base.usa_internet]
      );
      creados.push({ id: nuevoId, watts_encendido: wattsOn, watts_apagado: wattsOff });
    }

    res.json({
      success: true,
      mensaje: `${cantidad} dispositivo(s) creado(s) correctamente`,
      creados
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Eliminar dispositivo
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si tiene horarios asignados
    const [horarios] = await db.query('SELECT COUNT(*) as count FROM horarios_dispositivos WHERE dispositivo_id = ?', [id]);
    if (horarios[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `No se puede eliminar: tiene ${horarios[0].count} horario(s) asignado(s). Elimina primero los horarios.` 
      });
    }
    
    await db.query('DELETE FROM dispositivos WHERE id = ?', [id]);
    res.json({ success: true, mensaje: 'Dispositivo eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

//  Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, nombre, puntaje, perfil, rol, ruta
      FROM usuarios
      ORDER BY nombre ASC
    `);
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
  }
});

//  Obtener un usuario específico
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al obtener usuario' });
  }
});

// Crear nuevo usuario
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id, nombre, puntaje, perfil, rol, ruta } = req.body;

    // Validar que no exista
    const [existing] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'El ID ya existe' });
    }

    await db.query(
      'INSERT INTO usuarios (id, nombre, puntaje, perfil, rol, ruta) VALUES (?, ?, ?, ?, ?, ?)',
      [id, nombre, puntaje ?? null, perfil ?? null, rol, ruta ?? null]
    );
    
    res.json({ success: true, mensaje: 'Usuario creado correctamente', id });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
});

//  Actualizar usuario
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, puntaje, perfil, rol, ruta } = req.body;

    await db.query(
      'UPDATE usuarios SET nombre = ?, puntaje = ?, perfil = ?, rol = ?, ruta = ? WHERE id = ?',
      [nombre, puntaje ?? null, perfil ?? null, rol, ruta ?? null, id]
    );
    
    res.json({ success: true, mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
});

//  Eliminar usuario
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si tiene salas asignadas
    const [salas] = await db.query('SELECT COUNT(*) as count FROM salas WHERE encargado_id = ?', [id]);
    if (salas[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `No se puede eliminar: tiene ${salas[0].count} sala(s) asignada(s)` 
      });
    }
    
    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ success: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// ✅ Regenerar lecturas de un año específico
router.post('/regenerar/:anio', authMiddleware, requireAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { anio } = req.params;
    
    // Validar año
    const anioNum = parseInt(anio);
    if (isNaN(anioNum) || anioNum < 2020 || anioNum > 2030) {
      return res.status(400).json({ 
        success: false, 
        error: 'Año inválido. Debe estar entre 2020 y 2030' 
      });
    }
    
    console.log(`🔄 Regenerando lecturas para el año ${anioNum}...`);
    
    // Llamar al stored procedure
    const [resultado] = await connection.query(
      'CALL sp_generar_lecturas_periodo(?)',
      [anioNum]
    );
    
    // El resultado está en resultado[0] (primera fila del SELECT final)
    const info = resultado[0][0];
    
    console.log(`✅ Lecturas regeneradas:`, info);
    
    res.json({
      success: true,
      mensaje: `Lecturas regeneradas exitosamente para ${anioNum}`,
      datos: info
    });
    
  } catch (error) {
    console.error('❌ Error al regenerar lecturas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al regenerar lecturas',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// ✅ Regenerar TODAS las lecturas (2024 + 2025)
router.post('/regenerar-todo', authMiddleware, requireAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    console.log('🔄 Regenerando TODAS las lecturas (2024 + 2025)...');
    
    const [resultado] = await connection.query('CALL sp_regenerar_todas_lecturas()');
    
    const info = resultado[0][0];
    
    console.log('✅ Regeneración completa:', info);
    
    res.json({
      success: true,
      mensaje: 'Todas las lecturas regeneradas exitosamente',
      datos: info
    });
    
  } catch (error) {
    console.error('❌ Error al regenerar todas las lecturas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al regenerar todas las lecturas',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// ✅ Obtener estadísticas de lecturas
router.get('/estadisticas', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_lecturas,
        COUNT(DISTINCT dispositivo_id) as dispositivos_con_lecturas,
        MIN(fecha) as primera_lectura,
        MAX(fecha) as ultima_lectura,
        SUM(consumo_kwh) as consumo_total_kwh,
        SUM(emisiones_kgco2) as emisiones_totales_kg
      FROM lecturas
    `);
    
    const [porAnio] = await db.query(`
      SELECT 
        YEAR(fecha) as año,
        COUNT(*) as lecturas,
        ROUND(SUM(consumo_kwh), 2) as consumo_kwh,
        ROUND(SUM(emisiones_kgco2), 2) as emisiones_kg
      FROM lecturas
      GROUP BY YEAR(fecha)
      ORDER BY año
    `);
    
    res.json({
      success: true,
      resumen: stats[0],
      por_anio: porAnio
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estadísticas' 
    });
  }
});

// ✅ Limpiar lecturas de un año
router.delete('/limpiar/:anio', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { anio } = req.params;
    const anioNum = parseInt(anio);
    
    if (isNaN(anioNum)) {
      return res.status(400).json({ success: false, error: 'Año inválido' });
    }
    
    const [result] = await db.query(
      'DELETE FROM lecturas WHERE YEAR(fecha) = ?',
      [anioNum]
    );
    
    res.json({
      success: true,
      mensaje: `Lecturas del año ${anioNum} eliminadas`,
      registros_eliminados: result.affectedRows
    });
    
  } catch (error) {
    console.error('Error al limpiar lecturas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al limpiar lecturas' 
    });
  }
});

module.exports = router;
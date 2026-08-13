const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ 1. Resumen anual de huella digital
router.get('/huella-digital/:ano', async (req, res) => {
  try {
    const { ano } = req.params;
    
    const [resultado] = await db.query(`
      SELECT 
        'Consumo Electrico Directo' as fuente,
        ROUND(SUM(consumo_kwh), 2) as consumo_kwh,
        ROUND(SUM(emisiones_consumo_kg), 2) as emisiones_kg,
        ROUND((SUM(consumo_kwh) / NULLIF((SUM(consumo_kwh) + SUM(consumo_trafico_kwh)), 0)) * 100, 2) as porcentaje
      FROM estadisticas
      WHERE ano = ?
      
      UNION ALL
      
      SELECT 
        'Huella Digital (Trafico)',
        ROUND(SUM(consumo_trafico_kwh), 2),
        ROUND(SUM(emisiones_trafico_kg), 2),
        ROUND((SUM(consumo_trafico_kwh) / NULLIF((SUM(consumo_kwh) + SUM(consumo_trafico_kwh)), 0)) * 100, 2)
      FROM estadisticas
      WHERE ano = ?
      
      UNION ALL
      
      SELECT 
        'TOTAL COMBINADO',
        ROUND(SUM(consumo_total_kwh), 2),
        ROUND(SUM(emisiones_totales_kg), 2),
        100.00
      FROM estadisticas
      WHERE ano = ?
    `, [ano, ano, ano]);
    
    res.json({
      success: true,
      año: parseInt(ano),
      data: resultado
    });
    
  } catch (error) {
    console.error('Error en /huella-digital:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener huella digital',
      error: error.message
    });
  }
});

// ✅ 2. Detalle mensual de huella digital
router.get('/huella-digital/:ano/:mes', async (req, res) => {
  try {
    const { ano, mes } = req.params;
    
    const [resultado] = await db.query(`
      SELECT 
        s.nombre as sala,
        e.dispositivos_activos,
        e.dispositivos_conectados,
        ROUND(e.consumo_kwh, 2) as consumo_electrico_kwh,
        ROUND(e.trafico_total_gb, 2) as trafico_gb,
        ROUND(e.consumo_trafico_kwh, 4) as consumo_digital_kwh,
        ROUND(e.consumo_total_kwh, 2) as consumo_total_kwh,
        ROUND(e.emisiones_consumo_kg, 2) as emisiones_electricas_kg,
        ROUND(e.emisiones_trafico_kg, 4) as emisiones_digitales_kg,
        ROUND(e.emisiones_totales_kg, 2) as emisiones_totales_kg
      FROM estadisticas e
      JOIN salas s ON e.sala_id = s.id
      WHERE e.ano = ? AND e.mes = ?
      ORDER BY e.trafico_total_gb DESC
    `, [ano, mes]);
    
    res.json({
      success: true,
      año: parseInt(ano),
      mes: parseInt(mes),
      total_salas: resultado.length,
      data: resultado
    });
    
  } catch (error) {
    console.error('Error en /huella-digital/:ano/:mes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle mensual',
      error: error.message
    });
  }
});

// ✅ 3. Comparación por períodos académicos
router.get('/comparacion-periodos/:ano', async (req, res) => {
  try {
    const { ano } = req.params;
    
    const [resultado] = await db.query(`
      SELECT 
        CASE 
          WHEN mes IN (1, 2) THEN 'Vacaciones Verano'
          WHEN mes IN (3, 4, 5, 6) THEN 'Primer Semestre'
          WHEN mes = 7 THEN 'Vacaciones Invierno'
          WHEN mes IN (8, 9, 10, 11) THEN 'Segundo Semestre'
          WHEN mes = 12 THEN 'Examenes + Vacaciones'
        END as periodo,
        COUNT(DISTINCT mes) as meses,
        ROUND(SUM(consumo_kwh), 2) as consumo_electrico_kwh,
        ROUND(SUM(trafico_total_gb), 2) as trafico_total_gb,
        ROUND(SUM(consumo_trafico_kwh), 4) as consumo_digital_kwh,
        ROUND(SUM(consumo_total_kwh), 2) as consumo_total_kwh,
        ROUND(SUM(emisiones_consumo_kg), 2) as emisiones_electricas_kg,
        ROUND(SUM(emisiones_trafico_kg), 4) as emisiones_digitales_kg,
        ROUND(SUM(emisiones_totales_kg), 2) as emisiones_totales_kg
      FROM estadisticas
      WHERE ano = ?
      GROUP BY 
        CASE 
          WHEN mes IN (1, 2) THEN 'Vacaciones Verano'
          WHEN mes IN (3, 4, 5, 6) THEN 'Primer Semestre'
          WHEN mes = 7 THEN 'Vacaciones Invierno'
          WHEN mes IN (8, 9, 10, 11) THEN 'Segundo Semestre'
          WHEN mes = 12 THEN 'Examenes + Vacaciones'
        END
      ORDER BY 
        MIN(mes)
    `, [ano]);
    
    res.json({
      success: true,
      año: parseInt(ano),
      data: resultado
    });
    
  } catch (error) {
    console.error('Error en /comparacion-periodos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al comparar períodos',
      error: error.message
    });
  }
});

// ✅ 4. Top salas por tráfico
router.get('/top-salas-trafico/:ano/:mes', async (req, res) => {
  try {
    const { ano, mes } = req.params;
    const limit = req.query.limit || 10;
    
    const [resultado] = await db.query(`
      SELECT 
        s.nombre as sala,
        s.edificio,
        e.dispositivos_activos,
        e.dispositivos_conectados,
        ROUND(e.trafico_total_gb, 2) as trafico_gb,
        ROUND(e.consumo_trafico_kwh, 4) as consumo_digital_kwh,
        ROUND(e.emisiones_trafico_kg, 4) as emisiones_digitales_kg,
        ROUND((e.trafico_total_gb / NULLIF((SELECT SUM(trafico_total_gb) FROM estadisticas WHERE ano = ? AND mes = ?), 0)) * 100, 2) as porcentaje_trafico
      FROM estadisticas e
      JOIN salas s ON e.sala_id = s.id
      WHERE e.ano = ? AND e.mes = ?
      ORDER BY e.trafico_total_gb DESC
      LIMIT ?
    `, [ano, mes, ano, mes, parseInt(limit)]);
    
    res.json({
      success: true,
      año: parseInt(ano),
      mes: parseInt(mes),
      limit: parseInt(limit),
      data: resultado
    });
    
  } catch (error) {
    console.error('Error en /top-salas-trafico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ranking de salas',
      error: error.message
    });
  }
});

// ✅ 5. Resumen completo (todos los meses del año)
router.get('/resumen-completo/:ano', async (req, res) => {
  try {
    const { ano } = req.params;
    
    const [resultado] = await db.query(`
      SELECT 
        ano,
        mes,
        ROUND(SUM(consumo_kwh), 2) as consumo_electrico_kwh,
        ROUND(SUM(trafico_total_gb), 2) as trafico_gb,
        ROUND(SUM(consumo_trafico_kwh), 4) as consumo_digital_kwh,
        ROUND(SUM(consumo_total_kwh), 2) as consumo_total_kwh,
        ROUND(SUM(emisiones_consumo_kg), 2) as emisiones_electricas_kg,
        ROUND(SUM(emisiones_trafico_kg), 4) as emisiones_digitales_kg,
        ROUND(SUM(emisiones_totales_kg), 2) as emisiones_totales_kg,
        SUM(dispositivos_activos) as total_dispositivos,
        SUM(dispositivos_conectados) as total_conectados
      FROM estadisticas
      WHERE ano = ?
      GROUP BY ano, mes
      ORDER BY mes
    `, [ano]);
    
    // Calcular totales anuales
    const totales = resultado.reduce((acc, mes) => ({
      consumo_electrico_kwh: acc.consumo_electrico_kwh + parseFloat(mes.consumo_electrico_kwh),
      trafico_gb: acc.trafico_gb + parseFloat(mes.trafico_gb),
      consumo_digital_kwh: acc.consumo_digital_kwh + parseFloat(mes.consumo_digital_kwh),
      consumo_total_kwh: acc.consumo_total_kwh + parseFloat(mes.consumo_total_kwh),
      emisiones_electricas_kg: acc.emisiones_electricas_kg + parseFloat(mes.emisiones_electricas_kg),
      emisiones_digitales_kg: acc.emisiones_digitales_kg + parseFloat(mes.emisiones_digitales_kg),
      emisiones_totales_kg: acc.emisiones_totales_kg + parseFloat(mes.emisiones_totales_kg)
    }), {
      consumo_electrico_kwh: 0,
      trafico_gb: 0,
      consumo_digital_kwh: 0,
      consumo_total_kwh: 0,
      emisiones_electricas_kg: 0,
      emisiones_digitales_kg: 0,
      emisiones_totales_kg: 0
    });
    
    // Redondear totales
    Object.keys(totales).forEach(key => {
      totales[key] = Math.round(totales[key] * 100) / 100;
    });
    
    res.json({
      success: true,
      año: parseInt(ano),
      meses: resultado,
      totales_anuales: totales,
      porcentaje_digital: Math.round((totales.consumo_digital_kwh / totales.consumo_total_kwh) * 10000) / 100
    });
    
  } catch (error) {
    console.error('Error en /resumen-completo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen completo',
      error: error.message
    });
  }
});

// ✅ 6. Comparar años (2024 vs 2025)
router.get('/comparar-anos', async (req, res) => {
  try {
    const anos = req.query.anos ? req.query.anos.split(',').map(a => parseInt(a)) : [2024, 2025];
    
    const resultados = {};
    
    for (const ano of anos) {
      const [data] = await db.query(`
        SELECT 
          ? as ano,
          ROUND(SUM(consumo_kwh), 2) as consumo_electrico_kwh,
          ROUND(SUM(trafico_total_gb), 2) as trafico_gb,
          ROUND(SUM(consumo_trafico_kwh), 2) as consumo_digital_kwh,
          ROUND(SUM(consumo_total_kwh), 2) as consumo_total_kwh,
          ROUND(SUM(emisiones_consumo_kg), 2) as emisiones_electricas_kg,
          ROUND(SUM(emisiones_trafico_kg), 2) as emisiones_digitales_kg,
          ROUND(SUM(emisiones_totales_kg), 2) as emisiones_totales_kg
        FROM estadisticas
        WHERE ano = ?
      `, [ano, ano]);
      
      resultados[ano] = data[0] || null;
    }
    
    res.json({
      success: true,
      años_comparados: anos,
      data: resultados
    });
    
  } catch (error) {
    console.error('Error en /comparar-anos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al comparar años',
      error: error.message
    });
  }
});

// ✅ 7. Dispositivos por tipo de tráfico
router.get('/dispositivos-trafico/:ano', async (req, res) => {
  try {
    const { ano } = req.params;
    
    const [resultado] = await db.query(`
      SELECT 
        d.tipo,
        COUNT(DISTINCT d.id) as cantidad_dispositivos,
        COUNT(l.id) as total_lecturas,
        ROUND(SUM(IFNULL(l.trafico_mb, 0)) / 1024, 2) as trafico_total_gb,
        ROUND(SUM(IFNULL(l.consumo_trafico_kwh, 0)), 4) as consumo_digital_kwh,
        ROUND(SUM(IFNULL(l.emisiones_trafico_kg, 0)), 4) as emisiones_digitales_kg,
        ROUND(AVG(IFNULL(l.trafico_mb, 0)), 2) as trafico_promedio_mb
      FROM dispositivos d
      LEFT JOIN lecturas l ON d.id = l.dispositivo_id AND YEAR(l.fecha) = ?
      GROUP BY d.tipo
      HAVING trafico_total_gb > 0
      ORDER BY trafico_total_gb DESC
    `, [ano]);
    
    res.json({
      success: true,
      año: parseInt(ano),
      data: resultado
    });
    
  } catch (error) {
    console.error('Error en /dispositivos-trafico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivos por tráfico',
      error: error.message
    });
  }
});

// ✅ 8. Perfil de usuario: sus salas + estadísticas mensuales del edificio
router.get('/usuario/:userId/:ano', async (req, res) => {
  try {
    const { userId, ano } = req.params;

    const [usuarios] = await db.query(
      'SELECT id, nombre, perfil, puntaje, ruta, rol FROM usuarios WHERE id = ?',
      [userId]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    const usuario = usuarios[0];

    const [salas] = await db.query(
      'SELECT id, nombre, numero, piso, edificio FROM salas WHERE encargado_id = ?',
      [userId]
    );

    const salasConStats = [];
    for (const sala of salas) {
      const [stats] = await db.query(`
        SELECT
          ROUND(SUM(consumo_kwh), 2)        AS consumo_kwh,
          ROUND(SUM(emisiones_totales_kg), 2) AS emisiones_kg,
          ROUND(SUM(trafico_total_gb), 2)    AS trafico_gb
        FROM estadisticas
        WHERE sala_id = ? AND ano = ?
      `, [sala.id, ano]);
      salasConStats.push({ ...sala, stats: stats[0] || {} });
    }

    const edificio = salas.length > 0 ? salas[0].edificio : null;

    let monthlyEdificio = [];
    if (edificio) {
      const [monthly] = await db.query(`
        SELECT
          e.mes,
          COUNT(DISTINCT e.sala_id)            AS salas_activas,
          ROUND(SUM(e.consumo_kwh), 2)         AS consumo_kwh,
          ROUND(SUM(e.emisiones_totales_kg), 2) AS emisiones_kg,
          ROUND(SUM(e.trafico_total_gb), 2)    AS trafico_gb
        FROM estadisticas e
        JOIN salas s ON e.sala_id = s.id
        WHERE s.edificio = ? AND e.ano = ?
        GROUP BY e.mes
        ORDER BY e.mes
      `, [edificio, ano]);
      monthlyEdificio = monthly;
    }

    const totalUsuario = salasConStats.reduce((acc, s) => ({
      consumo_kwh:  acc.consumo_kwh  + parseFloat(s.stats.consumo_kwh  || 0),
      emisiones_kg: acc.emisiones_kg + parseFloat(s.stats.emisiones_kg || 0),
      trafico_gb:   acc.trafico_gb   + parseFloat(s.stats.trafico_gb   || 0)
    }), { consumo_kwh: 0, emisiones_kg: 0, trafico_gb: 0 });

    res.json({
      success: true,
      año: parseInt(ano),
      usuario,
      salas: salasConStats,
      edificio,
      monthly_edificio: monthlyEdificio,
      total_usuario: {
        consumo_kwh:  Math.round(totalUsuario.consumo_kwh  * 100) / 100,
        emisiones_kg: Math.round(totalUsuario.emisiones_kg * 100) / 100,
        trafico_gb:   Math.round(totalUsuario.trafico_gb   * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error en /estadisticas/usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
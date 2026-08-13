const db = require('../db');

// ✅ DATOS REALES DEL MONITOREO PRTG (imagen del edificio)
const DATOS_TRAFICO_REAL = {
  // Datos de la semana monitoreada (03-10 nov 2025)
  trafico_semanal_mb: 2593.432, // MB totales en 8 días
  dias_monitoreados: 8,
  promedio_diario_mb: 324.179, // 2593.432 / 8
  promedio_hora_mbit: 36, // Promedio general
  pico_maximo_mbit: 189, // Pico máximo registrado
  
  // Factores de conversión
  // Estándar industria: 0.06 kWh por GB transferido
  // Incluye: servidores, routers, switches, data centers intermedios
  kwh_por_gb: 0.06,
  
  // Chile: promedio 350 gCO2/kWh
  gco2_por_kwh: 350
};

// ✅ DISTRIBUCIÓN DE TRÁFICO POR TIPO DE DISPOSITIVO
const PERFIL_TRAFICO = {
  // Dispositivos de red (canalizan todo el tráfico)
  'Router': { factor: 1.0, descripcion: 'Maneja todo el tráfico' },
  'Switch': { factor: 0.8, descripcion: 'Distribuye tráfico interno' },
  'Red': { factor: 0.8, descripcion: 'Equipos de red' },

  // Dispositivos que generan tráfico
  'Computadora': { factor: 0.15, descripcion: 'Alto uso (emails, cloud, navegación)' },
  'Portátil': { factor: 0.12, descripcion: 'Uso medio-alto' },
  'Servidor': { factor: 0.25, descripcion: 'Muy alto (servicios web, BD)' },
  'Tablet': { factor: 0.08, descripcion: 'Uso medio' },
  'Teléfono': { factor: 0.05, descripcion: 'Uso bajo (móvil preferido)' },

  // Dispositivos multimedia
  'Televisor': { factor: 0.10, descripcion: 'Streaming ocasional' },
  'Proyector': { factor: 0.03, descripcion: 'Presenta contenido, poco tráfico propio' },

  // Dispositivos que NO generan tráfico significativo
  'Monitor': { factor: 0.0, descripcion: 'Sin conexión de red' },
  'Impresora': { factor: 0.02, descripcion: 'Tráfico mínimo (trabajos de impresión)' },
  'Pizarra': { factor: 0.01, descripcion: 'Tráfico muy bajo' },
  'Iluminación': { factor: 0.0, descripcion: 'Sin conexión de red' },
  'Aire': { factor: 0.0, descripcion: 'Sin conexión de red' },
  'Ventilador': { factor: 0.0, descripcion: 'Sin conexión de red' },
  'Microondas': { factor: 0.0, descripcion: 'Sin conexión de red' },
  'Cafetera': { factor: 0.0, descripcion: 'Sin conexión de red' },
  'Cámara': { factor: 0.06, descripcion: 'Streaming continuo (vigilancia)' },
  'Seguridad': { factor: 0.06, descripcion: 'Streaming continuo (vigilancia)' },
  'Audio': { factor: 0.02, descripcion: 'Streaming ocasional' },
  'UPS': { factor: 0.0, descripcion: 'Sin conexión de red' }
};

// ✅ CALENDARIO ACADÉMICO REAL UACH 2024-2025
const calendarioAcademico = {
  2024: {
    inicio_s1: new Date('2024-03-11'),
    pausa_s1_inicio: new Date('2024-05-06'),
    pausa_s1_fin: new Date('2024-05-10'),
    fin_clases_s1: new Date('2024-07-05'),
    examenes_s1_inicio: new Date('2024-07-08'),
    examenes_s1_fin: new Date('2024-07-19'),
    vacaciones_inv_inicio: new Date('2024-07-22'),
    vacaciones_inv_fin: new Date('2024-08-02'),
    inicio_s2: new Date('2024-08-05'),
    pausa_s2_inicio: new Date('2024-10-07'),
    pausa_s2_fin: new Date('2024-10-11'),
    fin_clases_s2: new Date('2024-11-29'),
    examenes_s2_inicio: new Date('2024-12-02'),
    examenes_s2_fin: new Date('2024-12-13'),
    vacaciones_ver_inicio: new Date('2024-12-14'),
    vacaciones_ver_fin: new Date('2025-02-27')
  },
  2025: {
    inicio_s1: new Date('2025-03-10'),
    pausa_s1_inicio: new Date('2025-05-19'),
    pausa_s1_fin: new Date('2025-05-23'),
    fin_clases_s1: new Date('2025-07-04'),
    examenes_s1_inicio: new Date('2025-07-07'),
    examenes_s1_fin: new Date('2025-07-18'),
    vacaciones_inv_inicio: new Date('2025-07-21'),
    vacaciones_inv_fin: new Date('2025-08-01'),
    inicio_s2: new Date('2025-08-04'),
    pausa_s2_inicio: new Date('2025-10-13'),
    pausa_s2_fin: new Date('2025-10-17'),
    fin_clases_s2: new Date('2025-11-28'),
    examenes_s2_inicio: new Date('2025-12-01'),
    examenes_s2_fin: new Date('2025-12-12')
  }
};

// ✅ Función para determinar el tipo de período
function getTipoPeriodo(fecha, año) {
  const cal = calendarioAcademico[año];
  if (!cal) return { tipo: 'mantención', factor: 0.15 };
  
  const f = new Date(fecha);
  
  if ((f >= cal.vacaciones_ver_inicio && año === 2024) ||
      (f <= new Date(`${año}-02-27`) && año === 2025)) {
    return { tipo: 'vacaciones_verano', factor: 0.05 };
  }
  
  if (f >= cal.vacaciones_inv_inicio && f <= cal.vacaciones_inv_fin) {
    return { tipo: 'vacaciones_invierno', factor: 0.10 };
  }
  
  if (f >= cal.pausa_s1_inicio && f <= cal.pausa_s1_fin) {
    return { tipo: 'pausa', factor: 0.30 };
  }
  
  if (f >= cal.pausa_s2_inicio && f <= cal.pausa_s2_fin) {
    return { tipo: 'pausa', factor: 0.30 };
  }
  
  if (f >= cal.examenes_s1_inicio && f <= cal.examenes_s1_fin) {
    return { tipo: 'examenes', factor: 1.25 };
  }
  
  if (f >= cal.examenes_s2_inicio && f <= cal.examenes_s2_fin) {
    return { tipo: 'examenes', factor: 1.25 };
  }
  
  if (f >= cal.inicio_s1 && f <= cal.fin_clases_s1) {
    return { tipo: 'clases_normales', factor: 1.0 };
  }
  
  if (f >= cal.inicio_s2 && f <= cal.fin_clases_s2) {
    return { tipo: 'clases_normales', factor: 1.0 };
  }
  
  return { tipo: 'mantención', factor: 0.15 };
}

// ✅ Perfiles de uso según tipo de dispositivo y nombre de sala
function determinarPerfil(dispositivo, sala) {
  const tipo = dispositivo.tipo.toLowerCase();
  const nombreSala = sala?.nombre?.toLowerCase() || '';
  const idSala = sala?.id || '';
  
  if (['router', 'switch', 'servidor', 'ups', 'cámara'].some(t => tipo.includes(t))) {
    return { perfil: '24/7', lun_vie: [0, 24], sabado: [0, 24], domingo: [0, 24] };
  }
  
  const esAula = nombreSala.includes('aula') || idSala.startsWith('AUL-');
  const esLab = nombreSala.includes('lab') || idSala.startsWith('LAB-');
  const esCasino = nombreSala.includes('casino') || nombreSala.includes('comedor') || idSala.startsWith('COM-');
  const esBiblioteca = nombreSala.includes('biblio') || idSala.startsWith('BIB-');
  const esServidor = nombreSala.includes('servidor') || idSala.startsWith('SRV-');
  
  if (['proyector', 'televisor', 'pizarra'].some(t => tipo.includes(t)) || esAula || esLab) {
    return { perfil: 'aula', lun_vie: [8, 22], sabado: [9, 18], domingo: 0 };
  }
  
  if (['microondas', 'cafetera', 'refrigerador'].some(t => tipo.includes(t)) || esCasino) {
    return { perfil: 'casino', lun_vie: [7, 18], sabado: [8, 14], domingo: 0 };
  }
  
  if (esBiblioteca) {
    return { perfil: 'biblioteca', lun_vie: [8, 23], sabado: [9, 20], domingo: [10, 18] };
  }
  
  if (esServidor) {
    return { perfil: 'servidores', lun_vie: [0, 24], sabado: [0, 24], domingo: [0, 24] };
  }
  
  if (['aire', 'calefacción', 'ventilador'].some(t => tipo.includes(t))) {
    return { perfil: 'clima', lun_vie: [8, 20], sabado: [9, 14], domingo: 0 };
  }
  
  if (tipo.includes('luz') || tipo.includes('iluminación') || tipo.includes('led')) {
    return { perfil: 'luz', lun_vie: [7, 22], sabado: [8, 18], domingo: 0 };
  }
  
  return { perfil: 'oficina', lun_vie: [8, 20], sabado: [9, 14], domingo: 0 };
}

// ✅ ACTUALIZADO: Función para calcular tráfico de red realista basada en usa_internet
function calcularTraficoDispositivo(dispositivo, periodo, diaSemana, horasTotales, estaEncendido, intensidad) {
  // ✅ VERIFICAR SI EL DISPOSITIVO USA INTERNET (desde BD)
  if (!dispositivo.usa_internet || 
      dispositivo.usa_internet === 0 || 
      !estaEncendido) {  // ← NUEVA VALIDACIÓN
    return {
      trafico_mb: null,
      consumo_trafico_kwh: null,
      emisiones_trafico_kg: null
    };
  }
  
  // ✅ FACTORES DE TRÁFICO POR TIPO (solo para dispositivos que SÍ usan internet)
  const FACTORES_TRAFICO = {
    'Router': 1.0,
    'Switch': 0.8,
    'Red': 0.8,
    'Servidor': 0.25,
    'Computadora': 0.15,
    'Portátil': 0.12,
    'Televisor': 0.10,
    'Tablet': 0.08,
    'Cámara': 0.06,
    'Seguridad': 0.06,
    'Teléfono': 0.05,
    'Proyector': 0.03,
    'Impresora': 0.02,
    'Audio': 0.02,
    'Pizarra': 0.01
  };
  
  const tipo = dispositivo.tipo;
  const perfilFactor = FACTORES_TRAFICO[tipo] || 0.10; // Default 10% si no está en la lista
  
  // Base de tráfico diario del edificio
  let traficoBase = DATOS_TRAFICO_REAL.promedio_diario_mb;
  
  // Ajustar por período académico
  const factorPeriodo = periodo.factor;
  
  // Ajustar por día de la semana
  let factorDia = 1.0;
  if (diaSemana === 0) { // Domingo
    factorDia = 0.1;
  } else if (diaSemana === 6) { // Sábado
    factorDia = 0.3;
  }
  
  // Ajustar por horas de operación
  const factorHoras = horasTotales / 12; // Normalizar a 12 horas
  
  // Calcular tráfico del dispositivo
  const traficoDispositivo = 
    traficoBase * 
    perfilFactor * 
    factorPeriodo * 
    factorDia * 
    factorHoras * 
    (0.8 + Math.random() * 0.4); // Variación ±20%
  
  const trafico_mb = Math.max(0, traficoDispositivo);
  const trafico_gb = trafico_mb / 1024;
  
  // Calcular consumo energético del tráfico
  // Factor estándar: 0.06 kWh por GB
  const consumo_trafico_kwh = trafico_gb * DATOS_TRAFICO_REAL.kwh_por_gb;
  
  // Calcular emisiones del tráfico usando la intensidad de carbono real del día
  const emisiones_trafico_kg = consumo_trafico_kwh * (intensidad / 1000);
  
  return {
    trafico_mb: Math.round(trafico_mb * 100) / 100,
    consumo_trafico_kwh: Math.round(consumo_trafico_kwh * 1000000) / 1000000,
    emisiones_trafico_kg: Math.round(emisiones_trafico_kg * 1000000) / 1000000
  };
}

// ✅ Función principal de generación
async function generarLecturasRealistas(año, opciones = {}) {
  const connection = await db.getConnection();
  
  try {
    console.log(`\n🎓 GENERANDO LECTURAS PARA AÑO ACADÉMICO ${año}`);
    console.log('═'.repeat(60));
    
    const [dispositivos] = await connection.query(`
      SELECT 
        d.id,
        d.nombre_modelo,
        d.tipo,
        d.watts_encendido,
        d.watts_apagado,
        d.sala_id,
        d.usa_internet,
        s.nombre as sala_nombre,
        s.edificio
      FROM dispositivos d
      LEFT JOIN salas s ON d.sala_id = s.id
      ORDER BY d.id
    `);
    
    if (dispositivos.length === 0) {
      console.log('⚠️  No hay dispositivos en la base de datos');
      console.log('💡 Ejecuta primero: npm run seed');
      return;
    }
    
    console.log(`📱 ${dispositivos.length} dispositivos encontrados en la BD\n`);

    await connection.beginTransaction();

    // Pre-fetch carbon intensity for the whole year — avoids one SELECT per device per day
    const [carbonRows] = await connection.query(
      `SELECT DATE(datetime_utc) as fecha, AVG(carbon_intensity_direct) as intensidad
       FROM carbon_intensity
       WHERE YEAR(datetime_utc) = ? AND zone_id = 'CL-SEN'
       GROUP BY DATE(datetime_utc)`,
      [año]
    );
    const carbonMap = new Map();
    carbonRows.forEach(row => {
      const key = typeof row.fecha === 'string' ? row.fecha : row.fecha.toISOString().split('T')[0];
      carbonMap.set(key, parseFloat(row.intensidad) || 350);
    });
    
    const inicioAño = new Date(`${año}-01-01`);
    const finAño = new Date(`${año}-12-31`);
    
    let lecturasGeneradas = 0;
    let estadoPorDispositivo = {};
    
    for (const dispositivo of dispositivos) {
      console.log(`📍 ${dispositivo.id} - ${dispositivo.nombre_modelo} (${dispositivo.tipo})`);
      console.log(`   Sala: ${dispositivo.sala_nombre || 'Sin asignar'}`);
      
      const perfil = determinarPerfil(dispositivo, {
        id: dispositivo.sala_id,
        nombre: dispositivo.sala_nombre
      });
      
      console.log(`   Perfil: ${perfil.perfil}`);
      
      let fechaActual = new Date(inicioAño);
      let lecturasDispositivo = 0;
      const batchRows = [];

      while (fechaActual <= finAño) {
        const periodo = getTipoPeriodo(fechaActual, año);
        const diaSemana = fechaActual.getDay();
        
        let horasOperacion;
        
        if (diaSemana === 0) {
          horasOperacion = perfil.domingo || 0;
        } else if (diaSemana === 6) {
          horasOperacion = perfil.sabado || perfil.lun_vie;
        } else {
          horasOperacion = perfil.lun_vie;
        }
        
        if (horasOperacion !== 0) {
          const [horaInicio, horaFin] = Array.isArray(horasOperacion) 
            ? horasOperacion 
            : [horasOperacion, horasOperacion];
          
          const horasTotales = horaFin - horaInicio;
          
          if (horasTotales > 0) {
            const factorUso = periodo.factor;
            const variacion = 0.85 + (Math.random() * 0.3);
            const probabilidadEncendido = factorUso * variacion;
            
            const estaEncendido = Math.random() < probabilidadEncendido;
            const consumo_w = estaEncendido ? dispositivo.watts_encendido : dispositivo.watts_apagado;
            const consumo_kwh = (consumo_w * horasTotales) / 1000;

            const fechaStr = fechaActual.toISOString().split('T')[0];
            const intensidad = carbonMap.get(fechaStr) || 350;

            // ✅ NUEVO: Calcular tráfico de red (usa la intensidad real del día)
            const traficoData = calcularTraficoDispositivo(
              dispositivo,
              periodo,
              diaSemana,
              horasTotales,
              estaEncendido,
              intensidad
            );

            const emisiones_kgco2 = (consumo_kwh * intensidad) / 1000;
            
            batchRows.push([
              dispositivo.id,
              fechaStr,
              `${horaInicio.toString().padStart(2, '0')}:00:00`,
              `${horaFin.toString().padStart(2, '0')}:00:00`,
              estaEncendido ? 'Encendido' : 'Apagado',
              consumo_w,
              horasTotales,
              consumo_kwh,
              intensidad,
              emisiones_kgco2,
              traficoData.trafico_mb,
              traficoData.consumo_trafico_kwh,
              traficoData.emisiones_trafico_kg
            ]);
          }
        }
        
        fechaActual.setDate(fechaActual.getDate() + 1);
      }

      // Batch insert all readings for this device in one query
      if (batchRows.length > 0) {
        await connection.query(
          `INSERT INTO lecturas
           (dispositivo_id, fecha, hora_inicio, hora_fin, estado,
            consumo_w, horas, consumo_kwh, intensidad_co2, emisiones_kgco2,
            trafico_mb, consumo_trafico_kwh, emisiones_trafico_kg)
           VALUES ?`,
          [batchRows]
        );
        lecturasDispositivo = batchRows.length;
        lecturasGeneradas += batchRows.length;
      }

      estadoPorDispositivo[dispositivo.id] = lecturasDispositivo;
      console.log(`   ✅ ${lecturasDispositivo} lecturas generadas\n`);
    }
    
    await connection.commit();
    
    console.log('\n' + '═'.repeat(60));
    console.log(`✅ RESUMEN FINAL`);
    console.log('═'.repeat(60));
    console.log(`Total lecturas generadas: ${lecturasGeneradas.toLocaleString()}`);
    console.log(`Dispositivos procesados: ${dispositivos.length}`);
    console.log(`Año: ${año}`);
    console.log(`Promedio por dispositivo: ${Math.round(lecturasGeneradas / dispositivos.length)}`);
    
    if (!opciones.skipEstadisticas) {
      await generarEstadisticas(connection, año);
    }
    
    return {
      lecturasGeneradas,
      dispositivosProcesados: dispositivos.length,
      año,
      estadoPorDispositivo
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('\n❌ ERROR:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// ✅ ACTUALIZADO: Generar estadísticas con huella digital
async function generarEstadisticas(connection, año) {
  console.log('\n📊 Generando estadísticas agregadas...');
  
  try {
    await connection.query('DELETE FROM estadisticas WHERE `año` = ?', [año]);
    
    for (let mes = 1; mes <= 12; mes++) {
      const mesStr = mes.toString().padStart(2, '0');
      
      const [result] = await connection.query(`
        INSERT INTO estadisticas (
          id, sala_id, periodo,
          consumo_total_watts, consumo_kwh, emisiones_consumo_kg,
          trafico_total_mb, trafico_total_gb, consumo_trafico_kwh, emisiones_trafico_kg,
          consumo_total_kwh, emisiones_totales_kg,
          porcentaje_consumo_piso, porcentaje_emision_piso, porcentaje_edificio,
          horas_encendido, horas_apagado, porcentaje_uso, 
          dispositivos_activos, dispositivos_conectados,
          \`año\`, mes
        )
        SELECT 
          CONCAT('EST-', s.id, '-', ?, '-', ?) as id,
          s.id as sala_id,
          'mensual' as periodo,
          
          SUM(l.consumo_w) as consumo_total_watts,
          SUM(l.consumo_kwh) as consumo_kwh,
          SUM(l.emisiones_kgco2) as emisiones_consumo_kg,
          
          SUM(IFNULL(l.trafico_mb, 0)) as trafico_total_mb,
          SUM(IFNULL(l.trafico_mb, 0)) / 1024 as trafico_total_gb,
          SUM(IFNULL(l.consumo_trafico_kwh, 0)) as consumo_trafico_kwh,
          SUM(IFNULL(l.emisiones_trafico_kg, 0)) as emisiones_trafico_kg,
          
          SUM(l.consumo_kwh) + SUM(IFNULL(l.consumo_trafico_kwh, 0)) as consumo_total_kwh,
          SUM(l.emisiones_kgco2) + SUM(IFNULL(l.emisiones_trafico_kg, 0)) as emisiones_totales_kg,
          
          0 as porcentaje_consumo_piso,
          0 as porcentaje_emision_piso,
          0 as porcentaje_edificio,
          SUM(CASE WHEN l.estado = 'Encendido' THEN l.horas ELSE 0 END) as horas_encendido,
          SUM(CASE WHEN l.estado = 'Apagado' THEN l.horas ELSE 0 END) as horas_apagado,
          ROUND((SUM(CASE WHEN l.estado = 'Encendido' THEN l.horas ELSE 0 END) / NULLIF(SUM(l.horas), 0) * 100), 2) as porcentaje_uso,
          COUNT(DISTINCT d.id) as dispositivos_activos,
          SUM(CASE WHEN IFNULL(l.trafico_mb, 0) > 0 THEN 1 ELSE 0 END) as dispositivos_conectados,
          
          ? as año,
          ? as mes
          
        FROM salas s
        JOIN dispositivos d ON d.sala_id = s.id
        JOIN lecturas l ON l.dispositivo_id = d.id
        WHERE YEAR(l.fecha) = ? AND MONTH(l.fecha) = ?
        GROUP BY s.id
        
        ON DUPLICATE KEY UPDATE
          consumo_total_watts = VALUES(consumo_total_watts),
          consumo_kwh = VALUES(consumo_kwh),
          emisiones_consumo_kg = VALUES(emisiones_consumo_kg),
          trafico_total_mb = VALUES(trafico_total_mb),
          trafico_total_gb = VALUES(trafico_total_gb),
          consumo_trafico_kwh = VALUES(consumo_trafico_kwh),
          emisiones_trafico_kg = VALUES(emisiones_trafico_kg),
          consumo_total_kwh = VALUES(consumo_total_kwh),
          emisiones_totales_kg = VALUES(emisiones_totales_kg),
          horas_encendido = VALUES(horas_encendido),
          horas_apagado = VALUES(horas_apagado),
          porcentaje_uso = VALUES(porcentaje_uso),
          dispositivos_activos = VALUES(dispositivos_activos),
          dispositivos_conectados = VALUES(dispositivos_conectados)
      `, [año, mesStr, año, mes, año, mes]);
      
      console.log(`   ✅ Mes ${mesStr}: ${result.affectedRows} salas procesadas`);
    }
    
    console.log('✅ Estadísticas generadas correctamente\n');
    
  } catch (error) {
    console.error('❌ Error generando estadísticas:', error.message);
    throw error;
  }
}

// ✅ Función para limpiar lecturas de un año
async function limpiarLecturasAño(año) {
  const connection = await db.getConnection();
  
  try {
    console.log(`\n🗑️  Eliminando lecturas del año ${año}...`);
    
    const [result] = await connection.query(
      'DELETE FROM lecturas WHERE YEAR(fecha) = ?',
      [año]
    );
    
    console.log(`✅ ${result.affectedRows} lecturas eliminadas`);
    
    await connection.query('DELETE FROM estadisticas WHERE `año` = ?', [año]);
    console.log(`✅ Estadísticas eliminadas\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// ✅ Ejecutar desde línea de comandos
if (require.main === module) {
  const comando = process.argv[2];
  const año = parseInt(process.argv[3]) || 2024;
  
  if (comando === 'limpiar') {
    limpiarLecturasAño(año)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    generarLecturasRealistas(año)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = { 
  generarLecturasRealistas, 
  limpiarLecturasAño,
  generarEstadisticas 
};
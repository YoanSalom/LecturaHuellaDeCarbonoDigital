const db = require('../db');
const { createBackup } = require('./backup');

const seeds = {
  usuarios: [
    { id: 'PF-0001', nombre: 'Christian Lazo', puntaje: null, perfil: null, rol: 'Encargado', ruta: null },
    { id: 'PF-0002', nombre: 'Julio Guerra',   puntaje: null, perfil: null, rol: 'Encargado', ruta: null },
    { id: 'TI-0001', nombre: 'Sergio Gonzales', puntaje: null, perfil: null, rol: 'Técnico',   ruta: null },
    { id: 'PF-0003', nombre: 'María Silva',     puntaje: null, perfil: null, rol: 'Encargado', ruta: null },
    { id: 'TI-0002', nombre: 'Pedro Martínez',  puntaje: null, perfil: null, rol: 'Técnico',   ruta: null }
  ],
  
  salas: [
    { id: 'OF-0001', nombre: 'Oficina Principal', numero: '001', piso: 2, edificio: 'Edificio Administrativo', encargado_id: 'PF-0001' },
    { id: 'OF-0002', nombre: 'Oficina de Proyectos', numero: '002', piso: 2, edificio: 'Edificio Administrativo', encargado_id: 'PF-0002' },
    { id: 'OF-0003', nombre: 'Oficina de Recursos', numero: '003', piso: 2, edificio: 'Edificio Administrativo', encargado_id: 'PF-0003' },
    { id: 'AUL-0101', nombre: 'Aula Magna', numero: '101', piso: 1, edificio: 'Edificio Académico', encargado_id: 'PF-0001' },
    { id: 'AUL-0102', nombre: 'Aula 102', numero: '102', piso: 1, edificio: 'Edificio Académico', encargado_id: 'PF-0002' },
    { id: 'AUL-0201', nombre: 'Aula 201', numero: '201', piso: 2, edificio: 'Edificio Académico', encargado_id: 'PF-0001' },
    { id: 'LAB-0101', nombre: 'Laboratorio Física', numero: '101', piso: 1, edificio: 'Edificio Científico', encargado_id: 'TI-0001' },
    { id: 'LAB-0205', nombre: 'Laboratorio Química', numero: '205', piso: 2, edificio: 'Edificio Científico', encargado_id: 'TI-0001' },
    { id: 'SRV-0001', nombre: 'Sala de Servidores', numero: '201', piso: 1, edificio: 'Edificio Administrativo', encargado_id: 'TI-0001' },
    { id: 'COM-0001', nombre: 'Centro de Comunicaciones', numero: '202', piso: 1, edificio: 'Edificio Administrativo', encargado_id: 'TI-0002' },
    { id: 'BIB-0001', nombre: 'Biblioteca Central', numero: '301', piso: 3, edificio: 'Edificio Académico', encargado_id: 'PF-0003' },
    { id: 'ENT-0001', nombre: 'Entrada Principal', numero: '001', piso: 1, edificio: 'Edificio Administrativo', encargado_id: 'TI-0001' }
  ],
  
  dispositivos: [
    { id: 'D-0001', nombre_modelo: 'Monitor HP 24"', descripcion: 'Monitor LED 24 pulgadas', tipo: 'Monitor', años_uso: 3, sala_id: 'OF-0001', watts_encendido: 50, watts_apagado: 0.5, horas_vida_util: 30000 },
    { id: 'D-0002', nombre_modelo: 'Router Cisco', descripcion: 'Router empresarial', tipo: 'Router', años_uso: 2, sala_id: 'OF-0001', watts_encendido: 40, watts_apagado: 5, horas_vida_util: 50000 },
    { id: 'D-0003', nombre_modelo: 'Proyector Epson', descripcion: 'Proyector HD', tipo: 'Proyector', años_uso: 4, sala_id: 'AUL-0101', watts_encendido: 300, watts_apagado: 2, horas_vida_util: 50000 },
    { id: 'D-0004', nombre_modelo: 'Servidor HP ProLiant', descripcion: 'Servidor rack 2U', tipo: 'Servidor', años_uso: 4, sala_id: 'SRV-0001', watts_encendido: 500, watts_apagado: 100, horas_vida_util: 500000 },
    { id: 'D-0005', nombre_modelo: 'Impresora HP LaserJet', descripcion: 'Impresora láser', tipo: 'Impresora', años_uso: 1, sala_id: 'OF-0002', watts_encendido: 600, watts_apagado: 10, horas_vida_util: 150000 }
  ]
};

async function runSeeders(options = {}) {
  const { autoBackup = true } = options;
  const connection = await db.getConnection();
  
  try {
    console.log('🌱 Ejecutando seeders...\n');

    // Crear backup automático si está habilitado
    if (autoBackup) {
      console.log('💾 Creando backup automático antes de ejecutar seeders...');
      const backupPath = await createBackup();
      console.log(`✅ Backup guardado: ${backupPath}\n`);
    }
    
    // Deshabilitar foreign keys temporalmente
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Limpiar tablas (excepto carbon_intensity)
    console.log('🗑️  Limpiando tablas...');
    await connection.query('TRUNCATE TABLE lecturas');
    await connection.query('TRUNCATE TABLE horarios_dispositivos');
    await connection.query('TRUNCATE TABLE dispositivos');
    await connection.query('TRUNCATE TABLE salas');
    await connection.query('TRUNCATE TABLE usuarios');
    await connection.query('TRUNCATE TABLE estadisticas');
    await connection.query('TRUNCATE TABLE sugerencias');
    console.log('   ✅ Tablas limpiadas\n');
    
    // Insertar usuarios
    console.log('👥 Insertando usuarios...');
    for (const user of seeds.usuarios) {
      await connection.query(
        'INSERT INTO usuarios (id, nombre, puntaje, perfil, rol, ruta) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, user.nombre, user.puntaje, user.perfil, user.rol, user.ruta]
      );
    }
    console.log(`   ✅ ${seeds.usuarios.length} usuarios insertados`);
    
    // Insertar salas
    console.log('🏢 Insertando salas...');
    for (const sala of seeds.salas) {
      await connection.query(
        'INSERT INTO salas (id, nombre, numero, piso, edificio, encargado_id) VALUES (?, ?, ?, ?, ?, ?)',
        [sala.id, sala.nombre, sala.numero, sala.piso, sala.edificio, sala.encargado_id]
      );
    }
    console.log(`   ✅ ${seeds.salas.length} salas insertadas`);
    
    // Insertar dispositivos
    console.log('💻 Insertando dispositivos...');
    for (const disp of seeds.dispositivos) {
      await connection.query(
        'INSERT INTO dispositivos (id, nombre_modelo, descripcion, tipo, años_uso, sala_id, watts_encendido, watts_apagado, horas_vida_util, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)',
        [disp.id, disp.nombre_modelo, disp.descripcion, disp.tipo, disp.años_uso, disp.sala_id, disp.watts_encendido, disp.watts_apagado, disp.horas_vida_util]
      );
    }
    console.log(`   ✅ ${seeds.dispositivos.length} dispositivos insertados`);
    
    // Rehabilitar foreign keys
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('\n✅ Seeders ejecutados correctamente\n');
    
    // Mostrar resumen
    const [stats] = await connection.query(`
      SELECT 'Usuarios' as tabla, COUNT(*) as total FROM usuarios
      UNION ALL SELECT 'Salas', COUNT(*) FROM salas
      UNION ALL SELECT 'Dispositivos', COUNT(*) FROM dispositivos
      UNION ALL SELECT 'Horarios', COUNT(*) FROM horarios_dispositivos
      UNION ALL SELECT 'Lecturas', COUNT(*) FROM lecturas
    `);
    
    console.log('📊 ESTADO ACTUAL DE LA BASE DE DATOS:');
    console.table(stats);
    
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Ejecutar
if (require.main === module) {
  const args = process.argv.slice(2);
  const noBackup = args.includes('--no-backup');
  
  runSeeders({ autoBackup: !noBackup })
    .then(() => {
      console.log('\n💡 PRÓXIMOS PASOS:');
      console.log('1. Sube horarios: POST /api/uploads/csv/horarios');
      console.log('2. Genera lecturas: POST /api/lecturas-admin/regenerar-todo');
      console.log('3. Para restaurar tus datos: npm run restore\n');
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runSeeders };
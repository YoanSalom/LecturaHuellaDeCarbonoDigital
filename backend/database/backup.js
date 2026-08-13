const db = require('../db');
const fs = require('fs');
const path = require('path');

async function createBackup() {
  const connection = await db.getConnection();
  
  try {
    console.log('🔄 Iniciando backup de la base de datos...\n');

    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

    const backup = {};

    // Lista de tablas a respaldar (en orden de dependencias)
    const tablas = [
      'usuarios',
      'salas',
      'dispositivos',
      'horarios_dispositivos',
      'lecturas',
      'estadisticas',
      'sugerencias'
      // NO incluimos carbon_intensity porque es estática y viene del script SQL
    ];

    for (const tabla of tablas) {
      console.log(`📦 Respaldando tabla: ${tabla}...`);
      const [rows] = await connection.query(`SELECT * FROM ${tabla}`);
      backup[tabla] = rows;
      console.log(`   ✅ ${rows.length} registros guardados`);
    }

    // Guardar backup en archivo JSON
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

    console.log('\n✅ Backup completado exitosamente');
    console.log(`📁 Archivo: ${backupPath}`);
    console.log(`📊 Tamaño: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB\n`);

    // Mostrar resumen
    console.log('📋 RESUMEN DEL BACKUP:');
    console.log('┌─────────────────────────┬───────────┐');
    console.log('│ Tabla                   │ Registros │');
    console.log('├─────────────────────────┼───────────┤');
    tablas.forEach(tabla => {
      const count = backup[tabla].length;
      console.log(`│ ${tabla.padEnd(23)} │ ${count.toString().padStart(9)} │`);
    });
    console.log('└─────────────────────────┴───────────┘\n');

    return backupPath;
  } catch (error) {
    console.error('❌ Error al crear backup:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createBackup()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createBackup };
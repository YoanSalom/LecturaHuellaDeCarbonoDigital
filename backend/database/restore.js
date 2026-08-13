const db = require('../db');
const fs = require('fs');
const path = require('path');

// Mapeo de columnas renombradas: { tabla: { columnaVieja: columnaNueva } }
// El valor de las columnas mapeadas se fuerza a NULL (tipos incompatibles).
const COLUMN_MIGRATIONS = {
  usuarios: {
    email:    'puntaje',
    telefono: 'perfil',
    foto_url: 'ruta'
  }
};

async function restoreBackup(backupFile) {
  const connection = await db.getConnection();
  
  try {
    console.log('🔄 Iniciando restauración de backup...\n');

    // Verificar que el archivo existe
    if (!fs.existsSync(backupFile)) {
      throw new Error(`El archivo de backup no existe: ${backupFile}`);
    }

    // Leer el backup
    console.log(`📂 Leyendo backup: ${path.basename(backupFile)}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    // Deshabilitar checks de foreign keys
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Orden de restauración (respetando dependencias)
    const tablasOrdenadas = [
      'lecturas',
      'horarios_dispositivos',
      'dispositivos',
      'salas',
      'usuarios',
      'sugerencias',
      'estadisticas'
    ];

    console.log('\n🗑️  Limpiando tablas...');
    for (const tabla of tablasOrdenadas) {
      await connection.query(`TRUNCATE TABLE ${tabla}`);
      console.log(`   ✅ Tabla ${tabla} limpiada`);
    }

    console.log('\n📥 Restaurando datos...');
    // Invertir el orden para insertar
    const tablasParaInsertar = [...tablasOrdenadas].reverse();

    for (const tabla of tablasParaInsertar) {
      const data = backupData[tabla] || [];
      
      if (data.length === 0) {
        console.log(`   ⚠️  ${tabla}: Sin datos para restaurar`);
        continue;
      }

      console.log(`   📦 Restaurando ${tabla}...`);

      const migration = COLUMN_MIGRATIONS[tabla] || {};

      for (const row of data) {
        const columns = [];
        const values = [];

        for (const [col, val] of Object.entries(row)) {
          if (migration[col]) {
            // Columna renombrada: usa el nuevo nombre y fuerza NULL
            columns.push(migration[col]);
            values.push(null);
          } else {
            columns.push(col);
            values.push(val);
          }
        }

        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${tabla} (${columns.join(', ')}) VALUES (${placeholders})`;
        await connection.query(sql, values);
      }

      console.log(`   ✅ ${data.length} registros restaurados`);
    }

    // Rehabilitar checks de foreign keys
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ Restauración completada exitosamente\n');

    // Mostrar resumen
    console.log('📋 RESUMEN DE LA RESTAURACIÓN:');
    console.log('┌─────────────────────────┬───────────┐');
    console.log('│ Tabla                   │ Registros │');
    console.log('├─────────────────────────┼───────────┤');
    tablasParaInsertar.forEach(tabla => {
      const count = (backupData[tabla] || []).length;
      console.log(`│ ${tabla.padEnd(23)} │ ${count.toString().padStart(9)} │`);
    });
    console.log('└─────────────────────────┴───────────┘\n');

  } catch (error) {
    console.error('❌ Error al restaurar backup:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Listar backups disponibles
async function listBackups() {
  const backupDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('📁 No hay backups disponibles');
    return [];
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const filePath = path.join(backupDir, f);
      const stats = fs.statSync(filePath);
      return {
        nombre: f,
        path: filePath,
        fecha: stats.mtime,
        tamaño: `${(stats.size / 1024).toFixed(2)} KB`
      };
    })
    .sort((a, b) => b.fecha - a.fecha);

  return files;
}

// ✅ NUEVO: Restaurar por número
async function restoreByNumber(number) {
  const backups = await listBackups();
  
  if (backups.length === 0) {
    throw new Error('No hay backups disponibles');
  }

  const index = parseInt(number) - 1;
  
  if (index < 0 || index >= backups.length) {
    throw new Error(`Número inválido. Usa un número entre 1 y ${backups.length}`);
  }

  const backup = backups[index];
  console.log(`✅ Seleccionado: ${backup.nombre}\n`);
  
  return restoreBackup(backup.path);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'list' || !args[0]) {
    listBackups().then(backups => {
      if (backups.length === 0) {
        console.log('📁 No hay backups disponibles');
        console.log('\n💡 Crea un backup con: npm run backup\n');
        process.exit(0);
      }

      console.log('\n📋 BACKUPS DISPONIBLES:\n');
      backups.forEach((backup, idx) => {
        console.log(`${idx + 1}. ${backup.nombre}`);
        console.log(`   📅 Fecha: ${backup.fecha.toLocaleString('es-CL')}`);
        console.log(`   📦 Tamaño: ${backup.tamaño}\n`);
      });
      
      console.log('💡 Para restaurar usa:');
      console.log('   npm run restore:num <número>');
      console.log('   Ejemplo: npm run restore:num 1\n');
      
      process.exit(0);
    });
  } else if (!isNaN(args[0])) {
    // ✅ Restaurar por número
    restoreByNumber(args[0])
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else {
    // Restaurar por ruta completa
    const backupFile = path.resolve(args[0]);
    restoreBackup(backupFile)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  }
}

module.exports = { restoreBackup, listBackups, restoreByNumber };
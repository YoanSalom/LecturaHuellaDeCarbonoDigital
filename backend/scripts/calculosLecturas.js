const fs = require('fs');
const db = require('../db');

async function generarLecturasCSV() {
  try {
    const [dispositivos] = await db.query('SELECT * FROM dispositivos');
    const [carbonData] = await db.query(`
      SELECT datetime_utc, carbon_intensity_direct
      FROM carbon_intensity
      ORDER BY datetime_utc ASC
    `);

    if (!dispositivos.length || !carbonData.length) {
      console.log('No hay dispositivos o datos de carbon_intensity.');
      return;
    }

    // Definir bloques horarios
    const bloques = [
      { inicio: '00:00', fin: '07:59', horas: 7, estado: 'Apagado' },
      { inicio: '08:00', fin: '12:59', horas: 4, estado: 'Encendido' },
      { inicio: '13:00', fin: '14:59', horas: 1, estado: 'Apagado' },
      { inicio: '15:00', fin: '17:59', horas: 2, estado: 'Encendido' },
      { inicio: '18:00', fin: '23:59', horas: 5, estado: 'Apagado' }
    ];

    const lecturas = [];

    dispositivos.forEach(dispositivo => {
      const fechasUnicas = [...new Set(carbonData.map(c => c.datetime_utc.toISOString().slice(0, 10)))];

      fechasUnicas.forEach(fecha => {
        bloques.forEach(bloque => {
          const registrosBloque = carbonData.filter(c =>
            c.datetime_utc.toISOString().startsWith(fecha)
          );

          const avgCarbon = registrosBloque.reduce((sum, r) => sum + parseFloat(r.carbon_intensity_direct), 0) / registrosBloque.length;

          const watts = bloque.estado === 'Encendido'
            ? dispositivo.watts_encendido
            : dispositivo.watts_apagado;

          const consumoKwh = (watts * bloque.horas) / 1000;
          const emisiones = consumoKwh * avgCarbon;

          lecturas.push({
            dispositivo_id: dispositivo.id,
            nombre_modelo: dispositivo.nombre_modelo,
            fecha,
            horario: `${bloque.inicio}-${bloque.fin}`,
            estado: bloque.estado,
            consumo_w: watts,
            horas: bloque.horas,
            consumo_kwh: consumoKwh.toFixed(4),
            intensidad_co2: avgCarbon.toFixed(2),
            emisiones_kgco2: emisiones.toFixed(6)
          });
        });
      });
    });

    // Generar CSV
    const headers = [
      'dispositivo_id','nombre_modelo','fecha','horario','estado',
      'consumo_w','horas','consumo_kwh','intensidad_co2','emisiones_kgco2'
    ];

    const csvData = [
      headers.join(','),
      ...lecturas.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const filePath = 'C:/xampp/mysql/data/csv_tesis/lecturas.csv';
    fs.writeFileSync(filePath, csvData, 'utf8');
    console.log(`CSV generado con bloques horarios en: ${filePath}`);

  } catch (err) {
    console.error('Error generando lecturas:', err);
  }
}

generarLecturasCSV();

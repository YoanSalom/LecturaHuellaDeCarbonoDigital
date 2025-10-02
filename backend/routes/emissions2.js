const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'yoan_user',
    password: process.env.DB_PASSWORD || 'superdragon7',
    database: process.env.DB_NAME || 'tesis_db',
    timezone: '+00:00',
    connectionLimit: 10
};

const pool = mysql.createPool(dbConfig);

// Middleware
app.use(express.json());

// Validación de fechas
const isValidDate = (dateString, isYearMonth = false) => {
    if (isYearMonth) {
        const regEx = /^\d{4}-\d{2}$/;
        if (!dateString.match(regEx)) return false;
        const [year, month] = dateString.split('-');
        return month >= 1 && month <= 12;
    }
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

// Caché de dispositivos
const dispositivosCache = {
    data: null,
    lastUpdated: null,
    ttl: 300000
};

// 1. Obtener dispositivos
app.get('/api/dispositivos', async (req, res) => {
    try {
        if (dispositivosCache.data && Date.now() - dispositivosCache.lastUpdated < dispositivosCache.ttl) {
            return res.json(dispositivosCache.data);
        }

        const [rows] = await pool.query(`
            SELECT d.id, d.nombre_modelo, d.tipo, d.watts_encendido, d.watts_apagado,
                   s.nombre as sala_nombre, s.edificio, COUNT(hd.id) as horarios_count
            FROM dispositivos d
            JOIN salas s ON d.sala_id = s.id
            LEFT JOIN horarios_dispositivos hd ON d.id = hd.dispositivo_id
            GROUP BY d.id
            ORDER BY d.nombre_modelo
        `);

        dispositivosCache.data = rows;
        dispositivosCache.lastUpdated = Date.now();
        res.json(rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos' });
    }
});

// 2. Emisiones por horas
app.get('/api/emisiones/horas/:deviceId/:fecha', async (req, res) => {
    const { deviceId, fecha } = req.params;
    
    if (!isValidDate(fecha)) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    try {
        const [device] = await pool.query('SELECT id FROM dispositivos WHERE id = ?', [deviceId]);
        if (device.length === 0) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const [rows] = await pool.query(`
            SELECT HOUR(ci.datetime_utc) as hora, d.nombre_modelo,
                   ci.carbon_intensity_direct,
                   CASE WHEN EXISTS (
                       SELECT 1 FROM horarios_dispositivos hd 
                       WHERE hd.dispositivo_id = d.id AND hd.dia_semana = DAYOFWEEK(?)
                       AND TIME(ci.datetime_utc) BETWEEN hd.hora_inicio AND hd.hora_fin
                       AND hd.estado_esperado = 'Encendido'
                   ) THEN d.watts_encendido ELSE d.watts_apagado END as watts_actual,
                   (CASE WHEN EXISTS (...) THEN d.watts_encendido ELSE d.watts_apagado END / 1000) as consumo_kwh,
                   ((CASE WHEN EXISTS (...) THEN d.watts_encendido ELSE d.watts_apagado END / 1000) * ci.carbon_intensity_direct / 1000) as emisiones_kg_co2
            FROM dispositivos d
            JOIN carbon_intensity ci ON ci.time_granularity = 'hourly'
            WHERE d.id = ? AND DATE(ci.datetime_utc) = ?
            ORDER BY hora
        `, [fecha, fecha, fecha, deviceId, fecha]);

        res.json(rows.length > 0 ? rows : []);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener datos horarios' });
    }
});

// 3. Emisiones por días (consulta corregida)
app.get('/api/emisiones/dias/:deviceId/:year/:month', async (req, res) => {
    const { deviceId, year, month } = req.params;
    const dateStr = `${year}-${month}-01`;

    if (!isValidDate(dateStr)) {
        return res.status(400).json({ error: 'Formato de año/mes inválido. Use YYYY-MM' });
    }

    try {
        const [device] = await pool.query('SELECT id FROM dispositivos WHERE id = ?', [deviceId]);
        if (device.length === 0) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const [intensidad] = await pool.query(`
            SELECT AVG(carbon_intensity_direct) as avg_intensity 
            FROM carbon_intensity 
            WHERE time_granularity = 'monthly'
            AND YEAR(datetime_utc) = ? AND MONTH(datetime_utc) = ?
        `, [year, month]);

        const avgIntensity = intensidad[0]?.avg_intensity || 185;

        const [rows] = await pool.query(`
            WITH RECURSIVE dates AS (
                SELECT CAST(? AS DATE) as date
                UNION ALL
                SELECT DATE_ADD(date, INTERVAL 1 DAY)
                FROM dates
                WHERE DATE_ADD(date, INTERVAL 1 DAY) <= LAST_DAY(?)
            )
            SELECT DAY(d.date) as dia, d.date as fecha_completa,
                   DAYNAME(d.date) as nombre_dia, d.nombre_modelo,
                   COALESCE((
                       SELECT SUM(TIMESTAMPDIFF(HOUR, hd.hora_inicio, hd.hora_fin))
                       FROM horarios_dispositivos hd
                       WHERE hd.dispositivo_id = d.id
                       AND hd.dia_semana = DAYOFWEEK(d.date)
                       AND hd.estado_esperado = 'Encendido'
                   ), 0) as horas_encendido,
                   (d.watts_encendido * COALESCE((SELECT ...), 0) / 1000) as consumo_kwh_dia,
                   ((d.watts_encendido * COALESCE((SELECT ...), 0) / 1000) * ? / 1000) as emisiones_kg_co2_dia
            FROM dispositivos d
            CROSS JOIN dates
            WHERE d.id = ?
            ORDER BY dia
        `, [dateStr, dateStr, avgIntensity, deviceId]);

        res.json(rows.length > 0 ? rows : []);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener datos diarios' });
    }
});

// 4. Resumen del dispositivo
app.get('/api/resumen/:deviceId', async (req, res) => {
    try {
        const [device] = await pool.query(`
            SELECT d.id, d.nombre_modelo, d.tipo, s.nombre as sala_nombre,
                   s.edificio, d.watts_encendido, d.watts_apagado
            FROM dispositivos d
            JOIN salas s ON d.sala_id = s.id
            WHERE d.id = ?
        `, [req.params.deviceId]);

        if (device.length === 0) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const [intensidad] = await pool.query(`
            SELECT AVG(carbon_intensity_direct) as avg_intensity
            FROM carbon_intensity
            WHERE time_granularity = 'yearly'
            AND YEAR(datetime_utc) = YEAR(CURDATE())
        `);

        const avgIntensity = intensidad[0]?.avg_intensity || 185;
        const avgHorasDia = 8; // Valor por defecto
        const consumoDia = (device[0].watts_encendido * avgHorasDia) / 1000;

        res.json({
            ...device[0],
            consumo_kwh_dia: consumoDia,
            emisiones_kg_co2_dia: consumoDia * avgIntensity / 1000,
            intensidad_carbono_promedio: avgIntensity
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al generar resumen' });
    }
});

// 5. Fechas disponibles
app.get('/api/fechas-disponibles', async (req, res) => {
    try {
        const [fechas] = await pool.query(`
            SELECT MIN(DATE(datetime_utc)) as fecha_minima,
                   MAX(DATE(datetime_utc)) as fecha_maxima
            FROM carbon_intensity
            WHERE time_granularity = 'hourly'
        `);
        
        const [meses] = await pool.query(`
            SELECT DISTINCT YEAR(datetime_utc) as año, MONTH(datetime_utc) as mes
            FROM carbon_intensity
            WHERE time_granularity = 'monthly'
            ORDER BY año, mes
        `);
        
        res.json({
            ...fechas[0],
            meses_disponibles: meses.map(m => ({
                año: m.año,
                mes: m.mes,
                label: `${m.año}-${String(m.mes).padStart(2, '0')}`
            }))
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener fechas' });
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(`Error: ${err.stack}`);
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
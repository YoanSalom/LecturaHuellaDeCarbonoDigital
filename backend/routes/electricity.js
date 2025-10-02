const express = require('express');
const router = express.Router();
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Cache en memoria (nivel módulo)
const csvCache = {};

// Función para validar fechas
const isValidDate = (dateString, isYear = false) => {
  if (isYear) {
    const year = parseInt(dateString, 10);
    return !isNaN(year) && year >= 2000 && year <= 2100;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

// Función para cargar CSV (con cache)
const loadCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    if (csvCache[filePath]) {
      return resolve(csvCache[filePath]);
    }

    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          results.push({
            datetime: row['Datetime (UTC)'],
            carbonIntensity: parseFloat(row['Carbon intensity gCO₂eq/kWh (direct)'] || 0),
            renewablePercentage: parseFloat(row['Renewable energy percentage (RE%)'] || 0),
            zone: row['Zone name']
          });
        } catch (error) {
          console.error('Error parsing CSV row:', error);
        }
      })
      .on('end', () => {
        csvCache[filePath] = results; // Almacena en cache
        resolve(results);
      })
      .on('error', reject);
  });
};

// Endpoint principal (optimizado)
router.get('/csv-data', async (req, res) => {
  const { range, date, year, month } = req.query;
  
  try {
    // Validación de parámetros
    if (!range) {
      return res.status(400).json({ error: 'Parámetro "range" requerido. Valores: hourly, daily, monthly, yearly' });
    }

    const validRanges = ['hourly', 'daily', 'monthly', 'yearly'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({ error: `Rango no válido. Use: ${validRanges.join(', ')}` });
    }

    // Validación específica por rango
    let validationError;
    try {
      switch (range) {
        case 'hourly':
          if (!date || !isValidDate(date)) validationError = 'Fecha inválida. Formato: YYYY-MM-DD';
          break;
        case 'daily':
          if (!year || !month || !isValidDate(`${year}-${month}-01`)) validationError = 'Año/Mes inválido. Formato: YYYY-MM';
          break;
        case 'monthly':
        case 'yearly':
          if (!year || !isValidDate(year, true)) validationError = 'Año inválido. Formato: YYYY';
          break;
      }
    } catch (err) {
      validationError = 'Error en validación de parámetros';
    }

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Construir ruta del archivo
    const filePath = path.join(__dirname, '..', 'data', `CL-SEN_2024_${range}.csv`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Datos no disponibles',
        details: `Archivo no encontrado: ${path.basename(filePath)}`
      });
    }

    // Cargar y filtrar datos (optimizado)
    const data = await loadCSV(filePath);
    let filteredData = data;

    switch (range) {
      case 'hourly':
        const targetDate = new Date(date).toISOString().split('T')[0];
        filteredData = data.filter(item => item.datetime.startsWith(targetDate));
        break;
      case 'daily':
        case 'monthly':
          filteredData = data.filter(item => {
            const itemDate = new Date(item.datetime);
            return itemDate.getFullYear() === parseInt(year) && 
                   (range === 'daily' ? (itemDate.getMonth() + 1) === parseInt(month) : true);
          });
          break;
      case 'yearly':
        filteredData = data.filter(item => new Date(item.datetime).getFullYear() === parseInt(year));
        break;
    }

    if (filteredData.length === 0) {
      return res.status(404).json({ 
        error: 'No hay datos disponibles',
        details: `Parámetros: range=${range}, date=${date || `${year}-${month || ''}`}`
      });
    }

    // Cálculos eficientes
    const totalCarbon = filteredData.reduce((sum, item) => sum + item.carbonIntensity, 0);
    const totalRenewable = filteredData.reduce((sum, item) => sum + item.renewablePercentage, 0);

    res.json({
      success: true,
      range,
      date: range === 'yearly' ? year : date || `${year}-${month}`,
      count: filteredData.length,
      carbonIntensityAvg: totalCarbon / filteredData.length,
      renewableAvg: totalRenewable / filteredData.length,
      data: filteredData
    });

  } catch (error) {
    console.error('Error en /csv-data:', error);
    res.status(500).json({ 
      error: 'Error interno al procesar los datos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
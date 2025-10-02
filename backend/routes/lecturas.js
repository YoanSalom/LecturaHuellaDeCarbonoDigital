const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Ruta del CSV
const CSV_PATH = 'C:/xampp/mysql/data/csv_tesis/lecturas.csv';

// Endpoint para leer las lecturas del CSV
router.get('/', async (req, res) => {
  try {
    // Verificar si existe el archivo
    if (!fs.existsSync(CSV_PATH)) {
      return res.status(404).json({ error: 'Archivo CSV no encontrado' });
    }

    // Leer el archivo CSV
    const csvData = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    // Convertir CSV a JSON
    const lecturas = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const values = lines[i].split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      lecturas.push(obj);
    }

    res.json(lecturas);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
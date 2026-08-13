const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const execPromise = util.promisify(exec);

// POST /api/lecturas/regenerar
router.post('/regenerar', authMiddleware, requireAdmin, async (req, res) => {
  const { action, año } = req.body;

  if (!action || !año) {
    return res.status(400).json({
      success: false,
      error: 'Se requiere action (limpiar/generar) y año'
    });
  }

  try {
    const scriptPath = path.join(__dirname, '../database/generate-realistic-uach-data.js');
    let command;

    if (action === 'limpiar') {
      command = `node "${scriptPath}" limpiar ${año}`;
    } else if (action === 'generar') {
      command = `node "${scriptPath}" generar ${año}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Action inválido. Debe ser "limpiar" o "generar"'
      });
    }

    console.log(`Ejecutando: ${command}`);

    const { stdout, stderr } = await execPromise(command, {
      cwd: path.join(__dirname, '..'),
      timeout: 600000 // 10 minutos máximo
    });

    // Extraer número de lecturas generadas del output
    const lecturasMatch = stdout.match(/(\d+)\s+lecturas/i);
    const lecturasGeneradas = lecturasMatch ? parseInt(lecturasMatch[1]) : 0;

    console.log('Output:', stdout);
    if (stderr) console.error('Errors:', stderr);

    res.json({
      success: true,
      action,
      año,
      lecturas: lecturasGeneradas,
      message: action === 'limpiar' 
        ? `Datos de ${año} limpiados exitosamente`
        : `${lecturasGeneradas} lecturas generadas para ${año}`,
      output: stdout
    });

  } catch (error) {
    console.error(`Error en ${action} ${año}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stderr || error.stdout
    });
  }
});

module.exports = router;
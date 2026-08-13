const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

//  Configurar multer con detección automática de carpeta
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Detectar tipo desde la URL
    let tipo = 'dispositivos'; // Default
    
    if (req.path.includes('/csv/')) {
      tipo = 'csv';
    } else if (req.path.includes('/usuario/')) {
      tipo = 'usuarios';
    }
    
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', tipo);
    
    // Crear carpeta si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(` Carpeta creada: ${uploadPath}`);
    }
    
    console.log(` Guardando en: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Verificar tipo según la ruta
    if (req.path.includes('/csv/')) {
      // Para CSVs
      const allowedTypes = /csv/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel';
      
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos CSV'));
      }
    } else {
      // Para imágenes
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
      }
    }
  }
});

//  Subir y procesar CSV de horarios
router.post('/csv/horarios', authMiddleware, requireAdmin, upload.single('csv'), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se recibió ningún archivo',
        hint: 'Asegúrate de enviar el campo "csv" como File en form-data'
      });
    }
    
    const filePath = req.file.path;
    console.log(` Archivo recibido: ${filePath}`);
    
    const rows = [];
    
    // Leer CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    if (rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'El archivo CSV está vacío' 
      });
    }
    
    console.log(`📊 Total de filas: ${rows.length}`);
    
    // Comenzar transacción
    await connection.beginTransaction();
    
    // Limpiar tabla si se solicita
    if (req.body.limpiar === 'true') {
      await connection.query('DELETE FROM horarios_dispositivos');
      console.log(' Tabla horarios_dispositivos limpiada');
    }
    
    let insertados = 0;
    let errores = 0;
    
    // Insertar cada fila
    for (const row of rows) {
      try {
        await connection.query(
          `INSERT INTO horarios_dispositivos 
           (id, dispositivo_id, dia_semana, hora_inicio, hora_fin, estado_esperado) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            row.id || null,
            row.dispositivo_id,
            row.dia_semana,
            row.hora_inicio,
            row.hora_fin,
            row.estado_esperado?.trim()
          ]
        );
        insertados++;
      } catch (err) {
        console.error(` Error en fila ${insertados + errores + 1}:`, err.message);
        errores++;
      }
    }
    
    // Confirmar transacción
    await connection.commit();
    
    // Eliminar archivo CSV temporal
    fs.unlinkSync(filePath);
    console.log(' Archivo temporal eliminado');
    
    res.json({
      success: true,
      mensaje: 'CSV procesado correctamente',
      total: rows.length,
      insertados,
      errores
    });
    
  } catch (error) {
    await connection.rollback();
    console.error(' Error al procesar CSV:', error);
    
    // Eliminar archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Error al procesar CSV',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

//  Subir CSV de lecturas (si lo necesitas)
router.post('/csv/lecturas', authMiddleware, requireAdmin, upload.single('csv'), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se recibió ningún archivo' 
      });
    }
    
    const filePath = req.file.path;
    const rows = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
    
    await connection.beginTransaction();
    
    let insertados = 0;
    
    for (const row of rows) {
      try {
        await connection.query(
          `INSERT INTO lecturas 
           (dispositivo_id, fecha, hora_inicio, hora_fin, estado, consumo_w, horas, consumo_kwh, intensidad_co2, emisiones_kgco2) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.dispositivo_id,
            row.fecha,
            row.hora_inicio,
            row.hora_fin,
            row.estado?.trim(),
            parseFloat(row.consumo_w),
            parseFloat(row.horas),
            parseFloat(row.consumo_kwh),
            parseFloat(row.intensidad_co2),
            parseFloat(row.emisiones_kgco2)
          ]
        );
        insertados++;
      } catch (err) {
        console.error(`Error insertando lectura:`, err.message);
      }
    }
    
    await connection.commit();
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      mensaje: 'CSV de lecturas procesado',
      insertados
    });
    
  } catch (error) {
    await connection.rollback();
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false,
      error: 'Error al procesar CSV de lecturas',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// Subir imagen de dispositivo
router.post('/dispositivo/:id', authMiddleware, requireAdmin, upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const imagenUrl = `/uploads/dispositivos/${req.file.filename}`;
    
    await db.query('UPDATE dispositivos SET imagen_url = ? WHERE id = ?', [imagenUrl, id]);
    
    res.json({
      success: true,
      url: imagenUrl,
      mensaje: 'Imagen subida correctamente'
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// NOTA: el campo foto_url fue reemplazado por 'ruta' (valores: 'a', 'b', 'c').
// La ruta de usuario ya no se establece por subida de archivo sino por el campo ruta en el CRUD.
// router.post('/usuario/:id', ...) eliminada intencionalmente.

module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const TIPOS_DIR = path.join(__dirname, '../public/uploads/tipos');

function ensureDir() {
  if (!fs.existsSync(TIPOS_DIR)) fs.mkdirSync(TIPOS_DIR, { recursive: true });
}

// Devuelve un mapa { tipo: '/uploads/tipos/filename.ext' }
function getTipoImages() {
  ensureDir();
  const result = {};
  fs.readdirSync(TIPOS_DIR).forEach(f => {
    const ext = path.extname(f);
    const tipo = path.basename(f, ext);
    result[tipo] = `/uploads/tipos/${f}`;
  });
  return result;
}

// GET /api/tipos-imagen  → { success, data: { Computadora: '/uploads/tipos/Computadora.jpg', ... } }
router.get('/', (req, res) => {
  try {
    res.json({ success: true, data: getTipoImages() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tipos-imagen/:tipo  → sube imagen genérica para ese tipo
const storage = multer.diskStorage({
  destination: (req, file, cb) => { ensureDir(); cb(null, TIPOS_DIR); },
  filename: (req, file, cb) => {
    const tipo = decodeURIComponent(req.params.tipo).replace(/[/\\:*?"<>|]/g, '');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    // Eliminar archivo previo del mismo tipo (cualquier extensión)
    try {
      fs.readdirSync(TIPOS_DIR)
        .filter(f => path.basename(f, path.extname(f)) === tipo)
        .forEach(f => fs.unlinkSync(path.join(TIPOS_DIR, f)));
    } catch (_) {}
    cb(null, `${tipo}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF, WebP)'));
    }
  }
});

router.post('/:tipo', upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No se recibió imagen' });
  res.json({ success: true, imagen_url: `/uploads/tipos/${req.file.filename}` });
});

// DELETE /api/tipos-imagen/:tipo  → elimina imagen genérica del tipo
router.delete('/:tipo', (req, res) => {
  try {
    ensureDir();
    const tipo = decodeURIComponent(req.params.tipo).replace(/[/\\:*?"<>|]/g, '');
    const match = fs.readdirSync(TIPOS_DIR).find(f => path.basename(f, path.extname(f)) === tipo);
    if (match) {
      fs.unlinkSync(path.join(TIPOS_DIR, match));
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: 'No existe imagen para este tipo' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.getTipoImages = getTipoImages;

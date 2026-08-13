const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Cuentas del sistema (admin/visitante). No viven en la tabla `usuarios`
// (esa tabla es para encargados de sala/perfil ecológico, un concepto
// distinto) — se configuran vía backend/.env como hash bcrypt, nunca en
// texto plano.
function getCuentas() {
  return {
    [process.env.ADMIN_USERNAME]: {
      passwordHash: process.env.ADMIN_PASSWORD_HASH,
      role: 'admin',
      nombre: process.env.ADMIN_NOMBRE || 'Administrador',
    },
    [process.env.VISITANTE_USERNAME]: {
      passwordHash: process.env.VISITANTE_PASSWORD_HASH,
      role: 'visitante',
      nombre: process.env.VISITANTE_NOMBRE || 'Visitante',
    },
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
    }

    const cuentas = getCuentas();
    const cuenta = cuentas[username.toLowerCase()];

    if (!cuenta || !cuenta.passwordHash) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    const passwordOk = await bcrypt.compare(password, cuenta.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    const payload = { username: username.toLowerCase(), role: cuenta.role, nombre: cuenta.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({ success: true, token, usuario: payload });
  } catch (err) {
    console.error('Error en /auth/login:', err);
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
  }
});

module.exports = router;

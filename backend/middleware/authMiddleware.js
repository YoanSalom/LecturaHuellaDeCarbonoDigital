const jwt = require('jsonwebtoken');


// el login del sistema (admin/visitante) no vive en ninguna tabla, solo
// en las credenciales configuradas vía backend/.env (ver routes/auth.js).
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: 'Token no proporcionado' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const mensaje = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return res.status(401).json({ success: false, error: mensaje });
  }
}

// Debe usarse después de authMiddleware (requiere req.user ya poblado).
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Requiere permisos de administrador' });
  }
  next();
}

module.exports = { authMiddleware, requireAdmin };

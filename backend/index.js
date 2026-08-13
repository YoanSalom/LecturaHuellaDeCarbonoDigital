require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// ========================================
// MIDDLEWARES
// ========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ========================================
// IMPORTAR RUTAS
// ========================================
const elec24Routes = require('./routes/elec24');

// ✅ Rutas activas (orden importa: uploads primero para que no dependa de módulos nuevos)
const uploadsRoutes = require('./routes/uploads');
const salasRoutes = require('./routes/salas');
const lecturasRoutes = require('./routes/lecturas');
const lecturasAdminRoutes = require('./routes/lecturas-admin');
const estadisticasRoutes = require('./routes/estadisticas-routes');
const regenerarRoutes = require('./routes/regenerar-routes');
const tiposImagenRoutes = require('./routes/tipos-imagen');
const dispositivosRoutes = require('./routes/dispositivos');


// ========================================
// REGISTRAR RUTAS API
// ========================================
app.use('/api/elec24', elec24Routes);
app.use('/api/auth', require('./routes/auth'));

// ✅ Rutas principales
app.use('/api/dispositivos', dispositivosRoutes);
app.use('/api/salas', salasRoutes);
app.use('/api/lecturas', lecturasRoutes);
app.use('/api/lecturas', regenerarRoutes);  // ✅ AGREGADO: Endpoint de regeneración
app.use('/api/uploads', uploadsRoutes);
app.use('/api/lecturas-admin', lecturasAdminRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/horarios', require('./routes/horarios'));
app.use('/api/tipos-imagen', tiposImagenRoutes);


// ========================================
// RUTA RAÍZ - INFO DE LA API
// ========================================
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ API funcionando',
    version: '2.0.0',
    endpoints: {
      // Datos dinámicos (modificables via API)
      dispositivos: {
        GET: '/api/dispositivos',
        POST: '/api/dispositivos',
        GET_BY_ID: '/api/dispositivos/:id'
      },
      salas: {
        GET: '/api/salas',
        GET_DISPOSITIVOS: '/api/salas/:id/dispositivos'
      },
      
      // Lecturas (consulta)
      lecturas: {
        GET: '/api/lecturas?dispositivo=D-0001&año=2024&mes=01',
        POST_REGENERAR: '/api/lecturas/regenerar'  // ✅ AGREGADO
      },
      
      // Administración de lecturas (regeneración)
      'lecturas-admin': {
        POST_REGENERAR_AÑO: '/api/lecturas-admin/regenerar/:anio',
        POST_REGENERAR_TODO: '/api/lecturas-admin/regenerar-todo',
        GET_ESTADISTICAS: '/api/lecturas-admin/estadisticas',
        DELETE_LIMPIAR: '/api/lecturas-admin/limpiar/:anio'
      },
      
      // Uploads
      uploads: {
        POST_IMAGEN_DISPOSITIVO: '/api/uploads/dispositivo/:id',
        POST_IMAGEN_USUARIO: '/api/uploads/usuario/:id',
        POST_CSV_HORARIOS: '/api/uploads/csv/horarios',
        POST_CSV_LECTURAS: '/api/uploads/csv/lecturas'
      },
      
      // Archivos estáticos
      imagenes: '/uploads/dispositivos/imagen.jpg'
    },
    documentacion: 'https://github.com/tu-proyecto/api-docs'
  });
});

// ========================================
// HEALTH CHECK
// ========================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ========================================
// MANEJO DE ERRORES 404
// ========================================
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
    sugerencia: 'Visita / para ver los endpoints disponibles'
  });
});

// ========================================
// MANEJO DE ERRORES GLOBAL
// ========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({ 
    error: 'Error interno del servidor',
    message: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log('   SERVIDOR API - TESIS ENERGÍA');
  console.log('   ========================================');
  console.log('');
  console.log(`   ✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log('');
  console.log('   📋 ENDPOINTS PRINCIPALES:');
  console.log(`   • Dispositivos: http://localhost:${PORT}/api/dispositivos`);
  console.log(`   • Salas:        http://localhost:${PORT}/api/salas`);
  console.log(`   • Lecturas:     http://localhost:${PORT}/api/lecturas`);
  console.log(`   • Regenerar:    http://localhost:${PORT}/api/lecturas/regenerar`);
  console.log(`   • Admin:        http://localhost:${PORT}/api/lecturas-admin`);
  console.log(`   • Uploads:      http://localhost:${PORT}/api/uploads`);
  console.log('');
  console.log(`   📖 Documentación: http://localhost:${PORT}/`);
  console.log(`   🏥 Health Check:  http://localhost:${PORT}/health`);
  console.log('');
  console.log('   🌐 Archivos estáticos: /uploads/*');
  console.log('');
  console.log('========================================');
  console.log('');
});
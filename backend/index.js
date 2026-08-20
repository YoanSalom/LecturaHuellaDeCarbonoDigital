require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();


// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const electricityRoutes = require('./routes/electricity');
const elec24Routes = require('./routes/elec24');
const dispositivosRoutes = require('./routes/dispositivos');
const horariosRoutes = require('./routes/horarios');
const estadisticasRoutes = require('./routes/estadisticas');
const salasRoutes = require('./routes/salas'); 
const emissionsRoutes = require('./routes/emissions2');
const lecturasRoutes = require('./routes/lecturas');




app.use('/api/electricity', electricityRoutes);
app.use('/api/elec24', elec24Routes);
app.use('/api/dispositivos', dispositivosRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/estadisticas', estadisticasRoutes); 
app.use('/api/salas', salasRoutes);
app.use('/api/emissions2', emissionsRoutes);
app.use('/api/lecturas', lecturasRoutes);

// Ruta raíz de prueba actualizada
app.get('/', (req, res) => {
  res.json({ 
    status: 'API funcionando',
    endpoints: [
      '/api/electricity/carbon-intensity',
      '/api/elec24',
      '/api/dispositivos',
      '/api/horarios',
      '/api/estadisticas',
      '/api/salas',
      '/api/emissions2',
      '/api/lecturas'
    ]
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Ruta Dispositivos: http://localhost:${PORT}/api/dispositivos`);
  console.log(` Ruta Horarios: http://localhost:${PORT}/api/horarios`);
  console.log(` Ruta Estadísticas: http://localhost:${PORT}/api/estadisticas`);
});

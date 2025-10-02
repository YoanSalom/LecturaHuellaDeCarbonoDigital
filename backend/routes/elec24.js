const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuración
const API_BASE_URL = 'https://api.electricitymap.org/v3';
const DEFAULT_ZONE = 'CL-SEN';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos de caché

// Caché simple en memoria
let cache = {
  data: null,
  timestamp: null
};

// Función para obtener datos históricos de 24 horas
const fetch24HourData = async (zone) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/carbon-intensity/past-range?zone=${zone}`, {
      headers: { 'auth-token': process.env.ELECTRICITY_MAPS_API_KEY || 'eZH6AHz17fKqyvdOssNt' },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching 24h data:', error.message);
    return null;
  }
};

// Función para generar datos simulados
const generateMockData = () => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now - (24 - i - 1) * 60 * 60 * 1000);
    return {
      datetime: hour.toISOString(),
      carbonIntensity: Math.floor(200 + Math.random() * 100),
      fossilPercentage: Math.floor(60 + Math.random() * 20),
      isEstimated: true,
      isSimulated: true
    };
  });
};

// Ruta principal para datos de 24 horas
router.get('/', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;

    // Verificar caché primero
    if (cache.data && cache.timestamp && (Date.now() - cache.timestamp) < CACHE_TTL) {
      return res.json({
        ...cache.data,
        cached: true
      });
    }

    // Intentar obtener datos reales
    const apiData = await fetch24HourData(zone);
    
    if (apiData && apiData.data) {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

      const processedData = {
        success: true,
        data: apiData.data
          .filter(d => new Date(d.datetime) >= twentyFourHoursAgo)
          .map(d => ({
            datetime: d.datetime,
            carbonIntensity: d.carbonIntensity,
            fossilPercentage: d.fossilFuelPercentage || null,
            isEstimated: d.isEstimated !== undefined ? d.isEstimated : true
          })),
        updatedAt: new Date().toISOString(),
        isSimulated: false
      };

      // Actualizar caché
      cache = {
        data: processedData,
        timestamp: Date.now()
      };

      return res.json(processedData);
    }

    // Fallback a datos simulados
    const mockData = {
      success: true,
      data: generateMockData(),
      updatedAt: new Date().toISOString(),
      isSimulated: true
    };

    cache = {
      data: mockData,
      timestamp: Date.now()
    };

    res.json(mockData);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mantenemos las rutas originales pero las adaptamos
router.get('/carbon-intensity', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;
    const response = await axios.get(`${API_BASE_URL}/carbon-intensity/latest?zone=${zone}`, {
      headers: { 'auth-token': process.env.ELECTRICITY_MAPS_API_KEY },
      timeout: 5000
    });

    res.json({
      ...response.data,
      isEstimated: response.data.isEstimated !== undefined ? response.data.isEstimated : true
    });
  } catch (error) {
    console.error('Error fetching carbon intensity:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener intensidad de carbono',
      isSimulated: true,
      carbonIntensity: Math.floor(200 + Math.random() * 100),
      datetime: new Date().toISOString()
    });
  }
});

router.get('/power-origin', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;
    const response = await axios.get(`${API_BASE_URL}/power-breakdown/latest?zone=${zone}`, {
      headers: { 'auth-token': process.env.ELECTRICITY_MAPS_API_KEY },
      timeout: 5000
    });

    const data = {
      zone: response.data.zone,
      renewablePercentage: response.data.renewablePercentage || 0,
      fossilPercentage: 100 - (response.data.renewablePercentage || 0),
      breakdown: response.data.powerProductionBreakdown || {},
      updatedAt: new Date().toISOString()
    };

    res.json(data);
  } catch (error) {
    console.error('Error fetching power origin:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener mix energético',
      isSimulated: true,
      renewablePercentage: Math.floor(20 + Math.random() * 40),
      fossilPercentage: Math.floor(60 + Math.random() * 20),
      breakdown: {
        hydro: Math.floor(10 + Math.random() * 20),
        solar: Math.floor(5 + Math.random() * 15),
        wind: Math.floor(5 + Math.random() * 10),
        coal: Math.floor(30 + Math.random() * 20),
        gas: Math.floor(20 + Math.random() * 15)
      },
      updatedAt: new Date().toISOString()
    });
  }
});

module.exports = router;
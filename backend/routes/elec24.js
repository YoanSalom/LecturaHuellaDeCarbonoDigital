const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_BASE_URL = 'https://api.electricitymaps.com/v3';
const DEFAULT_ZONE = 'CL-SEN';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

let cache = {
  data: null,
  timestamp: null
};

const fetchHistoryData = async (zone) => {
  const response = await axios.get(
    `${API_BASE_URL}/carbon-intensity/history?zone=${zone}`,
    {
      headers: {
        'auth-token': process.env.ELECTRICITY_MAPS_API_KEY
      },
      timeout: 10000
    }
  );

  return response.data;
};


// ===============================
// RUTA PRINCIPAL (últimas 24h)
// ===============================
router.get('/', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;

    if (!process.env.ELECTRICITY_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'API key no configurada'
      });
    }

    // Cache válido
    if (
      cache.data &&
      cache.timestamp &&
      (Date.now() - cache.timestamp) < CACHE_TTL
    ) {
      return res.json({
        ...cache.data,
        cached: true
      });
    }

    const apiData = await fetchHistoryData(zone);

    if (!apiData || !Array.isArray(apiData.history)) {
      return res.status(500).json({
        success: false,
        error: 'Respuesta inválida de Electricity Maps'
      });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    const processedData = {
      success: true,
      zone: apiData.zone,
      data: apiData.history
        .filter(d => new Date(d.datetime) >= twentyFourHoursAgo)
        .map(d => ({
          datetime: d.datetime,
          carbonIntensity: d.carbonIntensity,
          isEstimated: d.isEstimated || false,
          estimationMethod: d.estimationMethod || null,
          emissionFactorType: d.emissionFactorType || null,
          updatedAt: d.updatedAt
        })),
      temporalGranularity: apiData.temporalGranularity || 'hourly',
      updatedAt: new Date().toISOString()
    };

    cache = {
      data: processedData,
      timestamp: Date.now()
    };

    res.json(processedData);

  } catch (error) {
    console.error('Server error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Error al obtener datos reales',
      details:
        process.env.NODE_ENV === 'development'
          ? error.response?.data || error.message
          : undefined
    });
  }
});


// ===============================
// HISTORIAL COMPLETO
// ===============================
router.get('/history', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;

    const apiData = await fetchHistoryData(zone);

    if (!apiData || !apiData.history) {
      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener datos históricos'
      });
    }

    res.json({
      success: true,
      zone: apiData.zone,
      data: apiData.history,
      temporalGranularity: apiData.temporalGranularity,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching history:', error.message);

    res.status(500).json({
      success: false,
      error: 'Error al obtener datos históricos',
      details:
        process.env.NODE_ENV === 'development'
          ? error.response?.data || error.message
          : undefined
    });
  }
});


// ===============================
// INTENSIDAD ACTUAL
// ===============================
router.get('/carbon-intensity/latest', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;

    const response = await axios.get(
      `${API_BASE_URL}/carbon-intensity/latest?zone=${zone}`,
      {
        headers: {
          'auth-token': process.env.ELECTRICITY_MAPS_API_KEY
        },
        timeout: 5000
      }
    );

    res.json({
      success: true,
      ...response.data
    });

  } catch (error) {
    console.error('Error fetching carbon intensity:', error.message);

    res.status(500).json({
      success: false,
      error: 'Error al obtener intensidad de carbono',
      details:
        process.env.NODE_ENV === 'development'
          ? error.response?.data || error.message
          : undefined
    });
  }
});


// ===============================
// FORECAST
// ===============================
router.get('/carbon-intensity/forecast', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;

    const response = await axios.get(
      `${API_BASE_URL}/carbon-intensity/forecast?zone=${zone}`,
      {
        headers: {
          'auth-token': process.env.ELECTRICITY_MAPS_API_KEY
        },
        timeout: 5000
      }
    );

    res.json({
      success: true,
      ...response.data
    });

  } catch (error) {
    console.error('Error fetching forecast:', error.message);

    res.status(500).json({
      success: false,
      error: 'Error al obtener pronóstico',
      details:
        process.env.NODE_ENV === 'development'
          ? error.response?.data || error.message
          : undefined
    });
  }
});


// ===============================
// POWER BREAKDOWN
// ===============================
router.get('/power-breakdown/latest', async (req, res) => {
  try {
    const { zone = DEFAULT_ZONE } = req.query;

    const response = await axios.get(
      `${API_BASE_URL}/power-breakdown/latest?zone=${zone}`,
      {
        headers: {
          'auth-token': process.env.ELECTRICITY_MAPS_API_KEY
        },
        timeout: 5000
      }
    );

    res.json({
      success: true,
      zone: response.data.zone,
      renewablePercentage: response.data.renewablePercentage || 0,
      fossilFreePercentage: response.data.fossilFreePercentage || 0,
      breakdown: response.data.powerProductionBreakdown || {},
      datetime: response.data.datetime,
      updatedAt: response.data.updatedAt || new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching power breakdown:', error.message);

    res.status(500).json({
      success: false,
      error: 'Error al obtener mix energético',
      details:
        process.env.NODE_ENV === 'development'
          ? error.response?.data || error.message
          : undefined
    });
  }
});

module.exports = router;

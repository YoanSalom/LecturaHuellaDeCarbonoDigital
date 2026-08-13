import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format, parseISO } from 'date-fns';

// Registrar componentes de Chart.js
Chart.register(...registerables);

const RealtimeView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/elec24');
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`La API respondió con: ${text.substring(0, 100)}...`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Datos inválidos');
      }
      
      setData(result);
    } catch (err) {
      setError(`Error: ${err.message}. ¿Está conectado a la api?`);
      console.error("Error completo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // Actualiza cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (chartRef.current.chart) {
      chartRef.current.chart.destroy();
    }

    // Preparar datos para el gráfico (solo intensidad de CO₂)
    const chartData = {
      labels: data.data.map(item => format(parseISO(item.datetime), 'HH:mm')),
      datasets: [
        {
          label: 'Intensidad de Carbono (gCO₂eq/kWh) de las ultimas 24 horas',
          data: data.data.map(item => item.carbonIntensity),
          borderColor: '#3a86ff',
          backgroundColor: 'rgba(58, 134, 255, 0.2)',
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }
      ]
    };

    // Crear gráfico
    chartRef.current.chart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y} gCO₂eq/kWh`;
              },
              footer: (items) => {
                if (data.isSimulated) {
                  return '\n⚠️ Datos simulados (la API no respondió)';
                }
                return items[0].raw.isEstimated ? '\nℹ️ Dato estimado' : '';
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Hora del día',
              color: '#666'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'gCO₂eq/kWh',
              color: '#666'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            min: 0 // Empezar el eje Y desde 0
          }
        }
      }
    });

    return () => {
      if (chartRef.current?.chart) {
        chartRef.current.chart.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        color: '#2c3e50', 
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        Intensidad de Carbono - Últimas 24 horas
      </h1>
      
      {error && (
        <div style={{ 
          color: '#e74c3c',
          padding: '10px',
          backgroundColor: '#fadbd8',
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <div style={{ 
        position: 'relative', 
        height: '500px', // Altura aumentada
        width: '100%',
        marginBottom: '20px'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666'
          }}>
            Cargando datos de intensidad de carbono...
          </div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>

      {data?.isSimulated && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          ⚠️ Actualmente mostrando datos simulados
        </div>
      )}

      <div style={{ 
        marginTop: '10px', 
        fontSize: '0.8em', 
        color: '#666',
        textAlign: 'center'
      }}>
        Última actualización: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : '--'}
        {data?.cached && ' (Datos en caché)'}
      </div>
    </div>
  );
};

export default RealtimeView;
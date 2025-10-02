import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const EstadisticasSala = () => {
  const [salas, setSalas] = useState([]);
  const [selectedSala, setSelectedSala] = useState('');
  const [stats, setStats] = useState(null);
  const [carbonData, setCarbonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);

  // Fetch salas
  useEffect(() => {
    const fetchSalas = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/salas');
        const data = await response.json();
        setSalas(data);
        if (data.length > 0) setSelectedSala(data[0].id);
      } catch (err) {
        console.error("Error fetching rooms:", err);
      }
    };
    
    fetchSalas();
  }, []);

  // Fetch carbon data
  useEffect(() => {
    const fetchCarbonData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/electricity/csv-data?range=daily');
        const data = await response.json();
        setCarbonData(data);
      } catch (err) {
        console.error("Error fetching carbon data:", err);
      }
    };
    
    fetchCarbonData();
  }, []);

  // Fetch estadísticas de sala
  useEffect(() => {
    if (!selectedSala) return;
    
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/estadisticas-sala/${selectedSala}`);
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [selectedSala]);

  // Actualizar gráfico
  useEffect(() => {
    if (!stats || !carbonData.length || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    
    if (chartRef.current.chart) {
      chartRef.current.chart.destroy();
    }

    // Calcular porcentajes basados en datos de carbono
    const carbonIntensity = carbonData.reduce((sum, item) => sum + item.carbonIntensity, 0) / carbonData.length;
    const actualEmissions = (stats.consumo_total_watts / 1000) * (carbonIntensity / 1000); // kWh * kgCO2e/kWh

    chartRef.current.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Consumo (kWh)', 'Emisiones (kgCO₂e)'],
        datasets: [{
          data: [stats.consumo_total_watts / 1000, actualEmissions],
          backgroundColor: ['#36a2eb', '#ff6384'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }, [stats, carbonData]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Estadísticas de Sala</h1>
      
      <div style={{ margin: '20px 0' }}>
        <select
          value={selectedSala}
          onChange={(e) => setSelectedSala(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', minWidth: '300px' }}
        >
          {salas.map(sala => (
            <option key={sala.id} value={sala.id}>
              {sala.nombre} - {sala.edificio}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Cargando estadísticas...</p>
      ) : stats ? (
        <>
          <div style={{ height: '400px', width: '100%' }}>
            <canvas ref={chartRef} />
          </div>
          
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <h3>Consumo Energético</h3>
              <p><strong>Total:</strong> {(stats.consumo_total_watts / 1000).toFixed(2)} kWh</p>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <h3>Emisiones de CO₂</h3>
              <p><strong>Estimadas:</strong> {((stats.consumo_total_watts / 1000) * (carbonData[0]?.carbonIntensity / 1000)).toFixed(2)} kgCO₂e</p>
            </div>
          </div>
        </>
      ) : (
        <p>No hay datos disponibles para esta sala.</p>
      )}
    </div>
  );
};

export default EstadisticasSala;
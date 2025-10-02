import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const Pestaña2 = () => {
  // Estados
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [timeRange, setTimeRange] = useState('hourly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    consumption: [],
    emissions: [],
    tableData: [],
    totals: { totalConsumption: 0, totalEmissions: 0, avgIntensity: 0 }
  });

  // Referencias para los gráficos
  const consumptionChartRef = useRef(null);
  const emissionsChartRef = useRef(null);
  const consumptionChart = useRef(null);
  const emissionsChart = useRef(null);

  // Cargar dispositivos al iniciar
 useEffect(() => {
    const fetchData = async () => {
      if (!selectedDevice) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // 1. Obtener cálculo desde el backend
        const response = await fetch(`http://localhost:3001/api/estadisticas/dispositivo/${selectedDevice}?fecha=${selectedDate}&rango=${timeRange}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error en el cálculo');
        }

        const resultado = await response.json();

        // Verificar y normalizar los datos recibidos
        const details = Array.isArray(resultado.data?.details) ? resultado.data.details : [];
        const totals = resultado.data?.totals || {
          totalConsumption: 0,
          totalEmissions: 0,
          avgIntensity: 0
        };

        setChartData({
          labels: details.map(item => item.hora || ''),
          consumption: details.map(item => item.consumoKwh || 0),
          emissions: details.map(item => item.emisionesKgCO2e || 0),
          tableData: details,
          totals
        });

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDevice, selectedDate, timeRange]);

  // Cargar y procesar datos cuando cambian los filtros
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDevice) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // 1. Obtener cálculo desde el backend
        const response = await fetch('http://localhost:3001/api/estadisticas/dispositivo/' + selectedDevice, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fecha: selectedDate,
            rango: timeRange
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error en el cálculo');
        }

        const resultado = await response.json();

        // 2. Actualizar estado con los datos recibidos
        setChartData({
          labels: resultado.data.details.map(item => item.hora),
          consumption: resultado.data.details.map(item => item.consumoKwh),
          emissions: resultado.data.details.map(item => item.emisionesKgCO2e),
          tableData: resultado.data.details,
          totals: {
            totalConsumption: resultado.data.totalConsumption,
            totalEmissions: resultado.data.totalEmissions,
            avgIntensity: resultado.data.avgIntensity
          }
        });

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedDevice, selectedDate, timeRange]);

  // Inicializar/actualizar gráficos
  useEffect(() => {
    if (chartData.labels.length === 0) return;

    // Destruir gráficos existentes
    if (consumptionChart.current) consumptionChart.current.destroy();
    if (emissionsChart.current) emissionsChart.current.destroy();

    // Gráfico de Consumo (Barras)
    if (consumptionChartRef.current) {
      consumptionChart.current = new Chart(consumptionChartRef.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Consumo (kWh)',
            data: chartData.consumption,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Consumo (kWh)' } },
            x: { title: { display: true, text: 'Horario' } }
          }
        }
      });
    }

    // Gráfico de Emisiones (Línea)
    if (emissionsChartRef.current) {
      emissionsChart.current = new Chart(emissionsChartRef.current.getContext('2d'), {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Emisiones (kgCO₂e)',
            data: chartData.emissions,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            tension: 0.1,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Emisiones (kgCO₂e)' } },
            x: { title: { display: true, text: 'Horario' } }
          }
        }
      });
    }

    return () => {
      if (consumptionChart.current) consumptionChart.current.destroy();
      if (emissionsChart.current) emissionsChart.current.destroy();
    };
  }, [chartData]);

  // Manejar cambio de fecha
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Cálculo de Emisiones por Consumo Estimado</h1>
      
      {/* Panel de controles */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dispositivo:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', width: '100%' }}
            disabled={isLoading}
          >
            {devices.map(device => (
              <option key={device.id} value={device.id}>
                {device.nombre_modelo} ({device.tipo})
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fecha:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            style={{ padding: '9px', borderRadius: '4px', width: '100%' }}
            disabled={isLoading}
          />
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rango:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', width: '100%' }}
            disabled={isLoading}
          >
            <option value="hourly">Por hora</option>
            <option value="daily">Diario</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ color: 'red', margin: '20px 0', padding: '15px', backgroundColor: '#ffeeee' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Consumo Energético</h3>
          <div style={{ height: '400px', position: 'relative' }}>
            {isLoading ? (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                Cargando datos...
              </div>
            ) : (
              <canvas ref={consumptionChartRef} />
            )}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Emisiones de CO₂</h3>
          <div style={{ height: '400px', position: 'relative' }}>
            {isLoading ? (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                Cargando datos...
              </div>
            ) : (
              <canvas ref={emissionsChartRef} />
            )}
          </div>
        </div>
      </div>

      {/* Tabla de resultados */}
      {!isLoading && chartData.tableData.length > 0 && (
        <div style={{ marginTop: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Detalle de Consumo y Emisiones</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>Horario</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>Estado</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>Consumo (kWh)</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>Emisiones (kgCO₂e)</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>Intensidad CO₂ (g/kWh)</th>
                </tr>
              </thead>
              <tbody>
                {chartData.tableData.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.hora}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.estado}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.consumoKwh.toFixed(4)}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.emisionesKgCO2e.toFixed(6)}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.carbonIntensity.toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ padding: '12px', border: '1px solid #ddd' }}>Totales:</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{chartData.totals.totalConsumption.toFixed(4)} kWh</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{chartData.totals.totalEmissions.toFixed(6)} kgCO₂e</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{chartData.totals.avgIntensity.toFixed(2)} g/kWh</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pestaña2;
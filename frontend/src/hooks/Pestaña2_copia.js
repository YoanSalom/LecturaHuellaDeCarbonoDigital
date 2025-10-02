mport React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const Pestaña2 = () => {
  // Estados
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [timeRange, setTimeRange] = useState('hourly');
  const [selectedDate, setSelectedDate] = useState('2024-01-08'); // Fecha inicial dentro de 2024
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    consumption: [],
    emissions: [],
    tableData: []
  });

  // Referencias para los gráficos
  const consumptionChartRef = useRef(null);
  const emissionsChartRef = useRef(null);
  const consumptionChart = useRef(null);
  const emissionsChart = useRef(null);

  // Validar que la fecha esté en 2024
  const validateDate = (dateString) => {
    const date = new Date(dateString);
    return date.getFullYear() === 2024;
  };

  // Cargar dispositivos
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/dispositivos');
        if (!response.ok) throw new Error('Error al cargar dispositivos');
        const data = await response.json();
        setDevices(data);
        if (data.length > 0) setSelectedDevice(data[0].id);
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError("Error cargando dispositivos");
      }
    };
    fetchDevices();
  }, []);

  // Cargar y procesar datos
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDevice || !validateDate(selectedDate)) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // 1. Obtener horarios del dispositivo
        const horariosResponse = await fetch(
          `http://localhost:3001/api/horarios/${selectedDevice}?fecha=${selectedDate}`
        );
        if (!horariosResponse.ok) throw new Error(await horariosResponse.text());
        const horarios = await horariosResponse.json();

        // 2. Obtener datos de carbono (solo 2024)
        let carbonUrl = `http://localhost:3001/api/electricity/csv-data?range=hourly&year=2024`;
        if (timeRange === 'hourly') carbonUrl += `&date=${selectedDate}`;
        if (timeRange === 'daily') {
          const [year, month] = selectedDate.split('-');
          carbonUrl += `&year=2024&month=${month}`;
        }
        
        const carbonResponse = await fetch(carbonUrl);
        if (!carbonResponse.ok) throw new Error('Error al cargar datos de carbono');
        const carbonData = await carbonResponse.json();

        // 3. Procesar datos
        const processedData = horarios.map(horario => {
          const startHour = parseInt(horario.hora_inicio.split(':')[0]);
          const endHour = parseInt(horario.hora_fin.split(':')[0]);
          const hours = endHour - startHour;
          const watts = horario.estado_esperado === 'Encendido' 
            ? horario.watts_encendido 
            : horario.watts_apagado;
          
          const carbonForPeriod = carbonData.filter(item => {
            const itemHour = new Date(item.datetime).getHours();
            return itemHour >= startHour && itemHour < endHour;
          });
          
          const avgCarbonIntensity = carbonForPeriod.length > 0 
            ? carbonForPeriod.reduce((sum, item) => sum + item.carbonIntensity, 0) / carbonForPeriod.length
            : 0;

          return {
            hora: `${horario.hora_inicio}-${horario.hora_fin}`,
            consumo_watts: watts,
            horas: hours > 0 ? hours : 1,
            consumo_kWh: (watts * (hours > 0 ? hours : 1)) / 1000,
            carbonIntensity: avgCarbonIntensity,
            emisiones_kgCO2e: (avgCarbonIntensity * (watts * (hours > 0 ? hours : 1)) / 1000) / 1000,
            estado: horario.estado_esperado
          };
        });

        // Actualizar estado
        setChartData({
          labels: processedData.map(item => item.hora),
          consumption: processedData.map(item => item.consumo_kWh),
          emissions: processedData.map(item => item.emisiones_kgCO2e),
          tableData: processedData
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

  // Inicializar gráficos
  useEffect(() => {
    if (chartData.labels.length === 0) return;

    // Destruir gráficos existentes
    if (consumptionChart.current) {
      consumptionChart.current.destroy();
    }
    if (emissionsChart.current) {
      emissionsChart.current.destroy();
    }

    // Gráfico de Consumo
    if (consumptionChartRef.current) {
      consumptionChart.current = new Chart(consumptionChartRef.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Consumo Estimado (kWh)',
            data: chartData.consumption,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Consumo (kWh)' } },
            x: { title: { display: true, text: 'Horario' } }
          }
        }
      });
    }

    // Gráfico de Emisiones
    if (emissionsChartRef.current) {
      emissionsChart.current = new Chart(emissionsChartRef.current.getContext('2d'), {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Emisiones Estimadas (kgCO₂e)',
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
          maintainAspectRatio: false,
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

  // Manejar cambio de fecha asegurando que sea 2024
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (new Date(newDate).getFullYear() === 2024) {
      setSelectedDate(newDate);
    } else {
      setError('Solo se permiten fechas del año 2024');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Cálculo de Emisiones por Consumo Estimado (2024)</h1>
      
      <div style={{ 
        margin: '20px 0', 
        display: 'flex', 
        gap: '20px', 
        flexWrap: 'wrap',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dispositivo:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            style={{ 
              padding: '10px', 
              borderRadius: '4px', 
              width: '100%',
              border: '1px solid #ddd'
            }}
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
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fecha (2024):</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min="2024-01-01"
            max="2024-12-31"
            style={{ 
              padding: '9px', 
              borderRadius: '4px', 
              width: '100%',
              border: '1px solid #ddd'
            }}
            disabled={isLoading}
          />
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rango:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ 
              padding: '10px', 
              borderRadius: '4px', 
              width: '100%',
              border: '1px solid #ddd'
            }}
            disabled={isLoading}
          >
            <option value="hourly">Por hora</option>
            <option value="daily">Diario</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          margin: '20px 0', 
          padding: '15px',
          backgroundColor: '#ffeeee',
          borderRadius: '4px',
          border: '1px solid #ffcccc'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        marginTop: '20px'
      }}>
        {/* Gráfico de Consumo */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Consumo Energético</h3>
          <div style={{ height: '400px', position: 'relative' }}>
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                Cargando datos de consumo...
              </div>
            )}
            <canvas 
              ref={consumptionChartRef} 
              style={{ display: isLoading ? 'none' : 'block' }} 
            />
          </div>
        </div>

        {/* Gráfico de Emisiones */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Emisiones de CO₂</h3>
          <div style={{ height: '400px', position: 'relative' }}>
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                Cargando datos de emisiones...
              </div>
            )}
            <canvas 
              ref={emissionsChartRef} 
              style={{ display: isLoading ? 'none' : 'block' }} 
            />
          </div>
        </div>
      </div>

      {/* Tabla de datos detallados */}
{!isLoading && chartData.tableData.length > 0 && (
  <div style={{ 
    marginTop: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }}>
    <h3>Detalle de Consumo y Emisiones</h3>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Horario</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Estado</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Consumo (W)</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Horas</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Consumo (kWh)</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Intensidad CO₂ (g/kWh)</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Emisiones (kgCO₂e)</th>
          </tr>
        </thead>
        <tbody>
          {chartData.tableData.map((item, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.hora}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.estado}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.consumo_watts}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.horas}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.consumo_kWh.toFixed(4)}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.carbonIntensity.toFixed(2)}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.emisiones_kgCO2e.toFixed(6)}</td>
            </tr>
          ))}
          {/* Fila de totales */}
          <tr style={{ backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>
            <td colSpan="4" style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Totales:</td>
            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
              {chartData.tableData.reduce((sum, item) => sum + item.consumo_kWh, 0).toFixed(4)} kWh
            </td>
            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
              {(
                chartData.tableData.reduce((sum, item) => sum + (item.carbonIntensity * item.consumo_kWh), 0) /
                chartData.tableData.reduce((sum, item) => sum + item.consumo_kWh, 0)
              ).toFixed(2)} g/kWh
            </td>
            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
              {chartData.tableData.reduce((sum, item) => sum + item.emisiones_kgCO2e, 0).toFixed(6)} kgCO₂e
            </td>
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
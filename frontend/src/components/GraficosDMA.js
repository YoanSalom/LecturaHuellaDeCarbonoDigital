import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

const GraficosDMA = () => {
  const [dispositivos, setDispositivos] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [lecturas, setLecturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vistaActual, setVistaActual] = useState('dia');
  const [añoSeleccionado, setAñoSeleccionado] = useState('2024');
  const [mesSeleccionado, setMesSeleccionado] = useState('01');
  
  const chartEmisionesEncendidoRef = useRef(null);
  const chartEmisionesApagadoRef = useRef(null);
  const chartConsumoEncendidoRef = useRef(null);
  const chartConsumoApagadoRef = useRef(null);
  
  const API_BASE = 'http://localhost:3001/api';
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const response = await fetch(`${API_BASE}/dispositivos`);
        if (!response.ok) throw new Error('Error al cargar dispositivos');
        const data = await response.json();
        setDispositivos(data);
        if (data.length > 0) {
          setSelectedDevice(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchDispositivos();
  }, []);

  useEffect(() => {
    const fetchLecturas = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/lecturas`);
        if (!response.ok) throw new Error('Error al cargar lecturas');
        const data = await response.json();
        setLecturas(data);
      } catch (err) {
        setError(err.message);
        setLecturas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLecturas();
  }, []);

  const procesarDatos = () => {
    if (lecturas.length === 0) {
      return { labels: [], emisionesEnc: [], emisionesApa: [], consumoEnc: [], consumoApa: [] };
    }

    let lecturasFiltradas = lecturas.filter(lectura => 
      selectedDevice ? lectura.dispositivo_id === selectedDevice : true
    );

    if (vistaActual === 'dia') {
      return procesarVistaDia(lecturasFiltradas);
    } else if (vistaActual === 'mes') {
      return procesarVistaMes(lecturasFiltradas);
    } else {
      return procesarVistaAño(lecturasFiltradas);
    }
  };

  const procesarVistaDia = (lecturasFiltradas) => {
    const año = parseInt(añoSeleccionado);
    const mes = parseInt(mesSeleccionado) - 1;
    
    const diasDelMes = new Date(año, mes + 1, 0).getDate();
    const labels = [];
    const emisionesEnc = Array(diasDelMes).fill(0);
    const emisionesApa = Array(diasDelMes).fill(0);
    const consumoEnc = Array(diasDelMes).fill(0);
    const consumoApa = Array(diasDelMes).fill(0);

    lecturasFiltradas.forEach(lectura => {
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      if (fecha.getFullYear() === año && fecha.getMonth() === mes) {
        const dia = fecha.getDate() - 1;
        if (dia >= 0 && dia < diasDelMes) {
          const emisiones = parseFloat(lectura.emisiones_kgco2) || 0;
          const consumo = parseFloat(lectura.consumo_kwh) || 0;
          
          if (lectura.estado === 'Encendido') {
            emisionesEnc[dia] += emisiones;
            consumoEnc[dia] += consumo;
          } else {
            emisionesApa[dia] += emisiones;
            consumoApa[dia] += consumo;
          }
        }
      }
    });

    for (let dia = 1; dia <= diasDelMes; dia++) {
      labels.push(`Día ${dia}`);
    }

    return { labels, emisionesEnc, emisionesApa, consumoEnc, consumoApa };
  };

  const procesarVistaMes = (lecturasFiltradas) => {
    const año = parseInt(añoSeleccionado);
    const labels = mesesNombres;
    const emisionesEnc = Array(12).fill(0);
    const emisionesApa = Array(12).fill(0);
    const consumoEnc = Array(12).fill(0);
    const consumoApa = Array(12).fill(0);

    lecturasFiltradas.forEach(lectura => {
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      if (fecha.getFullYear() === año) {
        const mes = fecha.getMonth();
        const emisiones = parseFloat(lectura.emisiones_kgco2) || 0;
        const consumo = parseFloat(lectura.consumo_kwh) || 0;
        
        if (lectura.estado === 'Encendido') {
          emisionesEnc[mes] += emisiones;
          consumoEnc[mes] += consumo;
        } else {
          emisionesApa[mes] += emisiones;
          consumoApa[mes] += consumo;
        }
      }
    });

    return { labels, emisionesEnc, emisionesApa, consumoEnc, consumoApa };
  };

  const procesarVistaAño = (lecturasFiltradas) => {
    const añosMap = new Map();
    
    lecturasFiltradas.forEach(lectura => {
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      const año = fecha.getFullYear();
      
      if (!añosMap.has(año)) {
        añosMap.set(año, {
          emisionesEnc: 0,
          emisionesApa: 0,
          consumoEnc: 0,
          consumoApa: 0
        });
      }
      
      const datosAño = añosMap.get(año);
      const emisiones = parseFloat(lectura.emisiones_kgco2) || 0;
      const consumo = parseFloat(lectura.consumo_kwh) || 0;
      
      if (lectura.estado === 'Encendido') {
        datosAño.emisionesEnc += emisiones;
        datosAño.consumoEnc += consumo;
      } else {
        datosAño.emisionesApa += emisiones;
        datosAño.consumoApa += consumo;
      }
    });

    const añosOrdenados = Array.from(añosMap.keys()).sort();
    const labels = añosOrdenados.map(año => año.toString());
    const emisionesEnc = añosOrdenados.map(año => añosMap.get(año).emisionesEnc);
    const emisionesApa = añosOrdenados.map(año => añosMap.get(año).emisionesApa);
    const consumoEnc = añosOrdenados.map(año => añosMap.get(año).consumoEnc);
    const consumoApa = añosOrdenados.map(año => añosMap.get(año).consumoApa);

    return { labels, emisionesEnc, emisionesApa, consumoEnc, consumoApa };
  };

  const datosGrafico = procesarDatos();

  const calcularResumen = () => {
    const totalEmisionesEnc = datosGrafico.emisionesEnc.reduce((a, b) => a + b, 0);
    const totalEmisionesApa = datosGrafico.emisionesApa.reduce((a, b) => a + b, 0);
    const totalConsumoEnc = datosGrafico.consumoEnc.reduce((a, b) => a + b, 0);
    const totalConsumoApa = datosGrafico.consumoApa.reduce((a, b) => a + b, 0);

    return {
      totalEmisionesEnc: totalEmisionesEnc.toFixed(2),
      totalEmisionesApa: totalEmisionesApa.toFixed(2),
      totalConsumoEnc: totalConsumoEnc.toFixed(2),
      totalConsumoApa: totalConsumoApa.toFixed(2),
      totalEmisiones: (totalEmisionesEnc + totalEmisionesApa).toFixed(2),
      totalConsumo: (totalConsumoEnc + totalConsumoApa).toFixed(2)
    };
  };

  const resumen = calcularResumen();

  useEffect(() => {
    crearGrafico(chartEmisionesEncendidoRef, 'Emisiones Encendido (kg CO₂)', datosGrafico.emisionesEnc, 'rgba(255, 99, 132, 0.6)', 'rgb(255, 99, 132)', 'kg CO₂');
  }, [datosGrafico]);

  useEffect(() => {
    crearGrafico(chartEmisionesApagadoRef, 'Emisiones Apagado (kg CO₂)', datosGrafico.emisionesApa, 'rgba(255, 159, 64, 0.6)', 'rgb(255, 159, 64)', 'kg CO₂');
  }, [datosGrafico]);

  useEffect(() => {
    crearGrafico(chartConsumoEncendidoRef, 'Consumo Encendido (kWh)', datosGrafico.consumoEnc, 'rgba(54, 162, 235, 0.6)', 'rgb(54, 162, 235)', 'kWh');
  }, [datosGrafico]);

  useEffect(() => {
    crearGrafico(chartConsumoApagadoRef, 'Consumo Apagado (kWh)', datosGrafico.consumoApa, 'rgba(75, 192, 192, 0.6)', 'rgb(75, 192, 192)', 'kWh');
  }, [datosGrafico]);

  const crearGrafico = (chartRef, label, data, backgroundColor, borderColor, yAxisLabel) => {
    if (!chartRef.current || datosGrafico.labels.length === 0) return;

    const ctx = chartRef.current.getContext('2d');
    
    if (chartRef.current.chart) {
      chartRef.current.chart.destroy();
    }

    chartRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datosGrafico.labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: yAxisLabel
            }
          }
        }
      }
    });
  };

  const getTitle = () => {
    if (!selectedDevice) return 'Seleccione un dispositivo';
    const dispositivo = dispositivos.find(d => d.id === selectedDevice);
    return `Análisis de: ${dispositivo ? dispositivo.nombre_modelo : ''}`;
  };

  const getPeriodoTexto = () => {
    if (vistaActual === 'dia') {
      return `${mesesNombres[parseInt(mesSeleccionado) - 1]} ${añoSeleccionado}`;
    } else if (vistaActual === 'mes') {
      return `Año ${añoSeleccionado}`;
    } else {
      return 'Todos los años';
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h1>{getTitle()}</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {dispositivos.map(device => (
            <option key={device.id} value={device.id}>
              {device.nombre_modelo} ({device.sala_nombre})
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '5px', backgroundColor: '#f0f0f0', padding: '4px', borderRadius: '6px' }}>
          <button
            onClick={() => setVistaActual('dia')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: vistaActual === 'dia' ? '#4CAF50' : 'transparent',
              color: vistaActual === 'dia' ? 'white' : '#333',
              fontWeight: vistaActual === 'dia' ? 'bold' : 'normal'
            }}
          >
            Por Día
          </button>
          <button
            onClick={() => setVistaActual('mes')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: vistaActual === 'mes' ? '#4CAF50' : 'transparent',
              color: vistaActual === 'mes' ? 'white' : '#333',
              fontWeight: vistaActual === 'mes' ? 'bold' : 'normal'
            }}
          >
            Por Mes
          </button>
          <button
            onClick={() => setVistaActual('año')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: vistaActual === 'año' ? '#4CAF50' : 'transparent',
              color: vistaActual === 'año' ? 'white' : '#333',
              fontWeight: vistaActual === 'año' ? 'bold' : 'normal'
            }}
          >
            Por Año
          </button>
        </div>

        {(vistaActual === 'dia' || vistaActual === 'mes') && (
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        )}

        {vistaActual === 'dia' && (
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {mesesNombres.map((mes, idx) => (
              <option key={idx} value={(idx + 1).toString().padStart(2, '0')}>
                {mes}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ 
        marginBottom: '20px', 
        padding: '15px',
        backgroundColor: '#e8f5e9',
        borderRadius: '8px',
        border: '2px solid #4CAF50'
      }}>
        <h3 style={{ marginTop: 0, color: '#2e7d32' }}>
          Resumen del periodo: {getPeriodoTexto()}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '10px' }}>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Emisiones Encendido</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>
              {resumen.totalEmisionesEnc} kg CO₂
            </div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Emisiones Apagado</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f57c00' }}>
              {resumen.totalEmisionesApa} kg CO₂
            </div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Emisiones Totales</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c62828' }}>
              {resumen.totalEmisiones} kg CO₂
            </div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Consumo Encendido</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
              {resumen.totalConsumoEnc} kWh
            </div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Consumo Apagado</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00796b' }}>
              {resumen.totalConsumoApa} kWh
            </div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Consumo Total</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0277bd' }}>
              {resumen.totalConsumo} kWh
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Cargando datos...</p>
      ) : datosGrafico.labels.length === 0 ? (
        <p>No hay datos disponibles para la selección actual</p>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '15px',
            backgroundColor: '#fff'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Emisiones Encendido</h3>
            <div style={{ height: '300px' }}>
              <canvas ref={chartEmisionesEncendidoRef} />
            </div>
          </div>
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '15px',
            backgroundColor: '#fff'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Emisiones Apagado</h3>
            <div style={{ height: '300px' }}>
              <canvas ref={chartEmisionesApagadoRef} />
            </div>
          </div>
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '15px',
            backgroundColor: '#fff'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Consumo Encendido</h3>
            <div style={{ height: '300px' }}>
              <canvas ref={chartConsumoEncendidoRef} />
            </div>
          </div>
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '15px',
            backgroundColor: '#fff'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Consumo Apagado</h3>
            <div style={{ height: '300px' }}>
              <canvas ref={chartConsumoApagadoRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraficosDMA;
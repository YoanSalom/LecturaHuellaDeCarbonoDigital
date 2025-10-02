import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
Chart.register(...registerables);

const Pestaña3 = () => {
  const [dispositivos, setDispositivos] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [lecturas, setLecturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vistaActual, setVistaActual] = useState('dia');
  const [añoSeleccionado, setAñoSeleccionado] = useState('2024');
  const [mesSeleccionado, setMesSeleccionado] = useState('01');
  const [diaSeleccionado, setDiaSeleccionado] = useState('01');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('encendido');
  
  const chartEmisionesHorariosRef = useRef(null);
  const chartConsumoHorariosRef = useRef(null);
  const chartEmisionesRef = useRef(null);
  const chartConsumoRef = useRef(null);
  
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

  const procesarDatosHorarios = () => {
    if (lecturas.length === 0) return { labels: [], emisiones: [], consumo: [], horas: [], estados: [] };

    const año = parseInt(añoSeleccionado);
    const mes = parseInt(mesSeleccionado);
    const dia = parseInt(diaSeleccionado);

    const lecturasDia = lecturas.filter(lectura => {
      if (selectedDevice && lectura.dispositivo_id !== selectedDevice) return false;
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      return fecha.getFullYear() === año && 
             fecha.getMonth() + 1 === mes && 
             fecha.getDate() === dia;
    });

    lecturasDia.sort((a, b) => a.horario.localeCompare(b.horario));

    return {
      labels: lecturasDia.map(l => l.horario),
      emisiones: lecturasDia.map(l => parseFloat(l.emisiones_kgco2) || 0),
      consumo: lecturasDia.map(l => parseFloat(l.consumo_kwh) || 0),
      estados: lecturasDia.map(l => l.estado),
      horas: lecturasDia.map(l => parseInt(l.horas) || 0)
    };
  };

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
        añosMap.set(año, { emisionesEnc: 0, emisionesApa: 0, consumoEnc: 0, consumoApa: 0 });
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
  const datosHorarios = procesarDatosHorarios();

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

  const calcularResumenHorarios = () => {
    const totalEmisiones = datosHorarios.emisiones.reduce((a, b) => a + b, 0);
    const totalConsumo = datosHorarios.consumo.reduce((a, b) => a + b, 0);
    const totalHoras = datosHorarios.horas.reduce((a, b) => a + b, 0);
    
    const horasEncendido = datosHorarios.estados.reduce((acc, estado, idx) => 
      estado === 'Encendido' ? acc + datosHorarios.horas[idx] : acc, 0
    );
    const horasApagado = totalHoras - horasEncendido;

    return {
      totalEmisiones: totalEmisiones.toFixed(2),
      totalConsumo: totalConsumo.toFixed(2),
      totalHoras: totalHoras,
      horasEncendido: horasEncendido,
      horasApagado: horasApagado,
      porcentajeEncendido: totalHoras > 0 ? ((horasEncendido / totalHoras) * 100).toFixed(1) : 0
    };
  };

  const resumen = calcularResumen();
  const resumenHorarios = calcularResumenHorarios();

  useEffect(() => {
    if (!chartEmisionesHorariosRef.current || datosHorarios.labels.length === 0) return;
    
    const ctx = chartEmisionesHorariosRef.current.getContext('2d');
    if (chartEmisionesHorariosRef.current.chart) {
      chartEmisionesHorariosRef.current.chart.destroy();
    }

    const colores = datosHorarios.estados.map(estado => 
      estado === 'Encendido' ? 'rgba(255, 99, 132, 0.6)' : 'rgba(255, 159, 64, 0.6)'
    );

    chartEmisionesHorariosRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datosHorarios.labels,
        datasets: [{
          label: 'Emisiones (kg CO₂)',
          data: datosHorarios.emisiones,
          backgroundColor: colores,
          borderColor: colores.map(c => c.replace('0.6', '1')),
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const idx = context.dataIndex;
                return [
                  `Emisiones: ${context.parsed.y.toFixed(2)} kg CO₂`,
                  `Estado: ${datosHorarios.estados[idx]}`,
                  `Horas: ${datosHorarios.horas[idx]}h`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'kg CO₂' }
          }
        }
      }
    });
  }, [datosHorarios]);

  useEffect(() => {
    if (!chartConsumoHorariosRef.current || datosHorarios.labels.length === 0) return;
    
    const ctx = chartConsumoHorariosRef.current.getContext('2d');
    if (chartConsumoHorariosRef.current.chart) {
      chartConsumoHorariosRef.current.chart.destroy();
    }

    const colores = datosHorarios.estados.map(estado => 
      estado === 'Encendido' ? 'rgba(54, 162, 235, 0.6)' : 'rgba(75, 192, 192, 0.6)'
    );

    chartConsumoHorariosRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datosHorarios.labels,
        datasets: [{
          label: 'Consumo (kWh)',
          data: datosHorarios.consumo,
          backgroundColor: colores,
          borderColor: colores.map(c => c.replace('0.6', '1')),
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const idx = context.dataIndex;
                return [
                  `Consumo: ${context.parsed.y.toFixed(4)} kWh`,
                  `Estado: ${datosHorarios.estados[idx]}`,
                  `Horas: ${datosHorarios.horas[idx]}h`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'kWh' }
          }
        }
      }
    });
  }, [datosHorarios]);

  useEffect(() => {
    const datosEmisiones = estadoSeleccionado === 'encendido' ? datosGrafico.emisionesEnc : datosGrafico.emisionesApa;
    const colorEmisiones = estadoSeleccionado === 'encendido' ? 'rgba(255, 99, 132, 0.6)' : 'rgba(255, 159, 64, 0.6)';
    const labelEmisiones = estadoSeleccionado === 'encendido' ? 'Encendido' : 'Apagado';
    
    crearGrafico(chartEmisionesRef, 'Emisiones por Estado', 
      [datosEmisiones], 
      [labelEmisiones],
      [colorEmisiones], 
      'kg CO₂');
  }, [datosGrafico, estadoSeleccionado]);

  useEffect(() => {
    const datosConsumo = estadoSeleccionado === 'encendido' ? datosGrafico.consumoEnc : datosGrafico.consumoApa;
    const colorConsumo = estadoSeleccionado === 'encendido' ? 'rgba(54, 162, 235, 0.6)' : 'rgba(75, 192, 192, 0.6)';
    const labelConsumo = estadoSeleccionado === 'encendido' ? 'Encendido' : 'Apagado';
    
    crearGrafico(chartConsumoRef, 'Consumo por Estado', 
      [datosConsumo], 
      [labelConsumo],
      [colorConsumo], 
      'kWh');
  }, [datosGrafico, estadoSeleccionado]);

  const crearGrafico = (chartRef, label, dataArrays, labelNames, backgroundColor, yAxisLabel) => {
    if (!chartRef.current || datosGrafico.labels.length === 0) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (chartRef.current.chart) {
      chartRef.current.chart.destroy();
    }

    const datasets = dataArrays.map((data, idx) => ({
      label: labelNames[idx],
      data: data,
      backgroundColor: backgroundColor[idx],
      borderColor: backgroundColor[idx].replace('0.6', '1'),
      borderWidth: 2,
    }));

    chartRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datosGrafico.labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
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
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 },
            stacked: false
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: yAxisLabel },
            stacked: false
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

  const diasDelMes = new Date(parseInt(añoSeleccionado), parseInt(mesSeleccionado), 0).getDate();

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
            onClick={() => setVistaActual('horarios')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: vistaActual === 'horarios' ? '#4CAF50' : 'transparent',
              color: vistaActual === 'horarios' ? 'white' : '#333',
              fontWeight: vistaActual === 'horarios' ? 'bold' : 'normal'
            }}
          >
            Por Horarios
          </button>
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

        {vistaActual !== 'horarios' && (
          <div style={{ display: 'flex', gap: '5px', backgroundColor: '#e3f2fd', padding: '4px', borderRadius: '6px' }}>
            <button
              onClick={() => setEstadoSeleccionado('encendido')}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: estadoSeleccionado === 'encendido' ? '#2196F3' : 'transparent',
                color: estadoSeleccionado === 'encendido' ? 'white' : '#333',
                fontWeight: estadoSeleccionado === 'encendido' ? 'bold' : 'normal'
              }}
            >
              Encendido
            </button>
            <button
              onClick={() => setEstadoSeleccionado('apagado')}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: estadoSeleccionado === 'apagado' ? '#2196F3' : 'transparent',
                color: estadoSeleccionado === 'apagado' ? 'white' : '#333',
                fontWeight: estadoSeleccionado === 'apagado' ? 'bold' : 'normal'
              }}
            >
              Apagado
            </button>
          </div>
        )}

        {(vistaActual === 'dia' || vistaActual === 'mes' || vistaActual === 'horarios') && (
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        )}

        {(vistaActual === 'dia' || vistaActual === 'horarios') && (
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

        {vistaActual === 'horarios' && (
          <select
            value={diaSeleccionado}
            onChange={(e) => setDiaSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {[...Array(diasDelMes)].map((_, idx) => (
              <option key={idx} value={(idx + 1).toString().padStart(2, '0')}>
                Día {idx + 1}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {vistaActual === 'horarios' ? (
        <>
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            border: '2px solid #2196F3'
          }}>
            <h3 style={{ marginTop: 0, color: '#1565c0' }}>
              Resumen del día: {diaSeleccionado}/{mesSeleccionado}/{añoSeleccionado}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Emisiones Totales</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>
                  {resumenHorarios.totalEmisiones} kg CO₂
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Consumo Total</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
                  {resumenHorarios.totalConsumo} kWh
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Horas Totales</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#388e3c' }}>
                  {resumenHorarios.totalHoras} h
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Horas Encendido</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>
                  {resumenHorarios.horasEncendido} h
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Horas Apagado</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f57c00' }}>
                  {resumenHorarios.horasApagado} h
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>% Tiempo Encendido</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7b1fa2' }}>
                  {resumenHorarios.porcentajeEncendido}%
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <p>Cargando datos...</p>
          ) : datosHorarios.labels.length === 0 ? (
            <p>No hay datos disponibles para este día</p>
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
                <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Emisiones por Franja Horaria</h3>
                <div style={{ height: '350px' }}>
                  <canvas ref={chartEmisionesHorariosRef} />
                </div>
              </div>
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                backgroundColor: '#fff'
              }}>
                <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Consumo por Franja Horaria</h3>
                <div style={{ height: '350px' }}>
                  <canvas ref={chartConsumoHorariosRef} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
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
                <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>
                  Emisiones {estadoSeleccionado === 'encendido' ? 'Encendido' : 'Apagado'}
                </h3>
                <div style={{ height: '300px' }}>
                  <canvas ref={chartEmisionesRef} />
                </div>
              </div>
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                backgroundColor: '#fff'
              }}>
                <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>
                  Consumo {estadoSeleccionado === 'encendido' ? 'Encendido' : 'Apagado'}
                </h3>
                <div style={{ height: '300px' }}>
                  <canvas ref={chartConsumoRef} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Pestaña3;
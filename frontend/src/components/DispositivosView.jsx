import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { generarReporteDispositivo } from '../utils/pdfGenerator';

Chart.register(...registerables);

const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const DispositivosView = () => {
  const navigate = useNavigate();
  const { dispositivoId: rawParam } = useParams();
  const dispositivoId = rawParam ? `D-${String(rawParam).padStart(4, '0')}` : null;
  
  const [dispositivos, setDispositivos] = useState([]);
  const [salas, setSalas] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [lecturas, setLecturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vistaActual, setVistaActual] = useState('mes');
  const [añoSeleccionado, setAñoSeleccionado] = useState('2024');
  const [mesSeleccionado, setMesSeleccionado] = useState('01');
  const [diaSeleccionado, setDiaSeleccionado] = useState('01');
  
  const chartEmisionesEncendidoRef = useRef(null);
  const chartEmisionesApagadoRef = useRef(null);
  const chartConsumoEncendidoRef = useRef(null);
  const chartConsumoApagadoRef = useRef(null);
  const chartTraficoRef = useRef(null);
  const chartEmisionesDigitalesRef = useRef(null);
  
  const API_BASE = 'http://localhost:3001/api';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, salasRes] = await Promise.all([
          fetch(`${API_BASE}/dispositivos`).then((res) => res.json()),
          fetch(`${API_BASE}/salas`).then((res) => res.json()),
        ]);
        setDispositivos(data.data || []);
        setSalas(salasRes.data || []);
        
        if (dispositivoId && data.data.some(d => d.id === dispositivoId)) {
          setSelectedDevice(dispositivoId);
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar dispositivos y salas");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dispositivoId]);

  useEffect(() => {
    const fetchLecturas = async () => {
      if (!selectedDevice) {
        setLecturas([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let url = `${API_BASE}/lecturas?dispositivo=${selectedDevice}`;
        
        if (vistaActual !== 'año') {
          url += `&año=${añoSeleccionado}`;
        }
        
        if (vistaActual === 'hora') {
          url += `&mes=${mesSeleccionado}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar lecturas');
        
        const json = await response.json(); 
        setLecturas(json.data || []);
      } catch (err) {
        setError(err.message);
        setLecturas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLecturas();
  }, [selectedDevice, añoSeleccionado, mesSeleccionado, vistaActual]);

  const procesarVistaHora = useCallback((lecturasFiltradas) => {
    const año = parseInt(añoSeleccionado);
    const mes = parseInt(mesSeleccionado) - 1;
    const dia = parseInt(diaSeleccionado);
    
    const fechaObjetivo = new Date(año, mes, dia);
    const fechaStr = fechaObjetivo.toISOString().split('T')[0];
    
    const lecturasDia = lecturasFiltradas.filter(l => l.fecha === fechaStr);
    
    const labels = [];
    const emisionesEnc = Array(24).fill(0);
    const emisionesApa = Array(24).fill(0);
    const consumoEnc = Array(24).fill(0);
    const consumoApa = Array(24).fill(0);
    const trafico = Array(24).fill(0);
    const emisionesDigitales = Array(24).fill(0);
    
    for (let h = 0; h < 24; h++) {
      labels.push(`${h.toString().padStart(2, '0')}:00`);
    }
    
    lecturasDia.forEach(lectura => {
      const horaInicio = lectura.hora_inicio ? parseInt(lectura.hora_inicio.split(':')[0]) : 0;
      const horaFin = lectura.hora_fin ? parseInt(lectura.hora_fin.split(':')[0]) : 0;
      const horas = parseFloat(lectura.horas) || 1;
      const emisiones = parseFloat(lectura.emisiones_kgco2) || 0;
      const consumo = parseFloat(lectura.consumo_kwh) || 0;
      const traficoMb = parseFloat(lectura.trafico_mb) || 0;
      const emisionesTrafico = parseFloat(lectura.emisiones_trafico_kg) || 0;
      
      const emisionesPorHora = emisiones / horas;
      const consumoPorHora = consumo / horas;
      const traficoPorHora = traficoMb / horas;
      const emisionesDigitalesPorHora = emisionesTrafico / horas;
      
      if (horaInicio <= horaFin) {
        for (let h = horaInicio; h < horaFin; h++) {
          if (lectura.estado?.trim() === 'Encendido') {
            emisionesEnc[h] += emisionesPorHora;
            consumoEnc[h] += consumoPorHora;
          } else {
            emisionesApa[h] += emisionesPorHora;
            consumoApa[h] += consumoPorHora;
          }
          trafico[h] += traficoPorHora;
          emisionesDigitales[h] += emisionesDigitalesPorHora;
        }
      } else {
        for (let h = horaInicio; h < 24; h++) {
          if (lectura.estado?.trim() === 'Encendido') {
            emisionesEnc[h] += emisionesPorHora;
            consumoEnc[h] += consumoPorHora;
          } else {
            emisionesApa[h] += emisionesPorHora;
            consumoApa[h] += consumoPorHora;
          }
          trafico[h] += traficoPorHora;
          emisionesDigitales[h] += emisionesDigitalesPorHora;
        }
        for (let h = 0; h < horaFin; h++) {
          if (lectura.estado?.trim() === 'Encendido') {
            emisionesEnc[h] += emisionesPorHora;
            consumoEnc[h] += consumoPorHora;
          } else {
            emisionesApa[h] += emisionesPorHora;
            consumoApa[h] += consumoPorHora;
          }
          trafico[h] += traficoPorHora;
          emisionesDigitales[h] += emisionesDigitalesPorHora;
        }
      }
    });
    
    return { labels, emisionesEnc, emisionesApa, consumoEnc, consumoApa, trafico, emisionesDigitales };
  }, [añoSeleccionado, mesSeleccionado, diaSeleccionado]);

  const procesarVistaDia = useCallback((lecturasFiltradas) => {
    const año = parseInt(añoSeleccionado);
    const mes = parseInt(mesSeleccionado) - 1;
    const diasDelMes = new Date(año, mes + 1, 0).getDate();
    const labels = [];
    const emisionesEnc = Array(diasDelMes).fill(0);
    const emisionesApa = Array(diasDelMes).fill(0);
    const consumoEnc = Array(diasDelMes).fill(0);
    const consumoApa = Array(diasDelMes).fill(0);
    const trafico = Array(diasDelMes).fill(0);
    const emisionesDigitales = Array(diasDelMes).fill(0);

    lecturasFiltradas.forEach(lectura => {
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      if (fecha.getFullYear() === año && fecha.getMonth() === mes) {
        const dia = fecha.getDate() - 1;
        if (dia >= 0 && dia < diasDelMes) {
          const emisiones = parseFloat(lectura.emisiones_kgco2) || 0;
          const consumo = parseFloat(lectura.consumo_kwh) || 0;
          const traficoMb = parseFloat(lectura.trafico_mb) || 0;
          const emisionesTrafico = parseFloat(lectura.emisiones_trafico_kg) || 0;
          
          if (lectura.estado?.trim() === 'Encendido') {
            emisionesEnc[dia] += emisiones;
            consumoEnc[dia] += consumo;
          } else {
            emisionesApa[dia] += emisiones;
            consumoApa[dia] += consumo;
          }
          trafico[dia] += traficoMb;
          emisionesDigitales[dia] += emisionesTrafico;
        }
      }
    });

    for (let dia = 1; dia <= diasDelMes; dia++) labels.push(`Día ${dia}`);
    return { labels, emisionesEnc, emisionesApa, consumoEnc, consumoApa, trafico, emisionesDigitales };
  }, [añoSeleccionado, mesSeleccionado]);

  const procesarVistaMes = useCallback((lecturasFiltradas) => {
    const año = parseInt(añoSeleccionado);
    const labels = mesesNombres;
    const emisionesEnc = Array(12).fill(0);
    const emisionesApa = Array(12).fill(0);
    const consumoEnc = Array(12).fill(0);
    const consumoApa = Array(12).fill(0);
    const trafico = Array(12).fill(0);
    const emisionesDigitales = Array(12).fill(0);

    lecturasFiltradas.forEach(lectura => {
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      if (fecha.getFullYear() === año) {
        const mes = fecha.getMonth();
        const emisiones = parseFloat(lectura.emisiones_kgco2) || 0;
        const consumo = parseFloat(lectura.consumo_kwh) || 0;
        const traficoMb = parseFloat(lectura.trafico_mb) || 0;
        const emisionesTrafico = parseFloat(lectura.emisiones_trafico_kg) || 0;
        
        if (lectura.estado?.trim() === 'Encendido') {
          emisionesEnc[mes] += emisiones;
          consumoEnc[mes] += consumo;
        } else {
          emisionesApa[mes] += emisiones;
          consumoApa[mes] += consumo;
        }
        trafico[mes] += traficoMb;
        emisionesDigitales[mes] += emisionesTrafico;
      }
    });

    return { labels, emisionesEnc, emisionesApa, consumoEnc, consumoApa, trafico, emisionesDigitales };
  }, [añoSeleccionado]);

  const procesarVistaAño = useCallback((lecturasFiltradas) => {
    const añosMap = new Map();

    lecturasFiltradas.forEach(lectura => {
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      const año = fecha.getFullYear();
      if (!añosMap.has(año)) {
        añosMap.set(año, { 
          emisionesEnc: 0, 
          emisionesApa: 0, 
          consumoEnc: 0, 
          consumoApa: 0,
          trafico: 0,
          emisionesDigitales: 0
        });
      }
      const datosAño = añosMap.get(año);
      const emisiones = parseFloat(lectura.emisiones_kgco2) || 0;
      const consumo = parseFloat(lectura.consumo_kwh) || 0;
      const traficoMb = parseFloat(lectura.trafico_mb) || 0;
      const emisionesTrafico = parseFloat(lectura.emisiones_trafico_kg) || 0;
      
      if (lectura.estado?.trim() === 'Encendido') {
        datosAño.emisionesEnc += emisiones;
        datosAño.consumoEnc += consumo;
      } else {
        datosAño.emisionesApa += emisiones;
        datosAño.consumoApa += consumo;
      }
      datosAño.trafico += traficoMb;
      datosAño.emisionesDigitales += emisionesTrafico;
    });

    const añosOrdenados = Array.from(añosMap.keys()).sort();
    return {
      labels: añosOrdenados.map(a => a.toString()),
      emisionesEnc: añosOrdenados.map(a => añosMap.get(a).emisionesEnc),
      emisionesApa: añosOrdenados.map(a => añosMap.get(a).emisionesApa),
      consumoEnc: añosOrdenados.map(a => añosMap.get(a).consumoEnc),
      consumoApa: añosOrdenados.map(a => añosMap.get(a).consumoApa),
      trafico: añosOrdenados.map(a => añosMap.get(a).trafico),
      emisionesDigitales: añosOrdenados.map(a => añosMap.get(a).emisionesDigitales)
    };
  }, []);

  const procesarDatos = useCallback(() => {
    if (lecturas.length === 0) {
      return { 
        labels: [], 
        emisionesEnc: [], 
        emisionesApa: [], 
        consumoEnc: [], 
        consumoApa: [],
        trafico: [],
        emisionesDigitales: []
      };
    }
    const lecturasFiltradas = lecturas.filter(l =>
      selectedDevice ? l.dispositivo_id === selectedDevice : true
    );
    if (vistaActual === 'hora') return procesarVistaHora(lecturasFiltradas);
    if (vistaActual === 'dia') return procesarVistaDia(lecturasFiltradas);
    if (vistaActual === 'mes') return procesarVistaMes(lecturasFiltradas);
    return procesarVistaAño(lecturasFiltradas);
  }, [lecturas, selectedDevice, vistaActual, procesarVistaHora, procesarVistaDia, procesarVistaMes, procesarVistaAño]);

  const datosGrafico = useMemo(procesarDatos, [procesarDatos]);

  const resumen = useMemo(() => {
    const totalEmisionesEnc = datosGrafico.emisionesEnc.reduce((a, b) => a + b, 0);
    const totalEmisionesApa = datosGrafico.emisionesApa.reduce((a, b) => a + b, 0);
    const totalConsumoEnc = datosGrafico.consumoEnc.reduce((a, b) => a + b, 0);
    const totalConsumoApa = datosGrafico.consumoApa.reduce((a, b) => a + b, 0);
    const totalTrafico = datosGrafico.trafico.reduce((a, b) => a + b, 0);
    const totalEmisionesDigitales = datosGrafico.emisionesDigitales.reduce((a, b) => a + b, 0);
    const sumaEmisionesBase = totalEmisionesEnc + totalEmisionesApa;
    const sumaEmisionesFinal = totalEmisionesDigitales + sumaEmisionesBase;

    const decimales = vistaActual === 'hora' ? 4 : 2;

    return {
      totalEmisionesEnc: totalEmisionesEnc.toFixed(decimales),
      totalEmisionesApa: totalEmisionesApa.toFixed(decimales),
      totalConsumoEnc: totalConsumoEnc.toFixed(decimales),
      totalConsumoApa: totalConsumoApa.toFixed(decimales),
      totalEmisiones: (totalEmisionesEnc + totalEmisionesApa).toFixed(decimales),
      totalConsumo: (totalConsumoEnc + totalConsumoApa).toFixed(decimales),
      totalTrafico: totalTrafico.toFixed(2),
      totalTraficoGB: (totalTrafico / 1024).toFixed(4),
      totalEmisionesDigitales: totalEmisionesDigitales.toFixed(6),
      totalEmisionesFinal: sumaEmisionesFinal.toFixed(decimales)
    };
  }, [datosGrafico, vistaActual]);

  //  FUNCIÓN PARA GENERAR PDF (DESPUÉS de calcularResumen)
  const handleGenerarPDF = () => {
    if (!selectedDevice || !dispositivoActual) {
      alert('Por favor selecciona un dispositivo primero');
      return;
    }
    
    // Calcular horas de operación desde las lecturas
    const lecturasDispositivo = lecturas.filter(l => l.dispositivo_id === selectedDevice);
    const totalHoras = lecturasDispositivo.reduce((sum, l) => sum + (parseFloat(l.horas) || 0), 0);
    const horasEncendido = lecturasDispositivo
      .filter(l => l.estado?.trim() === 'Encendido')
      .reduce((sum, l) => sum + (parseFloat(l.horas) || 0), 0);
    const horasApagado = totalHoras - horasEncendido;
    const porcentajeEncendido = totalHoras > 0 ? ((horasEncendido / totalHoras) * 100).toFixed(1) : '0';
    
    generarReporteDispositivo({
      dispositivo: dispositivoActual,
      sala: salaObtenido,
      estadisticas: {
        totalConsumoEnc: resumen.totalConsumoEnc,
        totalConsumoApa: resumen.totalConsumoApa,
        totalConsumo: resumen.totalConsumo,
        totalEmisionesEnc: resumen.totalEmisionesEnc,
        totalEmisionesApa: resumen.totalEmisionesApa,
        totalEmisiones: resumen.totalEmisiones,
        totalHoras: totalHoras.toFixed(0),
        horasEncendido: horasEncendido.toFixed(0),
        horasApagado: horasApagado.toFixed(0),
        porcentajeEncendido: porcentajeEncendido,
        trafico_mb: resumen.totalTrafico,
        consumo_trafico_kwh: resumen.totalTraficoGB ? (parseFloat(resumen.totalTraficoGB) * 0.06).toFixed(6) : '0',
        emisiones_trafico_kg: resumen.totalEmisionesDigitales
      },
      periodo: vistaActual,
      periodoTexto: getPeriodoTexto(),
      año: añoSeleccionado,
      mes: mesSeleccionado,
      dia: diaSeleccionado
    });
  };

  const crearGrafico = useCallback((chartRef, label, data, backgroundColor, borderColor, yAxisLabel) => {
    if (!chartRef.current || datosGrafico.labels.length === 0) return;
    const ctx = chartRef.current.getContext('2d');
    if (chartRef.current.chart) chartRef.current.chart.destroy();

    chartRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datosGrafico.labels,
        datasets: [{ label, data, backgroundColor, borderColor, borderWidth: 2 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const decimales = vistaActual === 'hora' ? 10 : 2;
                return `${context.dataset.label}: ${context.parsed.y.toFixed(decimales)}`;
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
            type: vistaActual === 'hora' ? 'logarithmic' : 'linear',
            beginAtZero: vistaActual !== 'hora',
            title: { display: true, text: yAxisLabel },
            ticks: {
              callback: function(value) {
                if (vistaActual === 'hora') {
                  if (value < 0.0001) return value.toFixed(10);
                  if (value < 0.001) return value.toFixed(8);
                  if (value < 0.01) return value.toFixed(6);
                  if (value < 1) return value.toFixed(4);
                  return value.toFixed(2);
                }
                return value.toFixed(2);
              }
            }
          }
        }
      }
    });
  }, [datosGrafico, vistaActual]);

  useEffect(() => {
    crearGrafico(chartEmisionesEncendidoRef, 'Emisiones Encendido (kg CO₂)', datosGrafico.emisionesEnc, 'rgba(255, 99, 132, 0.6)', 'rgb(255, 99, 132)', 'kg CO₂');
    crearGrafico(chartEmisionesApagadoRef,   'Emisiones Apagado (kg CO₂)',   datosGrafico.emisionesApa, 'rgba(255, 159, 64, 0.6)',  'rgb(255, 159, 64)',  'kg CO₂');
    crearGrafico(chartConsumoEncendidoRef,   'Consumo Encendido (kWh)',       datosGrafico.consumoEnc,   'rgba(54, 162, 235, 0.6)',  'rgb(54, 162, 235)',  'kWh');
    crearGrafico(chartConsumoApagadoRef,     'Consumo Apagado (kWh)',         datosGrafico.consumoApa,   'rgba(75, 192, 192, 0.6)',  'rgb(75, 192, 192)',  'kWh');
    crearGrafico(chartTraficoRef,            'Tráfico de Red (MB)',           datosGrafico.trafico,      'rgba(147, 51, 234, 0.6)',  'rgb(147, 51, 234)',  'MB');
    crearGrafico(chartEmisionesDigitalesRef, 'Emisiones de Tráfico de Red (kg CO₂)',  datosGrafico.emisionesDigitales, 'rgba(168, 85, 247, 0.6)', 'rgb(168, 85, 247)', 'kg CO₂');
  }, [crearGrafico, datosGrafico]);

  const getTitle = () => {
    if (!selectedDevice) return 'Análisis de Consumo y Emisiones';
    const dispositivo = dispositivos.find(d => d.id === selectedDevice);
    return `Análisis de: ${dispositivo ? dispositivo.nombre_modelo : ''}`;
  };

  const getPeriodoTexto = () => {
    if (vistaActual === 'hora') return `${diaSeleccionado} de ${mesesNombres[parseInt(mesSeleccionado) - 1]} ${añoSeleccionado}`;
    if (vistaActual === 'dia') return `${mesesNombres[parseInt(mesSeleccionado) - 1]} ${añoSeleccionado}`;
    if (vistaActual === 'mes') return `Año ${añoSeleccionado}`;
    if (vistaActual === 'año') return '2024 y 2025';
    return 'Todos los años';
  };

  const dispositivoActual = dispositivos.find(d => d.id === selectedDevice);
  const salaObtenido = salas.find(d => d.id === dispositivoActual?.sala_id);
  const imagenUrl = dispositivoActual?.imagen_efectiva
    ? `${API_BASE.replace('/api', '')}${dispositivoActual.imagen_efectiva}`
    : null;
  
  const usaInternet = dispositivoActual?.usa_internet === 1 || dispositivoActual?.usa_internet === true;

  const diasDelMes = new Date(parseInt(añoSeleccionado), parseInt(mesSeleccionado), 0).getDate();
  const opcionesDias = Array.from({ length: diasDelMes }, (_, i) => (i + 1).toString().padStart(2, '0'));

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* HEADER CON IMAGEN */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        {dispositivoActual && imagenUrl ? (
          <img
            src={imagenUrl}
            alt={dispositivoActual?.nombre_modelo}
            onClick={() => salaObtenido?.numero && navigate(`/oficinas/${salaObtenido.numero}`)}
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #334155',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: salaObtenido?.numero ? 'pointer' : 'default',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : dispositivoActual ? (
          <div
            onClick={() => salaObtenido?.numero && navigate(`/oficinas/${salaObtenido.numero}`)}
            style={{
              width: '120px',
              height: '120px',
              backgroundColor: '#e0e0e0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              color: '#999',
              cursor: salaObtenido?.numero ? 'pointer' : 'default',
            }}
          >
            📱
          </div>
        ) : null}

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 10px 0' }}>{getTitle()}</h1>
          {dispositivoActual && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              <p style={{ margin: '5px 0' }}>
                <strong>Tipo:</strong> {dispositivoActual.tipo}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Sala:</strong> {salaObtenido?.nombre || 'N/A'}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Potencia:</strong> {dispositivoActual.watts_encendido}W (encendido) / {dispositivoActual.watts_apagado}W (apagado)
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Internet:</strong> {usaInternet ? '🌐 Sí' : '🚫 No'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* CONTROLES */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedDevice}
          onChange={(e) => {
            const newId = e.target.value;
            setSelectedDevice(newId);
            
            if (newId) {
              navigate(`/dispositivos/${parseInt(newId.replace(/^D-/, ''), 10)}`);
            } else {
              navigate('/dispositivos');
            }
          }}
          style={{ 
            padding: '12px 16px',
            fontSize: '16px',
            borderRadius: '6px',
            border: '2px solid #334155',
            minWidth: '300px',
            backgroundColor: selectedDevice ? 'white' : '#f0f0f0',
            cursor: 'pointer'
          }}
        >
          <option value="">Seleccionar dispositivo</option>
          {dispositivos.map(device => (
            <option key={device.id} value={device.id}>
              {device.nombre_modelo} ({device.tipo})
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '5px', backgroundColor: '#f0f0f0', padding: '4px', borderRadius: '6px' }}>
          {['hora', 'dia', 'mes', 'año'].map((vista) => (
            <button
              key={vista}
              onClick={() => setVistaActual(vista)}
              disabled={!selectedDevice}
              style={{
                padding: '8px 16px', borderRadius: '4px', cursor: selectedDevice ? 'pointer' : 'not-allowed', border: 'none',
                backgroundColor: vistaActual === vista ? '#334155' : 'transparent',
                color: vistaActual === vista ? 'white' : '#333',
                fontWeight: vistaActual === vista ? 'bold' : 'normal',
                opacity: selectedDevice ? 1 : 0.5
              }}
            >
              {vista === 'hora' ? 'Por Hora' : vista === 'dia' ? 'Por Día' : vista === 'mes' ? 'Por Mes' : 'Por Año'}
            </button>
          ))}
        </div>

        {(vistaActual === 'hora' || vistaActual === 'dia' || vistaActual === 'mes') && selectedDevice && (
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        )}

        {(vistaActual === 'hora' || vistaActual === 'dia') && selectedDevice && (
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {mesesNombres.map((mes, idx) => (
              <option key={idx} value={(idx + 1).toString().padStart(2, '0')}>{mes}</option>
            ))}
          </select>
        )}

        {vistaActual === 'hora' && selectedDevice && (
          <select
            value={diaSeleccionado}
            onChange={(e) => setDiaSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {opcionesDias.map((dia) => (
              <option key={dia} value={dia}>Día {parseInt(dia)}</option>
            ))}
          </select>
        )}

        {selectedDevice && (
          <button
            onClick={handleGenerarPDF}
            style={{
              padding: '10px 20px',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b71c1c';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#d32f2f';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          >
            Descargar Reporte PDF
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!selectedDevice && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #d1d5db'
        }}>
          <h2 style={{ color: '#6b7280', marginBottom: '32px' }}>Selecciona un dispositivo</h2>
          <p style={{ color: '#9ca3af' }}>Elige un dispositivo del menú desplegable para ver sus métricas de consumo y emisiones</p>
        </div>
      )}

      {selectedDevice && (
        <>
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #334155' }}>
            <h3 style={{ marginTop: 0, color: '#334155' }}>Resumen del periodo: {getPeriodoTexto()}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '10px' }}>
              {[
                { label: 'Emisiones Encendido', value: resumen.totalEmisionesEnc, unit: 'kg CO₂', color: '#d32f2f' },
                { label: 'Emisiones Apagado',   value: resumen.totalEmisionesApa, unit: 'kg CO₂', color: '#f57c00' },
                { label: 'Emisiones Encendido + Apagado',   value: resumen.totalEmisiones,    unit: 'kg CO₂', color: '#c62828' },
                { label: 'Consumo Encendido',   value: resumen.totalConsumoEnc,   unit: 'kWh',    color: '#1976d2' },
                { label: 'Consumo Apagado',     value: resumen.totalConsumoApa,   unit: 'kWh',    color: '#00796b' },
                { label: 'Consumo Total',       value: resumen.totalConsumo,      unit: 'kWh',    color: '#0277bd' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color }}>{value} {unit}</div>
                </div>
              ))}
              
              {usaInternet && parseFloat(resumen.totalTrafico) > 0 && (
                <>
                  <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Tráfico de Red</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>
                      {resumen.totalTrafico} MB
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      ({resumen.totalTraficoGB} GB)
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Emisiones de Tráfico de Red</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#a855f7' }}>
                      {resumen.totalEmisionesDigitales} kg CO₂
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Emisiones Totales</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#a855f7' }}>
                      {resumen.totalEmisionesFinal} kg CO₂
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <p>Cargando datos...</p>
          ) : datosGrafico.labels.length === 0 ? (
            <p>No hay datos disponibles para la selección actual</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '20px' }}>
              {[
                { ref: chartEmisionesEncendidoRef, title: 'Emisiones Encendido' },
                { ref: chartEmisionesApagadoRef,   title: 'Emisiones Apagado' },
                { ref: chartConsumoEncendidoRef,   title: 'Consumo Encendido' },
                { ref: chartConsumoApagadoRef,     title: 'Consumo Apagado' },
              ].map(({ ref, title }) => (
                <div key={title} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
                  <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>{title}</h3>
                  <div style={{ height: '300px' }}>
                    <canvas ref={ref} />
                  </div>
                </div>
              ))}
              
              {usaInternet && parseFloat(resumen.totalTrafico) > 0 && (
                <>
                  <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Tráfico de Red</h3>
                    <div style={{ height: '300px' }}>
                      <canvas ref={chartTraficoRef} />
                    </div>
                  </div>
                  <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Emisiones de Tráfico de Red</h3>
                    <div style={{ height: '300px' }}>
                      <canvas ref={chartEmisionesDigitalesRef} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DispositivosView;
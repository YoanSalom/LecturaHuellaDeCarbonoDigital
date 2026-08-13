import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Wifi, ChartColumn, Globe, FileText, Hash, DoorOpen,Leaf } from 'lucide-react';
import { generarReporteSala, generarReporteEdificio } from '../utils/pdfGenerator';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);


// COMPONENTE SIDEBAR O INTERACTIVO DEL EDIFICIO
const EdificioSidebar = ({ 
  dispositivos = [], 
  salas = [], 
  lecturas = [],
  salaSeleccionada, 
  onSalaSelect,
  vistaEdificio = 'total',
  setVistaEdificio,
  edificioSeleccionado = '',
  setEdificioSeleccionado,
  edificiosUnicos = [],
  setSalaSeleccionada,
  onGenerarPDFEdificio 
}) => {
  const [oficinaSeleccionada, setOficinaSeleccionada] = useState(null);
  const [dispositivosPorSala, setDispositivosPorSala] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const canvasRef = useRef(null);

  const edificioDinamico = useMemo(() => {
    const edificio = {};
    salas.forEach((sala) => {
      const piso = sala.piso;
      if (!edificio[piso]) {
        edificio[piso] = { nombre: `Piso ${piso}`, oficinas: [] };
      }
      edificio[piso].oficinas.push({
        id: sala.numero || sala.id,
        nombre: sala.nombre,
        sala_id: sala.id
      });
    });
    return edificio;
  }, [salas]);

  useEffect(() => {
    const porSala = {};
    dispositivos.forEach(dispositivo => {
      const salaId = dispositivo.sala_id;
      if (!porSala[salaId]) porSala[salaId] = [];
      porSala[salaId].push(dispositivo);
    });
    setDispositivosPorSala(porSala);
  }, [dispositivos]);

  useEffect(() => {
    if (salaSeleccionada) {
      let oficinaEncontrada = null;
      Object.keys(edificioDinamico).forEach(pisoNum => {
        const piso = edificioDinamico[pisoNum];
        const oficina = piso.oficinas.find(o => o.sala_id === salaSeleccionada);
        if (oficina) oficinaEncontrada = oficina;
      });
      if (oficinaEncontrada) setOficinaSeleccionada(oficinaEncontrada);
    } else {
      setOficinaSeleccionada(null);
    }
  }, [salaSeleccionada, edificioDinamico]);

  const getCantidadDispositivos = (oficina) => {
    return (dispositivosPorSala[oficina.sala_id] || []).length;
  };

  const getConsumoSala = (salaId) => {
    const dispositivosSala = dispositivos.filter(d => d.sala_id === salaId);
    let totalEmisiones = 0;
    
    dispositivosSala.forEach(disp => {
      const lecturasDisp = lecturas.filter(l => l.dispositivo_id === disp.id);
      
      if (vistaEdificio === 'total') {
        totalEmisiones += lecturasDisp.reduce((sum, l) => {
          const emisionesElectricas = parseFloat(l.emisiones_kgco2) || 0;
          const emisionesDigitales = parseFloat(l.emisiones_trafico_kg) || 0;
          return sum + emisionesElectricas + emisionesDigitales;
        }, 0);
      } else {
        totalEmisiones += lecturasDisp.reduce((sum, l) => {
          return sum + (parseFloat(l.emisiones_trafico_kg) || 0);
        }, 0);
      }
    });
    
    return totalEmisiones;
  };

  const getConsumoTotalEdificio = () => {
    let total = 0;
    salas.forEach(sala => {
      total += getConsumoSala(sala.id);
    });
    return total;
  };

  const getConsumoPiso = (numeroPiso) => {
    const salasPiso = salas.filter(s => s.piso === numeroPiso);
    let total = 0;
    salasPiso.forEach(sala => {
      total += getConsumoSala(sala.id);
    });
    return total;
  };

  const getColorPorConsumo = (porcentaje) => {
    if (porcentaje < 10) return { fondo: '#e8f5e9', borde: '#81c784' };
    if (porcentaje < 20) return { fondo: '#c8e6c9', borde: '#66bb6a' };
    if (porcentaje < 30) return { fondo: '#fff9c4', borde: '#ffd54f' };
    if (porcentaje < 40) return { fondo: '#ffe082', borde: '#ffb300' };
    if (porcentaje < 50) return { fondo: '#ffcc80', borde: '#ff9800' };
    if (porcentaje < 60) return { fondo: '#ffab91', borde: '#ff6f00' };
    return { fondo: '#ef9a9a', borde: '#f44336' };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = isExpanded ? 350 : 60;
    const height = canvas.height = 520;
    ctx.clearRect(0, 0, width, height);

    const anchoPiso = isExpanded ? 300 : 40;
    const margenIzq = isExpanded ? 25 : 10;
    const margenTop = 20;
    const espacioEntrePisos = isExpanded ? 20 : 10;
    const consumoTotalEdificio = getConsumoTotalEdificio();

    const pisosOrdenados = Object.keys(edificioDinamico).sort((a, b) => Number(a) - Number(b));
    const numPisos = pisosOrdenados.length;
    const alturaPiso = isExpanded
      ? Math.min(150, Math.floor((500 - espacioEntrePisos * Math.max(0, numPisos - 1)) / Math.max(1, numPisos)))
      : 80;

    pisosOrdenados.forEach((pisoKey, index) => {
      const numeroPiso = Number(pisoKey);
      const y = margenTop + (pisosOrdenados.length - 1 - index) * (alturaPiso + espacioEntrePisos);
      const consumoPiso = getConsumoPiso(numeroPiso);
      const porcentajePiso = consumoTotalEdificio > 0 ? (consumoPiso / consumoTotalEdificio * 100) : 0;
      const colorPiso = getColorPorConsumo(porcentajePiso);

      ctx.fillStyle = colorPiso.fondo;
      ctx.fillRect(margenIzq, y, anchoPiso, alturaPiso);
      ctx.strokeStyle = colorPiso.borde;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(margenIzq, y, anchoPiso, alturaPiso);
      
      if (isExpanded) {
        ctx.fillStyle = '#1565c0';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`Piso ${numeroPiso}`, margenIzq + 30, y - 6);
        
        ctx.fillStyle = '#1565c0';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`${porcentajePiso.toFixed(1)}%`, margenIzq + anchoPiso - 40, y - 6);
      } else {
        ctx.fillStyle = '#1565c0';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`P${numeroPiso}`, margenIzq + anchoPiso/2, y + alturaPiso/2 + 4);
      }

      if (isExpanded) {
        const oficinas = edificioDinamico[pisoKey]?.oficinas || [];
        const totalOficinas = oficinas.length;
        
        const cols = Math.min(5, Math.ceil(Math.sqrt(totalOficinas)));
        const rows = Math.ceil(totalOficinas / cols);
        const espacioH = 8;
        const espacioV = 10;
        const margenInterior = 12;
        const anchoOficina = (anchoPiso - (margenInterior * 2) - (espacioH * (cols - 1))) / cols;
        const altoOficina = (alturaPiso - (margenInterior * 2) - (espacioV * (rows - 1))) / rows;

        oficinas.forEach((oficina, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = margenIzq + margenInterior + col * (anchoOficina + espacioH);
          const oy = y + margenInterior + row * (altoOficina + espacioV);
          const isSelected = oficinaSeleccionada?.id === oficina.id;
          const cantDispositivos = getCantidadDispositivos(oficina);
          const consumoOficina = getConsumoSala(oficina.sala_id);
          const porcentajeOficina = consumoTotalEdificio > 0 ? (consumoOficina / consumoTotalEdificio * 100) : 0;
          const colorOficina = getColorPorConsumo(porcentajeOficina);

          ctx.fillStyle = isSelected ? '#2196F3' : colorOficina.fondo;
          ctx.fillRect(x, oy, anchoOficina, altoOficina);
          
          ctx.strokeStyle = isSelected ? '#1565c0' : colorOficina.borde;
          ctx.lineWidth = isSelected ? 2.5 : 1;
          ctx.strokeRect(x, oy, anchoOficina, altoOficina);
          
          ctx.fillStyle = isSelected ? '#fff' : '#333';
          ctx.font = isSelected ? 'bold 10px system-ui' : 'bold 9px system-ui';
          ctx.textAlign = 'center';
          const textoId = oficina.id.toString();
          const textoMostrar = textoId.length > 8 ? textoId.substring(0, 7) + '...' : textoId;
          ctx.fillText(textoMostrar, x + anchoOficina / 2, oy + altoOficina / 2 + 3);

          if (cantDispositivos > 0) {
            ctx.fillStyle = isSelected ? '#fff' : '#2196F3';
            ctx.font = 'bold 8px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(cantDispositivos.toString(), x + 4, oy + 10);
          }

          if (porcentajeOficina > 0) {
            ctx.fillStyle = isSelected ? '#fff' : '#555';
            ctx.font = 'bold 7px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(`${porcentajeOficina.toFixed(1)}%`, x + anchoOficina - 3, oy + 10);
          }

          if (isSelected) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x + 6, oy + 6, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    });
  }, [oficinaSeleccionada, dispositivosPorSala, lecturas, salas, dispositivos, edificioDinamico, vistaEdificio, isExpanded]);

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const margenIzq = 25;
    const margenTop = 20;
    const anchoPiso = 300;
    const espacioEntrePisos = 20;

    const pisosOrdenados = Object.keys(edificioDinamico).sort((a, b) => Number(a) - Number(b));
    const numPisos = pisosOrdenados.length;
    const alturaPiso = numPisos > 0
      ? Math.min(150, Math.floor((500 - espacioEntrePisos * Math.max(0, numPisos - 1)) / numPisos))
      : 150;

    pisosOrdenados.forEach((pisoKey, index) => {
      const pisoY = margenTop + (pisosOrdenados.length - 1 - index) * (alturaPiso + espacioEntrePisos);
      const oficinas = edificioDinamico[pisoKey]?.oficinas || [];
      const totalOficinas = oficinas.length;
      
      const cols = Math.min(5, Math.ceil(Math.sqrt(totalOficinas)));
      const rows = Math.ceil(totalOficinas / cols);
      const espacioH = 8;
      const espacioV = 10;
      const margenInterior = 12;
      const anchoOficina = (anchoPiso - (margenInterior * 2) - (espacioH * (cols - 1))) / cols;
      const altoOficina = (alturaPiso - (margenInterior * 2) - (espacioV * (rows - 1))) / rows;

      oficinas.forEach((oficina, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const ox = margenIzq + margenInterior + col * (anchoOficina + espacioH);
        const oy = pisoY + margenInterior + row * (altoOficina + espacioV);

        if (x >= ox && x <= ox + anchoOficina && y >= oy && y <= oy + altoOficina) {
          setOficinaSeleccionada(oficina);
          if (onSalaSelect && oficina.sala_id) {
            onSalaSelect(oficina.sala_id);
          }
        }
      });
    });
  };

  return (
    <div style={{ 
      width: isExpanded ? '350px' : '120px', 
      border: '1px solid #2196F3', 
      borderRadius: '8px', 
      padding: '15px', 
      backgroundColor: '#e3f2fd',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto', 
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '2px solid #2196F3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative'
      }}>
        <Building2 size={20} color="#2196F3" />
        <h3 style={{ 
          margin: 0,
          fontSize: isExpanded ? '16px' : '11px',
          color: '#1e293b',
          fontWeight: 'bold',
          whiteSpace: isExpanded ? 'nowrap' : 'normal',
          textAlign: 'center',
          lineHeight: isExpanded ? 'normal' : '1.2',
          wordBreak: isExpanded ? 'normal' : 'break-word'
        }}>
          {isExpanded ? 'Edificio Interactivo' : <>Edificio<br/>Interactivo</>}
        </h3>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            position: 'absolute',
            top: isExpanded ? '-5px' : '40px',
            left: isExpanded ? '-5px' : '50%',
            transform: isExpanded ? 'none' : 'translateX(-50%)',
            background: '#2196F3',
            border: 'none',
            color: 'white',
            padding: '8px',
            borderRadius: '80px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            width: isExpanded ?'32px': '120px',
            height:isExpanded ? '32px': '120px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1976D2';
            e.currentTarget.style.transform = isExpanded ? 'scale(1.1)' : 'translateX(-50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2196F3';
            e.currentTarget.style.transform = isExpanded ? 'scale(1)' : 'translateX(-50%) scale(1)';
          }}
          title={isExpanded ? 'Contraer panel' : 'Expandir panel'}
        >
          {isExpanded ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          )}
        </button>
      </div>

      {oficinaSeleccionada && isExpanded && (
        <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#ffffff', border: '1px solid #2196F3', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1565c0', marginBottom: '4px' }}>
            {oficinaSeleccionada.nombre}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Sala {oficinaSeleccionada.id} • {getCantidadDispositivos(oficinaSeleccionada)} dispositivo(s)
          </div>
        </div>
      )}

      {isExpanded && (
        <button
          onClick={onGenerarPDFEdificio}
          style={{
            padding: '10px',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
            marginBottom: '12px',
            marginTop: '8px',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#b71c1c';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#d32f2f';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title={edificioSeleccionado 
            ? `Descargar PDF del edificio ${edificioSeleccionado}` 
            : "Descargar PDF de todos los edificios"}
        >
          <FileText size={15} style={{ marginRight: 4 }} />
          {edificioSeleccionado ? `PDF ${edificioSeleccionado}` : 'PDF Edificio Completo'}
        </button>
      )}

      {isExpanded && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
            Vista:
          </label>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f0f0f0', padding: '3px', borderRadius: '6px' }}>
            <button 
              onClick={() => setVistaEdificio('total')}
              style={{ 
                flex: 1,
                padding: '6px 8px', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                border: 'none',
                backgroundColor: vistaEdificio === 'total' ? '#4CAF50' : 'transparent',
                color: vistaEdificio === 'total' ? 'white' : '#333',
                fontWeight: vistaEdificio === 'total' ? 'bold' : 'normal',
                fontSize: '11px',
                transition: 'all 0.2s'
              }}
            >
              <ChartColumn size={15} style={{ marginRight: 4 }} />
               Totales
            </button>
            <button 
              onClick={() => setVistaEdificio('digital')}
              style={{ 
                flex: 1,
                padding: '6px 8px', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                border: 'none',
                backgroundColor: vistaEdificio === 'digital' ? '#9333EA' : 'transparent',
                color: vistaEdificio === 'digital' ? 'white' : '#333',
                fontWeight: vistaEdificio === 'digital' ? 'bold' : 'normal',
                fontSize: '11px',
                transition: 'all 0.2s'
              }}
            >
              <Globe size={12} style={{ marginRight: 4 }} />
               Red
            </button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
            Filtrar edificio:
          </label>
          <select 
            value={edificioSeleccionado} 
            onChange={(e) => {
              setEdificioSeleccionado(e.target.value);
              setSalaSeleccionada(''); // Reset sala al cambiar edificio
            }}
            style={{ 
              width: '100%',
              padding: '6px 10px', 
              borderRadius: '4px', 
              border: '2px solid #2196F3',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            backgroundColor: 'white'
          }}
        >
          <option value=""> Todos</option>
          {edificiosUnicos.map((edificio) => (
            <option key={edificio} value={edificio}>
              {edificio}
            </option>
          ))}
        </select>
      </div>
      )}
      
      {/* TÍTULO DINÁMICO DE LA VISTA - Solo visible cuando está expandido */}
      {isExpanded && (
        <div style={{ 
          marginBottom: '10px', 
          padding: '8px', 
          backgroundColor: vistaEdificio === 'total' ? '#e8f5e9' : '#f3e5f5',
          borderRadius: '4px',
          textAlign: 'center',
           fontSize: '12px',
          fontWeight: 'bold',
          color: vistaEdificio === 'total' ? '#2e7d32' : '#6a1b9a'
        }}>
          {vistaEdificio === 'total' ? (
            <>
              <ChartColumn size={15} style={{ marginRight: 4 }} />
              Emisiones Totales (Eléctrica + Red)
            </>
          ) : (
            <>
                <Globe size={15} style={{ marginRight: 4 }} />
              Solo Emisiones de Tráfico de Red
            </>
          )}
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        width={isExpanded ? "350" : "60"} 
        height={isExpanded ? "500" : "500"} 
        onClick={handleCanvasClick}
        style={{ 
          width: '100%', 
          height: 'auto', 
          cursor: 'pointer', 
          borderRadius: '4px', 
          border: '1px solid #ddd', 
          backgroundColor: '#ffffff',
          marginTop: isExpanded ? '0' : '120px'
        }}
      />

      {/* LEYENDA - Solo visible cuando está expandido */}
      {isExpanded && (
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '10px', color: '#666' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '10px', color: '#444' }}>Índice de consumo:</div>
          <div style={{ marginBottom: '5px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ flexShrink: 0, display: 'inline-block', width: '12px', height: '12px', marginTop: '1px', backgroundColor: '#e8f5e9', border: '1px solid #81c784' }}></span>
            <span><strong>Bajo</strong> — consumo menor al 10% respecto al total del edificio</span>
          </div>
          <div style={{ marginBottom: '5px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ flexShrink: 0, display: 'inline-block', width: '12px', height: '12px', marginTop: '1px', backgroundColor: '#fff9c4', border: '1px solid #ffd54f' }}></span>
            <span><strong>Medio</strong> — consumo entre 10% y 40% respecto al total del edificio</span>
          </div>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ flexShrink: 0, display: 'inline-block', width: '12px', height: '12px', marginTop: '1px', backgroundColor: '#ef9a9a', border: '1px solid #f44336' }}></span>
            <span><strong>Alto</strong> — consumo mayor al 60% respecto al total del edificio</span>
          </div>

          {/* Clave visual de cómo se leen los cuadros */}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '4px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '10px', color: '#444' }}>Cómo leer cada sala:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '10px', color: '#555', whiteSpace: 'nowrap' }}>Sala:</span>
              <div style={{ position: 'relative', width: '54px', height: '40px', border: '1.5px solid #90caf9', backgroundColor: '#e3f2fd', borderRadius: '3px', flexShrink: 0 }}>
                {/* Top-left: dispositivos */}
                <span style={{ position: 'absolute', top: '2px', left: '3px', fontSize: '8px', fontWeight: 'bold', color: '#2196F3' }}>3</span>
                {/* Top-right: porcentaje */}
                <span style={{ position: 'absolute', top: '2px', right: '3px', fontSize: '7px', fontWeight: 'bold', color: '#555' }}>2%</span>
                {/* Centro: número sala */}
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '9px', fontWeight: 'bold', color: '#333' }}>101</span>
              </div>
              <div style={{ fontSize: '9px', color: '#666', lineHeight: '1.4' }}>
                <div style={{ color: '#2196F3' }}>↖ Nº dispositivos</div>
                <div style={{ color: '#555' }}>↗ % del edificio</div>
                <div style={{ color: '#333' }}>· Nº de sala</div>
              </div>
            </div>
          </div>
          <div style={{
            marginTop: '8px',
            textAlign: 'center',
            padding: '6px',
            backgroundColor: vistaEdificio === 'total' ? '#e8f5e9' : '#f3e5f5',
            borderRadius: '4px',
            fontWeight: '600',
            fontSize: '9px',
            color: vistaEdificio === 'total' ? '#2e7d32' : '#6a1b9a'
          }}>
            {vistaEdificio === 'total'
              ? 'Porcentajes de emisiones totales del edificio'
              : 'Porcentajes de emisiones de tráfico de red del edificio'}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE: HUELLA DIGITAL
// ============================================
const HuellaDigitalCard = ({ stats }) => {
  if (!stats || !stats.trafico_mb) return null;

  return (
    <div style={{ 
      marginTop: '15px', 
      padding: '15px', 
      backgroundColor: '#f0f4ff', 
      borderRadius: '8px', 
      border: '2px solid #6366f1' 
    }}>
      <h4 style={{ 
        margin: '0 0 12px 0', 
        color: '#4338ca', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        fontSize: '15px'
      }}>
        <Wifi size={18} color="#6366f1" />
        Huella de Carbono Digital
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Tráfico </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6366f1' }}>
            {parseFloat(stats.trafico_mb || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#999' }}>MB</div>
        </div>
        
        <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Consumo de Tráfico de Red</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {parseFloat(stats.consumo_trafico_kwh || 0).toFixed(4)}
          </div>
          <div style={{ fontSize: '10px', color: '#999' }}>kWh</div>
        </div>
        
        <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Emisiones de Tráfico de Red</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7' }}>
            {parseFloat(stats.emisiones_trafico_kg || 0).toFixed(4)}
          </div>
          <div style={{ fontSize: '10px', color: '#999' }}>kg CO₂</div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: GRÁFICOS AGREGADOS DE UNA SALA
// ============================================
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const GraficosSalaInline = ({ lecturas, dispositivos, salaId, periodoSeleccionado, añoSeleccionado, mesSeleccionado }) => {
  const chartEmisionesRef = useRef(null);
  const chartConsumoRef   = useRef(null);
  const chartTraficoRef   = useRef(null);

  const datosGrafico = useMemo(() => {
    const ids = new Set(
      dispositivos.filter(d => String(d.sala_id) === String(salaId)).map(d => d.id)
    );
    const ls = lecturas.filter(l => ids.has(l.dispositivo_id));

    if (periodoSeleccionado === 'año') {
      const año = parseInt(añoSeleccionado);
      const emisionesEnc = Array(12).fill(0);
      const emisionesApa = Array(12).fill(0);
      const consumoEnc   = Array(12).fill(0);
      const consumoApa   = Array(12).fill(0);
      const trafico      = Array(12).fill(0);
      ls.forEach(l => {
        const f = new Date(l.fecha + 'T00:00:00');
        if (f.getFullYear() !== año) return;
        const m = f.getMonth();
        const enc = l.estado?.trim() === 'Encendido';
        const e = parseFloat(l.emisiones_kgco2) || 0;
        const c = parseFloat(l.consumo_kwh) || 0;
        if (enc) { emisionesEnc[m] += e; consumoEnc[m] += c; }
        else      { emisionesApa[m] += e; consumoApa[m] += c; }
        trafico[m] += parseFloat(l.trafico_mb) || 0;
      });
      return { labels: MESES_CORTOS, emisionesEnc, emisionesApa, consumoEnc, consumoApa, trafico };
    } else {
      const año = parseInt(añoSeleccionado);
      const mes  = parseInt(mesSeleccionado) - 1;
      const dias = new Date(año, mes + 1, 0).getDate();
      const emisionesEnc = Array(dias).fill(0);
      const emisionesApa = Array(dias).fill(0);
      const consumoEnc   = Array(dias).fill(0);
      const consumoApa   = Array(dias).fill(0);
      const trafico      = Array(dias).fill(0);
      ls.forEach(l => {
        const f = new Date(l.fecha + 'T00:00:00');
        if (f.getFullYear() !== año || f.getMonth() !== mes) return;
        const d = f.getDate() - 1;
        if (d < 0 || d >= dias) return;
        const enc = l.estado?.trim() === 'Encendido';
        const e = parseFloat(l.emisiones_kgco2) || 0;
        const c = parseFloat(l.consumo_kwh) || 0;
        if (enc) { emisionesEnc[d] += e; consumoEnc[d] += c; }
        else      { emisionesApa[d] += e; consumoApa[d] += c; }
        trafico[d] += parseFloat(l.trafico_mb) || 0;
      });
      const labels = Array.from({ length: dias }, (_, i) => String(i + 1));
      return { labels, emisionesEnc, emisionesApa, consumoEnc, consumoApa, trafico };
    }
  }, [lecturas, dispositivos, salaId, periodoSeleccionado, añoSeleccionado, mesSeleccionado]);

  useEffect(() => {
    const crearGrafico = (ref, datasets, yLabel) => {
      if (!ref.current || !datosGrafico.labels.length) return;
      const ctx = ref.current.getContext('2d');
      if (ref.current._chart) { ref.current._chart.destroy(); ref.current._chart = null; }
      ref.current._chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: datosGrafico.labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
          scales: {
            x: { ticks: { autoSkip: true, maxTicksLimit: 16, maxRotation: 0 } },
            y: { beginAtZero: true, title: { display: true, text: yLabel, font: { size: 11 } },
                 ticks: { callback: v => v.toFixed(2) } }
          }
        }
      });
    };

    crearGrafico(chartEmisionesRef, [
      { label: 'Enc. (kg CO₂)', data: datosGrafico.emisionesEnc, backgroundColor: 'rgba(255,99,132,0.6)',  borderColor: 'rgb(255,99,132)',  borderWidth: 1 },
      { label: 'Apa. (kg CO₂)', data: datosGrafico.emisionesApa, backgroundColor: 'rgba(255,159,64,0.6)', borderColor: 'rgb(255,159,64)', borderWidth: 1 },
    ], 'kg CO₂');

    crearGrafico(chartConsumoRef, [
      { label: 'Enc. (kWh)', data: datosGrafico.consumoEnc, backgroundColor: 'rgba(54,162,235,0.6)',  borderColor: 'rgb(54,162,235)',  borderWidth: 1 },
      { label: 'Apa. (kWh)', data: datosGrafico.consumoApa, backgroundColor: 'rgba(75,192,192,0.6)', borderColor: 'rgb(75,192,192)', borderWidth: 1 },
    ], 'kWh');

    crearGrafico(chartTraficoRef, [
      { label: 'Tráfico (MB)', data: datosGrafico.trafico, backgroundColor: 'rgba(147,51,234,0.6)', borderColor: 'rgb(147,51,234)', borderWidth: 1 },
    ], 'MB');

    return () => {
      [chartEmisionesRef, chartConsumoRef, chartTraficoRef].forEach(r => {
        if (r.current?._chart) { r.current._chart.destroy(); r.current._chart = null; }
      });
    };
  }, [datosGrafico]);

  if (!datosGrafico.labels.length) return null;

  const periodoTexto = periodoSeleccionado === 'año'
    ? `Año ${añoSeleccionado}`
    : `${MESES_LARGOS[parseInt(mesSeleccionado) - 1]} ${añoSeleccionado}`;

  return (
    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '6px' }}>
       <ChartColumn size={15} />
         Gráficos de la sala — <span style={{ fontWeight: 400 }}>{periodoTexto}</span>
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Emisiones CO₂ (kg)</p>
          <div style={{ height: '180px' }}><canvas ref={chartEmisionesRef} /></div>
        </div>
        <div>
          <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Consumo eléctrico (kWh)</p>
          <div style={{ height: '180px' }}><canvas ref={chartConsumoRef} /></div>
        </div>
        {datosGrafico.trafico.some(v => v > 0) && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Tráfico de red (MB)</p>
            <div style={{ height: '150px' }}><canvas ref={chartTraficoRef} /></div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Perfiles ambientales (mismo catálogo que SugerenciasView) ────────────
const PERFILES_ENCARGADO = {
  1: { nombre: 'Líder Sostenible',},
  2: { nombre: 'Consciente Equilibrado',},
  3: { nombre: 'Intensivo Informado',},
  4: { nombre: 'Eficiente Pasivo',},
  5: { nombre: 'Promedio Estándar',},
  6: { nombre: 'Alto Consumidor',},
  7: { nombre: 'Básico Eficiente', },
  8: { nombre: 'Desconectado Moderado',},
  9: { nombre: 'Crítico Urgente',},
};

// COMPONENTE PRINCIPAL 
const OficinasView = () => {
  const navigate = useNavigate();
  const { salaNumero } = useParams();
  
  const [dispositivos, setDispositivos] = useState([]);
  const [salas, setSalas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [lecturas, setLecturas] = useState([]);
  const [salaSeleccionada, setSalaSeleccionada] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('año');
  const [añoSeleccionado, setAñoSeleccionado] = useState('2024');
  const [mesSeleccionado, setMesSeleccionado] = useState('01');
  const [vistaEdificio, setVistaEdificio] = useState('total'); 
  const [edificioSeleccionado, setEdificioSeleccionado] = useState(''); 

  const API_BASE = 'http://localhost:3001/api';
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const handleDispositivoClick = (dispositivoId) => {
    navigate(`/dispositivos/${parseInt(dispositivoId.replace(/^D-/, ''), 10)}`);
  };

  const selectSala = (salaId) => {
    setSalaSeleccionada(salaId);
    if (salaId) {
      const sala = salas.find(s => s.id === salaId);
      if (sala?.numero) navigate(`/oficinas/${sala.numero}`, { replace: true });
    } else {
      navigate('/oficinas', { replace: true });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dispositivosRes, salasRes, usuariosRes] = await Promise.all([
          fetch(`${API_BASE}/dispositivos`).then(res => res.json()),
          fetch(`${API_BASE}/salas`).then(res => res.json()),
          fetch(`${API_BASE}/usuarios`).then(res => res.json()),
        ]);
        
        setDispositivos(Array.isArray(dispositivosRes.data) ? dispositivosRes.data : []);
        setSalas(Array.isArray(salasRes.data) ? salasRes.data : []);
        setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar dispositivos y salas");
        setDispositivos([]);
        setSalas([]);
        setUsuarios([]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchLecturas = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `${API_BASE}/lecturas?año=${añoSeleccionado}`;
        if (periodoSeleccionado === 'mes') {
          url += `&mes=${mesSeleccionado}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar lecturas');
        
        const json = await response.json();
        const todasLecturas = json.data || [];
        
        setLecturas(todasLecturas);
      } catch (err) {
        console.error("Error al cargar lecturas:", err);
        setError("Error al cargar lecturas");
        setLecturas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLecturas();
  }, [añoSeleccionado, mesSeleccionado, periodoSeleccionado]);

  const getDispositivosDeSala = () => {
    if (!salaSeleccionada) return [];
    return dispositivos.filter(d => d.sala_id === salaSeleccionada);
  };

  const getEstadisticasDispositivo = (dispositivoId) => {
    const lecturasDisp = lecturas.filter(l => l.dispositivo_id === dispositivoId);
    const totalConsumo = lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.consumo_kwh) || 0), 0);
    const totalEmisiones = lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.emisiones_kgco2) || 0), 0);
    const totalHoras = lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.horas) || 0), 0);
    
    const totalTrafico = lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.trafico_mb) || 0), 0);
    const consumoTrafico = lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.consumo_trafico_kwh) || 0), 0);
    const emisionesTrafico = lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.emisiones_trafico_kg) || 0), 0);
    
    const horasEncendido = lecturasDisp
      .filter(l => l.estado?.trim() === 'Encendido')
      .reduce((sum, l) => sum + (parseFloat(l.horas) || 0), 0);
    
    return {
      totalConsumo: totalConsumo.toFixed(2),
      totalEmisiones: totalEmisiones.toFixed(2),
      totalHoras: totalHoras.toFixed(0),
      horasEncendido: horasEncendido.toFixed(0),
      horasApagado: (totalHoras - horasEncendido).toFixed(0),
      porcentajeEncendido: totalHoras > 0 ? ((horasEncendido / totalHoras) * 100).toFixed(1) : 0,
      trafico_mb: totalTrafico > 0 ? totalTrafico.toFixed(2) : null,
      consumo_trafico_kwh: consumoTrafico > 0 ? consumoTrafico.toFixed(6) : null,
      emisiones_trafico_kg: emisionesTrafico > 0 ? emisionesTrafico.toFixed(6) : null
    };
  };

  const getResumenSala = () => {
    if (!salaSeleccionada) return null;
    const dispositivosSala = getDispositivosDeSala();
    const sala = salas.find(s => s.id === salaSeleccionada);
    const encargado = usuarios.find(u => u.id === sala?.encargado_id);
    
    let totalConsumo = 0;
    let totalEmisiones = 0;
    let totalHoras = 0;
    let totalTrafico = 0;
    let totalConsumoDigital = 0;
    let totalEmisionesDigitales = 0;
    
    dispositivosSala.forEach(disp => {
      const stats = getEstadisticasDispositivo(disp.id);
      totalConsumo += parseFloat(stats.totalConsumo);
      totalEmisiones += parseFloat(stats.totalEmisiones);
      totalHoras += parseFloat(stats.totalHoras);
      
      if (stats.trafico_mb) totalTrafico += parseFloat(stats.trafico_mb);
      if (stats.consumo_trafico_kwh) totalConsumoDigital += parseFloat(stats.consumo_trafico_kwh);
      if (stats.emisiones_trafico_kg) totalEmisionesDigitales += parseFloat(stats.emisiones_trafico_kg);
    });
    
    return {
      sala: sala,
      encargado: encargado,
      numDispositivos: dispositivosSala.length,
      totalConsumo: totalConsumo.toFixed(2),
      totalEmisiones: totalEmisiones.toFixed(2),
      totalHoras: totalHoras.toFixed(0),
      totalTrafico: totalTrafico > 0 ? (totalTrafico / 1024).toFixed(2) : null,
      totalConsumoDigital: totalConsumoDigital > 0 ? totalConsumoDigital.toFixed(4) : null,
      totalEmisionesDigitales: totalEmisionesDigitales > 0 ? totalEmisionesDigitales.toFixed(4) : null
    };
  };

  const dispositivosSala = getDispositivosDeSala();
  const resumenSala = getResumenSala();

  // Obtener lista de edificios únicos
  const edificiosUnicos = useMemo(
    () => [...new Set(salas.map(s => s.edificio))].filter(Boolean).sort(),
    [salas]
  );

  const edificioInicializado = useRef(false);
  useEffect(() => {
    if (edificioInicializado.current || edificiosUnicos.length === 0) return;
    edificioInicializado.current = true;
    const preferred = edificiosUnicos.find(e => /inform[aá]tica/i.test(e));
    setEdificioSeleccionado(preferred || edificiosUnicos[0]);

  }, [edificiosUnicos]);

  useEffect(() => {
    if (!salaNumero || salas.length === 0) return;
    const sala = salas.find(s => String(s.numero) === String(salaNumero));
    if (sala) setSalaSeleccionada(sala.id);
  }, [salaNumero, salas]);

  const getPeriodoTexto = () => {
    if (periodoSeleccionado === 'año') return `Año ${añoSeleccionado}`;
    if (periodoSeleccionado === 'mes') return `${mesesNombres[parseInt(mesSeleccionado) - 1]} ${añoSeleccionado}`;
    return '';
  };

  const handleSalaSelectFromEdificio = (salaId) => {
    selectSala(salaId);
  };

  // FUNCIÓN AUXILIAR PARA CALCULAR CONSUMO

  
  const getConsumoSala = (salaId) => {
    const dispositivosSala = dispositivos.filter(d => d.sala_id === salaId);
    let totalConsumo = 0;
    dispositivosSala.forEach(disp => {
      const lecturasDisp = lecturas.filter(l => l.dispositivo_id === disp.id);
      totalConsumo += lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.consumo_kwh) || 0), 0);
    });
    return totalConsumo;
  };


  //GENERAR PDFs

  
  const handleGenerarPDFSala = () => {
    if (!salaSeleccionada || !resumenSala) {
      alert('Por favor selecciona una sala primero');
      return;
    }

    const dispositivosSala = getDispositivosDeSala();
    const estadisticasDispositivos = {};
    
    dispositivosSala.forEach(disp => {
      estadisticasDispositivos[disp.id] = getEstadisticasDispositivo(disp.id);
    });

    generarReporteSala({
      sala: resumenSala.sala,
      encargado: resumenSala.encargado,
      dispositivos: dispositivosSala,
      resumenSala: resumenSala,
      periodoTexto: getPeriodoTexto(),
      estadisticasDispositivos: estadisticasDispositivos
    });
  };

  const handleGenerarPDFEdificio = () => {
    const estadisticasEdificio = {
      consumoTotal: 0,
      emisionesTotales: 0,
      porPiso: {}
    };

    const salasParaPDF = edificioSeleccionado
      ? salas.filter(s => s.edificio === edificioSeleccionado)
      : salas;

    salasParaPDF.forEach(sala => {
      const consumoSala = getConsumoSala(sala.id);
      const dispositivosSala = dispositivos.filter(d => d.sala_id === sala.id);
      let emisionesSala = 0;
      
      dispositivosSala.forEach(disp => {
        const lecturasDisp = lecturas.filter(l => l.dispositivo_id === disp.id);
        emisionesSala += lecturasDisp.reduce((sum, l) => sum + (parseFloat(l.emisiones_kgco2) || 0), 0);
      });

      estadisticasEdificio.consumoTotal += consumoSala;
      estadisticasEdificio.emisionesTotales += emisionesSala;

      const piso = sala.piso;
      if (!estadisticasEdificio.porPiso[piso]) {
        estadisticasEdificio.porPiso[piso] = { consumo: 0, emisiones: 0 };
      }
      estadisticasEdificio.porPiso[piso].consumo += consumoSala;
      estadisticasEdificio.porPiso[piso].emisiones += emisionesSala;
    });

    // Calcular porcentajes
    Object.keys(estadisticasEdificio.porPiso).forEach(piso => {
      const datos = estadisticasEdificio.porPiso[piso];
      datos.consumo = datos.consumo.toFixed(2);
      datos.emisiones = datos.emisiones.toFixed(2);
      datos.porcentaje = estadisticasEdificio.consumoTotal > 0 
        ? ((datos.consumo / estadisticasEdificio.consumoTotal) * 100).toFixed(1) 
        : '0';
    });

    estadisticasEdificio.consumoTotal = estadisticasEdificio.consumoTotal.toFixed(2);
    estadisticasEdificio.emisionesTotales = estadisticasEdificio.emisionesTotales.toFixed(2);

    generarReporteEdificio({
      salas: salasParaPDF,
      dispositivos: dispositivos,
      estadisticasEdificio: estadisticasEdificio,
      periodoTexto: getPeriodoTexto(),
      edificio: edificioSeleccionado || 'Todos los edificios'
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '24px', margin: '0 0 15px 0' }}>Visor de Dispositivos por Sala</h1>
              
              {error && <p style={{ color: 'red' }}>{error}</p>}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Seleccionar Edificio:</label>
                <select
                  value={edificioSeleccionado}
                  onChange={(e) => { setEdificioSeleccionado(e.target.value); selectSala(''); }}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '300px', fontSize: '14px' }}
                >
                  <option value="">🏢 Todos los edificios</option>
                  {edificiosUnicos.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Seleccionar Sala:</label>
                <select value={salaSeleccionada} onChange={(e) => selectSala(e.target.value)}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '300px', fontSize: '14px' }}>
                  <option value="">-- Selecciona una sala --</option>
                  {(edificioSeleccionado ? salas.filter(s => s.edificio === edificioSeleccionado) : salas).map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.nombre} (Piso {sala.piso})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold' }}>Período de análisis:</label>
                <div style={{ display: 'flex', gap: '5px', backgroundColor: '#f0f0f0', padding: '4px', borderRadius: '6px' }}>
                  <button onClick={() => setPeriodoSeleccionado('año')}
                    style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                      backgroundColor: periodoSeleccionado === 'año' ? '#2196F3' : 'transparent',
                      color: periodoSeleccionado === 'año' ? 'white' : '#333',
                      fontWeight: periodoSeleccionado === 'año' ? 'bold' : 'normal' }}>
                    Por Año
                  </button>
                  <button onClick={() => setPeriodoSeleccionado('mes')}
                    style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                      backgroundColor: periodoSeleccionado === 'mes' ? '#2196F3' : 'transparent',
                      color: periodoSeleccionado === 'mes' ? 'white' : '#333',
                      fontWeight: periodoSeleccionado === 'mes' ? 'bold' : 'normal' }}>
                    Por Mes 
                  </button>
                </div>

                <select value={añoSeleccionado} onChange={(e) => setAñoSeleccionado(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>

                {periodoSeleccionado === 'mes' && (
                  <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    {mesesNombres.map((mes, idx) => (
                      <option key={idx} value={(idx + 1).toString().padStart(2, '0')}>{mes}</option>
                    ))}
                  </select>
                )}
              </div>

            {loading ? (
              <p>Cargando datos...</p>
            ) : salaSeleccionada && resumenSala ? (
              <>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196F3' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#1565c0' }}>{resumenSala.sala?.nombre}</h2>
                    
                    <button
                      onClick={handleGenerarPDFSala}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#d32f2f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
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
                      title="Descargar reporte PDF de esta sala"
                    >
                       <FileText size={15} style={{ marginRight: 4 }} />
                      PDF Sala Actual
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                    
                    <div style={{ flex: 1 }}>
                      <h2 style={{ marginTop: 0, marginBottom: '10px', fontSize: '20px', color: '#1565c0' }}></h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', fontSize: '13px' }}>
                        <p style={{ margin: '3px 0' }}><Building2 size={15} style={{ marginRight: 2 }} /><strong>Edificio:</strong> {resumenSala.sala?.edificio}</p>
                        <p style={{ margin: '3px 0' }}><DoorOpen size={15} style={{ marginRight: 2 }} /><strong>Piso:</strong> {resumenSala.sala?.piso}</p>
                        <p style={{ margin: '3px 0' }}><Hash size={12} style={{ marginRight: 2 }} /><strong>Número:</strong> {resumenSala.sala?.numero}</p>
                        <p style={{ margin: '3px 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Leaf size={15}/><strong>Perfil ambiental:</strong>{''}
                          {resumenSala.encargado?.perfil
                            ? (PERFILES_ENCARGADO[resumenSala.encargado.perfil]?.nombre || `Perfil ${resumenSala.encargado.perfil}`)
                            : 'Sin perfil asignado'}
                          {resumenSala.encargado?.id && resumenSala.encargado?.perfil && (
                            <button
                              onClick={() => navigate(`/sugerencias/${parseInt(resumenSala.encargado.id.replace(/^PF-/, ''), 10)}`)}
                              title="Ver módulo de sugerencias"
                              style={{
                                background: 'none',
                                border: '1px solid #4caf50',
                                borderRadius: '4px',
                                color: '#4caf50',
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: '2px 7px',
                                lineHeight: '1.4',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Ver sugerencias →
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <h3 style={{ color: '#1976d2', margin: '12px 0 8px 0', fontSize: '15px' }}>
                    Resumen General - {getPeriodoTexto()}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center', border: '2px solid #2196F3' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Dispositivos</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7b1fa2' }}>{resumenSala.numDispositivos}</div>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center', border: '2px solid #2196F3' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Consumo Total</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>{resumenSala.totalConsumo}</div>
                      <div style={{ fontSize: '10px', color: '#999' }}>kWh</div>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center', border: '2px solid #2196F3' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Emisiones Totales</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>{resumenSala.totalEmisiones}</div>
                      <div style={{ fontSize: '10px', color: '#999' }}>kg CO₂</div>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center', border: '2px solid #2196F3' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Horas Totales</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#388e3c' }}>{resumenSala.totalHoras}</div>
                      <div style={{ fontSize: '10px', color: '#999' }}>horas</div>
                    </div>
                  </div>

                  {resumenSala.totalTrafico && (
                    <>
                      <h3 style={{ 
                        color: '#4338ca', 
                        margin: '12px 0 8px 0', 
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Wifi size={16} color="#6366f1" />
                        Huella de Carbono Digital
                      </h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center', border: '2px solid #6366f1' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Tráfico Total</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6366f1' }}>{resumenSala.totalTrafico}</div>
                          <div style={{ fontSize: '10px', color: '#999' }}>GB</div>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center', border: '2px solid #8b5cf6' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Consumo de Tráfico de Red</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{resumenSala.totalConsumoDigital}</div>
                          <div style={{ fontSize: '10px', color: '#999' }}>kWh</div>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center', border: '2px solid #a855f7' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Emisiones de Tráfico de Red</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#a855f7' }}>{resumenSala.totalEmisionesDigitales}</div>
                          <div style={{ fontSize: '10px', color: '#999' }}>kg CO₂</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <GraficosSalaInline
                  lecturas={lecturas}
                  dispositivos={dispositivos}
                  salaId={salaSeleccionada}
                  periodoSeleccionado={periodoSeleccionado}
                  añoSeleccionado={añoSeleccionado}
                  mesSeleccionado={mesSeleccionado}
                />

                <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>Dispositivos en la Sala ({dispositivosSala.length})</h2>

                {dispositivosSala.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>No hay dispositivos asignados a esta sala</p>
                ) : (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {dispositivosSala.map((dispositivo) => {
                      const stats = getEstadisticasDispositivo(dispositivo.id);
                      
                      const imagenUrl = dispositivo?.imagen_efectiva
                        ? `${API_BASE.replace('/api', '')}${dispositivo.imagen_efectiva}`
                        : null;

                      return (
                        <div key={dispositivo.id}
                          style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr 2fr', gap: '25px', alignItems: 'start' }}>

                            <div 
                              className="device-image" 
                              onClick={() => handleDispositivoClick(dispositivo.id)}
                              style={{ 
                                width: '120px', 
                                height: '120px', 
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                borderRadius: '8px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                              title="Click para ver gráficos de dispositivos detallados"
                            >
                              {imagenUrl ? (
                                <img 
                                  src={imagenUrl}
                                  alt={dispositivo.nombre_modelo}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover', 
                                    borderRadius: '8px', 
                                    border: '2px solid #4CAF50' 
                                  }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  fontSize: '40px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: '#f0f0f0',
                                  borderRadius: '8px',
                                  border: '2px solid #ddd'
                                }}>
                                  📱
                                </div>
                              )}
                              

                            </div>

                            <div>
                              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{dispositivo.nombre_modelo}</h3>
                              <p style={{ margin: '5px 0', fontSize: '14px', color: '#1976d2' }}><strong>ID:</strong> {dispositivo.id}</p>
                              <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}><strong>Tipo:</strong> {dispositivo.tipo}</p>
                              <p style={{ margin: '5px 0', fontSize: '14px', color: '#a05000' }}><strong>Descripción:</strong> {dispositivo.descripcion}</p>
                              <p style={{ margin: '5px 0', fontSize: '14px', color: '#7b1fa2' }}><strong>Uso:</strong> {dispositivo.años_uso} años</p>
                              <p style={{ margin: '5px 0', fontSize: '13px', color: '#4CAF50' }}><strong>Encendido:</strong> {dispositivo.watts_encendido} W</p>
                              <p style={{ margin: '5px 0', fontSize: '13px', color: '#d32f2f' }}><strong>Apagado:</strong> {dispositivo.watts_apagado} W</p>
                            </div>

                            <div>
                              <h4 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>Estadísticas de Uso</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#666' }}>Consumo Total</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>{stats.totalConsumo}</div>
                                  <div style={{ fontSize: '10px', color: '#999' }}>kWh</div>
                                </div>
                                <div style={{ padding: '10px', backgroundColor: '#ffebee', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#666' }}>Emisiones</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>{stats.totalEmisiones}</div>
                                  <div style={{ fontSize: '10px', color: '#999' }}>kg CO₂</div>
                                </div>
                                <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#666' }}>Horas Totales</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#388e3c' }}>{stats.totalHoras}</div>
                                  <div style={{ fontSize: '10px', color: '#999' }}>h</div>
                                </div>
                                <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#666' }}>Horas Encendido</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f57c00' }}>{stats.horasEncendido}</div>
                                  <div style={{ fontSize: '10px', color: '#999' }}>h</div>
                                </div>
                                <div style={{ padding: '10px', backgroundColor: '#f3e5f5', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#666' }}>Horas Apagado</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7b1fa2' }}>{stats.horasApagado}</div>
                                  <div style={{ fontSize: '10px', color: '#999' }}>h</div>
                                </div>
                                <div style={{ padding: '10px', backgroundColor: '#e0f2f1', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#666' }}>% Encendido</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00796b' }}>{stats.porcentajeEncendido}%</div>
                                </div>
                              </div>

                              <HuellaDigitalCard stats={stats} />
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '40px', fontSize: '16px' }}>
                Selecciona una sala para ver sus dispositivos
              </p>
            )}
            </div>
          </div>

          <div style={{ position: 'sticky', top: '20px' }}>
            <EdificioSidebar 
              dispositivos={dispositivos} 
              salas={edificioSeleccionado ? salas.filter(s => s.edificio === edificioSeleccionado) : salas}
              lecturas={lecturas} 
              salaSeleccionada={salaSeleccionada} 
              onSalaSelect={handleSalaSelectFromEdificio}
              vistaEdificio={vistaEdificio}
              setVistaEdificio={setVistaEdificio}
              edificioSeleccionado={edificioSeleccionado}
              setEdificioSeleccionado={setEdificioSeleccionado}
              edificiosUnicos={edificiosUnicos}
              setSalaSeleccionada={selectSala}
              onGenerarPDFEdificio={handleGenerarPDFEdificio}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OficinasView;
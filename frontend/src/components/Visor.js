import React, { useState, useEffect } from "react";

const Visor = () => {
  const [dispositivos, setDispositivos] = useState([]);
  const [salas, setSalas] = useState([]);
  const [lecturas, setLecturas] = useState([]);
  const [salaSeleccionada, setSalaSeleccionada] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('año'); // año, mes
  const [añoSeleccionado, setAñoSeleccionado] = useState('2024');
  const [mesSeleccionado, setMesSeleccionado] = useState('01');

  const API_BASE = 'http://localhost:3001/api';
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [lecturasRes, dispositivosRes, salasRes] = await Promise.all([
          fetch(`${API_BASE}/lecturas`).then((res) => res.json()),
          fetch(`${API_BASE}/dispositivos`).then((res) => res.json()),
          fetch(`${API_BASE}/salas`).then((res) => res.json()),
        ]);

        setLecturas(lecturasRes);
        setDispositivos(dispositivosRes);
        setSalas(salasRes);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDispositivosDeSala = () => {
    if (!salaSeleccionada) return [];
    
    return dispositivos.filter(d => d.sala_id === salaSeleccionada);
  };

  const filtrarLecturasPorPeriodo = (lecturasArray) => {
    if (periodoSeleccionado === 'año') return lecturasArray;

    return lecturasArray.filter(lectura => {
      const fecha = new Date(lectura.fecha + 'T00:00:00');
      const año = fecha.getFullYear();
      const mes = fecha.getMonth() + 1;

      if (periodoSeleccionado === 'año') {
        return año === parseInt(añoSeleccionado);
      } else if (periodoSeleccionado === 'mes') {
        return año === parseInt(añoSeleccionado) && mes === parseInt(mesSeleccionado);
      }
      return true;
    });
  };

  const getEstadisticasDispositivo = (dispositivoId) => {
    const lecturasDisp = lecturas.filter(l => l.dispositivo_id === dispositivoId);
    const lecturasFiltradas = filtrarLecturasPorPeriodo(lecturasDisp);
    
    const totalConsumo = lecturasFiltradas.reduce((sum, l) => sum + (parseFloat(l.consumo_kwh) || 0), 0);
    const totalEmisiones = lecturasFiltradas.reduce((sum, l) => sum + (parseFloat(l.emisiones_kgco2) || 0), 0);
    const totalHoras = lecturasFiltradas.reduce((sum, l) => sum + (parseInt(l.horas) || 0), 0);
    
    const horasEncendido = lecturasFiltradas
      .filter(l => l.estado === 'Encendido')
      .reduce((sum, l) => sum + (parseInt(l.horas) || 0), 0);
    
    return {
      totalConsumo: totalConsumo.toFixed(2),
      totalEmisiones: totalEmisiones.toFixed(2),
      totalHoras: totalHoras,
      horasEncendido: horasEncendido,
      horasApagado: totalHoras - horasEncendido,
      porcentajeEncendido: totalHoras > 0 ? ((horasEncendido / totalHoras) * 100).toFixed(1) : 0
    };
  };

  const getResumenSala = () => {
    if (!salaSeleccionada) return null;
    
    const dispositivosSala = getDispositivosDeSala();
    const sala = salas.find(s => s.id === salaSeleccionada);
    
    let totalConsumo = 0;
    let totalEmisiones = 0;
    let totalHoras = 0;
    
    dispositivosSala.forEach(disp => {
      const stats = getEstadisticasDispositivo(disp.id);
      totalConsumo += parseFloat(stats.totalConsumo);
      totalEmisiones += parseFloat(stats.totalEmisiones);
      totalHoras += stats.totalHoras;
    });
    
    return {
      sala: sala,
      numDispositivos: dispositivosSala.length,
      totalConsumo: totalConsumo.toFixed(2),
      totalEmisiones: totalEmisiones.toFixed(2),
      totalHoras: totalHoras
    };
  };

  const dispositivosSala = getDispositivosDeSala();
  const resumenSala = getResumenSala();

  const getPeriodoTexto = () => {
    if (periodoSeleccionado === 'año') return `Año ${añoSeleccionado}`;
    if (periodoSeleccionado === 'mes') return `${mesesNombres[parseInt(mesSeleccionado) - 1]} ${añoSeleccionado}`;
    return '';
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h1>Visor de Dispositivos por Sala</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Seleccionar Sala:</label>
        <select
          value={salaSeleccionada}
          onChange={(e) => setSalaSeleccionada(e.target.value)}
          style={{ 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid #ccc', 
            minWidth: '300px',
            fontSize: '14px'
          }}
        >
          <option value="">-- Selecciona una sala --</option>
          {salas.map((sala) => (
            <option key={sala.id} value={sala.id}>
              {sala.nombre} - {sala.edificio} (Piso {sala.piso})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold' }}>Período de análisis:</label>
        
        <div style={{ display: 'flex', gap: '5px', backgroundColor: '#f0f0f0', padding: '4px', borderRadius: '6px' }}>

          <button
            onClick={() => setPeriodoSeleccionado('año')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: periodoSeleccionado === 'año' ? '#4CAF50' : 'transparent',
              color: periodoSeleccionado === 'año' ? 'white' : '#333',
              fontWeight: periodoSeleccionado === 'año' ? 'bold' : 'normal'
            }}
          >
            Por Año
          </button>
          <button
            onClick={() => setPeriodoSeleccionado('mes')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: periodoSeleccionado === 'mes' ? '#4CAF50' : 'transparent',
              color: periodoSeleccionado === 'mes' ? 'white' : '#333',
              fontWeight: periodoSeleccionado === 'mes' ? 'bold' : 'normal'
            }}
          >
            Por Mes
          </button>
        </div>

        {(periodoSeleccionado === 'año' || periodoSeleccionado === 'mes') && (
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        )}

        {periodoSeleccionado === 'mes' && (
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

      {loading ? (
        <p>Cargando datos...</p>
      ) : salaSeleccionada && resumenSala ? (
        <>
          <div style={{ 
            marginBottom: '30px', 
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            border: '2px solid #2196F3'
          }}>
            <h2 style={{ marginTop: 0, color: '#1565c0' }}>
              {resumenSala.sala.nombre}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <p style={{ margin: '5px 0' }}><strong>Edificio:</strong> {resumenSala.sala.edificio}</p>
              <p style={{ margin: '5px 0' }}><strong>Piso:</strong> {resumenSala.sala.piso}</p>
              <p style={{ margin: '5px 0' }}><strong>Número:</strong> {resumenSala.sala.numero}</p>
              <p style={{ margin: '5px 0' }}><strong>Encargado:</strong> {resumenSala.sala.encargado_nombre}</p>
            </div>
            
            <h3 style={{ color: '#1976d2', marginTop: '20px', marginBottom: '10px' }}>
              Resumen General - {getPeriodoTexto()}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Dispositivos</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>
                  {resumenSala.numDispositivos}
                </div>
              </div>
              <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Consumo Total</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                  {resumenSala.totalConsumo}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>kWh</div>
              </div>
              <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Emisiones Totales</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d32f2f' }}>
                  {resumenSala.totalEmisiones}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>kg CO₂</div>
              </div>
              <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Horas Totales</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
                  {resumenSala.totalHoras}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>horas</div>
              </div>
            </div>
          </div>

          <h2 style={{ marginBottom: '15px' }}>
            Dispositivos en la Sala ({dispositivosSala.length})
          </h2>

          {dispositivosSala.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No hay dispositivos asignados a esta sala
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {dispositivosSala.map((dispositivo) => {
                const stats = getEstadisticasDispositivo(dispositivo.id);
                return (
                  <div 
                    key={dispositivo.id}
                    style={{ 
                      border: '1px solid #ddd', 
                      borderRadius: '8px', 
                      padding: '20px',
                      backgroundColor: '#fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                          {dispositivo.nombre_modelo}
                        </h3>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>ID:</strong> {dispositivo.id}
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Tipo:</strong> {dispositivo.tipo}
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Descripción:</strong> {dispositivo.descripcion}
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Años de uso:</strong> {dispositivo.años_uso}
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Potencia encendido:</strong> {dispositivo.watts_encendido} W
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Potencia apagado:</strong> {dispositivo.watts_apagado} W
                        </p>
                      </div>
                      
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>Estadísticas de Uso</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#666' }}>Consumo Total</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                              {stats.totalConsumo}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999' }}>kWh</div>
                          </div>
                          <div style={{ padding: '10px', backgroundColor: '#ffebee', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#666' }}>Emisiones</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
                              {stats.totalEmisiones}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999' }}>kg CO₂</div>
                          </div>
                          <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#666' }}>Horas Totales</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#388e3c' }}>
                              {stats.totalHoras}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999' }}>h</div>
                          </div>
                          <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#666' }}>Horas Encendido</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f57c00' }}>
                              {stats.horasEncendido}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999' }}>h</div>
                          </div>
                          <div style={{ padding: '10px', backgroundColor: '#f3e5f5', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#666' }}>Horas Apagado</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7b1fa2' }}>
                              {stats.horasApagado}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999' }}>h</div>
                          </div>
                          <div style={{ padding: '10px', backgroundColor: '#e0f2f1', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#666' }}>% Encendido</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00796b' }}>
                              {stats.porcentajeEncendido}%
                            </div>
                          </div>
                        </div>
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
  );
};

export default Visor;
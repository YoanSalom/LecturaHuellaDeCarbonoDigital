import React, { useState, useEffect } from 'react';
import RegenerateDataButton from './RegenerateDataButton';
import { authFetch } from '../../utils/authFetch';

const API_BASE = 'http://localhost:3001/api';
const SERVER_BASE = 'http://localhost:3001';

const DispositivosAdmin = () => {
  const [dispositivos, setDispositivos] = useState([]);
  const [dispositivosFiltrados, setDispositivosFiltrados] = useState([]);
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [tipoImagenes, setTipoImagenes] = useState({});
  const [showTipoImagenesPanel, setShowTipoImagenesPanel] = useState(false);
  const [sortBy, setSortBy] = useState('id');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoPersonalizado, setTipoPersonalizado] = useState('');
  const [mostrarInputOtro, setMostrarInputOtro] = useState(false);
  const [filterInternet, setFilterInternet] = useState('todos');
  const [filterEdificio, setFilterEdificio] = useState('todos');
  
  const [formData, setFormData] = useState({
    id: '',
    nombre_modelo: '',
    descripcion: '',
    tipo: 'Monitor',
    años_uso: 1,
    sala_id: '',
    watts_encendido: 0,
    watts_apagado: 0,
    horas_vida_util: 0,
    usa_internet: false
  });

  const [showDuplicarModal, setShowDuplicarModal] = useState(false);
  const [dispositivoADuplicar, setDispositivoADuplicar] = useState(null);
  const [duplicarConfig, setDuplicarConfig] = useState({
    cantidad: 5,
    variacion_watts: 10,
    sala_id: ''
  });
  const [duplicarLoading, setDuplicarLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    aplicarFiltrosYOrdenamiento();
  }, [dispositivos, sortBy, filterTipo, searchTerm, filterInternet, filterEdificio]);

  const fetchData = async () => {
    try {
      const [dispositivosRes, salasRes, tiposImgRes] = await Promise.all([
        fetch(`${API_BASE}/dispositivos`),
        fetch(`${API_BASE}/salas`),
        fetch(`${API_BASE}/tipos-imagen`)
      ]);

      const dispositivosData = await dispositivosRes.json();
      const salasData = await salasRes.json();
      const tiposImgData = await tiposImgRes.json();

      if (dispositivosData.success) setDispositivos(dispositivosData.data);
      if (salasData.success) setSalas(salasData.data);
      if (tiposImgData.success) setTipoImagenes(tiposImgData.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleTipoImageUpload = async (tipo) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('imagen', file);
      try {
        const res = await fetch(`${API_BASE}/tipos-imagen/${encodeURIComponent(tipo)}`, {
          method: 'POST', body: fd
        });
        const result = await res.json();
        if (result.success) {
          setTipoImagenes(prev => ({ ...prev, [tipo]: result.imagen_url }));
          setDispositivos(prev => prev.map(d =>
            d.tipo === tipo && !d.imagen_url
              ? { ...d, imagen_efectiva: result.imagen_url }
              : d
          ));
          alert(`Imagen genérica para "${tipo}" actualizada`);
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (err) {
        console.error(err);
        alert('Error al subir imagen de tipo');
      }
    };
    input.click();
  };

  const handleTipoImageDelete = async (tipo) => {
    if (!window.confirm(`¿Quitar imagen genérica del tipo "${tipo}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/tipos-imagen/${encodeURIComponent(tipo)}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setTipoImagenes(prev => { const n = { ...prev }; delete n[tipo]; return n; });
        setDispositivos(prev => prev.map(d =>
          d.tipo === tipo && !d.imagen_url ? { ...d, imagen_efectiva: null } : d
        ));
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar imagen de tipo');
    }
  };

  const aplicarFiltrosYOrdenamiento = () => {
    let resultado = [...dispositivos];

    if (filterTipo !== 'todos') {
      resultado = resultado.filter(d => d.tipo === filterTipo);
    }
    if (filterInternet === 'con_internet') {
      resultado = resultado.filter(d => d.usa_internet === 1 || d.usa_internet === true);
    } else if (filterInternet === 'sin_internet') {
      resultado = resultado.filter(d => d.usa_internet === 0 || d.usa_internet === false);
    }
    if (filterEdificio !== 'todos') {
      resultado = resultado.filter(d => d.edificio === filterEdificio);
    }

    if (searchTerm) {
      resultado = resultado.filter(d => 
        d.nombre_modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.descripcion && d.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    resultado.sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return a.id.localeCompare(b.id);
        case 'nombre':
          return a.nombre_modelo.localeCompare(b.nombre_modelo);
        case 'tipo':
          return a.tipo.localeCompare(b.tipo) || a.nombre_modelo.localeCompare(b.nombre_modelo);
        default:
          return 0;
      }
    });

    setDispositivosFiltrados(resultado);
  };

  const generarSiguienteId = () => {
    if (dispositivos.length === 0) {
      return 'D-0001';
    }

    const numerosExistentes = dispositivos
      .filter(d => d.id.startsWith('D-'))
      .map(d => {
        const match = d.id.match(/D-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .sort((a, b) => b - a);

    const siguienteNumero = numerosExistentes[0] + 1;
    return `D-${siguienteNumero.toString().padStart(4, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    if (name === 'tipo') {
      if (value === 'Otro') {
        setMostrarInputOtro(true);
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        setMostrarInputOtro(false);
        setTipoPersonalizado('');
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTipoPersonalizadoChange = (e) => {
    const value = e.target.value;
    setTipoPersonalizado(value);
    setFormData(prev => ({ ...prev, tipo: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.watts_encendido <= 0) {
      alert('La potencia en encendido debe ser mayor a 0');
      return;
    }
    if (formData.watts_apagado < 0) {
      alert('La potencia en apagado no puede ser negativa');
      return;
    }
    
    if (!formData.tipo || formData.tipo.trim() === '') {
      alert('Debes especificar un tipo de dispositivo');
      return;
    }

    try {
      const url = editingDevice
        ? `${API_BASE}/dispositivos/${editingDevice.id}`
        : `${API_BASE}/dispositivos`;

      const method = editingDevice ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingDevice ? 'Dispositivo actualizado' : 'Dispositivo creado');
        fetchData();
        closeModal();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar dispositivo');
    }
  };

  const handleEdit = (dispositivo) => {
    setEditingDevice(dispositivo);
    
    const tiposBase = [
      'Monitor', 'Router', 'Televisor', 'Proyector', 'Impresora',
      'Computadora', 'Tablet', 'Teléfono', 'Pizarra', 'Servidor',
      'Red', 'Audio', 'Seguridad', 'Scanner', 'UPS', 'Laboratorio'
    ];
    
    const esPersonalizado = !tiposBase.includes(dispositivo.tipo);
    
    setFormData({
      id: dispositivo.id,
      nombre_modelo: dispositivo.nombre_modelo,
      descripcion: dispositivo.descripcion || '',
      tipo: esPersonalizado ? 'Otro' : dispositivo.tipo,
      años_uso: dispositivo.años_uso,
      sala_id: dispositivo.sala_id,
      watts_encendido: dispositivo.watts_encendido,
      watts_apagado: dispositivo.watts_apagado,
      horas_vida_util: dispositivo.horas_vida_util,
      usa_internet: dispositivo.usa_internet === 1 || dispositivo.usa_internet === true
    });
    
    if (esPersonalizado) {
      setMostrarInputOtro(true);
      setTipoPersonalizado(dispositivo.tipo);
      setFormData(prev => ({ ...prev, tipo: dispositivo.tipo }));
    } else {
      setMostrarInputOtro(false);
      setTipoPersonalizado('');
    }
    
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este dispositivo? Se eliminarán también sus horarios asociados.')) return;

    try {
      const response = await authFetch(`${API_BASE}/dispositivos/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert('Dispositivo eliminado');
        fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar dispositivo');
    }
  };

  const handleOpenDuplicar = (dispositivo) => {
    setDispositivoADuplicar(dispositivo);
    setDuplicarConfig({ cantidad: 5, variacion_watts: 10, sala_id: dispositivo.sala_id || '' });
    setShowDuplicarModal(true);
  };

  const handleDuplicar = async () => {
    if (duplicarConfig.cantidad < 1 || duplicarConfig.cantidad > 50) {
      alert('La cantidad debe estar entre 1 y 50');
      return;
    }
    setDuplicarLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/dispositivos/duplicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispositivo_id: dispositivoADuplicar.id,
          cantidad: parseInt(duplicarConfig.cantidad),
          variacion_watts: parseFloat(duplicarConfig.variacion_watts),
          sala_id: duplicarConfig.sala_id || null
        })
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.mensaje}`);
        setShowDuplicarModal(false);
        setDispositivoADuplicar(null);
        fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al duplicar dispositivos');
    } finally {
      setDuplicarLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDevice(null);
    
    const siguienteId = generarSiguienteId();
    
    setFormData({
      id: siguienteId,
      nombre_modelo: '',
      descripcion: '',
      tipo: 'Monitor',
      años_uso: 1,
      sala_id: salas.length > 0 ? salas[0].id : '',
      watts_encendido: 0,
      watts_apagado: 0,
      horas_vida_util: 0,
      usa_internet: false
    });
    
    setMostrarInputOtro(false);
    setTipoPersonalizado('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDevice(null);
    setMostrarInputOtro(false);
    setTipoPersonalizado('');
  };

  const handleImageUpload = async (dispositivoId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formDataUpload = new FormData();
      formDataUpload.append('imagen', file);

      try {
        const response = await authFetch(`${API_BASE}/uploads/dispositivo/${dispositivoId}`, {
          method: 'POST',
          body: formDataUpload
        });
        const result = await response.json();

        if (result.success) {
          alert('Imagen actualizada');
          fetchData();
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al subir imagen');
      }
    };

    input.click();
  };

  const tiposDispositivo = [
    'Monitor', 'Router', 'Televisor', 'Proyector', 'Impresora',
    'Computadora', 'Tablet', 'Teléfono', 'Pizarra', 'Servidor',
    'Red', 'Audio', 'Seguridad', 'Scanner', 'UPS', 'Laboratorio', 'Otro'
  ];

  const tiposUnicos = ['todos', ...new Set(dispositivos.map(d => d.tipo))].sort();
  const edificiosUnicos = ['todos', ...new Set(dispositivos.map(d => d.edificio).filter(Boolean))].sort();

  if (loading) return <div className="loading">Cargando dispositivos...</div>;

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>💻 Gestión de Dispositivos</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <RegenerateDataButton onSuccess={() => {
            console.log('Datos regenerados, recargando dispositivos...');
            fetchData();
          }} />
          <button className="btn-primary" onClick={openCreateModal}>
            ➕ Nuevo Dispositivo
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
        <button
          onClick={() => setShowTipoImagenesPanel(p => !p)}
          style={{
            width: '100%', background: '#f5f5f5', border: 'none', padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', fontWeight: 600, fontSize: 14
          }}
        >
          <span>🖼️ Imágenes predeterminadas por tipo de dispositivo</span>
          <span>{showTipoImagenesPanel ? '▲' : '▼'}</span>
        </button>

        {showTipoImagenesPanel && (
          <div style={{ padding: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666' }}>
              Sube una imagen genérica para cada tipo. Se mostrará en todos los dispositivos de ese tipo
              que <strong>no tengan imagen personalizada</strong>. El cambio aplica también en otros módulos de la plataforma.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[...new Set(dispositivos.map(d => d.tipo))].sort().map(tipo => (
                <div key={tipo} style={{
                  border: '1px solid #e0e0e0', borderRadius: 8, padding: 10,
                  width: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                }}>
                  <div style={{
                    width: 70, height: 70, borderRadius: 6, overflow: 'hidden',
                    background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #e0e0e0'
                  }}>
                    {tipoImagenes[tipo] ? (
                      <img
                        src={`${SERVER_BASE}${tipoImagenes[tipo]}`}
                        alt={tipo}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 28, color: '#bbb' }}>📷</span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', wordBreak: 'break-word' }}>{tipo}</span>
                  <span style={{ fontSize: 10, color: '#999' }}>
                    {dispositivos.filter(d => d.tipo === tipo).length} dispositivo(s)
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleTipoImageUpload(tipo)}
                      title="Subir imagen genérica"
                      style={{ fontSize: 11, padding: '2px 7px', cursor: 'pointer', borderRadius: 4, border: '1px solid #90caf9', background: '#e3f2fd' }}
                    >
                      {tipoImagenes[tipo] ? '✏️' : '⬆️'}
                    </button>
                    {tipoImagenes[tipo] && (
                      <button
                        onClick={() => handleTipoImageDelete(tipo)}
                        title="Quitar imagen genérica"
                        style={{ fontSize: 11, padding: '2px 7px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ef9a9a', background: '#ffebee' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">💻</div>
          <div className="stat-info">
            <div className="stat-value">{dispositivos.length}</div>
            <div className="stat-label">Dispositivos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <div className="stat-value">
              {dispositivos.reduce((sum, d) => sum + parseFloat(d.watts_encendido), 0).toFixed(0)}W
            </div>
            <div className="stat-label">Potencia Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">
              {new Set(dispositivos.map(d => d.tipo)).size}
            </div>
            <div className="stat-label">Tipos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-info">
            <div className="stat-value">
              {dispositivos.filter(d => d.usa_internet === 1 || d.usa_internet === true).length}
            </div>
            <div className="stat-label">Con Internet</div>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>🔍 Buscar:</label>
          <input
            type="text"
            placeholder="Buscar por ID, nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>📂 Filtrar por tipo:</label>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="filter-select"
          >
            {tiposUnicos.map(tipo => (
              <option key={tipo} value={tipo}>
                {tipo === 'todos' ? 'Todos los tipos' : tipo}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>🏢 Filtrar por edificio:</label>
          <select
            value={filterEdificio}
            onChange={(e) => setFilterEdificio(e.target.value)}
            className="filter-select"
          >
            {edificiosUnicos.map(edificio => (
              <option key={edificio} value={edificio}>
                {edificio === 'todos' ? 'Todos los edificios' : edificio}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>🌐 Conexión:</label>
          <select
            value={filterInternet}
            onChange={(e) => setFilterInternet(e.target.value)}
            className="filter-select"
          >
            <option value="todos">Todos</option>
            <option value="con_internet">Con Internet</option>
            <option value="sin_internet">Sin Internet</option>
          </select>
        </div>

        <div className="filter-group">
          <label>↕️ Ordenar por:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="id">ID (numérico)</option>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="tipo">Tipo</option>
          </select>
        </div>

        <div className="filter-results">
          Mostrando <strong>{dispositivosFiltrados.length}</strong> de <strong>{dispositivos.length}</strong> dispositivos
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>ID</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Sala</th>
              <th>Internet</th> 
              <th>Watts (On/Off)</th>
              <th>Antigüedad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {dispositivosFiltrados.map(dispositivo => (
              <tr key={dispositivo.id}>
                <td>
                  <div className="device-image">
                    {dispositivo.imagen_efectiva ? (
                      <img
                        src={`${SERVER_BASE}${dispositivo.imagen_efectiva}`}
                        alt={dispositivo.nombre_modelo}
                        title={dispositivo.imagen_url ? 'Imagen personalizada' : `Imagen genérica de tipo "${dispositivo.tipo}"`}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="image-placeholder">💻</div>
                    )}
                    <button
                      className="btn-upload-image"
                      onClick={() => handleImageUpload(dispositivo.id)}
                      title="Subir imagen personalizada"
                    >
                      📷
                    </button>
                  </div>
                </td>
                <td><code>{dispositivo.id}</code></td>
                <td>
                  <div className="device-info">
                    <strong>{dispositivo.nombre_modelo}</strong>
                    {dispositivo.descripcion && (
                      <small>{dispositivo.descripcion.substring(0, 50)}...</small>
                    )}
                  </div>
                </td>
                <td>
                  <span className="badge badge-tipo">{dispositivo.tipo}</span>
                </td>
                <td>
                  <div className="sala-info">
                    <small>{dispositivo.sala_nombre || 'Sin asignar'}</small>
                    {dispositivo.edificio && <small style={{ display: 'block', color: '#888' }}>{dispositivo.edificio}</small>}
                  </div>
                </td>
                <td>
                  {(dispositivo.usa_internet === 1 || dispositivo.usa_internet === true) ? (
                    <span className="badge badge-internet-yes">🌐 Sí</span>
                  ) : (
                    <span className="badge badge-internet-no">🚫 No</span>
                  )}
                </td>
                <td>
                  <div className="watts-info">
                    <span className="watts-on">🟢 {dispositivo.watts_encendido}W</span>
                    <span className="watts-off">⚫ {dispositivo.watts_apagado}W</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-years">
                    {dispositivo.años_uso} {dispositivo.años_uso === 1 ? 'año' : 'años'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(dispositivo)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-duplicate"
                      onClick={() => handleOpenDuplicar(dispositivo)}
                      title="Duplicar (crear copias)"
                      style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}
                    >
                      📋
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(dispositivo.id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {dispositivosFiltrados.length === 0 && (
          <div className="no-results">
            <p>😔 No se encontraron dispositivos con los filtros aplicados</p>
          </div>
        )}
      </div>
      {showDuplicarModal && dispositivoADuplicar && (
        <div className="modal-overlay" onClick={() => setShowDuplicarModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Duplicar Dispositivo</h3>
              <button className="modal-close" onClick={() => setShowDuplicarModal(false)}>✕</button>
            </div>
            <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              {dispositivoADuplicar.imagen_efectiva ? (
                <img
                  src={`${SERVER_BASE}${dispositivoADuplicar.imagen_efectiva}`}
                  alt={dispositivoADuplicar.tipo}
                  style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 6, background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💻</div>
              )}
              <div>
                <strong>{dispositivoADuplicar.nombre_modelo}</strong>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {dispositivoADuplicar.id} · {dispositivoADuplicar.tipo} · {dispositivoADuplicar.sala_nombre || 'Sin sala'}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  ⚡ {dispositivoADuplicar.watts_encendido}W encendido / {dispositivoADuplicar.watts_apagado}W apagado
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ gap: 14 }}>
              <div className="form-group">
                <label>Cantidad de copias *</label>
                <input
                  type="number"
                  min="1" max="50"
                  value={duplicarConfig.cantidad}
                  onChange={(e) => setDuplicarConfig(p => ({ ...p, cantidad: e.target.value }))}
                />
                <small>Máximo 50 copias por operación</small>
              </div>

              <div className="form-group">
                <label>Variación de consumo (±%)</label>
                <input
                  type="number"
                  min="0" max="50" step="1"
                  value={duplicarConfig.variacion_watts}
                  onChange={(e) => setDuplicarConfig(p => ({ ...p, variacion_watts: e.target.value }))}
                />
                <small>
                  Simula diferencias entre unidades iguales. 0% = idénticos.
                  Ej: 10% → {(dispositivoADuplicar.watts_encendido * 0.9).toFixed(1)}–{(dispositivoADuplicar.watts_encendido * 1.1).toFixed(1)}W
                </small>
              </div>

              <div className="form-group form-group-full">
                <label>Sala destino</label>
                <select
                  value={duplicarConfig.sala_id}
                  onChange={(e) => setDuplicarConfig(p => ({ ...p, sala_id: e.target.value }))}
                >
                  <option value={dispositivoADuplicar.sala_id}>
                    Misma sala ({dispositivoADuplicar.sala_nombre || dispositivoADuplicar.sala_id})
                  </option>
                  {salas
                    .filter(s => s.id !== dispositivoADuplicar.sala_id)
                    .map(sala => (
                      <option key={sala.id} value={sala.id}>
                        {sala.nombre} — {sala.edificio} Piso {sala.piso}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div style={{ background: '#e3f2fd', borderRadius: 8, padding: '10px 14px', margin: '14px 0', fontSize: 13 }}>
              💡 Se crearán <strong>{duplicarConfig.cantidad}</strong> dispositivo(s) con consumo
              variando ±<strong>{duplicarConfig.variacion_watts}%</strong> respecto al original.
              Los IDs se asignarán automáticamente desde el siguiente disponible.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDuplicarModal(false)}
                disabled={duplicarLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleDuplicar}
                disabled={duplicarLoading}
              >
                {duplicarLoading ? '⏳ Creando...' : `📋 Crear ${duplicarConfig.cantidad} copia(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDevice ? '✏️ Editar Dispositivo' : '➕ Nuevo Dispositivo'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>ID *</label>
                  <input
                    type="text"
                    name="id"
                    value={formData.id}
                    onChange={handleInputChange}
                    placeholder="D-0001"
                    required
                    disabled={editingDevice !== null}
                  />
                  {!editingDevice && (
                    <small className="id-suggestion">
                      💡 Siguiente ID sugerido: <strong>{generarSiguienteId()}</strong>
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    name="tipo"
                    value={mostrarInputOtro ? 'Otro' : formData.tipo}
                    onChange={handleInputChange}
                    required
                  >
                    {tiposDispositivo.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {mostrarInputOtro && (
                  <div className="form-group form-group-full">
                    <label>Especificar tipo *</label>
                    <input
                      type="text"
                      value={tipoPersonalizado}
                      onChange={handleTipoPersonalizadoChange}
                      placeholder="Ej: Escáner 3D, Impresora 3D, etc."
                      required
                    />
                    <small>Escribe el tipo de dispositivo personalizado</small>
                  </div>
                )}

                <div className="form-group form-group-full">
                  <label>Nombre del Modelo *</label>
                  <input
                    type="text"
                    name="nombre_modelo"
                    value={formData.nombre_modelo}
                    onChange={handleInputChange}
                    placeholder="Monitor HP 24 pulgadas"
                    required
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    placeholder="Descripción detallada del dispositivo..."
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Sala *</label>
                  <select
                    name="sala_id"
                    value={formData.sala_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccionar sala</option>
                    {salas.map(sala => (
                      <option key={sala.id} value={sala.id}>
                        {sala.nombre} - {sala.edificio} - Piso {sala.piso}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Antigüedad (años) *</label>
                  <input
                    type="number"
                    name="años_uso"
                    value={formData.años_uso}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Potencia Encendido (W) *</label>
                  <input
                    type="number"
                    name="watts_encendido"
                    value={formData.watts_encendido}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0.01"
                    required
                  />
                  <small>Potencia cuando está activo</small>
                </div>

                <div className="form-group">
                  <label>Potencia Apagado (W) *</label>
                  <input
                    type="number"
                    name="watts_apagado"
                    value={formData.watts_apagado}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                  />
                  <small>Potencia en standby/apagado</small>
                </div>

                <div className="form-group form-group-full">
                  <label>Horas de Vida Útil *</label>
                  <input
                    type="number"
                    name="horas_vida_util"
                    value={formData.horas_vida_util}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                  <small>Horas de vida útil estimadas del dispositivo</small>
                </div>
                <div className="form-group form-group-full">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="usa_internet"
                      checked={formData.usa_internet}
                      onChange={handleInputChange}
                    />
                    <span>🌐 Este dispositivo utiliza conexión a Internet</span>
                  </label>
                  <small>
                    Marcar si el dispositivo requiere conexión a red para funcionar 
                    (routers, switches, servidores, computadoras, tablets, cámaras IP, etc.)
                  </small>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingDevice ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispositivosAdmin;
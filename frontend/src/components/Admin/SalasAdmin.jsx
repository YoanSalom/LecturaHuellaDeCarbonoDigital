import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/authFetch';

const API_BASE = 'http://localhost:3001/api';

const SalasAdmin = () => {
  const [salas, setSalas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSala, setEditingSala] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    numero: '',
    piso: 1,
    edificio: '',
    encargado_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salasRes, usuariosRes] = await Promise.all([
        fetch(`${API_BASE}/salas`),
        fetch(`${API_BASE}/usuarios`)
      ]);

      const salasData = await salasRes.json();
      const usuariosData = await usuariosRes.json();

      if (salasData.success) {
        setSalas(salasData.data);
      }
      if (usuariosData.success) {
        setUsuarios(usuariosData.data);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingSala
        ? `${API_BASE}/salas/${editingSala.id}`
        : `${API_BASE}/salas`;

      const method = editingSala ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingSala ? 'Sala actualizada' : 'Sala creada');
        fetchData();
        closeModal();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar sala');
    }
  };

  const handleEdit = (sala) => {
    setEditingSala(sala);
    setFormData({
      id: sala.id,
      nombre: sala.nombre,
      numero: sala.numero,
      piso: sala.piso,
      edificio: sala.edificio,
      encargado_id: sala.encargado_id
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta sala? Todos los dispositivos asignados quedarán sin sala.')) return;

    try {
      const response = await authFetch(`${API_BASE}/salas/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert('Sala eliminada');
        fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar sala');
    }
  };

  const openCreateModal = () => {
    setEditingSala(null);
    setFormData({
      id: '',
      nombre: '',
      numero: '',
      piso: 1,
      edificio: '',
      encargado_id: usuarios.length > 0 ? usuarios[0].id : ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSala(null);
  };

  // Agrupar salas por edificio
  const salasPorEdificio = salas.reduce((acc, sala) => {
    if (!acc[sala.edificio]) {
      acc[sala.edificio] = [];
    }
    acc[sala.edificio].push(sala);
    return acc;
  }, {});

  if (loading) return <div className="loading">Cargando salas...</div>;

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>🏢 Gestión de Salas</h2>
        <button className="btn-primary" onClick={openCreateModal}>
          ➕ Nueva Sala
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <div className="stat-value">{salas.length}</div>
            <div className="stat-label">Salas Totales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏛️</div>
          <div className="stat-info">
            <div className="stat-value">{Object.keys(salasPorEdificio).length}</div>
            <div className="stat-label">Edificios</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💻</div>
          <div className="stat-info">
            <div className="stat-value">
              {salas.reduce((sum, s) => sum + (s.total_dispositivos || 0), 0)}
            </div>
            <div className="stat-label">Dispositivos</div>
          </div>
        </div>
      </div>

      {Object.keys(salasPorEdificio).map(edificio => (
        <div key={edificio} className="edificio-section">
          <h3 className="edificio-title"> {edificio}</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Número</th>
                  <th>Piso</th>
                  <th>Encargado</th>
                  <th>Dispositivos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {salasPorEdificio[edificio]
                  .sort((a, b) => a.piso - b.piso || a.numero.localeCompare(b.numero))
                  .map(sala => (
                    <tr key={sala.id}>
                      <td><code>{sala.id}</code></td>
                      <td><strong>{sala.nombre}</strong></td>
                      <td>
                        <span className="badge badge-numero">{sala.numero}</span>
                      </td>
                      <td>
                        <span className="badge badge-piso">Piso {sala.piso}</span>
                      </td>
                      <td>
                        <div className="encargado-info">
                          <span> {sala.encargado_nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-dispositivos">
                          {sala.total_dispositivos || 0} dispositivos
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(sala)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(sala.id)}
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
          </div>
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSala ? '✏️ Editar Sala' : '➕ Nueva Sala'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>ID *</label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  placeholder="OF-0001, AUL-0101, LAB-0205"
                  required
                  disabled={editingSala !== null}
                />
                <small>Formato: OF-0001 (Oficina), AUL-0101 (Aula), LAB-0205 (Laboratorio)</small>
              </div>

              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Oficina Principal"
                  required
                />
              </div>

              <div className="form-group">
                <label>Número *</label>
                <input
                  type="text"
                  name="numero"
                  value={formData.numero}
                  onChange={handleInputChange}
                  placeholder="001, 101, 205"
                  required
                />
              </div>

              <div className="form-group">
                <label>Piso *</label>
                <input
                  type="number"
                  name="piso"
                  value={formData.piso}
                  onChange={handleInputChange}
                  min="1"
                  max="20"
                  required
                />
              </div>

              <div className="form-group">
                <label>Edificio *</label>
                <input
                  type="text"
                  name="edificio"
                  value={formData.edificio}
                  onChange={handleInputChange}
                  placeholder="Edificio Principal"
                  required
                />
              </div>

              <div className="form-group">
                <label>Encargado *</label>
                <select
                  name="encargado_id"
                  value={formData.encargado_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar encargado</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} - {usuario.rol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingSala ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalasAdmin;
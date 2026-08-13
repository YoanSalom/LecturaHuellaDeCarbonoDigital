import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/authFetch';

const API_BASE = 'http://localhost:3001/api';

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    puntaje: '',
    perfil: '',
    rol: 'Encargado',
    ruta: ''
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await fetch(`${API_BASE}/usuarios`);
      const result = await response.json();
      if (result.success) {
        setUsuarios(result.data);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      alert('Error al cargar usuarios');
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
      const url = editingUser
        ? `${API_BASE}/usuarios/${editingUser.id}`
        : `${API_BASE}/usuarios`;
      const method = editingUser ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        puntaje: formData.puntaje !== '' ? parseFloat(formData.puntaje) : null,
        perfil:  formData.perfil  !== '' ? parseInt(formData.perfil, 10) : null,
        ruta:    formData.ruta    !== '' ? formData.ruta : null
      };

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.success) {
        alert(editingUser ? 'Usuario actualizado' : 'Usuario creado');
        fetchUsuarios();
        closeModal();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar usuario');
    }
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      id:      usuario.id,
      nombre:  usuario.nombre,
      puntaje: usuario.puntaje  != null ? String(usuario.puntaje) : '',
      perfil:  usuario.perfil   != null ? String(usuario.perfil)  : '',
      rol:     usuario.rol,
      ruta:    usuario.ruta     ?? ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const response = await authFetch(`${API_BASE}/usuarios/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        alert('Usuario eliminado');
        fetchUsuarios();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar usuario');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ id: '', nombre: '', puntaje: '', perfil: '', rol: 'Encargado', ruta: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  if (loading) return <div className="loading">Cargando usuarios...</div>;

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>👥 Gestión de Usuarios</h2>
        <button className="btn-primary" onClick={openCreateModal}>
          ➕ Nuevo Usuario
        </button>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Perfil</th>
              <th>Puntaje</th>
              <th>Ruta</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(usuario => (
              <tr key={usuario.id}>
                <td>{usuario.id}</td>
                <td>{usuario.nombre}</td>
                <td>{usuario.perfil  != null ? usuario.perfil  : <span style={{ color: '#999' }}>—</span>}</td>
                <td>{usuario.puntaje != null ? usuario.puntaje : <span style={{ color: '#999' }}>—</span>}</td>
                <td>{usuario.ruta    != null ? usuario.ruta    : <span style={{ color: '#999' }}>—</span>}</td>
                <td>
                  <span className={`badge badge-${usuario.rol.toLowerCase()}`}>
                    {usuario.rol}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-edit"   onClick={() => handleEdit(usuario)}        title="Editar">✏️</button>
                    <button className="btn-delete" onClick={() => handleDelete(usuario.id)}   title="Eliminar">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>ID *</label>
                <input
                  type="text" name="id" value={formData.id}
                  onChange={handleInputChange} placeholder="PF-0001"
                  required disabled={editingUser !== null}
                />
              </div>

              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text" name="nombre" value={formData.nombre}
                  onChange={handleInputChange} placeholder="Juan Pérez" required
                />
              </div>

              <div className="form-group">
                <label>Rol *</label>
                <select name="rol" value={formData.rol} onChange={handleInputChange} required>
                  <option value="Encargado">Encargado</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Perfil <span style={{ color: '#999', fontWeight: 'normal' }}>(1–9)</span></label>
                  <input
                    type="number" name="perfil" value={formData.perfil}
                    onChange={handleInputChange} placeholder="Ej: 3"
                    min="1" max="9" step="1"
                  />
                </div>

                <div className="form-group">
                  <label>Puntaje</label>
                  <input
                    type="number" name="puntaje" value={formData.puntaje}
                    onChange={handleInputChange} placeholder="Ej: 75.50"
                    min="0" step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ruta <span style={{ color: '#999', fontWeight: 'normal' }}>(a / b / c)</span></label>
                <select name="ruta" value={formData.ruta} onChange={handleInputChange}>
                  <option value="">— Sin asignar —</option>
                  <option value="a">a</option>
                  <option value="b">b</option>
                  <option value="c">c</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosAdmin;

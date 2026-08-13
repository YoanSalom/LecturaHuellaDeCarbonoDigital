import React, { useState } from 'react';
import UsuariosAdmin from './UsuariosAdmin';
import DispositivosAdmin from './DispositivosAdmin';
import SalasAdmin from './SalasAdmin';
import HorariosAdmin from './HorariosAdmin';
import './styles/Admin.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('usuarios');

  const tabs = [
    { id: 'usuarios', label: ' Usuarios'},
    { id: 'salas', label: ' Salas'},
    { id: 'dispositivos', label: ' Dispositivos'},
    { id: 'horarios', label: ' Horarios'}
  ];

  return (
    <div className="admin-panel">
      <div className="admin-header" style={{
        display: 'flex',
        flexDirection: 'column', // Apila el H1 sobre el P
        alignItems: 'center',    // Centra horizontalmente
        justifyContent: 'center', // Centra verticalmente (si el div tiene altura)
        textAlign: 'center',     // Centra el texto por dentro si ocupa varias líneas
        padding: '10px',
        width: '100%'
    }}>
      <h1> Panel de Administración</h1>
      <p>Gestiona usuarios, dispositivos, salas y horarios del sistema</p>
    </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content">
        {activeTab === 'usuarios' && <UsuariosAdmin />}
        {activeTab === 'salas' && <SalasAdmin />}
        {activeTab === 'dispositivos' && <DispositivosAdmin />}
        {activeTab === 'horarios' && <HorariosAdmin />}
      </div>
    </div>
  );
};

export default AdminPanel;
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    // No hay usuario logueado
    return <Navigate to="/login" replace />;
  }
  
  const user = JSON.parse(userStr);
  
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h1 style={{ color: '#d32f2f', marginBottom: '10px' }}>Acceso Denegado</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            No tienes permisos para acceder a esta sección.
          </p>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Esta área está reservada solo para <strong>administradores</strong>.
          </p>
          <button
            onClick={() => window.location.href = '/visor'}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Ir al Visor
          </button>
        </div>
      </div>
    );
  }
  
  return children;
};

export default ProtectedRoute;
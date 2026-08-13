import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await res.json();

      if (!result.success) {
        setError(result.error || 'Usuario o contraseña incorrectos');
        setLoading(false);
        return;
      }

      const userData = {
        ...result.usuario,
        token: result.token,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('user', JSON.stringify(userData));

      if (onLogin) onLogin(userData);

      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/visor');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor');
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    // Acceso de invitado, no necesita autenticarse
    const guestData = {
      username: 'invitado',
      role: 'visitante',
      nombre: 'Invitado',
      loginTime: new Date().toISOString()
    };

    localStorage.setItem('user', JSON.stringify(guestData));
    if (onLogin) onLogin(guestData);
    navigate('/visor');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e5f8d8 0%, #47be2f 100%)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '40px',
        maxWidth: '450px',
        width: '100%'
      }}>
        {/* LOGO/HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src="/Escudo_uaustralchile.png"
            alt="Logo UACh"
            style={{ 
              width: '80px', 
              height: 'auto',
              filter: 'brightness(1.0)',
              transition: 'width 0.3s ease'
            }} 
          />
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '28px',
            color: '#1e293b',
            fontWeight: 'bold'
          }}>
            Prototipo de una Plataforma para  <br/> La Medición de Huella de Carbono Digital
          </h1>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '14px'
          }}>
            Universidad Austral de Chile
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#334155'
            }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#334155'
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #51723b 0%, #47be2f 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.4)';
            }}
          >
            {loading ? 'Ingresando...' : '🔐 Iniciar Sesión'}
          </button>
        </form>

        {/* DIVIDER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '24px 0',
          gap: '10px'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>O</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        {/* GUEST ACCESS */}
        <button
          onClick={handleGuestAccess}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#157a01',
            backgroundColor: '#f1f5f9',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e2e8f0';
            e.currentTarget.style.borderColor = '#47be2f';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          👤 Continuar como Invitado
        </button>

      </div>
    </div>
  );
};

export default Login;
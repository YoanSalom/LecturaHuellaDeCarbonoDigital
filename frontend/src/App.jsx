// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Monitor,
  Building2,
  Zap,
  Calculator,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Lightbulb
} from 'lucide-react';

// Componentes principales
import DispositivosView from './components/DispositivosView';
import CalculadoraView from './components/CalculadoraView';
import SugerenciasView from './components/SugerenciasView';
import OficinasView from './components/OficinasView';
import RealtimeView from './components/RealtimeView';
import AdminPanel from './components/Admin/AdminPanel';

// Componentes de autenticación
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// ============================================
// NAVEGACIÓN CON AUTENTICACIÓN
// ============================================
const NavigationTabs = ({ isExpanded, toggleSidebar, user, onLogout }) => {
  const location = useLocation();
  const getIconColor = (path) => {
    // Si estamos en "/" (raíz), consideramos /realtime como activo
    if (location.pathname === '/' && path === '/realtime') return '#ffffff';
    return location.pathname.startsWith(path) ? '#ffffff' : '#94a3b8';
  };
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <nav 
      style={{
        width: isExpanded ? '220px' : '60px',
        height: '100vh',
        background: '#1e293b',
        color: 'white',
        padding: isExpanded ? '20px 12px' : '20px 4px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'fixed',
        left: 0,
        top: 0,
        overflowX: 'visible', 
        overflowY: 'auto', 
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}
    >
      {/* TOGGLE SIDEBAR */}
      <button 
        onClick={toggleSidebar}
        style={{
          background: '#334155',
          border: 'none',
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: isExpanded ? 'flex-end' : 'center',
          transition: 'all 0.2s',
          width: isExpanded ? 'auto' : '32px'
        }}
      >
        {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {/* INFO DE USUARIO */}
      {user && (
        <div style={{
          padding: '12px',
          background: user.role === 'admin' ? '#7c3aed' : '#3b82f6',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: isExpanded ? '12px' : '0',
          justifyContent: isExpanded ? 'flex-start' : 'center'
        }}>
          {user.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
          {isExpanded && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{user.nombre}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>
                {user.role === 'admin' ? 'Administrador' : 'Visitante'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NAVEGACIÓN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
<NavLink to="/dispositivos" icon={<Monitor size={20} color={getIconColor('/dispositivos')} />} label="Monitor de Dispositivos" active={location.pathname.startsWith('/dispositivos')} isExpanded={isExpanded} />
<NavLink to="/oficinas" icon={<Building2 size={20} color={getIconColor('/oficinas')} />} label="Monitor de Oficinas" active={location.pathname.startsWith('/oficinas')} isExpanded={isExpanded} />
        <NavLink to="/realtime" icon={<Zap size={20} color={getIconColor('/realtime')} />} label="Carbono en Tiempo Real" active={location.pathname === '/realtime' || location.pathname === '/'} isExpanded={isExpanded} />
        <NavLink to="/calculadora" icon={<Calculator size={20} color={getIconColor('/calculadora')} />} label="Calculadora de Perfil" active={location.pathname === '/calculadora'} isExpanded={isExpanded} />
        <NavLink to="/sugerencias" icon={<Lightbulb size={20} color={getIconColor('/sugerencias')} />} label="Sugerencias" active={location.pathname.startsWith('/sugerencias')} isExpanded={isExpanded} />
        
        {user?.role === 'admin' && (
          <>
            <hr style={{ border: '0.5px solid #334155', margin: '15px 0' }} />
            <NavLink to="/admin" icon={<Settings size={20} color={location.pathname === '/admin' ? 'white' : '#ef4444'} />} label="Administración" active={location.pathname === '/admin'} isExpanded={isExpanded} isAdmin />
          </>
        )}
      </div>

      {/* BOTÓN DE LOGOUT */}
      {user && (
        <button
          onClick={onLogout}
          style={{
            padding: '12px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'flex-start' : 'center',
            gap: isExpanded ? '12px' : '0',
            marginBottom: '20px',
            transition: 'all 0.2s',
            fontSize: '13px',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
        >
          <LogOut size={18} />
          {isExpanded && <span>Cerrar Sesión</span>}
        </button>
      )}

      {/* LOGO UACH */}
      <div style={{ marginTop: 'auto', paddingBottom: '20px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <a 
          href="https://www.uach.cl" 
          target="_blank" 
          rel="noopener noreferrer"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            transition: 'transform 0.2s'
          }}
        >
          <img 
            src="/Escudo_uaustralchile.png"
            alt="Logo UACh"
            style={{ 
              width: isExpanded ? '80px' : '40px', 
              height: 'auto',
              filter: isLogoHovered ? 'brightness(1.2)' : 'brightness(1)',
              transition: 'width 0.3s ease'
            }} 
          />
          
          {/* ✅ TOOLTIP DEL LOGO */}
          {!isExpanded && isLogoHovered && (
            <div style={{
              position: 'fixed',
              left: '80px',
              bottom: '80px',
              background: '#1e293b',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              zIndex: 99999,
              pointerEvents: 'none',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animation: 'tooltipFadeIn 0.15s ease-out'
            }}>
              Universidad Austral de Chile
              {/* Flecha izquierda */}
              <div style={{
                position: 'absolute',
                left: '-4px',
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRight: 'none',
                borderBottom: 'none'
              }}></div>
            </div>
          )}
        </a>
      </div>
    </nav>
  );
};

const NavLink = ({ to, icon, label, active, isExpanded, isAdmin }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link 
      to={to} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-tooltip={!isExpanded ? label : undefined}
      data-active={active ? 'true' : 'false'}
      style={{
        padding: '12px',
        background: active ? (isAdmin ? '#ef4444' : '#3b82f6') : (isHovered ? '#334155' : 'transparent'),
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        gap: isExpanded ? '15px' : '0px',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'visible'
      }}
    >
      <div style={{ 
        minWidth: '20px', 
        display: 'flex', 
        justifyContent: 'center',
        transform: !isExpanded && isHovered ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.2s'
      }}>
        {icon}
      </div>

      {/* Texto cuando expandido */}
      {isExpanded && (
        <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{label}</span>
      )}

      {/* ✅ TOOLTIP PERSONALIZADO - Solo cuando contraído y hover */}
      {!isExpanded && isHovered && (
        <div
          style={{
            position: 'fixed',
            left: '80px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#1e293b',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'tooltipFadeIn 0.15s ease-out'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{label}</span>
            {active && (
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isAdmin ? '#ef4444' : '#3b82f6',
                boxShadow: `0 0 8px ${isAdmin ? '#ef4444' : '#3b82f6'}`
              }}></div>
            )}
          </div>
          {/* Flecha izquierda */}
          <div style={{
            position: 'absolute',
            left: '-4px',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            width: '8px',
            height: '8px',
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRight: 'none',
            borderBottom: 'none'
          }}></div>
        </div>
      )}
    </Link>
  );
};

// ============================================
// APP PRINCIPAL
// ============================================
function App() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay usuario en localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const toggleSidebar = () => setIsExpanded(!isExpanded);
  const sidebarWidth = isExpanded ? '220px' : '60px';

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
          <div style={{ fontSize: '18px', color: '#666' }}>Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* ✅ ESTILOS GLOBALES PARA TOOLTIPS */}
      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0) scale(1);
          }
        }
      `}</style>
      
      {user ? (
        // LAYOUT CON SIDEBAR (usuario logueado)
        <div style={{ display: 'flex', background: '#f8fafc', minHeight: '100vh' }}>
          <NavigationTabs 
            isExpanded={isExpanded} 
            toggleSidebar={toggleSidebar}
            user={user}
            onLogout={handleLogout}
          />
          <div 
            style={{
              marginLeft: sidebarWidth,
              padding: '20px',
              flexGrow: 1,
              width: `calc(100% - ${sidebarWidth})`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxSizing: 'border-box',
            }}
          >
            <Routes>
              {/* Ruta raíz redirige a Carbono en Tiempo Real */}
              <Route path="/" element={<Navigate to="/realtime" replace />} />
              
              {/* Rutas públicas (todos los usuarios) */}
             <Route path="/dispositivos/:dispositivoId" element={<DispositivosView />} />
              <Route path="/dispositivos" element={<DispositivosView />} />

              <Route path="/realtime" element={<RealtimeView />} />
              <Route path="/calculadora" element={<CalculadoraView />} />
              <Route path="/sugerencias/:usuarioId" element={<SugerenciasView />} />
              <Route path="/sugerencias" element={<SugerenciasView />} />
              <Route path="/oficinas/:salaNumero" element={<OficinasView />} />
              <Route path="/oficinas" element={<OficinasView />} />

              {/* Rutas de admin (solo admin) */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPanel />
                  </ProtectedRoute>
                } 
              />

              <Route path="/login" element={<Navigate to="/" replace />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      ) : (
        // SOLO LOGIN (usuario no logueado)
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
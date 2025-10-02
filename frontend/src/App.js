// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Grafico1 from './components/Grafico1';
import Pestaña3 from './components/Pestaña3';
import GraficosDMA from './components/GraficosDMA';
import Visor from './components/Visor';

import RealtimeCarbonChart from './components/RealtimeCarbonChart';

const NavigationTabs = ({ isExpanded, toggleSidebar }) => {
  const location = useLocation();
  
  return (
    <nav 
      style={{
        width: isExpanded ? '250px' : '70px', // Ancho ajustable
        height: '100vh',
        background: '#2c3e50',
        color: 'white',
        padding: '20px 10px',
        transition: 'width 0.3s ease',
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    >
      {/* Botón para expandir/colapsar */}
      <button 
        onClick={toggleSidebar}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'flex-end' : 'center',
          width: '100%',
        }}
      >
        {isExpanded ? '«' : '»'}
      </button>

      {/* Links/Pestañas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link 
          to="/" 
          style={{
            padding: '10px',
            background: location.pathname === '/' ? '#3498db' : 'transparent',
            color: 'white',
            borderRadius: '5px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span>📊</span> {/* Icono opcional */}
          {isExpanded && <span>Gráfico 1</span>}
        </Link>

        <Link 
          to="/pestaña3" 
          style={{
            padding: '10px',
            background: location.pathname === '/pestaña3' ? '#3498db' : 'transparent',
            color: 'white',
            borderRadius: '5px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span>📋</span>
          {isExpanded && <span>GraficosHDMA</span>}
        </Link>

       
        <Link 
          to="/graficosDMA" 
          style={{
            padding: '10px',
            background: location.pathname === '/pestaña3' ? '#3498db' : 'transparent',
            color: 'white',
            borderRadius: '5px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span>📋</span>
          {isExpanded && <span>GraficosDMA</span>}
        </Link>

                <Link 
          to="/visor" 
          style={{
            padding: '10px',
            background: location.pathname === '/pestaña3' ? '#3498db' : 'transparent',
            color: 'white',
            borderRadius: '5px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span>📋</span>
          {isExpanded && <span>Visor de Informacion</span>}
        </Link>

        <Link 
          to="/realtime" 
          style={{
            padding: '10px',
            background: location.pathname === '/realtime' ? '#3498db' : 'transparent',
            color: 'white',
            borderRadius: '5px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span>⏱️</span>
          {isExpanded && <span>Tiempo Real</span>}
        </Link>
      </div>
    </nav>
  );
};

function App() {
  const [isExpanded, setIsExpanded] = useState(true); // Inicialmente expandido

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Router>
      <div style={{ display: 'flex' }}>
        <NavigationTabs isExpanded={isExpanded} toggleSidebar={toggleSidebar} />
        
        {/* Contenido principal (con margen para la barra lateral) */}
        <div 
          style={{
            marginLeft: isExpanded ? '250px' : '70px',
            padding: '20px',
            width: '100%',
            transition: 'margin-left 0.3s ease',
          }}
        >
          <Routes>
            <Route path="/" element={<Grafico1 />} />
            <Route path="/pestaña3" element={<Pestaña3 />} />
            <Route path="/graficosDMA" element={<GraficosDMA />} />
            <Route path="/visor" element={<Visor />} />
            <Route path="/realtime" element={<RealtimeCarbonChart />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
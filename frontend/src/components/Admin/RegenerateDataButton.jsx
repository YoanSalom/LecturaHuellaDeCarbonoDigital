import React, { useState } from 'react';
import { authFetch } from '../../utils/authFetch';

const API_BASE = 'http://localhost:3001/api';

const RegenerateDataButton = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleRegenerate = async () => {
    if (!window.confirm(
      '⚠️ ADVERTENCIA: Esta acción borrará y regenerará todas las lecturas y estadísticas de 2024 y 2025.\n\n' +
      '⏱️ Tiempo estimado: 1-2 minutos\n\n' +
      '¿Deseas continuar?'
    )) {
      return;
    }

    setLoading(true);
    setProgress('Iniciando regeneración...');

    try {
      // Paso 1: Limpiar 2024
      setProgress('🗑️ Limpiando datos 2024...');
      const clean2024 = await authFetch(`${API_BASE}/lecturas/regenerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'limpiar', año: 2024 })
      });
      
      if (!clean2024.ok) throw new Error('Error al limpiar 2024');

      // Paso 2: Limpiar 2025
      setProgress('🗑️ Limpiando datos 2025...');
      const clean2025 = await authFetch(`${API_BASE}/lecturas/regenerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'limpiar', año: 2025 })
      });
      
      if (!clean2025.ok) throw new Error('Error al limpiar 2025');

      // Paso 3: Generar 2024
      setProgress('⚙️ Generando lecturas 2024... (puede tardar ~30s)');
      const gen2024 = await authFetch(`${API_BASE}/lecturas/regenerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generar', año: 2024 })
      });
      
      const result2024 = await gen2024.json();
      if (!result2024.success) throw new Error('Error al generar 2024');

      // Paso 4: Generar 2025
      setProgress('⚙️ Generando lecturas 2025... (puede tardar ~30s)');
      const gen2025 = await authFetch(`${API_BASE}/lecturas/regenerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generar', año: 2025 })
      });
      
      const result2025 = await gen2025.json();
      if (!result2025.success) throw new Error('Error al generar 2025');

      setProgress('✅ Regeneración completada exitosamente');
      
      setTimeout(() => {
        alert(
          `✅ Regeneración exitosa!\n\n` +
          `📊 2024: ${result2024.lecturas || 0} lecturas generadas\n` +
          `📊 2025: ${result2025.lecturas || 0} lecturas generadas\n\n` +
          `Las estadísticas se han actualizado automáticamente.`
        );
        setLoading(false);
        setProgress('');
        if (onSuccess) onSuccess();
      }, 1000);

    } catch (error) {
      console.error('Error en regeneración:', error);
      alert(`❌ Error: ${error.message}`);
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="regenerate-section">
      <button
        className="btn-regenerate"
        onClick={handleRegenerate}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#95a5a6' : '#e74c3c',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s'
        }}
      >
        {loading ? (
          <>
            <span className="spinner">⏳</span>
            <span>Regenerando...</span>
          </>
        ) : (
          <>
            <span>🔄</span>
            <span>Regenerar Lecturas y Estadísticas</span>
          </>
        )}
      </button>
      
      {progress && (
        <div className="regenerate-progress" style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#495057',
          border: '1px solid #dee2e6'
        }}>
          {progress}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        .btn-regenerate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }
      `}</style>
    </div>
  );
};

export default RegenerateDataButton;
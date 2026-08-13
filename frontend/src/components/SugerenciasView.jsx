import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Sprout, Scale, BookOpen, Moon, ChartColumn, Zap, Leaf, Plug, AlertTriangle } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = 'http://localhost:3001/api';
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Definición de los 9 perfiles
const PERFILES = {
  1: {
    nombre: 'Líder Sostenible', emoji: <Sprout size={32} />,
    color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
    conciencia: 'Alta', impacto: 'Bajo',
    descripcion: 'Alta conciencia ambiental y bajo impacto real. Eres un referente en sostenibilidad digital dentro de la institución.',
    sugerencias: [
      'Comparte tus buenas prácticas con compañeros de tu sala y edificio.',
      'Propón iniciativas de sostenibilidad en reuniones de área o equipo.',
      'Documenta los hábitos que te llevaron a este perfil para que otros puedan replicarlos.',
      'Considera ser mentor de colegas con perfiles de mayor impacto ambiental.',
    ],
  },
  2: {
    nombre: 'Consciente Equilibrado', emoji: <Scale size={32} />,
    color: '#2563eb', bg: '#eff6ff', border: '#93c5fd',
    conciencia: 'Alta', impacto: 'Medio',
    descripcion: 'Buen nivel de conciencia ambiental, con margen de mejora en algunas prácticas de consumo digital.',
    sugerencias: [
      'Revisa el consumo de tráfico de red de los dispositivos de tu sala.',
      'Configura modos de ahorro energético en los equipos que gestionas.',
      'Establece horarios de apagado automático fuera del horario laboral.',
      'Identifica cuál de tus salas tiene mayor consumo y enfoca acciones allí primero.',
    ],
  },
  3: {
    nombre: 'Intensivo Informado', emoji: <BookOpen size={32} />,
    color: '#d97706', bg: '#fffbeb', border: '#fcd34d',
    conciencia: 'Alta', impacto: 'Alto',
    descripcion: 'Conoces el problema, pero tus hábitos aún generan alto impacto. La clave es pasar del conocimiento a la acción concreta.',
    sugerencias: [
      'Aplica lo que sabes: configura horarios de encendido/apagado en dispositivos de tu sala.',
      'Haz un inventario de dispositivos encendidos innecesariamente fuera del horario.',
      'Prioriza reducir el consumo en equipos de alta potencia (servidores, proyectores).',
      'Usa el Monitor de Dispositivos de esta plataforma para identificar picos de consumo.',
    ],
  },
  4: {
    nombre: 'Eficiente Pasivo', emoji: <Moon size={32} />,
    color: '#0891b2', bg: '#ecfeff', border: '#67e8f9',
    conciencia: 'Media', impacto: 'Bajo',
    descripcion: 'Tu impacto es bajo, pero no de forma totalmente consciente. Aprender el porqué te ayudará a mantener y mejorar este buen resultado.',
    sugerencias: [
      'Infórmate sobre qué es la huella de carbono digital y cómo se calcula.',
      'Entiende por qué tus prácticas actuales son buenas para poder reforzarlas.',
      'Comparte con tu equipo lo que haces bien, aunque no supieras que lo hacías bien.',
      'Explora la sección Carbono en Tiempo Real de esta plataforma para entender el contexto.',
    ],
  },
  5: {
    nombre: 'Promedio Estándar', emoji: <ChartColumn size={32} />,
    color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd',
    conciencia: 'Media', impacto: 'Medio',
    descripcion: 'El perfil más común. Hay oportunidades reales de mejora tanto en conocimiento como en prácticas concretas.',
    sugerencias: [
      'Completa la calculadora de perfil para entender mejor tu huella digital.',
      'Configura horarios de apagado en al menos un dispositivo de tu sala esta semana.',
      'Revisa los gráficos de consumo de tus dispositivos en el Monitor de Dispositivos.',
      'Establece una meta mensual de reducción (ej: –5 % respecto al mes anterior).',
    ],
  },
  6: {
    nombre: 'Alto Consumidor', emoji: <Zap size={32} />,
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
    conciencia: 'Media', impacto: 'Alto',
    descripcion: 'Tu consumo digital es alto. Con más conocimiento y acciones concretas puedes reducirlo significativamente.',
    sugerencias: [
      'Identifica los 2–3 dispositivos de mayor consumo en tu sala y priorízalos.',
      'Configura apagado automático en horarios sin uso (noches, fines de semana).',
      'Verifica si hay dispositivos encendidos innecesariamente (monitores en espera, equipos sin usar).',
      'Considera optimizar el uso de red: streaming, transferencias de datos de gran volumen.',
    ],
  },
  7: {
    nombre: 'Básico Eficiente', emoji: <Leaf size={32} />,
    color: '#059669', bg: '#f0fdf4', border: '#6ee7b7',
    conciencia: 'Baja', impacto: 'Bajo',
    descripcion: 'Tu impacto es bajo, posiblemente por hábitos naturales. Aprender sobre el tema te ayudará a mantener y fortalecer este buen resultado.',
    sugerencias: [
      'Explora la sección Carbono en Tiempo Real para entender qué es la huella digital.',
      'Aprende cuáles de tus hábitos actuales contribuyen a tu bajo impacto.',
      'Comparte con tu equipo lo que haces bien, incluso sin saber exactamente por qué funciona.',
      'Considera completar la calculadora de perfil para obtener más información personalizada.',
    ],
  },
  8: {
    nombre: 'Desconectado Moderado', emoji: <Plug size={32} />,
    color: '#9333ea', bg: '#faf5ff', border: '#d8b4fe',
    conciencia: 'Baja', impacto: 'Medio',
    descripcion: 'Bajo conocimiento del tema y consumo moderado. Informarse es el primer paso concreto para mejorar.',
    sugerencias: [
      'Comienza por aprender qué es la huella de carbono digital y por qué importa.',
      'Usa esta plataforma para explorar el consumo de los dispositivos de tu sala.',
      'Establece un horario simple de apagado de equipos al final del día laboral.',
      'Comparte con tu equipo la importancia de apagar dispositivos que no se usen.',
    ],
  },
  9: {
    nombre: 'Crítico Urgente', emoji: <AlertTriangle size={32} />,
    color: '#b91c1c', bg: '#fff1f2', border: '#fda4af',
    conciencia: 'Baja', impacto: 'Alto',
    descripcion: 'Situación de alta prioridad: bajo conocimiento del tema y alto impacto ambiental real. Se requieren acciones inmediatas.',
    sugerencias: [
      'URGENTE: Realiza un inventario de todos los dispositivos encendidos en tu sala/edificio.',
      'Configura apagado automático en equipos de alta potencia (servidores, proyectores).',
      'Infórmate sobre la huella de carbono — explora los gráficos de consumo de esta plataforma.',
      'Solicita apoyo al administrador para identificar las mayores fuentes de emisión.',
      'Meta: reducir el consumo un 15 % el próximo mes y monitorear el progreso.',
    ],
  },
};

// ─── Componente principal ────────────────────────────────────────────────────
const SugerenciasView = () => {
  const location = useLocation();
  const { usuarioId: paramId } = useParams();
  const navigate = useNavigate();
  const [usuarios, setUsuarios]               = useState([]);
  const [usuarioId, setUsuarioId]             = useState(
    paramId ? `PF-${String(parseInt(paramId, 10)).padStart(4, '0')}` : (location.state?.usuarioId || '')
  );
  const [datos, setDatos]                     = useState(null);
  const [ano, setAno]                         = useState(2025);
  const [loading, setLoading]                 = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  useEffect(() => {
    setUsuarioId(paramId ? `PF-${String(parseInt(paramId, 10)).padStart(4, '0')}` : '');
  }, [paramId]);

  // Cargar lista de usuarios al montar
  useEffect(() => {
    fetch(`${API_BASE}/usuarios`)
      .then(r => r.json())
      .then(res => { if (res.success) setUsuarios(res.data); })
      .finally(() => setLoadingUsuarios(false));
  }, []);

  // Cargar datos del usuario/año seleccionado
  useEffect(() => {
    if (!usuarioId) { setDatos(null); return; }
    setLoading(true);
    setDatos(null);
    fetch(`${API_BASE}/estadisticas/usuario/${usuarioId}/${ano}`)
      .then(r => r.json())
      .then(res => { if (res.success) setDatos(res); })
      .catch(() => setDatos(null))
      .finally(() => setLoading(false));
  }, [usuarioId, ano]);

  const perfil = datos?.usuario?.perfil ? PERFILES[datos.usuario.perfil] : null;

  // Datos del gráfico: emisiones mensuales del edificio
  const chartData = {
    labels: MESES,
    datasets: [{
      label: 'Emisiones (kg CO₂)',
      data: MESES.map((_, i) => {
        const m = datos?.monthly_edificio?.find(x => x.mes === i + 1);
        return m ? parseFloat(m.emisiones_kg) : 0;
      }),
      backgroundColor: perfil ? `${perfil.color}99` : 'rgba(102,126,234,0.6)',
      borderColor:     perfil ? perfil.color : '#667eea',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.formattedValue} kg CO₂` } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: v => `${v} kg` } },
    },
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#1e293b' }}>
           Sugerencias
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Selecciona un usuario para ver su perfil ambiental, el consumo de sus salas
          y recomendaciones personalizadas según su categoría P1–P9.
        </p>
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Usuario
          </label>
          <select
            value={usuarioId}
            onChange={e => navigate(e.target.value ? `/sugerencias/${parseInt(e.target.value.replace(/^PF-/, ''), 10)}` : '/sugerencias')}
            disabled={loadingUsuarios}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', color: '#1e293b', outline: 'none', background: 'white' }}
          >
            <option value="">{loadingUsuarios ? 'Cargando…' : '— Selecciona un usuario —'}</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.id}) — {u.rol}{u.perfil ? ` · P${u.perfil}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Año
          </label>
          <select
            value={ano}
            onChange={e => setAno(parseInt(e.target.value))}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', color: '#1e293b', outline: 'none', background: 'white' }}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* Estado vacío */}
      {!usuarioId && (
        <div style={{ textAlign: 'center', padding: '72px 20px', color: '#94a3b8' }}>
          <p style={{ fontSize: '15px', margin: 0 }}>Selecciona un usuario para ver su módulo de sugerencias</p>
        </div>
      )}

      {/* Cargando */}
      {usuarioId && loading && (
        <div style={{ textAlign: 'center', padding: '72px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <p style={{ fontSize: '14px', margin: 0 }}>Cargando datos…</p>
        </div>
      )}

      {/* Contenido principal */}
      {!loading && datos && (
        <>
          {/* Fila: Perfil + Estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>

            {/* Tarjeta de perfil */}
            {perfil ? (
              <div style={{ background: perfil.bg, border: `2px solid ${perfil.border}`, borderRadius: '12px', padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '40px' }}>{perfil.emoji}</div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: perfil.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Perfil {datos.usuario.perfil}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{perfil.nombre}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{datos.usuario.nombre} · {datos.usuario.rol}</div>
                  </div>
                </div>
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                  {perfil.descripcion}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {[
                    { label: `Conciencia: ${perfil.conciencia}` },
                    { label: `Impacto: ${perfil.impacto}` },
                  ].map(tag => (
                    <span key={tag.label} style={{ padding: '4px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'white', border: `1px solid ${perfil.border}`, color: perfil.color }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                {datos.usuario.puntaje != null && (
                  <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: `1px solid ${perfil.border}` }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px' }}>PUNTAJE CALCULADO</div>
                    <div style={{ fontSize: '26px', fontWeight: '700', color: perfil.color, lineHeight: '1' }}>{datos.usuario.puntaje}</div>
                    {datos.usuario.ruta && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        Versión de encuesta: {datos.usuario.ruta.toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '180px' }}>
                <div style={{ fontSize: '36px', opacity: 0.4 }}>📋</div>
                <div style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', lineHeight: '1.6' }}>
                  <strong>{datos.usuario.nombre}</strong> aún no tiene perfil asignado.<br />
                  <span style={{ fontSize: '12px' }}>Completa la calculadora para obtenerlo.</span>
                </div>
              </div>
            )}

            {/* Tarjeta de estadísticas */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '16px', fontSize: '15px' }}>
                 Consumo {ano} — Salas gestionadas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Consumo eléctrico', value: `${datos.total_usuario.consumo_kwh} kWh`, color: '#f59e0b' },
                  { label: 'Emisiones CO₂',     value: `${datos.total_usuario.emisiones_kg} kg`, color: '#ef4444' },
                  { label: 'Tráfico de red',    value: `${datos.total_usuario.trafico_gb} GB`,  color: '#3b82f6' },
                  { label: 'Salas a cargo',     value: `${datos.salas.length}`, color: '#8b5cf6' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {datos.edificio && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: '#f0f4ff', borderRadius: '8px', fontSize: '13px', color: '#475569' }}>
                  <strong>Edificio principal:</strong> {datos.edificio}
                </div>
              )}
            </div>
          </div>

          {/* Recomendaciones personalizadas */}
          {perfil && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '16px', fontSize: '15px' }}>
                 Recomendaciones para perfil <span style={{ color: perfil.color }}>{perfil.nombre}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                {perfil.sugerencias.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '14px', background: perfil.bg, borderRadius: '8px', border: `1px solid ${perfil.border}` }}>
                    <div style={{ width: '26px', height: '26px', minWidth: '26px', borderRadius: '50%', background: perfil.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', marginTop: '1px' }}>
                      {i + 1}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.55' }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Salas a cargo */}
          {datos.salas.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '14px', fontSize: '15px' }}>
                Salas a cargo de {datos.usuario.nombre}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {datos.salas.map(sala => (
                  <div
                    key={sala.id}
                    onClick={() => sala.numero && navigate(`/oficinas/${sala.numero}`)}
                    style={{
                      padding: '14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      cursor: sala.numero ? 'pointer' : 'default',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { if (sala.numero) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.15)'; e.currentTarget.style.borderColor = '#93c5fd'; }}}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '4px' }}>{sala.nombre}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                      {sala.edificio} · Piso {sala.piso}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.7' }}>
                      <div style={{ color: '#f59e0b' }}> <strong>{sala.stats?.consumo_kwh ?? '—'}</strong> kWh</div>
                      <div style={{ color: '#ef4444' }}> <strong>{sala.stats?.emisiones_kg ?? '—'}</strong> kg CO₂</div>
                      <div style={{ color: '#3b82f6' }}> <strong>{sala.stats?.trafico_gb ?? '—'}</strong> GB</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin salas */}
          {datos.salas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', border: '2px dashed #e2e8f0', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Este usuario no tiene salas asignadas como encargado.</p>
            </div>
          )}

          {/* Gráfico: emisiones mensuales del edificio */}
          {datos.monthly_edificio?.length > 0 ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '4px', fontSize: '15px' }}>
                 Emisiones mensuales del edificio — {datos.edificio}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '18px' }}>
                Total CO₂ de todas las salas del edificio durante {ano} (kg CO₂)
              </div>
              <Bar data={chartData} options={chartOptions} />
            </div>
          ) : datos.edificio ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No hay datos de estadísticas para {datos.edificio} en {ano}.</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>Ejecuta <code>npm run generate:{ano}</code> para generar lecturas.</p>
            </div>
          ) : null}
        </>
      )}

      {/* Error al cargar */}
      {!loading && usuarioId && !datos && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>❌</div>
          <p style={{ fontSize: '14px', margin: 0 }}>No se pudieron cargar los datos del usuario seleccionado.</p>
        </div>
      )}
    </div>
  );
};

export default SugerenciasView;

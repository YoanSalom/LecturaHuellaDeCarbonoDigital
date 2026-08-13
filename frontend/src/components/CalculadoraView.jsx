import React, { useState } from 'react';

const CalculadoraView = () => {
  const [version, setVersion] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);

  const calcular = () => {
    const catA = parseInt(respuestas.catA || 0);
    const catB = parseInt(respuestas.catB || 0);
    const catC = parseInt(respuestas.catC || 0);

    // Calculos según versión

    let maxConciencia, maxImpacto, puntosBase;

    if (version === 'A') {
      maxConciencia = 35;
      maxImpacto = 20;
      puntosBase = 3;
    } else if (version === 'B') {
      maxConciencia = 34; 
      maxImpacto = 26;     
      puntosBase = 1;
    } else {
      maxConciencia = 25; 
      maxImpacto = 31;     
      puntosBase = 0;
    }

    const indiceConciencia = ((catA + catB) / maxConciencia) * 100;
    const indiceImpacto = (catC / maxImpacto) * 100;

    // perfil con emojis segun su puntuacion y categoria
    let perfil = '';
    let emoji = '';
    let color = '';
    let descripcion = '';
    let prioridad = '';

    if (indiceConciencia >= 70 && indiceImpacto >= 70) {
      perfil = 'P1: Líder Sostenible';
      emoji = '🌟';
      color = 'bg-green-100 border-green-500';
      descripcion = 'Conciencia ALTA + Impacto BAJO. Usuario ejemplar.';
      prioridad = 'Promoción';
    } else if (indiceConciencia >= 70 && indiceImpacto >= 40) {
      perfil = 'P2: Consciente Equilibrado';
      emoji = '✅';
      color = 'bg-green-50 border-green-400';
      descripcion = 'Conciencia ALTA + Impacto MEDIO. En buen camino.';
      prioridad = 'Optimización';
    } else if (indiceConciencia >= 70 && indiceImpacto < 40) {
      perfil = 'P3: Intensivo Informado';
      emoji = '⚠️';
      color = 'bg-yellow-100 border-yellow-500';
      descripcion = 'Conciencia ALTA + Impacto ALTO. Trabajo intensivo.';
      prioridad = 'Alternativas';
    } else if (indiceConciencia >= 40 && indiceImpacto >= 70) {
      perfil = 'P4: Eficiente Pasivo';
      emoji = '💚';
      color = 'bg-emerald-100 border-emerald-500';
      descripcion = 'Conciencia MEDIA + Impacto BAJO. Buenos hábitos.';
      prioridad = 'Educación';
    } else if (indiceConciencia >= 40 && indiceImpacto >= 40) {
      perfil = 'P5: Promedio Estándar';
      emoji = '📊';
      color = 'bg-blue-100 border-blue-500';
      descripcion = 'Conciencia MEDIA + Impacto MEDIO. Usuario típico.';
      prioridad = 'Intervención estándar';
    } else if (indiceConciencia >= 40 && indiceImpacto < 40) {
      perfil = 'P6: Alto Consumidor';
      emoji = '🔴';
      color = 'bg-orange-100 border-orange-500';
      descripcion = 'Conciencia MEDIA + Impacto ALTO. Prioridad alta.';
      prioridad = 'Prioritaria';
    } else if (indiceConciencia < 40 && indiceImpacto >= 70) {
      perfil = 'P7: Básico Eficiente';
      emoji = '🌱';
      color = 'bg-lime-100 border-lime-500';
      descripcion = 'Conciencia BAJA + Impacto BAJO. Educación preventiva.';
      prioridad = 'Preventiva';
    } else if (indiceConciencia < 40 && indiceImpacto >= 40) {
      perfil = 'P8: Desconectado Moderado';
      emoji = '😴';
      color = 'bg-gray-100 border-gray-500';
      descripcion = 'Conciencia BAJA + Impacto MEDIO. Sensibilización.';
      prioridad = 'Sensibilización';
    } else {
      perfil = 'P9: Crítico Urgente';
      emoji = '🚨';
      color = 'bg-red-100 border-red-500';
      descripcion = 'Conciencia BAJA + Impacto ALTO. Intervención urgente.';
      prioridad = 'CRÍTICA';
    }

    const huellaEstimada = 15 - (indiceImpacto / 100 * 12);

    setResultado({
      catA,
      catB,
      catC,
      puntosBase,
      indiceConciencia: indiceConciencia.toFixed(1),
      indiceImpacto: indiceImpacto.toFixed(1),
      perfil,
      emoji,
      color,
      descripcion,
      prioridad,
      huella: huellaEstimada.toFixed(2)
    });
  };

  const resetear = () => {
    setVersion('');
    setRespuestas({});
    setResultado(null);
  };

  const getRangos = () => {
    if (version === 'A') {
      return {
        catA: { min: -3, max: 20, desc: 'Actitud y Conciencia' },
        catB: { min: -2, max: 15, desc: 'Prácticas Actuales' },
        catC: { min: 6, max: 20, desc: 'Consumo/Impacto' }
      };
    } else if (version === 'B') {
      return {
        catA: { min: -1, max: 25, desc: 'Actitud y Conciencia' },
        catB: { min: -1, max: 9, desc: 'Prácticas Actuales' },
        catC: { min: 4, max: 26, desc: 'Consumo/Impacto' }       
      };
    } else {
      return {
        catA: { min: 0, max: 17, desc: 'Actitud y Conciencia' },  
        catB: { min: -2, max: 8, desc: 'Prácticas Actuales' },     
        catC: { min: 5, max: 31, desc: 'Consumo/Impacto' }         
      };
    }
  };

  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #f0fdf4, #eff6ff)', padding: '1rem'}}>
      <div style={{maxWidth: '56rem', margin: '0 auto'}}>
        <div style={{background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '1.5rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
            <div>
              <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0}}>
                Calculadora de Perfil - Huella de Carbono Digital
              </h1>
              <p style={{fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0'}}>
                Validación rápida de casos de prueba <br />
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSf_KV8Y5R2YB79Du67jXzkFOLCkfUGcR2RkC6GAolFLubdEIw/viewform?usp=header"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{color: '#3b82f6', textDecoration: 'underline'}}
                >
                  Abrir Formulario de Google
                </a>
              </p>
            </div>
          </div>

          {!version ? (
            <div>
              <p style={{color: '#6b7280', marginBottom: '1rem'}}>
                Seleccione la versión del cuestionario según el conocimiento previo:
              </p>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem'}}>
                <button
                  onClick={() => setVersion('A')}
                  style={{padding: '1.5rem', border: '2px solid #10b981', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => e.target.style.background = '#f0fdf4'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <h3 style={{fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem'}}>Versión A</h3>
                  <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem'}}>
                    Conoce bien el concepto
                  </p>
                  <div style={{fontSize: '0.75rem', color: '#9ca3af', textAlign: 'left', marginTop: '0.75rem'}}>
                    <div>• 15 preguntas</div>
                    <div>• Máx: 58 puntos</div>
                  </div>
                </button>
                <button
                  onClick={() => setVersion('B')}
                  style={{padding: '1.5rem', border: '2px solid #3b82f6', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <h3 style={{fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem'}}>Versión B</h3>
                  <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem'}}>
                    Ha escuchado algo
                  </p>
                  <div style={{fontSize: '0.75rem', color: '#9ca3af', textAlign: 'left', marginTop: '0.75rem'}}>
                    <div>• 17 preguntas</div>
                    <div>• Máx: 61 puntos</div>
                  </div>
                </button>
                <button
                  onClick={() => setVersion('C')}
                  style={{padding: '1.5rem', border: '2px solid #a855f7', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => e.target.style.background = '#faf5ff'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <h3 style={{fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem'}}>Versión C</h3>
                  <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem'}}>
                    No conoce el concepto
                  </p>
                  <div style={{fontSize: '0.75rem', color: '#9ca3af', textAlign: 'left', marginTop: '0.75rem'}}>
                    <div>• 16 preguntas</div>
                    <div>• Máx: ~62 puntos</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <div>
                  <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#374151', margin: 0}}>
                    Versión {version} - Ingreso de Puntuaciones
                  </h2>
                </div>
                <button
                  onClick={resetear}
                  style={{padding: '0.5rem 1rem', background: '#e5e7eb', borderRadius: '0.375rem', border: 'none', cursor: 'pointer'}}
                >
                  Cambiar versión
                </button>
              </div>

              <div style={{background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem'}}>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <div style={{fontSize: '0.875rem', color: '#1e3a8a'}}>
                    <p style={{fontWeight: '600', margin: '0 0 0.25rem 0'}}>Instrucciones:</p>
                    <ul style={{margin: '0.25rem 0', paddingLeft: '1.25rem'}}>
                      <li>Sume los puntos de cada categoría según el documento de referencia</li>
                      <li>Los valores negativos son permitidos en Cat A y Cat B</li>
                      <li>En Cat C, mayor puntaje = menor impacto (escala inversa)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {(() => {
                const rangos = getRangos();
                const incluye = {
                  A: { catA: 'A1, A2, A5, A13, A14, A15', catB: 'A3, A4, A6, A7, A8', catC: 'A9, A10, A11, A12' },
                  B: { catA: 'B1-B5, B15-B17 (reordenadas)', catB: 'B6, B7, B8', catC: 'B9-B14' },
                  C: { catA: 'C1-C4, C15, C16', catB: 'C5, C6, C7', catC: 'C8-C14' }
                }[version];
                return (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem'}}>
                    <div style={{background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '2px solid #86efac'}}>
                      <label style={{display: 'block', fontWeight: '600', color: '#166534', marginBottom: '0.5rem'}}>
                        Categoría A: {rangos.catA.desc}
                      </label>
                      <input
                        type="number"
                        style={{width: '100%', padding: '0.75rem', border: '2px solid #86efac', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: '600'}}
                        placeholder={`Ej: ${Math.floor((rangos.catA.max + rangos.catA.min) / 2)}`}
                        value={respuestas.catA || ''}
                        onChange={(e) => setRespuestas({...respuestas, catA: e.target.value})}
                      />
                      <p style={{fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0'}}>
                        Rango versión {version}: <span style={{fontWeight: '600'}}>{rangos.catA.min} a {rangos.catA.max} puntos</span>
                      </p>
                      <p style={{fontSize: '0.75rem', color: '#166534', margin: '0.25rem 0 0 0'}}>
                        Incluye: {incluye.catA}
                      </p>
                    </div>

                    <div style={{background: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', border: '2px solid #93c5fd'}}>
                      <label style={{display: 'block', fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem'}}>
                        Categoría B: {rangos.catB.desc}
                      </label>
                      <input
                        type="number"
                        style={{width: '100%', padding: '0.75rem', border: '2px solid #93c5fd', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: '600'}}
                        placeholder={`Ej: ${Math.floor((rangos.catB.max + rangos.catB.min) / 2)}`}
                        value={respuestas.catB || ''}
                        onChange={(e) => setRespuestas({...respuestas, catB: e.target.value})}
                      />
                      <p style={{fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0'}}>
                        Rango versión {version}: <span style={{fontWeight: '600'}}>{rangos.catB.min} a {rangos.catB.max} puntos</span>
                      </p>
                      <p style={{fontSize: '0.75rem', color: '#1e40af', margin: '0.25rem 0 0 0'}}>
                        Incluye: {incluye.catB}
                      </p>
                    </div>

                    <div style={{background: '#fff7ed', padding: '1rem', borderRadius: '0.5rem', border: '2px solid #fdba74'}}>
                      <label style={{display: 'block', fontWeight: '600', color: '#9a3412', marginBottom: '0.5rem'}}>
                        Categoría C: {rangos.catC.desc}
                      </label>
                      <input
                        type="number"
                        style={{width: '100%', padding: '0.75rem', border: '2px solid #fdba74', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: '600'}}
                        placeholder={`Ej: ${Math.floor((rangos.catC.max + rangos.catC.min) / 2)}`}
                        value={respuestas.catC || ''}
                        onChange={(e) => setRespuestas({...respuestas, catC: e.target.value})}
                      />
                      <p style={{fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0'}}>
                        Rango versión {version}: <span style={{fontWeight: '600'}}>{rangos.catC.min} a {rangos.catC.max} puntos</span>
                      </p>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem'}}>
                        <p style={{fontSize: '0.75rem', color: '#9a3412', fontWeight: '600', margin: 0}}>
                          Escala inversa: Mayor puntaje = Menor impacto ambiental
                        </p>
                      </div>
                      <p style={{fontSize: '0.75rem', color: '#9a3412', margin: '0.25rem 0 0 0'}}>
                        Incluye: {incluye.catC}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={calcular}
                style={{width: '100%', padding: '1rem', background: '#16a34a', color: 'white', borderRadius: '0.5rem', fontWeight: '600', fontSize: '1.125rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
              >
                Calcular Perfil
              </button>
            </div>
          )}
        </div>

        {resultado && (
          <div style={{borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem', border: '4px solid'}} className={resultado.color}>
            <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
              <div style={{fontSize: '3.75rem', marginBottom: '0.75rem'}}>{resultado.emoji}</div>
              <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem'}}>
                {resultado.perfil}
              </h2>
              <p style={{color: '#6b7280', fontSize: '1.125rem', marginBottom: '0.5rem'}}>{resultado.descripcion}</p>
              <div style={{display: 'inline-block', background: 'white', padding: '0.5rem 1rem', borderRadius: '9999px'}}>
                <span style={{fontSize: '0.875rem', fontWeight: '600', color: '#374151'}}>
                  Prioridad de intervención: {resultado.prioridad}
                </span>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem'}}>
              <div style={{background: 'white', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}}>
                <div style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem'}}>Índice de Conciencia</div>
                <div style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#16a34a'}}>
                  {resultado.indiceConciencia}%
                </div>
                <div style={{width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '0.75rem', marginTop: '0.5rem'}}>
                  <div
                    style={{background: '#16a34a', height: '0.75rem', borderRadius: '9999px', transition: 'all 0.3s', width: `${Math.min(100, resultado.indiceConciencia)}%`}}
                  />
                </div>
                <div style={{fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginTop: '0.5rem'}}>
                  {parseFloat(resultado.indiceConciencia) >= 70 ? '✅ ALTA' :
                   parseFloat(resultado.indiceConciencia) >= 40 ? '⚠️ MEDIA' : '🔴 BAJA'}
                </div>
              </div>

              <div style={{background: 'white', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}}>
                <div style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem'}}>Índice de Impacto</div>
                <div style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#2563eb'}}>
                  {resultado.indiceImpacto}%
                </div>
                <div style={{width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '0.75rem', marginTop: '0.5rem'}}>
                  <div
                    style={{background: '#2563eb', height: '0.75rem', borderRadius: '9999px', transition: 'all 0.3s', width: `${Math.min(100, resultado.indiceImpacto)}%`}}
                  />
                </div>
                <div style={{fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginTop: '0.5rem'}}>
                  {parseFloat(resultado.indiceImpacto) >= 70 ? '✅ BAJO (eficiente)' :
                   parseFloat(resultado.indiceImpacto) >= 40 ? '⚠️ MEDIO' : '🔴 ALTO (crítico)'}
                </div>
              </div>
            </div>

            <div style={{background: 'white', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  <div style={{fontSize: '0.875rem', color: '#6b7280'}}>Huella Digital Estimada</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#ea580c'}}>
                    {resultado.huella} kg CO₂/mes
                  </div>
                  <div style={{fontSize: '0.75rem', color: '#9ca3af'}}>
                    ≈ {(resultado.huella * 12).toFixed(0)} kg CO₂/año
                  </div>
                  <div style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem'}}>
                    ≈ Conducir {(resultado.huella * 3.5).toFixed(0)} km en auto
                  </div>
                </div>
                <div style={{fontSize: '3rem'}}>
                  {parseFloat(resultado.huella) < 7 ? '✅' :
                   parseFloat(resultado.huella) < 14 ? '⚠️' : '🚨'}
                </div>
              </div>
            </div>

            <div style={{background: 'white', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}}>
              <h3 style={{fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span>📊</span> Desglose de Puntuación
              </h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb'}}>
                  <span style={{color: '#6b7280'}}>Categoría A (Actitud/Conciencia):</span>
                  <span style={{fontWeight: '600', color: '#15803d'}}>{resultado.catA} pts</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb'}}>
                  <span style={{color: '#6b7280'}}>Categoría B (Prácticas):</span>
                  <span style={{fontWeight: '600', color: '#1d4ed8'}}>{resultado.catB} pts</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb'}}>
                  <span style={{color: '#6b7280'}}>Categoría C (Consumo):</span>
                  <span style={{fontWeight: '600', color: '#c2410c'}}>{resultado.catC} pts</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', fontWeight: 'bold'}}>
                  <span style={{color: '#374151'}}>Puntos base (Filtro {version}):</span>
                  <span style={{color: '#7c3aed'}}>+{resultado.puntosBase} pts</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '0.25rem', fontWeight: 'bold', fontSize: '1rem'}}>
                  <span style={{color: '#1f2937'}}>TOTAL:</span>
                  <span style={{color: '#111827'}}>{resultado.catA + resultado.catB + resultado.catC + resultado.puntosBase} pts</span>
                </div>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem'}}>
              <button
                onClick={resetear}
                style={{padding: '0.75rem', background: '#4b5563', color: 'white', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer'}}
              >
                 Nuevo caso
              </button>
              <button
                onClick={() => window.print()}
                style={{padding: '0.75rem', background: '#2563eb', color: 'white', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer'}}
              >
                 Imprimir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculadoraView;
import React, { useState, useEffect } from 'react';
import RegenerateDataButton from './RegenerateDataButton';
import { authFetch } from '../../utils/authFetch';

const API_BASE = 'http://localhost:3001/api';

const DIAS_LABEL = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo'
};

const HorariosAdmin = () => {
  const [dispositivos, setDispositivos] = useState([]);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null);
  const [horariosPorDia, setHorariosPorDia] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
    Friday: [], Saturday: [], Sunday: []
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHorario, setEditingHorario] = useState(null);
  const [formData, setFormData] = useState({
    dia_semana: 'Monday', hora_inicio: '08:00', hora_fin: '17:00', estado_esperado: 'Encendido'
  });
  const [conflictos, setConflictos] = useState([]);

  // --- Copiar desde otro dispositivo ---
  const [salas, setSalas] = useState([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [salaFiltro, setSalaFiltro] = useState('');
  const [dispositivoOrigen, setDispositivoOrigen] = useState('');
  const [horariosOrigen, setHorariosOrigen] = useState([]);
  const [loadingOrigen, setLoadingOrigen] = useState(false);
  const [copyMode, setCopyMode] = useState('reemplazar');

  // --- Aplicar a otros dispositivos ---
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [dispositivosDestino, setDispositivosDestino] = useState([]);
  const [applyMode, setApplyMode] = useState('reemplazar');
  const [copying, setCopying] = useState(false);

  // --- Copiar día a día ---
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copyDayOrigen, setCopyDayOrigen] = useState(null);
  const [copyDayDestinos, setCopyDayDestinos] = useState([]);
  const [copyDayMode, setCopyDayMode] = useState('reemplazar');
  const [copyingDay, setCopyingDay] = useState(false);

  // --- Copiar desde otro (modo sala) ---
  const [showCopySalaModal, setShowCopySalaModal] = useState(false);
  const [copySalaTipo, setCopySalaTipo] = useState('dispositivo'); // 'dispositivo' | 'sala'
  const [copySalaFiltroSala, setCopySalaFiltroSala] = useState('');
  const [copySalaOrigenId, setCopySalaOrigenId] = useState('');
  const [copySalaHorarios, setCopySalaHorarios] = useState([]);
  const [loadingCopySala, setLoadingCopySala] = useState(false);
  const [copySalaMode, setCopySalaMode] = useState('reemplazar');

  // ── Horarios por sala ──
  const [modoVista, setModoVista] = useState('dispositivo'); // 'dispositivo' | 'sala'
  const [salaHorId, setSalaHorId] = useState('');
  const [horariosSalaTemplate, setHorariosSalaTemplate] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  });
  const [editingSalaHorario, setEditingSalaHorario] = useState(null); // { dia, idx } | null
  const [aplicandoSala, setAplicandoSala] = useState(false);
  const [modoAplicarSala, setModoAplicarSala] = useState('reemplazar');
  const [modalCtx, setModalCtx] = useState('device'); // 'device' | 'sala'

  const diasSemana = [
    { id: 'Monday',    nombre: 'Lunes',     emoji: '📅' },
    { id: 'Tuesday',   nombre: 'Martes',    emoji: '📅' },
    { id: 'Wednesday', nombre: 'Miércoles', emoji: '📅' },
    { id: 'Thursday',  nombre: 'Jueves',    emoji: '📅' },
    { id: 'Friday',    nombre: 'Viernes',   emoji: '📅' },
    { id: 'Saturday',  nombre: 'Sábado',    emoji: '📅' },
    { id: 'Sunday',    nombre: 'Domingo',   emoji: '📅' }
  ];

  useEffect(() => {
    fetchDispositivos();
    fetchSalas();
  }, []);

  useEffect(() => {
    if (dispositivoSeleccionado) fetchHorarios();
  }, [dispositivoSeleccionado]);

  const fetchDispositivos = async () => {
    try {
      const response = await fetch(`${API_BASE}/dispositivos`);
      const result = await response.json();
      if (result.success) {
        setDispositivos(result.data);
        if (result.data.length > 0) setDispositivoSeleccionado(result.data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar dispositivos:', error);
      alert('Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalas = async () => {
    try {
      const response = await fetch(`${API_BASE}/salas`);
      const result = await response.json();
      if (result.success) setSalas(result.data);
    } catch (error) {
      console.error('Error al cargar salas:', error);
    }
  };

  const fetchHorarios = async () => {
    if (!dispositivoSeleccionado) return;
    try {
      const response = await fetch(`${API_BASE}/horarios/por-dia?dispositivo_id=${dispositivoSeleccionado}`);
      const result = await response.json();
      if (result.success) setHorariosPorDia(result.data);
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      alert('Error al cargar horarios');
    }
  };

  const fetchAndFlattenHorarios = async (dispositivo_id) => {
    const res = await fetch(`${API_BASE}/horarios/por-dia?dispositivo_id=${dispositivo_id}`);
    const data = await res.json();
    if (!data.success) return [];
    return Object.values(data.data).flat();
  };

  const verificarConflictos = async () => {
    try {
      const response = await authFetch(`${API_BASE}/horarios/verificar-conflicto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispositivo_id: dispositivoSeleccionado,
          dia_semana: formData.dia_semana,
          hora_inicio: formData.hora_inicio + ':00',
          hora_fin: formData.hora_fin + ':00',
          excluir_id: editingHorario?.id
        })
      });
      const result = await response.json();
      if (result.tiene_conflicto) {
        setConflictos(result.conflictos);
        return true;
      } else {
        setConflictos([]);
        return false;
      }
    } catch (error) {
      console.error('Error al verificar conflictos:', error);
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.hora_inicio >= formData.hora_fin) {
      alert('❌ La hora de fin debe ser mayor que la hora de inicio');
      return;
    }

    if (modalCtx === 'sala') {
      const h = {
        dia_semana: formData.dia_semana,
        hora_inicio: formData.hora_inicio + ':00',
        hora_fin: formData.hora_fin + ':00',
        estado_esperado: formData.estado_esperado
      };
      setHorariosSalaTemplate(prev => {
        const dia = formData.dia_semana;
        if (editingSalaHorario !== null) {
          const arr = [...prev[dia]];
          arr[editingSalaHorario.idx] = h;
          return { ...prev, [dia]: arr };
        }
        return { ...prev, [dia]: [...prev[dia], h] };
      });
      closeModal();
      return;
    }

    const tieneConflictos = await verificarConflictos();
    if (tieneConflictos) {
      const confirmar = window.confirm(
        `⚠️ CONFLICTO DETECTADO\n\nEste horario se solapa con ${conflictos.length} horario(s) existente(s).\n\n` +
        `¿Deseas continuar de todas formas?\n\nADVERTENCIA: Esto puede causar errores en los cálculos de consumo.`
      );
      if (!confirmar) return;
    }
    try {
      const url = editingHorario ? `${API_BASE}/horarios/${editingHorario.id}` : `${API_BASE}/horarios`;
      const method = editingHorario ? 'PUT' : 'POST';
      const dataToSend = {
        dispositivo_id: dispositivoSeleccionado,
        dia_semana: formData.dia_semana,
        hora_inicio: formData.hora_inicio + ':00',
        hora_fin: formData.hora_fin + ':00',
        estado_esperado: formData.estado_esperado
      };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend) });
      const result = await response.json();
      if (result.success) {
        alert(editingHorario ? '✅ Horario actualizado' : '✅ Horario creado');
        fetchHorarios();
        closeModal();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al guardar horario');
    }
  };

  const handleEdit = (horario) => {
    setEditingHorario(horario);
    setFormData({
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio.substring(0, 5),
      hora_fin: horario.hora_fin.substring(0, 5),
      estado_esperado: horario.estado_esperado
    });
    setConflictos([]);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este horario?')) return;
    try {
      const response = await authFetch(`${API_BASE}/horarios/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        alert('✅ Horario eliminado');
        fetchHorarios();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al eliminar horario');
    }
  };

  const openCreateModal = (dia = 'Monday') => {
    setEditingHorario(null);
    setFormData({ dia_semana: dia, hora_inicio: '08:00', hora_fin: '17:00', estado_esperado: 'Encendido' });
    setConflictos([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHorario(null);
    setEditingSalaHorario(null);
    setModalCtx('device');
    setConflictos([]);
  };

  const calcularCoberturaDiaria = (dia) => {
    const horarios = horariosPorDia[dia] || [];
    if (horarios.length === 0) return 0;
    const horasEncendido = horarios
      .filter(h => h.estado_esperado === 'Encendido')
      .reduce((total, h) => {
        const inicio = new Date(`2000-01-01T${h.hora_inicio}`);
        const fin = new Date(`2000-01-01T${h.hora_fin}`);
        return total + (fin - inicio) / (1000 * 60 * 60);
      }, 0);
    return ((horasEncendido / 24) * 100).toFixed(1);
  };

  // ---- Copiar desde otro dispositivo ----

  const handleSelectOrigen = async (dispositivoId) => {
    setDispositivoOrigen(dispositivoId);
    setHorariosOrigen([]);
    if (!dispositivoId) return;
    setLoadingOrigen(true);
    try {
      const horarios = await fetchAndFlattenHorarios(dispositivoId);
      setHorariosOrigen(horarios);
    } finally {
      setLoadingOrigen(false);
    }
  };

  const handleCopiarHorarios = async () => {
    if (!dispositivoOrigen) { alert('Selecciona un dispositivo origen'); return; }
    if (horariosOrigen.length === 0) { alert('El dispositivo origen no tiene horarios configurados'); return; }
    setCopying(true);
    try {
      if (copyMode === 'reemplazar') {
        const existentes = await fetchAndFlattenHorarios(dispositivoSeleccionado);
        for (const h of existentes) {
          await authFetch(`${API_BASE}/horarios/${h.id}`, { method: 'DELETE' });
        }
      }
      // Sequential para evitar race conditions con el detector de conflictos del backend
      let creados = 0;
      for (const h of horariosOrigen) {
        const res = await authFetch(`${API_BASE}/horarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dispositivo_id: dispositivoSeleccionado,
            dia_semana: h.dia_semana,
            hora_inicio: h.hora_inicio,
            hora_fin: h.hora_fin,
            estado_esperado: h.estado_esperado
          })
        });
        const data = await res.json();
        if (data.success) creados++;
      }
      alert(`✅ ${creados} de ${horariosOrigen.length} horarios copiados exitosamente`);
      setShowCopyModal(false);
      setDispositivoOrigen('');
      setHorariosOrigen([]);
      setSalaFiltro('');
      fetchHorarios();
    } catch (error) {
      console.error(error);
      alert('❌ Error al copiar horarios');
    } finally {
      setCopying(false);
    }
  };

  // ---- Aplicar a otros dispositivos ----

  const toggleDispositivoDestino = (id) => {
    setDispositivosDestino(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAplicarASala = async () => {
    if (dispositivosDestino.length === 0) { alert('Selecciona al menos un dispositivo destino'); return; }
    const horariosActuales = Object.values(horariosPorDia).flat();
    if (horariosActuales.length === 0) { alert('El dispositivo actual no tiene horarios para aplicar'); return; }
    setCopying(true);
    try {
      for (const destId of dispositivosDestino) {
        if (applyMode === 'reemplazar') {
          const existentes = await fetchAndFlattenHorarios(destId);
          for (const h of existentes) {
            await authFetch(`${API_BASE}/horarios/${h.id}`, { method: 'DELETE' });
          }
        }
        // Sequential para evitar race conditions con el detector de conflictos del backend
        for (const h of horariosActuales) {
          await authFetch(`${API_BASE}/horarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dispositivo_id: destId,
              dia_semana: h.dia_semana,
              hora_inicio: h.hora_inicio,
              hora_fin: h.hora_fin,
              estado_esperado: h.estado_esperado
            })
          });
        }
      }
      alert(`✅ Horarios aplicados a ${dispositivosDestino.length} dispositivo(s) exitosamente`);
      setShowApplyModal(false);
      setDispositivosDestino([]);
    } catch (error) {
      console.error(error);
      alert('❌ Error al aplicar horarios');
    } finally {
      setCopying(false);
    }
  };

  // ---- Copiar día a día ----

  const handleCopiarDia = async () => {
    if (copyDayDestinos.length === 0) { alert('Selecciona al menos un día destino'); return; }

    if (modoVista === 'sala') {
      const origen = horariosSalaTemplate[copyDayOrigen] || [];
      if (origen.length === 0) { alert('El día origen no tiene horarios en la plantilla'); return; }
      setHorariosSalaTemplate(prev => {
        const updated = { ...prev };
        for (const diaDestino of copyDayDestinos) {
          const copias = origen.map(h => ({ ...h, dia_semana: diaDestino }));
          updated[diaDestino] = copyDayMode === 'reemplazar'
            ? copias
            : [...updated[diaDestino], ...copias];
        }
        return updated;
      });
      const etiquetas = copyDayDestinos.map(d => DIAS_LABEL[d]).join(', ');
      alert(`✅ Horarios del ${DIAS_LABEL[copyDayOrigen]} copiados a: ${etiquetas}`);
      setShowCopyDayModal(false);
      setCopyDayDestinos([]);
      return;
    }

    const origen = horariosPorDia[copyDayOrigen] || [];
    if (origen.length === 0) { alert('El día origen no tiene horarios'); return; }
    setCopyingDay(true);
    try {
      for (const diaDestino of copyDayDestinos) {
        if (copyDayMode === 'reemplazar') {
          for (const h of (horariosPorDia[diaDestino] || [])) {
            await authFetch(`${API_BASE}/horarios/${h.id}`, { method: 'DELETE' });
          }
        }
        for (const h of origen) {
          await authFetch(`${API_BASE}/horarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dispositivo_id: dispositivoSeleccionado,
              dia_semana: diaDestino,
              hora_inicio: h.hora_inicio,
              hora_fin: h.hora_fin,
              estado_esperado: h.estado_esperado
            })
          });
        }
      }
      const etiquetas = copyDayDestinos.map(d => DIAS_LABEL[d]).join(', ');
      alert(`✅ Horarios del ${DIAS_LABEL[copyDayOrigen]} copiados a: ${etiquetas}`);
      setShowCopyDayModal(false);
      setCopyDayDestinos([]);
      fetchHorarios();
    } catch (error) {
      console.error(error);
      alert('❌ Error al copiar horarios del día');
    } finally {
      setCopyingDay(false);
    }
  };

  // ── Horarios por sala ──

  const handleSelectCopySalaOrigen = async (tipo, id) => {
    setCopySalaOrigenId(id);
    setCopySalaHorarios([]);
    if (!id) return;
    setLoadingCopySala(true);
    try {
      if (tipo === 'dispositivo') {
        const horarios = await fetchAndFlattenHorarios(id);
        setCopySalaHorarios(horarios);
      } else {
        const primerDev = dispositivos.find(d => String(d.sala_id) === String(id));
        if (!primerDev) { setLoadingCopySala(false); return; }
        const horarios = await fetchAndFlattenHorarios(primerDev.id);
        setCopySalaHorarios(horarios);
      }
    } finally {
      setLoadingCopySala(false);
    }
  };

  const handleCopiarASalaTemplate = () => {
    if (!copySalaOrigenId || copySalaHorarios.length === 0) return;
    if (copySalaMode === 'reemplazar') {
      const newTemplate = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] };
      copySalaHorarios.forEach(h => {
        newTemplate[h.dia_semana].push({ dia_semana: h.dia_semana, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, estado_esperado: h.estado_esperado });
      });
      setHorariosSalaTemplate(newTemplate);
    } else {
      setHorariosSalaTemplate(prev => {
        const updated = { ...prev };
        copySalaHorarios.forEach(h => {
          updated[h.dia_semana] = [...updated[h.dia_semana], { dia_semana: h.dia_semana, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, estado_esperado: h.estado_esperado }];
        });
        return updated;
      });
    }
    alert(`✅ ${copySalaHorarios.length} horarios cargados en la plantilla`);
    setShowCopySalaModal(false);
    setCopySalaOrigenId('');
    setCopySalaHorarios([]);
    setCopySalaTipo('dispositivo');
    setCopySalaFiltroSala('');
  };

  const handleCambiarSala = (salaId) => {
    setSalaHorId(salaId);
    setHorariosSalaTemplate({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] });
  };

  const openSalaModal = (dia = 'Monday') => {
    setEditingHorario(null);
    setEditingSalaHorario(null);
    setModalCtx('sala');
    setFormData({ dia_semana: dia, hora_inicio: '08:00', hora_fin: '17:00', estado_esperado: 'Encendido' });
    setConflictos([]);
    setShowModal(true);
  };

  const handleEditSalaHorario = (dia, idx) => {
    const h = horariosSalaTemplate[dia][idx];
    setEditingHorario({ id: `sala-${dia}-${idx}` });
    setEditingSalaHorario({ dia, idx });
    setModalCtx('sala');
    setFormData({
      dia_semana: dia,
      hora_inicio: h.hora_inicio.substring(0, 5),
      hora_fin: h.hora_fin.substring(0, 5),
      estado_esperado: h.estado_esperado
    });
    setConflictos([]);
    setShowModal(true);
  };

  const handleDeleteSalaHorario = (dia, idx) => {
    setHorariosSalaTemplate(prev => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== idx)
    }));
  };

  const calcularGapsApagado = (horariosDelDia) => {
    if (horariosDelDia.length === 0) return [];
    const sorted = [...horariosDelDia].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    const gaps = [];
    if (sorted[0].hora_inicio > '00:00:00') {
      gaps.push({ hora_inicio: '00:00:00', hora_fin: sorted[0].hora_inicio });
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].hora_fin < sorted[i + 1].hora_inicio) {
        gaps.push({ hora_inicio: sorted[i].hora_fin, hora_fin: sorted[i + 1].hora_inicio });
      }
    }
    if (sorted[sorted.length - 1].hora_fin < '23:59:00') {
      gaps.push({ hora_inicio: sorted[sorted.length - 1].hora_fin, hora_fin: '23:59:00' });
    }
    return gaps;
  };

  const handleRellenarApagados = async (diaId) => {
    if (modoVista === 'sala') {
      const horariosDelDia = horariosSalaTemplate[diaId] || [];
      if (horariosDelDia.length === 0) {
        alert('Agrega primero los horarios de encendido para rellenar automáticamente.');
        return;
      }
      const gaps = calcularGapsApagado(horariosDelDia);
      if (gaps.length === 0) {
        alert('✅ Este día ya está completo, no hay huecos que rellenar.');
        return;
      }
      setHorariosSalaTemplate(prev => ({
        ...prev,
        [diaId]: [
          ...prev[diaId],
          ...gaps.map(g => ({ dia_semana: diaId, hora_inicio: g.hora_inicio, hora_fin: g.hora_fin, estado_esperado: 'Apagado' }))
        ]
      }));
    } else {
      const horariosDelDia = horariosPorDia[diaId] || [];
      if (horariosDelDia.length === 0) {
        alert('Agrega primero los horarios de encendido para rellenar automáticamente.');
        return;
      }
      const gaps = calcularGapsApagado(horariosDelDia);
      if (gaps.length === 0) {
        alert('✅ Este día ya está completo, no hay huecos que rellenar.');
        return;
      }
      for (const gap of gaps) {
        await authFetch(`${API_BASE}/horarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dispositivo_id: dispositivoSeleccionado,
            dia_semana: diaId,
            hora_inicio: gap.hora_inicio,
            hora_fin: gap.hora_fin,
            estado_esperado: 'Apagado'
          })
        });
      }
      fetchHorarios();
    }
  };

  const handleAplicarHorariosSala = async () => {
    if (!salaHorId) { alert('Selecciona una sala'); return; }
    const horarios = Object.values(horariosSalaTemplate).flat();
    if (horarios.length === 0) { alert('Define al menos un horario en la plantilla antes de aplicar'); return; }
    if (dispositivosEnSala.length === 0) { alert('No hay dispositivos en esta sala'); return; }

    const confirmar = window.confirm(
      `¿Aplicar ${horarios.length} horarios a los ${dispositivosEnSala.length} dispositivos de esta sala?\n` +
      `Modo: ${modoAplicarSala === 'reemplazar' ? 'Reemplazar (borra horarios previos)' : 'Agregar (suma a los existentes)'}`
    );
    if (!confirmar) return;

    setAplicandoSala(true);
    try {
      const res = await authFetch(`${API_BASE}/horarios/sala/${salaHorId}/aplicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horarios, modo: modoAplicarSala })
      });
      const result = await res.json();
      if (result.success) {
        alert(`✅ ${result.mensaje}\n${result.creados} registros creados en ${result.dispositivos} dispositivos.`);
        setHorariosSalaTemplate({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] });
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error al aplicar horarios de sala');
    } finally {
      setAplicandoSala(false);
    }
  };

  // ---- Computed ----

  const dispositivoActual = dispositivos.find(d => d.id === dispositivoSeleccionado);
  const horariosActualesTotal = Object.values(horariosPorDia).flat().length;

  const dispositivosFiltradosCopy = dispositivos.filter(d =>
    d.id !== dispositivoSeleccionado &&
    (!salaFiltro || String(d.sala_id) === String(salaFiltro))
  );

  const dispositivosMismaSala = dispositivos.filter(d =>
    d.id !== dispositivoSeleccionado &&
    String(d.sala_id) === String(dispositivoActual?.sala_id)
  );

  const horariosOrigenPorDia = {};
  horariosOrigen.forEach(h => {
    if (!horariosOrigenPorDia[h.dia_semana]) horariosOrigenPorDia[h.dia_semana] = [];
    horariosOrigenPorDia[h.dia_semana].push(h);
  });

  const copySrcPorDia = modoVista === 'sala' ? horariosSalaTemplate : horariosPorDia;

  const copySalaPreviaPorDia = {};
  copySalaHorarios.forEach(h => {
    if (!copySalaPreviaPorDia[h.dia_semana]) copySalaPreviaPorDia[h.dia_semana] = [];
    copySalaPreviaPorDia[h.dia_semana].push(h);
  });

  const dispositivosEnSala = salaHorId
    ? dispositivos.filter(d => String(d.sala_id) === String(salaHorId))
    : [];
  const totalHorariosSala = Object.values(horariosSalaTemplate).flat().length;
  const salaActual = salas.find(s => String(s.id) === String(salaHorId));

  if (loading) return <div className="loading">Cargando horarios...</div>;

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>⏰ Gestión de Horarios</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Selector de modo */}
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0 }}>
            <button
              onClick={() => setModoVista('dispositivo')}
              style={{
                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '13px',
                background: modoVista === 'dispositivo' ? '#667eea' : '#f5f5f5',
                color: modoVista === 'dispositivo' ? 'white' : '#444',
                fontWeight: modoVista === 'dispositivo' ? 600 : 400
              }}
            >💻 Dispositivo</button>
            <button
              onClick={() => setModoVista('sala')}
              style={{
                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '13px',
                background: modoVista === 'sala' ? '#667eea' : '#f5f5f5',
                color: modoVista === 'sala' ? 'white' : '#444',
                fontWeight: modoVista === 'sala' ? 600 : 400
              }}
            >🏢 Por Sala</button>
          </div>

          {modoVista === 'dispositivo' && (
            <>
              <RegenerateDataButton onSuccess={() => console.log('Datos regenerados exitosamente')} />

              <button
                className="btn-secondary"
                onClick={() => { setDispositivoOrigen(''); setHorariosOrigen([]); setSalaFiltro(''); setCopyMode('reemplazar'); setShowCopyModal(true); }}
                title="Copiar horarios desde otro dispositivo"
                style={{ padding: '8px 14px', cursor: 'pointer' }}
              >
                📋 Copiar desde...
              </button>

              <button
                className="btn-secondary"
                onClick={() => { setDispositivosDestino([]); setApplyMode('reemplazar'); setShowApplyModal(true); }}
                disabled={horariosActualesTotal === 0}
                title={horariosActualesTotal === 0 ? 'Este dispositivo no tiene horarios' : 'Aplicar estos horarios a otros dispositivos'}
                style={{ padding: '8px 14px', cursor: horariosActualesTotal === 0 ? 'not-allowed' : 'pointer', opacity: horariosActualesTotal === 0 ? 0.5 : 1 }}
              >
                📤 Aplicar a...
              </button>

              <div className="dispositivo-selector">
                <label>Dispositivo:</label>
                <select
                  value={dispositivoSeleccionado || ''}
                  onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                  className="dispositivo-select"
                >
                  {dispositivos.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nombre_modelo} ({d.id})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {modoVista === 'sala' && (
            <>
              <button
                className="btn-secondary"
                onClick={() => { setCopySalaTipo('dispositivo'); setCopySalaOrigenId(''); setCopySalaHorarios([]); setCopySalaFiltroSala(''); setCopySalaMode('reemplazar'); setShowCopySalaModal(true); }}
                disabled={!salaHorId}
                title={!salaHorId ? 'Selecciona una sala primero' : 'Cargar horarios de otro dispositivo o sala a esta plantilla'}
                style={{ padding: '8px 14px', cursor: !salaHorId ? 'not-allowed' : 'pointer', opacity: !salaHorId ? 0.5 : 1 }}
              >
                📋 Copiar desde...
              </button>

              <div className="dispositivo-selector">
                <label>Sala:</label>
                <select
                  value={salaHorId}
                  onChange={(e) => handleCambiarSala(e.target.value)}
                  className="dispositivo-select"
                >
                  <option value="">Seleccionar sala...</option>
                  {salas.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre} — {s.edificio}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Vista: Por Dispositivo ── */}
      {modoVista === 'dispositivo' && (
        <>
          {dispositivoActual && (
            <div className="dispositivo-info-card">
              <div className="info-left">
                {dispositivoActual.imagen_url ? (
                  <img
                    src={`${API_BASE.replace('/api', '')}${dispositivoActual.imagen_url}`}
                    alt={dispositivoActual.nombre_modelo}
                    className="dispositivo-imagen"
                  />
                ) : (
                  <div className="dispositivo-placeholder">💻</div>
                )}
              </div>
              <div className="info-right">
                <h3>{dispositivoActual.nombre_modelo}</h3>
                <p className="info-detail">
                  <strong>Tipo:</strong> {dispositivoActual.tipo} |{' '}
                  <strong>Sala:</strong> {dispositivoActual.sala_nombre || 'Sin asignar'}
                </p>
                <p className="info-detail">
                  <strong>Potencia:</strong> 🟢 {dispositivoActual.watts_encendido}W (Encendido) |{' '}
                  ⚫ {dispositivoActual.watts_apagado}W (Apagado)
                </p>
                <p className="info-detail">
                  <strong>Horarios configurados:</strong> {horariosActualesTotal}
                </p>
              </div>
            </div>
          )}

          <div className="horarios-semana">
            {diasSemana.map(dia => {
              const horariosDelDia = horariosPorDia[dia.id] || [];
              const cobertura = calcularCoberturaDiaria(dia.id);
              return (
                <div key={dia.id} className="dia-card">
                  <div className="dia-header">
                    <div className="dia-titulo">
                      <span className="dia-emoji">{dia.emoji}</span>
                      <h3>{dia.nombre}</h3>
                    </div>
                    <div className="dia-stats">
                      <span className="horarios-count">{horariosDelDia.length} horarios</span>
                      <span className="cobertura-badge" style={{
                        background: cobertura > 50 ? '#4CAF50' : cobertura > 0 ? '#FF9800' : '#9E9E9E'
                      }}>
                        {cobertura}% activo
                      </span>
                      {horariosDelDia.length > 0 && (
                        <button
                          className="btn-mini"
                          title={`Copiar horarios del ${dia.nombre} a otro día`}
                          onClick={() => {
                            setCopyDayOrigen(dia.id);
                            setCopyDayDestinos([]);
                            setCopyDayMode('reemplazar');
                            setShowCopyDayModal(true);
                          }}
                          style={{ fontSize: '13px', padding: '2px 7px', marginLeft: '4px' }}
                        >
                          📋
                        </button>
                      )}
                      {horariosDelDia.length > 0 && (
                        <button
                          className="btn-mini"
                          title="Rellenar huecos del día con estado Apagado"
                          onClick={() => handleRellenarApagados(dia.id)}
                          style={{ fontSize: '13px', padding: '2px 7px', marginLeft: '4px' }}
                        >
                          🌙
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="horarios-lista">
                    {horariosDelDia.length === 0 ? (
                      <div className="no-horarios"><p>Sin horarios configurados</p></div>
                    ) : (
                      horariosDelDia
                        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                        .map(horario => (
                          <div key={horario.id} className={`horario-item ${horario.estado_esperado.toLowerCase()}`}>
                            <div className="horario-info">
                              <span className="horario-horas">
                                {horario.hora_inicio.substring(0, 5)} - {horario.hora_fin.substring(0, 5)}
                              </span>
                              <span className={`horario-estado estado-${horario.estado_esperado.toLowerCase()}`}>
                                {horario.estado_esperado === 'Encendido' ? '🟢' : '⚫'} {horario.estado_esperado}
                              </span>
                            </div>
                            <div className="horario-actions">
                              <button className="btn-mini btn-edit" onClick={() => handleEdit(horario)} title="Editar">✏️</button>
                              <button className="btn-mini btn-delete" onClick={() => handleDelete(horario.id)} title="Eliminar">🗑️</button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                  <button className="btn-add-horario" onClick={() => openCreateModal(dia.id)}>
                    ➕ Agregar horario
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Vista: Por Sala ── */}
      {modoVista === 'sala' && (
        <>
          {!salaHorId ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏢</div>
              <p style={{ fontSize: '16px', margin: 0 }}>Selecciona una sala para definir su horario</p>
              <p style={{ fontSize: '13px', marginTop: '8px', color: '#bbb' }}>
                La plantilla de horarios que definas será aplicada a todos los dispositivos de la sala
              </p>
            </div>
          ) : (
            <>
              {salaActual && (
                <div className="dispositivo-info-card">
                  <div className="info-left">
                    <div className="dispositivo-placeholder">🏢</div>
                  </div>
                  <div className="info-right">
                    <h3>{salaActual.nombre}</h3>
                    <p className="info-detail">
                      <strong>Edificio:</strong> {salaActual.edificio} |{' '}
                      <strong>Piso:</strong> {salaActual.piso}
                    </p>
                    <p className="info-detail">
                      <strong>Dispositivos en sala:</strong> {dispositivosEnSala.length}
                      {dispositivosEnSala.length > 0 && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#888' }}>
                          ({dispositivosEnSala.slice(0, 4).map(d => d.nombre_modelo).join(', ')}
                          {dispositivosEnSala.length > 4 ? ` y ${dispositivosEnSala.length - 4} más` : ''})
                        </span>
                      )}
                    </p>
                    <p className="info-detail">
                      <strong>Horarios en plantilla:</strong> {totalHorariosSala}
                    </p>
                  </div>
                </div>
              )}

              {dispositivosEnSala.length === 0 && (
                <div style={{ background: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', fontSize: '14px', color: '#e65100' }}>
                  ⚠️ Esta sala no tiene dispositivos asociados. Los horarios no tendrán efecto hasta que se asignen dispositivos.
                </div>
              )}

              <div className="horarios-semana">
                {diasSemana.map(dia => {
                  const horariosDelDia = horariosSalaTemplate[dia.id] || [];
                  return (
                    <div key={dia.id} className="dia-card">
                      <div className="dia-header">
                        <div className="dia-titulo">
                          <span className="dia-emoji">{dia.emoji}</span>
                          <h3>{dia.nombre}</h3>
                        </div>
                        <div className="dia-stats">
                          <span className="horarios-count">{horariosDelDia.length} en plantilla</span>
                          {horariosDelDia.length > 0 && (
                            <button
                              className="btn-mini"
                              title={`Copiar horarios del ${dia.nombre} a otro día de la plantilla`}
                              onClick={() => { setCopyDayOrigen(dia.id); setCopyDayDestinos([]); setCopyDayMode('reemplazar'); setShowCopyDayModal(true); }}
                              style={{ fontSize: '13px', padding: '2px 7px', marginLeft: '4px' }}
                            >
                              📋
                            </button>
                          )}
                          {horariosDelDia.length > 0 && (
                            <button
                              className="btn-mini"
                              title="Rellenar huecos del día con estado Apagado"
                              onClick={() => handleRellenarApagados(dia.id)}
                              style={{ fontSize: '13px', padding: '2px 7px', marginLeft: '4px' }}
                            >
                              🌙
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="horarios-lista">
                        {horariosDelDia.length === 0 ? (
                          <div className="no-horarios"><p>Sin horarios en plantilla</p></div>
                        ) : (
                          horariosDelDia
                            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                            .map((horario, idx) => (
                              <div key={idx} className={`horario-item ${horario.estado_esperado.toLowerCase()}`}>
                                <div className="horario-info">
                                  <span className="horario-horas">
                                    {horario.hora_inicio.substring(0, 5)} - {horario.hora_fin.substring(0, 5)}
                                  </span>
                                  <span className={`horario-estado estado-${horario.estado_esperado.toLowerCase()}`}>
                                    {horario.estado_esperado === 'Encendido' ? '🟢' : '⚫'} {horario.estado_esperado}
                                  </span>
                                </div>
                                <div className="horario-actions">
                                  <button className="btn-mini btn-edit" onClick={() => handleEditSalaHorario(dia.id, idx)} title="Editar">✏️</button>
                                  <button className="btn-mini btn-delete" onClick={() => handleDeleteSalaHorario(dia.id, idx)} title="Eliminar">🗑️</button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                      <button className="btn-add-horario" onClick={() => openSalaModal(dia.id)}>
                        ➕ Agregar horario
                      </button>
                    </div>
                  );
                })}
              </div>

              {dispositivosEnSala.length > 0 && (
                <div style={{ marginTop: '20px', padding: '20px 24px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>📤 Aplicar plantilla a todos los dispositivos de la sala</h4>

                  {totalHorariosSala === 0 ? (
                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                      Agrega al menos un horario en la plantilla de arriba para poder aplicar.
                    </p>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#555' }}>
                        <strong>{totalHorariosSala} horarios</strong> en plantilla → se asignarán a los{' '}
                        <strong>{dispositivosEnSala.length} dispositivos</strong> de <strong>{salaActual?.nombre}</strong>.
                      </p>

                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        {[
                          { value: 'reemplazar', label: '🔄 Reemplazar', desc: 'Borra los horarios previos de cada dispositivo' },
                          { value: 'agregar',    label: '➕ Agregar',    desc: 'Suma a los horarios existentes sin borrar' }
                        ].map(opt => (
                          <label key={opt.value} style={{
                            display: 'flex', gap: '8px', cursor: 'pointer', flex: 1, padding: '10px 14px',
                            border: `2px solid ${modoAplicarSala === opt.value ? '#667eea' : '#ddd'}`,
                            borderRadius: '8px',
                            background: modoAplicarSala === opt.value ? '#f0f1ff' : 'white'
                          }}>
                            <input type="radio" value={opt.value}
                              checked={modoAplicarSala === opt.value}
                              onChange={() => setModoAplicarSala(opt.value)}
                              style={{ accentColor: '#667eea', marginTop: '3px', flexShrink: 0 }}
                            />
                            <span>
                              <strong style={{ display: 'block', fontSize: '13px' }}>{opt.label}</strong>
                              <span style={{ fontSize: '11px', color: '#888' }}>{opt.desc}</span>
                            </span>
                          </label>
                        ))}
                      </div>

                      <button
                        className="btn-primary"
                        onClick={handleAplicarHorariosSala}
                        disabled={aplicandoSala}
                        style={{ width: '100%' }}
                      >
                        {aplicandoSala
                          ? '⏳ Aplicando...'
                          : `🏢 Aplicar a ${dispositivosEnSala.length} dispositivo${dispositivosEnSala.length !== 1 ? 's' : ''} de la sala`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modal: Agregar / Editar horario ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingHorario ? '✏️ Editar Horario' : '➕ Nuevo Horario'}
                {modalCtx === 'sala' && (
                  <span style={{ fontSize: '12px', fontWeight: 400, color: '#888', marginLeft: '8px' }}>(plantilla de sala)</span>
                )}
              </h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Día de la semana *</label>
                <select name="dia_semana" value={formData.dia_semana} onChange={handleInputChange} required>
                  {diasSemana.map(dia => (
                    <option key={dia.id} value={dia.id}>{dia.emoji} {dia.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Hora inicio *</label>
                  <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Hora fin *</label>
                  <input type="time" name="hora_fin" value={formData.hora_fin} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Estado esperado *</label>
                <div className="estado-selector">
                  {['Encendido', 'Apagado'].map(estado => (
                    <label key={estado} className={`estado-option ${formData.estado_esperado === estado ? 'selected' : ''}`}>
                      <input type="radio" name="estado_esperado" value={estado} checked={formData.estado_esperado === estado} onChange={handleInputChange} />
                      <span className="estado-label">{estado === 'Encendido' ? '🟢' : '⚫'} {estado}</span>
                    </label>
                  ))}
                </div>
              </div>
              {conflictos.length > 0 && (
                <div className="conflictos-warning">
                  <h4>⚠️ Conflictos Detectados</h4>
                  <p>Este horario se solapa con los siguientes:</p>
                  <ul>
                    {conflictos.map((c, idx) => (
                      <li key={idx}>{c.hora_inicio.substring(0, 5)} - {c.hora_fin.substring(0, 5)} ({c.estado_esperado})</li>
                    ))}
                  </ul>
                  <p className="warning-note">⚠️ Continuar puede causar errores en los cálculos de consumo</p>
                </div>
              )}
              {modalCtx === 'device' ? (
                <div className="form-info-box">
                  <strong>💡 Información:</strong>
                  <ul>
                    <li>Los horarios deben cubrir las 24 horas del día</li>
                    <li>No debe haber solapamientos entre horarios</li>
                    <li>El estado "Encendido" usa {dispositivoActual?.watts_encendido}W</li>
                    <li>El estado "Apagado" usa {dispositivoActual?.watts_apagado}W</li>
                  </ul>
                </div>
              ) : (
                <div className="form-info-box">
                  <strong>💡 Plantilla de sala:</strong>
                  <ul>
                    <li>Este horario se agrega a la plantilla en memoria</li>
                    <li>Usa "Aplicar a sala" para guardarlo en todos los dispositivos</li>
                  </ul>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                {modalCtx === 'device' && (
                  <button type="button" className="btn-check" onClick={verificarConflictos}>🔍 Verificar Conflictos</button>
                )}
                <button type="submit" className="btn-primary">{editingHorario ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Copiar horarios desde otro dispositivo ── */}
      {showCopyModal && (
        <div className="modal-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Copiar horarios desde otro dispositivo</h3>
              <button className="modal-close" onClick={() => setShowCopyModal(false)}>✕</button>
            </div>

            <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>
                Destino: <strong>{dispositivoActual?.nombre_modelo}</strong>
                {dispositivoActual?.sala_nombre && <> — {dispositivoActual.sala_nombre}</>}
              </p>

              {/* Filtro por sala */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Filtrar por sala (opcional)</label>
                <select
                  value={salaFiltro}
                  onChange={(e) => { setSalaFiltro(e.target.value); setDispositivoOrigen(''); setHorariosOrigen([]); }}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
                >
                  <option value="">Todas las salas</option>
                  {salas.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre} — {s.edificio}</option>
                  ))}
                </select>
              </div>

              {/* Lista de dispositivos origen */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ marginBottom: '8px', display: 'block' }}>
                  Seleccionar dispositivo origen ({dispositivosFiltradosCopy.length} disponibles)
                </label>
                {dispositivosFiltradosCopy.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>
                    No hay otros dispositivos{salaFiltro ? ' en esa sala' : ''}.
                  </p>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
                    {dispositivosFiltradosCopy.map(d => (
                      <label
                        key={d.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: dispositivoOrigen === d.id ? '#e8f5e9' : 'white',
                          transition: 'background 0.15s'
                        }}
                      >
                        <input
                          type="radio"
                          name="dispositivoOrigen"
                          value={d.id}
                          checked={dispositivoOrigen === d.id}
                          onChange={() => handleSelectOrigen(d.id)}
                          style={{ accentColor: '#4CAF50', width: '16px', height: '16px', flexShrink: 0 }}
                        />
                        <span style={{ flex: 1 }}>
                          <strong style={{ fontSize: '14px' }}>{d.nombre_modelo}</strong>
                          <span style={{ fontSize: '12px', color: '#888', marginLeft: '10px' }}>
                            {d.tipo} — {d.sala_nombre || 'Sin sala'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview de horarios del origen */}
              {dispositivoOrigen && (
                <div>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '13px' }}>
                    Vista previa:{' '}
                    {loadingOrigen
                      ? 'Cargando...'
                      : horariosOrigen.length === 0
                        ? 'Este dispositivo no tiene horarios configurados'
                        : `${horariosOrigen.length} horarios encontrados`}
                  </p>
                  {!loadingOrigen && horariosOrigen.length > 0 && (
                    <div style={{
                      maxHeight: '180px', overflowY: 'auto', fontSize: '13px',
                      border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px',
                      backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      {diasSemana.filter(d => horariosOrigenPorDia[d.id]?.length > 0).map(dia => (
                        <div key={dia.id} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#334155', minWidth: '80px' }}>{dia.nombre}:</span>
                          {(horariosOrigenPorDia[dia.id] || [])
                            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                            .map((h, i) => (
                              <span
                                key={i}
                                style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                  backgroundColor: h.estado_esperado === 'Encendido' ? '#e8f5e9' : '#f5f5f5',
                                  color: h.estado_esperado === 'Encendido' ? '#2e7d32' : '#555',
                                  border: `1px solid ${h.estado_esperado === 'Encendido' ? '#a5d6a7' : '#ddd'}`
                                }}
                              >
                                {h.hora_inicio.substring(0, 5)}–{h.hora_fin.substring(0, 5)}{' '}
                                {h.estado_esperado === 'Encendido' ? '🟢' : '⚫'}
                              </span>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modo de copia */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ marginBottom: '10px', display: 'block' }}>Modo de importación</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: 'reemplazar', label: '🔄 Reemplazar', desc: 'Borra los horarios actuales del destino antes de copiar' },
                    { value: 'agregar',    label: '➕ Agregar',    desc: 'Agrega los horarios sin borrar los existentes' }
                  ].map(opt => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        cursor: 'pointer', flex: 1, padding: '12px',
                        border: `2px solid ${copyMode === opt.value ? '#667eea' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        backgroundColor: copyMode === opt.value ? '#f0f1ff' : 'white'
                      }}
                    >
                      <input
                        type="radio" name="copyMode" value={opt.value}
                        checked={copyMode === opt.value} onChange={() => setCopyMode(opt.value)}
                        style={{ marginTop: '3px', accentColor: '#667eea', width: '16px', height: '16px', flexShrink: 0 }}
                      />
                      <span>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{opt.label}</strong>
                        <span style={{ fontSize: '12px', color: '#666' }}>{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {copyMode === 'reemplazar' && horariosActualesTotal > 0 && (
                <div style={{ background: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                  ⚠️ Se eliminarán los <strong>{horariosActualesTotal} horarios actuales</strong> del dispositivo destino antes de copiar.
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '4px' }}>
                <button className="btn-secondary" onClick={() => setShowCopyModal(false)}>Cancelar</button>
                <button
                  className="btn-primary"
                  onClick={handleCopiarHorarios}
                  disabled={!dispositivoOrigen || horariosOrigen.length === 0 || copying || loadingOrigen}
                >
                  {copying ? 'Copiando...' : `📋 Copiar ${horariosOrigen.length} horario${horariosOrigen.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Aplicar horarios a otros dispositivos ── */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Aplicar horarios a otros dispositivos</h3>
              <button className="modal-close" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>

            <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>
                Origen: <strong>{dispositivoActual?.nombre_modelo}</strong>
                {dispositivoActual?.sala_nombre && <> — {dispositivoActual.sala_nombre}</>}
                {' '}· <strong>{horariosActualesTotal} horarios</strong> configurados.
              </p>

              {/* Dispositivos de la misma sala */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ marginBottom: '10px', display: 'block' }}>
                  Dispositivos en la misma sala
                  {dispositivoActual?.sala_nombre && <em style={{ fontWeight: 'normal', marginLeft: '6px' }}>({dispositivoActual.sala_nombre})</em>}
                </label>
                {dispositivosMismaSala.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No hay otros dispositivos en esta sala.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <button
                        type="button" className="btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => setDispositivosDestino(dispositivosMismaSala.map(d => d.id))}
                      >
                        ✅ Seleccionar todos
                      </button>
                      <button
                        type="button" className="btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => setDispositivosDestino([])}
                      >
                        ✕ Limpiar
                      </button>
                      <span style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                        {dispositivosDestino.length} de {dispositivosMismaSala.length} seleccionados
                      </span>
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
                      {dispositivosMismaSala.map(d => (
                        <label
                          key={d.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 14px', cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: dispositivosDestino.includes(d.id) ? '#e8f5e9' : 'white',
                            transition: 'background 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={dispositivosDestino.includes(d.id)}
                            onChange={() => toggleDispositivoDestino(d.id)}
                            style={{ accentColor: '#4CAF50', width: '16px', height: '16px', flexShrink: 0 }}
                          />
                          <span style={{ flex: 1 }}>
                            <strong style={{ fontSize: '14px' }}>{d.nombre_modelo}</strong>
                            <span style={{ fontSize: '12px', color: '#888', marginLeft: '10px' }}>{d.tipo}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Modo de aplicación */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ marginBottom: '10px', display: 'block' }}>Modo de aplicación</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: 'reemplazar', label: '🔄 Reemplazar', desc: 'Borra los horarios previos de cada destino antes de aplicar' },
                    { value: 'agregar',    label: '➕ Agregar',    desc: 'Agrega los horarios sin borrar los existentes' }
                  ].map(opt => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        cursor: 'pointer', flex: 1, padding: '12px',
                        border: `2px solid ${applyMode === opt.value ? '#667eea' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        backgroundColor: applyMode === opt.value ? '#f0f1ff' : 'white'
                      }}
                    >
                      <input
                        type="radio" name="applyMode" value={opt.value}
                        checked={applyMode === opt.value} onChange={() => setApplyMode(opt.value)}
                        style={{ marginTop: '3px', accentColor: '#667eea', width: '16px', height: '16px', flexShrink: 0 }}
                      />
                      <span>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{opt.label}</strong>
                        <span style={{ fontSize: '12px', color: '#666' }}>{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {dispositivosDestino.length > 0 && (
                <div style={{ background: '#e3f2fd', border: '1px solid #2196F3', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                  Se copiarán <strong>{horariosActualesTotal} horarios</strong> a <strong>{dispositivosDestino.length} dispositivo(s)</strong>.
                  {applyMode === 'reemplazar' && ' Los horarios existentes en cada destino serán eliminados primero.'}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '4px' }}>
                <button className="btn-secondary" onClick={() => setShowApplyModal(false)}>Cancelar</button>
                <button
                  className="btn-primary"
                  onClick={handleAplicarASala}
                  disabled={dispositivosDestino.length === 0 || copying}
                >
                  {copying
                    ? 'Aplicando...'
                    : `📤 Aplicar a ${dispositivosDestino.length} dispositivo${dispositivosDestino.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Copiar horarios de un día a otro(s) ── */}
      {showCopyDayModal && copyDayOrigen && (
        <div className="modal-overlay" onClick={() => setShowCopyDayModal(false)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Copiar horarios del {DIAS_LABEL[copyDayOrigen]}</h3>
              <button className="modal-close" onClick={() => setShowCopyDayModal(false)}>✕</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
                Se copiarán <strong>{(copySrcPorDia[copyDayOrigen] || []).length} horarios</strong> del{' '}
                <strong>{DIAS_LABEL[copyDayOrigen]}</strong> a los días que selecciones
                {modoVista === 'sala' ? ' (en la plantilla)' : ''}.
              </p>

              {/* Chips de días destino */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '10px' }}>
                  Días destino
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {diasSemana.filter(d => d.id !== copyDayOrigen).map(d => {
                    const selected = copyDayDestinos.includes(d.id);
                    const tieneHorarios = (copySrcPorDia[d.id] || []).length > 0;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setCopyDayDestinos(prev =>
                          prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]
                        )}
                        style={{
                          padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                          border: `2px solid ${selected ? '#667eea' : '#ddd'}`,
                          backgroundColor: selected ? '#f0f1ff' : 'white',
                          color: selected ? '#667eea' : '#444',
                          fontWeight: selected ? 700 : 400,
                          fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                      >
                        {d.nombre}
                        {tieneHorarios && (
                          <span title="Ya tiene horarios" style={{ color: '#f57c00', fontSize: '10px' }}>●</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Atajos de selección */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => setCopyDayDestinos(
                      diasSemana.filter(d => d.id !== copyDayOrigen && ['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(d.id)).map(d => d.id)
                    )}>
                    Lun–Vie
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => setCopyDayDestinos(
                      diasSemana.filter(d => d.id !== copyDayOrigen && ['Saturday','Sunday'].includes(d.id)).map(d => d.id)
                    )}>
                    Fin de semana
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => setCopyDayDestinos(diasSemana.filter(d => d.id !== copyDayOrigen).map(d => d.id))}>
                    Todos
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => setCopyDayDestinos([])}>
                    Limpiar
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0' }}>
                  ● El día ya tiene horarios configurados
                </p>
              </div>

              {/* Modo */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Modo</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { value: 'reemplazar', label: '🔄 Reemplazar', desc: 'Borra los del día destino antes de copiar' },
                    { value: 'agregar',    label: '➕ Agregar',    desc: 'Agrega sin borrar los existentes' }
                  ].map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', flex: 1,
                      padding: '10px', borderRadius: '8px',
                      border: `2px solid ${copyDayMode === opt.value ? '#667eea' : '#e0e0e0'}`,
                      backgroundColor: copyDayMode === opt.value ? '#f0f1ff' : 'white'
                    }}>
                      <input type="radio" value={opt.value} checked={copyDayMode === opt.value}
                        onChange={() => setCopyDayMode(opt.value)}
                        style={{ marginTop: '3px', accentColor: '#667eea' }} />
                      <span>
                        <strong style={{ display: 'block', fontSize: '13px' }}>{opt.label}</strong>
                        <span style={{ fontSize: '11px', color: '#888' }}>{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resumen */}
              {copyDayDestinos.length > 0 && (
                <div style={{ background: '#e3f2fd', border: '1px solid #2196F3', borderRadius: '8px', padding: '10px', fontSize: '13px' }}>
                  Se copiarán <strong>{(copySrcPorDia[copyDayOrigen] || []).length} horarios</strong> a:{' '}
                  <strong>{copyDayDestinos.map(d => DIAS_LABEL[d]).join(', ')}</strong>.
                  {copyDayMode === 'reemplazar' && ' Los horarios previos de cada día destino serán eliminados.'}
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowCopyDayModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleCopiarDia}
                  disabled={copyDayDestinos.length === 0 || copyingDay}>
                  {copyingDay ? 'Copiando...' : `📋 Copiar a ${copyDayDestinos.length} día${copyDayDestinos.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Copiar horarios a plantilla de sala ── */}
      {showCopySalaModal && (
        <div className="modal-overlay" onClick={() => setShowCopySalaModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Copiar horarios a plantilla de sala</h3>
              <button className="modal-close" onClick={() => setShowCopySalaModal(false)}>✕</button>
            </div>

            <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Info destino */}
              <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>
                Destino: plantilla de <strong>{salaActual?.nombre}</strong>
                {totalHorariosSala > 0 && <span style={{ color: '#888' }}> · {totalHorariosSala} horarios actuales</span>}
              </p>

              {/* Toggle tipo fuente */}
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                {[
                  { value: 'dispositivo', label: '💻 Desde Dispositivo' },
                  { value: 'sala',        label: '🏢 Desde Sala' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setCopySalaTipo(opt.value); setCopySalaOrigenId(''); setCopySalaHorarios([]); setCopySalaFiltroSala(''); }}
                    style={{
                      flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                      fontSize: '14px', fontFamily: 'inherit',
                      background: copySalaTipo === opt.value ? '#667eea' : '#f5f5f5',
                      color: copySalaTipo === opt.value ? 'white' : '#555',
                      fontWeight: copySalaTipo === opt.value ? 600 : 400,
                      transition: 'all 0.15s'
                    }}
                  >{opt.label}</button>
                ))}
              </div>

              {/* ── Fuente: Dispositivo ── */}
              {copySalaTipo === 'dispositivo' && (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Filtrar por sala (opcional)</label>
                    <select
                      value={copySalaFiltroSala}
                      onChange={(e) => { setCopySalaFiltroSala(e.target.value); setCopySalaOrigenId(''); setCopySalaHorarios([]); }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
                    >
                      <option value="">Todas las salas</option>
                      {salas.map(s => <option key={s.id} value={s.id}>{s.nombre} — {s.edificio}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ marginBottom: '8px', display: 'block' }}>
                      Dispositivo origen ({dispositivos.filter(d => !copySalaFiltroSala || String(d.sala_id) === String(copySalaFiltroSala)).length} disponibles)
                    </label>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
                      {dispositivos
                        .filter(d => !copySalaFiltroSala || String(d.sala_id) === String(copySalaFiltroSala))
                        .map(d => (
                          <label key={d.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            background: copySalaOrigenId === d.id ? '#e8f5e9' : 'white',
                            transition: 'background 0.15s'
                          }}>
                            <input
                              type="radio" name="copySalaDispOrigen" value={d.id}
                              checked={copySalaOrigenId === d.id}
                              onChange={() => handleSelectCopySalaOrigen('dispositivo', d.id)}
                              style={{ accentColor: '#4CAF50', flexShrink: 0, width: '16px', height: '16px' }}
                            />
                            <span style={{ flex: 1 }}>
                              <strong style={{ fontSize: '14px' }}>{d.nombre_modelo}</strong>
                              <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>{d.tipo} — {d.sala_nombre || 'Sin sala'}</span>
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Fuente: Sala ── */}
              {copySalaTipo === 'sala' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ marginBottom: '8px', display: 'block' }}>
                    Sala origen{' '}
                    <span style={{ fontWeight: 400, color: '#888', fontSize: '12px' }}>
                      (se toman los horarios del primer dispositivo de esa sala)
                    </span>
                  </label>
                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
                    {salas.filter(s => String(s.id) !== String(salaHorId)).map(s => {
                      const devsOrigen = dispositivos.filter(d => String(d.sala_id) === String(s.id));
                      const sinDevs = devsOrigen.length === 0;
                      return (
                        <label key={s.id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 14px', cursor: sinDevs ? 'not-allowed' : 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          background: copySalaOrigenId === String(s.id) ? '#e8f5e9' : 'white',
                          opacity: sinDevs ? 0.45 : 1,
                          transition: 'background 0.15s'
                        }}>
                          <input
                            type="radio" name="copySalaSalaOrigen" value={s.id}
                            checked={copySalaOrigenId === String(s.id)}
                            onChange={() => !sinDevs && handleSelectCopySalaOrigen('sala', s.id)}
                            disabled={sinDevs}
                            style={{ accentColor: '#4CAF50', flexShrink: 0, width: '16px', height: '16px' }}
                          />
                          <span style={{ flex: 1 }}>
                            <strong style={{ fontSize: '14px' }}>{s.nombre}</strong>
                            <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                              {s.edificio}
                              {sinDevs
                                ? ' · Sin dispositivos'
                                : ` · ${devsOrigen.length} dispositivo${devsOrigen.length !== 1 ? 's' : ''}`}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Vista previa ── */}
              {copySalaOrigenId && (
                <div>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '13px', color: '#334155' }}>
                    Vista previa:{' '}
                    {loadingCopySala
                      ? <span style={{ fontWeight: 400, color: '#888' }}>Cargando...</span>
                      : copySalaHorarios.length === 0
                        ? <span style={{ fontWeight: 400, color: '#e65100' }}>Sin horarios configurados en este origen</span>
                        : <span style={{ fontWeight: 400, color: '#2e7d32' }}>{copySalaHorarios.length} horarios encontrados</span>}
                  </p>
                  {!loadingCopySala && copySalaHorarios.length > 0 && (
                    <div style={{
                      maxHeight: '160px', overflowY: 'auto', fontSize: '13px',
                      border: '1px solid #e0e0e0', borderRadius: '8px',
                      padding: '12px', background: '#f9fafb',
                      display: 'flex', flexDirection: 'column', gap: '5px'
                    }}>
                      {diasSemana.filter(d => copySalaPreviaPorDia[d.id]?.length > 0).map(dia => (
                        <div key={dia.id} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#334155', minWidth: '78px', fontSize: '12px' }}>{dia.nombre}:</span>
                          {(copySalaPreviaPorDia[dia.id] || [])
                            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                            .map((h, i) => (
                              <span key={i} style={{
                                padding: '2px 7px', borderRadius: '4px', fontSize: '11px',
                                background: h.estado_esperado === 'Encendido' ? '#e8f5e9' : '#f5f5f5',
                                color: h.estado_esperado === 'Encendido' ? '#2e7d32' : '#555',
                                border: `1px solid ${h.estado_esperado === 'Encendido' ? '#a5d6a7' : '#ddd'}`
                              }}>
                                {h.hora_inicio.substring(0, 5)}–{h.hora_fin.substring(0, 5)}{' '}
                                {h.estado_esperado === 'Encendido' ? '🟢' : '⚫'}
                              </span>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Modo de importación ── */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ marginBottom: '10px', display: 'block' }}>Modo de importación</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: 'reemplazar', label: '🔄 Reemplazar', desc: 'Borra la plantilla actual y la reemplaza' },
                    { value: 'agregar',    label: '➕ Agregar',    desc: 'Suma los horarios sin borrar los existentes' }
                  ].map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      cursor: 'pointer', flex: 1, padding: '12px',
                      border: `2px solid ${copySalaMode === opt.value ? '#667eea' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      background: copySalaMode === opt.value ? '#f0f1ff' : 'white',
                      transition: 'all 0.15s'
                    }}>
                      <input
                        type="radio" name="copySalaMode" value={opt.value}
                        checked={copySalaMode === opt.value} onChange={() => setCopySalaMode(opt.value)}
                        style={{ marginTop: '3px', accentColor: '#667eea', flexShrink: 0 }}
                      />
                      <span>
                        <strong style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>{opt.label}</strong>
                        <span style={{ fontSize: '12px', color: '#666' }}>{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {copySalaMode === 'reemplazar' && totalHorariosSala > 0 && (
                <div style={{ background: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                  ⚠️ Se eliminarán los <strong>{totalHorariosSala} horarios actuales</strong> de la plantilla antes de cargar los nuevos.
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '4px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCopySalaModal(false)}>Cancelar</button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCopiarASalaTemplate}
                  disabled={!copySalaOrigenId || copySalaHorarios.length === 0 || loadingCopySala}
                >
                  {loadingCopySala
                    ? '⏳ Cargando...'
                    : `📋 Cargar ${copySalaHorarios.length} horario${copySalaHorarios.length !== 1 ? 's' : ''} en plantilla`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HorariosAdmin;

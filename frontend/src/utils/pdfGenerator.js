// ============================================
// MÓDULO: Generador de PDFs - Reportes Energía
// ============================================
// Ubicación: frontend/src/utils/pdfGenerator.js

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================
const COLORES = {
  primario: [33, 65, 85],      // #334155
  secundario: [33, 150, 243],  // #2196F3
  exito: [76, 175, 80],        // #4CAF50
  error: [244, 67, 54],        // #F44336
  advertencia: [255, 152, 0],  // #FF9800
  texto: [51, 51, 51],         // #333333
  gris: [158, 158, 158],       // #9E9E9E
  digital: [147, 51, 234]      // #9333EA (morado)
};

const MARGENES = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Agrega encabezado al PDF
 */
const agregarEncabezado = (doc, titulo, subtitulo = '') => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo/Título de la universidad
  doc.setFillColor(...COLORES.primario);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Universidad Austral de Chile', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Monitoreo de Energía', pageWidth / 2, 25, { align: 'center' });
  
  // Título del reporte
  doc.setTextColor(...COLORES.texto);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, MARGENES.left, 50);
  
  if (subtitulo) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORES.gris);
    doc.text(subtitulo, MARGENES.left, 58);
  }
  
  return 65; // Retorna posición Y donde termina el encabezado
};

/**
 * Agrega pie de página al PDF
 */
const agregarPieDePagina = (doc) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Línea separadora
    doc.setDrawColor(...COLORES.gris);
    doc.line(MARGENES.left, pageHeight - 15, pageWidth - MARGENES.right, pageHeight - 15);
    
    // Fecha de generación
    doc.setFontSize(9);
    doc.setTextColor(...COLORES.gris);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generado el ${fecha}`, MARGENES.left, pageHeight - 8);
    
    // Número de página
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - MARGENES.right, pageHeight - 8, { align: 'right' });
  }
};

/**
 * Agrega una sección con título
 */
const agregarSeccion = (doc, titulo, yPos) => {
  doc.setFillColor(...COLORES.secundario);
  doc.rect(MARGENES.left, yPos, doc.internal.pageSize.getWidth() - MARGENES.left - MARGENES.right, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, MARGENES.left + 3, yPos + 6);
  
  return yPos + 15; // Retorna nueva posición Y
};

// ============================================
// GENERADOR: REPORTE DE DISPOSITIVO (DMA)
// ============================================

/**
 * Genera PDF de reporte de dispositivo individual
 * 
 * @param {Object} params - Parámetros del reporte
 * @param {Object} params.dispositivo - Datos del dispositivo
 * @param {Object} params.sala - Datos de la sala
 * @param {Object} params.estadisticas - Estadísticas calculadas
 * @param {string} params.periodo - Periodo (hora/dia/mes/año)
 * @param {string} params.periodoTexto - Texto descriptivo del periodo
 * @param {string} params.año - Año seleccionado
 * @param {string} params.mes - Mes seleccionado (opcional)
 * @param {string} params.dia - Día seleccionado (opcional)
 */
export const generarReporteDispositivo = (params) => {
  const {
    dispositivo,
    sala,
    estadisticas,
    periodo,
    periodoTexto,
    año,
    mes,
    dia
  } = params;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // ENCABEZADO
  let yPos = agregarEncabezado(
    doc, 
    'Reporte de Dispositivo - DMA',
    `Análisis ${periodo === 'hora' ? 'por Hora' : periodo === 'dia' ? 'por Día' : periodo === 'mes' ? 'por Mes' : 'Anual'}`
  );
  
  // INFORMACIÓN DEL DISPOSITIVO
  yPos = agregarSeccion(doc, 'Información del Dispositivo', yPos);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Campo', 'Valor']],
    body: [
      ['ID', dispositivo.id],
      ['Nombre', dispositivo.nombre_modelo],
      ['Tipo', dispositivo.tipo],
      ['Descripción', dispositivo.descripcion || 'N/A'],
      ['Sala', sala?.nombre || 'N/A'],
      ['Edificio', sala?.edificio || 'N/A'],
      ['Piso', sala?.piso || 'N/A'],
      ['Potencia Encendido', `${dispositivo.watts_encendido} W`],
      ['Potencia Apagado', `${dispositivo.watts_apagado} W`],
      ['Años de Uso', `${dispositivo.años_uso} años`],
      ['Usa Internet', dispositivo.usa_internet ? '🌐 Sí' : '🚫 No']
    ],
    headStyles: { fillColor: COLORES.primario, textColor: 255 },
    margin: { left: MARGENES.left, right: MARGENES.right },
    theme: 'striped'
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // PERIODO DE ANÁLISIS
  yPos = agregarSeccion(doc, `Periodo de Análisis: ${periodoTexto}`, yPos);
  yPos += 5;
  
  // RESUMEN DE CONSUMO Y EMISIONES
  yPos = agregarSeccion(doc, 'Resumen de Consumo y Emisiones', yPos);
  
  const datosResumen = [
    ['Consumo Encendido', `${estadisticas.totalConsumoEnc} kWh`, COLORES.secundario],
    ['Consumo Apagado', `${estadisticas.totalConsumoApa} kWh`, COLORES.exito],
    ['Consumo Total', `${estadisticas.totalConsumo} kWh`, COLORES.primario],
    ['Emisiones Encendido', `${estadisticas.totalEmisionesEnc} kg CO₂`, COLORES.error],
    ['Emisiones Apagado', `${estadisticas.totalEmisionesApa} kg CO₂`, COLORES.advertencia],
    ['Emisiones Totales', `${estadisticas.totalEmisiones} kg CO₂`, COLORES.error]
  ];
  
  autoTable(doc,{
    startY: yPos,
    head: [['Métrica', 'Valor', '']],
    body: datosResumen.map(([metrica, valor]) => [metrica, valor, '']),
    headStyles: { fillColor: COLORES.primario, textColor: 255 },
    margin: { left: MARGENES.left, right: MARGENES.right },
    theme: 'striped',
    columnStyles: {
      2: { cellWidth: 5 }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const color = datosResumen[data.row.index][2];
        doc.setFillColor(...color);
        doc.circle(data.cell.x + 2.5, data.cell.y + data.cell.height / 2, 2, 'F');
      }
    }
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // HORAS DE OPERACIÓN
  yPos = agregarSeccion(doc, 'Horas de Operación', yPos);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Horas Encendido', `${estadisticas.horasEncendido} h`],
      ['Horas Apagado', `${estadisticas.horasApagado} h`],
      ['Horas Totales', `${estadisticas.totalHoras} h`],
      ['% Tiempo Encendido', `${estadisticas.porcentajeEncendido}%`]
    ],
    headStyles: { fillColor: COLORES.primario, textColor: 255 },
    margin: { left: MARGENES.left, right: MARGENES.right },
    theme: 'striped'
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // HUELLA DIGITAL (si aplica)
  if (estadisticas.trafico_mb && parseFloat(estadisticas.trafico_mb) > 0) {
    // Nueva página si no hay espacio
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos = agregarSeccion(doc, '🌐 Huella de Carbono Digital', yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Métrica Digital', 'Valor']],
      body: [
        ['Tráfico de Red', `${estadisticas.trafico_mb} MB (${(parseFloat(estadisticas.trafico_mb) / 1024).toFixed(4)} GB)`],
        ['Consumo Digital', `${estadisticas.consumo_trafico_kwh} kWh`],
        ['Emisiones Digitales', `${estadisticas.emisiones_trafico_kg} kg CO₂`]
      ],
      headStyles: { fillColor: COLORES.digital, textColor: 255 },
      margin: { left: MARGENES.left, right: MARGENES.right },
      theme: 'striped'
    });
  }
  
  // PIE DE PÁGINA
  agregarPieDePagina(doc);
  
  // GUARDAR PDF
  const nombreArchivo = `reporte_${dispositivo.id}_${periodo}_${año}${mes ? '_' + mes : ''}${dia ? '_' + dia : ''}.pdf`;
  doc.save(nombreArchivo);
};

// ============================================
// GENERADOR: REPORTE DE SALA (VISOR)
// ============================================

/**
 * Genera PDF de reporte de sala
 * 
 * @param {Object} params - Parámetros del reporte
 * @param {Object} params.sala - Datos de la sala
 * @param {Object} params.encargado - Datos del encargado
 * @param {Array} params.dispositivos - Lista de dispositivos
 * @param {Object} params.resumenSala - Resumen de estadísticas de la sala
 * @param {string} params.periodoTexto - Texto descriptivo del periodo
 * @param {Array} params.estadisticasDispositivos - Estadísticas por dispositivo
 */
export const generarReporteSala = (params) => {
  const {
    sala,
    encargado,
    dispositivos,
    resumenSala,
    periodoTexto,
    estadisticasDispositivos
  } = params;
  
  const doc = new jsPDF();
  
  // ENCABEZADO
  let yPos = agregarEncabezado(
    doc, 
    'Reporte de Sala',
    `${sala.nombre} - ${sala.edificio}`
  );
  
  // INFORMACIÓN DE LA SALA
  yPos = agregarSeccion(doc, 'Información de la Sala', yPos);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Campo', 'Valor']],
    body: [
      ['Nombre', sala.nombre],
      ['Edificio', sala.edificio],
      ['Piso', sala.piso],
      ['Número', sala.numero],
      ['Encargado', encargado?.nombre || 'Sin asignar'],
      ['Email Encargado', encargado?.email || 'N/A'],
      ['Total Dispositivos', resumenSala.numDispositivos]
    ],
    headStyles: { fillColor: COLORES.primario, textColor: 255 },
    margin: { left: MARGENES.left, right: MARGENES.right },
    theme: 'striped'
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // PERIODO
  yPos = agregarSeccion(doc, `Periodo de Análisis: ${periodoTexto}`, yPos);
  yPos += 5;
  
  // RESUMEN GENERAL
  yPos = agregarSeccion(doc, 'Resumen General de la Sala', yPos);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Consumo Total', `${resumenSala.totalConsumo} kWh`],
      ['Emisiones Totales', `${resumenSala.totalEmisiones} kg CO₂`],
      ['Horas Totales', `${resumenSala.totalHoras} h`]
    ],
    headStyles: { fillColor: COLORES.primario, textColor: 255 },
    margin: { left: MARGENES.left, right: MARGENES.right },
    theme: 'striped'
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // HUELLA DIGITAL DE LA SALA (si aplica)
  if (resumenSala.totalTrafico) {
    yPos = agregarSeccion(doc, '🌐 Huella Digital de la Sala', yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Métrica Digital', 'Valor']],
      body: [
        ['Tráfico Total', `${resumenSala.totalTrafico} GB`],
        ['Consumo Digital', `${resumenSala.totalConsumoDigital} kWh`],
        ['Emisiones Digitales', `${resumenSala.totalEmisionesDigitales} kg CO₂`]
      ],
      headStyles: { fillColor: COLORES.digital, textColor: 255 },
      margin: { left: MARGENES.left, right: MARGENES.right },
      theme: 'striped'
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // NUEVA PÁGINA PARA DISPOSITIVOS
  doc.addPage();
  yPos = 20;
  
  // DETALLE POR DISPOSITIVO
  yPos = agregarSeccion(doc, 'Detalle por Dispositivo', yPos);
  
  const datosDispositivos = dispositivos.map(disp => {
    const stats = estadisticasDispositivos[disp.id] || {};
    return [
      disp.nombre_modelo,
      disp.tipo,
      `${stats.totalConsumo || '0.00'} kWh`,
      `${stats.totalEmisiones || '0.00'} kg CO₂`,
      `${stats.totalHoras || '0'} h`,
      stats.trafico_mb && parseFloat(stats.trafico_mb) > 0 ? `${stats.trafico_mb} MB` : 'N/A'
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Dispositivo', 'Tipo', 'Consumo', 'Emisiones', 'Horas', 'Tráfico']],
    body: datosDispositivos,
    headStyles: { fillColor: COLORES.primario, textColor: 255 },
    margin: { left: MARGENES.left, right: MARGENES.right },
    theme: 'striped',
    styles: { fontSize: 9 }
  });
  
  // PIE DE PÁGINA
  agregarPieDePagina(doc);
  
  // GUARDAR PDF
  const nombreArchivo = `reporte_sala_${sala.id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nombreArchivo);
};

// ============================================
// GENERADOR: REPORTE DE EDIFICIO COMPLETO
// ============================================

/**
 * Genera PDF de reporte del edificio completo
 * 
 * @param {Object} params - Parámetros del reporte
 * @param {Array} params.salas - Lista de salas
 * @param {Array} params.dispositivos - Lista de dispositivos
 * @param {Object} params.estadisticasEdificio - Estadísticas del edificio
 * @param {string} params.periodoTexto - Texto descriptivo del periodo
 */
export const generarReporteEdificio = (params) => {
  const {
    salas,
    dispositivos,
    estadisticasEdificio,
    periodoTexto
  } = params;
  
  const doc = new jsPDF();
  
  // ENCABEZADO
  let yPos = agregarEncabezado(
    doc, 
    'Reporte General del Edificio',
    'Análisis Completo de Consumo Energético'
  );
  
  // PERIODO
  yPos = agregarSeccion(doc, `Periodo de Análisis: ${periodoTexto}`, yPos);
  yPos += 5;
  
  // RESUMEN GENERAL
  yPos = agregarSeccion(doc, 'Resumen General del Edificio', yPos);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Salas', salas.length],
      ['Total de Dispositivos', dispositivos.length],
      ['Consumo Total', `${estadisticasEdificio.consumoTotal} kWh`],
      ['Emisiones Totales', `${estadisticasEdificio.emisionesTotales} kg CO₂`]
    ],
    headStyles: { fillColor: COLORES.primario, textColor: 255 },
    margin: { left: MARGENES.left, right: MARGENES.right },
    theme: 'striped'
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // DISTRIBUCIÓN POR PISO
  if (estadisticasEdificio.porPiso) {
    doc.addPage();
    yPos = 20;
    
    yPos = agregarSeccion(doc, 'Distribución por Piso', yPos);
    
    const datosPisos = Object.entries(estadisticasEdificio.porPiso).map(([piso, datos]) => [
      `Piso ${piso}`,
      `${datos.consumo} kWh`,
      `${datos.emisiones} kg CO₂`,
      `${datos.porcentaje}%`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Piso', 'Consumo', 'Emisiones', '% del Total']],
      body: datosPisos,
      headStyles: { fillColor: COLORES.primario, textColor: 255 },
      margin: { left: MARGENES.left, right: MARGENES.right },
      theme: 'striped'
    });
  }
  
  // PIE DE PÁGINA
  agregarPieDePagina(doc);
  
  // GUARDAR PDF
  const nombreArchivo = `reporte_edificio_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nombreArchivo);
};

export default {
  generarReporteDispositivo,
  generarReporteSala,
  generarReporteEdificio
};
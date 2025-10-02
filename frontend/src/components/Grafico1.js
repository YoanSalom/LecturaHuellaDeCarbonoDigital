// src/components/Grafico1.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

Chart.register(...registerables);

const Grafico1 = () => {
  const [apiData, setApiData] = useState({ data: [] }); // Cambiado para manejar la estructura completa
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('hourly');
  const [selectedDate, setSelectedDate] = useState('2024-01-02');
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  // Autoajustar fecha según el rango
  useEffect(() => {
    if (timeRange === 'hourly') {
      setSelectedDate('2024-01-02');
    } else if (timeRange === 'daily') {
      setSelectedDate('2024-01');
    } else if (timeRange === 'monthly') {
      setSelectedDate('2024');
    } else if (timeRange === 'yearly') {
      setSelectedDate('2024');
    }
  }, [timeRange]);

  const fetchData = useCallback(async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:3001/api/electricity/csv-data?range=${timeRange}`;
      
      if (timeRange === 'hourly') {
        url += `&date=${selectedDate}`;
      } else if (timeRange === 'daily') {
        const [year, month] = selectedDate.split('-');
        url += `&year=${year}&month=${month}`;
      } else if (timeRange === 'monthly' || timeRange === 'yearly') {
        url += `&year=2024`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al cargar datos');
      const result = await response.json();
      setApiData(result); // Guardamos todo el objeto de respuesta
    } catch (err) {
      setError(err.message);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedDate]);

  const prepareChartData = useCallback(() => {
    if (!apiData.data || apiData.data.length === 0) return { labels: [], chartData: [] };

    const labels = [];
    const chartData = [];

    apiData.data.forEach(item => {
      const date = parseISO(item.datetime);
      
      switch(timeRange) {
        case 'hourly':
          labels.push(format(date, 'HH:mm'));
          break;
        case 'daily':
          labels.push(format(date, 'dd'));
          break;
        case 'monthly':
          labels.push(format(date, 'MMMM', { locale: es }));
          break;
        case 'yearly':
          labels.push(format(date, 'yyyy'));
          break;
        default:
          labels.push(format(date, 'yyyy-MM-dd'));
      }
      chartData.push(item.carbonIntensity);
    });

    return { labels, chartData };
  }, [apiData.data, timeRange]);

  const getXAxisTitle = useCallback(() => {
    switch(timeRange) {
      case 'hourly': return 'Hora del día';
      case 'daily': return 'Días del mes';
      case 'monthly': return 'Meses del año';
      case 'yearly': return 'Año';
      default: return 'Fecha';
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!apiData.data || apiData.data.length === 0 || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    
    if (chartRef.current.chart) {
      chartRef.current.chart.destroy();
    }

    const { labels, chartData } = prepareChartData();

    chartRef.current.chart = new Chart(ctx, {
      type: 'bar' ,
      data: {
        labels,
        datasets: [{
          label: `Emision genereda gCO₂eq/kWh (${timeRange})`,
          data: chartData,
          backgroundColor: timeRange === 'daily' || 'hourly' ? '#3a86ff' : 'rgba(58, 134, 255, 0.2)',
          borderColor: '#3a86ff',
          borderWidth: 2,
          pointRadius: timeRange === 'hourly' ? 4 : 0,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
              text: getXAxisTitle()
            }
          },
          y: {
            title: {
              display: true,
              text: 'gCO₂eq/kWh (direct)'
            }
          }
        }
      }
    });
  }, [apiData, timeRange, prepareChartData, getXAxisTitle]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Monitor de Emisiones por gCO₂eq/kWh (2024)</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px' }}
        >
          <option value="hourly">Horario</option>
          <option value="daily">Diario</option>
          <option value="monthly">Mensual</option>
          <option value="yearly">Anual</option>
        </select>

        {timeRange === 'hourly' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min="2024-01-01"
            max="2024-12-31"
            style={{ padding: '7px', borderRadius: '4px' }}
          />
        )}

        {timeRange === 'daily' && (
          <input
            type="month"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min="2024-01"
            max="2024-12"
            style={{ padding: '7px', borderRadius: '4px' }}
          />
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        {timeRange === 'hourly' && `Mostrando datos del día: ${selectedDate}`}
        {timeRange === 'daily' && `Mostrando datos del mes: ${selectedDate}`}
        {timeRange === 'monthly' && `Mostrando datos mensuales de 2024`}
        {timeRange === 'yearly' && `Mostrando datos anuales de 2024`}
      </div>

      <div style={{ height: '400px', width: '100%' }}>
        {loading ? (
          <p>Cargando datos...</p>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
};

export default Grafico1;
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

const ConsumoChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/lecturas');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2>Consumo Energético y Emisiones de CO₂e</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre_modelo" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="consumo_total" fill="#8884d8" name="Consumo (W)" />
          <Bar dataKey="emisiones_total" fill="#82ca9d" name="Emisiones (kg CO₂e)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConsumoChart;
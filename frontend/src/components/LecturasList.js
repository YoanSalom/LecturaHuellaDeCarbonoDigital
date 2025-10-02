import React, { useEffect, useState } from 'react';
import api from '../api';

const LecturasList = ({ dispositivoId }) => {
    const [lecturas, setLecturas] = useState([]);

    useEffect(() => {
        api.get(`/lecturas/${dispositivoId}`)
            .then((response) => setLecturas(response.data))
            .catch((error) => console.error('Error al cargar lecturas:', error));
    }, [dispositivoId]);

    return (
        <div>
            <h2>Lecturas</h2>
            <ul>
                {lecturas.map((lectura) => (
                    <li key={lectura.id}>
                        {lectura.fecha}: {lectura.consumo_watts} W, {lectura.emisiones_CO2e_kg} kg CO2e
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LecturasList;
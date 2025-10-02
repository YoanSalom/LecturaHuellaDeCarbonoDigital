import React, { useEffect, useState } from 'react';
import api from '../api';

const DispositivosList = () => {
    const [dispositivos, setDispositivos] = useState([]);

    useEffect(() => {
        api.get('/dispositivos')
            .then((response) => setDispositivos(response.data))
            .catch((error) => console.error('Error al cargar dispositivos:', error));
    }, []);

    return (
        <div>
            <h2>Dispositivos</h2>
            <ul>
                {dispositivos.map((dispositivo) => (
                    <li key={dispositivo.id}>
                        {dispositivo.nombre_modelo} - {dispositivo.tipo} - {dispositivo.estado_actual}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DispositivosList;
# Plataforma de Huella de Carbono Digital — UACh — Programa Preliminar

Sistema de monitoreo de consumo eléctrico, tráfico de red y huella de carbono digital
de dispositivos, salas y edificios de la Universidad Austral de Chile.

Esta carpeta es una copia autocontenida del sistema (backend + frontend + base de datos)
lista para instalar y ejecutar en otro equipo.

## Contenido de esta carpeta

```
programa preliminar/
├── backend/            API REST (Node.js + Express + MySQL/MariaDB)
├── frontend/           Aplicación web (React)
├── database/
│   └── tesis_db_dump.sql   Volcado completo de la base de datos actual (esquema + datos)
└── README.md           Este archivo
```

No se incluyen `node_modules/` (se generan con `npm install`, ver más abajo) ni los archivos
`.env` reales (se reemplazaron por `.env.example`, ver el paso 3).

## 1. Requisitos previos

| Software | Versión usada en desarrollo | Notas |
|---|---|---|
| Node.js | v25.5.0 (funciona también con cualquier LTS reciente, 18+) | incluye `npm` |
| MySQL / MariaDB | MariaDB 10.4 (vía XAMPP) | cualquier MySQL 5.7+/MariaDB 10.3+ debería servir |
| Cliente MySQL (CLI o phpMyAdmin) | — | para importar el dump adjunto |

## 2. Crear la base de datos e importar el dump

Con el servidor MySQL/MariaDB corriendo:

**Opción A — línea de comandos:**
```bash
mysql -u root -p -e "CREATE DATABASE tesis_db CHARACTER SET utf8mb4;"
mysql -u root -p tesis_db < database/tesis_db_dump.sql
```

**Opción B — phpMyAdmin:** crea una base de datos llamada `tesis_db` (cotejamiento
`utf8mb4_general_ci` o similar), entra a ella, pestaña "Importar", selecciona
`database/tesis_db_dump.sql` y ejecuta.

El dump incluye las 8 tablas del sistema (`usuarios`, `salas`, `dispositivos`,
`horarios_dispositivos`, `lecturas`, `estadisticas`, `carbon_intensity`, `sugerencias`)
con todos los datos actuales — incluye ~200.000 lecturas simuladas de 2024 y 2025 ya
generadas, así que la aplicación funciona de inmediato sin tener que regenerar nada.

Idealmente crea un usuario de MySQL dedicado con permisos sobre `tesis_db` (o usa
`root` si es solo para pruebas locales) — necesitarás esas credenciales en el paso 3.

## 3. Configurar el backend

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` y completa:

| Variable | Qué poner |
|---|---|

| `DB_USER` / `DB_PASSWORD` | credenciales del usuario MySQL que creaste en el paso 2 |

| `ELECTRICITY_MAPS_API_KEY` | (opcional) tu API key de [electricitymaps.com](https://www.electricitymaps.com/) — solo afecta la vista "Carbono en Tiempo Real"; sin ella, el resto del sistema funciona igual |
| `JWT_SECRET` | cualquier cadena larga y aleatoria. 

Puedes generar una con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

| `ADMIN_PASSWORD_HASH` / `VISITANTE_PASSWORD_HASH` | hash bcrypt de las contraseñas que quieras 

usar para entrar como administrador/invitado |

Para generar los hashes bcrypt (elige tú las contraseñas en texto plano):
```bash
cd backend
npm install bcryptjs
node -e "const b=require('bcryptjs'); console.log('ADMIN_PASSWORD_HASH=' + b.hashSync('TU_PASSWORD_ADMIN', 10)); console.log('VISITANTE_PASSWORD_HASH=' + b.hashSync('TU_PASSWORD_VISITANTE', 10));"
```
Copia los dos valores impresos dentro de `backend/.env`.

## 4. Instalar dependencias y ejecutar

**Backend** (puerto 3001):
```bash
cd backend
npm install
npm start
```

**Frontend** (puerto 3002), en otra terminal:
```bash
cd frontend
npm install
npm install lucide-react dompurify -- usar si falla la instalacion de lucide-react
npm start
```

El backend debe quedar corriendo en `http://localhost:3001` (verifica con
`http://localhost:3001/health`) y el frontend se abre automáticamente en
`http://localhost:3000`.

**Ambos procesos deben correr al mismo tiempo** — el frontend depende del backend
(hace peticiones directas a `http://localhost:3001/api/...`) y el backend depende
de que MySQL/MariaDB esté arriba con `tesis_db` ya importada.

## 5. Iniciar sesión

En `http://localhost:3000` puedes:
- Iniciar sesión como **administrador** con el usuario `admin` y la contraseña que
  elegiste al generar `ADMIN_PASSWORD_HASH`.
- Iniciar sesión como **visitante** con el usuario `visitante` y la contraseña que
  elegiste al generar `VISITANTE_PASSWORD_HASH`, o usar el botón "Continuar como
  Invitado" (no requiere contraseña, acceso de solo lectura).

## 6. Notas adicionales

- El backend no aplica migraciones automáticas: el esquema completo ya viene en
  `database/tesis_db_dump.sql`, no hace falta ejecutar nada más para tener la base
  de datos lista.
- Si en algún momento quieres regenerar las lecturas simuladas (por ejemplo, para
  otro rango de años), el backend incluye scripts para eso:
  `cd backend && npm run generate:2024` / `npm run generate:2025` (o usa el botón
  "Regenerar Lecturas y Estadísticas" del panel de administración, con sesión de
  administrador iniciada).
- Puertos usados: `3002` (frontend), `3001` (backend API), `3306` (MySQL/MariaDB,
  puede variar según tu instalación — ajusta `DB_PORT` en `.env` si es distinto).

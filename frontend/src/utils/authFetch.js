// Wrapper sobre fetch() que adjunta el JWT guardado en localStorage
// (por Login.jsx) como header Authorization. Usar en toda llamada de
// escritura (POST/PUT/DELETE) a endpoints protegidos con authMiddleware.
// Las lecturas (GET) no lo necesitan porque el backend las deja públicas.
export function getToken() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token || null;
  } catch {
    return null;
  }
}

export function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

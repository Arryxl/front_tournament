import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

export const fileBase = API_URL;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gravity_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cuando la sesión no se puede recuperar (refresh inválido/expirado) limpiamos
// el storage y avisamos a la app para que cierre sesión de forma ordenada.
function forceLogout() {
  localStorage.removeItem('gravity_token');
  localStorage.removeItem('gravity_refresh');
  window.dispatchEvent(new Event('gravity:session-expired'));
}

// Evita que varias peticiones 401 simultáneas disparen varios refresh a la vez:
// el primero refresca y los demás esperan al mismo resultado.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('gravity_refresh');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  // Usamos axios "pelado" (no la instancia `api`) para no reentrar al interceptor.
  const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
    refreshToken,
  });
  localStorage.setItem('gravity_token', data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem('gravity_refresh', data.refreshToken);
  }
  return data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url || '';

    // Solo intentamos refrescar ante un 401 que no sea de los propios endpoints
    // de auth y que no se haya reintentado ya.
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }

    if (status === 401 && !isAuthCall) {
      forceLogout();
    }

    return Promise.reject(error);
  },
);

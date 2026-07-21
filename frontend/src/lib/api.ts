import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Render's free tier can cold-start the backend, so this needs to be generous enough
// to survive that — but bounded, so a dead/unreachable backend fails fast instead of
// hanging the UI (e.g. auth bootstrap on app load) forever.
const REQUEST_TIMEOUT_MS = 20000;

export const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (!refreshing) {
        refreshing = axios
          .post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: REQUEST_TIMEOUT_MS })
          .then((res) => {
            setAccessToken(res.data.accessToken);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            return res.data.accessToken as string;
          })
          .catch(() => {
            setAccessToken(null);
            localStorage.removeItem('refreshToken');
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      }

      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

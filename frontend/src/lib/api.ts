import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Render's free tier can cold-start the backend, so this needs to be generous enough
// to survive that — but bounded, so a dead/unreachable backend fails fast instead of
// hanging the UI (e.g. auth bootstrap on app load) forever.
const REQUEST_TIMEOUT_MS = 20000;

// A cold wake (container boot + Nest bootstrap + Neon waking from autosuspend) regularly
// runs past 20s, and login/register are exactly the calls a returning user makes first —
// so those got their own, much longer budget. Everything else keeps the short one: by the
// time you're inside the app the backend is warm, and a fast failure is the better UX.
export const COLD_START_TIMEOUT_MS = 60000;

export const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

/**
 * Fire-and-forget ping to start the backend waking up. Called as soon as the app loads, so
 * the spin-up overlaps with the user reading the page / typing credentials instead of
 * starting only once they hit Log In. Deliberately swallows errors — it's an optimization,
 * never a gate on rendering.
 */
let warmed = false;
export function warmUpBackend() {
  if (warmed) return;
  warmed = true;
  axios.get(`${API_BASE_URL}/health`, { timeout: COLD_START_TIMEOUT_MS }).catch(() => {});
}

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
            // See AuthContext.bootstrap for why this check matters: refresh tokens rotate,
            // so a losing race against a concurrent refresh (another tab, or the initial
            // bootstrap call) must not wipe out a token that call already rotated to.
            if (localStorage.getItem('refreshToken') === refreshToken) {
              localStorage.removeItem('refreshToken');
            }
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

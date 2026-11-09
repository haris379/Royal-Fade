import axios from 'axios';

// Empty VITE_API_URL = same origin ("/api"): Vite proxy in development, the same Vercel project in production.
const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const API_BASE = base ? (/\/api$/.test(base) ? base : `${base}/api`) : '/api';

export const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

// Dashboard session. sessionStorage: it ends when the tab closes, and the server can revoke it at any time.
const KEY = 'rf_admin';
export const session = {
  get() { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; } },
  set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  clear() { try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ } },
};

api.interceptors.request.use((config) => {
  const s = session.get();
  if (s?.token && String(config.url || '').startsWith('/admin') && !String(config.url).startsWith('/admin/login')) {
    config.headers.Authorization = `Bearer ${s.token}`;
  }
  return config;
});

// A revoked / expired dashboard session sends the person back to the login page.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = String(err.config?.url || '');
    if (err.response?.status === 401 && url.startsWith('/admin') && !url.startsWith('/admin/login')) {
      session.clear();
      if (!window.location.pathname.startsWith('/admin/login')) window.location.assign('/admin/login');
    }
    return Promise.reject(err);
  },
);

/** Human-readable message from any failed request. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (!err?.response) return 'Cannot reach the server. Check your connection and try again.';
  return err.response.data?.message || fallback;
}
export const fieldErrors = (err) => err?.response?.data?.errors || {};
export const errorCode = (err) => err?.response?.data?.code || '';

/** Image URLs: bundled images are same-origin; uploaded ones live on the API's origin when it is separate. */
export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/uploads/') && /^https?:\/\//i.test(base)) return new URL(path, base).toString();
  return path;
}

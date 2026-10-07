import axios from 'axios';

// Default base URL points to Laravel dev-apis backend (/api or /api/v1)
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

// Auth base URL for root auth endpoints: /token, /login, /two-factor (NO /api or /v1 prefix, e.g. http://127.0.0.1:8000)
export const AUTH_BASE_URL = (
  import.meta.env.VITE_AUTH_BASE_URL ||
  API_BASE_URL.replace(/\/api(\/v\d+)?$/, '')
).replace(/\/+$/, '');

// Backward-compatible alias
export const ROOT_API_URL = AUTH_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  timeout: 15000,
});

/**
 * Helper to ensure sensitive Authorization bearer tokens are ONLY sent
 * to trusted application backend origins, preventing third-party token exfiltration.
 */
function isInternalUrl(url?: string, baseURL?: string): boolean {
  if (!url) return true;
  // Relative paths are internal
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true;

  try {
    const targetOrigin = new URL(url).origin;
    const apiOrigin = new URL(API_BASE_URL).origin;
    const authOrigin = new URL(AUTH_BASE_URL).origin;
    const baseOrigin = baseURL && (baseURL.startsWith('http://') || baseURL.startsWith('https://'))
      ? new URL(baseURL).origin
      : apiOrigin;

    return (
      targetOrigin === apiOrigin ||
      targetOrigin === authOrigin ||
      targetOrigin === baseOrigin
    );
  } catch {
    return false;
  }
}

// Request interceptor: inject JWT Bearer Token strictly on trusted internal endpoints
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bronx_access_token');
    if (token && config.headers && isInternalUrl(config.url, config.baseURL)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname === '/client-ticket') {
        return Promise.reject(error);
      }
      localStorage.removeItem('bronx_access_token');
      localStorage.removeItem('bronx_user');
      // If not already on login page, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

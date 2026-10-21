import axios from 'axios'
import { getActiveApiBaseUrl, getActiveAuthBaseUrl } from '@/config/environment'

// When using reverse proxy (default), the frontend requests relative URLs:
// - API calls go to '/api' (e.g. http://localhost:4000/api/ticket)
// - Root auth endpoints go to '' (e.g. http://localhost:4000/two-factor, /login, /token)
// The Vite dev server (or Nginx in production) proxies them to the backend API origin.
// Direct absolute URLs can still be enforced by setting VITE_USE_PROXY=false in .env.
const useReverseProxy = import.meta.env.VITE_USE_PROXY !== 'false'

const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const rawAuthBase = (import.meta.env.VITE_AUTH_BASE_URL as string | undefined)?.trim()

export const API_BASE_URL = useReverseProxy
  ? rawApiBase && rawApiBase.startsWith('/')
    ? rawApiBase.replace(/\/+$/, '')
    : '/api'
  : (rawApiBase || 'http://127.0.0.1:8000/api')
      .replace(/\/+$/, '')
      .replace(/\/v\d+$/, '')
      .replace(/\/ticket$/, '')

export const AUTH_BASE_URL = useReverseProxy
  ? rawAuthBase && rawAuthBase.startsWith('/')
    ? rawAuthBase.replace(/\/+$/, '')
    : ''
  : (rawAuthBase || API_BASE_URL.replace(/\/api(\/.*)?$/, '')).replace(/\/+$/, '')

// Backward-compatible alias
export const ROOT_API_URL = AUTH_BASE_URL

export const apiClient = axios.create({
  baseURL: getActiveApiBaseUrl() || API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Language': 'km',
  },
  timeout: 15000,
})

// Update axios baseURL when runtime environment changes
if (typeof window !== 'undefined') {
  window.addEventListener('bronx-environment-changed', () => {
    apiClient.defaults.baseURL = getActiveApiBaseUrl()
  })
}

/**
 * Helper to ensure sensitive Authorization bearer tokens are ONLY sent
 * to trusted application backend origins, preventing third-party token exfiltration.
 */
function isInternalUrl(url?: string, baseURL?: string): boolean {
  if (!url) return true
  // Relative paths are internal
  if (url.startsWith('/') && !url.startsWith('//')) return true
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true

  try {
    const normalizeHost = (host: string) => (host === 'localhost' ? '127.0.0.1' : host)
    const targetUrl = new URL(url)
    const targetHost = normalizeHost(targetUrl.hostname)
    const targetPort = targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80')

    const originsToCheck: string[] = []
    if (typeof window !== 'undefined' && window.location?.origin) {
      originsToCheck.push(window.location.origin)
    }
    const activeApi = getActiveApiBaseUrl()
    const activeAuth = getActiveAuthBaseUrl()
    if (activeApi && (activeApi.startsWith('http://') || activeApi.startsWith('https://'))) {
      originsToCheck.push(activeApi)
    }
    if (activeAuth && (activeAuth.startsWith('http://') || activeAuth.startsWith('https://'))) {
      originsToCheck.push(activeAuth)
    }
    if (
      API_BASE_URL &&
      (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://'))
    ) {
      originsToCheck.push(API_BASE_URL)
    }
    if (
      AUTH_BASE_URL &&
      (AUTH_BASE_URL.startsWith('http://') || AUTH_BASE_URL.startsWith('https://'))
    ) {
      originsToCheck.push(AUTH_BASE_URL)
    }
    if (baseURL && (baseURL.startsWith('http://') || baseURL.startsWith('https://'))) {
      originsToCheck.push(baseURL)
    }

    return originsToCheck.some((base) => {
      try {
        const u = new URL(base)
        const host = normalizeHost(u.hostname)
        const port = u.port || (u.protocol === 'https:' ? '443' : '80')
        return host === targetHost && port === targetPort
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

// Request interceptor: inject JWT Bearer Token strictly on trusted internal endpoints & resolve dynamic environment baseURL
apiClient.interceptors.request.use(
  (config) => {
    // Dynamically apply active environment base URL if using default/relative or auth root
    const activeApi = getActiveApiBaseUrl()
    const activeAuth = getActiveAuthBaseUrl()

    if (
      config.baseURL === ROOT_API_URL ||
      config.url === '/token' ||
      config.url === '/login' ||
      config.url === '/two-factor'
    ) {
      config.baseURL = activeAuth
    } else if (!config.baseURL || config.baseURL === API_BASE_URL) {
      config.baseURL = activeApi
    }

    const token = localStorage.getItem('bronx_access_token')
    if (token && config.headers && isInternalUrl(config.url, config.baseURL)) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor: handle 401 unauthorized & 403 forbidden
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      if (window.location.pathname === '/client-ticket') {
        return Promise.reject(error)
      }
      localStorage.removeItem('bronx_access_token')
      localStorage.removeItem('bronx_user')
      // If not already on login page, redirect
      if (window.location.pathname !== '/login') {
        const errorParam = status === 403 ? '?error=role_forbidden' : ''
        window.location.href = `/login${errorParam}`
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient

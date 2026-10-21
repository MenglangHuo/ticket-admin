/**
 * Mock Data Configuration & State Manager
 * Reads default state from .env (VITE_ENABLE_MOCK_DATA / VITE_USE_MOCK_DATA)
 * and allows dynamic runtime override via browser storage.
 */

const STORAGE_KEY = 'bronx_mock_data_enabled'

/**
 * Returns whether mock data is enabled by default in .env
 */
export function getEnvMockDataStatus(): boolean {
  if (import.meta.env.MODE === 'test') {
    return import.meta.env.VITE_TEST_MOCK_DATA === 'true'
  }
  const envVal = import.meta.env.VITE_ENABLE_MOCK_DATA
  const legacyVal = import.meta.env.VITE_USE_MOCK_DATA
  return envVal === 'true' || legacyVal === 'true'
}

/**
 * Checks whether user has manually overridden the mock setting in localStorage
 */
export function hasMockOverride(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) !== null
}

/**
 * Determines whether mock data mode is currently active.
 * Priority:
 * 1. Runtime browser override in localStorage (if set)
 * 2. .env configuration (VITE_ENABLE_MOCK_DATA or VITE_USE_MOCK_DATA)
 */
export function isMockDataEnabled(): boolean {
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem(STORAGE_KEY)
    if (override === 'true') return true
    if (override === 'false') return false
  }
  return getEnvMockDataStatus()
}

/**
 * Set or clear runtime mock mode override.
 * Pass `null` to revert back to .env configuration.
 */
export function setMockDataOverride(enabled: boolean | null): void {
  if (typeof localStorage === 'undefined') return
  if (enabled === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
  }
}

/**
 * Toggles the current mock data mode state.
 */
export function toggleMockDataMode(): boolean {
  const next = !isMockDataEnabled()
  setMockDataOverride(next)
  return next
}

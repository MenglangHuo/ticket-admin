import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import {
  getBuildDefaultEnvironment,
  getStoredEnvironment,
  hasEnvironmentOverride,
  resolveEnvironmentProfile,
  setEnvironment,
  resetEnvironmentToDefault,
  currentEnvironmentKey,
  activeProfile,
  getActiveApiBaseUrl,
  isProduction,
  isProductionEnvironment,
  isEnvironmentSwitchingEnabled,
  STORAGE_KEY_ENV,
  STORAGE_KEY_CUSTOM_URL,
} from '@/config/environment'
import mockService from '@/mocks/mockService'
import EnvironmentBadge from '@/components/common/EnvironmentBadge.vue'

describe('Environment Management & Switcher Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetEnvironmentToDefault(false)
  })

  afterEach(() => {
    localStorage.clear()
    resetEnvironmentToDefault(false)
  })

  describe('Configuration & Default Resolution', () => {
    it('resolves build default environment', () => {
      const def = getBuildDefaultEnvironment()
      expect(['development', 'production', 'mock']).toContain(def)
    })

    it('identifies when runtime override is active or not', () => {
      expect(hasEnvironmentOverride()).toBe(false)
      localStorage.setItem(STORAGE_KEY_ENV, 'production')
      expect(hasEnvironmentOverride()).toBe(true)
    })

    it('retrieves stored environment correctly', () => {
      expect(getStoredEnvironment()).toBe(getBuildDefaultEnvironment())

      localStorage.setItem(STORAGE_KEY_ENV, 'production')
      expect(getStoredEnvironment()).toBe('production')

      localStorage.setItem(STORAGE_KEY_ENV, 'invalid_env')
      expect(getStoredEnvironment()).toBe(getBuildDefaultEnvironment())
    })
  })

  describe('Profile Resolution', () => {
    it('resolves development profile with correct endpoints and flags', () => {
      const profile = resolveEnvironmentProfile('development')
      expect(profile.key).toBe('development')
      expect(profile.isProduction).toBe(false)
      expect(profile.isMock).toBe(false)
      expect(profile.color).toBe('emerald')
      expect(profile.apiBaseUrl).toBeDefined()
    })

    it('resolves production profile with live release endpoints and production flag', () => {
      const profile = resolveEnvironmentProfile('production')
      expect(profile.key).toBe('production')
      expect(profile.isProduction).toBe(true)
      expect(profile.apiBaseUrl).toBeDefined()
      expect(profile.apiBaseUrl.length).toBeGreaterThan(0)
    })

    it('resolves mock sandbox profile with mock flag', () => {
      const profile = resolveEnvironmentProfile('mock')
      expect(profile.key).toBe('mock')
      expect(profile.isMock).toBe(true)
      expect(profile.color).toBe('purple')
    })

    it('resolves custom endpoint profile with user-defined URL', () => {
      const customUrl = 'http://192.168.1.50:8000/api'
      const profile = resolveEnvironmentProfile('custom', customUrl)
      expect(profile.key).toBe('custom')
      expect(profile.apiBaseUrl).toBe(customUrl)
      expect(profile.authBaseUrl).toBe('http://192.168.1.50:8000')
      expect(profile.color).toBe('sky')
    })
  })

  describe('Dynamic Environment Switching', () => {
    it('switches to production and persists in localStorage', () => {
      const eventSpy = vi.fn()
      window.addEventListener('bronx-environment-changed', eventSpy)

      const profile = setEnvironment('production')

      expect(profile.key).toBe('production')
      expect(currentEnvironmentKey.value).toBe('production')
      expect(localStorage.getItem(STORAGE_KEY_ENV)).toBe('production')
      expect(mockService.isMockDataEnabled()).toBe(false)
      expect(eventSpy).toHaveBeenCalled()

      window.removeEventListener('bronx-environment-changed', eventSpy)
    })

    it('switches to mock sandbox and enables mock data mode', () => {
      setEnvironment('mock')

      expect(currentEnvironmentKey.value).toBe('mock')
      expect(activeProfile.value.isMock).toBe(true)
      expect(mockService.isMockDataEnabled()).toBe(true)
    })

    it('switches to custom endpoint with custom URL persistence', () => {
      const customTarget = 'https://feature-test.local/api'
      setEnvironment('custom', { customApiUrl: customTarget })

      expect(currentEnvironmentKey.value).toBe('custom')
      expect(localStorage.getItem(STORAGE_KEY_CUSTOM_URL)).toBe(customTarget)
      expect(getActiveApiBaseUrl()).toBe(customTarget)
    })

    it('clears session tokens when clearSession is requested', () => {
      localStorage.setItem('bronx_access_token', 'temp_old_token')
      localStorage.setItem('bronx_user', JSON.stringify({ name: 'Admin' }))

      setEnvironment('production', { clearSession: true })

      expect(localStorage.getItem('bronx_access_token')).toBeNull()
      expect(localStorage.getItem('bronx_user')).toBeNull()
    })

    it('resets to build default successfully', () => {
      setEnvironment('production')
      expect(hasEnvironmentOverride()).toBe(true)

      resetEnvironmentToDefault()

      expect(hasEnvironmentOverride()).toBe(false)
      expect(currentEnvironmentKey.value).toBe(getBuildDefaultEnvironment())
      expect(localStorage.getItem(STORAGE_KEY_ENV)).toBeNull()
    })
  })

  describe('UI Component Integration', () => {
    it('renders EnvironmentBadge as a static non-clickable badge in development mode', () => {
      setEnvironment('development')

      const wrapper = mount(EnvironmentBadge, {
        global: {
          plugins: [createPinia()],
        },
      })

      expect(wrapper.find('div').exists()).toBe(true)
      expect(wrapper.find('button').exists()).toBe(false)
      expect(wrapper.text()).toContain('Local Dev')
      expect(wrapper.classes()).toContain('pointer-events-none')
    })

    it('removes EnvironmentBadge when running in production mode', () => {
      setEnvironment('production')

      expect(isProduction.value).toBe(true)
      expect(isProductionEnvironment()).toBe(true)
      expect(isEnvironmentSwitchingEnabled()).toBe(false)

      const wrapper = mount(EnvironmentBadge, {
        global: {
          plugins: [createPinia()],
        },
      })

      // Badge must not be rendered when run as production
      expect(wrapper.find('div').exists()).toBe(false)
      expect(wrapper.find('button').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Production')
    })
  })
})

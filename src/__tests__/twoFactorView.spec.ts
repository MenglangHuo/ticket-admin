import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import TwoFactorView from '@/views/TwoFactorView.vue'
import { useAuthStore } from '@/stores/authStore'

describe('TwoFactorView Component', () => {
  let router: any

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    localStorage.clear()
    vi.restoreAllMocks()

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
        { path: '/two-factor', name: 'two-factor', component: TwoFactorView },
        { path: '/tickets', name: 'tickets', component: { template: '<div>Tickets</div>' } },
      ],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to /login if mounted without an active pending 2FA session', async () => {
    const pushSpy = vi.spyOn(router, 'replace')

    router.push('/two-factor')
    await router.isReady()

    mount(TwoFactorView, {
      global: {
        plugins: [router],
      },
    })

    expect(pushSpy).toHaveBeenCalledWith({ name: 'login' })
  })

  it('renders user details, 6 OTP boxes, and challenge information when pending 2FA exists', async () => {
    const authStore = useAuthStore()
    authStore.pendingTwoFactor = {
      username: 'admin',
      appToken: 'test_app_token',
      role: 'HQ ADMIN',
      user: {
        id: 1,
        username: 'admin',
        first_name: 'Menglang',
        last_name: 'Huo',
        email: 'menglang@bronx.internal',
        role: 'HQ ADMIN',
        company_id: 1,
      },
      expiresAt: Date.now() + 600 * 1000,
    }

    router.push('/two-factor')
    await router.isReady()

    const wrapper = mount(TwoFactorView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('Two-Factor Authentication')
    expect(wrapper.text()).toContain('HQ Admin Security Checkpoint')
    expect(wrapper.text()).toContain('Menglang')
    expect(wrapper.text()).toContain('@admin')
    expect(wrapper.text()).toContain('HQ ADMIN')

    const inputs = wrapper.findAll('input[inputmode="numeric"]')
    expect(inputs.length).toBe(6)
  })

  it('does not contain mailing sending text, trust device, resend code, or alternative methods', async () => {
    const authStore = useAuthStore()
    authStore.pendingTwoFactor = {
      username: 'admin',
      appToken: 'token',
      role: 'HQ ADMIN',
      user: {
        id: 1,
        username: 'admin',
        first_name: 'Menglang',
        last_name: 'Huo',
        email: 'menglang@bronx.internal',
        role: 'HQ ADMIN',
        company_id: 1,
      },
      expiresAt: Date.now() + 600 * 1000,
      maskedEmail: 'm***g@bronx.internal',
    }

    router.push('/two-factor')
    await router.isReady()

    const wrapper = mount(TwoFactorView, {
      global: {
        plugins: [router],
      },
    })

    const text = wrapper.text()
    // Verify removed items per requirement
    expect(text).not.toContain('m***g@bronx.internal')
    expect(text).not.toContain('Trust this device')
    expect(text).not.toContain('Resend security code')
    expect(text).not.toContain('Alternative methods')
  })

  it('cancels 2FA and returns to login when cancel button is clicked', async () => {
    const authStore = useAuthStore()
    authStore.pendingTwoFactor = {
      username: 'admin',
      appToken: 'token',
      role: 'HQ ADMIN',
      user: {
        id: 1,
        username: 'admin',
        first_name: 'Menglang',
        last_name: 'Huo',
        email: 'menglang@bronx.internal',
        role: 'HQ ADMIN',
        company_id: 1,
      },
      expiresAt: Date.now() + 600 * 1000,
    }

    const pushSpy = vi.spyOn(router, 'push')
    const cancelSpy = vi.spyOn(authStore, 'cancelTwoFactor')

    router.push('/two-factor')
    await router.isReady()

    const wrapper = mount(TwoFactorView, {
      global: {
        plugins: [router],
      },
    })

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Sign in with a different account'))
    expect(cancelBtn).toBeDefined()
    await cancelBtn?.trigger('click')

    expect(cancelSpy).toHaveBeenCalled()
    expect(pushSpy).toHaveBeenCalledWith({ name: 'login' })
  })
})

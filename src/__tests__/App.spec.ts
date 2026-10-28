import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import router from '../router'
import App from '../App.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  it('mounts App with Pinia and Vue Router successfully', async () => {
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toContain('Ticket Admin')
  })

  it('does NOT render AppFooter when navigating to /ticket or /tickets page', async () => {
    localStorage.setItem('bronx_access_token', 'test_token')
    localStorage.setItem(
      'bronx_user',
      JSON.stringify({
        id: 1,
        username: 'hq_admin',
        role: 'HQ ADMIN',
      }),
    )

    await router.push('/ticket')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.findComponent(AppFooter).exists()).toBe(false)
  })

  it('renders AppFooter when navigating to /settings page', async () => {
    localStorage.setItem('bronx_access_token', 'test_token')
    localStorage.setItem(
      'bronx_user',
      JSON.stringify({
        id: 1,
        username: 'hq_admin',
        role: 'HQ ADMIN',
      }),
    )

    await router.push('/settings')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.findComponent(AppFooter).exists()).toBe(true)
  })
})

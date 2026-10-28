import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Topbar from '@/components/layout/Topbar.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/ticket', component: { template: '<div>Tickets</div>' } },
    { path: '/settings', component: { template: '<div>Settings</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
  ],
})

describe('Topbar User Profile & Dropdown', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    router.push('/ticket')
    await router.isReady()

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders user info from localStorage bronx_user in profile trigger and dropdown', async () => {
    localStorage.setItem(
      'bronx_user',
      JSON.stringify({
        id: 99,
        username: 'menglang_admin',
        first_name: 'Menglang',
        last_name: 'Huo',
        first_name_kh: 'ម៉េងឡាង',
        last_name_kh: 'ហួ',
        email: 'menglang@bronx.internal',
        phone: '010 334 556',
        role: 'HQ ADMIN',
        department_name: 'Core Technology',
        division_name: 'Engineering',
        company_id: 1,
        company_name: 'BRONX Technology',
        profile: 'https://example.com/menglang.jpg',
      }),
    )

    const wrapper = mount(Topbar, {
      global: {
        plugins: [router],
        stubs: {
          EnvironmentBadge: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    // Trigger should display the user's name
    expect(wrapper.text()).toContain('Menglang Huo')

    // Click trigger to open dropdown
    const triggerBtn = wrapper.find('button[title*="profile menu"]')
    expect(triggerBtn.exists()).toBe(true)

    await triggerBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    expect(text).toContain('@menglang_admin')
    expect(text).toContain('menglang@bronx.internal')
    expect(text).toContain('010 334 556')
    expect(text).toContain('Core Technology')
    expect(text).toContain('HQ ADMIN')
    expect(text).not.toContain('Engineering')
    expect(text).not.toContain('BRONX Technology')
    expect(text).not.toContain('ម៉េងឡាង')
  })

  it('supports bronx-user alternative key in localStorage', async () => {
    localStorage.setItem(
      'bronx-user',
      JSON.stringify({
        id: 88,
        username: 'sophea_user',
        first_name: 'Sophea',
        last_name: 'Vann',
        email: 'sophea@bronx.internal',
        role: 'TICKET ADMIN',
      }),
    )

    const wrapper = mount(Topbar, {
      global: {
        plugins: [router],
        stubs: {
          EnvironmentBadge: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sophea Vann')

    const triggerBtn = wrapper.find('button[title*="profile menu"]')
    await triggerBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('@sophea_user')
    expect(wrapper.text()).toContain('sophea@bronx.internal')
    expect(wrapper.text()).toContain('TICKET ADMIN')
  })
})

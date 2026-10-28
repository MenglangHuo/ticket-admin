import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SplashScreen from '@/components/common/SplashScreen.vue'
import { useSplashStore } from '@/stores/splashStore'

describe('SplashScreen.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders default brand title, subtitle, and message from splashStore', () => {
    const wrapper = mount(SplashScreen)

    expect(wrapper.find('[data-testid="splash-screen"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ticket Admin')
    expect(wrapper.text()).toContain('Ticket Management')
    expect(wrapper.text()).toContain('Loading application...')
  })

  it('renders custom props when provided', () => {
    const wrapper = mount(SplashScreen, {
      props: {
        title: 'Custom Title',
        subtitle: 'Custom Subtitle',
        message: 'Syncing database...',
      },
    })

    expect(wrapper.text()).toContain('Custom Title')
    expect(wrapper.text()).toContain('Custom Subtitle')
    expect(wrapper.text()).toContain('Syncing database...')
  })

  it('renders determinate progress bar with percentage when progress is a number', () => {
    const wrapper = mount(SplashScreen, {
      props: {
        progress: 65,
      },
    })

    const progressbar = wrapper.find('[role="progressbar"]')
    expect(progressbar.exists()).toBe(true)
    expect(progressbar.attributes('aria-valuenow')).toBe('65')
    expect(wrapper.text()).toContain('(65%)')

    const barFill = wrapper.find('.bg-gradient-to-r')
    expect(barFill.attributes('style')).toContain('width: 65%')
  })

  it('renders indeterminate animated bar when progress is null', () => {
    const wrapper = mount(SplashScreen, {
      props: {
        progress: null,
      },
    })

    const progressbar = wrapper.find('[role="progressbar"]')
    expect(progressbar.exists()).toBe(true)
    expect(progressbar.attributes('aria-valuenow')).toBeUndefined()
    expect(wrapper.find('.splash-shimmer-bar').exists()).toBe(true)
  })

  it('clamps progress to 0-100 range', () => {
    const wrapperOver = mount(SplashScreen, {
      props: { progress: 150 },
    })
    expect(wrapperOver.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')

    const wrapperUnder = mount(SplashScreen, {
      props: { progress: -20 },
    })
    expect(wrapperUnder.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
  })

  it('renders contained styling when fullscreen is false', () => {
    const wrapper = mount(SplashScreen, {
      props: {
        fullscreen: false,
      },
    })

    const el = wrapper.find('[data-testid="splash-screen"]')
    expect(el.classes()).toContain('absolute')
    expect(el.classes()).not.toContain('fixed')
  })

  it('respects visible prop and hides when visible is false', () => {
    const wrapper = mount(SplashScreen, {
      props: {
        visible: false,
      },
    })

    expect(wrapper.find('[data-testid="splash-screen"]').exists()).toBe(false)
  })

  it('reacts to splashStore visibility changes', async () => {
    const store = useSplashStore()
    const wrapper = mount(SplashScreen)

    expect(wrapper.find('[data-testid="splash-screen"]').exists()).toBe(true)

    store.hide(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="splash-screen"]').exists()).toBe(false)
  })

  it('supports custom slots for title and message', () => {
    const wrapper = mount(SplashScreen, {
      slots: {
        title: '<h1 class="custom-title">Slotted Title</h1>',
        message: '<span class="custom-msg">Slotted Message</span>',
      },
    })

    expect(wrapper.find('.custom-title').text()).toBe('Slotted Title')
    expect(wrapper.find('.custom-msg').text()).toBe('Slotted Message')
  })
})

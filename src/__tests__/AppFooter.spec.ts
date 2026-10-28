import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppFooter from '@/components/layout/AppFooter.vue'

describe('AppFooter Component', () => {
  it('renders the centered footer with copyright and Cambodia branding', () => {
    const wrapper = mount(AppFooter)
    const text = wrapper.text()

    expect(text).toContain('© 2019 - 2026 - BRONX Technology Co., Ltd. 3.0.0')
    expect(text).toContain('♡')
    expect(text).toContain('Made in Cambodia')

    const footer = wrapper.find('footer')
    expect(footer.classes()).toContain('justify-center')
    expect(footer.classes()).toContain('text-center')
  })

  it('has increased font size fitting with the UI', () => {
    const wrapper = mount(AppFooter)
    const content = wrapper.find('div')
    expect(
      content.classes().some((cls) => cls.includes('text-sm') || cls.includes('text-xs')),
    ).toBe(true)
  })
})

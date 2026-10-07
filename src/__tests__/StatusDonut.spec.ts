import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusDonut from '@/components/dashboard/StatusDonut.vue'

describe('StatusDonut Component', () => {
  it('renders correctly with given ticket counts', () => {
    const wrapper = mount(StatusDonut, {
      props: {
        byStatus: {
          open: 14,
          in_progress: 7,
          resolved: 5,
          closed: 9,
        },
      },
    })

    // Header total check
    expect(wrapper.text()).toContain('35 Total')
    expect(wrapper.text()).toContain('Tickets by Status')

    // Dominant status by default in center disc (14 / 35 = 40.0% Open)
    expect(wrapper.text()).toContain('40.0%')
    expect(wrapper.text()).toContain('Open')

    // Legend percentages check
    expect(wrapper.text()).toContain('40%')
    expect(wrapper.text()).toContain('20%')
    expect(wrapper.text()).toContain('14%')
    expect(wrapper.text()).toContain('26%')
  })

  it('renders track and zero state when total is 0', () => {
    const wrapper = mount(StatusDonut, {
      props: {
        byStatus: {
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
        },
      },
    })

    expect(wrapper.text()).toContain('0 Total')
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain('Tickets')
  })

  it('toggles total display when clicking center button', async () => {
    const wrapper = mount(StatusDonut, {
      props: {
        byStatus: {
          open: 10,
          in_progress: 5,
          resolved: 5,
          closed: 0,
        },
      },
    })

    // Initially dominant status (10 / 20 = 50.0% Open)
    expect(wrapper.text()).toContain('50.0%')
    expect(wrapper.text()).toContain('Open')

    // Click center button to toggle total tickets
    const centerBtn = wrapper.find('button[title*="toggle total"]')
    expect(centerBtn.exists()).toBe(true)
    await centerBtn.trigger('click')

    expect(wrapper.text()).toContain('20')
    expect(wrapper.text()).toContain('Tickets')
  })
})

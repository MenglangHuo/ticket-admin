import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CreateTicketModal from '@/components/tickets/CreateTicketModal.vue'
import { useTicketStore } from '@/stores/ticketStore'

describe('CreateTicketModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not render Client Organization / Origin or Source fields', async () => {
    const ticketStore = useTicketStore()
    ticketStore.isCreateModalOpen = true

    const wrapper = mount(CreateTicketModal, {
      global: {
        stubs: {
          HtmlDescriptionEditor: true,
        },
      },
    })

    const text = wrapper.text()
    expect(text).not.toContain('Client Organization / Origin')
    expect(text).not.toContain('Source')
  })

  it('renders Description & Details section with HtmlDescriptionEditor supporting HTML', async () => {
    const ticketStore = useTicketStore()
    ticketStore.isCreateModalOpen = true

    const wrapper = mount(CreateTicketModal, {
      global: {
        stubs: {
          HtmlDescriptionEditor: true,
        },
      },
    })

    // Label should be "Description & Details"
    expect(wrapper.text()).toContain('Description & Details')
    expect(wrapper.text()).toContain('Rich text enabled')

    // HtmlDescriptionEditor should be mounted
    const editor = wrapper.findComponent({ name: 'HtmlDescriptionEditor' })
    expect(editor.exists()).toBe(true)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CreateTicketModal from '@/components/tickets/CreateTicketModal.vue'
import { useTicketStore } from '@/stores/ticketStore'
import { useAuthStore } from '@/stores/authStore'

describe('CreateTicketModal', () => {
  beforeEach(() => {
    localStorage.clear()
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

  it('extracts reporter_user_id in background from localStorage bronx_user and sends it on submit', async () => {
    localStorage.setItem(
      'bronx_user',
      JSON.stringify({
        id: 777,
        username: 'admin_user',
        first_name: 'Admin',
        last_name: 'Super',
        role: 'HQ ADMIN',
      }),
    )

    const ticketStore = useTicketStore()
    const authStore = useAuthStore()
    authStore.user = {
      id: 777,
      role: 'HQ ADMIN',
    } as any

    ticketStore.isCreateModalOpen = true
    const createSpy = vi.spyOn(ticketStore, 'createTicketFast').mockResolvedValue(true)

    const wrapper = mount(CreateTicketModal, {
      global: {
        stubs: {
          HtmlDescriptionEditor: true,
          CustomSelect: true,
        },
      },
    })

    // Fill in required ticket title
    const titleInput = wrapper.find('input[placeholder*="Payment gateway"]')
    await titleInput.setValue('Bug report from admin')

    // Submit the form
    await wrapper.find('form').trigger('submit.prevent')

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bug report from admin',
        reporter_user_id: 777,
      }),
    )

    // Hidden input exists and contains user id
    const hiddenInput = wrapper.find('input[type="hidden"][name="reporter_user_id"]')
    expect(hiddenInput.exists()).toBe(true)
    expect(hiddenInput.attributes('value')).toBe('777')
  })

  it('does not display any visible input field for reporter_user_id', async () => {
    const ticketStore = useTicketStore()
    ticketStore.isCreateModalOpen = true

    const wrapper = mount(CreateTicketModal, {
      global: {
        stubs: {
          HtmlDescriptionEditor: true,
          CustomSelect: true,
        },
      },
    })

    // The text in the modal should not show "Reporter User ID"
    expect(wrapper.text()).not.toContain('Reporter User ID')
    expect(wrapper.text()).not.toContain('reporter_user_id')

    // Only visible inputs are title, name, email, phone
    const visibleInputs = wrapper.findAll('input:not([type="hidden"]):not([type="file"])')
    const placeholders = visibleInputs.map((i) => i.attributes('placeholder') || '')
    expect(placeholders.some((p) => p.includes('User ID') || p.includes('reporter_user_id'))).toBe(false)
  })
})


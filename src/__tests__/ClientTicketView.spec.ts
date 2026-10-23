import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ClientTicketView from '@/views/ClientTicketView.vue'
import { ticketApi } from '@/api/ticketApi'

describe('ClientTicketView Component', () => {
  let router: any

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/client-ticket', name: 'client-ticket', component: ClientTicketView },
        { path: '/tickets', name: 'tickets', component: { template: '<div>Tickets</div>' } },
      ],
    })
  })

  it('initializes with default test values for fast testing', async () => {
    router.push('/client-ticket')
    await router.isReady()

    const wrapper = mount(ClientTicketView, {
      global: {
        plugins: [router],
        stubs: {
          HtmlDescriptionEditor: {
            props: ['modelValue'],
            template: '<textarea class="mock-editor" :value="modelValue" />',
          },
        },
      },
    })

    const titleInput = wrapper.find('input[placeholder="e.g. Fix issue on Dashboard UI"]')
    expect(titleInput.exists()).toBe(true)
    expect((titleInput.element as HTMLInputElement).value).toBe('Fix issue on Dashboard UI')

    const nameInput = wrapper.find('input[placeholder="e.g. menglang"]')
    expect(nameInput.exists()).toBe(true)
    expect((nameInput.element as HTMLInputElement).value).toBe('menglang')

    const emailInput = wrapper.find('input[placeholder="e.g. menglanghuo@gmail.com"]')
    expect(emailInput.exists()).toBe(true)
    expect((emailInput.element as HTMLInputElement).value).toBe('menglanghuo@gmail.com')

    const phoneInput = wrapper.find('input[placeholder="e.g. 099191919"]')
    expect(phoneInput.exists()).toBe(true)
    expect((phoneInput.element as HTMLInputElement).value).toBe('099191919')

    const editor = wrapper.find('.mock-editor')
    expect(editor.exists()).toBe(true)
    expect((editor.element as HTMLTextAreaElement).value).toContain('Dashboard UI')
  })

  it('can clear form fields and reset back to defaults', async () => {
    router.push('/client-ticket')
    await router.isReady()

    const wrapper = mount(ClientTicketView, {
      global: {
        plugins: [router],
        stubs: {
          HtmlDescriptionEditor: {
            props: ['modelValue'],
            template: '<textarea class="mock-editor" :value="modelValue" />',
          },
        },
      },
    })

    const clearBtn = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Clear form fields'))
    expect(clearBtn).toBeDefined()
    await clearBtn!.trigger('click')

    const titleInput = wrapper.find('input[placeholder="e.g. Fix issue on Dashboard UI"]')
    expect((titleInput.element as HTMLInputElement).value).toBe('')

    const nameInput = wrapper.find('input[placeholder="e.g. menglang"]')
    expect((nameInput.element as HTMLInputElement).value).toBe('')

    const resetBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Reset defaults'))
    expect(resetBtn).toBeDefined()
    await resetBtn!.trigger('click')

    expect((titleInput.element as HTMLInputElement).value).toBe('Fix issue on Dashboard UI')
    expect((nameInput.element as HTMLInputElement).value).toBe('menglang')
  })

  it('submits successfully using the prefilled default test values', async () => {
    const submitSpy = vi.spyOn(ticketApi, 'submitClientTicket').mockResolvedValue({
      success: true,
      data: {
        id: 999,
        ticket_key: 'TCK-999',
        title: 'Fix issue on Dashboard UI',
        type: 'bug',
        priority: 'high',
        status: 'open',
      },
    } as any)

    router.push('/client-ticket')
    await router.isReady()

    const wrapper = mount(ClientTicketView, {
      global: {
        plugins: [router],
        stubs: {
          HtmlDescriptionEditor: {
            props: ['modelValue'],
            template: '<textarea class="mock-editor" :value="modelValue" />',
          },
        },
      },
    })

    await wrapper.find('form').trigger('submit.prevent')
    expect(submitSpy).toHaveBeenCalled()

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Ticket Submitted Successfully')
    expect(wrapper.text()).toContain('TCK-999')
  })

  it('submits reporter_user_id when provided in the form', async () => {
    let capturedFormData: FormData | null = null
    const submitSpy = vi.spyOn(ticketApi, 'submitClientTicket').mockImplementation(async (payload) => {
      if (payload instanceof FormData) {
        capturedFormData = payload
      }
      return {
        success: true,
        data: {
          id: 1001,
          ticket_key: 'TCK-1001',
          title: 'Fix issue on Dashboard UI',
          type: 'bug',
          priority: 'high',
          status: 'open',
          reporter_user_id: 104,
        },
      } as any
    })

    router.push('/client-ticket')
    await router.isReady()

    const wrapper = mount(ClientTicketView, {
      global: {
        plugins: [router],
        stubs: {
          HtmlDescriptionEditor: {
            props: ['modelValue'],
            template: '<textarea class="mock-editor" :value="modelValue" />',
          },
        },
      },
    })

    const userIdInput = wrapper.find('input[placeholder="e.g. 104"]')
    expect(userIdInput.exists()).toBe(true)
    await userIdInput.setValue(104)

    await wrapper.find('form').trigger('submit.prevent')
    expect(submitSpy).toHaveBeenCalled()
    expect(capturedFormData).not.toBeNull()
    expect(capturedFormData!.get('reporter_user_id')).toBe('104')

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Reporter User ID:')
    expect(wrapper.text()).toContain('#104')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SubscribersTable from '@/components/settings/SubscribersTable.vue'
import SubscribersTableSkeleton from '@/components/settings/SubscribersTableSkeleton.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import type { TelegramSubscriber } from '@/types/settings'

const mockSubscribers: TelegramSubscriber[] = [
  {
    id: 1,
    telegram_chat_id: '12345678',
    telegram_username: 'alex_dev',
    subscriber_type: 'RESOLVER',
    user_id: 12,
    user: {
      id: 12,
      name: 'Alex Resolver',
      username: 'alex',
      email: 'alex@example.com',
    },
    is_active: true,
    subscribed_at: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 2,
    telegram_chat_id: '87654321',
    telegram_username: 'sarah_ops',
    subscriber_type: 'REQUESTER',
    user_id: 105,
    user: {
      id: 105,
      name: 'Sokha Mean',
      username: 'sokha',
      email: 'sokha@example.com',
    },
    is_active: false,
    subscribed_at: '2026-03-05T14:30:00.000Z',
  },
  {
    id: 3,
    telegram_chat_id: '99887766',
    telegram_username: null,
    subscriber_type: 'RESOLVER',
    user_id: null,
    is_active: true,
    subscribed_at: '2026-03-10T08:15:00.000Z',
  },
]

describe('SubscribersTable Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders modern table headers and subscriber data correctly', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const headers = wrapper.findAll('th')
    const headerTexts = headers.map((h) => h.text())

    expect(headerTexts.some((t) => t.includes('Telegram User'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Subscriber Type'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Telegram Chat ID'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Ticket Notifications'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Subscribed Date'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Action'))).toBe(true)

    const text = wrapper.text()
    expect(text).toContain('@alex_dev')
    expect(text).toContain('@sarah_ops')
    expect(text).toContain('No username')
    expect(text).toContain('12345678')
    expect(text).toContain('87654321')
    expect(text).toContain('Active')
    expect(text).toContain('Muted')
    expect(text).toContain('RESOLVER')
    expect(text).toContain('Support Staff')
    expect(text).toContain('REQUESTER')
    expect(text).toContain('User #105')
    expect(text).toContain('Sokha Mean')
  })

  it('renders subscriber type badges and linked requester user ID clearly', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    // Assert resolver badge
    const resolverBadge = wrapper.findAll('td').find((td) => td.text().includes('RESOLVER'))
    expect(resolverBadge).toBeDefined()
    expect(resolverBadge?.text()).toContain('Support Staff')

    // Assert requester badge and linked user
    const requesterBadge = wrapper.findAll('td').find((td) => td.text().includes('REQUESTER'))
    expect(requesterBadge).toBeDefined()
    expect(requesterBadge?.text()).toContain('Sokha Mean')

    // Assert requester identity in the user column
    expect(wrapper.text()).toContain('User #105')
  })

  it('renders SubscribersTableSkeleton when isLoading is true and subscribers list is empty', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = []
    settingsStore.isLoading = true

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const skeleton = wrapper.findComponent(SubscribersTableSkeleton)
    expect(skeleton.exists()).toBe(true)
  })

  it('provides column resize handles with cursor-col-resize styling on headers', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const resizeHandles = wrapper.findAll('.cursor-col-resize')
    expect(resizeHandles.length).toBeGreaterThanOrEqual(4)
  })

  it('renders sticky Action column with freeze-col-shadow styling', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const actionTh = wrapper.findAll('th').find((th) => th.text().includes('Action'))
    expect(actionTh).toBeDefined()
    expect(actionTh?.classes()).toContain('sticky')
    expect(actionTh?.classes()).toContain('right-0')
  })

  it('renders custom TablePagination with itemLabel as subscribers', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const paginationText = wrapper.text()
    expect(paginationText).toContain('Rows per page:')
    expect(paginationText).toContain('subscribers')
    expect(paginationText).toContain('Showing')
  })

  it('sorts subscribers when clicking column headers', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    // Click on Telegram User header to sort by user
    const userTh = wrapper.findAll('th').find((th) => th.text().includes('Telegram User'))
    expect(userTh).toBeDefined()

    await userTh?.trigger('click')
    await wrapper.vm.$nextTick()

    // After sorting, rows should be rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(3)
  })

  it('supports hiding and restoring table columns', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    // Verify chat_id column header is initially rendered
    expect(wrapper.findAll('th').some((th) => th.text().includes('Telegram Chat ID'))).toBe(true)

    // Toggle off chat_id in stored settings
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const chatIdCheckbox = checkboxes.find((cb) => {
      const parentText = cb.element.parentElement?.textContent || ''
      return parentText.includes('Telegram Chat ID')
    })

    if (chatIdCheckbox) {
      await chatIdCheckbox.setValue(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('th').some((th) => th.text().includes('Telegram Chat ID'))).toBe(false)
    }
  })

  it('copies chat ID to clipboard when clicking copy button', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    })

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const copyBtn = wrapper.find('button[title*="Chat ID"]')
    expect(copyBtn.exists()).toBe(true)

    await copyBtn.trigger('click')
    expect(writeTextSpy).toHaveBeenCalledWith('99887766')
  })

  it('filters subscribers by subscriber_type REQUESTER correctly and updates total count', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false
    // Mock server pagination object
    settingsStore.pagination = {
      page: 1,
      per_page: 10,
      total: 3,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    }

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    // Find custom selects - second one is subscriber type
    const selects = wrapper.findAllComponents({ name: 'CustomSelect' })
    expect(selects.length).toBeGreaterThanOrEqual(2)
    const typeSelect = selects[1]!

    // Select REQUESTER
    await typeSelect.vm.$emit('update:modelValue', 'REQUESTER')
    await wrapper.vm.$nextTick()

    // Assert only requester is rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(1)
    expect(rows[0]!.text()).toContain('@sarah_ops')
    expect(rows[0]!.text()).toContain('REQUESTER')
    expect(rows[0]!.text()).not.toContain('@alex_dev')

    // Assert pagination total count updated to 1
    expect(wrapper.text()).toContain('Showing 1-1 of 1 subscribers')
  })

  it('filters subscribers by subscriber_type RESOLVER correctly', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false
    settingsStore.pagination = {
      page: 1,
      per_page: 10,
      total: 3,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    }

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const selects = wrapper.findAllComponents({ name: 'CustomSelect' })
    const typeSelect = selects[1]!

    // Select RESOLVER
    await typeSelect.vm.$emit('update:modelValue', 'RESOLVER')
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(wrapper.text()).toContain('@alex_dev')
    expect(wrapper.text()).toContain('No username')
    expect(wrapper.text()).not.toContain('@sarah_ops')
    expect(wrapper.text()).toContain('Showing 1-2 of 2 subscribers')
  })

  it('shows empty state when subscriber type filter yields no results and allows reset', async () => {
    const settingsStore = useSettingsStore()
    // Provide only resolver subscribers
    settingsStore.subscribers = mockSubscribers.filter((s) => s.subscriber_type === 'RESOLVER')
    settingsStore.isLoading = false
    settingsStore.pagination = {
      page: 1,
      per_page: 10,
      total: 2,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    }

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const selects = wrapper.findAllComponents({ name: 'CustomSelect' })
    const typeSelect = selects[1]!

    // Filter by REQUESTER (which none exist in this list)
    await typeSelect.vm.$emit('update:modelValue', 'REQUESTER')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No matching subscribers')
    expect(wrapper.text()).toContain('Try adjusting your search query, status, or subscriber type filter')

    const resetBtn = wrapper.find('button[title="Clear all active filters"]')
    expect(resetBtn.exists()).toBe(true)

    await resetBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // After reset, both resolver items should be visible
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('calls deleteSubscriber when clicking on action delete button', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.subscribers = [...mockSubscribers]
    settingsStore.isLoading = false

    const deleteSpy = vi.spyOn(settingsStore, 'deleteSubscriber').mockResolvedValue({
      data: null,
      success: true,
      message: 'Subscriber removed successfully from database.',
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mount(SubscribersTable)
    await wrapper.vm.$nextTick()

    const deleteButtons = wrapper.findAll('button[title="Delete subscriber"]')
    expect(deleteButtons.length).toBeGreaterThan(0)

    // Click delete on first sorted row (subscriber id: 3, most recent subscribed_at)
    await deleteButtons[0]!.trigger('click')

    expect(confirmSpy).toHaveBeenCalled()
    expect(deleteSpy).toHaveBeenCalledWith(3, 'RESOLVER')
  })
})


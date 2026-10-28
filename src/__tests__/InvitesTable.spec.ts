import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import InvitesTable from '@/components/settings/InvitesTable.vue'
import InvitesTableSkeleton from '@/components/settings/InvitesTableSkeleton.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import type { TelegramUnusedInvite } from '@/types/settings'

const mockInvites: TelegramUnusedInvite[] = [
  {
    id: 4,
    company_id: 1,
    token: 'Px8AtcqA5hG87oYcPDhPypmo05jGoYvo',
    invite_url: 'https://t.me/MenglangKara_bot?start=Px8AtcqA5hG87oYcPDhPypmo05jGoYvo',
    deeplink: 'https://t.me/MenglangKara_bot?start=Px8AtcqA5hG87oYcPDhPypmo05jGoYvo',
    is_used: false,
    expires_at: '2026-10-28 17:10:20',
    created_by: 367,
    created_at: '2026-10-21 17:10:20',
  },
  {
    id: 3,
    company_id: 1,
    token: 'Zk9BvdqB6iH98pZdQEiQzqnp16kHpZwp',
    invite_url: 'https://t.me/MenglangKara_bot?start=Zk9BvdqB6iH98pZdQEiQzqnp16kHpZwp',
    deeplink: 'https://t.me/MenglangKara_bot?start=Zk9BvdqB6iH98pZdQEiQzqnp16kHpZwp',
    is_used: false,
    expires_at: '2026-10-29 14:30:00',
    created_by: 367,
    created_at: '2026-10-22 14:30:00',
  },
  {
    id: 1,
    company_id: 1,
    token: 'Bn2DxfsD8kK10rBfSGkSbsps38mJrByr',
    invite_url: 'https://t.me/MenglangKara_bot?start=Bn2DxfsD8kK10rBfSGkSbsps38mJrByr',
    deeplink: 'https://t.me/MenglangKara_bot?start=Bn2DxfsD8kK10rBfSGkSbsps38mJrByr',
    is_used: false,
    expires_at: '2026-10-20 11:00:00',
    created_by: 102,
    created_at: '2026-10-13 11:00:00',
  },
]

describe('InvitesTable Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders modern table headers and invite data correctly', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const headers = wrapper.findAll('th')
    const headerTexts = headers.map((h) => h.text())

    expect(headerTexts.some((t) => t.includes('Invite Link / URL'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Invite Token'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Status'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Expires At'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Created Date'))).toBe(true)
    expect(headerTexts.some((t) => t.includes('Action'))).toBe(true)

    const text = wrapper.text()
    expect(text).toContain('Px8AtcqA5hG87oYcPDhPypmo05jGoYvo')
    expect(text).toContain('Zk9BvdqB6iH98pZdQEiQzqnp16kHpZwp')
    expect(text).toContain('https://t.me/MenglangKara_bot?start=Px8AtcqA5hG87oYcPDhPypmo05jGoYvo')
    expect(text).toContain('User #367')
    expect(text).toContain('Invite ID #4')
  })

  it('renders InvitesTableSkeleton when isInvitesLoading is true and list is empty', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = []
    settingsStore.isInvitesLoading = true

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const skeleton = wrapper.findComponent(InvitesTableSkeleton)
    expect(skeleton.exists()).toBe(true)
  })

  it('provides column resize handles with cursor-col-resize styling on headers', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const resizeHandles = wrapper.findAll('.cursor-col-resize')
    expect(resizeHandles.length).toBeGreaterThanOrEqual(4)
  })

  it('copies token to clipboard when clicking token badge', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    })

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const copyBtn = wrapper.find('button[title*="copy token"]')
    expect(copyBtn.exists()).toBe(true)

    await copyBtn.trigger('click')
    expect(writeTextSpy).toHaveBeenCalled()
  })

  it('renders custom TablePagination with itemLabel as invite links', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    expect(text).toContain('Rows per page:')
    expect(text).toContain('invite links')
  })

  it('opens QR Code modal when clicking QR button on a row', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const qrBtn = wrapper.find('button[title="View QR Code"]')
    expect(qrBtn.exists()).toBe(true)

    await qrBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Telegram Bot Invite QR')
    expect(wrapper.find('img[alt="Telegram Bot Invite QR Code"]').exists()).toBe(true)
  })

  it('opens Generate Link modal when clicking primary generate button', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const generateBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Generate Link'))
    expect(generateBtn?.exists()).toBe(true)

    await generateBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Generate Telegram Bot Invite Link')
  })

  it('renders Refresh button for expired invite link and calls refreshInvite on click', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const refreshSpy = vi.spyOn(settingsStore, 'refreshInvite').mockResolvedValue({
      id: 1,
      company_id: 1,
      token: 'Refreshed_tok_999',
      invite_url: 'https://t.me/MenglangKara_bot?start=Refreshed_tok_999',
      deeplink: 'https://t.me/MenglangKara_bot?start=Refreshed_tok_999',
      is_used: false,
      expires_at: '2026-11-05 11:00:00',
      created_by: 102,
      created_at: '2026-10-13 11:00:00',
    })

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const refreshBtns = wrapper.findAll('button[title*="Refresh expired invite link"]')
    expect(refreshBtns.length).toBeGreaterThanOrEqual(1)

    await refreshBtns[0]!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(refreshSpy).toHaveBeenCalledWith(1)
  })

  it('renders Refresh invite link button in the Action column only when that link is expired', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.unusedInvites = [...mockInvites]
    settingsStore.isInvitesLoading = false

    const wrapper = mount(InvitesTable)
    await wrapper.vm.$nextTick()

    const actionRefreshBtns = wrapper.findAll('button[data-test="refresh-invite-btn"]')
    // Only the expired invite (id: 1) shows the refresh button in the action column
    expect(actionRefreshBtns).toHaveLength(1)
  })
})

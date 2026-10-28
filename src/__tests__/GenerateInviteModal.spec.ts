import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import GenerateInviteModal from '@/components/settings/GenerateInviteModal.vue'
import { useSettingsStore } from '@/stores/settingsStore'

describe('GenerateInviteModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders nothing when isOpen is false', () => {
    const wrapper = mount(GenerateInviteModal, {
      props: {
        isOpen: false,
      },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders initial explainer and generate button when isOpen is true', () => {
    const store = useSettingsStore()
    store.botConfig.botUsername = 'testBot'

    const wrapper = mount(GenerateInviteModal, {
      props: {
        isOpen: true,
      },
    })

    expect(wrapper.text()).toContain('Generate Telegram Bot Invite Link')
    expect(wrapper.text()).toContain('How Telegram Subscription Works')
    expect(wrapper.text()).toContain('@testBot')

    const generateBtn = wrapper.findAll('button').find((b) => b.text().includes('Generate Link'))
    expect(generateBtn).toBeDefined()
  })

  it('generates link and displays enhanced result UI with action buttons', async () => {
    const store = useSettingsStore()
    const mockUrl = 'https://t.me/testBot?start=secretToken123'
    vi.spyOn(store, 'generateInviteLink').mockResolvedValueOnce(mockUrl)

    const wrapper = mount(GenerateInviteModal, {
      props: {
        isOpen: true,
      },
    })

    const generateBtn = wrapper.findAll('button').find((b) => b.text().includes('Generate Link'))
    await generateBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Subscription Link Ready!')
    expect((wrapper.find('input[readonly]').element as HTMLInputElement).value).toBe(mockUrl)

    // Open in Telegram link exists
    const openLink = wrapper.find('a[target="_blank"]')
    expect(openLink.exists()).toBe(true)
    expect(openLink.attributes('href')).toBe(mockUrl)
    expect(openLink.text()).toContain('Open in Telegram')

    // QR Code toggle button exists
    const qrToggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Show Mobile QR Code'))
    expect(qrToggleBtn).toBeDefined()
  })

  it('toggles QR code display and renders dedicated QR code card with download button', async () => {
    const store = useSettingsStore()
    const mockUrl = 'https://t.me/testBot?start=secretToken123'
    vi.spyOn(store, 'generateInviteLink').mockResolvedValueOnce(mockUrl)

    const wrapper = mount(GenerateInviteModal, {
      props: {
        isOpen: true,
      },
    })

    // Generate link first
    const generateBtn = wrapper.findAll('button').find((b) => b.text().includes('Generate Link'))
    await generateBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Initially QR code is not shown
    expect(wrapper.find('img[alt="Telegram Bot QR Code"]').exists()).toBe(false)

    // Toggle QR code open
    const qrToggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Show Mobile QR Code'))
    await qrToggleBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // QR Code is now visible
    expect(wrapper.text()).toContain('Hide QR Code')
    expect(wrapper.text()).toContain('Mobile QR Code Onboarding')

    const qrImg = wrapper.find('img[alt="Telegram Bot QR Code"]')
    expect(qrImg.exists()).toBe(true)
    expect(qrImg.attributes('src')).toContain(encodeURIComponent(mockUrl))

    // Download QR button exists
    const downloadBtn = wrapper.findAll('button').find((b) => b.text().includes('Download QR Image'))
    expect(downloadBtn).toBeDefined()

    // Toggle QR code closed
    await qrToggleBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('img[alt="Telegram Bot QR Code"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Show Mobile QR Code')
  })

  it('copies generated link to clipboard on Copy button click', async () => {
    const store = useSettingsStore()
    const mockUrl = 'https://t.me/testBot?start=token456'
    vi.spyOn(store, 'generateInviteLink').mockResolvedValueOnce(mockUrl)

    const wrapper = mount(GenerateInviteModal, {
      props: {
        isOpen: true,
      },
    })

    const generateBtn = wrapper.findAll('button').find((b) => b.text().includes('Generate Link'))
    await generateBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const copyBtn = wrapper.findAll('button').find((b) => b.text().includes('Copy'))
    expect(copyBtn).toBeDefined()
    await copyBtn!.trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockUrl)
  })

  it('resets state when Generate Another is clicked', async () => {
    const store = useSettingsStore()
    vi.spyOn(store, 'generateInviteLink').mockResolvedValueOnce('https://t.me/testBot?start=abc')

    const wrapper = mount(GenerateInviteModal, {
      props: {
        isOpen: true,
      },
    })

    // Generate link
    await wrapper.findAll('button').find((b) => b.text().includes('Generate Link'))!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Subscription Link Ready!')

    // Click Generate Another
    const anotherBtn = wrapper.findAll('button').find((b) => b.text().includes('Generate Another'))
    await anotherBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Back to initial state
    expect(wrapper.text()).toContain('How Telegram Subscription Works')
  })

  it('emits close when Done or Close button is clicked', async () => {
    const store = useSettingsStore()
    vi.spyOn(store, 'generateInviteLink').mockResolvedValueOnce('https://t.me/testBot?start=xyz')

    const wrapper = mount(GenerateInviteModal, {
      props: {
        isOpen: true,
      },
    })

    // Generate
    await wrapper.findAll('button').find((b) => b.text().includes('Generate Link'))!.trigger('click')
    await wrapper.vm.$nextTick()

    // Click Done
    const doneBtn = wrapper.findAll('button').find((b) => b.text().includes('Done'))
    await doneBtn!.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

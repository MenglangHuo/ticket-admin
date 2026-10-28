import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TelegramBotConfigForm from '@/components/settings/TelegramBotConfigForm.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import type { TelegramBotInfo } from '@/types/settings'

const mockBotInfo: TelegramBotInfo = {
  id: 1,
  company_id: 1,
  bot_token: '5453551747:AAHwNAd3BjrbqE5gLrK9kbAPQOp22Zmcfs4',
  bot_token_masked: '54535517...cfs4',
  bot_username: 'menglang6969Bot',
  chat_id: '',
  webhook_secret: 'BronxTelegramSecret2026Key99',
  invite_expiry_days: 7,
  is_active: true,
  is_configured: true,
  source: 'database',
  telegram_object: null,
  created_at: '2026-10-21T03:49:31.000000Z',
  updated_at: '2026-10-21T03:51:43.000000Z',
}

describe('TelegramBotConfigForm.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders form populated with store botInfo data with only botusername and botapitoken', async () => {
    const store = useSettingsStore()
    store.botInfo = { ...mockBotInfo }

    const wrapper = mount(TelegramBotConfigForm)

    // Field 1: bot_username exists
    const usernameInput = wrapper.find('input[placeholder="menglang6969Bot"]')
    expect(usernameInput.exists()).toBe(true)
    expect((usernameInput.element as HTMLInputElement).value).toBe('menglang6969Bot')

    // Field 2: bot_token exists
    const tokenInput = wrapper.find(
      'input[placeholder="5453551747:AAHwNAd3BjrbqE5gLrK9kbAPQOp22Zmcfs4"]',
    )
    expect(tokenInput.exists()).toBe(true)

    // Fields that should NOT be in the UI:
    // invite_expiry_days input
    const expiryInput = wrapper.find('input[placeholder="7"]')
    expect(expiryInput.exists()).toBe(false)

    // chat_id and webhook_secret fields
    const chatIdInput = wrapper.find('input[placeholder=""]')
    expect(chatIdInput.exists()).toBe(false)
    const secretInput = wrapper.find('input[placeholder="BronxTelegramSecret2026Key99"]')
    expect(secretInput.exists()).toBe(false)

    const maskedBadge = wrapper.text()
    expect(maskedBadge).toContain('Current: 54535517...cfs4')
    expect(maskedBadge).toContain('Bot Active')
    expect(maskedBadge).toContain('Configured')
  })

  it('tracks dirty state when user edits form values', async () => {
    const store = useSettingsStore()
    store.botInfo = { ...mockBotInfo }

    const wrapper = mount(TelegramBotConfigForm)

    // Initially not dirty
    expect(wrapper.text()).toContain('Configuration synced with server')
    const saveButton = wrapper.find('button[type="submit"]')
    expect(saveButton.attributes('disabled')).toBeDefined()

    // Edit username
    const usernameInput = wrapper.find('input[placeholder="menglang6969Bot"]')
    await usernameInput.setValue('newAlertBot')

    // Now dirty
    expect(wrapper.text()).toContain('Unsaved Changes')
    expect(saveButton.attributes('disabled')).toBeUndefined()
  })

  it('discards changes when Discard Changes button is clicked', async () => {
    const store = useSettingsStore()
    store.botInfo = { ...mockBotInfo }

    const wrapper = mount(TelegramBotConfigForm)

    const usernameInput = wrapper.find('input[placeholder="menglang6969Bot"]')
    await usernameInput.setValue('temporaryBotName')
    expect((usernameInput.element as HTMLInputElement).value).toBe('temporaryBotName')

    // Find Discard Changes button
    const discardBtn = wrapper.findAll('button').find((b) => b.text().includes('Discard Changes'))
    expect(discardBtn).toBeDefined()
    await discardBtn!.trigger('click')

    // Reverted
    expect((usernameInput.element as HTMLInputElement).value).toBe('menglang6969Bot')
    expect(wrapper.text()).toContain('Configuration synced with server')
  })

  it('submits updateBotConfig directly when only bot_token is changed without changing username', async () => {
    const store = useSettingsStore()
    store.botInfo = { ...mockBotInfo }

    const updateSpy = vi.spyOn(store, 'updateBotConfig').mockResolvedValueOnce({
      ...mockBotInfo,
      bot_token: 'newToken123',
    })

    const wrapper = mount(TelegramBotConfigForm)

    const tokenInput = wrapper.find(
      'input[placeholder="5453551747:AAHwNAd3BjrbqE5gLrK9kbAPQOp22Zmcfs4"]',
    )
    await tokenInput.setValue('newToken123')

    const formEl = wrapper.find('form')
    await formEl.trigger('submit.prevent')

    expect(updateSpy).toHaveBeenCalledWith({
      bot_token: 'newToken123',
      bot_username: 'menglang6969Bot',
      is_active: true,
    })

    expect(wrapper.find('[data-testid="confirm-username-input"]').exists()).toBe(false)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('pops up confirmation modal when updating bot username and requires typing confirm to save', async () => {
    const store = useSettingsStore()
    store.botInfo = { ...mockBotInfo }

    const updateSpy = vi.spyOn(store, 'updateBotConfig').mockResolvedValueOnce({
      ...mockBotInfo,
      bot_username: 'updated69Bot',
    })

    const wrapper = mount(TelegramBotConfigForm)

    const usernameInput = wrapper.find('input[placeholder="menglang6969Bot"]')
    await usernameInput.setValue('updated69Bot')

    // Submit form triggers modal
    const formEl = wrapper.find('form')
    await formEl.trigger('submit.prevent')

    // Modal is now open
    expect(wrapper.text()).toContain('Update Telegram Bot Username')
    expect(wrapper.text()).toContain('all current subscribers will be lost or deleted')

    const confirmInput = wrapper.find('[data-testid="confirm-username-input"]')
    expect(confirmInput.exists()).toBe(true)

    const confirmBtn = wrapper.find('[data-testid="confirm-update-button"]')
    expect(confirmBtn.exists()).toBe(true)
    // Initially disabled
    expect(confirmBtn.attributes('disabled')).toBeDefined()
    expect(updateSpy).not.toHaveBeenCalled()

    // Enter wrong text
    await confirmInput.setValue('cancel')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
    expect(updateSpy).not.toHaveBeenCalled()

    // Enter 'confirm'
    await confirmInput.setValue('confirm')
    expect(confirmBtn.attributes('disabled')).toBeUndefined()

    // Click confirm button to proceed with update
    await confirmBtn.trigger('click')

    expect(updateSpy).toHaveBeenCalledWith({
      bot_token: '5453551747:AAHwNAd3BjrbqE5gLrK9kbAPQOp22Zmcfs4',
      bot_username: 'updated69Bot',
      is_active: true,
    })

    // Modal is closed after save
    expect(wrapper.find('[data-testid="confirm-username-input"]').exists()).toBe(false)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('cancels username update when Cancel button is clicked in modal', async () => {
    const store = useSettingsStore()
    store.botInfo = { ...mockBotInfo }

    const updateSpy = vi.spyOn(store, 'updateBotConfig')

    const wrapper = mount(TelegramBotConfigForm)

    const usernameInput = wrapper.find('input[placeholder="menglang6969Bot"]')
    await usernameInput.setValue('anotherTestBot')

    // Trigger save
    const formEl = wrapper.find('form')
    await formEl.trigger('submit.prevent')

    // Modal is open
    expect(wrapper.find('[data-testid="confirm-username-input"]').exists()).toBe(true)

    // Click Cancel
    const cancelBtn = wrapper.find('[data-testid="cancel-confirm-button"]')
    expect(cancelBtn.exists()).toBe(true)
    await cancelBtn.trigger('click')

    // Modal is closed and no update called
    expect(wrapper.find('[data-testid="confirm-username-input"]').exists()).toBe(false)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('toggles password visibility for bot token', async () => {
    const store = useSettingsStore()
    store.botInfo = { ...mockBotInfo }

    const wrapper = mount(TelegramBotConfigForm)

    const tokenInput = wrapper.find(
      'input[placeholder="5453551747:AAHwNAd3BjrbqE5gLrK9kbAPQOp22Zmcfs4"]',
    )
    expect(tokenInput.attributes('type')).toBe('password')

    const showTokenBtn = wrapper.find('button[title="Show token"]')
    expect(showTokenBtn.exists()).toBe(true)
    await showTokenBtn.trigger('click')

    expect(tokenInput.attributes('type')).toBe('text')
  })
})

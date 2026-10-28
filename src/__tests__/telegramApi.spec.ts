import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { telegramApi } from '@/api/telegramApi'
import { useSettingsStore } from '@/stores/settingsStore'
import apiClient from '@/api/client'

describe('telegramApi invite link parsing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('correctly extracts flat invite_url from backend response format', async () => {
    const fakeUrl = 'https://t.me/menglang6969Bot?start=randomToken12345'
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        invite_url: fakeUrl,
        success: true,
        message: 'Invite link generated.',
      },
    })

    const result = await telegramApi.generateInviteLink()
    expect(result).toBe(fakeUrl)
  })

  it('correctly extracts nested data.invite_url from envelope format', async () => {
    const fakeUrl = 'https://t.me/menglang6969Bot?start=nestedToken67890'
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        data: {
          invite_url: fakeUrl,
        },
        success: true,
      },
    })

    const result = await telegramApi.generateInviteLink()
    expect(result).toBe(fakeUrl)
  })

  it('returns empty string if neither flat nor nested url is present', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: false,
      },
    })

    const result = await telegramApi.generateInviteLink()
    expect(result).toBe('')
  })
})

describe('telegramApi count metrics parsing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('correctly extracts total invite count from flat and nested responses', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        total: 42,
        success: true,
      },
    })

    const count1 = await telegramApi.getTotalInviteCount()
    expect(count1).toBe(42)

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: {
          total: 15,
        },
        success: true,
      },
    })

    const count2 = await telegramApi.getTotalInviteCount()
    expect(count2).toBe(15)
  })

  it('correctly extracts total subscribers count from flat and nested responses', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        total: 88,
        success: true,
      },
    })

    const count1 = await telegramApi.getTotalSubscribersCount()
    expect(count1).toBe(88)

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: {
          count: 23,
        },
        success: true,
      },
    })

    const count2 = await telegramApi.getTotalSubscribersCount()
    expect(count2).toBe(23)
  })

  it('returns 0 when response contains no counts', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
      },
    })

    const count = await telegramApi.getTotalInviteCount()
    expect(count).toBe(0)
  })

  it('correctly extracts consolidated counts in a single call via getCounts', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        totalSubscribers: 50,
        totalTelegramInvites: 12,
        success: true,
      },
    })

    const counts = await telegramApi.getCounts()
    expect(counts.totalSubscribers).toBe(50)
    expect(counts.totalTelegramInvites).toBe(12)

    // Also test with snake_case and nested data envelope
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: {
          total_subscribers: 30,
          total_telegram_invites: 7,
        },
        success: true,
      },
    })

    const counts2 = await telegramApi.getCounts()
    expect(counts2.totalSubscribers).toBe(30)
    expect(counts2.totalTelegramInvites).toBe(7)
  })
})

describe('telegramApi getSubscribers with pagination and search', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('passes search, username, pagination, and sorting parameters to apiClient', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            telegram_chat_id: '123456',
            telegram_username: 'alex_ops',
            is_active: true,
            subscribed_at: '2026-03-01T10:00:00Z',
          },
        ],
        pagination: {
          page: 2,
          per_page: 5,
          total: 15,
          total_pages: 3,
          has_next: true,
          has_previous: true,
        },
        meta: {
          current_page: 2,
          per_page: 5,
          total: 15,
          last_page: 3,
          from: 6,
          to: 10,
        },
        success: true,
      },
    })

    const result = await telegramApi.getSubscribers({
      page: 2,
      per_page: 5,
      search: 'alex',
      status: 'active',
      sort_by: 'telegram_username',
      sort_dir: 'asc',
    })

    expect(getSpy).toHaveBeenCalledWith('/ticket/telegram/subscribers', {
      params: {
        page: 2,
        per_page: 5,
        search: 'alex',
        status: 'active',
        sort_by: 'telegram_username',
        sort_dir: 'asc',
      },
    })

    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.telegram_username).toBe('alex_ops')
    expect(result.pagination.page).toBe(2)
    expect(result.pagination.total).toBe(15)
    expect(result.pagination.total_pages).toBe(3)
    expect(result.pagination.has_next).toBe(true)
    expect(result.pagination.has_previous).toBe(true)
  })

  it('handles backwards-compatible flat array responses gracefully', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: [
        {
          id: 1,
          telegram_chat_id: '999999',
          telegram_username: 'legacy_user',
          is_active: true,
          subscribed_at: '2026-03-01T10:00:00Z',
        },
      ],
    })

    const result = await telegramApi.getSubscribers()
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.telegram_username).toBe('legacy_user')
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.page).toBe(1)
  })
})

describe('settingsStore endpoint decoupling tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('fetchMetrics calls telegramApi.getCounts', async () => {
    const countsSpy = vi.spyOn(telegramApi, 'getCounts').mockResolvedValue({
      totalSubscribers: 10,
      totalTelegramInvites: 5,
      activeSubscribers: 8,
    })

    const store = useSettingsStore()
    await store.fetchMetrics()

    expect(countsSpy).toHaveBeenCalledTimes(1)
    expect(store.totalSubscribersCount).toBe(10)
    expect(store.totalInvitesCount).toBe(5)
    expect(store.activeSubscribersCount).toBe(8)
  })

  it('fetchSubscribers does NOT call telegramApi.getCounts during search/filtering', async () => {
    const countsSpy = vi.spyOn(telegramApi, 'getCounts').mockResolvedValue({
      totalSubscribers: 10,
      totalTelegramInvites: 5,
      activeSubscribers: 8,
    })

    const subscribersSpy = vi.spyOn(telegramApi, 'getSubscribers').mockResolvedValue({
      data: [
        {
          id: 1,
          telegram_chat_id: '123456',
          telegram_username: 'alex',
          is_active: true,
          subscribed_at: '2026-03-01T10:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        per_page: 10,
        total: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    })

    const store = useSettingsStore()
    await store.fetchSubscribers({ search: 'alex', status: 'active' }, true)

    expect(subscribersSpy).toHaveBeenCalledTimes(1)
    // CRITICAL: getCounts must not be called during search / filter
    expect(countsSpy).not.toHaveBeenCalled()
    expect(store.subscribers).toHaveLength(1)
  })
})

describe('telegramApi getBotInfo and updateBotConfig endpoints', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('getBotInfo calls GET /ticket/telegram/info and returns bot info data', async () => {
    const mockResponse = {
      success: true,
      message: 'Retrieved successfully.',
      data: {
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
      },
      timestamp: '2026-10-21 10:55:00',
    }

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockResponse,
    })

    const res = await telegramApi.getBotInfo()
    expect(getSpy).toHaveBeenCalledWith('/ticket/telegram/info')
    expect(res.success).toBe(true)
    expect(res.data.bot_username).toBe('menglang6969Bot')
    expect(res.data.chat_id).toBe('')
    expect(res.data.bot_token_masked).toBe('54535517...cfs4')
  })

  it('updateBotConfig calls PUT /ticket/telegram/config with expected payload', async () => {
    const payload = {
      bot_token: '5453551747:AAHwNAd3BjrbqE5gLrK9kbAPQOp22Zmcfs4',
      bot_username: 'menglang6969Bot',
      is_active: true,
    }

    const mockResponse = {
      success: true,
      message: 'Updated successfully.',
      data: {
        id: 1,
        company_id: 1,
        bot_token: payload.bot_token,
        bot_token_masked: '54535517...cfs4',
        bot_username: payload.bot_username,
        chat_id: '',
        webhook_secret: 'BronxTelegramSecret2026Key99',
        invite_expiry_days: 7,
        is_active: payload.is_active,
        is_configured: true,
        source: 'database',
        telegram_object: null,
        created_at: '2026-10-21T03:49:31.000000Z',
        updated_at: '2026-10-21T03:55:00.000000Z',
      },
      timestamp: '2026-10-21 10:55:00',
    }

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
      data: mockResponse,
    })

    const res = await telegramApi.updateBotConfig(payload)
    expect(putSpy).toHaveBeenCalledWith('/ticket/telegram/config', payload)
    expect(res.success).toBe(true)
    expect(res.data.bot_username).toBe('menglang6969Bot')
    expect(res.data.chat_id).toBe('')
  })

  it('settingsStore fetchBotInfo and updateBotConfig update store state', async () => {
    const store = useSettingsStore()

    const mockBotData = {
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
      created_at: '2026-10-21T03:49:31.000000Z',
      updated_at: '2026-10-21T03:51:43.000000Z',
    }

    vi.spyOn(telegramApi, 'getBotInfo').mockResolvedValueOnce({
      success: true,
      data: mockBotData,
    })

    await store.fetchBotInfo()
    expect(store.botInfo).toEqual(mockBotData)
    expect(store.botConfig.botUsername).toBe('menglang6969Bot')
    expect(store.botConfig.tokenConfigured).toBe(true)

    // Test updateBotConfig
    const updatedPayload = {
      ...mockBotData,
      bot_username: 'newBotName',
      is_active: false,
    }

    vi.spyOn(telegramApi, 'updateBotConfig').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockBotData,
        bot_username: 'newBotName',
        is_active: false,
      },
    })

    const updatedResult = await store.updateBotConfig(updatedPayload)
    expect(updatedResult.bot_username).toBe('newBotName')
    expect(store.botInfo?.bot_username).toBe('newBotName')
    expect(store.botInfo?.is_active).toBe(false)
    expect(store.botConfig.botUsername).toBe('newBotName')
  })
})

describe('telegramApi deleteSubscriber endpoint', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('deleteSubscriber calls DELETE /ticket/telegram/subscribers/{identifier} on apiClient', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Subscriber removed successfully from database.',
        data: null,
      },
    })

    const res = await telegramApi.deleteSubscriber('12345678')
    expect(deleteSpy).toHaveBeenCalledWith('/ticket/telegram/subscribers/12345678', {
      params: undefined,
    })
    expect(res.success).toBe(true)
  })

  it('deleteSubscriber passes numeric id and subscriberType if provided', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Subscriber removed successfully from database.',
        data: null,
      },
    })

    await telegramApi.deleteSubscriber(42, 'RESOLVER')
    expect(deleteSpy).toHaveBeenCalledWith('/ticket/telegram/subscribers/42', {
      params: { subscriber_type: 'RESOLVER' },
    })
  })

  it('settingsStore.deleteSubscriber calls telegramApi and removes subscriber from local store', async () => {
    const store = useSettingsStore()
    store.subscribers = [
      {
        id: 1,
        telegram_chat_id: '12345678',
        telegram_username: 'alex_dev',
        is_active: true,
        subscribed_at: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 2,
        telegram_chat_id: '87654321',
        telegram_username: 'sarah_ops',
        is_active: false,
        subscribed_at: '2026-03-05T14:30:00.000Z',
      },
    ]
    store.totalSubscribersCount = 2

    const deleteSpy = vi.spyOn(telegramApi, 'deleteSubscriber').mockResolvedValueOnce({
      success: true,
      message: 'Subscriber removed successfully from database.',
      data: null,
    })

    await store.deleteSubscriber(1)

    expect(deleteSpy).toHaveBeenCalledWith(1, undefined)
    expect(store.subscribers).toHaveLength(1)
    expect(store.subscribers[0]!.id).toBe(2)
    expect(store.totalSubscribersCount).toBe(1)
  })
})

describe('telegramApi getUnusedInvites', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
  })

  it('correctly calls /ticket/telegram/invites/unused and returns mapped data and pagination', async () => {
    const mockResponse = {
      success: true,
      message: 'ទាញយកបានជោគជ័យ',
      data: [
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
      ],
      bot_username: 'MenglangKara_bot',
      pagination: {
        page: 1,
        per_page: 20,
        total: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
      timestamp: '2026-10-27 13:51:55',
    }

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockResponse,
    })

    const res = await telegramApi.getUnusedInvites({ page: 1, per_page: 20 })

    expect(getSpy).toHaveBeenCalledWith('/ticket/telegram/invites/unused', {
      params: { page: 1, per_page: 20 },
    })
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
    expect(res.data[0]!.token).toBe('Px8AtcqA5hG87oYcPDhPypmo05jGoYvo')
    expect(res.bot_username).toBe('MenglangKara_bot')
    expect(res.pagination.total).toBe(1)
  })

  it('fetchUnusedInvites populates store unusedInvites and pagination', async () => {
    const store = useSettingsStore()
    vi.spyOn(telegramApi, 'getUnusedInvites').mockResolvedValueOnce({
      success: true,
      data: [
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
      ],
      bot_username: 'MenglangKara_bot',
      pagination: {
        page: 1,
        per_page: 20,
        total: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
      timestamp: '2026-10-27 13:51:55',
    })

    await store.fetchUnusedInvites({ page: 1, per_page: 20 })

    expect(store.unusedInvites).toHaveLength(1)
    expect(store.unusedInvites[0]!.id).toBe(4)
    expect(store.invitesPagination.total).toBe(1)
    expect(store.totalInvitesCount).toBe(1)
  })

  it('calls POST /ticket/telegram/invites/:id/refresh to refresh an expired invite link', async () => {
    const mockRefreshed = {
      success: true,
      message: 'Invite link refreshed successfully',
      data: {
        id: 1,
        company_id: 1,
        token: 'Refreshed_tok_abc123',
        invite_url: 'https://t.me/MenglangKara_bot?start=Refreshed_tok_abc123',
        deeplink: 'https://t.me/MenglangKara_bot?start=Refreshed_tok_abc123',
        is_used: false,
        expires_at: '2026-11-03 15:00:00',
        created_by: 102,
        created_at: '2026-10-18 11:00:00',
      },
    }

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockRefreshed,
    })

    const res = await telegramApi.refreshInvite(1)

    expect(postSpy).toHaveBeenCalledWith('/ticket/telegram/invites/1/refresh')
    expect(res.success).toBe(true)
    expect(res.data.id).toBe(1)
    expect(res.data.token).toBe('Refreshed_tok_abc123')
    expect(res.data.expires_at).toBe('2026-11-03 15:00:00')
  })

  it('settingsStore.refreshInvite updates the invite item in store', async () => {
    const store = useSettingsStore()
    store.unusedInvites = [
      {
        id: 1,
        company_id: 1,
        token: 'OldToken123',
        invite_url: 'https://t.me/MenglangKara_bot?start=OldToken123',
        deeplink: 'https://t.me/MenglangKara_bot?start=OldToken123',
        is_used: false,
        expires_at: '2026-10-20 11:00:00',
        created_by: 102,
        created_at: '2026-10-13 11:00:00',
      },
    ]

    vi.spyOn(telegramApi, 'refreshInvite').mockResolvedValueOnce({
      success: true,
      message: 'Renewed',
      data: {
        id: 1,
        company_id: 1,
        token: 'NewToken456',
        invite_url: 'https://t.me/MenglangKara_bot?start=NewToken456',
        deeplink: 'https://t.me/MenglangKara_bot?start=NewToken456',
        is_used: false,
        expires_at: '2026-11-05 11:00:00',
        created_by: 102,
        created_at: '2026-10-13 11:00:00',
      },
    })

    const updated = await store.refreshInvite(1)

    expect(updated.token).toBe('NewToken456')
    expect(store.unusedInvites[0]!.token).toBe('NewToken456')
    expect(store.unusedInvites[0]!.expires_at).toBe('2026-11-05 11:00:00')
  })
})


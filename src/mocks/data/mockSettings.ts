import type {
  TelegramSubscriber,
  TelegramBotInfo,
  TelegramBotConfigPayload,
  TelegramBotInfoResponse,
  TelegramUnusedInvite,
  TelegramUnusedInvitesResponse,
  TelegramInviteFilterParams,
  TelegramInviteRefreshResponse,
} from '@/types/settings'
import type {
  TelegramSubscriberFilterParams,
  TelegramSubscriberListResponse,
  TelegramCounts,
} from '@/api/telegramApi'

const INITIAL_MOCK_SUBSCRIBERS: TelegramSubscriber[] = [
  {
    id: 1,
    company_id: 1,
    telegram_chat_id: '109283741',
    telegram_username: 'sophea_lead',
    subscriber_type: 'RESOLVER',
    invite_token: 'inv_tok_9921a',
    is_active: true,
    subscribed_at: '2026-03-10 14:22:00',
    created_at: '2026-03-10 14:22:00',
    updated_at: '2026-03-10 14:22:00',
  },
  {
    id: 2,
    company_id: 1,
    telegram_chat_id: '293847561',
    telegram_username: 'alex_dev',
    subscriber_type: 'REQUESTER',
    user_id: 101,
    user: { id: 101, name: 'Alex Client' },
    invite_token: 'inv_tok_8812b',
    is_active: true,
    subscribed_at: '2026-03-12 09:15:30',
    created_at: '2026-03-12 09:15:30',
    updated_at: '2026-03-12 09:15:30',
  },
  {
    id: 3,
    company_id: 1,
    telegram_chat_id: '948372615',
    telegram_username: 'dararith_ops',
    subscriber_type: 'RESOLVER',
    invite_token: 'inv_tok_7734c',
    is_active: true,
    subscribed_at: '2026-03-18 11:45:10',
    created_at: '2026-03-18 11:45:10',
    updated_at: '2026-03-18 11:45:10',
  },
  {
    id: 4,
    company_id: 1,
    telegram_chat_id: '847362910',
    telegram_username: 'channary_support',
    subscriber_type: 'REQUESTER',
    user_id: 102,
    user: { id: 102, name: 'Channary Requester' },
    invite_token: 'inv_tok_6645d',
    is_active: true,
    subscribed_at: '2026-03-22 16:30:00',
    created_at: '2026-03-22 16:30:00',
    updated_at: '2026-03-22 16:30:00',
  },
  {
    id: 5,
    company_id: 1,
    telegram_chat_id: '384756291',
    telegram_username: 'michael_hq',
    subscriber_type: 'RESOLVER',
    invite_token: 'inv_tok_5556e',
    is_active: true,
    subscribed_at: '2026-03-25 10:10:00',
    created_at: '2026-03-25 10:10:00',
    updated_at: '2026-03-25 10:10:00',
  },
  {
    id: 6,
    company_id: 1,
    telegram_chat_id: '573829104',
    telegram_username: 'sreypov_qa',
    subscriber_type: 'REQUESTER',
    user_id: 103,
    user: { id: 103, name: 'Sreypov User' },
    invite_token: 'inv_tok_4467f',
    is_active: false,
    subscribed_at: '2026-02-14 08:00:00',
    created_at: '2026-02-14 08:00:00',
    updated_at: '2026-02-14 08:00:00',
  },
  {
    id: 7,
    company_id: 1,
    telegram_chat_id: '682910384',
    telegram_username: 'bopha_branch1',
    subscriber_type: 'RESOLVER',
    invite_token: 'inv_tok_3378g',
    is_active: true,
    subscribed_at: '2026-04-01 13:05:00',
    created_at: '2026-04-01 13:05:00',
    updated_at: '2026-04-01 13:05:00',
  },
  {
    id: 8,
    company_id: 1,
    telegram_chat_id: '748392019',
    telegram_username: 'vicheka_admin',
    subscriber_type: 'REQUESTER',
    user_id: 104,
    user: { id: 104, name: 'Vicheka Client' },
    invite_token: 'inv_tok_2289h',
    is_active: false,
    subscribed_at: '2026-01-20 15:40:00',
    created_at: '2026-01-20 15:40:00',
    updated_at: '2026-01-20 15:40:00',
  },
]

let mockSubscribersState: TelegramSubscriber[] = JSON.parse(
  JSON.stringify(INITIAL_MOCK_SUBSCRIBERS),
)
let mockInvitesCounter = 19

export function resetMockSubscribers(): void {
  mockSubscribersState = JSON.parse(JSON.stringify(INITIAL_MOCK_SUBSCRIBERS))
  mockInvitesCounter = 19
}

export function getMockSubscribers(
  params?: TelegramSubscriberFilterParams,
): TelegramSubscriberListResponse {
  let list = [...mockSubscribersState]

  if (params?.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim()
    list = list.filter(
      (s) =>
        (s.telegram_username && s.telegram_username.toLowerCase().includes(q)) ||
        s.telegram_chat_id.includes(q),
    )
  }

  if (params?.status && params.status !== 'all') {
    const isActive = params.status === 'active'
    list = list.filter((s) => s.is_active === isActive)
  }

  if (params?.is_active !== undefined) {
    list = list.filter((s) => s.is_active === params.is_active)
  }

  const rawType = params?.subscriber_type || params?.type
  if (rawType && rawType !== 'all') {
    const filterType = rawType.toUpperCase()
    list = list.filter((s) => {
      const sType = (s.subscriber_type || 'RESOLVER').toUpperCase()
      return sType === filterType
    })
  }

  const page = Number(params?.page || 1)
  const perPage = Number(params?.per_page || 10)
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const startIndex = (page - 1) * perPage
  const pageItems = list.slice(startIndex, startIndex + perPage)

  return {
    success: true,
    data: pageItems,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    },
    meta: {
      current_page: page,
      per_page: perPage,
      total,
      last_page: totalPages,
      from: total > 0 ? startIndex + 1 : 0,
      to: Math.min(startIndex + perPage, total),
    },
  }
}

export const INITIAL_MOCK_UNUSED_INVITES: TelegramUnusedInvite[] = [
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
    id: 2,
    company_id: 1,
    token: 'Am1CwerC7jJ09qAeRFjRaror27lIqAxq',
    invite_url: 'https://t.me/MenglangKara_bot?start=Am1CwerC7jJ09qAeRFjRaror27lIqAxq',
    deeplink: 'https://t.me/MenglangKara_bot?start=Am1CwerC7jJ09qAeRFjRaror27lIqAxq',
    is_used: false,
    expires_at: '2026-10-30 09:15:10',
    created_by: 102,
    created_at: '2026-10-23 09:15:10',
  },
  {
    id: 1,
    company_id: 1,
    token: 'Bn2DxfsD8kK10rBfSGkSbsps38mJrByr',
    invite_url: 'https://t.me/MenglangKara_bot?start=Bn2DxfsD8kK10rBfSGkSbsps38mJrByr',
    deeplink: 'https://t.me/MenglangKara_bot?start=Bn2DxfsD8kK10rBfSGkSbsps38mJrByr',
    is_used: false,
    expires_at: '2024-01-01 11:00:00',
    created_by: 102,
    created_at: '2023-12-25 11:00:00',
  },
]

let mockUnusedInvitesState: TelegramUnusedInvite[] = JSON.parse(
  JSON.stringify(INITIAL_MOCK_UNUSED_INVITES),
)

export function resetMockUnusedInvites(): void {
  mockUnusedInvitesState = JSON.parse(JSON.stringify(INITIAL_MOCK_UNUSED_INVITES))
}

export function refreshMockUnusedInvite(
  id: number | string,
): TelegramInviteRefreshResponse {
  const numId = Number(id)
  const itemIndex = mockUnusedInvitesState.findIndex((item) => item.id === numId)
  if (itemIndex === -1) {
    throw new Error(`Invite with ID ${id} not found`)
  }

  const existing = mockUnusedInvitesState[itemIndex]!
  const newToken =
    'Refreshed_' +
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  const botUsername = mockBotInfoState?.bot_username || 'MenglangKara_bot'
  const newInviteUrl = `https://t.me/${botUsername}?start=${newToken}`
  const now = new Date()
  const newExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const formattedExpires = `${newExpires.getFullYear()}-${pad(newExpires.getMonth() + 1)}-${pad(newExpires.getDate())} ${pad(newExpires.getHours())}:${pad(newExpires.getMinutes())}:${pad(newExpires.getSeconds())}`

  const updated: TelegramUnusedInvite = {
    ...existing,
    token: newToken,
    invite_url: newInviteUrl,
    deeplink: newInviteUrl,
    expires_at: formattedExpires,
  }

  mockUnusedInvitesState[itemIndex] = updated

  return {
    success: true,
    message: 'Invite link refreshed successfully (Mock Mode)',
    data: updated,
  }
}

export function getMockUnusedInvites(
  params?: TelegramInviteFilterParams,
): TelegramUnusedInvitesResponse {
  let list = [...mockUnusedInvitesState]

  if (params?.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim()
    list = list.filter(
      (item) =>
        item.token.toLowerCase().includes(q) ||
        item.invite_url.toLowerCase().includes(q) ||
        String(item.id).includes(q) ||
        (item.created_by && String(item.created_by).includes(q)),
    )
  }

  if (params?.status && params.status !== 'all') {
    const now = Date.now()
    if (params.status === 'active') {
      list = list.filter((item) => {
        const d = new Date(item.expires_at.replace(' ', 'T')).getTime()
        return !isNaN(d) ? d > now : true
      })
    } else if (params.status === 'expired') {
      list = list.filter((item) => {
        const d = new Date(item.expires_at.replace(' ', 'T')).getTime()
        return !isNaN(d) ? d <= now : false
      })
    }
  }

  const page = Number(params?.page || 1)
  const perPage = Number(params?.per_page || 20)
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const startIndex = (page - 1) * perPage
  const pageItems = list.slice(startIndex, startIndex + perPage)

  return {
    success: true,
    message: 'ទាញយកបានជោគជ័យ',
    data: pageItems,
    bot_username: mockBotInfoState.bot_username || 'MenglangKara_bot',
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    },
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
  }
}

export function generateMockInviteLink(): string {
  mockInvitesCounter++
  const botUser = mockBotInfoState.bot_username || 'MenglangKara_bot'
  const cleanBot = botUser.replace(/^@/, '')
  const randToken = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12)
  const url = `https://t.me/${cleanBot}?start=${randToken}`
  const now = new Date()
  const nowStr = now.toISOString().replace('T', ' ').substring(0, 19)
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19)

  const newInvite: TelegramUnusedInvite = {
    id: mockUnusedInvitesState.length + 1,
    company_id: 1,
    token: randToken,
    invite_url: url,
    deeplink: url,
    is_used: false,
    expires_at: expiresAt,
    created_by: 367,
    created_at: nowStr,
  }
  mockUnusedInvitesState.unshift(newInvite)

  return url
}

export function removeMockSubscriber(identifier: string | number): void {
  const sub = mockSubscribersState.find(
    (s) => String(s.id) === String(identifier) || s.telegram_chat_id === String(identifier),
  )
  if (sub) {
    sub.is_active = false
  }
}

export const deleteMockSubscriber = removeMockSubscriber

export function updateMockSubscriberStatus(chatId: string, isActive: boolean): void {
  const sub = mockSubscribersState.find((s) => s.telegram_chat_id === chatId)
  if (sub) {
    sub.is_active = isActive
  }
}

export function getMockTelegramCounts(): TelegramCounts {
  const activeCount = mockSubscribersState.filter((s) => s.is_active).length
  return {
    totalSubscribers: mockSubscribersState.length,
    activeSubscribers: activeCount,
    totalTelegramInvites: mockInvitesCounter,
  }
}

export const INITIAL_MOCK_BOT_INFO: TelegramBotInfo = {
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
  invite_url: null,
  migration_url: null,
  created_at: '2026-10-21T03:49:31.000000Z',
  updated_at: '2026-10-21T03:51:43.000000Z',
}

let mockBotInfoState: TelegramBotInfo = JSON.parse(JSON.stringify(INITIAL_MOCK_BOT_INFO))

export function resetMockBotInfo(): void {
  mockBotInfoState = JSON.parse(JSON.stringify(INITIAL_MOCK_BOT_INFO))
}

function maskToken(token?: string): string {
  if (!token) return ''
  if (token.length <= 12) return token
  return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`
}

export function getMockTelegramBotInfo(): TelegramBotInfoResponse {
  return {
    success: true,
    message: 'Retrieved successfully.',
    data: {
      ...mockBotInfoState,
      migration: null,
      subscriber_rejoin_link: null,
      rejoin_link: null,
      migration_url: null,
      invite_url: null,
    },
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
  }
}

export function updateMockTelegramBotConfig(
  payload: TelegramBotConfigPayload,
): TelegramBotInfoResponse {
  const now = new Date().toISOString()
  const token = payload.bot_token || mockBotInfoState.bot_token
  const isNewBot = Boolean(
    payload.bot_username &&
      payload.bot_username.trim().replace(/^@/, '').toLowerCase() !==
        mockBotInfoState.bot_username.trim().replace(/^@/, '').toLowerCase(),
  )
  const cleanUsername = (payload.bot_username || mockBotInfoState.bot_username)
    .trim()
    .replace(/^@/, '')
  const link = `https://t.me/${cleanUsername}?start=mock_migration_token_${Date.now()}`

  mockBotInfoState = {
    ...mockBotInfoState,
    bot_token: token,
    bot_token_masked: maskToken(token),
    bot_username: cleanUsername,
    chat_id: payload.chat_id !== undefined ? payload.chat_id : mockBotInfoState.chat_id,
    webhook_secret:
      payload.webhook_secret !== undefined
        ? payload.webhook_secret
        : mockBotInfoState.webhook_secret,
    invite_expiry_days:
      payload.invite_expiry_days !== undefined
        ? payload.invite_expiry_days
        : mockBotInfoState.invite_expiry_days,
    is_active:
      payload.is_active !== undefined ? Boolean(payload.is_active) : mockBotInfoState.is_active,
    is_configured: Boolean(token && payload.bot_username),
    subscriber_rejoin_link: isNewBot ? link : null,
    rejoin_link: isNewBot ? link : null,
    invite_url: isNewBot ? link : null,
    migration_url: isNewBot ? link : null,
    migration: isNewBot
      ? {
          mode: 'new_bot_migrated',
          action_required: true,
          is_new_bot: true,
          message: `New bot @${cleanUsername} configured. Existing subscribers must click this link to join the new bot.`,
          subscriber_rejoin_link: link,
          rejoin_link: link,
          invite_url: link,
          migration_url: link,
          stats: {
            total_subscribers: 10,
            sent: 10,
            failed: 0,
          },
        }
      : {
          mode: 'token_updated_same_bot',
          action_required: false,
          is_new_bot: false,
          message: 'Same bot token updated. All existing subscribers remain active.',
          subscriber_rejoin_link: null,
          rejoin_link: null,
        },
    updated_at: now,
  }

  return {
    success: true,
    message: 'Telegram bot configuration updated successfully.',
    data: { ...mockBotInfoState },
    timestamp: now.replace('T', ' ').substring(0, 19),
  }
}

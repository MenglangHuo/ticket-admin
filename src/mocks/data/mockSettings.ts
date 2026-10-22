import type {
  TelegramSubscriber,
  TelegramBotInfo,
  TelegramBotConfigPayload,
  TelegramBotInfoResponse,
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

export function generateMockInviteLink(): string {
  mockInvitesCounter++
  const botUser = mockBotInfoState.bot_username || 'BronxTicketAlertBot'
  const cleanBot = botUser.replace(/^@/, '')
  const randToken = Math.random().toString(36).substring(2, 10)
  return `https://t.me/${cleanBot}?start=inv_${randToken}`
}

export function removeMockSubscriber(chatId: string): void {
  const sub = mockSubscribersState.find((s) => s.telegram_chat_id === chatId)
  if (sub) {
    sub.is_active = false
  }
}

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

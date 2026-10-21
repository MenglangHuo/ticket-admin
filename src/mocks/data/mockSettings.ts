import type { TelegramSubscriber } from '@/types/settings'
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
  const botUser = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string) || 'BronxTicketAlertBot'
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

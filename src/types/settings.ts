export type SubscriberType = 'RESOLVER' | 'REQUESTER'

export interface TelegramSubscriber {
  id: number | string
  company_id?: number
  telegram_chat_id: string
  telegram_username: string | null
  invite_token?: string | null
  subscriber_type?: SubscriberType | string
  user_id?: number | null
  user?: {
    id: number
    name?: string | null
    username?: string | null
    email?: string | null
  } | null
  is_active: boolean
  subscribed_at: string
  created_at?: string
  updated_at?: string
}

export interface TelegramInviteResponse {
  invite_url: string
}

export interface TelegramInviteRefreshResponse {
  success: boolean
  message?: string
  data: TelegramUnusedInvite
}

export interface TelegramUnusedInvite {
  id: number
  company_id?: number
  token: string
  invite_url: string
  deeplink?: string
  is_used: boolean
  expires_at: string
  created_by?: number | string | null
  created_at: string
}

export interface TelegramUnusedInvitesResponse {
  success: boolean
  message?: string
  data: TelegramUnusedInvite[]
  bot_username?: string
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
  timestamp?: string
}

export interface TelegramInviteFilterParams {
  page?: number
  per_page?: number
  search?: string
  status?: 'all' | 'active' | 'expired' | string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface TelegramBotConfig {
  botUsername: string
  tokenConfigured: boolean
  webhookStatus: 'connected' | 'polling' | 'disconnected'
  daemonCommand: string
  deliverySuccessRate: number
}

export interface TelegramMigrationInfo {
  mode: 'token_updated_same_bot' | 'new_bot_migrated' | string
  action_required: boolean
  is_new_bot?: boolean
  message: string
  subscriber_rejoin_link?: string | null
  rejoin_link?: string | null
  invite_url?: string | null
  migration_url?: string | null
  stats?: {
    total_subscribers: number
    sent: number
    failed: number
    errors?: string[]
  }
}

export interface TelegramBotInfo {
  id?: number
  company_id?: number
  bot_token?: string
  bot_token_masked?: string
  bot_username: string
  chat_id: string
  webhook_secret?: string
  invite_expiry_days: number
  is_active: boolean
  is_configured?: boolean
  source?: string
  telegram_object?: Record<string, any> | null
  migration?: TelegramMigrationInfo | null
  subscriber_rejoin_link?: string | null
  rejoin_link?: string | null
  invite_url?: string | null
  migration_url?: string | null
  bot_username_changed?: boolean
  purged_subscribers_count?: number
  purged_invites_count?: number
  created_at?: string
  updated_at?: string
}

export interface TelegramBotConfigPayload {
  bot_token?: string
  bot_username: string
  chat_id?: string
  webhook_secret?: string
  invite_expiry_days?: number
  is_active?: boolean
  notify_migration?: boolean
}

export interface TelegramBotInfoResponse {
  success: boolean
  message?: string
  data: TelegramBotInfo
  timestamp?: string
}

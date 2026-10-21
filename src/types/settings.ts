export interface TelegramSubscriber {
  id: number | string
  company_id?: number
  telegram_chat_id: string
  telegram_username: string | null
  invite_token?: string | null
  is_active: boolean
  subscribed_at: string
  created_at?: string
  updated_at?: string
}

export interface TelegramInviteResponse {
  invite_url: string
}

export interface TelegramBotConfig {
  botUsername: string
  tokenConfigured: boolean
  webhookStatus: 'connected' | 'polling' | 'disconnected'
  daemonCommand: string
  deliverySuccessRate: number
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
  created_at?: string
  updated_at?: string
}

export interface TelegramBotConfigPayload {
  bot_token?: string
  bot_username: string
  chat_id: string
  webhook_secret?: string
  invite_expiry_days: number
  is_active: boolean
}

export interface TelegramBotInfoResponse {
  success: boolean
  message?: string
  data: TelegramBotInfo
  timestamp?: string
}

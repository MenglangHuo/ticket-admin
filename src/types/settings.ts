export interface TelegramSubscriber {
  id: number | string;
  company_id?: number;
  telegram_chat_id: string;
  telegram_username: string | null;
  invite_token?: string | null;
  is_active: boolean;
  subscribed_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface TelegramInviteResponse {
  invite_url: string;
}

export interface TelegramBotConfig {
  botUsername: string;
  tokenConfigured: boolean;
  webhookStatus: 'connected' | 'polling' | 'disconnected';
  daemonCommand: string;
  deliverySuccessRate: number;
}

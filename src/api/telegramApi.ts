import apiClient from './client'
import mockService from '@/mocks/mockService'
import type {
  TelegramSubscriber,
  TelegramBotConfigPayload,
  TelegramBotInfoResponse,
  TelegramUnusedInvite,
  TelegramUnusedInvitesResponse,
  TelegramInviteFilterParams,
  TelegramInviteRefreshResponse,
} from '@/types/settings'

export type {
  TelegramUnusedInvite,
  TelegramUnusedInvitesResponse,
  TelegramInviteFilterParams,
  TelegramInviteRefreshResponse,
}

export interface TelegramSubscriberFilterParams {
  page?: number
  per_page?: number
  search?: string
  username?: string
  status?: 'all' | 'active' | 'inactive' | string
  is_active?: boolean
  subscriber_type?: string
  type?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface TelegramSubscriberPagination {
  page: number
  per_page: number
  total: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export interface TelegramSubscriberListResponse {
  data: TelegramSubscriber[]
  pagination: TelegramSubscriberPagination
  meta?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from?: number
    to?: number
  }
  success?: boolean
  message?: string
}

export interface TelegramSubscribersResponse {
  data: TelegramSubscriber[]
  success?: boolean
  pagination?: TelegramSubscriberPagination
}

export interface TelegramInviteResponse {
  invite_url?: string
  data?:
    | {
        invite_url?: string
      }
    | string
  message?: string
  success?: boolean
}

export interface TelegramActionResponse {
  data: null
  message?: string
  success?: boolean
}

export interface TelegramCounts {
  totalSubscribers: number
  totalTelegramInvites: number
  activeSubscribers?: number
}

export interface TelegramCountResponse {
  total?: number
  count?: number
  data?:
    | {
        total?: number
        count?: number
      }
    | number
  message?: string
  success?: boolean
}

export const telegramApi = {
  /**
   * Fetch registered Telegram subscribers for the authenticated tenant company.
   * Endpoint: GET /tickets/telegram/subscribers
   * Supports pagination, search (by username or chat ID), status filter, and sorting.
   */
  async getSubscribers(
    params?: TelegramSubscriberFilterParams,
  ): Promise<TelegramSubscriberListResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getSubscribers(params)
    }
    const cleanParams: Record<string, any> = {}
    if (params) {
      if (params.page !== undefined) cleanParams.page = params.page
      if (params.per_page !== undefined) cleanParams.per_page = params.per_page
      if (params.search !== undefined && params.search.trim() !== '')
        cleanParams.search = params.search.trim()
      if (params.username !== undefined && params.username.trim() !== '')
        cleanParams.username = params.username.trim()
      if (params.status && params.status !== 'all') cleanParams.status = params.status
      if (params.is_active !== undefined) cleanParams.is_active = params.is_active
      if (params.subscriber_type && params.subscriber_type !== 'all') {
        cleanParams.subscriber_type = params.subscriber_type
        cleanParams.type = params.subscriber_type
      } else if (params.type && params.type !== 'all') {
        cleanParams.subscriber_type = params.type
        cleanParams.type = params.type
      }
      if (params.sort_by) cleanParams.sort_by = params.sort_by
      if (params.sort_dir) cleanParams.sort_dir = params.sort_dir
    }

    const response = await apiClient.get<any>('/ticket/telegram/subscribers', {
      params: cleanParams,
    })
    const resData = response.data

    let items: TelegramSubscriber[] = []
    if (Array.isArray(resData?.data)) {
      items = resData.data
    } else if (Array.isArray(resData)) {
      items = resData
    } else if (resData && typeof resData === 'object') {
      const numericItems = Object.keys(resData)
        .filter((k) => !isNaN(Number(k)))
        .map((k) => resData[k])
      if (numericItems.length > 0) items = numericItems
    }

    const rawPagination = resData?.pagination || {}
    const rawMeta = resData?.meta || {}
    const page = Number(
      rawPagination.page ?? rawMeta.current_page ?? resData?.current_page ?? params?.page ?? 1,
    )
    const perPage = Number(
      rawPagination.per_page ??
        rawMeta.per_page ??
        resData?.per_page ??
        params?.per_page ??
        (items.length || 10),
    )
    const total = Number(rawPagination.total ?? rawMeta.total ?? resData?.total ?? items.length)
    const totalPages = Number(
      rawPagination.total_pages ??
        rawMeta.last_page ??
        resData?.last_page ??
        Math.max(1, Math.ceil(total / (perPage || 10))),
    )
    const hasNext = Boolean(rawPagination.has_next ?? page < totalPages)
    const hasPrevious = Boolean(rawPagination.has_previous ?? page > 1)

    return {
      data: items,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        has_next: hasNext,
        has_previous: hasPrevious,
      },
      meta: {
        current_page: page,
        per_page: perPage,
        total,
        last_page: totalPages,
        from: rawMeta.from ?? (total > 0 ? (page - 1) * perPage + 1 : 0),
        to: rawMeta.to ?? Math.min(page * perPage, total),
      },
      success: resData?.success ?? true,
      message: resData?.message,
    }
  },

  /**
   * Generate a secure invite link for Telegram Bot notification subscription.
   * Endpoint: POST /tickets/telegram/invite-link
   */
  async generateInviteLink(): Promise<string> {
    if (mockService.isMockDataEnabled()) {
      return mockService.generateInviteLink()
    }
    const response = await apiClient.post<TelegramInviteResponse>('/ticket/telegram/invite-link')
    const resData: any = response.data
    if (resData?.invite_url) {
      return resData.invite_url
    }
    if (resData?.data?.invite_url) {
      return resData.data.invite_url
    }
    if (typeof resData?.data === 'string' && resData.data.startsWith('http')) {
      return resData.data
    }
    return ''
  },

  /**
   * Fetch list of unused Telegram bot invite links for the tenant company.
   * Endpoint: GET /ticket/telegram/invites/unused (Full URL: /api/ticket/telegram/invites/unused)
   * Supports pagination, search, and sorting.
   */
  async getUnusedInvites(
    params?: TelegramInviteFilterParams,
  ): Promise<TelegramUnusedInvitesResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getUnusedInvites(params)
    }
    const cleanParams: Record<string, any> = {}
    if (params) {
      if (params.page !== undefined) cleanParams.page = params.page
      if (params.per_page !== undefined) cleanParams.per_page = params.per_page
      if (params.search !== undefined && params.search.trim() !== '') {
        cleanParams.search = params.search.trim()
      }
      if (params.status && params.status !== 'all') cleanParams.status = params.status
      if (params.sort_by) cleanParams.sort_by = params.sort_by
      if (params.sort_dir) cleanParams.sort_dir = params.sort_dir
    }

    const response = await apiClient.get<any>('/ticket/telegram/invites/unused', {
      params: cleanParams,
    })
    const resData = response.data

    let items: TelegramUnusedInvite[] = []
    if (Array.isArray(resData?.data)) {
      items = resData.data
    } else if (Array.isArray(resData)) {
      items = resData
    } else if (resData && typeof resData === 'object') {
      const numericItems = Object.keys(resData)
        .filter((k) => !isNaN(Number(k)))
        .map((k) => resData[k])
      if (numericItems.length > 0) items = numericItems
    }

    const rawPagination = resData?.pagination || {}
    const page = Number(rawPagination.page ?? params?.page ?? 1)
    const perPage = Number(rawPagination.per_page ?? params?.per_page ?? 20)
    const total = Number(rawPagination.total ?? items.length)
    const totalPages = Number(
      rawPagination.total_pages ?? Math.max(1, Math.ceil(total / (perPage || 20))),
    )
    const hasNext = Boolean(rawPagination.has_next ?? page < totalPages)
    const hasPrevious = Boolean(rawPagination.has_previous ?? page > 1)

    return {
      success: resData?.success ?? true,
      message: resData?.message,
      data: items,
      bot_username: resData?.bot_username,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        has_next: hasNext,
        has_previous: hasPrevious,
      },
      timestamp: resData?.timestamp,
    }
  },

  /**
   * Refresh an expired (or existing) Telegram bot invite link.
   * Endpoint: POST /ticket/telegram/invites/{id}/refresh (Full URL: /api/ticket/telegram/invites/{id}/refresh)
   */
  async refreshInvite(id: number | string): Promise<TelegramInviteRefreshResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.refreshInvite(id)
    }

    const response = await apiClient.post<any>(`/ticket/telegram/invites/${id}/refresh`)
    const resData = response.data

    let updatedItem: TelegramUnusedInvite | null = null
    if (resData?.data && typeof resData.data === 'object' && resData.data.id) {
      updatedItem = resData.data
    } else if (resData?.id) {
      updatedItem = resData
    } else if (resData?.data) {
      updatedItem = resData.data
    }

    return {
      success: resData?.success ?? true,
      message: resData?.message || 'Invite link refreshed successfully',
      data: updatedItem as TelegramUnusedInvite,
    }
  },

  /**
   * Delete a subscriber by identifier (ID or chat ID) from the database.
   * Endpoint: DELETE /ticket/telegram/subscribers/{identifier} (Full URL: /api/ticket/telegram/subscribers/{identifier})
   */
  async deleteSubscriber(
    identifier: string | number,
    subscriberType?: string,
  ): Promise<TelegramActionResponse> {
    if (mockService.isMockDataEnabled()) {
      mockService.removeSubscriber(String(identifier))
      return {
        data: null,
        success: true,
        message: 'Subscriber removed successfully from database (Mock Mode)',
      }
    }
    const params = subscriberType ? { subscriber_type: subscriberType } : undefined
    const response = await apiClient.delete<TelegramActionResponse>(
      `/ticket/telegram/subscribers/${identifier}`,
      { params },
    )
    return response.data
  },

  /**
   * Backwards-compatible alias for deleteSubscriber.
   * Endpoint: DELETE /ticket/telegram/subscribers/{identifier}
   */
  async removeSubscriber(identifier: string | number, subscriberType?: string): Promise<void> {
    await this.deleteSubscriber(identifier, subscriberType)
  },

  /**
   * Send direct test notification to a subscriber's Telegram chat.
   * Endpoint: POST /ticket/telegram/subscribers/{chatId}/test
   */
  async sendTestNotification(chatId: string): Promise<TelegramActionResponse> {
    if (mockService.isMockDataEnabled()) {
      return {
        data: null,
        success: true,
        message: 'Test notification delivered successfully (Mock Mode)',
      }
    }
    const response = await apiClient.post<TelegramActionResponse>(
      `/ticket/telegram/subscribers/${chatId}/test`,
    )
    return response.data
  },

  /**
   * Enable or disable Telegram notifications on ticket creation for a subscriber (updates is_active field).
   * Endpoint: PATCH /ticket/telegram/subscribers/{chatId}/status
   */
  async updateSubscriberStatus(chatId: string, isActive?: boolean): Promise<TelegramSubscriber> {
    if (mockService.isMockDataEnabled()) {
      mockService.updateSubscriberStatus(chatId, Boolean(isActive))
      return {
        id: chatId,
        telegram_chat_id: chatId,
        telegram_username: 'subscriber',
        is_active: Boolean(isActive),
        subscribed_at: new Date().toISOString(),
      }
    }
    const payload = isActive !== undefined ? { is_active: isActive } : {}
    const response = await apiClient.patch<any>(
      `/ticket/telegram/subscribers/${chatId}/status`,
      payload,
    )
    const resData = response.data
    return resData?.data || resData
  },

  /**
   * Fetch consolidated Telegram statistics in a single API call.
   * Endpoint: GET /ticket/telegram/counts
   */
  async getCounts(): Promise<TelegramCounts> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTelegramCounts()
    }
    const response = await apiClient.get<any>('/ticket/telegram/counts')
    const resData: any = response.data?.data || response.data || {}
    const totalSubscribers = Number(resData.totalSubscribers ?? resData.total_subscribers ?? 0)
    const totalTelegramInvites = Number(
      resData.totalTelegramInvites ?? resData.total_telegram_invites ?? resData.total_invites ?? 0,
    )
    const activeSubscribers = Number(resData.activeSubscribers ?? resData.active_subscribers ?? 0)
    return {
      totalSubscribers: isNaN(totalSubscribers) ? 0 : totalSubscribers,
      totalTelegramInvites: isNaN(totalTelegramInvites) ? 0 : totalTelegramInvites,
      activeSubscribers: isNaN(activeSubscribers) ? 0 : activeSubscribers,
    }
  },

  /**
   * Fetch total count of Telegram bot invites generated for tenant company.
   * Endpoint: GET /ticket/telegram/invites/total-count
   */
  async getTotalInviteCount(): Promise<number> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTelegramCounts().totalTelegramInvites
    }
    const response = await apiClient.get<TelegramCountResponse>(
      '/ticket/telegram/invites/total-count',
    )
    const resData: any = response.data
    if (typeof resData?.total === 'number') return resData.total
    if (typeof resData?.count === 'number') return resData.count
    if (typeof resData?.data?.total === 'number') return resData.data.total
    if (typeof resData?.data?.count === 'number') return resData.data.count
    if (typeof resData?.data === 'number') return resData.data
    return 0
  },

  /**
   * Fetch total count of registered Telegram subscribers for tenant company.
   * Endpoint: GET /ticket/telegram/subscribers/total-count
   */
  async getTotalSubscribersCount(): Promise<number> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTelegramCounts().totalSubscribers
    }
    const response = await apiClient.get<TelegramCountResponse>(
      '/ticket/telegram/subscribers/total-count',
    )
    const resData: any = response.data
    if (typeof resData?.total === 'number') return resData.total
    if (typeof resData?.count === 'number') return resData.count
    if (typeof resData?.data?.total === 'number') return resData.data.total
    if (typeof resData?.data?.count === 'number') return resData.data.count
    if (typeof resData?.data === 'number') return resData.data
    return 0
  },

  /**
   * Fetch current Telegram Bot configuration & information.
   * Endpoint: GET /ticket/telegram/info
   */
  async getBotInfo(): Promise<TelegramBotInfoResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTelegramBotInfo()
    }
    const response = await apiClient.get<TelegramBotInfoResponse>('/ticket/telegram/info')
    return response.data
  },

  /**
   * Update Telegram Bot configuration.
   * Endpoint: PUT /ticket/telegram/config
   */
  async updateBotConfig(payload: TelegramBotConfigPayload): Promise<TelegramBotInfoResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.updateTelegramBotConfig(payload)
    }
    const response = await apiClient.put<TelegramBotInfoResponse>(
      '/ticket/telegram/config',
      payload,
    )
    return response.data
  },

  /**
   * Broadcast migration link to active subscribers via previous bot token.
   * Endpoint: POST /ticket/telegram/broadcast-migration
   */
  async broadcastMigration(params?: {
    old_bot_token?: string
    new_bot_username?: string
  }): Promise<{ success: boolean; message: string; data: any }> {
    const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
      '/ticket/telegram/broadcast-migration',
      params || {},
    )
    return response.data
  },
}

export default telegramApi

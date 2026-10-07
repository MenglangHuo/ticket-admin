import apiClient from './client';
import type { TelegramSubscriber } from '@/types/settings';

export interface TelegramSubscriberFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  username?: string;
  status?: 'all' | 'active' | 'inactive' | string;
  is_active?: boolean;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface TelegramSubscriberPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface TelegramSubscriberListResponse {
  data: TelegramSubscriber[];
  pagination: TelegramSubscriberPagination;
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from?: number;
    to?: number;
  };
  success?: boolean;
  message?: string;
}

export interface TelegramSubscribersResponse {
  data: TelegramSubscriber[];
  success?: boolean;
  pagination?: TelegramSubscriberPagination;
}

export interface TelegramInviteResponse {
  invite_url?: string;
  data?: {
    invite_url?: string;
  } | string;
  message?: string;
  success?: boolean;
}

export interface TelegramActionResponse {
  data: null;
  message?: string;
  success?: boolean;
}

export interface TelegramCounts {
  totalSubscribers: number;
  totalTelegramInvites: number;
  activeSubscribers?: number;
}

export interface TelegramCountResponse {
  total?: number;
  count?: number;
  data?: {
    total?: number;
    count?: number;
  } | number;
  message?: string;
  success?: boolean;
}

export const telegramApi = {
  /**
   * Fetch registered Telegram subscribers for the authenticated tenant company.
   * Endpoint: GET /tickets/telegram/subscribers
   * Supports pagination, search (by username or chat ID), status filter, and sorting.
   */
  async getSubscribers(
    params?: TelegramSubscriberFilterParams
  ): Promise<TelegramSubscriberListResponse> {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.per_page !== undefined) cleanParams.per_page = params.per_page;
      if (params.search !== undefined && params.search.trim() !== '') cleanParams.search = params.search.trim();
      if (params.username !== undefined && params.username.trim() !== '') cleanParams.username = params.username.trim();
      if (params.status && params.status !== 'all') cleanParams.status = params.status;
      if (params.is_active !== undefined) cleanParams.is_active = params.is_active;
      if (params.sort_by) cleanParams.sort_by = params.sort_by;
      if (params.sort_dir) cleanParams.sort_dir = params.sort_dir;
    }

    const response = await apiClient.get<any>('/tickets/telegram/subscribers', {
      params: cleanParams,
    });
    const resData = response.data;

    let items: TelegramSubscriber[] = [];
    if (Array.isArray(resData?.data)) {
      items = resData.data;
    } else if (Array.isArray(resData)) {
      items = resData;
    } else if (resData && typeof resData === 'object') {
      const numericItems = Object.keys(resData)
        .filter((k) => !isNaN(Number(k)))
        .map((k) => resData[k]);
      if (numericItems.length > 0) items = numericItems;
    }

    const rawPagination = resData?.pagination || {};
    const rawMeta = resData?.meta || {};
    const page = Number(rawPagination.page ?? rawMeta.current_page ?? resData?.current_page ?? params?.page ?? 1);
    const perPage = Number(rawPagination.per_page ?? rawMeta.per_page ?? resData?.per_page ?? params?.per_page ?? (items.length || 10));
    const total = Number(rawPagination.total ?? rawMeta.total ?? resData?.total ?? items.length);
    const totalPages = Number(rawPagination.total_pages ?? rawMeta.last_page ?? resData?.last_page ?? Math.max(1, Math.ceil(total / (perPage || 10))));
    const hasNext = Boolean(rawPagination.has_next ?? (page < totalPages));
    const hasPrevious = Boolean(rawPagination.has_previous ?? (page > 1));

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
    };
  },

  /**
   * Generate a secure invite link for Telegram Bot notification subscription.
   * Endpoint: POST /tickets/telegram/invite-link
   */
  async generateInviteLink(): Promise<string> {
    const response = await apiClient.post<TelegramInviteResponse>('/tickets/telegram/invite-link');
    const resData: any = response.data;
    if (resData?.invite_url) {
      return resData.invite_url;
    }
    if (resData?.data?.invite_url) {
      return resData.data.invite_url;
    }
    if (typeof resData?.data === 'string' && resData.data.startsWith('http')) {
      return resData.data;
    }
    return '';
  },

  /**
   * Remove or soft-deactivate a subscriber by their Telegram chat ID.
   * Endpoint: DELETE /tickets/telegram/subscribers/{chatId}
   */
  async removeSubscriber(chatId: string): Promise<void> {
    await apiClient.delete<TelegramActionResponse>(`/tickets/telegram/subscribers/${chatId}`);
  },

  /**
   * Send direct test notification to a subscriber's Telegram chat.
   * Endpoint: POST /tickets/telegram/subscribers/{chatId}/test
   */
  async sendTestNotification(chatId: string): Promise<TelegramActionResponse> {
    const response = await apiClient.post<TelegramActionResponse>(
      `/tickets/telegram/subscribers/${chatId}/test`
    );
    return response.data;
  },

  /**
   * Enable or disable Telegram notifications on ticket creation for a subscriber (updates is_active field).
   * Endpoint: PATCH /tickets/telegram/subscribers/{chatId}/status
   */
  async updateSubscriberStatus(chatId: string, isActive?: boolean): Promise<TelegramSubscriber> {
    const payload = isActive !== undefined ? { is_active: isActive } : {};
    const response = await apiClient.patch<any>(`/tickets/telegram/subscribers/${chatId}/status`, payload);
    const resData = response.data;
    return resData?.data || resData;
  },

  /**
   * Fetch consolidated Telegram statistics in a single API call.
   * Endpoint: GET /tickets/telegram/counts
   */
  async getCounts(): Promise<TelegramCounts> {
    const response = await apiClient.get<any>('/tickets/telegram/counts');
    const resData: any = response.data?.data || response.data || {};
    const totalSubscribers = Number(
      resData.totalSubscribers ?? resData.total_subscribers ?? 0
    );
    const totalTelegramInvites = Number(
      resData.totalTelegramInvites ?? resData.total_telegram_invites ?? resData.total_invites ?? 0
    );
    const activeSubscribers = Number(
      resData.activeSubscribers ?? resData.active_subscribers ?? 0
    );
    return {
      totalSubscribers: isNaN(totalSubscribers) ? 0 : totalSubscribers,
      totalTelegramInvites: isNaN(totalTelegramInvites) ? 0 : totalTelegramInvites,
      activeSubscribers: isNaN(activeSubscribers) ? 0 : activeSubscribers,
    };
  },

  /**
   * Fetch total count of Telegram bot invites generated for tenant company.
   * Endpoint: GET /tickets/telegram/invites/total-count
   */
  async getTotalInviteCount(): Promise<number> {
    const response = await apiClient.get<TelegramCountResponse>('/tickets/telegram/invites/total-count');
    const resData: any = response.data;
    if (typeof resData?.total === 'number') return resData.total;
    if (typeof resData?.count === 'number') return resData.count;
    if (typeof resData?.data?.total === 'number') return resData.data.total;
    if (typeof resData?.data?.count === 'number') return resData.data.count;
    if (typeof resData?.data === 'number') return resData.data;
    return 0;
  },

  /**
   * Fetch total count of registered Telegram subscribers for tenant company.
   * Endpoint: GET /tickets/telegram/subscribers/total-count
   */
  async getTotalSubscribersCount(): Promise<number> {
    const response = await apiClient.get<TelegramCountResponse>('/tickets/telegram/subscribers/total-count');
    const resData: any = response.data;
    if (typeof resData?.total === 'number') return resData.total;
    if (typeof resData?.count === 'number') return resData.count;
    if (typeof resData?.data?.total === 'number') return resData.data.total;
    if (typeof resData?.data?.count === 'number') return resData.data.count;
    if (typeof resData?.data === 'number') return resData.data;
    return 0;
  },
};

export default telegramApi;

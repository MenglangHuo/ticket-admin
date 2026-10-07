import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { telegramApi } from '@/api/telegramApi';
import { useSettingsStore } from '@/stores/settingsStore';
import apiClient from '@/api/client';

describe('telegramApi invite link parsing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly extracts flat invite_url from backend response format', async () => {
    const fakeUrl = 'https://t.me/menglang6969Bot?start=randomToken12345';
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        invite_url: fakeUrl,
        success: true,
        message: 'Invite link generated.',
      },
    });

    const result = await telegramApi.generateInviteLink();
    expect(result).toBe(fakeUrl);
  });

  it('correctly extracts nested data.invite_url from envelope format', async () => {
    const fakeUrl = 'https://t.me/menglang6969Bot?start=nestedToken67890';
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        data: {
          invite_url: fakeUrl,
        },
        success: true,
      },
    });

    const result = await telegramApi.generateInviteLink();
    expect(result).toBe(fakeUrl);
  });

  it('returns empty string if neither flat nor nested url is present', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: false,
      },
    });

    const result = await telegramApi.generateInviteLink();
    expect(result).toBe('');
  });
});

describe('telegramApi count metrics parsing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly extracts total invite count from flat and nested responses', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        total: 42,
        success: true,
      },
    });

    const count1 = await telegramApi.getTotalInviteCount();
    expect(count1).toBe(42);

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: {
          total: 15,
        },
        success: true,
      },
    });

    const count2 = await telegramApi.getTotalInviteCount();
    expect(count2).toBe(15);
  });

  it('correctly extracts total subscribers count from flat and nested responses', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        total: 88,
        success: true,
      },
    });

    const count1 = await telegramApi.getTotalSubscribersCount();
    expect(count1).toBe(88);

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: {
          count: 23,
        },
        success: true,
      },
    });

    const count2 = await telegramApi.getTotalSubscribersCount();
    expect(count2).toBe(23);
  });

  it('returns 0 when response contains no counts', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
      },
    });

    const count = await telegramApi.getTotalInviteCount();
    expect(count).toBe(0);
  });

  it('correctly extracts consolidated counts in a single call via getCounts', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        totalSubscribers: 50,
        totalTelegramInvites: 12,
        success: true,
      },
    });

    const counts = await telegramApi.getCounts();
    expect(counts.totalSubscribers).toBe(50);
    expect(counts.totalTelegramInvites).toBe(12);

    // Also test with snake_case and nested data envelope
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: {
          total_subscribers: 30,
          total_telegram_invites: 7,
        },
        success: true,
      },
    });

    const counts2 = await telegramApi.getCounts();
    expect(counts2.totalSubscribers).toBe(30);
    expect(counts2.totalTelegramInvites).toBe(7);
  });
});

describe('telegramApi getSubscribers with pagination and search', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
    });

    const result = await telegramApi.getSubscribers({
      page: 2,
      per_page: 5,
      search: 'alex',
      status: 'active',
      sort_by: 'telegram_username',
      sort_dir: 'asc',
    });

    expect(getSpy).toHaveBeenCalledWith('/tickets/telegram/subscribers', {
      params: {
        page: 2,
        per_page: 5,
        search: 'alex',
        status: 'active',
        sort_by: 'telegram_username',
        sort_dir: 'asc',
      },
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.telegram_username).toBe('alex_ops');
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.total).toBe(15);
    expect(result.pagination.total_pages).toBe(3);
    expect(result.pagination.has_next).toBe(true);
    expect(result.pagination.has_previous).toBe(true);
  });

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
    });

    const result = await telegramApi.getSubscribers();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.telegram_username).toBe('legacy_user');
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
  });
});

describe('settingsStore endpoint decoupling tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('fetchMetrics calls telegramApi.getCounts', async () => {
    const countsSpy = vi.spyOn(telegramApi, 'getCounts').mockResolvedValue({
      totalSubscribers: 10,
      totalTelegramInvites: 5,
      activeSubscribers: 8,
    });

    const store = useSettingsStore();
    await store.fetchMetrics();

    expect(countsSpy).toHaveBeenCalledTimes(1);
    expect(store.totalSubscribersCount).toBe(10);
    expect(store.totalInvitesCount).toBe(5);
    expect(store.activeSubscribersCount).toBe(8);
  });

  it('fetchSubscribers does NOT call telegramApi.getCounts during search/filtering', async () => {
    const countsSpy = vi.spyOn(telegramApi, 'getCounts').mockResolvedValue({
      totalSubscribers: 10,
      totalTelegramInvites: 5,
      activeSubscribers: 8,
    });

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
    });

    const store = useSettingsStore();
    await store.fetchSubscribers({ search: 'alex', status: 'active' }, true);

    expect(subscribersSpy).toHaveBeenCalledTimes(1);
    // CRITICAL: getCounts must not be called during search / filter
    expect(countsSpy).not.toHaveBeenCalled();
    expect(store.subscribers).toHaveLength(1);
  });
});


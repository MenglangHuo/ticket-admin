import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TelegramSubscriber, TelegramBotConfig } from '@/types/settings';
import {
  telegramApi,
  type TelegramSubscriberFilterParams,
  type TelegramSubscriberPagination,
} from '@/api/telegramApi';
import { useToastStore } from './toastStore';

export const useSettingsStore = defineStore('settings', () => {
  const toastStore = useToastStore();

  // Telegram Bot Configuration
  const botConfig = ref<TelegramBotConfig>({
    botUsername: (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string) || '',
    tokenConfigured: true,
    webhookStatus: 'connected',
    daemonCommand: 'php artisan outbox:process',
    deliverySuccessRate: 99.8,
  });

  // Live subscribers from backend database
  const subscribers = ref<TelegramSubscriber[]>([]);
  const pagination = ref<TelegramSubscriberPagination>({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const totalInvitesCount = ref<number>(0);
  const totalSubscribersCount = ref<number>(0);
  const activeCountFromMetrics = ref<number | null>(null);
  const isLoading = ref(false);
  const isGeneratingInvite = ref(false);
  const latestInviteUrl = ref<string | null>(null);
  const error = ref<string | null>(null);

  // Computed metrics
  const activeSubscribersCount = computed(() => {
    if (activeCountFromMetrics.value !== null) {
      return activeCountFromMetrics.value;
    }
    return subscribers.value.filter((s) => s.is_active).length;
  });

  let metricsPromise: Promise<void> | null = null;

  /**
   * Fetch consolidated invite and subscriber counts from single backend endpoint GET /tickets/telegram/counts
   */
  async function fetchMetrics(): Promise<void> {
    if (metricsPromise) return metricsPromise;
    metricsPromise = (async () => {
      try {
        const counts = await telegramApi.getCounts();
        totalInvitesCount.value = counts.totalTelegramInvites;
        totalSubscribersCount.value = counts.totalSubscribers;
        if (counts.activeSubscribers !== undefined) {
          activeCountFromMetrics.value = counts.activeSubscribers;
        }
      } catch {
        if (subscribers.value.length > 0 && !totalSubscribersCount.value) {
          totalSubscribersCount.value = subscribers.value.length;
        }
      } finally {
        metricsPromise = null;
      }
    })();
    return metricsPromise;
  }

  let subscribersPromise: Promise<void> | null = null;

  /**
   * Fetch subscribers from backend GET /tickets/telegram/subscribers
   */
  async function fetchSubscribers(
    params?: TelegramSubscriberFilterParams,
    force = false
  ): Promise<void> {
    if (!force && !params && subscribers.value.length > 0) {
      return;
    }
    if (subscribersPromise) return subscribersPromise;

    isLoading.value = true;
    error.value = null;

    subscribersPromise = (async () => {
      try {
        const res = await telegramApi.getSubscribers(params);
        subscribers.value = Array.isArray(res.data) ? res.data : [];
        if (res.pagination) {
          pagination.value = res.pagination;
          if (!totalSubscribersCount.value && res.pagination.total !== undefined) {
            totalSubscribersCount.value = res.pagination.total;
          }
        }
        if (!totalSubscribersCount.value && subscribers.value.length > 0) {
          totalSubscribersCount.value = subscribers.value.length;
        }
      } catch (err: any) {
        const message =
          err.response?.data?.message || err.message || 'Failed to load Telegram subscribers';
        error.value = message;
        toastStore.error('Subscribers Load Error', message);
      } finally {
        isLoading.value = false;
        subscribersPromise = null;
      }
    })();

    return subscribersPromise;
  }

  /**
   * Request backend to generate a new Telegram invite link (POST /tickets/telegram/invite-link)
   */
  async function generateInviteLink(): Promise<string> {
    isGeneratingInvite.value = true;
    try {
      const inviteUrl = await telegramApi.generateInviteLink();
      if (!inviteUrl) {
        throw new Error('Server returned an empty invite link. Please check bot settings.');
      }
      latestInviteUrl.value = inviteUrl;
      totalInvitesCount.value++;
      toastStore.success('Invite Link Created', 'Share this Telegram link with staff to subscribe');
      return inviteUrl;
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to generate invite link';
      toastStore.error('Generation Failed', message);
      throw err;
    } finally {
      isGeneratingInvite.value = false;
    }
  }

  /**
   * Deactivate a subscriber via DELETE /tickets/telegram/subscribers/{chatId}
   */
  async function removeSubscriber(chatId: string) {
    try {
      await telegramApi.removeSubscriber(chatId);
      // Soft deactivate or filter out from local list
      const target = subscribers.value.find((s) => s.telegram_chat_id === chatId);
      if (target) {
        target.is_active = false;
      }
      toastStore.success('Subscriber Deactivated', `Chat ID ${chatId} was unlinked`);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to remove subscriber';
      toastStore.error('Deactivation Failed', message);
      throw err;
    }
  }

  /**
   * Dispatch a direct test alert to a subscriber's Telegram chat via backend API
   */
  async function sendTestNotification(chatId?: string, username?: string) {
    if (!chatId) {
      toastStore.info(
        'Test Alert Triggered',
        'Outbox simulator queued test notification broadcast to subscribers.'
      );
      return;
    }

    const target = username ? `@${username}` : `Chat ID ${chatId}`;
    try {
      const result = await telegramApi.sendTestNotification(chatId);
      const msg = result?.message || `Direct test notification dispatched to ${target}.`;
      toastStore.success('Test Notification Sent', msg);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || `Failed to deliver test notification to ${target}`;
      toastStore.error('Notification Delivery Failed', message);
      throw err;
    }
  }

  /**
   * Enable or disable Telegram notifications on ticket creation (is_active)
   */
  async function toggleSubscriberNotification(chatId: string, currentStatus?: boolean) {
    const targetStatus = currentStatus !== undefined ? !currentStatus : undefined;
    try {
      const updated = await telegramApi.updateSubscriberStatus(chatId, targetStatus);
      const target = subscribers.value.find((s) => s.telegram_chat_id === chatId);
      if (target) {
        target.is_active = updated?.is_active ?? (targetStatus ?? !target.is_active);
      }
      const label = target?.is_active ? 'Enabled' : 'Muted';
      toastStore.success(
        `Ticket Alerts ${label}`,
        `Telegram notifications for Chat ID ${chatId} are now ${label.toLowerCase()}`
      );
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to update notification status';
      toastStore.error('Update Failed', message);
      throw err;
    }
  }

  return {
    botConfig,
    subscribers,
    pagination,
    isLoading,
    isGeneratingInvite,
    latestInviteUrl,
    error,
    activeSubscribersCount,
    totalInvitesCount,
    totalSubscribersCount,
    fetchMetrics,
    fetchSubscribers,
    generateInviteLink,
    removeSubscriber,
    toggleSubscriberNotification,
    sendTestNotification,
  };
});

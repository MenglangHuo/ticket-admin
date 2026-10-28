import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  TelegramSubscriber,
  TelegramBotConfig,
  TelegramBotInfo,
  TelegramBotConfigPayload,
  TelegramUnusedInvite,
  TelegramInviteFilterParams,
} from '@/types/settings'
import {
  telegramApi,
  type TelegramSubscriberFilterParams,
  type TelegramSubscriberPagination,
} from '@/api/telegramApi'
import { useToastStore } from './toastStore'

export const useSettingsStore = defineStore('settings', () => {
  const toastStore = useToastStore()

  // Telegram Bot Configuration
  const botConfig = ref<TelegramBotConfig>({
    botUsername: '',
    tokenConfigured: true,
    webhookStatus: 'connected',
    daemonCommand: 'php artisan outbox:process',
    deliverySuccessRate: 99.8,
  })

  // Full Telegram Bot Info from /ticket/telegram/info
  const botInfo = ref<TelegramBotInfo | null>(null)
  const isBotInfoLoading = ref(false)
  const isSavingBotConfig = ref(false)
  const botInfoError = ref<string | null>(null)

  // Live subscribers from backend database
  const subscribers = ref<TelegramSubscriber[]>([])
  const pagination = ref<TelegramSubscriberPagination>({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  })
  const totalInvitesCount = ref<number>(0)
  const totalSubscribersCount = ref<number>(0)
  const activeCountFromMetrics = ref<number | null>(null)
  const isLoading = ref(false)
  const isGeneratingInvite = ref(false)
  const latestInviteUrl = ref<string | null>(null)
  const error = ref<string | null>(null)

  // Unused Telegram Bot Invites from /ticket/telegram/invites/unused
  const unusedInvites = ref<TelegramUnusedInvite[]>([])
  const invitesPagination = ref<TelegramSubscriberPagination>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  })
  const isInvitesLoading = ref(false)
  const invitesError = ref<string | null>(null)

  // Computed metrics
  const activeSubscribersCount = computed(() => {
    if (activeCountFromMetrics.value !== null) {
      return activeCountFromMetrics.value
    }
    return subscribers.value.filter((s) => s.is_active).length
  })

  let metricsPromise: Promise<void> | null = null

  /**
   * Fetch consolidated invite and subscriber counts from single backend endpoint GET /tickets/telegram/counts
   */
  async function fetchMetrics(): Promise<void> {
    if (metricsPromise) return metricsPromise
    metricsPromise = (async () => {
      try {
        const counts = await telegramApi.getCounts()
        totalInvitesCount.value = counts.totalTelegramInvites
        totalSubscribersCount.value = counts.totalSubscribers
        if (counts.activeSubscribers !== undefined) {
          activeCountFromMetrics.value = counts.activeSubscribers
        }
      } catch {
        if (subscribers.value.length > 0 && !totalSubscribersCount.value) {
          totalSubscribersCount.value = subscribers.value.length
        }
      } finally {
        metricsPromise = null
      }
    })()
    return metricsPromise
  }

  let subscribersPromise: Promise<void> | null = null

  /**
   * Fetch subscribers from backend GET /tickets/telegram/subscribers
   */
  async function fetchSubscribers(
    params?: TelegramSubscriberFilterParams,
    force = false,
  ): Promise<void> {
    if (!force && !params && subscribers.value.length > 0) {
      return
    }
    if (!force && subscribersPromise) return subscribersPromise

    isLoading.value = true
    error.value = null

    subscribersPromise = (async () => {
      try {
        const res = await telegramApi.getSubscribers(params)
        subscribers.value = Array.isArray(res.data) ? res.data : []
        if (res.pagination) {
          pagination.value = res.pagination
          const isFiltered = Boolean(
            params?.search ||
              (params?.status && params.status !== 'all') ||
              (params?.subscriber_type && params.subscriber_type !== 'all') ||
              (params?.type && params.type !== 'all'),
          )
          if (!isFiltered && res.pagination.total !== undefined) {
            totalSubscribersCount.value = res.pagination.total
          }
        }
        if (!totalSubscribersCount.value && subscribers.value.length > 0) {
          totalSubscribersCount.value = subscribers.value.length
        }
      } catch (err: any) {
        const message =
          err.response?.data?.message || err.message || 'Failed to load Telegram subscribers'
        error.value = message
        toastStore.error('Subscribers Load Error', message)
      } finally {
        isLoading.value = false
        subscribersPromise = null
      }
    })()

    return subscribersPromise
  }

  let unusedInvitesPromise: Promise<void> | null = null

  /**
   * Fetch unused Telegram invite links from backend GET /ticket/telegram/invites/unused
   */
  async function fetchUnusedInvites(
    params?: TelegramInviteFilterParams,
    force = false,
  ): Promise<void> {
    if (!force && !params && unusedInvites.value.length > 0) {
      return
    }
    if (!force && unusedInvitesPromise) return unusedInvitesPromise

    isInvitesLoading.value = true
    invitesError.value = null

    unusedInvitesPromise = (async () => {
      try {
        const res = await telegramApi.getUnusedInvites(params)
        unusedInvites.value = Array.isArray(res.data) ? res.data : []
        if (res.pagination) {
          invitesPagination.value = res.pagination
          if (!params?.search && (!params?.status || params.status === 'all') && res.pagination.total !== undefined) {
            totalInvitesCount.value = res.pagination.total
          }
        }
        if (res.bot_username && !botConfig.value.botUsername) {
          botConfig.value.botUsername = res.bot_username
        }
      } catch (err: any) {
        const message =
          err.response?.data?.message || err.message || 'Failed to load unused Telegram invite links'
        invitesError.value = message
        toastStore.error('Invite Links Load Error', message)
      } finally {
        isInvitesLoading.value = false
        unusedInvitesPromise = null
      }
    })()

    return unusedInvitesPromise
  }

  /**
   * Request backend to generate a new Telegram invite link (POST /tickets/telegram/invite-link)
   */
  async function generateInviteLink(): Promise<string> {
    isGeneratingInvite.value = true
    try {
      const inviteUrl = await telegramApi.generateInviteLink()
      if (!inviteUrl) {
        throw new Error('Server returned an empty invite link. Please check bot settings.')
      }
      latestInviteUrl.value = inviteUrl
      totalInvitesCount.value++
      toastStore.success('Invite Link Created', 'Share this Telegram link with staff to subscribe')
      // Refresh unused invites list so newly generated invite is immediately available in the table
      fetchUnusedInvites(undefined, true).catch(() => {})
      return inviteUrl
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to generate invite link'
      toastStore.error('Generation Failed', message)
      throw err
    } finally {
      isGeneratingInvite.value = false
    }
  }

  /**
   * Refresh an expired (or existing) Telegram invite link via POST /ticket/telegram/invites/{id}/refresh
   */
  async function refreshInvite(id: number | string): Promise<TelegramUnusedInvite> {
    try {
      const res = await telegramApi.refreshInvite(id)
      const updated = res.data

      // Update item in local unusedInvites list
      const index = unusedInvites.value.findIndex((inv) => String(inv.id) === String(id))
      if (index !== -1 && updated) {
        unusedInvites.value[index] = { ...unusedInvites.value[index], ...updated }
      }

      toastStore.success(
        'Invite Refreshed',
        res.message || 'Telegram invite link has been renewed successfully',
      )
      return updated
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to refresh invite link'
      toastStore.error('Refresh Failed', message)
      throw err
    }
  }

  /**
   * Delete a subscriber via DELETE /api/ticket/telegram/subscribers/{identifier}
   */
  async function deleteSubscriber(identifier: string | number, subscriberType?: string) {
    try {
      const res = await telegramApi.deleteSubscriber(identifier, subscriberType)
      // Remove subscriber from local list
      const targetIndex = subscribers.value.findIndex(
        (s) => String(s.id) === String(identifier) || s.telegram_chat_id === String(identifier),
      )
      if (targetIndex !== -1) {
        subscribers.value.splice(targetIndex, 1)
      }
      if (totalSubscribersCount.value > 0) {
        totalSubscribersCount.value = Math.max(0, totalSubscribersCount.value - 1)
      }
      if (pagination.value && pagination.value.total > 0) {
        pagination.value.total = Math.max(0, pagination.value.total - 1)
      }
      const successMsg =
        res?.message || `Subscriber ${identifier} removed successfully from database.`
      toastStore.success('Subscriber Deleted', successMsg)
      return res
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to delete subscriber'
      toastStore.error('Deletion Failed', message)
      throw err
    }
  }

  /**
   * Backwards-compatible alias for deleteSubscriber
   */
  async function removeSubscriber(identifier: string | number, subscriberType?: string) {
    return deleteSubscriber(identifier, subscriberType)
  }

  /**
   * Dispatch a direct test alert to a subscriber's Telegram chat via backend API
   */
  async function sendTestNotification(chatId?: string, username?: string) {
    if (!chatId) {
      toastStore.info(
        'Test Alert Triggered',
        'Outbox simulator queued test notification broadcast to subscribers.',
      )
      return
    }

    const target = username ? `@${username}` : `Chat ID ${chatId}`
    try {
      const result = await telegramApi.sendTestNotification(chatId)
      const msg = result?.message || `Direct test notification dispatched to ${target}.`
      toastStore.success('Test Notification Sent', msg)
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        `Failed to deliver test notification to ${target}`
      toastStore.error('Notification Delivery Failed', message)
      throw err
    }
  }

  /**
   * Enable or disable Telegram notifications on ticket creation (is_active)
   */
  async function toggleSubscriberNotification(chatId: string, currentStatus?: boolean) {
    const targetStatus = currentStatus !== undefined ? !currentStatus : undefined
    try {
      const updated = await telegramApi.updateSubscriberStatus(chatId, targetStatus)
      const target = subscribers.value.find((s) => s.telegram_chat_id === chatId)
      if (target) {
        target.is_active = updated?.is_active ?? targetStatus ?? !target.is_active
      }
      const label = target?.is_active ? 'Enabled' : 'Muted'
      toastStore.success(
        `Ticket Alerts ${label}`,
        `Telegram notifications for Chat ID ${chatId} are now ${label.toLowerCase()}`,
      )
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to update notification status'
      toastStore.error('Update Failed', message)
      throw err
    }
  }

  let botInfoPromise: Promise<TelegramBotInfo | null> | null = null

  /**
   * Fetch Telegram Bot information from GET /ticket/telegram/info
   */
  async function fetchBotInfo(force = false): Promise<TelegramBotInfo | null> {
    if (!force && botInfo.value) {
      return botInfo.value
    }
    if (botInfoPromise) return botInfoPromise

    isBotInfoLoading.value = true
    botInfoError.value = null

    botInfoPromise = (async () => {
      try {
        const res = await telegramApi.getBotInfo()
        const info = res?.data || null
        botInfo.value = info
        if (info?.bot_username) {
          botConfig.value.botUsername = info.bot_username
        }
        if (info) {
          botConfig.value.tokenConfigured = Boolean(
            info.is_configured ?? info.bot_token ?? info.bot_token_masked,
          )
        }
        return info
      } catch (err: any) {
        const message =
          err.response?.data?.message || err.message || 'Failed to retrieve Telegram bot info'
        botInfoError.value = message
        return null
      } finally {
        isBotInfoLoading.value = false
        botInfoPromise = null
      }
    })()

    return botInfoPromise
  }

  /**
   * Update Telegram Bot configuration via PUT /ticket/telegram/config
   */
  async function updateBotConfig(payload: TelegramBotConfigPayload): Promise<TelegramBotInfo> {
    isSavingBotConfig.value = true
    try {
      const res = await telegramApi.updateBotConfig(payload)
      const updated = res.data
      botInfo.value = updated
      if (updated?.bot_username) {
        botConfig.value.botUsername = updated.bot_username
      }
      if (updated) {
        botConfig.value.tokenConfigured = Boolean(
          updated.is_configured ?? updated.bot_token ?? updated.bot_token_masked,
        )
      }
      if (updated?.migration?.mode === 'new_bot_migrated') {
        toastStore.success(
          'Subscribers Notified',
          updated.migration.message || '1-click migration broadcast sent to active subscribers.',
        )
      } else if (updated?.migration?.mode === 'token_updated_same_bot') {
        toastStore.info(
          'Token Rotated',
          updated.migration.message || 'Same bot token updated. All subscribers remain active.',
        )
      } else {
        toastStore.success(
          'Bot Configuration Saved',
          res.message || 'Telegram Bot information was updated successfully.',
        )
      }
      return updated
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to update Telegram Bot configuration'
      toastStore.error('Update Failed', message)
      throw err
    } finally {
      isSavingBotConfig.value = false
    }
  }

  /**
   * Broadcast migration link to active subscribers via previous bot
   */
  async function broadcastMigration(oldToken?: string, newUsername?: string) {
    try {
      const res = await telegramApi.broadcastMigration({
        old_bot_token: oldToken,
        new_bot_username: newUsername,
      })
      toastStore.success('Migration Broadcast Sent', res.message || 'Broadcast completed successfully.')
      return res
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send migration broadcast'
      toastStore.error('Migration Failed', msg)
      throw err
    }
  }

  return {
    botConfig,
    botInfo,
    isBotInfoLoading,
    isSavingBotConfig,
    botInfoError,
    subscribers,
    pagination,
    isLoading,
    isGeneratingInvite,
    latestInviteUrl,
    error,
    activeSubscribersCount,
    totalInvitesCount,
    totalSubscribersCount,
    unusedInvites,
    invitesPagination,
    isInvitesLoading,
    invitesError,
    fetchMetrics,
    fetchSubscribers,
    fetchUnusedInvites,
    fetchBotInfo,
    updateBotConfig,
    broadcastMigration,
    generateInviteLink,
    refreshInvite,
    deleteSubscriber,
    removeSubscriber,
    toggleSubscriberNotification,
    sendTestNotification,
  }
})

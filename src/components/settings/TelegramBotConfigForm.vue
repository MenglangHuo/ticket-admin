<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import type { TelegramBotConfigPayload } from '@/types/settings'
import {
  Key,
  RotateCcw,
  RotateCw,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  Save,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  X,
} from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'goToSubscribers'): void
}>()

const settingsStore = useSettingsStore()
const toastStore = useToastStore()

// Local editable form state — keeping only bot_username and bot_token
const form = ref<{
  bot_username: string
  bot_token: string
  is_active?: boolean
}>({
  bot_username: '',
  bot_token: '',
  is_active: true,
})

// UI state
const showToken = ref(false)
const copiedKey = ref<string | null>(null)
const initialSnapshot = ref<string>('')
const validationErrors = ref<{ [key: string]: string }>({})

// Populate form from store
function populateFromStore() {
  const info = settingsStore.botInfo
  if (!info) return

  form.value = {
    bot_username: info.bot_username || '',
    bot_token: info.bot_token || '',
    is_active: true,
  }
  initialSnapshot.value = JSON.stringify(form.value)
  validationErrors.value = {}
}

// Watch store botInfo changes to sync form if not dirty
watch(
  () => settingsStore.botInfo,
  (newInfo) => {
    if (newInfo && (!initialSnapshot.value || !isDirty.value)) {
      populateFromStore()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (!settingsStore.botInfo) {
    await settingsStore.fetchBotInfo()
  }
  populateFromStore()
})

// Dirty state tracking (only tracks bot_username and bot_token)
const isDirty = computed(() => {
  if (!initialSnapshot.value) return false
  return JSON.stringify(form.value) !== initialSnapshot.value
})

// Check if a new bot username is being configured
const isNewBotDetected = computed(() => {
  const current = (settingsStore.botInfo?.bot_username || '').trim().replace(/^@/, '').toLowerCase()
  const entered = form.value.bot_username.trim().replace(/^@/, '').toLowerCase()
  return Boolean(current && entered && current !== entered)
})

interface MigrationNotice {
  message: string
  url: string
  stats?: {
    total_subscribers?: number
    sent?: number
    failed?: number
    errors?: string[]
  }
}

// One-time banner state: shown only right after replacing with a new bot; hidden on refresh or dismiss
const migrationNotice = ref<MigrationNotice | null>(null)

// Validation
function validateForm(): boolean {
  const errors: { [key: string]: string } = {}

  const cleanUsername = form.value.bot_username.trim().replace(/^@/, '')
  if (!cleanUsername) {
    errors.bot_username = 'Bot username is required.'
  } else if (!cleanUsername.toLowerCase().endsWith('bot')) {
    errors.bot_username = 'Telegram bot username usually ends with "bot" (e.g. menglang6969Bot).'
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

// Save Configuration via PUT /ticket/telegram/config
async function handleSave() {
  if (!validateForm()) {
    toastStore.warning('Form Validation', 'Please check the required fields before saving.')
    return
  }

  try {
    const currentInfo = settingsStore.botInfo

    // Construct payload containing only user-managed bot credentials and active status.
    // Static server-side parameters (chat_id, webhook_secret, invite_expiry_days) are not sent to the API.
    const payload: TelegramBotConfigPayload = {
      bot_username: form.value.bot_username.trim().replace(/^@/, ''),
      is_active: currentInfo?.is_active ?? true,
    }

    const token = (form.value.bot_token || '').trim() || currentInfo?.bot_token
    if (token) {
      payload.bot_token = token
    }

    const updated = await settingsStore.updateBotConfig(payload)
    if (updated) {
      initialSnapshot.value = JSON.stringify(form.value)

      // Only display the 1-click rejoin link ONETIME right after replacing with a new bot
      const rejoinLink =
        updated.subscriber_rejoin_link ||
        updated.rejoin_link ||
        updated.migration?.subscriber_rejoin_link ||
        updated.migration?.rejoin_link ||
        updated.migration?.migration_url ||
        updated.migration_url ||
        updated.invite_url ||
        (updated.migration?.mode === 'new_bot_migrated' && updated.bot_username
          ? `https://t.me/${updated.bot_username.trim().replace(/^@/, '')}`
          : null)

      if (updated.migration?.mode === 'new_bot_migrated' && rejoinLink) {
        migrationNotice.value = {
          message:
            updated.migration.message ||
            `New bot @${updated.bot_username || form.value.bot_username} configured. Existing subscribers must click this link to join the new bot.`,
          url: rejoinLink,
          stats: updated.migration.stats,
        }
      } else {
        // Normal save or same bot token rotated: no rejoin banner needed
        migrationNotice.value = null
      }

      emit('saved')
    }
  } catch (err: any) {
    console.error('Error saving bot config:', err)
  }
}

// Reset form back to loaded snapshot
function handleReset() {
  populateFromStore()
  toastStore.info('Changes Discarded', 'Reverted form values back to current bot configuration.')
}

// Refresh from server via GET /ticket/telegram/info
async function handleRefresh() {
  try {
    await settingsStore.fetchBotInfo(true)
    populateFromStore()
    migrationNotice.value = null
    toastStore.success('Refreshed', 'Telegram bot configuration refreshed from server.')
  } catch (err: any) {
    toastStore.error('Refresh Failed', err?.message || 'Failed to refresh bot info.')
  }
}

// Copy helper
async function copyValue(val: string, key: string, label: string) {
  if (!val) return
  let copied = false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(val)
      copied = true
    }
  } catch {
    // Fallback
  }

  if (!copied) {
    try {
      const el = document.createElement('textarea')
      el.value = val
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      copied = document.execCommand('copy')
      document.body.removeChild(el)
    } catch {
      copied = false
    }
  }

  if (copied) {
    copiedKey.value = key
    toastStore.success('Copied to Clipboard', `${label} copied.`)
    setTimeout(() => {
      if (copiedKey.value === key) {
        copiedKey.value = null
      }
    }, 2000)
  } else {
    toastStore.error('Copy Failed', 'Unable to copy automatically.')
  }
}
</script>

<template>
  <div class="space-y-6 w-full animate-fade-in">
    <!-- Top Summary & Control Strip -->

    <!-- Loading Skeleton State -->
    <div
      v-if="settingsStore.isBotInfoLoading && !settingsStore.botInfo"
      class="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3"
    >
      <div
        class="w-10 h-10 mx-auto rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 animate-spin"
      >
        <RotateCw class="w-5 h-5" />
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400">Loading Telegram bot settings...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="settingsStore.botInfoError && !settingsStore.botInfo"
      class="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-3"
    >
      <div class="flex items-center gap-2 font-bold text-sm text-rose-800 dark:text-rose-200">
        <AlertCircle class="w-4 h-4 text-rose-500" />
        Failed to load Telegram bot configuration
      </div>
      <p>{{ settingsStore.botInfoError }}</p>
      <button
        type="button"
        @click="handleRefresh"
        class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
      >
        <RotateCw class="w-3.5 h-3.5" />
        Retry
      </button>
    </div>

    <!-- Main Configuration Form with only the 2 fields -->
    <form v-else @submit.prevent="handleSave" class="space-y-6">
      <div
        class="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-6"
      >
        <div class="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Key class="w-4 h-4 text-indigo-500" />
              <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Bot Information & Authentication
              </h3>
            </div>
            <!-- Status badges -->
            <div class="flex items-center gap-2">
              <span
                v-if="settingsStore.botInfo?.is_active"
                class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60"
              >
                <CheckCircle2 class="w-3 h-3" />
                Bot Active
              </span>
              <span
                v-if="settingsStore.botInfo?.is_configured"
                class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/60"
              >
                <ShieldCheck class="w-3 h-3" />
                Configured
              </span>
            </div>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specify your Telegram bot username and secret API authentication token.
          </p>
        </div>

        <!-- One-time Migration Status & Subscriber Link Card (shown only right after replacing bot) -->
        <div
          v-if="migrationNotice"
          class="p-4 sm:p-5 rounded-2xl text-xs space-y-3.5 border bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100 shadow-xs animate-fade-in"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span class="font-bold text-[13px] text-emerald-900 dark:text-emerald-100">
                  {{ migrationNotice.message }}
                </span>
              </div>
              <p class="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed pl-6">
                Under Telegram platform rules, a new bot cannot send direct messages to users until they start a chat with it. Please copy and share this link to all existing subscribers so they can connect with your new bot.
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                v-if="migrationNotice.stats?.sent"
                class="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 font-semibold text-emerald-700 dark:text-emerald-300"
              >
                {{ migrationNotice.stats.sent }} subscribers notified via old bot
              </span>
              <button
                type="button"
                @click="migrationNotice = null"
                class="p-1 rounded-lg text-emerald-700/60 hover:text-emerald-800 dark:text-emerald-400/60 dark:hover:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                title="Dismiss notice"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Migration Clickable Link Row -->
          <div
            v-if="migrationNotice.url"
            class="pt-3 border-t border-emerald-200/70 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-200 font-semibold">
                <span>Subscriber Rejoin Link:</span>
                <span class="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">(Copy and share this to all existing subscribers)</span>
              </div>
              <div class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/50">
                <p class="font-mono text-xs text-emerald-700 dark:text-emerald-300 truncate select-all">
                  {{ migrationNotice.url }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                @click="copyValue(migrationNotice.url, 'migration_link', 'Subscriber Rejoin Link')"
                class="h-9 px-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <Check v-if="copiedKey === 'migration_link'" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span>{{ copiedKey === 'migration_link' ? 'Copied Link' : 'Copy Link' }}</span>
              </button>

              <a
                :href="migrationNotice.url"
                target="_blank"
                rel="noopener noreferrer"
                class="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-all"
              >
                <span>Open in Telegram</span>
                <ExternalLink class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Field 1: Bot Username -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label
                class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
              >
                <span>Bot Username</span>
                <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] text-slate-400">Registered with @BotFather</span>
            </div>

            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono text-sm font-semibold"
              >
                @
              </div>
              <input
                v-model="form.bot_username"
                type="text"
                placeholder="menglang6969Bot"
                autocomplete="off"
                class="w-full h-10 pl-8 pr-9 rounded-xl text-xs sm:text-[13px] bg-slate-50/70 dark:bg-slate-950/70 text-slate-900 dark:text-white placeholder:text-slate-400 border transition-all focus:outline-none focus:bg-white dark:focus:bg-slate-950"
                :class="
                  validationErrors.bot_username
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                "
              />
              <button
                v-if="form.bot_username"
                type="button"
                @click="
                  copyValue(
                    `@${form.bot_username.trim().replace(/^@/, '')}`,
                    'username',
                    'Username',
                  )
                "
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy Bot Username"
              >
                <Check v-if="copiedKey === 'username'" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <p v-if="validationErrors.bot_username" class="text-[11px] text-rose-500 font-medium">
              {{ validationErrors.bot_username }}
            </p>
            <p v-else class="text-[11px] text-slate-500 dark:text-slate-400">
              Unique handle identifying your Telegram bot in notifications and staff invite links.
            </p>

            <p
              v-if="isNewBotDetected"
              class="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1 font-medium mt-1"
            >
              <AlertCircle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Switching bots will automatically send a 1-click migration invite to active subscribers via your current bot.</span>
            </p>
          </div>

          <!-- Field 2: Bot API Token -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label
                class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
              >
                <span>Bot API Token</span>
                <span class="text-rose-500">*</span>
              </label>

              <!-- Masked Indicator if available -->
              <span
                v-if="settingsStore.botInfo?.bot_token_masked"
                class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700"
                title="Current token on server"
              >
                Current: {{ settingsStore.botInfo.bot_token_masked }}
              </span>
            </div>

            <div class="relative">
              <input
                v-model="form.bot_token"
                :type="showToken ? 'text' : 'password'"
                placeholder="5453551747:AAHwNAd3BjrbqE5gLrK9kbAPQOp22Zmcfs4"
                autocomplete="off"
                spellcheck="false"
                class="w-full h-10 pl-3.5 pr-18 font-mono rounded-xl text-xs sm:text-[13px] bg-slate-50/70 dark:bg-slate-950/70 text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-950"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  @click="showToken = !showToken"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  :title="showToken ? 'Hide token' : 'Show token'"
                >
                  <EyeOff v-if="showToken" class="w-3.5 h-3.5" />
                  <Eye v-else class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="form.bot_token"
                  type="button"
                  @click="copyValue(form.bot_token, 'token', 'Bot Token')"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Copy Bot Token"
                >
                  <Check v-if="copiedKey === 'token'" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Issued by Telegram's @BotFather. Keep this credential strictly secure and
              confidential.
            </p>
          </div>
        </div>
      </div>

      <!-- Sticky Action Bar with Dirty Banner -->
      <div
        class="sticky bottom-2 z-10 p-3 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2">
          <!-- Dirty indicator -->
          <div
            v-if="isDirty"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200/90 dark:border-amber-500/30 animate-pulse"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Unsaved Changes
          </div>
          <div
            v-else
            class="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-1"
          >
            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
            Configuration synced with server
          </div>
        </div>

        <div class="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
          <!-- Discard / Reset Button -->
          <button
            type="button"
            @click="handleReset"
            :disabled="!isDirty || settingsStore.isSavingBotConfig"
            class="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Discard Changes</span>
          </button>

          <!-- Save Button -->
          <button
            type="submit"
            :disabled="!isDirty || settingsStore.isSavingBotConfig"
            class="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-2"
          >
            <span
              v-if="settingsStore.isSavingBotConfig"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"
            ></span>
            <Save v-else class="w-3.5 h-3.5 shrink-0" />
            <span>{{ settingsStore.isSavingBotConfig ? 'Saving...' : 'Save Configuration' }}</span>
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

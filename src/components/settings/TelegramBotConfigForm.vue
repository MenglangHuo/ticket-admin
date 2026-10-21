<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import type { TelegramBotConfigPayload } from '@/types/settings'
import {
  Bot,
  Key,
  RotateCcw,
  RotateCw,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Database,
  Save,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'goToSubscribers'): void
}>()

const settingsStore = useSettingsStore()
const toastStore = useToastStore()

// Default background invite expiry duration (7 days)
const DEFAULT_INVITE_EXPIRY_DAYS = 7

// Local editable form state — keeping only bot_username and bot_token
const form = ref<{
  bot_username: string
  bot_token: string
}>({
  bot_username: '',
  bot_token: '',
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

    // Construct full payload, preserving background parameters and defaulting invite_expiry_days to 7
    const payload: TelegramBotConfigPayload = {
      bot_token: (form.value.bot_token || '').trim() || currentInfo?.bot_token || undefined,
      bot_username: form.value.bot_username.trim().replace(/^@/, ''),
      chat_id: currentInfo?.chat_id || '-1004247055582',
      webhook_secret: currentInfo?.webhook_secret || undefined,
      invite_expiry_days: currentInfo?.invite_expiry_days ?? DEFAULT_INVITE_EXPIRY_DAYS,
      is_active: currentInfo?.is_active ?? true,
    }

    const updated = await settingsStore.updateBotConfig(payload)
    if (updated) {
      initialSnapshot.value = JSON.stringify(form.value)
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
    <div
      class="p-4 sm:p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 transition-all"
    >
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <!-- Title & Badges -->
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div
            class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200/90 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-xs shadow-sky-500/10"
          >
            <Bot class="w-6 h-6" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                Telegram Bot Configuration
              </h2>

              <!-- Status Badge (Active / Inactive) -->
              <span
                v-if="settingsStore.botInfo?.is_active ?? true"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-500/20"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Bot Active
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/90 dark:border-amber-500/20"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Bot Paused
              </span>

              <!-- Configured Badge -->
              <span
                v-if="settingsStore.botInfo?.is_configured"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/90 dark:border-blue-500/20"
              >
                <ShieldCheck class="w-3.5 h-3.5 text-blue-500" />
                Configured
              </span>

              <!-- Source Pill -->
              <span
                v-if="settingsStore.botInfo?.source"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700"
              >
                <Database class="w-3 h-3 text-slate-400" />
                {{ settingsStore.botInfo.source }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Configure your Telegram bot username and API token for real-time ticket alerts.
            </p>
          </div>
        </div>

        <!-- Quick Top Actions -->
        <div class="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
          <!-- Refresh Button -->
          <button
            type="button"
            @click="handleRefresh"
            :disabled="settingsStore.isBotInfoLoading"
            class="h-9 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
            title="Reload configuration from server"
          >
            <RotateCw
              class="w-3.5 h-3.5 text-slate-400"
              :class="{ 'animate-spin': settingsStore.isBotInfoLoading }"
            />
            <span>Refresh</span>
          </button>

          <!-- Open in Telegram Button -->
          <a
            v-if="form.bot_username"
            :href="`https://t.me/${form.bot_username.trim().replace(/^@/, '')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="h-9 px-3.5 rounded-xl border border-sky-200/90 dark:border-sky-500/30 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-semibold group"
            title="Open bot conversation on Telegram"
          >
            <Bot class="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform" />
            <span>@{{ form.bot_username.trim().replace(/^@/, '') }}</span>
            <ExternalLink class="w-3 h-3 text-sky-400" />
          </a>
        </div>
      </div>
    </div>

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
          <div class="flex items-center gap-2">
            <Key class="w-4 h-4 text-indigo-500" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bot Information & Authentication
            </h3>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specify your Telegram bot username and secret API authentication token.
          </p>
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

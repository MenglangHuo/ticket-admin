<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import SubscribersTable from '@/components/settings/SubscribersTable.vue'
import GenerateInviteForm from '@/components/settings/GenerateInviteForm.vue'
import TelegramBotConfigForm from '@/components/settings/TelegramBotConfigForm.vue'
import mockService from '@/mocks/mockService'
import { Users, Link as LinkIcon, Bot, ExternalLink, Send, ShieldCheck } from 'lucide-vue-next'

type SettingsTab = 'config' | 'subscribers' | 'invite'

const activeTab = ref<SettingsTab>('config')
const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.fetchMetrics()
  settingsStore.fetchBotInfo()
  if (!settingsStore.subscribers.length) {
    settingsStore.fetchSubscribers()
  }
})
</script>

<template>
  <div class="space-y-4 mx-auto pb-5">
    <!-- Top Header: Title, Live Status & Bot Link (matching DashboardView & ClientsView standard) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
      <div class="flex items-center gap-2.5">
        <div
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/90 dark:border-sky-500/30 shadow-xs shadow-sky-500/10 shrink-0"
        >
          <Send class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Telegram Notifications
            </h1>

            <!-- Bot Live Status Pill -->
            <span
              v-if="settingsStore.botInfo?.is_active ?? true"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-500/20"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gateway Active
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/90 dark:border-amber-500/20"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Gateway Paused
            </span>

            <!-- Configured Badge -->
            <span
              v-if="settingsStore.botInfo?.is_configured"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/90 dark:border-blue-500/20"
            >
              <ShieldCheck class="w-3 h-3 text-blue-500" />
              Configured
            </span>

            <!-- Mock Mode Pill -->
            <span
              v-if="mockService.isMockDataEnabled()"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/90 dark:border-amber-500/20"
            >
              Mock Mode
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure bot credentials, manage authorized staff subscribers, and dispatch real-time
            ticket alerts to Telegram.
          </p>
        </div>
      </div>

      <!-- Telegram Bot Direct Link Button -->
      <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <a
          :href="`https://t.me/${(settingsStore.botInfo?.bot_username || settingsStore.botConfig.botUsername || '').replace(/^@/, '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-700/60 transition-all text-xs font-semibold shadow-2xs group cursor-pointer"
          title="Open bot in Telegram"
        >
          <Bot class="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
          <span
            >@{{
              (
                settingsStore.botInfo?.bot_username ||
                settingsStore.botConfig.botUsername ||
                ''
              ).replace(/^@/, '')
            }}</span
          >
          <ExternalLink class="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
        </a>
      </div>
    </div>

    <!-- Unified White Card Canvas Container matching TicketsView.vue -->
    <div
      class="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 lg:p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors"
    >
      <!-- TAB 1: BOT CONFIGURATION -->
      <div v-show="activeTab === 'config'" class="space-y-4">
        <!-- Top Toolbar with Segmented Switcher -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <!-- Left: Segmented Switcher -->
          <div
            class="inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 select-none self-start shrink-0"
          >
            <button
              type="button"
              @click="activeTab = 'config'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
            >
              <Bot class="w-3.5 h-3.5" />
              <span>Bot Config</span>
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="
                  (settingsStore.botInfo?.is_active ?? true) ? 'bg-emerald-500' : 'bg-amber-500'
                "
              ></span>
            </button>

            <button
              type="button"
              @click="activeTab = 'subscribers'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Users class="w-3.5 h-3.5" />
              <span>Subscribers</span>
              <span
                class="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {{ settingsStore.totalSubscribersCount || settingsStore.subscribers.length }}
              </span>
            </button>

            <button
              type="button"
              @click="activeTab = 'invite'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <LinkIcon class="w-3.5 h-3.5" />
              <span>Generate Invite Link</span>
              <span
                class="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {{ settingsStore.totalInvitesCount }}
              </span>
            </button>
          </div>

          <!-- Right: Quick Links / Helper -->
          <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              @click="activeTab = 'subscribers'"
              class="h-9 px-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-medium"
            >
              <Users class="w-3.5 h-3.5 text-slate-400" />
              <span
                >View Subscribers ({{
                  settingsStore.totalSubscribersCount || settingsStore.subscribers.length
                }})</span
              >
            </button>
          </div>
        </div>

        <!-- Telegram Bot Config Form Component -->
        <TelegramBotConfigForm
          @saved="activeTab = 'config'"
          @goToSubscribers="activeTab = 'subscribers'"
        />
      </div>

      <!-- TAB 2: SUBSCRIBERS TABLE -->
      <SubscribersTable
        v-show="activeTab === 'subscribers'"
        :active-tab="activeTab"
        @change-tab="activeTab = $event"
        @goToInviteTab="activeTab = 'invite'"
      />

      <!-- TAB 3: GENERATE INVITE LINK FORM -->
      <div v-show="activeTab === 'invite'" class="space-y-4">
        <!-- Top Header Toolbar matching SubscribersTable -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <!-- Left: Segmented Switcher -->
          <div
            class="inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 select-none self-start shrink-0"
          >
            <button
              type="button"
              @click="activeTab = 'config'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Bot class="w-3.5 h-3.5" />
              <span>Bot Config</span>
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="
                  (settingsStore.botInfo?.is_active ?? true) ? 'bg-emerald-500' : 'bg-amber-500'
                "
              ></span>
            </button>

            <button
              type="button"
              @click="activeTab = 'subscribers'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Users class="w-3.5 h-3.5" />
              <span>Subscribers</span>
              <span
                class="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {{ settingsStore.totalSubscribersCount || settingsStore.subscribers.length }}
              </span>
            </button>

            <button
              type="button"
              @click="activeTab = 'invite'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
            >
              <LinkIcon class="w-3.5 h-3.5" />
              <span>Generate Invite Link</span>
              <span
                class="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
              >
                {{ settingsStore.totalInvitesCount }}
              </span>
            </button>
          </div>

          <!-- Right: Return to Subscribers button -->
          <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              @click="activeTab = 'subscribers'"
              class="h-9 px-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-medium"
            >
              <Users class="w-3.5 h-3.5 text-slate-400" />
              <span>View Subscribers</span>
            </button>
          </div>
        </div>

        <!-- Generate Invite Form Component -->
        <GenerateInviteForm @done="activeTab = 'subscribers'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settingsStore';
import {
  Bot,
  Users,
  Cpu,
  Plus,
  Zap,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-vue-next';

defineEmits<{
  (e: 'openInviteModal'): void;
}>();

const settingsStore = useSettingsStore();

function handleRefresh() {
  settingsStore.fetchSubscribers();
}

function handleBroadcastTest() {
  settingsStore.sendTestNotification();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Main Header Card -->
    <div
      class="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs ring-1 ring-black/5 dark:ring-white/5 transition-all"
    >
      <!-- Top Subtle Gradient Sheen -->
      <div
        class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 opacity-90"
      ></div>

      <!-- Ambient Decorative Light -->
      <div
        class="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
      ></div>
      <div
        class="absolute -bottom-20 -left-20 w-72 h-72 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none"
      ></div>

      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <!-- Left: Gateway Information & Status Badges -->
        <div class="space-y-3 max-w-2xl">
          <!-- Status Pill Row -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Telegram Bot Pill -->
            <a
              :href="`https://t.me/${settingsStore.botConfig.botUsername.replace(/^@/, '')}`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors group cursor-pointer"
              title="Open bot in Telegram"
            >
              <Bot class="w-3.5 h-3.5 text-sky-500" />
              <span>@{{ settingsStore.botConfig.botUsername.replace(/^@/, '') }}</span>
              <ExternalLink class="w-3 h-3 text-sky-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>

            <!-- Gateway Health Badge -->
            <span
              class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-500/20"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gateway Operational
            </span>

            <!-- Worker Queue Status Pill -->
            <div
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium"
              :title="`Outbox worker: ${settingsStore.botConfig.daemonCommand}`"
            >
              <Cpu class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Worker Active</span>
            </div>
          </div>

          <!-- Main Title & Subtitle -->
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Telegram Notification Gateway
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Instant outbox queue pushes real-time ticket alerts directly to authorized team members' private Telegram chats.
            </p>
          </div>
        </div>

        <!-- Right: Primary Actions Toolbar -->
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          <button
            @click="handleRefresh"
            :disabled="settingsStore.isLoading"
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Reload subscribers from server"
          >
            <RotateCw class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" :class="{ 'animate-spin': settingsStore.isLoading }" />
            <span>Refresh</span>
          </button>

          <button
            @click="handleBroadcastTest"
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200/90 dark:border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Trigger test alert notification"
          >
            <Zap class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Test Alert</span>
          </button>

          <button
            @click="$emit('openInviteModal')"
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus class="w-4 h-4" />
            <span>Generate Invite Link</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Cards Grid -->
      <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <!-- Metric 1: Active Subscribers -->
        <div
          class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-3.5 transition-all hover:border-emerald-400/40"
        >
          <div
            class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs"
          >
            <Users class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white leading-tight">
              {{ settingsStore.activeSubscribersCount }}
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              Active Subscribers
            </div>
          </div>
        </div>

        <!-- Metric 2: Total Registered -->
        <div
          class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-3.5 transition-all hover:border-sky-400/40"
        >
          <div
            class="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200/80 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-2xs"
          >
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white leading-tight">
              {{ settingsStore.subscribers.length }}
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              Total Registered
            </div>
          </div>
        </div>

        <!-- Metric 3: Notification Delivery Channel -->
        <div
          class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-3.5 transition-all hover:border-indigo-400/40"
        >
          <div
            class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs"
          >
            <Bot class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
              Telegram Bot API
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              Direct Push Channel
            </div>
          </div>
        </div>

        <!-- Metric 4: Delivery Queue Pipeline -->
        <div
          class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-3.5 transition-all hover:border-violet-400/40"
        >
          <div
            class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/15 border border-violet-200/80 dark:border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 shadow-2xs"
          >
            <Send class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
              Transactional Outbox
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              Guaranteed Delivery
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

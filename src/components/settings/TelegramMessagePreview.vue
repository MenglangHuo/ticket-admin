<script setup lang="ts">
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import { escapeHtml, sanitizeHtml } from '@/utils/security'
import { Bot, CheckCheck, Eye, FileCode, Send } from 'lucide-vue-next'
import { computed, ref } from 'vue'

const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const activeEventType = ref<'created' | 'status_changed'>('created')
const selectedPriority = ref<'critical' | 'high' | 'medium' | 'low'>('critical')

const priorityEmojis: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
}

const ticketKey = ref('TCK-1089')
const ticketTitle = ref('Client API: Payment gateway timeout on checkout step')
const ticketSource = ref('api')
const statusFrom = ref('OPEN')
const statusTo = ref('IN_PROGRESS')

const formattedMessage = computed(() => {
  const safeKey = escapeHtml(ticketKey.value)
  const safeTitle = escapeHtml(ticketTitle.value)
  const safeSource = escapeHtml(ticketSource.value)
  if (activeEventType.value === 'created') {
    const emoji = priorityEmojis[selectedPriority.value] || '⚪'
    return `🎫 <b>New Ticket Created</b>\n\n<b>Ticket:</b> ${safeKey}\n<b>Title:</b> ${safeTitle}\n${emoji} <b>Priority:</b> ${selectedPriority.value.toUpperCase()}\n<b>Source:</b> ${safeSource}`
  } else {
    const safeFrom = escapeHtml(statusFrom.value)
    const safeTo = escapeHtml(statusTo.value)
    return `🔄 <b>Ticket Status Changed</b>\n\n<b>Ticket:</b> ${safeKey}\n<b>Status:</b> ${safeFrom} → ${safeTo}`
  }
})

const sanitizedPreviewMessage = computed(() => sanitizeHtml(formattedMessage.value))

function handleTestSend() {
  settingsStore.sendTestNotification()
  toastStore.success('Preview Dispatched', 'Test message dispatched to outbox simulator')
}
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left: Interactive Configuration -->
      <div class="lg:col-span-6 space-y-4">
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs ring-1 ring-black/5 dark:ring-white/5 space-y-5 transition-all"
        >
          <div class="border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye class="w-4 h-4 text-sky-500" />
              <span>Telegram Message Template</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exact HTML payload formatted and pushed by the backend background worker.
            </p>
          </div>

          <!-- Event Type Switcher -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Event Trigger Type
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="activeEventType = 'created'"
                class="px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer"
                :class="[
                  activeEventType === 'created'
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm font-semibold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400',
                ]"
              >
                🎫 Ticket Created
              </button>
              <button
                type="button"
                @click="activeEventType = 'status_changed'"
                class="px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer"
                :class="[
                  activeEventType === 'status_changed'
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm font-semibold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400',
                ]"
              >
                🔄 Status Changed
              </button>
            </div>
          </div>

          <!-- Field Inputs -->
          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Ticket Key
              </label>
              <input
                v-model="ticketKey"
                type="text"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <template v-if="activeEventType === 'created'">
              <div>
                <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Ticket Title
                </label>
                <input
                  v-model="ticketTitle"
                  type="text"
                  class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Priority
                </label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="p in ['critical', 'high', 'medium', 'low'] as const"
                    :key="p"
                    type="button"
                    @click="selectedPriority = p"
                    class="px-2 py-1.5 rounded-xl text-[11px] font-semibold border text-center transition-all cursor-pointer capitalize"
                    :class="[
                      selectedPriority === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400',
                    ]"
                  >
                    {{ priorityEmojis[p] }} {{ p }}
                  </button>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    From Status
                  </label>
                  <input
                    v-model="statusFrom"
                    type="text"
                    class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    To Status
                  </label>
                  <input
                    v-model="statusTo"
                    type="text"
                    class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>
            </template>
          </div>

          <!-- Raw HTML Preview Box -->
          <div
            class="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1 overflow-x-auto"
          >
            <div class="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <FileCode class="w-3.5 h-3.5" />
              <span>Raw Telegram Bot API HTML Payload:</span>
            </div>
            <pre class="whitespace-pre-wrap text-emerald-400">{{ formattedMessage }}</pre>
          </div>

          <button
            @click="handleTestSend"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Send class="w-4 h-4" />
            <span>Send Test Alert to Telegram Bot</span>
          </button>
        </div>
      </div>

      <!-- Right: Mobile Device Telegram Client Mockup -->
      <div class="lg:col-span-6 flex justify-center">
        <div
          class="w-full max-w-sm rounded-[36px] bg-slate-950 p-3.5 shadow-2xl border-4 border-slate-800 text-slate-900 dark:text-white relative"
        >
          <!-- Phone Speaker & Camera Notch -->
          <div
            class="w-32 h-4.5 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center gap-2"
          >
            <div class="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
            <div class="w-10 h-1 bg-slate-700 rounded-full"></div>
          </div>

          <!-- Telegram Screen Container -->
          <div
            class="rounded-[26px] bg-[#17212b] text-white overflow-hidden shadow-inner flex flex-col h-[460px]"
          >
            <!-- Telegram Top Bar -->
            <div
              class="px-3 py-2.5 bg-[#242f3d] flex items-center justify-between border-b border-slate-800/60"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center font-bold text-xs"
                >
                  <Bot class="w-4 h-4 text-white" />
                </div>
                <div>
                  <div class="font-bold text-xs text-white leading-tight">
                    @{{ settingsStore.botConfig.botUsername.replace(/^@/, '') }}
                  </div>
                  <div class="text-[10px] text-sky-400 leading-tight">bot</div>
                </div>
              </div>
              <div class="text-[10px] text-slate-400">Today</div>
            </div>

            <!-- Chat Area -->
            <div class="flex-1 p-3.5 space-y-3 overflow-y-auto bg-[#0e1621]">
              <!-- Message Bubble -->
              <div
                class="max-w-[88%] bg-[#182533] rounded-2xl p-3 shadow-md border border-slate-800/80 space-y-2"
              >
                <div
                  class="text-[11px] leading-relaxed text-slate-100 whitespace-pre-wrap"
                  v-html="sanitizedPreviewMessage"
                ></div>

                <div class="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-1">
                  <span>13:45</span>
                  <CheckCheck class="w-3 h-3 text-sky-400" />
                </div>
              </div>
            </div>

            <!-- Telegram Bottom Input Bar -->
            <div
              class="p-2.5 bg-[#17212b] border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400"
            >
              <div class="flex-1 bg-[#242f3d] rounded-full px-3 py-1.5 text-[11px] text-slate-400">
                Broadcast notification channel
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

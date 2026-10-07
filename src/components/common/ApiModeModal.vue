<script setup lang="ts">
import apiClient, { API_BASE_URL } from '@/api/client'
import { useTicketStore } from '@/stores/ticketStore'
import { useToastStore } from '@/stores/toastStore'
import { Activity, AlertCircle, CheckCircle2, Radio, RotateCcw, Server, X } from 'lucide-vue-next'
import { ref } from 'vue'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const ticketStore = useTicketStore()
const toastStore = useToastStore()

const isPinging = ref(false)
const pingResult = ref<{
  success: boolean
  message: string
  latencyMs?: number
} | null>(null)

async function testBackendConnection() {
  isPinging.value = true
  pingResult.value = null
  const start = performance.now()

  try {
    const res = await apiClient.get('/tickets?per_page=1', { timeout: 3000 })
    const latency = Math.round(performance.now() - start)
    pingResult.value = {
      success: true,
      message: `Connected successfully (HTTP ${res.status} OK)`,
      latencyMs: latency,
    }
    toastStore.success('Backend Online', `dev-apis responded in ${latency}ms`)
  } catch (err: any) {
    const latency = Math.round(performance.now() - start)
    pingResult.value = {
      success: false,
      message: err.message || 'Connection refused (Is php artisan serve running?)',
      latencyMs: latency,
    }
    toastStore.warning('Backend Offline', `Could not reach ${API_BASE_URL}`)
  } finally {
    isPinging.value = false
  }
}

function handleRefreshApiData() {
  ticketStore.fetchTickets()
  toastStore.success('Tickets Refreshed', 'Reloaded latest tickets from API')
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div
        class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40"
      >
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
            <Radio class="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Backend API Diagnostics
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Direct connection to Laravel backend (No mock data)
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-5">
        <!-- Direct API Banner -->
        <div
          class="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></div>
            <div>
              <p class="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Direct to API Mode Active
              </p>
              <p class="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                All requests route directly to live Laravel endpoints.
              </p>
            </div>
          </div>
          <span
            class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
          >
            DIRECT_API
          </span>
        </div>

        <!-- Connection Inspector -->
        <div
          class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Server class="w-3.5 h-3.5 text-indigo-500" />
              Target Base Endpoint
            </span>
            <span class="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              {{ API_BASE_URL }}
            </span>
          </div>

          <div
            class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800"
          >
            <button
              type="button"
              @click="testBackendConnection"
              :disabled="isPinging"
              class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Activity class="w-3.5 h-3.5" :class="{ 'animate-spin': isPinging }" />
              <span>Ping dev-apis</span>
            </button>

            <button
              type="button"
              @click="handleRefreshApiData"
              class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Reload from API</span>
            </button>
          </div>

          <!-- Ping Output Banner -->
          <div
            v-if="pingResult"
            class="p-2.5 rounded-xl text-xs flex items-center gap-2"
            :class="
              pingResult.success
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            "
          >
            <CheckCircle2 v-if="pingResult.success" class="w-4 h-4 shrink-0" />
            <AlertCircle v-else class="w-4 h-4 shrink-0" />
            <div class="flex-1 truncate">
              <span>{{ pingResult.message }}</span>
              <span v-if="pingResult.latencyMs" class="font-mono ml-1 text-[10px]">
                ({{ pingResult.latencyMs }}ms)
              </span>
            </div>
          </div>
        </div>

        <div
          class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40"
        >
          💡 <strong>Pro Tip:</strong> To start your backend, open terminal in
          <code class="text-indigo-600 dark:text-indigo-400">dev-apis</code> and run
          <code
            class="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-indigo-200 dark:border-indigo-800"
            >php artisan serve --port=8000</code
          >.
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex justify-end"
      >
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow transition-all hover:opacity-90"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

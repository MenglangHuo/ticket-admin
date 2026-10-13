<script setup lang="ts">
import apiClient, { API_BASE_URL } from '@/api/client'
import { useTicketStore } from '@/stores/ticketStore'
import { useToastStore } from '@/stores/toastStore'
import mockService from '@/mocks/mockService'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  Radio,
  RotateCcw,
  Server,
  Sparkles,
  Undo2,
  X,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const ticketStore = useTicketStore()
const toastStore = useToastStore()

const isMock = computed(() => ticketStore.isMockDataActive)
const hasOverride = computed(() => mockService.hasMockOverride())
const envDefault = computed(() => mockService.getEnvMockDataStatus())

const isPinging = ref(false)
const pingResult = ref<{
  success: boolean
  message: string
  latencyMs?: number
} | null>(null)

function handleToggleMode() {
  ticketStore.toggleMockMode()
}

function handleResetToEnv() {
  mockService.setMockDataOverride(null)
  ticketStore.isMockDataActive = mockService.isMockDataEnabled()
  toastStore.info(
    'Reset to .env Default',
    `Reverted mode to ${mockService.getEnvMockDataStatus() ? 'Mock Data' : 'Live API'} as configured in .env`
  )
  ticketStore.fetchTickets(1)
}

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
  toastStore.success('Data Refreshed', isMock.value ? 'Reloaded mock tickets' : 'Reloaded latest tickets from API')
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
          <div
            class="p-2 rounded-xl"
            :class="isMock ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'"
          >
            <Sparkles v-if="isMock" class="w-5 h-5 animate-pulse" />
            <Radio v-else class="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Data Mode & Diagnostics</span>
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold"
                :class="
                  isMock
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                "
              >
                {{ isMock ? 'MOCK_DATA' : 'DIRECT_API' }}
              </span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Configure data source (.env / browser toggle) & inspect backend connection
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-5">
        <!-- Active Mode Banner -->
        <div
          v-if="isMock"
          class="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20"></div>
            <div>
              <p class="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <span>Mock Data Mode Active</span>
                <span v-if="!hasOverride" class="text-[10px] font-normal text-amber-700 dark:text-amber-300">
                  (via .env)
                </span>
                <span v-else class="text-[10px] font-normal text-amber-700 dark:text-amber-300">
                  (browser override)
                </span>
              </p>
              <p class="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                All pages display realistic mock tickets, analytics, subscribers, and API clients.
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="handleToggleMode"
            class="px-2.5 py-1.5 rounded-xl bg-amber-500 text-white font-semibold text-xs shadow-xs hover:bg-amber-600 transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>Switch to API</span>
          </button>
        </div>

        <div
          v-else
          class="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></div>
            <div>
              <p class="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span>Direct API Mode Active</span>
                <span v-if="!hasOverride" class="text-[10px] font-normal text-emerald-700 dark:text-emerald-300">
                  (via .env)
                </span>
                <span v-else class="text-[10px] font-normal text-emerald-700 dark:text-emerald-300">
                  (browser override)
                </span>
              </p>
              <p class="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                All requests route directly to live Laravel API endpoints.
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="handleToggleMode"
            class="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>Switch to Mock</span>
          </button>
        </div>

        <!-- Mode Configuration Info Row -->
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database class="w-3.5 h-3.5 text-indigo-500" />
              Environment Default (.env)
            </span>
            <code class="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
              VITE_ENABLE_MOCK_DATA={{ envDefault ? 'true' : 'false' }}
            </code>
          </div>

          <div v-if="hasOverride" class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px]">
              <AlertCircle class="w-3.5 h-3.5" />
              Browser localStorage override is active
            </span>
            <button
              type="button"
              @click="handleResetToEnv"
              class="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Undo2 class="w-3 h-3" />
              <span>Reset to .env</span>
            </button>
          </div>
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
              class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
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
              <span>Reload Current Data</span>
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
          💡 <strong>Tip:</strong> You can permanently enable or disable mock data by setting
          <code class="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">VITE_ENABLE_MOCK_DATA=true</code> or
          <code class="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">false</code> in your
          <code class="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">.env</code> file.
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex justify-end"
      >
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow transition-all hover:opacity-90 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

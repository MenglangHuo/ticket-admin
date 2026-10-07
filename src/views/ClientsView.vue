<script setup lang="ts">
import { ref } from 'vue';
import {
  Radio,
  Key,
  Plus,
  Copy,
  Check
} from 'lucide-vue-next';
import { useToastStore } from '@/stores/toastStore';

const toastStore = useToastStore();
const copiedIndex = ref<number | null>(null);

const configuredClientId = (import.meta.env.VITE_CLIENT_ID as string) || '';
const configuredClientSecret = (import.meta.env.VITE_CLIENT_SECRET as string) || '';

const clients = ref(
  configuredClientId
    ? [
        {
          name: 'Primary API Client (Configured)',
          client_id: configuredClientId,
          secret: configuredClientSecret ? `${configuredClientSecret.slice(0, 6)}••••••••` : '••••••••',
          rate_limit: 'Unlimited / Standard',
          allowed_types: ['bug', 'enhancement', 'question', 'task'],
          status: 'active',
          last_ping: 'Connected',
        },
      ]
    : []
);

function copyClientId(id: string, index: number) {
  navigator.clipboard.writeText(id);
  copiedIndex.value = index;
  toastStore.success('Copied Client ID', id);
  setTimeout(() => {
    copiedIndex.value = null;
  }, 2000);
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Radio class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Connected API Clients & Webhooks</span>
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          External client apps authorized to submit tickets via <code class="text-indigo-600 dark:text-indigo-400 font-mono">/api/v1/client/tickets</code>
        </p>
      </div>

      <button
        @click="toastStore.info('Coming Soon', 'Registering new API client keys is managed via company settings.')"
        class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 self-start sm:self-auto cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Register New Client</span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="clients.length === 0"
      class="bg-white dark:bg-slate-900/90 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3"
    >
      <Radio class="w-8 h-8 text-slate-400 mx-auto" />
      <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">No API Clients Configured</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        Set <code class="font-mono text-indigo-500">VITE_CLIENT_ID</code> and <code class="font-mono text-indigo-500">VITE_CLIENT_SECRET</code> in your environment variables to link your client application.
      </p>
    </div>

    <!-- Client Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="(c, idx) in clients"
        :key="c.client_id"
        class="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {{ c.status }}
            </span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ c.last_ping }}</span>
          </div>

          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">{{ c.name }}</h3>

          <div class="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 dark:text-slate-400">Client ID:</span>
              <button
                @click="copyClientId(c.client_id, idx)"
                class="font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{{ c.client_id }}</span>
                <Check v-if="copiedIndex === idx" class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <Copy v-else class="w-3 h-3 text-slate-400" />
              </button>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 dark:text-slate-400">Rate Limit:</span>
              <span class="text-slate-800 dark:text-slate-300 font-mono">{{ c.rate_limit }}</span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1 text-[11px]">
            <Key class="w-3.5 h-3.5 text-slate-400" />
            Headers: X-Client-ID & Secret
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

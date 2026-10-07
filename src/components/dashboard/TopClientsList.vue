<script setup lang="ts">
import { computed } from 'vue';
import type { TopClient } from '@/types/ticket';
import { Trophy } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    topClients: TopClient[];
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

const maxCount = computed(() => {
  if (!props.topClients || props.topClients.length === 0) return 1;
  return Math.max(...props.topClients.map((c) => c.count)) || 1;
});
</script>

<template>
  <div class="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl ring-1 ring-black/5 dark:ring-white/5 transition-colors">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy class="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Top Reporting Clients</span>
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Leaderboard by volume from client API & webhooks
        </p>
      </div>
      <div v-if="loading" class="animate-pulse h-5 w-16 bg-slate-100 dark:bg-slate-850 rounded"></div>
      <span v-else class="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
        {{ topClients.length }} Clients
      </span>
    </div>

    <!-- Skeleton Loader -->
    <div v-if="loading" class="space-y-3 animate-pulse">
      <div v-for="i in 4" :key="i" class="h-14 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
    </div>

    <!-- Client list -->
    <div v-else class="space-y-3.5">
      <div
        v-for="(client, index) in topClients"
        :key="client.client_name"
        class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <!-- Rank badge -->
            <span
              class="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center font-mono shrink-0"
              :class="{
                'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30': index === 0,
                'bg-slate-200 dark:bg-slate-300/20 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-300/30': index === 1,
                'bg-amber-50 dark:bg-amber-700/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30': index === 2,
                'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400': index > 2,
              }"
            >
              #{{ index + 1 }}
            </span>

            <div class="truncate">
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {{ client.client_name }}
              </span>
            </div>
          </div>

          <div class="text-right shrink-0">
            <span class="text-xs font-mono font-bold text-white">{{ client.count }}</span>
            <span class="text-[11px] text-slate-400 ml-1">tickets</span>
          </div>
        </div>

        <!-- Relative progress bar -->
        <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div
            class="h-full rounded-full bg-indigo-500 transition-all duration-500"
            :style="{ width: `${(client.count / maxCount) * 100}%` }"
          ></div>
        </div>
      </div>

      <div v-if="topClients.length === 0" class="text-center py-6 text-xs text-slate-400">
        No external client submissions recorded yet.
      </div>
    </div>
  </div>
</template>

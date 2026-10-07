<script setup lang="ts">
import { computed } from 'vue';
import type { TicketPriority, TicketType } from '@/types/ticket';
import { BarChart3, AlertOctagon } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    byPriority: Record<TicketPriority, number>;
    byType?: Record<TicketType, number>;
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

const totalPriority = computed(() => {
  return (
    (props.byPriority?.critical || 0) +
    (props.byPriority?.high || 0) +
    (props.byPriority?.medium || 0) +
    (props.byPriority?.low || 0) || 1
  );
});

const priorities = computed(() => [
  {
    key: 'critical' as TicketPriority,
    label: 'Critical',
    count: props.byPriority?.critical || 0,
    color: 'bg-rose-500',
    textColor: 'text-rose-400',
    percent: Math.round(((props.byPriority?.critical || 0) / totalPriority.value) * 100),
  },
  {
    key: 'high' as TicketPriority,
    label: 'High',
    count: props.byPriority?.high || 0,
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
    percent: Math.round(((props.byPriority?.high || 0) / totalPriority.value) * 100),
  },
  {
    key: 'medium' as TicketPriority,
    label: 'Medium',
    count: props.byPriority?.medium || 0,
    color: 'bg-sky-500',
    textColor: 'text-sky-400',
    percent: Math.round(((props.byPriority?.medium || 0) / totalPriority.value) * 100),
  },
  {
    key: 'low' as TicketPriority,
    label: 'Low',
    count: props.byPriority?.low || 0,
    color: 'bg-slate-500',
    textColor: 'text-slate-400',
    percent: Math.round(((props.byPriority?.low || 0) / totalPriority.value) * 100),
  },
]);
</script>

<template>
  <div class="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl ring-1 ring-black/5 dark:ring-white/5 flex flex-col justify-between transition-colors">
    <!-- Header -->
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <BarChart3 class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span>Tickets by Priority</span>
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Severity distribution across all tickets</p>
    </div>

    <!-- Skeleton Loader -->
    <div v-if="loading" class="space-y-4 my-auto animate-pulse py-2">
      <div v-for="i in 4" :key="i" class="space-y-1.5">
        <div class="h-3.5 bg-slate-100 dark:bg-slate-850 rounded w-1/3"></div>
        <div class="h-2 bg-slate-100 dark:bg-slate-850 rounded-full w-full"></div>
      </div>
    </div>

    <!-- Bars -->
    <div v-else class="space-y-3.5 my-auto">
      <div v-for="item in priorities" :key="item.key" class="space-y-1">
        <div class="flex items-center justify-between text-xs font-medium">
          <span class="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :class="item.color"></span>
            {{ item.label }}
          </span>
          <div class="flex items-center gap-2 font-mono">
            <span :class="item.textColor" class="font-bold">{{ item.count }}</span>
            <span class="text-[11px] text-slate-400 dark:text-slate-500">({{ item.percent }}%)</span>
          </div>
        </div>

        <!-- Bar track -->
        <div class="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-800/80">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="item.color"
            :style="{ width: `${item.percent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Bottom summary hint -->
    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
      <span class="flex items-center gap-1">
        <AlertOctagon class="w-3.5 h-3.5 text-rose-500" />
        Critical issues trigger instant Telegram notification
      </span>
      <span class="font-mono text-slate-700 dark:text-slate-300 font-semibold">{{ props.byPriority?.critical || 0 }} Urgent</span>
    </div>
  </div>
</template>

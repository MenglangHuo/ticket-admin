<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTicketStore } from '@/stores/ticketStore';
import { useAuthStore } from '@/stores/authStore';
import type { TicketStatus } from '@/types/ticket';
import TicketCard from './TicketCard.vue';
import TicketCardSkeleton from './TicketCardSkeleton.vue';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Archive,
  ArrowDown
} from 'lucide-vue-next';

const ticketStore = useTicketStore();
const authStore = useAuthStore();

const dragOverColumn = ref<TicketStatus | null>(null);

const allColumns: Array<{
  id: TicketStatus;
  title: string;
  icon: any;
  iconColor: string;
  gradientClass: string;
}> = [
  {
    id: 'open',
    title: 'Open',
    icon: Inbox,
    iconColor: 'text-purple-600 dark:text-purple-400',
    gradientClass: 'bg-gradient-to-b from-purple-500/15 via-purple-500/5 to-transparent dark:from-purple-500/25 dark:via-purple-500/5 dark:to-transparent',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: Clock,
    iconColor: 'text-amber-600 dark:text-amber-400',
    gradientClass: 'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-500/25 dark:via-amber-500/5 dark:to-transparent',
  },
  {
    id: 'resolved',
    title: 'Resolved',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    gradientClass: 'bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent dark:from-emerald-500/25 dark:via-emerald-500/5 dark:to-transparent',
  },
  {
    id: 'closed',
    title: 'Closed',
    icon: Archive,
    iconColor: 'text-slate-600 dark:text-slate-400',
    gradientClass: 'bg-gradient-to-b from-slate-500/15 via-slate-500/5 to-transparent dark:from-slate-500/25 dark:via-slate-500/5 dark:to-transparent',
  },
];

const visibleColumns = computed(() => {
  return allColumns.filter((col) => ticketStore.columnVisibility[col.id] !== false);
});

function onDragOver(event: DragEvent, status: TicketStatus) {
  if (ticketStore.isLoading) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverColumn.value = status;
}

function onDragLeave(status: TicketStatus) {
  if (dragOverColumn.value === status) {
    dragOverColumn.value = null;
  }
}

async function onDrop(event: DragEvent, newStatus: TicketStatus) {
  event.preventDefault();
  dragOverColumn.value = null;

  if (authStore.isReadOnly || ticketStore.isLoading) return;

  const ticketIdStr = event.dataTransfer?.getData('text/plain');
  if (!ticketIdStr) return;

  const ticketId = Number(ticketIdStr);
  if (isNaN(ticketId)) return;

  await ticketStore.transitionTicketStatus(ticketId, newStatus);
}

function getColumnLoadedCount(status: TicketStatus): number {
  return ticketStore.kanbanColumns[status]?.length || 0;
}

function getColumnTotalCount(status: TicketStatus): number {
  const loaded = getColumnLoadedCount(status);
  const facetCount = ticketStore.facets?.status?.[status];
  if (typeof facetCount === 'number') {
    return Math.max(facetCount, loaded);
  }
  return loaded;
}

function getColumnVisibleCount(status: TicketStatus): number {
  const loaded = getColumnLoadedCount(status);
  const limit = ticketStore.columnLimits[status] || 0;
  return Math.min(loaded, limit);
}

function canLoadMoreForColumn(status: TicketStatus): boolean {
  const loaded = getColumnLoadedCount(status);
  const total = getColumnTotalCount(status);
  const limit = ticketStore.columnLimits[status] || 0;

  // 1. More loaded tickets in memory than current visible column limit
  if (loaded > limit) return true;

  // 2. Server has more tickets than loaded in memory
  if (total > loaded) return true;

  // 3. Explicit column pagination indicates more pages available
  if (ticketStore.columnPages[status]?.hasMore && total > loaded) return true;

  return false;
}
</script>

<template>
  <div>
    <!-- Horizontal Scrollable Kanban Columns Container -->
    <div v-if="visibleColumns.length > 0" class="flex overflow-x-auto gap-4 pb-4 scrollbar-thin items-start min-h-[calc(100vh-230px)]">
      <div
        v-for="col in visibleColumns"
        :key="col.id"
        class="bg-[#f8f9fa] dark:bg-slate-900/50 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs flex flex-col min-w-[310px] max-w-[360px] flex-1 flex-shrink-0 transition-all duration-200 min-h-[580px]"
        :class="[
          dragOverColumn === col.id ? 'ring-2 ring-indigo-500/50 bg-indigo-50/30 dark:bg-slate-800/60' : ''
        ]"
        @dragover="onDragOver($event, col.id)"
        @dragleave="onDragLeave(col.id)"
        @drop="onDrop($event, col.id)"
      >
        <!-- Column Header: 50px height with status gradient background (100% -> 0% transparent) and icon -->
        <div
          class="h-[50px] px-4 flex items-center justify-between sticky top-0 rounded-t-2xl z-10 select-none border-b border-slate-200/50 dark:border-slate-800/60"
          :class="col.gradientClass"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center bg-white/80 dark:bg-slate-900/80 shadow-2xs border border-white/60 dark:border-slate-700/60"
            >
              <component :is="col.icon" class="w-4 h-4" :class="col.iconColor" />
            </div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wide">
              {{ col.title }}
            </h3>
          </div>
        </div>

        <!-- Column Card List (Taller viewport with smooth scrolling) -->
        <div class="p-3.5 space-y-3 flex-1 min-h-[460px] overflow-y-auto max-h-[calc(100vh-320px)]">
          <!-- Skeletons when initial/global loading -->
          <template v-if="ticketStore.isLoading">
            <TicketCardSkeleton v-for="i in 3" :key="`skeleton-${col.id}-${i}`" />
          </template>

          <template v-else>
            <TicketCard
              v-for="ticket in ticketStore.kanbanColumns[col.id]?.slice(0, ticketStore.columnLimits[col.id])"
              :key="ticket.id"
              :ticket="ticket"
            />

            <!-- Load more skeleton for this column -->
            <TicketCardSkeleton v-if="ticketStore.columnLoadingMore[col.id]" />

            <!-- Empty State -->
            <div
              v-if="!ticketStore.kanbanColumns[col.id] || ticketStore.kanbanColumns[col.id].length === 0"
              class="h-40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1 select-none"
            >
              <span>No tickets in {{ col.title }}</span>
              <span class="text-[10px] text-slate-400">Drag a ticket here</span>
            </div>
          </template>
        </div>

        <!-- Column Footer: Status-Specific Load More Trigger -->
        <div
          class="p-2.5 px-3 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/40 rounded-b-2xl flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400"
        >
          <span>
            Showing {{ getColumnVisibleCount(col.id) }} of {{ getColumnTotalCount(col.id) }}
          </span>

          <button
            v-if="canLoadMoreForColumn(col.id)"
            type="button"
            @click="ticketStore.loadMoreForColumn(col.id)"
            :disabled="ticketStore.columnLoadingMore[col.id]"
            class="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
            :title="`Load more tickets for status ${col.title}`"
          >
            <span v-if="ticketStore.columnLoadingMore[col.id]" class="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
            <ArrowDown v-else class="w-3 h-3" />
            <span>Load More</span>
          </button>
          <span v-else class="text-[10px] text-slate-400 font-medium">
            All loaded
          </span>
        </div>
      </div>
    </div>

    <!-- All Columns Hidden State -->
    <div
      v-else
      class="h-64 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center"
    >
      <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
        <Inbox class="w-6 h-6" />
      </div>
      <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">All Kanban columns are hidden</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        You have hidden all columns. Use the Columns menu in the controls above to show status columns.
      </p>
      <button
        type="button"
        @click="ticketStore.setColumnVisibilityPreset('all')"
        class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
      >
        Restore All Columns
      </button>
    </div>
  </div>
</template>

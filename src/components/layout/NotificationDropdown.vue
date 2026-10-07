<script setup lang="ts">
import { useTicketStore } from '@/stores/ticketStore';
import type { Ticket } from '@/types/ticket';
import {
  Bell,
  Clock,
  ExternalLink,
  Smartphone,
  Globe
} from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const ticketStore = useTicketStore();

function handleSelectTicket(ticket: Ticket) {
  ticketStore.openTicketDrawer(ticket);
  emit('close');
}

function markAllAsRead() {
  ticketStore.markNotificationsAsRead();
}
</script>

<template>
  <div
    v-if="isOpen"
    class="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden ring-1 ring-white/10"
  >
    <!-- Header -->
    <div class="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
      <div class="flex items-center gap-2">
        <Bell class="w-4 h-4 text-indigo-400" />
        <span class="text-sm font-semibold text-white">External Client Submissions</span>
      </div>
      <button
        @click="markAllAsRead"
        class="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
      >
        Mark all read
      </button>
    </div>

    <!-- Notifications List -->
    <div class="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
      <div
        v-if="ticketStore.notifications.length === 0"
        class="py-8 text-center text-xs text-slate-400"
      >
        No new incoming tickets from client portals
      </div>

      <div
        v-for="item in ticketStore.notifications"
        :key="item.id"
        @click="handleSelectTicket(item)"
        class="p-3.5 hover:bg-slate-800/50 cursor-pointer transition-colors group flex items-start gap-3"
      >
        <!-- Icon badge -->
        <div class="mt-0.5 p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:border-indigo-500/40">
          <Smartphone v-if="item.metadata?.api_client_name?.includes('Mobile')" class="w-4 h-4" />
          <Globe v-else class="w-4 h-4" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-xs font-mono font-medium text-indigo-400">
              {{ item.ticket_key }}
            </span>
            <span class="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock class="w-3 h-3" />
              10m ago
            </span>
          </div>

          <p class="text-xs font-medium text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
            {{ item.title }}
          </p>

          <div class="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span class="truncate text-slate-400 font-medium">
              {{ item.metadata?.api_client_name || 'Client Webhook' }}
            </span>
            <span
              class="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
              :class="{
                'bg-rose-500/10 text-rose-400 border border-rose-500/20': item.priority === 'critical',
                'bg-amber-500/10 text-amber-400 border border-amber-500/20': item.priority === 'high',
                'bg-sky-500/10 text-sky-400 border border-sky-500/20': item.priority === 'medium',
                'bg-slate-500/10 text-slate-400 border border-slate-500/20': item.priority === 'low',
              }"
            >
              {{ item.priority }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-center">
      <router-link
        to="/tickets"
        @click="emit('close')"
        class="text-xs font-medium text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
      >
        <span>View all tickets in board</span>
        <ExternalLink class="w-3 h-3" />
      </router-link>
    </div>
  </div>
</template>

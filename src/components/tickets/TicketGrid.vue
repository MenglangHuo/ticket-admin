<script setup lang="ts">
import { useTicketStore } from '@/stores/ticketStore'
import { formatHtmlPreview } from '@/utils/html'
import { Clock, Paperclip, User } from 'lucide-vue-next'

const ticketStore = useTicketStore()

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <div
      v-for="ticket in ticketStore.filteredTickets"
      :key="ticket.id"
      @click="ticketStore.openTicketDrawer(ticket)"
      class="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md dark:shadow-md dark:hover:shadow-2xl transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between group ring-1 ring-black/5 dark:ring-white/5"
    >
      <!-- Attachment Image Thumbnail Preview (if image attachment exists) -->
      <div
        v-if="
          ticket.attachments && ticket.attachments.some((a) => a.mime_type.startsWith('image/'))
        "
        class="h-36 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative border-b border-slate-200 dark:border-slate-800"
      >
        <img
          :src="ticket.attachments.find((a) => a.mime_type.startsWith('image/'))?.file_url"
          :alt="ticket.title"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
        ></div>
        <div
          class="absolute bottom-2 left-3 flex items-center gap-1 text-[11px] text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm"
        >
          <Paperclip class="w-3 h-3 text-indigo-400" />
          <span>{{ ticket.attachments.length }} Attachment(s)</span>
        </div>
      </div>

      <!-- Card Content -->
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <!-- Header: Key, Status, Priority -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {{ ticket.ticket_key }}
            </span>

            <div class="flex items-center gap-1.5">
              <!-- Priority Badge -->
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                :class="{
                  'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30':
                    ticket.priority === 'critical',
                  'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30':
                    ticket.priority === 'high',
                  'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30':
                    ticket.priority === 'medium',
                  'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700/40':
                    ticket.priority === 'low',
                }"
              >
                {{ ticket.priority }}
              </span>

              <!-- Status Pill -->
              <span
                class="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                :class="{
                  'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300':
                    ticket.status === 'open',
                  'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300':
                    ticket.status === 'in_progress',
                  'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300':
                    ticket.status === 'resolved',
                  'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-400':
                    ticket.status === 'closed',
                }"
              >
                {{ ticket.status.replace('_', ' ') }}
              </span>
            </div>
          </div>

          <!-- Title -->
          <h3
            class="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2 leading-snug"
          >
            {{ ticket.title }}
          </h3>

          <!-- Description -->
          <p
            v-if="ticket.description"
            class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4"
          >
            {{ formatHtmlPreview(ticket.description, 130) }}
          </p>
        </div>

        <!-- Footer Meta -->
        <div
          class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400"
        >
          <div class="flex items-center gap-1.5 truncate max-w-[150px]">
            <User class="w-3 h-3 text-slate-400 shrink-0" />
            <span class="truncate text-slate-700 dark:text-slate-300">{{
              ticket.reporter_name || 'Anonymous'
            }}</span>
          </div>

          <div
            class="flex items-center gap-1 shrink-0 text-[10px] text-slate-400 dark:text-slate-500"
          >
            <Clock class="w-3 h-3" />
            <span>{{ formatDate(ticket.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

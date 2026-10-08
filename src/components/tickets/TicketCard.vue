<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import { useTicketStore } from '@/stores/ticketStore'
import type { Ticket } from '@/types/ticket'
import { Bug, CheckSquare, HelpCircle, Paperclip, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'

import { formatHtmlPreview } from '@/utils/html'
import { defineProps } from 'vue'

const props = defineProps<{
  ticket: Ticket
}>()

const ticketStore = useTicketStore()
const authStore = useAuthStore()

const isShaking = computed(() => ticketStore.shakingTicketId === props.ticket.id)

function onDragStart(event: DragEvent) {
  if (authStore.isReadOnly) {
    event.preventDefault()
    return
  }
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', String(props.ticket.id))
    event.dataTransfer.effectAllowed = 'move'
  }
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return 'Just now'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const descriptionPreview = computed(() => {
  const raw = props.ticket.description_preview || props.ticket.description
  if (!raw) return 'No description preview'
  return formatHtmlPreview(raw, 110) || 'No description preview'
})

const reporterName = computed(() => {
  return props.ticket.reporter_name || props.ticket.reporter?.name || 'Anonymous'
})

// Dynamic colors based on status header color
const statusTheme = computed(() => {
  switch (props.ticket.status) {
    case 'open':
      return {
        hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-600/80',
        hoverShadow: 'hover:shadow-purple-500/10',
        keyText: 'text-purple-600 dark:text-purple-400',
        titleHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
      }
    case 'in_progress':
      return {
        hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-600/80',
        hoverShadow: 'hover:shadow-amber-500/10',
        keyText: 'text-amber-600 dark:text-amber-400',
        titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
      }
    case 'resolved':
      return {
        hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-600/80',
        hoverShadow: 'hover:shadow-emerald-500/10',
        keyText: 'text-emerald-600 dark:text-emerald-400',
        titleHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
      }
    case 'closed':
      return {
        hoverBorder: 'hover:border-slate-400 dark:hover:border-slate-600',
        hoverShadow: 'hover:shadow-slate-500/10',
        keyText: 'text-slate-600 dark:text-slate-400',
        titleHover: 'group-hover:text-slate-700 dark:group-hover:text-slate-200',
      }
    default:
      return {
        hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-700',
        hoverShadow: 'hover:shadow-indigo-500/10',
        keyText: 'text-indigo-600 dark:text-indigo-400',
        titleHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
      }
  }
})
</script>

<template>
  <div
    :draggable="!authStore.isReadOnly"
    @dragstart="onDragStart"
    @click="ticketStore.openTicketDrawer(ticket)"
    class="group relative bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/70 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none ring-1 ring-black/[0.02] dark:ring-white/5"
    :class="[
      statusTheme.hoverBorder,
      statusTheme.hoverShadow,
      {
        'animate-shake ring-2 ring-rose-500/80 border-rose-500': isShaking,
      },
    ]"
  >
    <!-- Top Row: Ticket Key + Urgency Priority (Left), Ticket Type + Options (Right) -->
    <div class="flex items-center justify-between gap-2 mb-2.5">
      <!-- Left: Ticket Key + High-Contrast Priority Badge -->
      <div class="flex items-center gap-1 min-w-0">
        <!-- Ticket Key (Color matches column status header) -->
        <span
          class="text-[13px] font-mono font-bold shrink-0 transition-colors"
          :class="statusTheme.keyText"
        >
          {{ ticket.ticket_key }}
        </span>

        <!-- Urgency Priority Badge: Instant recognition of update necessity -->
        <span
          v-if="ticket.priority === 'critical'"
          class="inline-flex items-center gap-1 text-[9.5px] font-extrabold px-2 py-0.5 leading-none rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 shrink-0 animate-pulse-subtle"
        >
          <!-- <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span> -->
          CRITICAL
        </span>
        <span
          v-else-if="ticket.priority === 'high'"
          class="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 leading-none rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0"
        >
          <!-- <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> -->
          HIGH
        </span>
        <span
          v-else-if="ticket.priority === 'medium'"
          class="inline-flex items-center text-[9.5px] font-semibold px-2 py-0.5 leading-none rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 shrink-0"
        >
          MEDIUM
        </span>
        <span
          v-else
          class="inline-flex items-center text-[9.5px] font-medium px-2 py-0.5 leading-none rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0"
        >
          LOW
        </span>
      </div>

      <!-- Right: Ticket Type & Options -->
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Ticket Type -->
        <span
          class="inline-flex items-center gap-1 text-[10.5px] font-semibold capitalize px-2 py-0.5 rounded-md"
          :class="{
            'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20':
              ticket.type === 'bug',
            'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20':
              ticket.type === 'enhancement',
            'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20':
              ticket.type === 'question',
            'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20':
              ticket.type === 'task',
          }"
        >
          <Bug v-if="ticket.type === 'bug'" class="w-3 h-3" />
          <Sparkles v-else-if="ticket.type === 'enhancement'" class="w-3 h-3" />
          <HelpCircle v-else-if="ticket.type === 'question'" class="w-3 h-3" />
          <CheckSquare v-else class="w-3 h-3" />
          <span>{{ ticket.type }}</span>
        </span>
      </div>
    </div>

    <!-- Ticket Title: Title text changes to status color on hover -->
    <h4
      class="text-sm font-bold text-slate-900 dark:text-slate-100 transition-colors line-clamp-2 leading-snug mb-2"
      :class="statusTheme.titleHover"
    >
      {{ ticket.title }}
    </h4>

    <!-- Description Preview: Generous readable snippet giving full context -->
    <p
      class="text-[12px] line-clamp-2 leading-relaxed mb-3.5 font-normal"
      :class="
        ticket.description_preview || ticket.description
          ? 'text-slate-600 dark:text-slate-300'
          : 'text-slate-400/80 dark:text-slate-500 italic'
      "
    >
      {{ descriptionPreview }}
    </p>

    <!-- Bottom Meta Row: Reporter Name (Left) & Date Time (Right) - (Profile, phone, company, 'created date' removed) -->
    <div
      class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400"
    >
      <!-- Left: Reporter Name & Attachments -->
      <div class="flex items-center gap-1.5 min-w-0" :title="`Reporter: ${reporterName}`">
        <span class="truncate font-semibold text-slate-700 dark:text-slate-300 max-w-[130px]">
          {{ reporterName }}
        </span>

        <!-- Attachments Count Badge -->
        <span
          v-if="ticket.attachments && ticket.attachments.length > 0"
          class="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0 ml-1"
        >
          <Paperclip class="w-3 h-3 text-slate-500 dark:text-slate-400" />
          <span>{{ ticket.attachments.length }}</span>
        </span>
      </div>

      <!-- Right: Date and Time (No 'created date' text) -->
      <div
        class="flex items-center gap-1.5 font-mono text-[10.5px] text-slate-400 dark:text-slate-500 shrink-0"
        :title="ticket.created_at"
      >
        <span>{{ formatDateTime(ticket.created_at) }}</span>
      </div>
    </div>
  </div>
</template>

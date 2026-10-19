<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTicketStore } from '@/stores/ticketStore'
import type { TicketAudit } from '@/types/ticket'
import { sanitizeHtml } from '@/utils/security'
import {
  History,
  Clock,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  ChevronsUpDown,
  Tag,
  MessageSquare,
} from 'lucide-vue-next'

const ticketStore = useTicketStore()

const audits = computed<TicketAudit[]>(() => ticketStore.ticketAudits || [])
// Default to collapsed: expandedAudits keeps track of which audits are opened
const expandedAudits = ref<Record<string | number, boolean>>({})

function toggleCollapse(key: string | number) {
  expandedAudits.value[key] = !expandedAudits.value[key]
}

function isCollapsed(key: string | number): boolean {
  return !expandedAudits.value[key]
}

const areAllExpanded = computed(() => {
  if (audits.value.length === 0) return false
  return audits.value.every((a, idx) => !!expandedAudits.value[a.id ?? idx])
})

function toggleAllCollapse() {
  const targetState = !areAllExpanded.value
  audits.value.forEach((a, idx) => {
    expandedAudits.value[a.id ?? idx] = targetState
  })
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

function isHtml(str?: string | null): boolean {
  if (!str) return false
  return /<[a-z][\s\S]*>/i.test(str)
}

function getEventSummary(audit: TicketAudit): string {
  const fields = audit.modified_fields || []
  if (audit.event === 'status_changed') {
    return 'changed ticket status'
  }
  if (fields.length === 0) {
    return 'updated this ticket'
  }
  if (fields.includes('title') && fields.includes('description')) {
    return 'updated title & description'
  }
  if (fields.includes('title')) {
    return 'updated title'
  }
  if (fields.includes('description')) {
    return 'updated description'
  }
  if (fields.includes('priority')) {
    return 'updated priority'
  }
  if (fields.includes('status')) {
    return 'changed status'
  }
  return `updated ${fields.map((f) => f.replace('_', ' ')).join(', ')}`
}
</script>

<template>
  <!-- Unified Container Card: All change records are embedded cleanly under Audit Trail & History -->
  <div
    class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden"
  >
    <!-- Card Header -->
    <div
      class="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs"
        >
          <History class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Audit Trail & History
            </h3>
            <span
              class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
            >
              {{ audits.length }}
            </span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            Immutable log of all modifications, editor identities, and field-level diffs
          </p>
        </div>
      </div>

      <!-- Header Actions: Expand/Collapse All & Refresh -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="audits.length > 0"
          type="button"
          @click="toggleAllCollapse"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs transition-all cursor-pointer"
        >
          <ChevronsUpDown class="w-3.5 h-3.5 text-slate-400" />
          <span>{{ areAllExpanded ? 'Collapse All' : 'Expand All' }}</span>
        </button>

        <button
          type="button"
          @click="ticketStore.fetchTicketAudits(ticketStore.selectedTicket?.id || '')"
          :disabled="ticketStore.isAuditsLoading"
          title="Refresh audit history"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            class="w-3.5 h-3.5 text-indigo-500"
            :class="{ 'animate-spin': ticketStore.isAuditsLoading }"
          />
          <span class="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="ticketStore.isAuditsLoading"
      class="p-10 text-center space-y-2.5"
    >
      <RefreshCw class="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
      <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
        Loading audit history...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="audits.length === 0"
      class="p-10 text-center space-y-2.5"
    >
      <div
        class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto"
      >
        <ShieldCheck class="w-6 h-6 text-slate-400" />
      </div>
      <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">
        No modifications recorded
      </h4>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        This ticket is in its original submitted state. When an admin updates details (such as title, description, or priority), each change will be tracked here.
      </p>
    </div>

    <!-- Audit Change Entries: Integrated directly under the card header -->
    <div
      v-else
      class="divide-y divide-slate-100 dark:divide-slate-800"
    >
      <div
        v-for="(audit, index) in audits"
        :key="audit.id ?? index"
        class="transition-colors"
      >
        <!-- Clickable Row Header: Collapsed by default -->
        <div
          @click="toggleCollapse(audit.id ?? index)"
          class="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
          :class="{ 'bg-slate-50/30 dark:bg-slate-900/30': !isCollapsed(audit.id ?? index) }"
          :title="isCollapsed(audit.id ?? index) ? 'Click to expand' : 'Click to collapse'"
        >
          <!-- Left: Editor Info & Event -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
            >
              {{ (audit.editor?.name || 'A').charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {{ audit.editor?.name || `Admin #${audit.editor?.id || 'Staff'}` }}
                </span>
                <span
                  class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  Staff Editor
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{{ getEventSummary(audit) }}</span>
                <span
                  v-if="isCollapsed(audit.id ?? index) && audit.reason"
                  class="hidden md:inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400/90 font-medium truncate max-w-sm"
                >
                  • "{{ audit.reason }}"
                </span>
              </p>
            </div>
          </div>

          <!-- Right: Timestamp, Status Badge & Collapse Chevron -->
          <div class="flex items-center gap-2 text-xs shrink-0">
            <span
              class="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium"
              :title="formatDate(audit.created_at)"
            >
              <Clock class="w-3 h-3 text-slate-400" />
              <span>{{ formatRelativeTime(audit.created_at) }}</span>
            </span>

            <span
              class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
              :class="{
                'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60':
                  audit.event === 'updated',
                'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60':
                  audit.event === 'status_changed',
                'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60':
                  audit.event === 'created',
              }"
            >
              {{ audit.event }}
            </span>

            <!-- Chevron Toggle Button -->
            <button
              type="button"
              @click.stop="toggleCollapse(audit.id ?? index)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              :title="isCollapsed(audit.id ?? index) ? 'Expand audit details' : 'Collapse audit details'"
            >
              <ChevronDown
                class="w-4 h-4 transition-transform duration-200"
                :class="{ '-rotate-90': isCollapsed(audit.id ?? index) }"
              />
            </button>
          </div>
        </div>

        <!-- Expanded Details: Nested smoothly under row with soft styling -->
        <div
          v-if="!isCollapsed(audit.id ?? index)"
          class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/30 space-y-3.5"
        >
          <!-- Reason Callout -->
          <div
            v-if="audit.reason"
            class="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
          >
            <MessageSquare class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div class="leading-relaxed">
              <span class="font-bold text-amber-800 dark:text-amber-300">Audit Reason:</span>
              <span class="ml-1.5 italic font-medium">"{{ audit.reason }}"</span>
            </div>
          </div>

          <!-- Modified Fields Tags -->
          <div
            v-if="audit.modified_fields && audit.modified_fields.length > 0"
            class="flex flex-wrap items-center gap-1.5"
          >
            <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-0.5">
              Modified:
            </span>
            <span
              v-for="field in audit.modified_fields"
              :key="field"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <Tag class="w-2.5 h-2.5 text-indigo-500" />
              <span class="capitalize">{{ field.replace('_', ' ') }}</span>
            </span>
          </div>

          <!-- Diff Section -->
          <div class="space-y-3 pt-0.5">
            <!-- Title Diff -->
            <div v-if="audit.diff?.title" class="space-y-1.5 text-xs">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Title Changed:
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <!-- Before Title -->
                <div
                  class="p-3 sm:p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
                >
                  <span class="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
                    BEFORE
                  </span>
                  <span class="line-through opacity-80 break-words font-medium leading-relaxed">
                    {{ audit.diff.title.old }}
                  </span>
                </div>

                <!-- After Title -->
                <div
                  class="p-3 sm:p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200"
                >
                  <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    AFTER
                  </span>
                  <span class="break-words font-semibold leading-relaxed">
                    {{ audit.diff.title.new }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Priority, Status, Type Diffs -->
            <div
              v-if="audit.diff?.priority || audit.diff?.status || audit.diff?.type"
              class="flex flex-wrap items-center gap-2.5 pt-0.5"
            >
              <!-- Priority Diff -->
              <div
                v-if="audit.diff?.priority"
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
              >
                <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Priority:</span>
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase line-through bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  {{ audit.diff.priority.old }}
                </span>
                <ArrowRight class="w-3 h-3 text-slate-400" />
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                >
                  {{ audit.diff.priority.new }}
                </span>
              </div>

              <!-- Status Diff -->
              <div
                v-if="audit.diff?.status"
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
              >
                <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Status:</span>
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase line-through bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  {{ audit.diff.status.old }}
                </span>
                <ArrowRight class="w-3 h-3 text-slate-400" />
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                >
                  {{ audit.diff.status.new }}
                </span>
              </div>

              <!-- Type Diff -->
              <div
                v-if="audit.diff?.type"
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
              >
                <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Type:</span>
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase line-through bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  {{ audit.diff.type.old }}
                </span>
                <ArrowRight class="w-3 h-3 text-slate-400" />
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                >
                  {{ audit.diff.type.new }}
                </span>
              </div>
            </div>

            <!-- Description Diff: UI like Title (BEFORE & AFTER) with HTML Rendering -->
            <div v-if="audit.diff?.description" class="space-y-1.5 text-xs pt-1">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Description Changed:
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <!-- Before Description -->
                <div
                  class="p-3.5 sm:p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 flex flex-col"
                >
                  <span class="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1.5 shrink-0">
                    BEFORE
                  </span>
                  <div
                    v-if="isHtml(audit.diff.description.old)"
                    class="html-viewer-prose text-xs text-rose-950 dark:text-rose-200 opacity-80 leading-relaxed max-h-72 overflow-y-auto flex-1"
                    v-html="sanitizeHtml(audit.diff.description.old)"
                  ></div>
                  <div
                    v-else
                    class="text-xs text-rose-950 dark:text-rose-200 opacity-80 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto flex-1 font-medium"
                  >
                    {{ audit.diff.description.old || '(Empty)' }}
                  </div>
                </div>

                <!-- After Description -->
                <div
                  class="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 flex flex-col"
                >
                  <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1.5 shrink-0">
                    AFTER
                  </span>
                  <div
                    v-if="isHtml(audit.diff.description.new)"
                    class="html-viewer-prose text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed max-h-72 overflow-y-auto flex-1 font-medium"
                    v-html="sanitizeHtml(audit.diff.description.new)"
                  ></div>
                  <div
                    v-else
                    class="text-xs text-emerald-950 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto flex-1 font-medium"
                  >
                    {{ audit.diff.description.new }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Styled HTML Prose inside Audit Trail */
.html-viewer-prose {
  font-size: 0.8125rem;
  line-height: 1.6;
}

.html-viewer-prose h1,
.html-viewer-prose h2,
.html-viewer-prose h3 {
  font-weight: 700;
  color: inherit;
  margin-top: 0.6rem;
  margin-bottom: 0.3rem;
}

.html-viewer-prose h1 {
  font-size: 1.1rem;
}

.html-viewer-prose h2 {
  font-size: 1rem;
}

.html-viewer-prose h3 {
  font-size: 0.9rem;
}

.html-viewer-prose p {
  margin-bottom: 0.5rem;
}

.html-viewer-prose p:last-child {
  margin-bottom: 0;
}

.html-viewer-prose ul {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}

.html-viewer-prose ol {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}

.html-viewer-prose li {
  margin-bottom: 0.25rem;
}

.html-viewer-prose strong,
.html-viewer-prose b {
  font-weight: 700;
}

.html-viewer-prose em,
.html-viewer-prose i {
  font-style: italic;
}

.html-viewer-prose pre {
  background-color: rgba(15, 23, 42, 0.08);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  overflow-x: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.775rem;
  margin: 0.5rem 0;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.dark .html-viewer-prose pre {
  background-color: rgba(2, 6, 23, 0.6);
  border-color: rgba(51, 65, 85, 0.6);
}

.html-viewer-prose code {
  background-color: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
}

.dark .html-viewer-prose code {
  background-color: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

.html-viewer-prose blockquote {
  border-left: 3px solid #6366f1;
  padding-left: 0.75rem;
  color: #64748b;
  margin: 0.5rem 0;
}
</style>

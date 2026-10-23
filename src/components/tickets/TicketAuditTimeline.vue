<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  Tag,
} from 'lucide-vue-next'

const ticketStore = useTicketStore()

const audits = computed<TicketAudit[]>(() => ticketStore.ticketAudits || [])

// Pagination: 20 per page
const PAGE_SIZE = 20
const visibleCount = ref(PAGE_SIZE)

// Reset visible count when selected ticket changes
watch(
  () => ticketStore.selectedTicket?.id,
  () => {
    visibleCount.value = PAGE_SIZE
  },
)

// Total audits count: get from data.pagination.total from response
const totalAuditsCount = computed(() => {
  if (ticketStore.auditPagination?.total && ticketStore.auditPagination.total > 0) {
    return ticketStore.auditPagination.total
  }
  return audits.value.length
})

const visibleAudits = computed<TicketAudit[]>(() => {
  return audits.value.slice(0, visibleCount.value)
})

const hasMore = computed(() => {
  if (audits.value.length > visibleCount.value) return true
  if (ticketStore.auditPagination?.has_more) return true
  return false
})

async function handleShowMore() {
  if (audits.value.length > visibleCount.value) {
    visibleCount.value += PAGE_SIZE
  } else if (ticketStore.auditPagination?.has_more && ticketStore.selectedTicket?.id) {
    await ticketStore.loadMoreTicketAudits(ticketStore.selectedTicket.id)
    visibleCount.value = ticketStore.ticketAudits.length
  }
}

// Default to collapsed: expandedAudits keeps track of which audits are opened
const expandedAudits = ref<Record<string | number, boolean>>({})

function toggleCollapse(key: string | number) {
  expandedAudits.value[key] = !expandedAudits.value[key]
}

function isCollapsed(key: string | number): boolean {
  return !expandedAudits.value[key]
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
  if (diffMin < 60) return `${diffMin}min ago`
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

function getAvatarGradient(name?: string | null): string {
  if (!name) return 'from-indigo-500 to-indigo-600'
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-sky-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-teal-500 to-emerald-600',
    'from-blue-600 to-indigo-700',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % gradients.length
  return gradients[index] ?? 'from-indigo-500 to-purple-600'
}
</script>

<template>
  <!-- Unified Container Card: All change records are embedded cleanly under Audit Trail & History -->
  <div
    class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-all text-xs"
  >
    <!-- Card Header: Clean, compact, and professional -->
    <div
      class="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs"
        >
          <History class="w-3.5 h-3.5" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Audit Trail & History
            </h3>
            <span
              class="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
            >
              {{ totalAuditsCount }}
            </span>
          </div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            Immutable log of all modifications, editor identities, and field-level diffs
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="ticketStore.isAuditsLoading && audits.length === 0" class="p-8 text-center space-y-2">
      <RefreshCw class="w-5 h-5 animate-spin text-indigo-500 mx-auto" />
      <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading audit history...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="audits.length === 0" class="p-8 text-center space-y-2">
      <div
        class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto"
      >
        <ShieldCheck class="w-5 h-5 text-slate-400" />
      </div>
      <h4 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
        No modifications recorded
      </h4>
      <p class="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        This ticket is in its original submitted state. When an admin updates details (such as
        title, description, or priority), each change will be tracked here.
      </p>
    </div>

    <!-- Audit Change Entries: Render visibleAudits -->
    <div v-else class="divide-y divide-slate-100 dark:divide-slate-800/80">
      <div
        v-for="(audit, index) in visibleAudits"
        :key="audit.id ?? index"
        class="group/row transition-colors relative"
      >
        <!-- Clickable Row Header: Compact height and smaller fonts -->
        <div
          @click="toggleCollapse(audit.id ?? index)"
          class="px-3 py-2 sm:px-3 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
          :class="{ 'bg-slate-50/40 dark:bg-slate-900/40': !isCollapsed(audit.id ?? index) }"
          :title="isCollapsed(audit.id ?? index) ? 'Click to expand' : 'Click to collapse'"
        >
          <!-- Left: Editor Avatar & Info -->
          <div class="flex items-center gap-2.5 min-w-0">
            <!-- Modern Avatar with Dynamic Gradients & Soft Ring -->
            <div class="relative shrink-0">
              <div
                class="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-gradient-to-tr text-white font-bold text-[10px] flex items-center justify-center shadow-2xs ring-1 ring-white dark:ring-slate-900"
                :class="getAvatarGradient(audit.editor?.name || `Admin #${audit.editor?.id || 'Staff'}`)"
              >
                {{ (audit.editor?.name || 'A').charAt(0).toUpperCase() }}
              </div>
            </div>

            <div class="min-w-0">
              <!-- Line 1: Editor Name -->
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {{ audit.editor?.name || `Admin #${audit.editor?.id || 'Staff'}` }}
                </span>
              </div>

              <!-- Line 2: Event Summary -->
              <div class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 flex-wrap">
                <span class="font-medium text-slate-600 dark:text-slate-300">{{ getEventSummary(audit) }}</span>
              </div>
            </div>
          </div>

          <!-- Right: Timestamp, Status Badge & Collapse Chevron -->
          <div class="flex items-center gap-2 text-xs shrink-0">
            <span
              class="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium"
              :title="formatDate(audit.created_at)"
            >
              <Clock class="w-3 h-3 text-slate-400" />
              <span>{{ formatRelativeTime(audit.created_at) }}</span>
            </span>

            <span
              class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shadow-2xs"
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
              class="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              :title="
                isCollapsed(audit.id ?? index) ? 'Expand audit details' : 'Collapse audit details'
              "
            >
              <ChevronDown
                class="w-3.5 h-3.5 transition-transform duration-200"
                :class="{ '-rotate-90': isCollapsed(audit.id ?? index) }"
              />
            </button>
          </div>
        </div>

        <!-- Expanded Details: Clean UI without redundant Audit Reason callout box -->
        <div
          v-if="!isCollapsed(audit.id ?? index)"
          class="p-3 sm:p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5"
        >
          <!-- Modified Fields Tags -->
          <div
            v-if="audit.modified_fields && audit.modified_fields.length > 0"
            class="flex flex-wrap items-center gap-1.5"
          >
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mr-0.5">
              Modified:
            </span>
            <span
              v-for="field in audit.modified_fields"
              :key="field"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <Tag class="w-2.5 h-2.5 text-indigo-500" />
              <span class="capitalize">{{ field.replace('_', ' ') }}</span>
            </span>
          </div>

          <!-- Diff Section -->
          <div class="space-y-2.5 pt-0.5">
            <!-- Title Diff -->
            <div v-if="audit.diff?.title" class="space-y-1 text-xs">
              <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Title Changed:
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <!-- Before Title -->
                <div
                  class="p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
                >
                  <span
                    class="text-[9px] font-bold uppercase tracking-wider text-rose-500 block mb-0.5"
                  >
                    BEFORE
                  </span>
                  <span class="line-through opacity-80 break-words font-medium leading-relaxed text-xs">
                    {{ audit.diff.title.old }}
                  </span>
                </div>

                <!-- After Title -->
                <div
                  class="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200"
                >
                  <span
                    class="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5"
                  >
                    AFTER
                  </span>
                  <span class="break-words font-semibold leading-relaxed text-xs">
                    {{ audit.diff.title.new }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Priority, Status, Type Diffs -->
            <div
              v-if="audit.diff?.priority || audit.diff?.status || audit.diff?.type"
              class="flex flex-wrap items-center gap-2 pt-0.5"
            >
              <!-- Priority Diff -->
              <div
                v-if="audit.diff?.priority"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
              >
                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400"
                  >Priority:</span
                >
                <span
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase line-through bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  {{ audit.diff.priority.old }}
                </span>
                <ArrowRight class="w-3 h-3 text-slate-400" />
                <span
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                >
                  {{ audit.diff.priority.new }}
                </span>
              </div>

              <!-- Status Diff -->
              <div
                v-if="audit.diff?.status"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
              >
                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400"
                  >Status:</span
                >
                <span
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase line-through bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  {{ audit.diff.status.old }}
                </span>
                <ArrowRight class="w-3 h-3 text-slate-400" />
                <span
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                >
                  {{ audit.diff.status.new }}
                </span>
              </div>

              <!-- Type Diff -->
              <div
                v-if="audit.diff?.type"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
              >
                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400"
                  >Type:</span
                >
                <span
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase line-through bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  {{ audit.diff.type.old }}
                </span>
                <ArrowRight class="w-3 h-3 text-slate-400" />
                <span
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                >
                  {{ audit.diff.type.new }}
                </span>
              </div>
            </div>

            <!-- Description Diff: UI like Title (BEFORE & AFTER) with HTML Rendering -->
            <div v-if="audit.diff?.description" class="space-y-1 text-xs pt-0.5">
              <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Description Changed:
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <!-- Before Description -->
                <div
                  class="p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 flex flex-col"
                >
                  <span
                    class="text-[9px] font-bold uppercase tracking-wider text-rose-500 block mb-1 shrink-0"
                  >
                    BEFORE
                  </span>
                  <div
                    v-if="isHtml(audit.diff.description.old)"
                    class="html-viewer-prose text-xs text-rose-950 dark:text-rose-200 opacity-80 leading-relaxed max-h-52 overflow-y-auto flex-1"
                    v-html="sanitizeHtml(audit.diff.description.old)"
                  ></div>
                  <div
                    v-else
                    class="text-xs text-rose-950 dark:text-rose-200 opacity-80 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto flex-1 font-medium"
                  >
                    {{ audit.diff.description.old || '(Empty)' }}
                  </div>
                </div>

                <!-- After Description -->
                <div
                  class="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 flex flex-col"
                >
                  <span
                    class="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1 shrink-0"
                  >
                    AFTER
                  </span>
                  <div
                    v-if="isHtml(audit.diff.description.new)"
                    class="html-viewer-prose text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed max-h-52 overflow-y-auto flex-1 font-medium"
                    v-html="sanitizeHtml(audit.diff.description.new)"
                  ></div>
                  <div
                    v-else
                    class="text-xs text-emerald-950 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto flex-1 font-medium"
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

    <!-- Pagination / Show More Button: Displayed if audits count > 20 per page or server has more -->
    <div
      v-if="hasMore"
      class="px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5"
    >
      <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <span>Showing</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">{{ visibleAudits.length }}</span>
        <span>of</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">{{ totalAuditsCount }}</span>
        <span>audit records</span>
      </div>

      <button
        type="button"
        @click="handleShowMore"
        :disabled="ticketStore.isAuditsLoadingMore"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
      >
        <RefreshCw
          v-if="ticketStore.isAuditsLoadingMore"
          class="w-3.5 h-3.5 animate-spin text-indigo-500"
        />
        <ChevronDown v-else class="w-3.5 h-3.5 text-indigo-500" />
        <span>Show More</span>
      </button>
    </div>

    <!-- All Loaded Indicator if total audits > 20 and no more pages -->
    <div
      v-else-if="audits.length > PAGE_SIZE"
      class="py-3 px-4 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 text-[11px] text-slate-400 dark:text-slate-500 font-medium"
    >
      Showing all {{ audits.length }} audit records
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

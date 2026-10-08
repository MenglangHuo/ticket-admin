<script setup lang="ts">
import { useTicketStore } from '@/stores/ticketStore'
import type { Ticket, TicketPriority, TicketStatus } from '@/types/ticket'
import { getTicketCompany, getTicketPhone, getTicketSource } from '@/utils/ticket'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bug,
  Building,
  Building2,
  CheckSquare,
  Clock,
  Eye,
  Globe,
  HelpCircle,
  Inbox,
  Paperclip,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import StatusDropdown from './StatusDropdown.vue'
import TablePagination from './TablePagination.vue'

const ticketStore = useTicketStore()

type SortField =
  | 'ticket_key'
  | 'title'
  | 'type'
  | 'status'
  | 'priority'
  | 'source'
  | 'company'
  | 'phone'
  | 'reporter'
  | 'created_at'

const sortField = ref<SortField>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

const priorityWeights: Record<TicketPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const statusWeights: Record<TicketStatus, number> = {
  open: 1,
  in_progress: 2,
  resolved: 3,
  closed: 4,
}

function toggleSort(field: SortField) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

const sortedTickets = computed(() => {
  const list = [...ticketStore.filteredTickets]
  const field = sortField.value
  const order = sortOrder.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (field === 'ticket_key') {
      const kA = (a.ticket_key || '').toLowerCase()
      const kB = (b.ticket_key || '').toLowerCase()
      return kA.localeCompare(kB) * order
    }
    if (field === 'title') {
      const tA = (a.title || '').toLowerCase()
      const tB = (b.title || '').toLowerCase()
      return tA.localeCompare(tB) * order
    }
    if (field === 'priority') {
      return (priorityWeights[a.priority] - priorityWeights[b.priority]) * order
    }
    if (field === 'status') {
      return (statusWeights[a.status] - statusWeights[b.status]) * order
    }
    if (field === 'created_at') {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * order
    }
    if (field === 'source') {
      const srcA = getTicketSource(a).toLowerCase()
      const srcB = getTicketSource(b).toLowerCase()
      return srcA.localeCompare(srcB) * order
    }
    if (field === 'company') {
      const compA = getTicketCompany(a).toLowerCase()
      const compB = getTicketCompany(b).toLowerCase()
      return compA.localeCompare(compB) * order
    }
    if (field === 'phone') {
      const phA = getTicketPhone(a).toLowerCase()
      const phB = getTicketPhone(b).toLowerCase()
      return phA.localeCompare(phB) * order
    }
    if (field === 'reporter') {
      const repA = (a.reporter_name || '').toLowerCase()
      const repB = (b.reporter_name || '').toLowerCase()
      return repA.localeCompare(repB) * order
    }
    const valA = ((a as any)[field] || '').toString().toLowerCase()
    const valB = ((b as any)[field] || '').toString().toLowerCase()
    return valA.localeCompare(valB) * order
  })
})

function handleStatusChange(ticket: Ticket, newStatus: TicketStatus) {
  ticketStore.transitionTicketStatus(ticket.id, newStatus)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return { date: '-', time: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: dateStr, time: '' }
  return {
    date: d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

type TableColumn =
  | 'ticket_key'
  | 'title'
  | 'type'
  | 'status'
  | 'priority'
  | 'source'
  | 'company'
  | 'phone'
  | 'reporter'
  | 'created_at'
  | 'actions'

// Column Default and Min Widths (in px)
const defaultColumnWidths: Record<TableColumn, number> = {
  ticket_key: 110,
  title: 250,
  type: 150,
  status: 145,
  priority: 130,
  source: 160,
  company: 140,
  phone: 150,
  reporter: 190,
  created_at: 170,
  actions: 100,
}

const minColumnWidths: Record<TableColumn, number> = {
  ticket_key: 90,
  title: 160,
  type: 100,
  status: 120,
  priority: 100,
  source: 120,
  company: 110,
  phone: 120,
  reporter: 140,
  created_at: 130,
  actions: 80,
}

function loadSavedWidths(): Record<TableColumn, number> {
  const raw = localStorage.getItem('bronx_table_column_widths')
  if (!raw) return { ...defaultColumnWidths }
  try {
    const parsed = JSON.parse(raw)
    if (parsed.ticket && (!parsed.ticket_key || !parsed.title)) {
      parsed.ticket_key = 110
      parsed.title = Math.max(160, parsed.ticket - 110)
    }
    return { ...defaultColumnWidths, ...parsed }
  } catch {
    return { ...defaultColumnWidths }
  }
}

const columnWidths = ref<Record<TableColumn, number>>(loadSavedWidths())

function getColWidth(col: TableColumn): number {
  return columnWidths.value[col] ?? defaultColumnWidths[col]
}

// const hasCustomWidths = computed(() => {
//   return (Object.keys(defaultColumnWidths) as TableColumn[]).some(
//     (key) => columnWidths.value[key] !== defaultColumnWidths[key],
//   )
// })

// Dynamic Column Resizing Logic
const resizingCol = ref<TableColumn | null>(null)
const startX = ref(0)
const startWidth = ref(0)

function onResizeStart(col: TableColumn, e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  resizingCol.value = col
  startX.value = e.clientX
  startWidth.value = getColWidth(col)

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!resizingCol.value) return
    const delta = moveEvent.clientX - startX.value
    const minW = minColumnWidths[resizingCol.value] || 80
    const newW = Math.max(minW, Math.min(800, startWidth.value + delta))
    columnWidths.value[resizingCol.value] = Math.round(newW)
  }

  const onMouseUp = () => {
    resizingCol.value = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    localStorage.setItem('bronx_table_column_widths', JSON.stringify(columnWidths.value))
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function resetColWidth(col: TableColumn) {
  if (defaultColumnWidths[col]) {
    columnWidths.value[col] = defaultColumnWidths[col]
    localStorage.setItem('bronx_table_column_widths', JSON.stringify(columnWidths.value))
  }
}

// function resetAllColWidths() {
//   columnWidths.value = { ...defaultColumnWidths }
//   localStorage.setItem('bronx_table_column_widths', JSON.stringify(columnWidths.value))
// }

// Horizontal Scroll State & Detection
const tableContainerRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function checkScroll() {
  const el = tableContainerRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 6
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 6
}

// function scrollTable(direction: 'left' | 'right') {
//   const el = tableContainerRef.value
//   if (!el) return
//   const distance = 260
//   el.scrollBy({
//     left: direction === 'left' ? -distance : distance,
//     behavior: 'smooth',
//   })
// }

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const el = tableContainerRef.value
  if (el) {
    el.addEventListener('scroll', checkScroll, { passive: true })
    checkScroll()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScroll()
      })
      resizeObserver.observe(el)
    }
  }
})

onUnmounted(() => {
  tableContainerRef.value?.removeEventListener('scroll', checkScroll)
  resizeObserver?.disconnect()
})

const visibleColumnCount = computed(() => {
  const cols = [
    ticketStore.tableColumnVisibility.ticket_key ?? ticketStore.tableColumnVisibility.ticket,
    ticketStore.tableColumnVisibility.title ?? ticketStore.tableColumnVisibility.ticket,
    ticketStore.tableColumnVisibility.type,
    ticketStore.tableColumnVisibility.status,
    ticketStore.tableColumnVisibility.priority,
    ticketStore.tableColumnVisibility.source,
    ticketStore.tableColumnVisibility.company,
    ticketStore.tableColumnVisibility.phone,
    ticketStore.tableColumnVisibility.reporter,
    ticketStore.tableColumnVisibility.created_at,
    ticketStore.tableColumnVisibility.actions,
  ]
  return cols.filter(Boolean).length
})

const totalTableWidth = computed(() => {
  let total = 0
  if (ticketStore.tableColumnVisibility.ticket_key ?? ticketStore.tableColumnVisibility.ticket) {
    total += getColWidth('ticket_key')
  }
  if (ticketStore.tableColumnVisibility.title ?? ticketStore.tableColumnVisibility.ticket) {
    total += getColWidth('title')
  }
  if (ticketStore.tableColumnVisibility.type) total += getColWidth('type')
  if (ticketStore.tableColumnVisibility.status) total += getColWidth('status')
  if (ticketStore.tableColumnVisibility.priority) total += getColWidth('priority')
  if (ticketStore.tableColumnVisibility.source) total += getColWidth('source')
  if (ticketStore.tableColumnVisibility.company) total += getColWidth('company')
  if (ticketStore.tableColumnVisibility.phone) total += getColWidth('phone')
  if (ticketStore.tableColumnVisibility.reporter) total += getColWidth('reporter')
  if (ticketStore.tableColumnVisibility.created_at) total += getColWidth('created_at')
  if (ticketStore.tableColumnVisibility.actions) total += getColWidth('actions')

  return total
})
</script>

<template>
  <div
    class="relative bg-white dark:bg-slate-900/90 rounded-xl border-0 border-slate-100 dark:border-slate-800 dark:shadow-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5 transition-colors"
  >
    <!-- If columns are selected -->
    <div
      v-if="visibleColumnCount > 0"
      ref="tableContainerRef"
      class="overflow-x-auto relative scroll-smooth custom-table-scroll"
    >
      <table
        class="text-left text-xs text-slate-700 dark:text-slate-300 table-fixed border-collapse"
        :style="{ minWidth: '100%', width: `${totalTableWidth}px` }"
      >
        <!-- Column Width Definition -->
        <colgroup>
          <col
            v-if="
              ticketStore.tableColumnVisibility.ticket_key ??
              ticketStore.tableColumnVisibility.ticket
            "
            :style="{ width: `${columnWidths.ticket_key}px` }"
          />
          <col
            v-if="
              ticketStore.tableColumnVisibility.title ?? ticketStore.tableColumnVisibility.ticket
            "
            :style="{ width: `${columnWidths.title}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.type"
            :style="{ width: `${columnWidths.type}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.status"
            :style="{ width: `${columnWidths.status}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.priority"
            :style="{ width: `${columnWidths.priority}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.source"
            :style="{ width: `${columnWidths.source}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.company"
            :style="{ width: `${columnWidths.company}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.phone"
            :style="{ width: `${columnWidths.phone}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.reporter"
            :style="{ width: `${columnWidths.reporter}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.created_at"
            :style="{ width: `${columnWidths.created_at}px` }"
          />
          <col
            v-if="ticketStore.tableColumnVisibility.actions"
            :style="{ width: `${columnWidths.actions}px` }"
          />
        </colgroup>

        <!-- Table Header (Sticky with Frosted Blur) -->
        <thead
          class="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none sticky top-0 z-20"
        >
          <tr>
            <!-- Ticket Key -->
            <th
              v-if="
                ticketStore.tableColumnVisibility.ticket_key ??
                ticketStore.tableColumnVisibility.ticket
              "
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{
                width: `${columnWidths.ticket_key}px`,
                minWidth: `${columnWidths.ticket_key}px`,
              }"
              @click="toggleSort('ticket_key')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Ticket Key</span>
                <component
                  :is="
                    sortField === 'ticket_key'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('ticket_key', $event)"
                @dblclick.stop="resetColWidth('ticket_key')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'ticket_key' }"
                ></div>
              </div>
            </th>

            <!-- Title -->
            <th
              v-if="
                ticketStore.tableColumnVisibility.title ?? ticketStore.tableColumnVisibility.ticket
              "
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{ width: `${columnWidths.title}px`, minWidth: `${columnWidths.title}px` }"
              @click="toggleSort('title')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Title</span>
                <component
                  :is="
                    sortField === 'title'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('title', $event)"
                @dblclick.stop="resetColWidth('title')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'title' }"
                ></div>
              </div>
            </th>

            <!-- Type -->
            <th
              v-if="ticketStore.tableColumnVisibility.type"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{ width: `${columnWidths.type}px`, minWidth: `${columnWidths.type}px` }"
              @click="toggleSort('type')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Type</span>
                <component
                  :is="
                    sortField === 'type' ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('type', $event)"
                @dblclick.stop="resetColWidth('type')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'type' }"
                ></div>
              </div>
            </th>

            <!-- Status -->
            <th
              v-if="ticketStore.tableColumnVisibility.status"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }"
              @click="toggleSort('status')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Status</span>
                <component
                  :is="
                    sortField === 'status'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('status', $event)"
                @dblclick.stop="resetColWidth('status')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'status' }"
                ></div>
              </div>
            </th>

            <!-- Priority -->
            <th
              v-if="ticketStore.tableColumnVisibility.priority"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{
                width: `${columnWidths.priority}px`,
                minWidth: `${columnWidths.priority}px`,
              }"
              @click="toggleSort('priority')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Priority</span>
                <component
                  :is="
                    sortField === 'priority'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('priority', $event)"
                @dblclick.stop="resetColWidth('priority')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'priority' }"
                ></div>
              </div>
            </th>

            <!-- Source -->
            <th
              v-if="ticketStore.tableColumnVisibility.source"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{ width: `${columnWidths.source}px`, minWidth: `${columnWidths.source}px` }"
              @click="toggleSort('source')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Source</span>
                <component
                  :is="
                    sortField === 'source'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('source', $event)"
                @dblclick.stop="resetColWidth('source')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'source' }"
                ></div>
              </div>
            </th>

            <!-- Company -->
            <th
              v-if="ticketStore.tableColumnVisibility.company"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{ width: `${columnWidths.company}px`, minWidth: `${columnWidths.company}px` }"
              @click="toggleSort('company')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Company</span>
                <component
                  :is="
                    sortField === 'company'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('company', $event)"
                @dblclick.stop="resetColWidth('company')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'company' }"
                ></div>
              </div>
            </th>

            <!-- Phone Number -->
            <th
              v-if="ticketStore.tableColumnVisibility.phone"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{ width: `${columnWidths.phone}px`, minWidth: `${columnWidths.phone}px` }"
              @click="toggleSort('phone')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Phone Number</span>
                <component
                  :is="
                    sortField === 'phone'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('phone', $event)"
                @dblclick.stop="resetColWidth('phone')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'phone' }"
                ></div>
              </div>
            </th>

            <!-- Reporter -->
            <th
              v-if="ticketStore.tableColumnVisibility.reporter"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{
                width: `${columnWidths.reporter}px`,
                minWidth: `${columnWidths.reporter}px`,
              }"
              @click="toggleSort('reporter')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Reporter</span>
                <component
                  :is="
                    sortField === 'reporter'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('reporter', $event)"
                @dblclick.stop="resetColWidth('reporter')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'reporter' }"
                ></div>
              </div>
            </th>

            <!-- Created At -->
            <th
              v-if="ticketStore.tableColumnVisibility.created_at"
              class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              :style="{
                width: `${columnWidths.created_at}px`,
                minWidth: `${columnWidths.created_at}px`,
              }"
              @click="toggleSort('created_at')"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span>Created At</span>
                <component
                  :is="
                    sortField === 'created_at'
                      ? sortOrder === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown
                  "
                  class="w-3 h-3 text-slate-400 shrink-0"
                />
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-indigo-500/15 active:bg-indigo-500/30 z-30"
                @mousedown.stop="onResizeStart('created_at', $event)"
                @dblclick.stop="resetColWidth('created_at')"
                title="Drag to resize, double-click to reset"
              >
                <div
                  class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-indigo-500 group-hover/resizer:h-full transition-all"
                  :class="{ 'bg-indigo-500 h-full': resizingCol === 'created_at' }"
                ></div>
              </div>
            </th>

            <!-- Actions (Sticky Right Column) -->
            <th
              v-if="ticketStore.tableColumnVisibility.actions"
              class="sticky right-0 z-20 py-3.5 px-4 text-right bg-slate-50 dark:bg-slate-950 backdrop-blur-md transition-all select-none"
              :class="{
                'freeze-col-shadow border-l border-slate-200/90 dark:border-slate-800':
                  canScrollRight,
                'border-l border-transparent': !canScrollRight,
              }"
              :style="{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }"
            >
              <span>Action</span>
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
          <tr
            v-for="ticket in sortedTickets"
            :key="ticket.id"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
            @click="ticketStore.openTicketDrawer(ticket)"
          >
            <!-- Ticket Key -->
            <td
              v-if="
                ticketStore.tableColumnVisibility.ticket_key ??
                ticketStore.tableColumnVisibility.ticket
              "
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{
                width: `${columnWidths.ticket_key}px`,
                minWidth: `${columnWidths.ticket_key}px`,
              }"
            >
              <span
                class="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/80 dark:border-indigo-800/50 inline-block text-[11px] shadow-2xs"
              >
                {{ ticket.ticket_key }}
              </span>
            </td>

            <!-- Title -->
            <td
              v-if="
                ticketStore.tableColumnVisibility.title ?? ticketStore.tableColumnVisibility.ticket
              "
              class="py-3.5 px-4"
              :style="{ width: `${columnWidths.title}px`, minWidth: `${columnWidths.title}px` }"
            >
              <div class="flex items-center gap-2 overflow-hidden">
                <span
                  class="font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate block flex-1"
                  :title="ticket.title"
                >
                  {{ ticket.title }}
                </span>
                <span
                  v-if="ticket.attachments && ticket.attachments.length > 0"
                  class="flex items-center text-[10px] text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/60"
                  :title="`${ticket.attachments.length} attachment(s)`"
                >
                  <Paperclip class="w-3 h-3 text-indigo-500 mr-0.5" />
                  {{ ticket.attachments.length }}
                </span>
              </div>
            </td>

            <!-- Type -->
            <td
              v-if="ticketStore.tableColumnVisibility.type"
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{ width: `${columnWidths.type}px`, minWidth: `${columnWidths.type}px` }"
            >
              <span
                class="inline-flex items-center gap-1.5 capitalize font-medium px-2 py-0.5 rounded-md"
                :class="{
                  'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10':
                    ticket.type === 'bug',
                  'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10':
                    ticket.type === 'enhancement',
                  'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10':
                    ticket.type === 'question',
                  'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10':
                    ticket.type === 'task',
                }"
              >
                <Bug v-if="ticket.type === 'bug'" class="w-3.5 h-3.5" />
                <Sparkles v-else-if="ticket.type === 'enhancement'" class="w-3.5 h-3.5" />
                <HelpCircle v-else-if="ticket.type === 'question'" class="w-3.5 h-3.5" />
                <CheckSquare v-else class="w-3.5 h-3.5" />
                <span>{{ ticket.type }}</span>
              </span>
            </td>

            <!-- Status Custom Dropdown -->
            <td
              v-if="ticketStore.tableColumnVisibility.status"
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }"
              @click.stop
            >
              <StatusDropdown
                :model-value="ticket.status"
                size="xs"
                @change="(newStatus) => handleStatusChange(ticket, newStatus)"
              />
            </td>

            <!-- Priority Badge -->
            <td
              v-if="ticketStore.tableColumnVisibility.priority"
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{
                width: `${columnWidths.priority}px`,
                minWidth: `${columnWidths.priority}px`,
              }"
            >
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                :class="{
                  'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30':
                    ticket.priority === 'critical',
                  'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30':
                    ticket.priority === 'high',
                  'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30':
                    ticket.priority === 'medium',
                  'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700/40':
                    ticket.priority === 'low',
                }"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="{
                    'bg-rose-500': ticket.priority === 'critical',
                    'bg-amber-500': ticket.priority === 'high',
                    'bg-sky-500': ticket.priority === 'medium',
                    'bg-slate-400': ticket.priority === 'low',
                  }"
                ></span>
                {{ ticket.priority }}
              </span>
            </td>

            <!-- Source (Role Badge) -->
            <td
              v-if="ticketStore.tableColumnVisibility.source"
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{ width: `${columnWidths.source}px`, minWidth: `${columnWidths.source}px` }"
            >
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide border shadow-2xs"
                :class="{
                  'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50':
                    getTicketSource(ticket).includes('HQ'),
                  'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50':
                    getTicketSource(ticket).includes('BRANCH'),
                  'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60':
                    !getTicketSource(ticket).includes('HQ') &&
                    !getTicketSource(ticket).includes('BRANCH'),
                }"
              >
                <ShieldCheck
                  v-if="getTicketSource(ticket).includes('HQ')"
                  class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"
                />
                <Building
                  v-else-if="getTicketSource(ticket).includes('BRANCH')"
                  class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                />
                <Globe v-else class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{{ getTicketSource(ticket) }}</span>
              </span>
            </td>

            <!-- Company -->
            <td
              v-if="ticketStore.tableColumnVisibility.company"
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{ width: `${columnWidths.company}px`, minWidth: `${columnWidths.company}px` }"
            >
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40 shadow-2xs"
              >
                <Building2 class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{{ getTicketCompany(ticket) }}</span>
              </span>
            </td>

            <!-- Phone Number -->
            <td
              v-if="ticketStore.tableColumnVisibility.phone"
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{ width: `${columnWidths.phone}px`, minWidth: `${columnWidths.phone}px` }"
            >
              <div
                v-if="getTicketPhone(ticket) !== '-'"
                class="inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <a
                  :href="`tel:${getTicketPhone(ticket)}`"
                  @click.stop
                  class="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors font-mono"
                  :title="`Call ${getTicketPhone(ticket)}`"
                >
                  <Phone class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{{ getTicketPhone(ticket) }}</span>
                </a>
              </div>
              <span v-else class="text-xs text-slate-400 dark:text-slate-600">-</span>
            </td>

            <!-- Reporter -->
            <td
              v-if="ticketStore.tableColumnVisibility.reporter"
              class="py-3.5 px-4"
              :style="{
                width: `${columnWidths.reporter}px`,
                minWidth: `${columnWidths.reporter}px`,
              }"
            >
              <div class="flex items-center gap-2 overflow-hidden">
                <div
                  class="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 shrink-0"
                >
                  {{ (ticket.reporter_name || 'U').charAt(0).toUpperCase() }}
                </div>
                <div class="truncate flex-1">
                  <div
                    class="text-slate-900 dark:text-slate-200 font-semibold truncate leading-tight"
                  >
                    {{ ticket.reporter_name || 'Anonymous' }}
                  </div>
                  <div
                    class="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5"
                  >
                    {{ ticket.reporter_email || '-' }}
                  </div>
                </div>
              </div>
            </td>

            <!-- Created At (Date AND Time) -->
            <td
              v-if="ticketStore.tableColumnVisibility.created_at"
              class="py-3.5 px-4 whitespace-nowrap"
              :style="{
                width: `${columnWidths.created_at}px`,
                minWidth: `${columnWidths.created_at}px`,
              }"
            >
              <div class="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{{ formatDate(ticket.created_at).date }}</span>
              </div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 pl-5 font-mono">
                {{ formatDate(ticket.created_at).time }}
              </div>
            </td>

            <!-- Actions (Sticky Right Column) -->
            <td
              v-if="ticketStore.tableColumnVisibility.actions"
              class="sticky right-0 z-10 py-3.5 px-4 text-right whitespace-nowrap bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 transition-all"
              :class="{
                'freeze-col-shadow border-l border-slate-200/70 dark:border-slate-800/80':
                  canScrollRight,
                'border-l border-transparent': !canScrollRight,
              }"
              :style="{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }"
            >
              <button
                @click.stop="ticketStore.openTicketDrawer(ticket)"
                class="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all inline-flex items-center gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
                title="View details"
              >
                <Eye class="w-3.5 h-3.5" />
                <span>View</span>
              </button>
            </td>
          </tr>

          <!-- Empty Row -->
          <tr v-if="ticketStore.filteredTickets.length === 0">
            <td
              :colspan="visibleColumnCount"
              class="py-16 text-center text-slate-400 dark:text-slate-500 text-xs"
            >
              <div class="flex flex-col items-center justify-center gap-2">
                <Inbox class="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <span class="font-medium text-slate-600 dark:text-slate-400">No tickets found</span>
                <span class="text-[11px] text-slate-400"
                  >Try adjusting your filters or search keywords</span
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- All Columns Hidden State -->
    <div v-else class="p-12 flex flex-col items-center justify-center text-center">
      <div
        class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3"
      >
        <Inbox class="w-6 h-6" />
      </div>
      <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
        All table columns are hidden
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        You have hidden all table columns. Use the Columns menu in the controls above to show
        columns.
      </p>
      <button
        type="button"
        @click="ticketStore.resetTableColumns()"
        class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
      >
        Restore Default Columns
      </button>
    </div>

    <!-- Table Pagination Component -->
    <TablePagination
      :current-page="ticketStore.pagination.current_page"
      :last-page="ticketStore.pagination.last_page"
      :total="ticketStore.pagination.total"
      :per-page="ticketStore.pagination.per_page"
      :from="ticketStore.pagination.from"
      :to="ticketStore.pagination.to"
      :disabled="ticketStore.isLoading"
      @change-page="(p) => ticketStore.goToPage(p)"
      @change-per-page="(pp) => ticketStore.changePerPage(pp)"
    />
  </div>
</template>

<style scoped>
.custom-table-scroll::-webkit-scrollbar {
  height: 8px;
}
.custom-table-scroll::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.08);
  border-radius: 9999px;
}
.custom-table-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 9999px;
  border: 1px solid transparent;
  background-clip: padding-box;
}
.custom-table-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
:global(.dark) .custom-table-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.25);
}
:global(.dark) .custom-table-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(129, 140, 248, 0.6);
}

.freeze-col-shadow {
  box-shadow:
    -4px 0 8px -2px rgba(15, 23, 42, 0.05),
    -2px 0 4px -2px rgba(15, 23, 42, 0.03);
}

:global(.dark) .freeze-col-shadow {
  box-shadow: -5px 0 10px -2px rgba(0, 0, 0, 0.4);
}
</style>

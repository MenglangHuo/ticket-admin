<script setup lang="ts">
import { type TabItem } from '@/components/common/BaseTabs.vue'
import CustomDropdown from '@/components/common/CustomDropdown.vue'
import CustomSelect, { type SelectOption } from '@/components/common/CustomSelect.vue'
import CreateTicketModal from '@/components/tickets/CreateTicketModal.vue'
import TicketDetailModal from '@/components/tickets/TicketDetailModal.vue'
import TicketKanban from '@/components/tickets/TicketKanban.vue'
import TicketTable from '@/components/tickets/TicketTable.vue'
import { useTicketStore, type TableColumnKey } from '@/stores/ticketStore'
import type { TicketStatus } from '@/types/ticket'
import { Columns3, List, Search, SlidersHorizontal, X } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const ticketStore = useTicketStore()

onMounted(() => {
  if (ticketStore.viewMode === 'grid') {
    ticketStore.viewMode = 'kanban'
  }
  if (ticketStore.tickets.length === 0) {
    ticketStore.fetchTickets()
  }
})

// const statusTabs = computed<TabItem[]>(() => {
//   const f = ticketStore.facets
//   return [
//     { id: 'all', label: 'All', badge: f.total || 0 },
//     { id: 'open', label: 'Open', badge: f.status.open || 0 },
//     { id: 'in_progress', label: 'In Progress', badge: f.status.in_progress || 0 },
//     { id: 'resolved', label: 'Resolved', badge: f.status.resolved || 0 },
//     { id: 'closed', label: 'Closed', badge: f.status.closed || 0 },
//   ]
// })

// function onStatusTabChange(status: string) {
//   ticketStore.statusFilter = status
//   ticketStore.goToPage(1)
// }

const statusOptions = computed<SelectOption[]>(() => {
  const f = ticketStore.facets
  const hasFacets = f && f.total > 0
  return [
    { label: hasFacets ? `All Statuses` : 'All Statuses', value: 'all' },
    {
      label: hasFacets ? `Open (${f.status.open || 0})` : 'Open',
      value: 'open',
      dotColor: 'bg-indigo-500',
    },
    {
      label: hasFacets ? `In Progress (${f.status.in_progress || 0})` : 'In Progress',
      value: 'in_progress',
      dotColor: 'bg-amber-500',
    },
    {
      label: hasFacets ? `Resolved (${f.status.resolved || 0})` : 'Resolved',
      value: 'resolved',
      dotColor: 'bg-emerald-500',
    },
    {
      label: hasFacets ? `Closed (${f.status.closed || 0})` : 'Closed',
      value: 'closed',
      dotColor: 'bg-slate-500',
    },
  ]
})

const priorityOptions = computed<SelectOption[]>(() => {
  const f = ticketStore.facets
  const hasFacets = f && f.total > 0
  return [
    { label: hasFacets ? `All Priorities` : 'All Priorities', value: 'all' },
    {
      label: hasFacets ? `Critical (${f.priority.critical || 0})` : 'Critical',
      value: 'critical',
      dotColor: 'bg-rose-500',
    },
    {
      label: hasFacets ? `High (${f.priority.high || 0})` : 'High',
      value: 'high',
      dotColor: 'bg-amber-500',
    },
    {
      label: hasFacets ? `Medium (${f.priority.medium || 0})` : 'Medium',
      value: 'medium',
      dotColor: 'bg-sky-500',
    },
    {
      label: hasFacets ? `Low (${f.priority.low || 0})` : 'Low',
      value: 'low',
      dotColor: 'bg-slate-500',
    },
  ]
})

const tableColumnOptions: Array<{ key: TableColumnKey; label: string }> = [
  { key: 'ticket_key', label: 'Ticket Key' },
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'source', label: 'Source' },
  { key: 'company', label: 'Company' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'reporter', label: 'Reporter' },
  { key: 'created_at', label: 'Created At' },
  { key: 'actions', label: 'Action' },
]

const kanbanColumnOptions: Array<{ key: TicketStatus; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

const activeColumnCount = computed(() => {
  if (ticketStore.viewMode === 'table') {
    return tableColumnOptions.filter((col) => ticketStore.tableColumnVisibility[col.key]).length
  }
  return Object.values(ticketStore.columnVisibility).filter(Boolean).length
})

let searchTimeout: any = null
function onSearchInput(event: Event) {
  const val = (event.target as HTMLInputElement).value
  ticketStore.searchQuery = val
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    ticketStore.goToPage(1)
  }, 300)
}

function clearSearch() {
  ticketStore.searchQuery = ''
  if (searchTimeout) clearTimeout(searchTimeout)
  ticketStore.goToPage(1)
}

function onFilterChange() {
  ticketStore.goToPage(1)
}

function resetColumns() {
  if (ticketStore.viewMode === 'table') {
    ticketStore.resetTableColumns()
  } else {
    ticketStore.setColumnVisibilityPreset('all')
  }
}

function clearAllFilters() {
  ticketStore.searchQuery = ''
  ticketStore.statusFilter = 'all'
  ticketStore.priorityFilter = 'all'
  ticketStore.goToPage(1)
}

const searchInputRef = ref<HTMLInputElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  } else if (
    e.key === '/' &&
    document.activeElement?.tagName !== 'INPUT' &&
    document.activeElement?.tagName !== 'TEXTAREA'
  ) {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Unified White Card Canvas Container from reference design -->
  <div
    class="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 lg:p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 transition-colors"
  >
    <!-- Top Header Toolbar: Left View Switcher (Kanban, Lists), Right Search & Filters -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Left: Segmented View Switcher matching screenshot -->
      <div
        class="inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 select-none self-start shrink-0"
      >
        <button
          type="button"
          @click="ticketStore.viewMode = 'kanban'"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer"
          :class="
            ticketStore.viewMode === 'kanban'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          "
        >
          <Columns3 class="w-3.5 h-3.5" />
          <span>Kanban</span>
        </button>
        <button
          type="button"
          @click="ticketStore.viewMode = 'table'"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer"
          :class="
            ticketStore.viewMode === 'table'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          "
        >
          <List class="w-3.5 h-3.5" />
          <span>Lists</span>
        </button>
      </div>

      <!-- Right: Search Input, Filters, and Columns -->
      <div class="flex flex-1 flex-wrap items-center justify-end gap-2.5">
        <!-- Search Input -->
        <div class="relative w-full sm:w-56 lg:w-64 group">
          <Search
            class="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
          />
          <input
            ref="searchInputRef"
            type="text"
            :value="ticketStore.searchQuery"
            @input="onSearchInput"
            placeholder="Search"
            class="w-full h-9 pl-9 pr-8 rounded-xl text-xs sm:text-[13px] bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-2xs font-normal"
          />
          <button
            v-if="ticketStore.searchQuery"
            type="button"
            @click="clearSearch"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Custom Status Filter -->
        <CustomSelect
          v-model="ticketStore.statusFilter"
          :options="statusOptions"
          placeholder="All Status"
          @change="onFilterChange"
        />

        <!-- Custom Priority Filter -->
        <CustomSelect
          v-model="ticketStore.priorityFilter"
          :options="priorityOptions"
          placeholder="All Priorities"
          @change="onFilterChange"
        />

        <!-- Columns Dropdown -->
        <CustomDropdown align="right" width="w-60">
          <template #trigger="{ isOpen }">
            <button
              type="button"
              class="h-9 px-3 rounded-xl border text-xs sm:text-[13px] font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer bg-slate-50/80 dark:bg-slate-950/80 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              :class="{
                'ring-2 ring-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400': isOpen,
              }"
              title="Customize visible columns"
            >
              <SlidersHorizontal class="w-3.5 h-3.5 text-slate-400" />
              <span>Columns</span>
              <span
                class="ml-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {{ activeColumnCount }}
              </span>
            </button>
          </template>

          <template #default>
            <div class="p-1">
              <div
                class="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-1"
              >
                <span
                  class="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                >
                  {{ ticketStore.viewMode === 'table' ? 'Table Columns' : 'Kanban Columns' }}
                </span>
                <button
                  type="button"
                  @click="resetColumns"
                  class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                >
                  Reset
                </button>
              </div>

              <!-- Table View Columns Checkboxes -->
              <div
                v-if="ticketStore.viewMode === 'table'"
                class="space-y-0.5 max-h-56 overflow-y-auto"
              >
                <label
                  v-for="col in tableColumnOptions"
                  :key="col.key"
                  class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer select-none text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="ticketStore.tableColumnVisibility[col.key]"
                    @change="ticketStore.toggleTableColumn(col.key)"
                    class="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>{{ col.label }}</span>
                </label>
              </div>

              <!-- Kanban View Columns Checkboxes -->
              <div v-else class="space-y-0.5 max-h-56 overflow-y-auto">
                <label
                  v-for="col in kanbanColumnOptions"
                  :key="col.key"
                  class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer select-none text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="ticketStore.columnVisibility[col.key]"
                    @change="ticketStore.toggleColumnVisibility(col.key)"
                    class="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>{{ col.label }}</span>
                </label>
              </div>
            </div>
          </template>
        </CustomDropdown>

        <!-- Clear Filters Pill Button -->
        <button
          v-if="
            ticketStore.searchQuery ||
            ticketStore.statusFilter !== 'all' ||
            ticketStore.priorityFilter !== 'all'
          "
          type="button"
          @click="clearAllFilters"
          class="h-9 px-3 rounded-xl border border-dashed border-rose-300 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Clear all active filters"
        >
          <X class="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Active View Component -->
    <div
      class="transition-opacity duration-200"
      :class="{
        'opacity-50 pointer-events-none': ticketStore.isLoading && ticketStore.viewMode === 'table',
      }"
    >
      <TicketKanban v-if="ticketStore.viewMode === 'kanban'" />
      <TicketTable v-else-if="ticketStore.viewMode === 'table'" />
    </div>

    <!-- Ticket Detail Modern Modal (Resizable, Draggable, Dockable) -->
    <TicketDetailModal />

    <!-- Create Ticket Modal -->
    <CreateTicketModal />
  </div>
</template>

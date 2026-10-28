<script setup lang="ts">
import CustomDropdown from '@/components/common/CustomDropdown.vue'
import CustomSelect, { type SelectOption } from '@/components/common/CustomSelect.vue'
import TablePagination from '@/components/tickets/TablePagination.vue'
import GenerateInviteModal from '@/components/settings/GenerateInviteModal.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bot,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Inbox,
  Link as LinkIcon,
  Plus,
  QrCode,
  RotateCcw,
  RotateCw,
  Search,
  Send,
  SlidersHorizontal,
  Users,
  X,
  AlertCircle,
} from 'lucide-vue-next'

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import InvitesTableSkeleton, { type InviteColumnKey } from './InvitesTableSkeleton.vue'
import type { TelegramUnusedInvite } from '@/types/settings'

withDefaults(
  defineProps<{
    activeTab?: 'config' | 'subscribers' | 'invite'
  }>(),
  {
    activeTab: 'invite',
  },
)

const emit = defineEmits<{
  (e: 'changeTab', tab: 'config' | 'subscribers' | 'invite'): void
  (e: 'goToSubscribers'): void
}>()

const settingsStore = useSettingsStore()
const toastStore = useToastStore()

// --- Column Visibility Configuration ---
const columnOptions: Array<{ key: InviteColumnKey; label: string }> = [
  { key: 'link', label: 'Invite Link / URL' },
  { key: 'token', label: 'Invite Token' },
  { key: 'status', label: 'Status' },
  { key: 'expires_at', label: 'Expires At' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'actions', label: 'Action' },
]

const defaultColumnVisibility: Record<InviteColumnKey, boolean> = {
  link: true,
  token: true,
  status: true,
  expires_at: true,
  created_at: true,
  actions: true,
}

function loadSavedColumnVisibility(): Record<InviteColumnKey, boolean> {
  const raw = localStorage.getItem('bronx_invites_column_visibility')
  if (!raw) return { ...defaultColumnVisibility }
  try {
    return { ...defaultColumnVisibility, ...JSON.parse(raw) }
  } catch {
    return { ...defaultColumnVisibility }
  }
}

const columnVisibility = ref<Record<InviteColumnKey, boolean>>(loadSavedColumnVisibility())

function toggleColumnVisibility(col: InviteColumnKey) {
  columnVisibility.value[col] = !columnVisibility.value[col]
  localStorage.setItem('bronx_invites_column_visibility', JSON.stringify(columnVisibility.value))
}

function resetColumns() {
  columnVisibility.value = { ...defaultColumnVisibility }
  localStorage.setItem('bronx_invites_column_visibility', JSON.stringify(columnVisibility.value))
}

const visibleColumnCount = computed(() => {
  return columnOptions.filter((col) => columnVisibility.value[col.key]).length
})

// --- Column Resizing & Width Configuration ---
const defaultColumnWidths: Record<InviteColumnKey, number> = {
  link: 300,
  token: 220,
  status: 160,
  expires_at: 180,
  created_at: 180,
  actions: 170,
}

const minColumnWidths: Record<InviteColumnKey, number> = {
  link: 200,
  token: 140,
  status: 110,
  expires_at: 140,
  created_at: 140,
  actions: 140,
}

function loadSavedWidths(): Record<InviteColumnKey, number> {
  const raw = localStorage.getItem('bronx_invites_column_widths')
  if (!raw) return { ...defaultColumnWidths }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (parsed.actions && parsed.actions < 160) {
        parsed.actions = 170
      }
      return { ...defaultColumnWidths, ...parsed }
    }
    return { ...defaultColumnWidths }
  } catch {
    return { ...defaultColumnWidths }
  }
}

const columnWidths = ref<Record<InviteColumnKey, number>>(loadSavedWidths())

function getColWidth(col: InviteColumnKey): number {
  return columnWidths.value[col] ?? defaultColumnWidths[col]
}

const resizingCol = ref<InviteColumnKey | null>(null)
const startX = ref(0)
const startWidth = ref(0)
let animationFrameId: number | null = null

function onResizeStart(col: InviteColumnKey, e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  resizingCol.value = col
  startX.value = e.clientX
  startWidth.value = getColWidth(col)

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!resizingCol.value) return
    if (animationFrameId) cancelAnimationFrame(animationFrameId)

    animationFrameId = requestAnimationFrame(() => {
      if (!resizingCol.value) return
      const delta = moveEvent.clientX - startX.value
      const minW = minColumnWidths[resizingCol.value] || 100
      const newW = Math.max(minW, Math.min(800, startWidth.value + delta))
      columnWidths.value[resizingCol.value] = Math.round(newW)
    })
  }

  const onMouseUp = () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    resizingCol.value = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    localStorage.setItem('bronx_invites_column_widths', JSON.stringify(columnWidths.value))
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mouseup', onMouseUp)
}

function resetColWidth(col: InviteColumnKey) {
  if (defaultColumnWidths[col]) {
    columnWidths.value[col] = defaultColumnWidths[col]
    localStorage.setItem('bronx_invites_column_widths', JSON.stringify(columnWidths.value))
  }
}

const totalTableWidth = computed(() => {
  let total = 0
  if (columnVisibility.value.link) total += getColWidth('link')
  if (columnVisibility.value.token) total += getColWidth('token')
  if (columnVisibility.value.status) total += getColWidth('status')
  if (columnVisibility.value.expires_at) total += getColWidth('expires_at')
  if (columnVisibility.value.created_at) total += getColWidth('created_at')
  if (columnVisibility.value.actions) total += getColWidth('actions')
  return total
})

// --- Horizontal Scroll Observation ---
const tableContainerRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function checkScroll() {
  const el = tableContainerRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 6
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 6
}

let resizeObserver: ResizeObserver | null = null

// --- Search, Filter, Sort & Pagination State ---
const rawSearchQuery = ref('')
const debouncedSearchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'expired'>('all')
const searchInputRef = ref<HTMLInputElement | null>(null)

type SortableField = 'link' | 'token' | 'status' | 'expires_at' | 'created_at'
const sortField = ref<SortableField>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Pagination
const currentPage = ref(1)
const perPage = ref(20)

async function loadInvites(force = false) {
  const backendSortField =
    sortField.value === 'link'
      ? 'invite_url'
      : sortField.value === 'token'
        ? 'token'
        : sortField.value === 'expires_at'
          ? 'expires_at'
          : sortField.value === 'created_at'
            ? 'created_at'
            : sortField.value

  await settingsStore.fetchUnusedInvites(
    {
      page: currentPage.value,
      per_page: perPage.value,
      search: debouncedSearchQuery.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      sort_by: backendSortField,
      sort_dir: sortOrder.value,
    },
    force,
  )
}

let debounceTimeout: any = null
watch(rawSearchQuery, (newVal) => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    debouncedSearchQuery.value = newVal.trim().toLowerCase()
  }, 200)
})

watch(debouncedSearchQuery, () => {
  currentPage.value = 1
  loadInvites(true)
})

watch(statusFilter, () => {
  currentPage.value = 1
  loadInvites(true)
})

function clearSearch() {
  rawSearchQuery.value = ''
  debouncedSearchQuery.value = ''
  if (debounceTimeout) clearTimeout(debounceTimeout)
  currentPage.value = 1
  loadInvites(true)
  searchInputRef.value?.focus()
}

function clearAllFilters() {
  rawSearchQuery.value = ''
  debouncedSearchQuery.value = ''
  if (debounceTimeout) clearTimeout(debounceTimeout)
  statusFilter.value = 'all'
  currentPage.value = 1
  loadInvites(true)
}

function onFilterChange() {
  currentPage.value = 1
  loadInvites(true)
}

const statusOptions: SelectOption[] = [
  { label: 'All Statuses', value: 'all', dotColor: 'bg-slate-400' },
  { label: 'Active Only', value: 'active', dotColor: 'bg-emerald-500' },
  { label: 'Expired Only', value: 'expired', dotColor: 'bg-rose-500' },
]

function toggleSort(field: SortableField) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  loadInvites(true)
}

// Helpers for dates and expiration
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const isoStr = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr
  const d = new Date(isoStr)
  return isNaN(d.getTime()) ? null : d
}

function isExpired(inviteOrExpiresAt?: string | TelegramUnusedInvite | null): boolean {
  if (!inviteOrExpiresAt) return false
  if (typeof inviteOrExpiresAt === 'object') {
    const inv = inviteOrExpiresAt as any
    if (inv.is_expired !== undefined) return Boolean(inv.is_expired)
    if (inv.status === 'expired') return true
    return isExpired(inv.expires_at)
  }
  const d = parseDate(inviteOrExpiresAt)
  if (!d) return false
  return d.getTime() <= Date.now()
}

function formatDate(dateStr?: string) {
  if (!dateStr) return { date: '-', time: '' }
  try {
    const d = parseDate(dateStr)
    if (!d) return { date: dateStr, time: '' }
    return {
      date: d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }
  } catch {
    return { date: dateStr, time: '' }
  }
}

function getTimeRemaining(expiresAt?: string): { text: string; isExpired: boolean } {
  if (!expiresAt) return { text: '-', isExpired: false }
  const d = parseDate(expiresAt)
  if (!d) return { text: expiresAt, isExpired: false }
  const now = Date.now()
  const diffMs = d.getTime() - now
  if (diffMs <= 0) {
    return { text: 'Expired', isExpired: true }
  }
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return { text: `${diffDays}d left`, isExpired: false }
  }
  if (diffHours > 0) {
    return { text: `${diffHours}h left`, isExpired: false }
  }
  return { text: `${diffMinutes}m left`, isExpired: false }
}

// Fallback filtering & sorting for client-side / mock mode
const filteredInvites = computed(() => {
  return settingsStore.unusedInvites.filter((invite) => {
    if (statusFilter.value === 'active' && isExpired(invite.expires_at)) return false
    if (statusFilter.value === 'expired' && !isExpired(invite.expires_at)) return false

    if (debouncedSearchQuery.value) {
      const q = debouncedSearchQuery.value
      const matchToken = invite.token ? invite.token.toLowerCase().includes(q) : false
      const matchUrl = invite.invite_url ? invite.invite_url.toLowerCase().includes(q) : false
      const matchId = String(invite.id).includes(q)
      const matchCreatedBy = invite.created_by ? String(invite.created_by).includes(q) : false
      return matchToken || matchUrl || matchId || matchCreatedBy
    }

    return true
  })
})

const sortedInvites = computed(() => {
  const list = [...filteredInvites.value]
  const field = sortField.value
  const order = sortOrder.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (field === 'link') {
      return (a.invite_url || '').localeCompare(b.invite_url || '') * order
    }
    if (field === 'token') {
      return (a.token || '').localeCompare(b.token || '') * order
    }
    if (field === 'expires_at') {
      const tA = parseDate(a.expires_at)?.getTime() || 0
      const tB = parseDate(b.expires_at)?.getTime() || 0
      return (tA - tB) * order
    }
    if (field === 'created_at') {
      const tA = parseDate(a.created_at)?.getTime() || 0
      const tB = parseDate(b.created_at)?.getTime() || 0
      return (tA - tB) * order
    }
    return 0
  })
})

const isFilteringActive = computed(() => {
  return statusFilter.value !== 'all' || Boolean(debouncedSearchQuery.value)
})

const serverDidFilter = computed(() => {
  if (!isFilteringActive.value) return true
  if (settingsStore.unusedInvites.length === 0) return true
  return filteredInvites.value.length === settingsStore.unusedInvites.length
})

const hasServerPagination = computed(() => {
  return (settingsStore.invitesPagination?.total ?? 0) > 0 && serverDidFilter.value
})

const totalCount = computed(() => {
  if (hasServerPagination.value) {
    return settingsStore.invitesPagination.total
  }
  return filteredInvites.value.length
})

const lastPage = computed(() => {
  if (hasServerPagination.value) {
    return Math.max(1, settingsStore.invitesPagination.total_pages)
  }
  return Math.max(1, Math.ceil(totalCount.value / perPage.value))
})

const paginatedInvites = computed(() => {
  if (hasServerPagination.value) {
    return settingsStore.unusedInvites
  }
  const start = (currentPage.value - 1) * perPage.value
  return sortedInvites.value.slice(start, start + perPage.value)
})

function onPageChange(page: number) {
  currentPage.value = page
  loadInvites(true)
}

function onPerPageChange(newPerPage: number) {
  perPage.value = newPerPage
  currentPage.value = 1
  loadInvites(true)
}

// Copy actions feedback
const copiedLink = ref<string | null>(null)
const copiedToken = ref<string | null>(null)

function copyToClipboard(text: string, type: 'link' | 'token') {
  navigator.clipboard.writeText(text)
  if (type === 'link') {
    copiedLink.value = text
    toastStore.success('Link Copied', 'Telegram invite link copied to clipboard')
    setTimeout(() => {
      copiedLink.value = null
    }, 2000)
  } else {
    copiedToken.value = text
    toastStore.success('Token Copied', text)
    setTimeout(() => {
      copiedToken.value = null
    }, 2000)
  }
}

// QR Code Preview Modal State
const isQrModalOpen = ref(false)
const selectedInviteForQr = ref<TelegramUnusedInvite | null>(null)

function openQrModal(invite: TelegramUnusedInvite) {
  selectedInviteForQr.value = invite
  isQrModalOpen.value = true
}

function closeQrModal() {
  isQrModalOpen.value = false
  selectedInviteForQr.value = null
}

// Generate Invite Modal State
const isGenerateModalOpen = ref(false)

function openGenerateModal() {
  isGenerateModalOpen.value = true
}

function handleGenerateModalClose() {
  isGenerateModalOpen.value = false
  loadInvites(true)
}

// Refresh Expired Invite State
const refreshingId = ref<number | string | null>(null)

async function handleRefreshInvite(invite: TelegramUnusedInvite) {
  if (refreshingId.value !== null) return
  refreshingId.value = invite.id
  try {
    await settingsStore.refreshInvite(invite.id)
  } catch (err) {
    console.error('Failed to refresh invite:', err)
  } finally {
    refreshingId.value = null
  }
}

onMounted(() => {
  if (settingsStore.unusedInvites.length === 0) {
    loadInvites(false)
  }

  const el = tableContainerRef.value
  if (el) {
    el.addEventListener('scroll', checkScroll, { passive: true })
    checkScroll()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => checkScroll())
      resizeObserver.observe(el)
    }
  }

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  tableContainerRef.value?.removeEventListener('scroll', checkScroll)
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', handleKeydown)
})

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

function handleRefresh() {
  loadInvites(true)
}

defineExpose({
  loadInvites,
  openGenerateModal,
})
</script>

<template>
  <div class="space-y-4">
    <!-- Top Header Toolbar: Segmented Tab Switcher (Left) and Search / Filters / Generate Button (Right) -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Left: Segmented Switcher (Generate Invite Link, Subscribers, Bot Config) -->
      <div
        class="inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 select-none self-start shrink-0"
      >
        <button
          type="button"
          @click="emit('changeTab', 'invite')"
          class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer"
          :class="
            activeTab === 'invite'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          "
        >
          <LinkIcon class="w-3.5 h-3.5" />
          <span>Generate Invite Link</span>
          <span
            class="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold"
            :class="
              activeTab === 'invite'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            "
          >
            {{ settingsStore.totalInvitesCount || totalCount }}
          </span>
        </button>

        <button
          type="button"
          @click="emit('changeTab', 'subscribers')"
          class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer"
          :class="
            activeTab === 'subscribers'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          "
        >
          <Users class="w-3.5 h-3.5" />
          <span>Subscribers</span>
          <span
            class="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold"
            :class="
              activeTab === 'subscribers'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            "
          >
            {{ settingsStore.totalSubscribersCount || settingsStore.subscribers.length }}
          </span>
        </button>

        <button
          type="button"
          @click="emit('changeTab', 'config')"
          class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all cursor-pointer"
          :class="
            activeTab === 'config'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          "
        >
          <Bot class="w-3.5 h-3.5" />
          <span>Bot Config</span>
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="(settingsStore.botInfo?.is_active ?? true) ? 'bg-emerald-500' : 'bg-amber-500'"
          ></span>
        </button>
      </div>

      <!-- Right Toolbar: Search, Status Filter, Columns, Refresh & "+ Generate Link" Button -->
      <div class="flex flex-1 flex-wrap items-center justify-end gap-2.5">
        <!-- Search Input -->
        <div class="relative w-full sm:w-56 lg:w-64 group">
          <Search
            class="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
          />
          <input
            ref="searchInputRef"
            v-model="rawSearchQuery"
            type="text"
            placeholder="Search token, URL, or ID..."
            class="w-full h-9 pl-9 pr-8 rounded-xl text-xs sm:text-[13px] bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-2xs font-normal"
          />
          <button
            v-if="rawSearchQuery"
            type="button"
            @click="clearSearch"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Status Filter Dropdown -->
        <CustomSelect
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="All Status"
          @change="onFilterChange"
        />

        <!-- Columns Customization Dropdown -->
        <CustomDropdown align="left" width="w-60">
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
                {{ visibleColumnCount }}
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
                  Table Columns
                </span>
                <button
                  type="button"
                  @click="resetColumns"
                  class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                >
                  Reset
                </button>
              </div>
              <div class="space-y-0.5 max-h-56 overflow-y-auto">
                <label
                  v-for="col in columnOptions"
                  :key="col.key"
                  class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer select-none text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="columnVisibility[col.key]"
                    @change="toggleColumnVisibility(col.key)"
                    class="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>{{ col.label }}</span>
                </label>
              </div>
            </div>
          </template>
        </CustomDropdown>

        <!-- Clear Filters Button -->
        <button
          v-if="isFilteringActive"
          type="button"
          @click="clearAllFilters"
          class="h-9 px-3 rounded-xl border border-dashed border-rose-300 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Clear all active filters"
        >
          <X class="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <!-- Refresh Button -->
        <button
          type="button"
          @click="handleRefresh"
          :disabled="settingsStore.isInvitesLoading"
          class="h-9 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-medium"
          title="Reload invite links"
        >
          <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': settingsStore.isInvitesLoading }" />
        </button>

        <!-- Primary CTA: Generate Invite Link -->
        <button
          type="button"
          @click="openGenerateModal"
          class="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Generate Link</span>
        </button>
      </div>
    </div>

    <!-- Error Alert Banner -->
    <div
      v-if="settingsStore.invitesError"
      class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 animate-fade-in"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="w-4 h-4 text-rose-500 shrink-0" />
        <span>{{ settingsStore.invitesError }}</span>
      </div>
      <button
        type="button"
        @click="loadInvites(true)"
        class="text-rose-700 dark:text-rose-300 hover:underline font-semibold cursor-pointer shrink-0"
      >
        Retry
      </button>
    </div>

    <!-- Modern Table Container -->
    <div
      class="relative bg-white dark:bg-slate-900/90 rounded-xl border-0 border-slate-200/80 dark:border-slate-800 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 transition-colors"
    >
      <!-- State 1: Skeleton Loading (Zero Layout Shift) -->
      <div
        v-if="settingsStore.isInvitesLoading && settingsStore.unusedInvites.length === 0"
        class="overflow-x-auto relative custom-table-scroll"
      >
        <InvitesTableSkeleton
          :column-widths="columnWidths"
          :visible-columns="columnVisibility"
          :total-width="totalTableWidth"
          :row-count="5"
        />
      </div>

      <!-- State 2: Main Table when columns are visible -->
      <div
        v-else-if="visibleColumnCount > 0"
        ref="tableContainerRef"
        class="overflow-x-auto relative scroll-smooth custom-table-scroll"
      >
        <table
          class="text-left text-xs text-slate-700 dark:text-slate-300 table-fixed border-collapse"
          :style="{ minWidth: '100%', width: `${totalTableWidth}px` }"
        >
          <!-- Dynamic Column Widths Definition -->
          <colgroup>
            <col v-if="columnVisibility.link" :style="{ width: `${columnWidths.link}px` }" />
            <col v-if="columnVisibility.token" :style="{ width: `${columnWidths.token}px` }" />
            <col v-if="columnVisibility.status" :style="{ width: `${columnWidths.status}px` }" />
            <col
              v-if="columnVisibility.expires_at"
              :style="{ width: `${columnWidths.expires_at}px` }"
            />
            <col
              v-if="columnVisibility.created_at"
              :style="{ width: `${columnWidths.created_at}px` }"
            />
            <col v-if="columnVisibility.actions" :style="{ width: `${columnWidths.actions}px` }" />
          </colgroup>

          <!-- Table Header (Sticky with Frosted Blur) -->
          <thead
            class="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none sticky top-0 z-20"
          >
            <tr>
              <!-- Invite Link / Deep Link -->
              <th
                v-if="columnVisibility.link"
                class="relative py-3.5 px-4 sm:px-5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{ width: `${columnWidths.link}px`, minWidth: `${columnWidths.link}px` }"
                @click="toggleSort('link')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Invite Link / URL</span>
                  <component
                    :is="
                      sortField === 'link'
                        ? sortOrder === 'asc'
                          ? ArrowUp
                          : ArrowDown
                        : ArrowUpDown
                    "
                    class="w-3 h-3 text-slate-400 shrink-0"
                  />
                </div>
                <div
                  class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-blue-500/15 active:bg-blue-500/30 z-30"
                  @mousedown.stop="onResizeStart('link', $event)"
                  @dblclick.stop="resetColWidth('link')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'link' }"
                  ></div>
                </div>
              </th>

              <!-- Token -->
              <th
                v-if="columnVisibility.token"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{ width: `${columnWidths.token}px`, minWidth: `${columnWidths.token}px` }"
                @click="toggleSort('token')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Invite Token</span>
                  <component
                    :is="
                      sortField === 'token'
                        ? sortOrder === 'asc'
                          ? ArrowUp
                          : ArrowDown
                        : ArrowUpDown
                    "
                    class="w-3 h-3 text-slate-400 shrink-0"
                  />
                </div>
                <div
                  class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-blue-500/15 active:bg-blue-500/30 z-30"
                  @mousedown.stop="onResizeStart('token', $event)"
                  @dblclick.stop="resetColWidth('token')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'token' }"
                  ></div>
                </div>
              </th>

              <!-- Status -->
              <th
                v-if="columnVisibility.status"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
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
                  class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-blue-500/15 active:bg-blue-500/30 z-30"
                  @mousedown.stop="onResizeStart('status', $event)"
                  @dblclick.stop="resetColWidth('status')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'status' }"
                  ></div>
                </div>
              </th>

              <!-- Expires At -->
              <th
                v-if="columnVisibility.expires_at"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{
                  width: `${columnWidths.expires_at}px`,
                  minWidth: `${columnWidths.expires_at}px`,
                }"
                @click="toggleSort('expires_at')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Expires At</span>
                  <component
                    :is="
                      sortField === 'expires_at'
                        ? sortOrder === 'asc'
                          ? ArrowUp
                          : ArrowDown
                        : ArrowUpDown
                    "
                    class="w-3 h-3 text-slate-400 shrink-0"
                  />
                </div>
                <div
                  class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-blue-500/15 active:bg-blue-500/30 z-30"
                  @mousedown.stop="onResizeStart('expires_at', $event)"
                  @dblclick.stop="resetColWidth('expires_at')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'expires_at' }"
                  ></div>
                </div>
              </th>

              <!-- Created At -->
              <th
                v-if="columnVisibility.created_at"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{
                  width: `${columnWidths.created_at}px`,
                  minWidth: `${columnWidths.created_at}px`,
                }"
                @click="toggleSort('created_at')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Created Date</span>
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
                  class="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center group/resizer hover:bg-blue-500/15 active:bg-blue-500/30 z-30"
                  @mousedown.stop="onResizeStart('created_at', $event)"
                  @dblclick.stop="resetColWidth('created_at')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'created_at' }"
                  ></div>
                </div>
              </th>

              <!-- Actions (Sticky Right Column) -->
              <th
                v-if="columnVisibility.actions"
                class="sticky right-0 z-20 py-3.5 px-4 sm:px-5 text-right bg-slate-50 dark:bg-slate-950 backdrop-blur-md transition-all select-none"
                :class="{
                  'freeze-col-shadow border-l border-slate-200/90 dark:border-slate-800':
                    canScrollRight,
                  'border-l border-transparent': !canScrollRight,
                }"
                :style="{
                  width: `${columnWidths.actions}px`,
                  minWidth: `${columnWidths.actions}px`,
                }"
              >
                <span>Action</span>
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            <tr
              v-for="invite in paginatedInvites"
              :key="invite.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group"
            >
              <!-- Link / Deeplink Column -->
              <td
                v-if="columnVisibility.link"
                class="py-3 px-4 sm:px-5"
                :style="{ width: `${columnWidths.link}px`, minWidth: `${columnWidths.link}px` }"
              >
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <div
                    class="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/80 dark:border-sky-500/30 shrink-0"
                  >
                    <Send class="w-3.5 h-3.5" />
                  </div>
                  <div class="truncate flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white truncate">
                      <a
                        :href="invite.invite_url || invite.deeplink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="truncate hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-mono text-[11px]"
                        :title="invite.invite_url || invite.deeplink"
                      >
                        {{ invite.invite_url || invite.deeplink }}
                      </a>
                      <a
                        :href="invite.invite_url || invite.deeplink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-slate-400 hover:text-blue-500 p-0.5 rounded transition-colors shrink-0"
                        title="Open in Telegram"
                      >
                        <ExternalLink class="w-3 h-3" />
                      </a>
                    </div>
                    <div class="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <span>Invite ID #{{ invite.id }}</span>
                      <span v-if="invite.company_id" class="text-slate-400">• Company #{{ invite.company_id }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Token Column -->
              <td
                v-if="columnVisibility.token"
                class="py-3 px-4 whitespace-nowrap"
                :style="{ width: `${columnWidths.token}px`, minWidth: `${columnWidths.token}px` }"
              >
                <button
                  type="button"
                  @click="copyToClipboard(invite.token, 'token')"
                  :title="copiedToken === invite.token ? 'Copied!' : 'Click to copy token'"
                  class="font-mono font-medium text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700/60 inline-flex items-center gap-1.5 transition-colors cursor-pointer group/copy shadow-2xs max-w-[200px] truncate"
                >
                  <span class="truncate">{{ invite.token }}</span>
                  <component
                    :is="copiedToken === invite.token ? Check : Copy"
                    class="w-3 h-3 shrink-0 transition-colors"
                    :class="
                      copiedToken === invite.token
                        ? 'text-emerald-500'
                        : 'text-slate-400 group-hover/copy:text-slate-600 dark:group-hover/copy:text-slate-200'
                    "
                  />
                </button>
              </td>

              <!-- Status Column -->
              <td
                v-if="columnVisibility.status"
                class="py-3 px-4 whitespace-nowrap"
                :style="{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }"
              >
                <div v-if="!isExpired(invite.expires_at)" class="inline-flex items-center gap-1.5">
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs select-none"
                    title="Invite is active and ready to be used"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Unused</span>
                  </span>
                </div>
                <div v-else class="inline-flex items-center gap-1.5 flex-wrap">
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 shadow-2xs select-none"
                    title="Invite token has expired"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Expired</span>
                  </span>
                  <button
                    type="button"
                    @click="handleRefreshInvite(invite)"
                    :disabled="refreshingId === invite.id"
                    title="Refresh expired invite link"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 transition-all cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RotateCw
                      class="w-2.5 h-2.5"
                      :class="{ 'animate-spin': refreshingId === invite.id }"
                    />
                    <span>Refresh</span>
                  </button>
                </div>
              </td>

              <!-- Expires At Column -->
              <td
                v-if="columnVisibility.expires_at"
                class="py-3 px-4 whitespace-nowrap"
                :style="{
                  width: `${columnWidths.expires_at}px`,
                  minWidth: `${columnWidths.expires_at}px`,
                }"
              >
                <div class="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                  <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{{ formatDate(invite.expires_at).date }}</span>
                  <span
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded font-medium"
                    :class="
                      getTimeRemaining(invite.expires_at).isExpired
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    "
                  >
                    {{ getTimeRemaining(invite.expires_at).text }}
                  </span>
                </div>
                <div
                  v-if="formatDate(invite.expires_at).time"
                  class="text-[10px] text-slate-400 dark:text-slate-500 pl-5 font-mono"
                >
                  {{ formatDate(invite.expires_at).time }}
                </div>
              </td>

              <!-- Created At Column -->
              <td
                v-if="columnVisibility.created_at"
                class="py-3 px-4 whitespace-nowrap"
                :style="{
                  width: `${columnWidths.created_at}px`,
                  minWidth: `${columnWidths.created_at}px`,
                }"
              >
                <div class="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                  <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{{ formatDate(invite.created_at).date }}</span>
                </div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 pl-5 font-mono flex items-center gap-1">
                  <span>{{ formatDate(invite.created_at).time }}</span>
                  <span v-if="invite.created_by" class="text-slate-400 dark:text-slate-500">
                    • User #{{ invite.created_by }}
                  </span>
                </div>
              </td>

              <!-- Actions Column (Sticky Right) -->
              <td
                v-if="columnVisibility.actions"
                class="sticky right-0 z-10 py-3 px-4 sm:px-5 text-right whitespace-nowrap bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 transition-all"
                :class="{
                  'freeze-col-shadow border-l border-slate-200/70 dark:border-slate-800/80':
                    canScrollRight,
                  'border-l border-transparent': !canScrollRight,
                }"
                :style="{
                  width: `${columnWidths.actions}px`,
                  minWidth: `${columnWidths.actions}px`,
                }"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Refresh Invite Link Action Button -->
                  <button
                    type="button"
                    @click="handleRefreshInvite(invite)"
                    :disabled="refreshingId === invite.id"
                    :title="isExpired(invite) ? 'Refresh expired invite link' : 'Refresh invite link'"
                    aria-label="Refresh invite link"
                    data-test="refresh-invite-btn"
                    class="p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed border"
                    :class="
                      isExpired(invite)
                        ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-200/90 dark:border-amber-800'
                        : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30'
                    "
                  >
                    <RotateCw
                      class="w-3.5 h-3.5"
                      :class="{ 'animate-spin': refreshingId === invite.id }"
                    />
                  </button>

                  <!-- Quick Copy Link -->
                  <button
                    type="button"
                    @click="copyToClipboard(invite.invite_url || invite.deeplink || '', 'link')"
                    :title="copiedLink === (invite.invite_url || invite.deeplink) ? 'Copied!' : 'Copy Link'"
                    class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all cursor-pointer shadow-2xs"
                  >
                    <component
                      :is="copiedLink === (invite.invite_url || invite.deeplink) ? Check : Copy"
                      class="w-3.5 h-3.5"
                      :class="copiedLink === (invite.invite_url || invite.deeplink) ? 'text-emerald-500' : ''"
                    />
                  </button>

                  <!-- View QR Code Modal -->
                  <button
                    type="button"
                    @click="openQrModal(invite)"
                    title="View QR Code"
                    class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all cursor-pointer shadow-2xs"
                  >
                    <QrCode class="w-3.5 h-3.5 text-indigo-500" />
                  </button>

                  <!-- Open in Telegram External Link -->
                  <a
                    :href="invite.invite_url || invite.deeplink"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Telegram"
                    class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 border border-slate-200 dark:border-slate-800 hover:border-sky-200 dark:hover:border-sky-500/30 transition-all cursor-pointer shadow-2xs"
                  >
                    <Send class="w-3.5 h-3.5 text-sky-500" />
                  </a>
                </div>
              </td>
            </tr>

            <!-- Empty Row if No Filter Match -->
            <tr v-if="paginatedInvites.length === 0">
              <td
                :colspan="visibleColumnCount"
                class="py-16 text-center text-slate-400 dark:text-slate-500 text-xs"
              >
                <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                  <Inbox class="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <span class="font-medium text-slate-600 dark:text-slate-400 text-sm">
                    {{ isFilteringActive ? 'No matching invite links' : 'No unused invite links yet' }}
                  </span>
                  <span class="text-[11px] text-slate-400 max-w-xs">
                    {{
                      isFilteringActive
                        ? 'Try adjusting your search query or status filter'
                        : 'Generate a Telegram bot invite link so staff members can onboard and subscribe'
                    }}
                  </span>
                  <button
                    v-if="isFilteringActive"
                    type="button"
                    @click="clearAllFilters"
                    class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium shadow-2xs transition-all cursor-pointer"
                  >
                    <RotateCcw class="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                  <button
                    v-else
                    type="button"
                    @click="openGenerateModal"
                    class="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>Generate Invite Link</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- State 3: All Columns Hidden State -->
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
          You have hidden all table columns. Use the Columns menu in the controls above to restore columns.
        </p>
        <button
          type="button"
          @click="resetColumns"
          class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
        >
          Restore Default Columns
        </button>
      </div>

      <!-- Table Pagination Component -->
      <TablePagination
        v-if="visibleColumnCount > 0 && totalCount > 0"
        :current-page="currentPage"
        :last-page="lastPage"
        :total="totalCount"
        :per-page="perPage"
        item-label="invite links"
        :disabled="settingsStore.isInvitesLoading"
        @change-page="onPageChange"
        @change-per-page="onPerPageChange"
      />
    </div>

    <!-- QR Code Preview Modal -->
    <div
      v-if="isQrModalOpen && selectedInviteForQr"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      @click.self="closeQrModal"
    >
      <div
        class="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-slate-100"
      >
        <!-- Modal Header -->
        <div
          class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs"
            >
              <QrCode class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-xs font-bold text-slate-900 dark:text-white">
                Telegram Bot Invite QR
              </h3>
              <p class="text-[10px] text-slate-500 dark:text-slate-400">
                Token: {{ selectedInviteForQr.token.substring(0, 12) }}...
              </p>
            </div>
          </div>
          <button
            @click="closeQrModal"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body: QR Code & Link -->
        <div class="p-6 text-center space-y-4">
          <div class="p-3 bg-white rounded-2xl inline-block shadow-sm border border-slate-200">
            <img
              :src="`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedInviteForQr.invite_url || selectedInviteForQr.deeplink || '')}`"
              alt="Telegram Bot Invite QR Code"
              class="w-40 h-40 mx-auto rounded-lg"
              loading="lazy"
            />
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Scan with your mobile camera or Telegram app to subscribe directly
          </p>

          <!-- Copy Link Input -->
          <div
            class="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800"
          >
            <input
              type="text"
              readonly
              :value="selectedInviteForQr.invite_url || selectedInviteForQr.deeplink"
              @click="($event.target as HTMLInputElement).select()"
              class="w-full bg-transparent font-mono text-[11px] text-sky-600 dark:text-sky-400 px-2 focus:outline-none select-all cursor-pointer truncate"
            />
            <button
              @click="copyToClipboard(selectedInviteForQr.invite_url || selectedInviteForQr.deeplink || '', 'link')"
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shrink-0 shadow-2xs transition-all cursor-pointer"
            >
              <component
                :is="copiedLink === (selectedInviteForQr.invite_url || selectedInviteForQr.deeplink) ? Check : Copy"
                class="w-3 h-3"
              />
              <span>{{ copiedLink === (selectedInviteForQr.invite_url || selectedInviteForQr.deeplink) ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 gap-2"
        >
          <div class="flex items-center gap-3">
            <a
              :href="selectedInviteForQr.invite_url || selectedInviteForQr.deeplink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              <Send class="w-3.5 h-3.5" />
              <span>Open in Telegram</span>
            </a>

            <button
              type="button"
              @click="handleRefreshInvite(selectedInviteForQr)"
              :disabled="refreshingId === selectedInviteForQr.id"
              class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium cursor-pointer disabled:opacity-50"
              title="Refresh this invite link"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshingId === selectedInviteForQr.id }" />
              <span>Refresh Link</span>
            </button>
          </div>

          <button
            @click="closeQrModal"
            class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Generate Invite Link Modal -->
    <GenerateInviteModal
      :is-open="isGenerateModalOpen"
      @close="handleGenerateModalClose"
    />
  </div>
</template>

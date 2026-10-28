<script setup lang="ts">
import CustomDropdown from '@/components/common/CustomDropdown.vue'
import CustomSelect, { type SelectOption } from '@/components/common/CustomSelect.vue'
import TablePagination from '@/components/tickets/TablePagination.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Inbox,
  Link as LinkIcon,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  User,
  Users,
  Headphones,
  X,
  Bot,
} from 'lucide-vue-next'

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import SubscribersTableSkeleton, { type SubscriberColumnKey } from './SubscribersTableSkeleton.vue'
import type { TelegramSubscriber } from '@/types/settings'

withDefaults(
  defineProps<{
    activeTab?: 'config' | 'subscribers' | 'invite'
  }>(),
  {
    activeTab: 'subscribers',
  },
)

const emit = defineEmits<{
  (e: 'changeTab', tab: 'config' | 'subscribers' | 'invite'): void
  (e: 'openInviteModal'): void
  (e: 'goToInviteTab'): void
}>()

const settingsStore = useSettingsStore()
const toastStore = useToastStore()

// --- Column Visibility Configuration ---
const columnOptions: Array<{ key: SubscriberColumnKey; label: string }> = [
  { key: 'user', label: 'Telegram User' },
  { key: 'type', label: 'Subscriber Type' },
  { key: 'chat_id', label: 'Telegram Chat ID' },
  { key: 'status', label: 'Ticket Notifications' },
  { key: 'subscribed_at', label: 'Subscribed Date' },
  { key: 'actions', label: 'Action' },
]

const defaultColumnVisibility: Record<SubscriberColumnKey, boolean> = {
  user: true,
  type: true,
  chat_id: true,
  status: true,
  subscribed_at: true,
  actions: true,
}

function loadSavedColumnVisibility(): Record<SubscriberColumnKey, boolean> {
  const raw = localStorage.getItem('bronx_subscribers_column_visibility')
  if (!raw) return { ...defaultColumnVisibility }
  try {
    return { ...defaultColumnVisibility, ...JSON.parse(raw) }
  } catch {
    return { ...defaultColumnVisibility }
  }
}

const columnVisibility = ref<Record<SubscriberColumnKey, boolean>>(loadSavedColumnVisibility())

function toggleColumnVisibility(col: SubscriberColumnKey) {
  columnVisibility.value[col] = !columnVisibility.value[col]
  localStorage.setItem(
    'bronx_subscribers_column_visibility',
    JSON.stringify(columnVisibility.value),
  )
}

function resetColumns() {
  columnVisibility.value = { ...defaultColumnVisibility }
  localStorage.setItem(
    'bronx_subscribers_column_visibility',
    JSON.stringify(columnVisibility.value),
  )
}

const visibleColumnCount = computed(() => {
  return columnOptions.filter((col) => columnVisibility.value[col.key]).length
})

// --- Column Resizing & Width Configuration ---
const defaultColumnWidths: Record<SubscriberColumnKey, number> = {
  user: 240,
  type: 170,
  chat_id: 180,
  status: 190,
  subscribed_at: 170,
  actions: 120,
}

const minColumnWidths: Record<SubscriberColumnKey, number> = {
  user: 170,
  type: 140,
  chat_id: 130,
  status: 130,
  subscribed_at: 130,
  actions: 100,
}

function loadSavedWidths(): Record<SubscriberColumnKey, number> {
  const raw = localStorage.getItem('bronx_subscribers_column_widths')
  if (!raw) return { ...defaultColumnWidths }
  try {
    return { ...defaultColumnWidths, ...JSON.parse(raw) }
  } catch {
    return { ...defaultColumnWidths }
  }
}

const columnWidths = ref<Record<SubscriberColumnKey, number>>(loadSavedWidths())

function getColWidth(col: SubscriberColumnKey): number {
  return columnWidths.value[col] ?? defaultColumnWidths[col]
}

// const hasCustomWidths = computed(() => {
//   return (Object.keys(defaultColumnWidths) as SubscriberColumnKey[]).some(
//     (key) => columnWidths.value[key] !== defaultColumnWidths[key],
//   )
// })

const resizingCol = ref<SubscriberColumnKey | null>(null)
const startX = ref(0)
const startWidth = ref(0)
let animationFrameId: number | null = null

function onResizeStart(col: SubscriberColumnKey, e: MouseEvent) {
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
    localStorage.setItem('bronx_subscribers_column_widths', JSON.stringify(columnWidths.value))
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mouseup', onMouseUp)
}

function resetColWidth(col: SubscriberColumnKey) {
  if (defaultColumnWidths[col]) {
    columnWidths.value[col] = defaultColumnWidths[col]
    localStorage.setItem('bronx_subscribers_column_widths', JSON.stringify(columnWidths.value))
  }
}

// function resetAllColWidths() {
//   columnWidths.value = { ...defaultColumnWidths }
//   localStorage.setItem('bronx_subscribers_column_widths', JSON.stringify(columnWidths.value))
// }

const totalTableWidth = computed(() => {
  let total = 0
  if (columnVisibility.value.user) total += getColWidth('user')
  if (columnVisibility.value.chat_id) total += getColWidth('chat_id')
  if (columnVisibility.value.status) total += getColWidth('status')
  if (columnVisibility.value.subscribed_at) total += getColWidth('subscribed_at')
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

// function scrollTable(direction: 'left' | 'right') {
//   const el = tableContainerRef.value
//   if (!el) return
//   const distance = 240
//   el.scrollBy({
//     left: direction === 'left' ? -distance : distance,
//     behavior: 'smooth',
//   })
// }

let resizeObserver: ResizeObserver | null = null

// --- Search, Filter, Sort & Pagination State ---
const rawSearchQuery = ref('')
const debouncedSearchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const subscriberTypeFilter = ref<'all' | 'RESOLVER' | 'REQUESTER'>('all')
const searchInputRef = ref<HTMLInputElement | null>(null)

async function loadSubscribers(force = false) {
  const backendSortField =
    sortField.value === 'user'
      ? 'telegram_username'
      : sortField.value === 'type'
        ? 'subscriber_type'
        : sortField.value === 'chat_id'
          ? 'telegram_chat_id'
          : sortField.value === 'status'
            ? 'is_active'
            : sortField.value

  await settingsStore.fetchSubscribers(
    {
      page: currentPage.value,
      per_page: perPage.value,
      search: debouncedSearchQuery.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      subscriber_type:
        subscriberTypeFilter.value !== 'all' ? subscriberTypeFilter.value : undefined,
      type: subscriberTypeFilter.value !== 'all' ? subscriberTypeFilter.value : undefined,
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
  loadSubscribers(true)
})

watch(subscriberTypeFilter, () => {
  currentPage.value = 1
  loadSubscribers(true)
})

watch(statusFilter, () => {
  currentPage.value = 1
  loadSubscribers(true)
})

function clearSearch() {
  rawSearchQuery.value = ''
  debouncedSearchQuery.value = ''
  if (debounceTimeout) clearTimeout(debounceTimeout)
  currentPage.value = 1
  loadSubscribers(true)
  searchInputRef.value?.focus()
}

function clearAllFilters() {
  rawSearchQuery.value = ''
  debouncedSearchQuery.value = ''
  if (debounceTimeout) clearTimeout(debounceTimeout)
  statusFilter.value = 'all'
  subscriberTypeFilter.value = 'all'
  currentPage.value = 1
  loadSubscribers(true)
}

function onFilterChange() {
  currentPage.value = 1
  loadSubscribers(true)
}

const statusOptions: SelectOption[] = [
  { label: 'All Statuses', value: 'all', dotColor: 'bg-slate-400' },
  { label: 'Active Only', value: 'active', dotColor: 'bg-emerald-500' },
  { label: 'Muted Only', value: 'inactive', dotColor: 'bg-amber-500' },
]

const subscriberTypeOptions: SelectOption[] = [
  { label: 'All Subscribers', value: 'all', dotColor: 'bg-slate-400' },
  { label: 'Admin ', value: 'RESOLVER', dotColor: 'bg-blue-500' },
  { label: 'Requesters', value: 'REQUESTER', dotColor: 'bg-emerald-500' },
]

type SortableField = 'user' | 'type' | 'chat_id' | 'status' | 'subscribed_at'
const sortField = ref<SortableField>('subscribed_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

function toggleSort(field: SortableField) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  loadSubscribers(true)
}

// Action button loading and clipboard states
const copiedChatId = ref<string | null>(null)
const togglingChatId = ref<string | null>(null)
const pingingChatId = ref<string | null>(null)
const deletingIdentifier = ref<string | number | null>(null)

// Pagination
const currentPage = ref(1)
const perPage = ref(10)

onMounted(() => {
  // If subscribers are not loaded yet, fetch them (force = false allows caching)
  if (settingsStore.subscribers.length === 0) {
    loadSubscribers(false)
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
  if (e.key === 'Escape' && isDeleteModalOpen.value && !isDeleting.value) {
    e.preventDefault()
    closeDeleteModal()
    return
  }
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

// Fallback filtered subscribers list (for in-memory mock testing)
const filteredSubscribers = computed(() => {
  return settingsStore.subscribers.filter((sub) => {
    // Status filter
    if (statusFilter.value === 'active' && !sub.is_active) return false
    if (statusFilter.value === 'inactive' && sub.is_active) return false

    // Subscriber type filter
    if (subscriberTypeFilter.value !== 'all') {
      const type = (sub.subscriber_type || 'RESOLVER').toUpperCase()
      if (type !== subscriberTypeFilter.value) return false
    }

    // Search query
    if (debouncedSearchQuery.value) {
      const q = debouncedSearchQuery.value
      const matchHandle = sub.telegram_username
        ? sub.telegram_username.toLowerCase().includes(q)
        : false
      const matchChatId = sub.telegram_chat_id ? sub.telegram_chat_id.includes(q) : false
      const matchId = String(sub.id).includes(q)
      const matchType = (sub.subscriber_type || 'RESOLVER').toLowerCase().includes(q)
      const matchUserId = sub.user_id ? String(sub.user_id).includes(q) : false
      const matchUserName = sub.user?.name ? sub.user.name.toLowerCase().includes(q) : false
      return matchHandle || matchChatId || matchId || matchType || matchUserId || matchUserName
    }

    return true
  })
})

// Fallback sorted subscribers list (for in-memory mock testing)
const sortedSubscribers = computed(() => {
  const list = [...filteredSubscribers.value]
  const field = sortField.value
  const order = sortOrder.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (field === 'user') {
      const uA = (a.telegram_username || '').toLowerCase()
      const uB = (b.telegram_username || '').toLowerCase()
      return uA.localeCompare(uB) * order
    }
    if (field === 'type') {
      const tA = (a.subscriber_type || 'RESOLVER').toLowerCase()
      const tB = (b.subscriber_type || 'RESOLVER').toLowerCase()
      return tA.localeCompare(tB) * order
    }
    if (field === 'chat_id') {
      const idA = a.telegram_chat_id || ''
      const idB = b.telegram_chat_id || ''
      return idA.localeCompare(idB) * order
    }
    if (field === 'status') {
      const sA = a.is_active ? 1 : 0
      const sB = b.is_active ? 1 : 0
      return (sA - sB) * order
    }
    if (field === 'subscribed_at') {
      const tA = new Date(a.subscribed_at).getTime() || 0
      const tB = new Date(b.subscribed_at).getTime() || 0
      return (tA - tB) * order
    }
    return 0
  })
})

const isFilteringActive = computed(() => {
  return (
    subscriberTypeFilter.value !== 'all' ||
    statusFilter.value !== 'all' ||
    Boolean(debouncedSearchQuery.value)
  )
})

const serverDidFilter = computed(() => {
  if (!isFilteringActive.value) return true
  if (settingsStore.subscribers.length === 0) return true
  return filteredSubscribers.value.length === settingsStore.subscribers.length
})

const hasServerPagination = computed(() => {
  return (settingsStore.pagination?.total ?? 0) > 0 && serverDidFilter.value
})

const totalCount = computed(() => {
  if (hasServerPagination.value) {
    return settingsStore.pagination.total
  }
  return filteredSubscribers.value.length
})

const lastPage = computed(() => {
  if (hasServerPagination.value) {
    return Math.max(1, settingsStore.pagination.total_pages)
  }
  return Math.max(1, Math.ceil(totalCount.value / perPage.value))
})

const paginatedSubscribers = computed(() => {
  if (hasServerPagination.value) {
    return settingsStore.subscribers
  }
  const start = (currentPage.value - 1) * perPage.value
  return sortedSubscribers.value.slice(start, start + perPage.value)
})

function onPageChange(page: number) {
  currentPage.value = page
  loadSubscribers(true)
}

function onPerPageChange(newPerPage: number) {
  perPage.value = newPerPage
  currentPage.value = 1
  loadSubscribers(true)
}

function copyChatId(chatId: string) {
  navigator.clipboard.writeText(chatId)
  copiedChatId.value = chatId
  toastStore.success('Chat ID Copied', chatId)
  setTimeout(() => {
    copiedChatId.value = null
  }, 2000)
}

async function handleToggle(chatId: string, currentStatus: boolean) {
  togglingChatId.value = chatId
  try {
    await settingsStore.toggleSubscriberNotification(chatId, currentStatus)
  } finally {
    togglingChatId.value = null
  }
}

async function handlePingUser(chatId: string, username?: string | null) {
  pingingChatId.value = chatId
  try {
    await settingsStore.sendTestNotification(chatId, username || undefined)
  } catch (err) {
    console.error('Failed to send test notification:', err)
  } finally {
    pingingChatId.value = null
  }
}

const isDeleteModalOpen = ref(false)
const subscriberToDelete = ref<TelegramSubscriber | null>(null)
const isDeleting = ref(false)

function getSubscriberIdentifier(sub: TelegramSubscriber): string | number {
  return (sub as any).identifier ?? sub.id ?? sub.telegram_chat_id
}

function handleDelete(sub: TelegramSubscriber) {
  subscriberToDelete.value = sub
  isDeleteModalOpen.value = true
}

function closeDeleteModal(force = false) {
  if (isDeleting.value && force !== true) return
  isDeleteModalOpen.value = false
  subscriberToDelete.value = null
}

async function confirmDelete() {
  if (!subscriberToDelete.value) return
  const sub = subscriberToDelete.value
  const identifier = getSubscriberIdentifier(sub)

  isDeleting.value = true
  deletingIdentifier.value = identifier
  try {
    await settingsStore.deleteSubscriber(identifier, sub.subscriber_type)
    toastStore.success(
      'Subscriber Deleted',
      sub.telegram_username
        ? `@${sub.telegram_username} was removed from Telegram subscribers.`
        : `Subscriber ${sub.telegram_chat_id} was removed.`,
    )
    isDeleting.value = false
    deletingIdentifier.value = null
    closeDeleteModal(true)
    await loadSubscribers(true)
  } catch (err: any) {
    console.error('Failed to delete subscriber:', err)
    toastStore.error(
      'Delete Failed',
      err.response?.data?.message || err.message || 'Could not delete subscriber.',
    )
  } finally {
    isDeleting.value = false
    deletingIdentifier.value = null
  }
}

async function handleRemove(chatIdOrSub: string | TelegramSubscriber, username?: string | null) {
  if (typeof chatIdOrSub === 'object') {
    return handleDelete(chatIdOrSub)
  }
  const found = settingsStore.subscribers.find(
    (s) => s.telegram_chat_id === chatIdOrSub || String(s.id) === String(chatIdOrSub),
  )
  if (found) {
    return handleDelete(found)
  }
  return handleDelete({
    id: chatIdOrSub,
    telegram_chat_id: chatIdOrSub,
    telegram_username: username || null,
    is_active: false,
    subscribed_at: '',
  })
}

defineExpose({
  handleDelete,
  handleRemove,
  confirmDelete,
  closeDeleteModal,
  isDeleteModalOpen,
  subscriberToDelete,
  loadSubscribers,
})

function handleRefresh() {
  loadSubscribers(true)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return { date: '-', time: '' }
  try {
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
  } catch {
    return { date: dateStr, time: '' }
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Top Header Toolbar: Left Segmented Tab Switcher, Right Search, Filters, Columns & Refresh (matching TicketsView) -->
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
            {{ settingsStore.totalInvitesCount }}
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

      <!-- Right: Search Input, Status Filter, Columns, Reset & Refresh -->
      <div class="flex flex-1 flex-wrap items-center justify-end gap-2.5">
        <!-- Search Input with Keyboard Shortcut & Clear Button -->
        <div class="relative w-full sm:w-56 lg:w-64 group">
          <Search
            class="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
          />
          <input
            ref="searchInputRef"
            v-model="rawSearchQuery"
            type="text"
            placeholder="Search @username or Chat ID..."
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

        <!-- Custom Status Filter Dropdown -->
        <CustomSelect
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="All Status"
          @change="onFilterChange"
        />

        <!-- Custom Subscriber Type Filter Dropdown -->
        <CustomSelect
          v-model="subscriberTypeFilter"
          :options="subscriberTypeOptions"
          placeholder="All Types"
          @change="onFilterChange"
        />

        <!-- Columns (Hide or Show) Dropdown matching TicketsView -->
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

        <!-- Clear Active Filters Pill Button -->
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
          :disabled="settingsStore.isLoading"
          class="h-9 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-medium"
          title="Reload subscribers"
        >
          <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': settingsStore.isLoading }" />
        </button>
      </div>
    </div>

    <!-- Modern Table Container matching TicketTable.vue -->
    <div
      class="relative bg-white dark:bg-slate-900/90 rounded-xl border-0 border-slate-200/80 dark:border-slate-800 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 transition-colors"
    >
      <!-- State 1: Skeleton Loading Loader (zero layout shift) -->
      <div
        v-if="settingsStore.isLoading && settingsStore.subscribers.length === 0"
        class="overflow-x-auto relative custom-table-scroll"
      >
        <SubscribersTableSkeleton
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
            <col v-if="columnVisibility.user" :style="{ width: `${columnWidths.user}px` }" />
            <col v-if="columnVisibility.type" :style="{ width: `${columnWidths.type}px` }" />
            <col v-if="columnVisibility.chat_id" :style="{ width: `${columnWidths.chat_id}px` }" />
            <col v-if="columnVisibility.status" :style="{ width: `${columnWidths.status}px` }" />
            <col
              v-if="columnVisibility.subscribed_at"
              :style="{ width: `${columnWidths.subscribed_at}px` }"
            />
            <col v-if="columnVisibility.actions" :style="{ width: `${columnWidths.actions}px` }" />
          </colgroup>

          <!-- Table Header (Sticky with Frosted Blur) -->
          <thead
            class="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none sticky top-0 z-20"
          >
            <tr>
              <!-- Telegram User -->
              <th
                v-if="columnVisibility.user"
                class="relative py-3.5 px-4 sm:px-5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{ width: `${columnWidths.user}px`, minWidth: `${columnWidths.user}px` }"
                @click="toggleSort('user')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Telegram User</span>
                  <component
                    :is="
                      sortField === 'user'
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
                  @mousedown.stop="onResizeStart('user', $event)"
                  @dblclick.stop="resetColWidth('user')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'user' }"
                  ></div>
                </div>
              </th>

              <!-- Subscriber Type & Role -->
              <th
                v-if="columnVisibility.type"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{ width: `${columnWidths.type}px`, minWidth: `${columnWidths.type}px` }"
                @click="toggleSort('type')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Subscriber Type</span>
                  <component
                    :is="
                      sortField === 'type'
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
                  @mousedown.stop="onResizeStart('type', $event)"
                  @dblclick.stop="resetColWidth('type')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'type' }"
                  ></div>
                </div>
              </th>

              <!-- Telegram Chat ID -->
              <th
                v-if="columnVisibility.chat_id"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{
                  width: `${columnWidths.chat_id}px`,
                  minWidth: `${columnWidths.chat_id}px`,
                }"
                @click="toggleSort('chat_id')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Telegram Chat ID</span>
                  <component
                    :is="
                      sortField === 'chat_id'
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
                  @mousedown.stop="onResizeStart('chat_id', $event)"
                  @dblclick.stop="resetColWidth('chat_id')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'chat_id' }"
                  ></div>
                </div>
              </th>

              <!-- Ticket Notifications Status -->
              <th
                v-if="columnVisibility.status"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }"
                @click="toggleSort('status')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Ticket Notifications</span>
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

              <!-- Subscribed Date -->
              <th
                v-if="columnVisibility.subscribed_at"
                class="relative py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group/th"
                :style="{
                  width: `${columnWidths.subscribed_at}px`,
                  minWidth: `${columnWidths.subscribed_at}px`,
                }"
                @click="toggleSort('subscribed_at')"
              >
                <div class="flex items-center gap-1.5 truncate">
                  <span>Subscribed Date</span>
                  <component
                    :is="
                      sortField === 'subscribed_at'
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
                  @mousedown.stop="onResizeStart('subscribed_at', $event)"
                  @dblclick.stop="resetColWidth('subscribed_at')"
                  title="Drag to resize, double-click to reset"
                >
                  <div
                    class="w-0.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover/th:opacity-100 group-hover/resizer:opacity-100 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all"
                    :class="{ 'opacity-100 bg-blue-500 h-full': resizingCol === 'subscribed_at' }"
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
              v-for="sub in paginatedSubscribers"
              :key="sub.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group"
            >
              <!-- Telegram User Column (Matching TicketTable reporter column layout) -->
              <td
                v-if="columnVisibility.user"
                class="py-3 px-4 sm:px-5"
                :style="{ width: `${columnWidths.user}px`, minWidth: `${columnWidths.user}px` }"
              >
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <div
                    class="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center border border-blue-200/80 dark:border-blue-800/60 shrink-0"
                  >
                    {{
                      (sub.telegram_username
                        ? sub.telegram_username.substring(0, 2)
                        : 'TG'
                      ).toUpperCase()
                    }}
                  </div>
                  <div class="truncate flex-1 min-w-0">
                    <div
                      class="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate leading-tight"
                    >
                      <span v-if="sub.telegram_username" class="truncate"
                        >@{{ sub.telegram_username }}</span
                      >
                      <span v-else class="text-slate-400 dark:text-slate-500 italic"
                        >No username</span
                      >
                      <a
                        v-if="sub.telegram_username"
                        :href="`https://t.me/${sub.telegram_username}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-slate-400 hover:text-blue-500 p-0.5 rounded transition-colors shrink-0"
                        title="Open user chat in Telegram"
                      >
                        <ExternalLink class="w-3 h-3" />
                      </a>
                    </div>
                    <div
                      class="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate leading-tight flex items-center gap-1"
                    >
                      <template
                        v-if="
                          (sub.subscriber_type || '').toUpperCase() === 'REQUESTER' && sub.user_id
                        "
                      >
                        <span class="text-emerald-600 dark:text-emerald-400 font-medium"
                          >User #{{ sub.user_id }}</span
                        >
                        <span
                          v-if="sub.user?.name"
                          class="text-slate-500 dark:text-slate-400 truncate"
                          >({{ sub.user.name }})</span
                        >
                      </template>
                      <template v-else-if="sub.user_id">
                        <span>Staff ID #{{ sub.id }}</span>
                        <span class="text-slate-400">• User #{{ sub.user_id }}</span>
                      </template>
                      <template v-else>
                        <span>Staff ID #{{ sub.id }}</span>
                      </template>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Subscriber Type & Role Column -->
              <td
                v-if="columnVisibility.type"
                class="py-3 px-4 whitespace-nowrap"
                :style="{ width: `${columnWidths.type}px`, minWidth: `${columnWidths.type}px` }"
              >
                <!-- Resolver Badge -->
                <div
                  v-if="(sub.subscriber_type || 'RESOLVER').toUpperCase() === 'RESOLVER'"
                  class="inline-flex flex-col"
                >
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs select-none w-fit"
                    title="Resolver: Receives alerts for all tickets"
                  >
                    <Headphones class="w-3 h-3 text-blue-500 shrink-0" />
                    <span>RESOLVER</span>
                  </span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 pl-0.5">
                    Support Staff
                  </span>
                </div>

                <!-- Requester Badge -->
                <div
                  v-else-if="(sub.subscriber_type || '').toUpperCase() === 'REQUESTER'"
                  class="inline-flex flex-col"
                >
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs select-none w-fit"
                    title="Requester: Receives alerts exclusively for their own tickets"
                  >
                    <User class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>REQUESTER</span>
                  </span>
                  <span
                    class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 pl-0.5 truncate max-w-[150px]"
                  >
                    {{ sub.user?.name || (sub.user_id ? `User #${sub.user_id}` : 'Client User') }}
                  </span>
                </div>

                <!-- Custom / Other Badge -->
                <div v-else class="inline-flex flex-col">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 w-fit"
                  >
                    <span>{{ sub.subscriber_type }}</span>
                  </span>
                </div>
              </td>

              <!-- Telegram Chat ID (Neutral Monospace Badge with copy feedback) -->
              <td
                v-if="columnVisibility.chat_id"
                class="py-3 px-4 whitespace-nowrap"
                :style="{
                  width: `${columnWidths.chat_id}px`,
                  minWidth: `${columnWidths.chat_id}px`,
                }"
              >
                <button
                  type="button"
                  @click="copyChatId(sub.telegram_chat_id)"
                  :title="
                    copiedChatId === sub.telegram_chat_id
                      ? 'Copied to clipboard'
                      : 'Click to copy Chat ID'
                  "
                  class="font-mono font-medium text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700/60 inline-flex items-center gap-1.5 transition-colors cursor-pointer group/copy shadow-2xs"
                >
                  <span>{{ sub.telegram_chat_id }}</span>
                  <component
                    :is="copiedChatId === sub.telegram_chat_id ? Check : Copy"
                    class="w-3 h-3 transition-colors"
                    :class="
                      copiedChatId === sub.telegram_chat_id
                        ? 'text-emerald-500'
                        : 'text-slate-400 group-hover/copy:text-slate-600 dark:group-hover/copy:text-slate-200'
                    "
                  />
                </button>
              </td>

              <!-- Ticket Notifications Status (Sleek Switch + Text Dot) -->
              <td
                v-if="columnVisibility.status"
                class="py-3 px-4 whitespace-nowrap"
                :style="{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }"
              >
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="sub.is_active"
                    @click="handleToggle(sub.telegram_chat_id, sub.is_active)"
                    :disabled="togglingChatId === sub.telegram_chat_id"
                    class="relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    :class="sub.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'"
                    :title="
                      sub.is_active
                        ? 'Click to mute ticket alerts'
                        : 'Click to enable ticket alerts'
                    "
                  >
                    <span
                      class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out"
                      :class="sub.is_active ? 'translate-x-3.5' : 'translate-x-0'"
                    />
                  </button>

                  <span
                    class="inline-flex items-center gap-1.5 text-[11px] font-medium select-none"
                    :class="
                      sub.is_active
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="sub.is_active ? 'bg-emerald-500' : 'bg-slate-400'"
                    ></span>
                    {{ sub.is_active ? 'Active' : 'Muted' }}
                  </span>

                  <Loader2
                    v-if="togglingChatId === sub.telegram_chat_id"
                    class="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0"
                  />
                </div>
              </td>

              <!-- Subscribed Date (Clock Icon matching TicketTable created_at column) -->
              <td
                v-if="columnVisibility.subscribed_at"
                class="py-3 px-4 whitespace-nowrap"
                :style="{
                  width: `${columnWidths.subscribed_at}px`,
                  minWidth: `${columnWidths.subscribed_at}px`,
                }"
              >
                <div
                  class="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{{ formatDate(sub.subscribed_at).date }}</span>
                </div>
                <div
                  v-if="formatDate(sub.subscribed_at).time"
                  class="text-[10px] text-slate-400 dark:text-slate-500 pl-5 font-mono"
                >
                  {{ formatDate(sub.subscribed_at).time }}
                </div>
              </td>

              <!-- Actions (Sticky Right Column) -->
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
                  <!-- Send test notification ping -->
                  <button
                    type="button"
                    @click="handlePingUser(sub.telegram_chat_id, sub.telegram_username)"
                    :disabled="pingingChatId === sub.telegram_chat_id"
                    :title="
                      pingingChatId === sub.telegram_chat_id
                        ? 'Sending test notification...'
                        : 'Send Direct Test Notification'
                    "
                    class="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all inline-flex items-center gap-1 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                  >
                    <Loader2
                      v-if="pingingChatId === sub.telegram_chat_id"
                      class="w-3 h-3 animate-spin text-blue-500"
                    />
                    <Send v-else class="w-3 h-3 text-blue-500" />
                    <span>Ping</span>
                  </button>

                  <!-- Delete subscriber action -->
                  <button
                    type="button"
                    @click="handleDelete(sub)"
                    :disabled="deletingIdentifier === getSubscriberIdentifier(sub)"
                    title="Delete subscriber"
                    aria-label="Delete subscriber"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Loader2
                      v-if="deletingIdentifier === getSubscriberIdentifier(sub)"
                      class="w-3.5 h-3.5 animate-spin text-rose-500"
                    />
                    <Trash2 v-else class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty Row if No Filter Match (Clean layout matching TicketTable empty state) -->
            <tr v-if="paginatedSubscribers.length === 0">
              <td
                :colspan="visibleColumnCount"
                class="py-16 text-center text-slate-400 dark:text-slate-500 text-xs"
              >
                <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                  <Inbox class="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <span class="font-medium text-slate-600 dark:text-slate-400 text-sm">
                    {{
                      isFilteringActive ? 'No matching subscribers' : 'No Telegram subscribers yet'
                    }}
                  </span>
                  <span class="text-[11px] text-slate-400 max-w-xs">
                    {{
                      isFilteringActive
                        ? 'Try adjusting your search query, status, or subscriber type filter'
                        : 'Generate an invite link to onboard staff members to Telegram notifications'
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
                    @click="$emit('goToInviteTab')"
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
          You have hidden all table columns. Use the Columns menu in the controls above to show
          columns.
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
        item-label="subscribers"
        :disabled="settingsStore.isLoading"
        @change-page="onPageChange"
        @change-per-page="onPerPageChange"
      />
    </div>

    <!-- Delete Subscriber Confirmation Modal -->
    <div
      v-if="isDeleteModalOpen && subscriberToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      @click.self="closeDeleteModal()"
    >
      <div
        class="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-left space-y-4"
      >
        <!-- Modal Header with Warning Icon -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs"
            >
              <Trash2 class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Delete Subscriber
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Remove Telegram notifications subscription
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="closeDeleteModal()"
            :disabled="isDeleting"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Warning Explainer -->
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to delete this subscriber? They will no longer receive real-time
          ticket alerts, incident updates, or Telegram bot notifications.
        </p>

        <!-- Subscriber Identity Card -->
        <div
          class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs"
        >
          <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium">Username</span>
            <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {{
                subscriberToDelete.telegram_username
                  ? `@${subscriberToDelete.telegram_username}`
                  : 'No username'
              }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium">Chat ID</span>
            <span class="font-mono font-medium text-slate-700 dark:text-slate-300">
              {{ subscriberToDelete.telegram_chat_id }}
            </span>
          </div>

          <div v-if="subscriberToDelete.subscriber_type" class="flex items-center justify-between">
            <span class="text-slate-400 font-medium">Subscriber Type</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
              :class="[
                subscriberToDelete.subscriber_type === 'RESOLVER'
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                  : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
              ]"
            >
              {{ subscriberToDelete.subscriber_type }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="closeDeleteModal()"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            @click="confirmDelete"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-sm shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isDeleting" class="w-3.5 h-3.5 animate-spin" />
            <Trash2 v-else class="w-3.5 h-3.5" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete Subscriber' }}</span>
          </button>
        </div>
      </div>
    </div>
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

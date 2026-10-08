import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketType,
  PaginationMeta,
  TicketFacets,
  TicketListData,
  TicketComment,
  CreateCommentPayload,
  UpdateCommentPayload,
} from '@/types/ticket'
import { ticketApi, type TicketFilterParams } from '@/api/ticketApi'
import { useToastStore } from './toastStore'
import { useAuthStore } from './authStore'

/**
 * Universal response extractor supporting both new faceted envelope
 * ({ success, data: { content: [...], pagination: {...}, facets: {...} } })
 * and legacy envelope ({ success, data: [...], meta: {...} })
 */
function extractResponseData(response: any): {
  items: Ticket[]
  meta: PaginationMeta
  facets?: TicketFacets
} {
  const data = response?.data
  if (data && typeof data === 'object' && Array.isArray((data as any).content)) {
    const listData = data as TicketListData
    const p = listData.pagination || ({} as any)
    const page = p.page || 1
    const perPage = p.per_page || 10
    const total = p.total ?? 0
    const totalPages = p.total_pages || Math.max(1, Math.ceil(total / perPage))
    const from = total > 0 ? (page - 1) * perPage + 1 : 0
    const to = total > 0 ? Math.min(page * perPage, total) : 0

    return {
      items: listData.content,
      meta: {
        current_page: page,
        per_page: perPage,
        total: total,
        last_page: totalPages,
        from: from,
        to: to,
        path: '',
      },
      facets: listData.facets,
    }
  }

  if (Array.isArray(data)) {
    const m = response.meta || {}
    return {
      items: data,
      meta: {
        current_page: m.current_page || 1,
        per_page: m.per_page || 10,
        total: m.total ?? data.length,
        last_page: m.last_page || 1,
        from: m.from ?? 1,
        to: m.to ?? data.length,
        path: m.path || '',
      },
      facets: response.facets,
    }
  }

  return {
    items: [],
    meta: {
      current_page: 1,
      per_page: 10,
      total: 0,
      last_page: 1,
      from: 0,
      to: 0,
      path: '',
    },
  }
}

// State machine allowed transitions mapping
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['open', 'resolved', 'closed'],
  resolved: ['open', 'in_progress', 'closed'],
  closed: ['open'],
}

export type TableColumnKey =
  | 'ticket'
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
  | 'client'

export type DrawerPosition = 'right' | 'left' | 'top' | 'bottom'

export const useTicketStore = defineStore('tickets', () => {
  const toastStore = useToastStore()
  const authStore = useAuthStore()

  // Mode: Direct to live API only (mock data removed)
  const isMockMode = ref<boolean>(false)

  const tickets = ref<Ticket[]>([])
  const selectedTicket = ref<Ticket | null>(null)
  const isDrawerOpen = ref<boolean>(false)
  const isDrawerLoading = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const isUpdating = ref<boolean>(false)
  const isCreateModalOpen = ref<boolean>(false)

  // Comments State
  const comments = ref<TicketComment[]>([])
  const isCommentsLoading = ref<boolean>(false)
  const isPostingComment = ref<boolean>(false)

  // Modern Modal & Window State
  const detailViewMode = ref<'modal' | 'drawer'>('modal')
  const isMinimized = ref<boolean>(false)

  // Filters & View State
  const searchQuery = ref<string>('')
  const statusFilter = ref<string>('all')
  const priorityFilter = ref<string>('all')
  const sourceFilter = ref<string>('all')
  const viewMode = ref<'kanban' | 'table' | 'grid'>('kanban')

  // Pagination
  const pagination = ref<PaginationMeta>({
    current_page: 1,
    from: 1,
    last_page: 1,
    path: '',
    per_page: 10,
    to: 0,
    total: 0,
  })

  // Global Facets for Status & Priority (returned from API)
  const facets = ref<TicketFacets>({
    status: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    priority: { critical: 0, high: 0, medium: 0, low: 0 },
    total: 0,
  })

  // Drawer Position (right, left, top, bottom)
  const storedDrawerPosition = (localStorage.getItem('bronx_drawer_position') as DrawerPosition) || 'right'
  const drawerPosition = ref<DrawerPosition>(
    ['right', 'left', 'top', 'bottom'].includes(storedDrawerPosition) ? storedDrawerPosition : 'right',
  )

  function setDrawerPosition(pos: DrawerPosition) {
    drawerPosition.value = pos
    localStorage.setItem('bronx_drawer_position', pos)
  }

  // Kanban Column Visibility (hide/show status columns for responsive layouts)
  const storedColumns = localStorage.getItem('bronx_kanban_columns')
  const columnVisibility = ref<Record<TicketStatus, boolean>>(
    storedColumns
      ? JSON.parse(storedColumns)
      : { open: true, in_progress: true, resolved: true, closed: true },
  )

  function toggleColumnVisibility(status: TicketStatus) {
    columnVisibility.value[status] = !columnVisibility.value[status]
    localStorage.setItem('bronx_kanban_columns', JSON.stringify(columnVisibility.value))
  }

  function setColumnVisibilityPreset(preset: 'all' | 'active_only') {
    if (preset === 'active_only') {
      columnVisibility.value = { open: true, in_progress: true, resolved: false, closed: false }
    } else {
      columnVisibility.value = { open: true, in_progress: true, resolved: true, closed: true }
    }
    localStorage.setItem('bronx_kanban_columns', JSON.stringify(columnVisibility.value))
  }

  // Table Column Visibility
  const defaultTableColumns: Record<TableColumnKey, boolean> = {
    ticket: true,
    ticket_key: true,
    title: true,
    type: true,
    status: true,
    priority: true,
    source: true,
    company: true,
    phone: true,
    reporter: true,
    created_at: true,
    actions: true,
    client: false,
  }

  function parseStoredTableColumns(): Record<TableColumnKey, boolean> {
    const raw = localStorage.getItem('bronx_table_columns')
    if (!raw) return { ...defaultTableColumns }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.ticket !== undefined) {
        if (parsed.ticket_key === undefined) parsed.ticket_key = parsed.ticket
        if (parsed.title === undefined) parsed.title = parsed.ticket
      }
      return { ...defaultTableColumns, ...parsed }
    } catch {
      return { ...defaultTableColumns }
    }
  }

  const tableColumnVisibility = ref<Record<TableColumnKey, boolean>>(parseStoredTableColumns())

  function toggleTableColumn(col: TableColumnKey) {
    tableColumnVisibility.value[col] = !tableColumnVisibility.value[col]
    if (col === 'ticket') {
      tableColumnVisibility.value.ticket_key = tableColumnVisibility.value.ticket
      tableColumnVisibility.value.title = tableColumnVisibility.value.ticket
    }
    localStorage.setItem('bronx_table_columns', JSON.stringify(tableColumnVisibility.value))
  }

  function resetTableColumns() {
    tableColumnVisibility.value = {
      ticket: true,
      ticket_key: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      source: true,
      company: true,
      phone: true,
      reporter: true,
      created_at: true,
      actions: true,
      client: false,
    }
    localStorage.setItem('bronx_table_columns', JSON.stringify(tableColumnVisibility.value))
  }

  // Per-column Pagination Limits & status-specific pagination
  const columnLimits = ref<Record<TicketStatus, number>>({
    open: 6,
    in_progress: 6,
    resolved: 6,
    closed: 6,
  })

  const columnPages = ref<Record<TicketStatus, { page: number; hasMore: boolean }>>({
    open: { page: 0, hasMore: true },
    in_progress: { page: 0, hasMore: true },
    resolved: { page: 0, hasMore: true },
    closed: { page: 0, hasMore: true },
  })

  const columnLoadingMore = ref<Record<TicketStatus, boolean>>({
    open: false,
    in_progress: false,
    resolved: false,
    closed: false,
  })

  const isLoadingMore = ref<boolean>(false)
  const hasMoreTickets = computed(() => {
    return pagination.value.current_page < pagination.value.last_page
  })

  async function goToPage(page: number) {
    if (page < 1 || (pagination.value.last_page && page > pagination.value.last_page)) return
    pagination.value.current_page = page
    await fetchTickets()
  }

  async function changePerPage(perPage: number) {
    pagination.value.per_page = perPage
    pagination.value.current_page = 1
    await fetchTickets()
  }

  // Per-status column loading: strictly queries API for that specific status
  async function loadMoreForColumn(status: TicketStatus) {
    if (columnLoadingMore.value[status]) return
    columnLoadingMore.value[status] = true

    try {
      const currentStatusTickets = kanbanColumns.value[status] || []
      // If we already have more loaded tickets in memory than the current limit, expand view
      if (currentStatusTickets.length > columnLimits.value[status]) {
        columnLimits.value[status] += 6
      } else if (
        columnPages.value[status]?.hasMore ||
        (facets.value.status[status] ?? 0) > currentStatusTickets.length
      ) {
        // Fetch tickets strictly for this status from backend API
        const nextPage = (columnPages.value[status]?.page || 0) + 1
        const response = await ticketApi.getTickets({
          status: status,
          page: nextPage,
          per_page: 10,
          search: searchQuery.value.trim() || undefined,
          priority: priorityFilter.value !== 'all' ? priorityFilter.value : undefined,
        })
        const parsed = extractResponseData(response)

        if (parsed.items.length > 0) {
          // Merge deduplicated
          const existingIds = new Set(tickets.value.map((t) => t.id))
          const freshTickets = parsed.items.filter((t) => !existingIds.has(t.id))
          tickets.value = [...tickets.value, ...freshTickets]

          const totalForStatus = parsed.facets?.status?.[status] ?? parsed.meta.total
          const loadedForStatus = tickets.value.filter((t) => t.status === status).length

          columnPages.value[status] = {
            page: nextPage,
            hasMore: nextPage < parsed.meta.last_page && (totalForStatus ? loadedForStatus < totalForStatus : true),
          }
          columnLimits.value[status] += freshTickets.length || parsed.items.length
          if (parsed.facets?.status?.[status] !== undefined) {
            facets.value.status[status] = parsed.facets.status[status]
          }
          toastStore.success(
            'Loaded',
            `Fetched +${freshTickets.length || parsed.items.length} ${status} tickets`,
          )
        } else {
          columnPages.value[status] = {
            page: nextPage,
            hasMore: false,
          }
          toastStore.info('End of Column', `No more ${status} tickets found.`)
        }
      } else {
        columnLimits.value[status] += 6
      }
    } catch (err: any) {
      toastStore.error(`Failed to load more ${status} tickets`, err.response?.data?.message || err.message)
    } finally {
      columnLoadingMore.value[status] = false
    }
  }

  async function fetchMoreTickets() {
    if (isLoadingMore.value || !hasMoreTickets.value) return
    isLoadingMore.value = true

    try {
      const nextPage = pagination.value.current_page + 1
      const response = await ticketApi.getTickets({
        page: nextPage,
        per_page: pagination.value.per_page,
        status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
        priority: priorityFilter.value !== 'all' ? priorityFilter.value : undefined,
        search: searchQuery.value.trim() || undefined,
      })
      const parsed = extractResponseData(response)
      if (parsed.items.length > 0) {
        const existingIds = new Set(tickets.value.map((t) => t.id))
        const freshTickets = parsed.items.filter((t) => !existingIds.has(t.id))
        tickets.value = [...tickets.value, ...freshTickets]
        pagination.value = parsed.meta
        if (parsed.facets) {
          facets.value = parsed.facets
        }
        toastStore.success('Tickets Loaded', `Fetched +${freshTickets.length} tickets from server`)
      } else {
        toastStore.info('End of Tickets', 'No more tickets available on server.')
      }
    } catch (err: any) {
      toastStore.error('Failed to fetch more tickets', err.response?.data?.message || err.message)
    } finally {
      isLoadingMore.value = false
    }
  }

  // Notifications (unread client tickets from API)
  const notifications = ref<Ticket[]>([])
  const hasUnreadNotifications = computed(() => notifications.value.length > 0)

  function markNotificationsAsRead() {
    notifications.value = []
  }

  // Shaking card tracking for illegal drag animation
  const shakingTicketId = ref<number | null>(null)

  // Computed filtered tickets
  const filteredTickets = computed(() => {
    let list = tickets.value

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      list = list.filter(
        (t) =>
          t.ticket_key.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.reporter_name && t.reporter_name.toLowerCase().includes(q)) ||
          (t.reporter_phone && t.reporter_phone.toLowerCase().includes(q)) ||
          (t.phone && t.phone.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.description_preview && t.description_preview.toLowerCase().includes(q)) ||
          (t.metadata?.api_client_name && t.metadata.api_client_name.toLowerCase().includes(q)),
      )
    }

    if (statusFilter.value !== 'all') {
      list = list.filter((t) => t.status === statusFilter.value)
    }

    if (priorityFilter.value !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter.value)
    }

    if (sourceFilter.value !== 'all') {
      list = list.filter((t) => t.source === sourceFilter.value)
    }

    return list
  })

  // Grouped tickets for Kanban board
  const kanbanColumns = computed(() => ({
    open: filteredTickets.value.filter((t) => t.status === 'open'),
    in_progress: filteredTickets.value.filter((t) => t.status === 'in_progress'),
    resolved: filteredTickets.value.filter((t) => t.status === 'resolved'),
    closed: filteredTickets.value.filter((t) => t.status === 'closed'),
  }))

  // KPI Metrics computed from current state / facets
  const metrics = computed(() => {
    if (facets.value.total > 0) {
      return {
        total: facets.value.total,
        open: facets.value.status.open || 0,
        in_progress: facets.value.status.in_progress || 0,
        critical: facets.value.priority.critical || 0,
        resolvedToday: (facets.value.status.resolved || 0) + (facets.value.status.closed || 0),
      }
    }
    const all = tickets.value
    return {
      total: all.length,
      open: all.filter((t) => t.status === 'open').length,
      in_progress: all.filter((t) => t.status === 'in_progress').length,
      critical: all.filter((t) => t.priority === 'critical' && t.status !== 'closed').length,
      resolvedToday: all.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
    }
  })

  // Check state machine validity
  function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
    if (from === to) return true
    const allowed = VALID_TRANSITIONS[from]
    return allowed ? allowed.includes(to) : false
  }

  function toggleMockMode() {
    toastStore.info('Direct API Mode', 'App is configured to connect directly to the backend API.')
  }

  // Fetch Tickets from API
  async function fetchTickets(page?: number, perPage?: number) {
    if (page !== undefined) pagination.value.current_page = page
    if (perPage !== undefined) pagination.value.per_page = perPage

    isLoading.value = true
    try {
      const params: TicketFilterParams = {
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
        priority: priorityFilter.value !== 'all' ? priorityFilter.value : undefined,
        source: sourceFilter.value !== 'all' ? sourceFilter.value : undefined,
        search: searchQuery.value.trim() || undefined,
      }
      const response = await ticketApi.getTickets(params)
      const parsed = extractResponseData(response)
      tickets.value = parsed.items
      pagination.value = parsed.meta
      if (parsed.facets) {
        facets.value = parsed.facets
      }
      // Reset per-status column pages on fresh fetch
      const fStatus = parsed.facets?.status
      const totalTickets = parsed.meta.total ?? tickets.value.length
      columnPages.value = {
        open: {
          page: 0,
          hasMore: fStatus
            ? fStatus.open > tickets.value.filter((t) => t.status === 'open').length
            : totalTickets > tickets.value.filter((t) => t.status === 'open').length,
        },
        in_progress: {
          page: 0,
          hasMore: fStatus
            ? fStatus.in_progress > tickets.value.filter((t) => t.status === 'in_progress').length
            : totalTickets > tickets.value.filter((t) => t.status === 'in_progress').length,
        },
        resolved: {
          page: 0,
          hasMore: fStatus
            ? fStatus.resolved > tickets.value.filter((t) => t.status === 'resolved').length
            : totalTickets > tickets.value.filter((t) => t.status === 'resolved').length,
        },
        closed: {
          page: 0,
          hasMore: fStatus
            ? fStatus.closed > tickets.value.filter((t) => t.status === 'closed').length
            : totalTickets > tickets.value.filter((t) => t.status === 'closed').length,
        },
      }
      notifications.value = tickets.value.filter((t) => t.source === 'api').slice(0, 5)
    } catch (err: any) {
      toastStore.error(
        'Failed to load tickets',
        err.response?.data?.message || err.message || 'API connection failed',
      )
    } finally {
      isLoading.value = false
    }
  }

  // Optimistic Status Transition (for Kanban Drag-and-Drop and quick selects)
  async function transitionTicketStatus(
    ticketId: number,
    newStatus: TicketStatus,
  ): Promise<boolean> {
    if (!authStore.canManageStatus) {
      toastStore.warning(
        'Read-Only Access',
        'Your role (Preview) has read-only access and cannot change ticket status.',
      )
      return false
    }

    const targetTicket = tickets.value.find((t) => t.id === ticketId)
    if (!targetTicket) return false

    const oldStatus = targetTicket.status
    if (oldStatus === newStatus) return true

    // 1. Client-side State Machine Pre-validation
    if (!isValidTransition(oldStatus, newStatus)) {
      shakingTicketId.value = ticketId
      setTimeout(() => {
        shakingTicketId.value = null
      }, 500)

      toastStore.error(
        'Illegal State Transition',
        `Invalid transition from status '${oldStatus}' to '${newStatus}'.`,
      )
      return false
    }

    // 2. Optimistic UI update
    targetTicket.status = newStatus
    targetTicket.updated_at = new Date().toISOString()
    if (newStatus === 'in_progress') {
      if (!targetTicket.first_response_at) {
        targetTicket.first_response_at = new Date().toISOString()
      }
      targetTicket.resolved_at = null
      targetTicket.closed_at = null
    }
    if (newStatus === 'resolved') {
      if (!targetTicket.resolved_at) {
        targetTicket.resolved_at = new Date().toISOString()
      }
      targetTicket.closed_at = null
    }
    if (newStatus === 'closed' && !targetTicket.closed_at) {
      targetTicket.closed_at = new Date().toISOString()
    }
    if (newStatus === 'open') {
      targetTicket.resolved_at = null
      targetTicket.closed_at = null
    }

    if (selectedTicket.value?.id === ticketId) {
      selectedTicket.value.status = newStatus
    }

    // Optimistically update facet counts for status
    if (facets.value?.status) {
      if (typeof facets.value.status[oldStatus] === 'number' && facets.value.status[oldStatus] > 0) {
        facets.value.status[oldStatus]--
      }
      if (typeof facets.value.status[newStatus] === 'number') {
        facets.value.status[newStatus]++
      }
    }

    // Ensure the receiving column limit shows the newly moved ticket
    const newLoaded = tickets.value.filter((t) => t.status === newStatus).length
    if (columnLimits.value[newStatus] < newLoaded) {
      columnLimits.value[newStatus] = newLoaded
    }

    // Synchronize columnPages hasMore for old and new statuses
    if (columnPages.value[oldStatus]) {
      const oldLoaded = tickets.value.filter((t) => t.status === oldStatus).length
      const oldTotal = facets.value?.status?.[oldStatus] ?? oldLoaded
      columnPages.value[oldStatus].hasMore = oldLoaded < oldTotal
    }
    if (columnPages.value[newStatus]) {
      const newTotal = facets.value?.status?.[newStatus] ?? newLoaded
      columnPages.value[newStatus].hasMore = newLoaded < newTotal
    }

    try {
      await ticketApi.updateTicket(ticketId, { status: newStatus })

      const statusLabels: Record<TicketStatus, string> = {
        open: 'Open',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed',
      }

      toastStore.success(
        `Ticket ${targetTicket.ticket_key} updated`,
        `Moved to ${statusLabels[newStatus]}`,
      )
      return true
    } catch (err: any) {
      // 3. Rollback on API rejection (HTTP 422 or error)
      targetTicket.status = oldStatus
      if (selectedTicket.value?.id === ticketId) {
        selectedTicket.value.status = oldStatus
      }

      if (facets.value?.status) {
        if (typeof facets.value.status[oldStatus] === 'number') {
          facets.value.status[oldStatus]++
        }
        if (typeof facets.value.status[newStatus] === 'number' && facets.value.status[newStatus] > 0) {
          facets.value.status[newStatus]--
        }
      }

      if (columnPages.value[oldStatus]) {
        const rollOldLoaded = tickets.value.filter((t) => t.status === oldStatus).length
        const rollOldTotal = facets.value?.status?.[oldStatus] ?? rollOldLoaded
        columnPages.value[oldStatus].hasMore = rollOldLoaded < rollOldTotal
      }
      if (columnPages.value[newStatus]) {
        const rollNewLoaded = tickets.value.filter((t) => t.status === newStatus).length
        const rollNewTotal = facets.value?.status?.[newStatus] ?? rollNewLoaded
        columnPages.value[newStatus].hasMore = rollNewLoaded < rollNewTotal
      }

      shakingTicketId.value = ticketId
      setTimeout(() => {
        shakingTicketId.value = null
      }, 500)

      const errorMsg =
        err.response?.data?.message ||
        `Invalid transition from status '${oldStatus}' to '${newStatus}'.`
      toastStore.error('Transition Failed', errorMsg)
      return false
    }
  }

  // Update Priority
  async function updateTicketPriority(ticketId: number, newPriority: TicketPriority) {
    if (!authStore.canManageStatus) {
      toastStore.warning(
        'Read-Only Access',
        'Your role (Preview) has read-only access and cannot modify ticket priority.',
      )
      return
    }

    const targetTicket = tickets.value.find((t) => t.id === ticketId)
    if (!targetTicket) return

    const oldPriority = targetTicket.priority
    if (oldPriority === newPriority) return
    targetTicket.priority = newPriority

    if (selectedTicket.value?.id === ticketId) {
      selectedTicket.value.priority = newPriority
    }

    if (facets.value?.priority) {
      if (typeof facets.value.priority[oldPriority] === 'number' && facets.value.priority[oldPriority] > 0) {
        facets.value.priority[oldPriority]--
      }
      if (typeof facets.value.priority[newPriority] === 'number') {
        facets.value.priority[newPriority]++
      }
    }

    try {
      await ticketApi.updateTicket(ticketId, { priority: newPriority })
      toastStore.success('Priority Updated', `${targetTicket.ticket_key} set to ${newPriority}`)
    } catch (err: any) {
      targetTicket.priority = oldPriority
      if (selectedTicket.value?.id === ticketId) {
        selectedTicket.value.priority = oldPriority
      }
      if (facets.value?.priority) {
        if (typeof facets.value.priority[oldPriority] === 'number') {
          facets.value.priority[oldPriority]++
        }
        if (typeof facets.value.priority[newPriority] === 'number' && facets.value.priority[newPriority] > 0) {
          facets.value.priority[newPriority]--
        }
      }
      toastStore.error('Update Failed', err.response?.data?.message || 'Could not update priority')
    }
  }

  // Open Ticket Details Modal / Drawer
  async function openTicketDrawer(ticket: Ticket) {
    selectedTicket.value = { ...ticket }
    isDrawerOpen.value = true
    isMinimized.value = false
    isDrawerLoading.value = true
    comments.value = []

    try {
      const response = await ticketApi.getTicketById(ticket.id)
      const ticketData = (response as any).data || response
      selectedTicket.value = ticketData
      comments.value = ticketData.comments || []
      const idx = tickets.value.findIndex((t) => t.id === ticket.id)
      if (idx !== -1) {
        tickets.value[idx] = ticketData
      }
    } catch (err) {
      console.error('Failed to load full ticket detail:', err)
    } finally {
      isDrawerLoading.value = false
    }
  }

  async function refreshSelectedTicket() {
    if (!selectedTicket.value) return
    isDrawerLoading.value = true
    try {
      const response = await ticketApi.getTicketById(selectedTicket.value.id)
      const ticketData = (response as any).data || response
      selectedTicket.value = ticketData
      comments.value = ticketData.comments || []
      const idx = tickets.value.findIndex((t) => t.id === ticketData.id)
      if (idx !== -1) {
        tickets.value[idx] = ticketData
      }

      toastStore.success('Refreshed', 'Ticket details updated from server')
    } catch (err: any) {
      toastStore.error('Refresh Failed', err.response?.data?.message || err.message)
    } finally {
      isDrawerLoading.value = false
    }
  }

  function closeTicketDrawer() {
    isDrawerOpen.value = false
    isMinimized.value = false
  }

  // Comments Operations
  async function fetchTicketComments(ticketId: number, includeInternal = true) {
    isCommentsLoading.value = true
    try {
      const response = await ticketApi.getTicketComments(ticketId, { include_internal: includeInternal })
      comments.value = (response as any).data || []
    } catch (err: any) {
      console.error('Failed to load ticket comments:', err)
    } finally {
      isCommentsLoading.value = false
    }
  }

  async function addTicketComment(ticketId: number, payload: CreateCommentPayload): Promise<boolean> {
    if (!payload.body.trim() && (!payload.files || payload.files.length === 0)) {
      toastStore.warning('Empty Comment', 'Please write a message or attach a file.')
      return false
    }
    isPostingComment.value = true
    try {
      const response = await ticketApi.createTicketComment(ticketId, payload)
      const createdComment = (response as any).data || response
      comments.value.push(createdComment)
      toastStore.success(
        payload.is_internal ? 'Internal Note Added' : 'Reply Sent',
        payload.is_internal ? 'Private staff note added to ticket' : 'Comment published successfully'
      )
      // If first_response_at was triggered on backend, reflect in selected ticket
      if (selectedTicket.value && !selectedTicket.value.first_response_at) {
        selectedTicket.value.first_response_at = new Date().toISOString()
      }
      return true
    } catch (err: any) {
      toastStore.error('Failed to Post', err.response?.data?.message || err.message || 'Could not save comment')
      return false
    } finally {
      isPostingComment.value = false
    }
  }

  async function updateTicketComment(ticketId: number, commentId: number, payload: UpdateCommentPayload): Promise<boolean> {
    try {
      const response = await ticketApi.updateTicketComment(ticketId, commentId, payload)
      const updated = (response as any).data || response
      const idx = comments.value.findIndex((c) => c.id === commentId)
      if (idx !== -1) {
        comments.value[idx] = updated
      }
      toastStore.success('Comment Updated', 'Your comment changes have been saved')
      return true
    } catch (err: any) {
      toastStore.error('Update Failed', err.response?.data?.message || err.message)
      return false
    }
  }

  async function deleteTicketComment(ticketId: number, commentId: number): Promise<boolean> {
    try {
      await ticketApi.deleteTicketComment(ticketId, commentId)
      comments.value = comments.value.filter((c) => c.id !== commentId)
      toastStore.success('Comment Deleted', 'Comment removed from ticket thread')
      return true
    } catch (err: any) {
      toastStore.error('Delete Failed', err.response?.data?.message || err.message)
      return false
    }
  }

  // Create Ticket directly via API
  async function createTicket(payload: {
    title: string
    description: string
    type: TicketType
    priority: TicketPriority
    reporter_name: string
    reporter_email: string
    reporter_phone?: string
    source?: string
    client_name?: string
    files?: File[]
  }): Promise<boolean> {
    if (!authStore.canSubmitTicket) {
      toastStore.error(
        'Permission Denied',
        'Your role (Preview) has read-only access and cannot submit tickets.',
      )
      return false
    }

    isUpdating.value = true
    try {
      const response = await ticketApi.createTicket({
        title: payload.title,
        description: payload.description,
        type: payload.type,
        priority: payload.priority,
        source: payload.source || 'portal',
        reporter_name: payload.reporter_name,
        reporter_email: payload.reporter_email,
        reporter_phone: payload.reporter_phone,
        metadata: {
          reporter_phone: payload.reporter_phone,
          api_client_name: payload.client_name,
          role: authStore.user?.role || 'HQ ADMIN',
          rolename: authStore.user?.role || 'HQ ADMIN',
          company: 'UYFC',
          company_name: 'UYFC',
        },
      })

      const createdTicket = (response as any).data || response

      if (payload.files && payload.files.length > 0) {
        try {
          const uploadRes = await ticketApi.uploadAttachments(createdTicket.id, payload.files)
          if (uploadRes && uploadRes.data) {
            createdTicket.attachments = uploadRes.data
          }
        } catch (attachErr: any) {
          console.warn('Attachment upload failed:', attachErr)
          toastStore.warning(
            'Attachment Upload Warning',
            'Ticket created, but some attachments failed to upload.',
          )
        }
      }

      tickets.value.unshift(createdTicket)
      const cStatus = createdTicket.status as TicketStatus | undefined
      const cPriority = createdTicket.priority as TicketPriority | undefined
      if (facets.value?.status && cStatus && typeof facets.value.status[cStatus] === 'number') {
        facets.value.status[cStatus]++
      }
      if (facets.value?.priority && cPriority && typeof facets.value.priority[cPriority] === 'number') {
        facets.value.priority[cPriority]++
      }
      if (typeof facets.value?.total === 'number') {
        facets.value.total++
      }
      const attachMsg =
        payload.files && payload.files.length > 0
          ? ` with ${payload.files.length} attachment(s)`
          : ''
      toastStore.success('Ticket Created', `Created ticket ${createdTicket.ticket_key}${attachMsg}`)
      isCreateModalOpen.value = false
      return true
    } catch (err: any) {
      toastStore.error('Create Ticket Failed', err.response?.data?.message || err.message)
      return false
    } finally {
      isUpdating.value = false
    }
  }

  // Delete Ticket directly via API
  async function deleteTicket(ticketId: number) {
    if (!authStore.canDeleteTicket) {
      toastStore.error('Permission Denied', 'Only HQ Admins have permission to delete tickets.')
      return
    }

    if (!confirm('Are you sure you want to delete this ticket?')) return

    try {
      await ticketApi.deleteTicket(ticketId)
      const target = tickets.value.find((t) => t.id === ticketId)
      if (target) {
        const tStatus = target.status as TicketStatus | undefined
        const tPriority = target.priority as TicketPriority | undefined
        if (facets.value?.status && tStatus && typeof facets.value.status[tStatus] === 'number' && facets.value.status[tStatus] > 0) {
          facets.value.status[tStatus]--
        }
        if (facets.value?.priority && tPriority && typeof facets.value.priority[tPriority] === 'number' && facets.value.priority[tPriority] > 0) {
          facets.value.priority[tPriority]--
        }
        if (typeof facets.value?.total === 'number' && facets.value.total > 0) {
          facets.value.total--
        }
      }
      tickets.value = tickets.value.filter((t) => t.id !== ticketId)
      if (selectedTicket.value?.id === ticketId) {
        closeTicketDrawer()
      }
      toastStore.success('Ticket Deleted', 'The ticket has been deleted.')
    } catch (err: any) {
      toastStore.error('Delete Failed', err.response?.data?.message || 'Could not delete ticket')
    }
  }

  // Upload Attachments to Ticket directly via API
  async function uploadAttachments(ticketId: number, files: File[]) {
    if (authStore.isReadOnly) {
      toastStore.warning('Read-Only Access', 'Preview role users cannot upload attachments.')
      return
    }

    if (!files.length) return

    isUpdating.value = true
    try {
      const response = await ticketApi.uploadAttachments(ticketId, files)
      const uploaded = response.data
      const target = tickets.value.find((t) => t.id === ticketId)
      if (target) {
        if (!target.attachments) target.attachments = []
        target.attachments.push(...uploaded)
      }
      if (selectedTicket.value?.id === ticketId) {
        if (!selectedTicket.value.attachments) selectedTicket.value.attachments = []
        selectedTicket.value.attachments.push(...uploaded)
      }
      toastStore.success('Files Uploaded', 'Attachments saved to backend')
    } catch (err: any) {
      toastStore.error('Upload Failed', err.response?.data?.message || 'Could not upload files')
    } finally {
      isUpdating.value = false
    }
  }

  // Delete Attachment directly via API
  async function deleteAttachment(ticketId: number, attachmentId: number) {
    if (authStore.isReadOnly) {
      toastStore.warning('Read-Only Access', 'Preview role users cannot delete attachments.')
      return
    }

    try {
      await ticketApi.deleteAttachment(ticketId, attachmentId)
      const target = tickets.value.find((t) => t.id === ticketId)
      if (target && target.attachments) {
        target.attachments = target.attachments.filter((a) => a.id !== attachmentId)
      }
      if (selectedTicket.value?.id === ticketId && selectedTicket.value.attachments) {
        selectedTicket.value.attachments = selectedTicket.value.attachments.filter(
          (a) => a.id !== attachmentId,
        )
      }
      toastStore.success('Attachment Removed', 'File deleted successfully')
    } catch (err: any) {
      toastStore.error('Failed to Delete Attachment', err.response?.data?.message || err.message)
    }
  }

  return {
    isMockMode,
    tickets,
    filteredTickets,
    kanbanColumns,
    metrics,
    selectedTicket,
    isDrawerOpen,
    isDrawerLoading,
    isLoading,
    isUpdating,
    isCreateModalOpen,
    searchQuery,
    statusFilter,
    priorityFilter,
    sourceFilter,
    viewMode,
    pagination,
    facets,
    notifications,
    hasUnreadNotifications,
    markNotificationsAsRead,
    shakingTicketId,
    isValidTransition,
    toggleMockMode,
    fetchTickets,
    goToPage,
    changePerPage,
    transitionTicketStatus,
    updateTicketPriority,
    openTicketDrawer,
    closeTicketDrawer,
    refreshSelectedTicket,
    createTicket,
    deleteTicket,
    columnVisibility,
    toggleColumnVisibility,
    setColumnVisibilityPreset,
    columnLimits,
    columnPages,
    columnLoadingMore,
    loadMoreForColumn,
    isLoadingMore,
    hasMoreTickets,
    fetchMoreTickets,
    uploadAttachments,
    deleteAttachment,
    drawerPosition,
    setDrawerPosition,
    tableColumnVisibility,
    toggleTableColumn,
    resetTableColumns,
    comments,
    isCommentsLoading,
    isPostingComment,
    detailViewMode,
    isMinimized,
    fetchTicketComments,
    addTicketComment,
    updateTicketComment,
    deleteTicketComment,
  }
})

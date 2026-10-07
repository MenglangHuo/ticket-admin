import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTicketStore } from '@/stores/ticketStore';

describe('useTicketStore State Machine & Core Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with direct API mode active and clean state', () => {
    const store = useTicketStore();
    expect(store.isMockMode).toBe(false);
    expect(store.tickets.length).toBe(0);
  });

  it('validates allowed state transitions properly', () => {
    const store = useTicketStore();

    // open -> in_progress (allowed)
    expect(store.isValidTransition('open', 'in_progress')).toBe(true);

    // in_progress -> resolved (allowed)
    expect(store.isValidTransition('in_progress', 'resolved')).toBe(true);

    // resolved -> closed (allowed)
    expect(store.isValidTransition('resolved', 'closed')).toBe(true);

    // closed -> open (reopen allowed)
    expect(store.isValidTransition('closed', 'open')).toBe(true);

    // closed -> in_progress (strictly forbidden by backend state machine)
    expect(store.isValidTransition('closed', 'in_progress')).toBe(false);
  });

  it('rejects illegal transition and triggers optimistic rollback', async () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 6,
        public_id: 'test-uuid-6',
        ticket_key: 'TCK-6',
        number: 6,
        title: 'Closed ticket for state machine test',
        status: 'closed',
        priority: 'low',
        type: 'bug',
        source: 'portal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const closedTicket = store.tickets[0]!;
    expect(closedTicket.status).toBe('closed');

    const result = await store.transitionTicketStatus(closedTicket.id, 'in_progress');
    expect(result).toBe(false);
    expect(closedTicket.status).toBe('closed');
    expect(store.shakingTicketId).toBe(closedTicket.id);
  });

  it('filters tickets accurately by search query', () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'test-uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'Payment gateway timeout on checkout',
        status: 'open',
        priority: 'high',
        type: 'bug',
        source: 'api',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        public_id: 'test-uuid-2',
        ticket_key: 'TCK-2',
        number: 2,
        title: 'Monthly PDF report generation request',
        status: 'open',
        priority: 'low',
        type: 'enhancement',
        source: 'portal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    store.searchQuery = 'Payment gateway';
    expect(store.filteredTickets.length).toBe(1);
    expect(store.filteredTickets[0]?.ticket_key).toBe('TCK-1');
  });

  it('computes metrics accurately', () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'Test 1',
        status: 'open',
        priority: 'critical',
        type: 'bug',
        source: 'api',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        public_id: 'uuid-2',
        ticket_key: 'TCK-2',
        number: 2,
        title: 'Test 2',
        status: 'resolved',
        priority: 'low',
        type: 'task',
        source: 'portal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const metrics = store.metrics;
    expect(metrics.total).toBe(2);
    expect(metrics.open).toBe(1);
    expect(metrics.critical).toBe(1);
  });

  it('enforces role permissions: Preview role cannot transition or submit', async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    const authStore = useAuthStore();
    const ticketStore = useTicketStore();

    // 1. Preview Role
    authStore.setRole('PREVIEW');
    expect(authStore.isPreview).toBe(true);
    expect(authStore.canSubmitTicket).toBe(false);
    expect(authStore.canManageStatus).toBe(false);

    ticketStore.tickets = [
      {
        id: 10,
        public_id: 'uuid-10',
        ticket_key: 'TCK-10',
        number: 10,
        title: 'Preview test ticket',
        status: 'open',
        priority: 'medium',
        type: 'question',
        source: 'portal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const transitionResult = await ticketStore.transitionTicketStatus(10, 'in_progress');
    expect(transitionResult).toBe(false);

    // 2. HQ Role
    authStore.setRole('HQ ADMIN');
    expect(authStore.isHQ).toBe(true);
    expect(authStore.canSubmitTicket).toBe(true);
    expect(authStore.canManageStatus).toBe(true);

    // 3. Branch Role
    authStore.setRole('BRANCH');
    expect(authStore.isBranch).toBe(true);
    expect(authStore.canSubmitTicket).toBe(true);
  });

  it('updates pagination state with goToPage and changePerPage', async () => {
    const { vi } = await import('vitest');
    const { ticketApi } = await import('@/api/ticketApi');
    const getTicketsSpy = vi.spyOn(ticketApi, 'getTickets').mockImplementation(async (params) => ({
      data: [],
      meta: {
        current_page: params?.page || 1,
        from: 1,
        last_page: 5,
        path: '',
        per_page: params?.per_page || 10,
        to: 0,
        total: 0,
      },
      success: true,
    }));

    const store = useTicketStore();
    store.pagination.last_page = 5;

    // Default per_page is 10
    expect(store.pagination.per_page).toBe(10);
    expect(store.pagination.current_page).toBe(1);

    await store.goToPage(3);
    expect(store.pagination.current_page).toBe(3);
    expect(getTicketsSpy).toHaveBeenCalled();

    getTicketsSpy.mockClear();
    await store.changePerPage(25);
    expect(store.pagination.per_page).toBe(25);
    expect(store.pagination.current_page).toBe(1);
    expect(getTicketsSpy).toHaveBeenCalled();

    getTicketsSpy.mockRestore();
  });

  it('initializes per-status column pages correctly with page 0', () => {
    const store = useTicketStore();
    expect(store.columnPages.open.page).toBe(0);
    expect(store.columnPages.open.hasMore).toBe(true);
    expect(store.columnPages.in_progress.page).toBe(0);
    expect(store.columnPages.resolved.page).toBe(0);
    expect(store.columnPages.closed.page).toBe(0);
  });

  it('loads more tickets for a specific column starting at page 1', async () => {
    const { ticketApi } = await import('@/api/ticketApi');
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'Existing Open Ticket',
        status: 'open',
        priority: 'high',
        type: 'bug',
        source: 'api',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const getTicketsSpy = vi.spyOn(ticketApi, 'getTickets').mockResolvedValueOnce({
      success: true,
      message: 'Retrieved successfully',
      data: {
        content: [
          {
            id: 1,
            public_id: 'uuid-1',
            ticket_key: 'TCK-1',
            number: 1,
            title: 'Existing Open Ticket',
            status: 'open',
            priority: 'high',
            type: 'bug',
            source: 'api',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            public_id: 'uuid-2',
            ticket_key: 'TCK-2',
            number: 2,
            title: 'Second Open Ticket',
            status: 'open',
            priority: 'low',
            type: 'bug',
            source: 'portal',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          per_page: 10,
          total: 2,
          total_pages: 1,
          has_next: false,
          has_previous: false,
        },
        facets: {
          status: { open: 2, in_progress: 0, resolved: 0, closed: 0 },
          priority: { critical: 0, high: 1, medium: 0, low: 1 },
          total: 2,
        },
      },
    } as any);

    await store.loadMoreForColumn('open');

    expect(getTicketsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'open',
        page: 1,
        per_page: 10,
      }),
    );
    expect(store.tickets.length).toBe(2);
    expect(store.columnPages.open.page).toBe(1);
    expect(store.columnPages.open.hasMore).toBe(false);

    getTicketsSpy.mockRestore();
  });

  it('manages drawerPosition and persistence', () => {
    const store = useTicketStore();
    expect(store.drawerPosition).toBe('right');

    store.setDrawerPosition('bottom');
    expect(store.drawerPosition).toBe('bottom');
    expect(localStorage.getItem('bronx_drawer_position')).toBe('bottom');

    store.setDrawerPosition('left');
    expect(store.drawerPosition).toBe('left');
  });

  it('manages tableColumnVisibility and resets correctly', () => {
    const store = useTicketStore();
    expect(store.tableColumnVisibility.ticket).toBe(true);
    expect(store.tableColumnVisibility.reporter).toBe(true);
    expect(store.tableColumnVisibility.source).toBe(true);
    expect(store.tableColumnVisibility.company).toBe(true);
    expect(store.tableColumnVisibility.phone).toBe(true);

    store.toggleTableColumn('reporter');
    store.toggleTableColumn('source');
    expect(store.tableColumnVisibility.reporter).toBe(false);
    expect(store.tableColumnVisibility.source).toBe(false);

    store.resetTableColumns();
    expect(store.tableColumnVisibility.reporter).toBe(true);
    expect(store.tableColumnVisibility.source).toBe(true);
    expect(store.tableColumnVisibility.company).toBe(true);
    expect(store.tableColumnVisibility.phone).toBe(true);
  });

  it('correctly parses the new faceted response envelope and updates facets & pagination', async () => {
    const { vi } = await import('vitest');
    const { ticketApi } = await import('@/api/ticketApi');

    const getTicketsSpy = vi.spyOn(ticketApi, 'getTickets').mockResolvedValueOnce({
      success: true,
      message: 'Retrieved successfully',
      data: {
        content: [
          {
            id: 19,
            public_id: 'b28922af-4179-4c03-a9a2-734de249c25b',
            ticket_key: 'TCK-19',
            number: 19,
            title: 'Memory leak in worker',
            type: 'bug',
            status: 'open',
            priority: 'high',
            source: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          per_page: 10,
          total: 40,
          total_pages: 4,
          has_next: true,
          has_previous: false,
        },
        applied_filters: {
          status: 'open',
          priority: null,
          search: null,
        },
        facets: {
          status: {
            open: 6,
            in_progress: 4,
            resolved: 12,
            closed: 18,
          },
          priority: {
            critical: 2,
            high: 5,
            medium: 20,
            low: 13,
          },
          total: 40,
        },
      },
    } as any);

    const store = useTicketStore();
    await store.fetchTickets();

    expect(store.tickets.length).toBe(1);
    expect(store.tickets[0]?.ticket_key).toBe('TCK-19');
    expect(store.pagination.current_page).toBe(1);
    expect(store.pagination.last_page).toBe(4);
    expect(store.pagination.total).toBe(40);
    expect(store.facets.total).toBe(40);
    expect(store.facets.status.open).toBe(6);
    expect(store.facets.status.closed).toBe(18);
    expect(store.metrics.total).toBe(40);
    expect(store.metrics.open).toBe(6);

    getTicketsSpy.mockRestore();
  });

  it('manages modal/drawer view modes and minimize state', () => {
    const store = useTicketStore();
    expect(store.detailViewMode).toBe('modal');
    expect(store.isMinimized).toBe(false);

    store.detailViewMode = 'drawer';
    expect(store.detailViewMode).toBe('drawer');

    store.isMinimized = true;
    expect(store.isMinimized).toBe(true);
  });

  it('handles comment state during openTicketDrawer and reset', () => {
    const store = useTicketStore();
    const mockTicket = {
      id: 99,
      public_id: 'uuid-99',
      ticket_key: 'TCK-99',
      number: 99,
      title: 'Ticket for comment test',
      status: 'open' as const,
      priority: 'high' as const,
      type: 'bug' as const,
      source: 'portal' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.openTicketDrawer(mockTicket);
    expect(store.selectedTicket?.id).toBe(99);
    expect(store.isDrawerOpen).toBe(true);
    expect(store.isMinimized).toBe(false);

    store.closeTicketDrawer();
    expect(store.isDrawerOpen).toBe(false);
    expect(store.comments).toEqual([]);
  });

  it('loads embedded comments from getTicketById without calling getTicketComments', async () => {
    const { ticketApi } = await import('@/api/ticketApi');
    const store = useTicketStore();

    const mockComments = [
      {
        id: 11,
        ticket_id: 33,
        body: "i've fix it",
        is_internal: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const getTicketByIdSpy = vi.spyOn(ticketApi, 'getTicketById').mockResolvedValueOnce({
      id: 33,
      public_id: 'uuid-33',
      ticket_key: 'TCK-28',
      number: 28,
      title: 'Fix issue on Dashboard UI',
      status: 'open',
      priority: 'low',
      type: 'bug',
      source: 'api',
      comments: mockComments,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    const getCommentsSpy = vi.spyOn(ticketApi, 'getTicketComments');

    await store.openTicketDrawer({ id: 33 } as any);

    expect(getTicketByIdSpy).toHaveBeenCalledWith(33);
    expect(getCommentsSpy).not.toHaveBeenCalled();
    expect(store.comments).toEqual(mockComments);
    expect(store.selectedTicket?.id).toBe(33);

    getTicketByIdSpy.mockRestore();
    getCommentsSpy.mockRestore();
  });
});


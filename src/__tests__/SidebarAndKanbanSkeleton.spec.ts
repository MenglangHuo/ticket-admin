import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Sidebar from '@/components/layout/Sidebar.vue';
import TicketCardSkeleton from '@/components/tickets/TicketCardSkeleton.vue';
import TicketKanban from '@/components/tickets/TicketKanban.vue';
import { useTicketStore } from '@/stores/ticketStore';
import { useAuthStore } from '@/stores/authStore';

// Mock vue-router
const pushMock = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/tickets' }),
  useRouter: () => ({ push: pushMock }),
}));

describe('TicketCardSkeleton Component', () => {
  it('renders skeleton pulse elements properly', () => {
    const wrapper = mount(TicketCardSkeleton);
    expect(wrapper.classes()).toContain('animate-pulse');
    expect(wrapper.findAll('.bg-slate-200, .bg-indigo-100\\/80, .bg-slate-100').length).toBeGreaterThan(0);
  });
});

describe('Sidebar Component Layout Enhancements', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    pushMock.mockClear();
  });

  it('renders expanded mode by default with labels and Sign Out button', () => {
    const wrapper = mount(Sidebar, {
      global: {
        stubs: {
          routerLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    // Check header text
    expect(wrapper.text()).toContain('Ticket Admin');
    expect(wrapper.text()).toContain('Ticket Management');

    // Check navigation labels
    expect(wrapper.text()).toContain('Dashboard');
    expect(wrapper.text()).toContain('Tickets');
    expect(wrapper.text()).toContain('Settings');

    // Check Sign Out button with icon and clean text
    expect(wrapper.text()).toContain('Sign Out');
    expect(wrapper.text()).toContain('Log out of account');

    // Verify it has desktop w-64 class
    const aside = wrapper.find('aside');
    expect(aside.classes()).toContain('md:w-64');
  });

  it('toggles to collapsed mode when collapse button is clicked', async () => {
    const wrapper = mount(Sidebar, {
      global: {
        stubs: {
          routerLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    const collapseBtn = wrapper.find('button[title="Collapse sidebar"]');
    expect(collapseBtn.exists()).toBe(true);

    await collapseBtn.trigger('click');

    // After collapse:
    const aside = wrapper.find('aside');
    expect(aside.classes()).toContain('md:w-20');

    // Text labels should be hidden in collapsed mode
    expect(wrapper.text()).not.toContain('Ticket Management');
    expect(wrapper.text()).not.toContain('Log out of account');

    // Expand button should now be available
    const expandBtn = wrapper.find('button[title="Expand sidebar"]');
    expect(expandBtn.exists()).toBe(true);

    // Sign Out button should exist with title="Sign Out"
    const signoutBtn = wrapper.find('button[title="Sign Out"]');
    expect(signoutBtn.exists()).toBe(true);

    // State should be saved in localStorage
    expect(localStorage.getItem('bronx_sidebar_collapsed')).toBe('true');
  });

  it('calls authStore.logout and redirects to /login when Sign Out is clicked', async () => {
    const wrapper = mount(Sidebar, {
      global: {
        stubs: {
          routerLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    const authStore = useAuthStore();
    const logoutSpy = vi.spyOn(authStore, 'logout');

    const signoutBtn = wrapper.find('button[title="Sign Out"]');
    expect(signoutBtn.exists()).toBe(true);
    await signoutBtn.trigger('click');

    expect(logoutSpy).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});

describe('TicketKanban Loading Skeletons', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders TicketCardSkeleton in kanban columns when ticketStore.isLoading is true', async () => {
    const ticketStore = useTicketStore();
    ticketStore.isLoading = true;

    const wrapper = mount(TicketKanban);

    const skeletons = wrapper.findAllComponents(TicketCardSkeleton);
    // 4 columns * 3 skeletons = 12 skeletons
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders actual tickets when ticketStore.isLoading is false', async () => {
    const ticketStore = useTicketStore();
    ticketStore.isLoading = false;
    ticketStore.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'Server connection timeout',
        type: 'bug',
        status: 'open',
        priority: 'high',
        source: 'portal',
        created_at: '2026-10-06T10:00:00.000Z',
        updated_at: '2026-10-06T10:00:00.000Z',
      },
    ];

    const wrapper = mount(TicketKanban);

    const skeletons = wrapper.findAllComponents(TicketCardSkeleton);
    expect(skeletons.length).toBe(0);
    expect(wrapper.text()).toContain('TCK-1');
    expect(wrapper.text()).toContain('Server connection timeout');
  });

  it('correctly displays column count and avoids Load More button when column is empty after ticket move', async () => {
    const { ticketApi } = await import('@/api/ticketApi');
    vi.spyOn(ticketApi, 'updateTicket').mockResolvedValueOnce({ id: 8, status: 'open' } as any);

    const ticketStore = useTicketStore();
    ticketStore.isLoading = false;
    ticketStore.tickets = [
      {
        id: 8,
        public_id: 'uuid-8',
        ticket_key: 'TCK-8',
        number: 8,
        title: 'In progress ticket',
        status: 'in_progress',
        priority: 'high',
        type: 'enhancement',
        source: 'portal',
        created_at: '2026-10-08T00:00:00.000Z',
        updated_at: '2026-10-08T00:00:00.000Z',
      },
    ];
    ticketStore.facets = {
      status: { open: 0, in_progress: 1, resolved: 0, closed: 0 },
      priority: { critical: 0, high: 1, medium: 0, low: 0 },
      total: 1,
    };

    const wrapper = mount(TicketKanban);

    // Initially in progress shows Showing 1 of 1 and All loaded
    const columns = wrapper.findAll('.min-w-\\[310px\\]');
    const inProgressColumn = columns.find((c) => c.text().includes('In Progress'));
    expect(inProgressColumn?.text()).toContain('Showing 1 of 1');
    expect(inProgressColumn?.text()).toContain('All loaded');
    expect(inProgressColumn?.text()).not.toContain('Load More');

    // Move ticket to open
    await ticketStore.transitionTicketStatus(8, 'open');

    // After move, in_progress has 0 tickets:
    expect(inProgressColumn?.text()).toContain('Showing 0 of 0');
    expect(inProgressColumn?.text()).toContain('All loaded');
    expect(inProgressColumn?.text()).not.toContain('Load More');
    expect(inProgressColumn?.text()).toContain('No tickets in In Progress');

    // Open column now has 1 ticket:
    const openColumn = columns.find((c) => c.text().includes('Open'));
    expect(openColumn?.text()).toContain('Showing 1 of 1');
    expect(openColumn?.text()).toContain('All loaded');
    expect(openColumn?.text()).not.toContain('Load More');
  });
});

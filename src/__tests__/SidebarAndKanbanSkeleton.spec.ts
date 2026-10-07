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
});

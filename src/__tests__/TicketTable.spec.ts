import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TicketTable from '@/components/tickets/TicketTable.vue';
import { useTicketStore } from '@/stores/ticketStore';

describe('TicketTable Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('renders Source, Company, and Phone Number columns with appropriate values', () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'HQ Test Ticket',
        status: 'open',
        priority: 'high',
        type: 'bug',
        source: 'admin',
        company: 'UYFC',
        reporter_phone: '0928989888',
        reporter_name: 'Ja Na',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        public_id: 'uuid-2',
        ticket_key: 'TCK-2',
        number: 2,
        title: 'Branch Test Ticket',
        status: 'in_progress',
        priority: 'medium',
        type: 'task',
        source: 'portal',
        company: 'UYFC',
        reporter_phone: '0964096111',
        reporter_name: 'Branch Staff',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const wrapper = mount(TicketTable);

    // Headers
    const headers = wrapper.findAll('th');
    const headerTexts = headers.map((h) => h.text());
    expect(headerTexts.some((t) => t.includes('Source'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Company'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Phone Number'))).toBe(true);

    // Rows content
    const html = wrapper.html();
    expect(html).toContain('HQ ADMIN');
    expect(html).toContain('BRANCH ADMIN');
    expect(html).toContain('UYFC');
    expect(html).toContain('0928989888');
    expect(html).toContain('0964096111');
  });

  it('renders Ticket Key and Title as separate distinct columns with their own headers', () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-45',
        number: 45,
        title: 'Internal server 500 error',
        status: 'open',
        priority: 'critical',
        type: 'bug',
        source: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const wrapper = mount(TicketTable);
    const headers = wrapper.findAll('th');
    const headerTexts = headers.map((h) => h.text());

    // Both Ticket Key and Title headers exist separately
    expect(headerTexts.some((t) => t.includes('Ticket Key'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Title'))).toBe(true);

    // Both values render in their respective cells
    const html = wrapper.html();
    expect(html).toContain('TCK-45');
    expect(html).toContain('Internal server 500 error');
  });

  it('respects column visibility toggles independently for title and other columns', async () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'Test Ticket',
        status: 'open',
        priority: 'low',
        type: 'bug',
        source: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const wrapper = mount(TicketTable);
    expect(wrapper.text()).toContain('Company');

    // Toggle off company
    store.toggleTableColumn('company');
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('th').map((h) => h.text()).some((t) => t.includes('Company'))).toBe(false);

    // Toggle off title
    store.toggleTableColumn('title');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('th').map((h) => h.text()).some((t) => t.includes('Title'))).toBe(false);
  });

  it('provides column resize handles with cursor-col-resize styling', () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'Test Ticket',
        status: 'open',
        priority: 'low',
        type: 'bug',
        source: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const wrapper = mount(TicketTable);
    const resizeHandles = wrapper.findAll('.cursor-col-resize');
    expect(resizeHandles.length).toBeGreaterThanOrEqual(8);
  });

  it('renders sticky Action column and custom rows-per-page pagination', () => {
    const store = useTicketStore();
    store.tickets = [
      {
        id: 1,
        public_id: 'uuid-1',
        ticket_key: 'TCK-1',
        number: 1,
        title: 'Test Ticket',
        status: 'open',
        priority: 'low',
        type: 'bug',
        source: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const wrapper = mount(TicketTable);

    // Action column header is sticky
    const actionTh = wrapper.findAll('th').find((th) => th.text().includes('Action'));
    expect(actionTh).toBeDefined();
    expect(actionTh?.classes()).toContain('sticky');
    expect(actionTh?.classes()).toContain('right-0');

    // Custom Rows per page text exists
    expect(wrapper.text()).toContain('Rows per page:');
  });
});

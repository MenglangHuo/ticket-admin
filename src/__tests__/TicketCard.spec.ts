import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TicketCard from '@/components/tickets/TicketCard.vue';
import type { Ticket } from '@/types/ticket';

describe('TicketCard Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const baseTicket: Ticket = {
    id: 101,
    public_id: 'uuid-101',
    ticket_key: 'TCK-101',
    number: 101,
    title: 'Payment gateway timeout',
    type: 'bug',
    status: 'open',
    priority: 'critical',
    source: 'portal',
    reporter_name: 'John Doe',
    reporter_email: 'john@example.com',
    created_at: '2026-10-06T10:00:00.000Z',
    updated_at: '2026-10-06T10:00:00.000Z',
  };

  it('renders description_preview by default when provided', () => {
    const ticket: Ticket = {
      ...baseTicket,
      description: 'Full long description that should not be used if preview is present',
      description_preview: 'Custom preview snippet for card display',
    };

    const wrapper = mount(TicketCard, {
      props: { ticket },
    });

    expect(wrapper.text()).toContain('Custom preview snippet for card display');
    expect(wrapper.text()).not.toContain('Full long description');
  });

  it('falls back to description when description_preview is not provided', () => {
    const ticket: Ticket = {
      ...baseTicket,
      description: 'Fallback full description shown as preview',
    };

    const wrapper = mount(TicketCard, {
      props: { ticket },
    });

    expect(wrapper.text()).toContain('Fallback full description shown as preview');
  });

  it('displays default placeholder when neither description_preview nor description is provided', () => {
    const ticket: Ticket = {
      ...baseTicket,
      description: undefined,
      description_preview: undefined,
    };

    const wrapper = mount(TicketCard, {
      props: { ticket },
    });

    expect(wrapper.text()).toContain('No description preview');
  });

  it('renders priority next to ticket key, ticket type at top, and reporter name only at bottom', () => {
    const wrapper = mount(TicketCard, {
      props: { ticket: baseTicket },
    });

    expect(wrapper.text()).toContain('TCK-101');
    expect(wrapper.text()).toContain('CRITICAL');
    expect(wrapper.text()).toContain('bug');
    expect(wrapper.text()).toContain('John Doe');
    // Reporter email should not be displayed
    expect(wrapper.text()).not.toContain('john@example.com');
  });

  it('strips HTML tags and renders user-understandable plain text without raw tags', () => {
    const ticket: Ticket = {
      ...baseTicket,
      description: '<p><strong>Production Order Issue</strong></p><ol><li><p>Order process but not Payment</p></li></ol>',
      description_preview: undefined,
    };

    const wrapper = mount(TicketCard, {
      props: { ticket },
    });

    const cardText = wrapper.text();
    expect(cardText).not.toContain('<p>');
    expect(cardText).not.toContain('<strong>');
    expect(cardText).not.toContain('<ol>');
    expect(cardText).not.toContain('<li>');
    expect(cardText).toContain('Production Order Issue');
    expect(cardText).toContain('Order process but not Payment');
  });

  it('limits text length to keep card UI clean and compact', () => {
    const ticket: Ticket = {
      ...baseTicket,
      description: '<p>' + 'Issue details with very long repetitive description '.repeat(10) + '</p>',
      description_preview: undefined,
    };

    const wrapper = mount(TicketCard, {
      props: { ticket },
    });

    const descParagraph = wrapper.find('p.line-clamp-2');
    expect(descParagraph.exists()).toBe(true);
    expect(descParagraph.text().endsWith('...')).toBe(true);
    expect(descParagraph.text().length).toBeLessThanOrEqual(115);
  });
});

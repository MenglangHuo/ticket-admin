import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TicketDetailModal from '@/components/tickets/TicketDetailModal.vue'
import TicketDetailDrawer from '@/components/tickets/TicketDetailDrawer.vue'
import { useTicketStore } from '@/stores/ticketStore'
import type { Ticket } from '@/types/ticket'

const mockTicket: Ticket = {
  id: 101,
  public_id: 'uuid-101',
  ticket_key: 'TCK-101',
  number: 101,
  title: 'Connection reset on database connection pool',
  status: 'open',
  priority: 'high',
  type: 'bug',
  source: 'admin',
  company: 'Siem Reap Branch Office',
  reporter_name: 'John Developer',
  reporter_email: 'john@branch.org',
  reporter_phone: '0987654321',
  created_at: '2026-03-15T08:00:00Z',
  updated_at: '2026-03-15T08:30:00Z',
}

describe('TicketDetailModal & TicketDetailDrawer Enhancements', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  describe('TicketDetailModal', () => {
    it('renders company and source in hero section, submitter card, and ticket properties', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailModal, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            StatusDropdown: true,
          },
        },
      })

      const text = wrapper.text()
      // Check Company
      expect(text).toContain('Siem Reap Branch Office')
      // Check Source
      expect(text).toContain('HQ ADMIN')
      // Check Submitter card title and author label
      expect(text).toContain('Submitter Information')
      expect(text).toContain('Ticket Author • Siem Reap Branch Office')
      // Check Ticket Properties
      expect(text).toContain('Ticket Properties')
    })

    it('allows copying company name in TicketDetailModal', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailModal, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            StatusDropdown: true,
          },
        },
      })

      // Find company copy button
      const copyButtons = wrapper.findAll('button[title*="Company"]')
      expect(copyButtons.length).toBeGreaterThan(0)

      await copyButtons[0]!.trigger('click')
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Siem Reap Branch Office')
    })
  })

  describe('TicketDetailDrawer', () => {
    it('renders company and source in hero strip and submitter info card', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailDrawer, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            StatusDropdown: true,
          },
        },
      })

      const text = wrapper.text()
      // Check Company
      expect(text).toContain('Siem Reap Branch Office')
      // Check Source
      expect(text).toContain('HQ ADMIN')
      // Check Submitter card author info
      expect(text).toContain('Ticket Author • Siem Reap Branch Office')
    })

    it('allows copying company name in TicketDetailDrawer', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailDrawer, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            StatusDropdown: true,
          },
        },
      })

      const copyButtons = wrapper.findAll('button[title*="Company"]')
      expect(copyButtons.length).toBeGreaterThan(0)

      await copyButtons[0]!.trigger('click')
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Siem Reap Branch Office')
    })
  })
})

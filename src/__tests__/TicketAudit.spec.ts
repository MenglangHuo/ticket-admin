import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useTicketStore } from '@/stores/ticketStore'
import { useAuthStore } from '@/stores/authStore'
import { ticketApi } from '@/api/ticketApi'
import TicketAuditTimeline from '@/components/tickets/TicketAuditTimeline.vue'
import EditTicketModal from '@/components/tickets/EditTicketModal.vue'
import type { Ticket, TicketAudit } from '@/types/ticket'

const mockTicket: Ticket = {
  id: 101,
  public_id: 'uuid-101',
  ticket_key: 'TCK-101',
  number: 101,
  title: 'Original Title with poor grammar',
  description: '<p>Original description lacking details</p>',
  status: 'open',
  priority: 'medium',
  type: 'bug',
  source: 'web',
  company: 'Siem Reap Branch Office',
  reporter_name: 'Dara Client',
  created_at: '2026-03-15T08:00:00Z',
  updated_at: '2026-03-15T08:30:00Z',
}

const mockAudit: TicketAudit = {
  id: 1,
  ticket_id: 101,
  company_id: 1,
  event: 'updated',
  editor: {
    id: 99,
    name: 'Sophea Admin',
    email: 'sophea@hq.internal',
    profile_url: null,
  },
  modified_fields: ['title', 'description', 'priority'],
  old_values: {
    title: 'Original Title with poor grammar',
    description: '<p>Original description lacking details</p>',
    priority: 'medium',
  },
  new_values: {
    title: 'Enhanced Title: Clarified Database Timeout',
    description: '<p>Updated description with reproducible steps and error logs.</p>',
    priority: 'critical',
  },
  diff: {
    title: {
      old: 'Original Title with poor grammar',
      new: 'Enhanced Title: Clarified Database Timeout',
    },
    description: {
      old: '<p>Original description lacking details</p>',
      new: '<p>Updated description with reproducible steps and error logs.</p>',
    },
    priority: {
      old: 'medium',
      new: 'critical',
    },
  },
  reason: 'Fixed grammar and clarified steps to reproduce',
  ip_address: '192.168.1.1',
  user_agent: 'Vitest Agent',
  created_at: '2026-03-15 09:00:00',
  updated_at: '2026-03-15 09:00:00',
}

describe('Ticket Audit Features', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('TicketAuditTimeline Component', () => {
    it('renders audit timeline entries collapsed by default and before/after diffs when expanded', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.ticketAudits = [mockAudit]

      const wrapper = mount(TicketAuditTimeline)

      // Verified collapsed by default
      expect(wrapper.text()).toContain('Sophea Admin')
      expect(wrapper.text()).toContain('Audit Trail & History')
      expect(wrapper.text()).toContain('Expand All')
      expect(wrapper.text()).not.toContain('Description Changed:')

      // Click to expand the audit row
      const expandBtn = wrapper.find('button[title*="Expand audit details"]')
      expect(expandBtn.exists()).toBe(true)
      await expandBtn.trigger('click')

      const text = wrapper.text()
      // Editor info
      expect(text).toContain('Sophea Admin')
      // Reason callout
      expect(text).toContain('Fixed grammar and clarified steps to reproduce')
      // Field diffs
      expect(text).toContain('Original Title with poor grammar')
      expect(text).toContain('Enhanced Title: Clarified Database Timeout')
      expect(text).toContain('medium')
      expect(text).toContain('critical')
      expect(text).toContain('titledescriptionpriority')
      // Description is rendered as HTML
      expect(wrapper.html()).toContain(
        'Updated description with reproducible steps and error logs.',
      )
    })

    it('renders HTML formatted description with BEFORE and AFTER UI like title when expanded', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.ticketAudits = [
        {
          ...mockAudit,
          diff: {
            description: {
              old: '<ul><li>Point 1</li><li>Point 2</li></ul>',
              new: '<ul><li>Updated Point 1</li><li>Added Point 2</li></ul>',
            },
          },
        },
      ]

      const wrapper = mount(TicketAuditTimeline)

      // By default is collapsed
      expect(wrapper.text()).toContain('Expand All')
      expect(wrapper.html()).not.toContain('<li>Point 1</li>')

      // Ensure filter tabs (All, Title, Description, Priority) are removed
      const buttonTexts = wrapper.findAll('button').map((b) => b.text().trim())
      expect(buttonTexts).not.toContain('All')
      expect(buttonTexts).not.toContain('Title')
      expect(buttonTexts).not.toContain('Priority')

      // Ensure IP address and user-agent details are removed
      expect(wrapper.text()).not.toContain('192.168.1.1')
      expect(wrapper.text()).not.toContain('Vitest Agent')

      // Expand audit details
      const expandBtn = wrapper.find('button[title*="Expand audit details"]')
      expect(expandBtn.exists()).toBe(true)
      await expandBtn.trigger('click')

      // Both BEFORE and AFTER HTML list tags are rendered directly (UI like title)
      expect(wrapper.html()).toContain('<li>Point 1</li>')
      expect(wrapper.html()).toContain('<li>Updated Point 1</li>')
      expect(wrapper.text()).toContain('BEFORE')
      expect(wrapper.text()).toContain('AFTER')

      // Test collapse toggle: clicking the collapse button hides details again
      const collapseBtn = wrapper.find('button[title*="Collapse audit details"]')
      expect(collapseBtn.exists()).toBe(true)
      await collapseBtn.trigger('click')

      // Details should now be hidden
      expect(wrapper.text()).not.toContain('Description Changed:')
    })

    it('supports Expand All and Collapse All across multiple audit records', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.ticketAudits = [
        { ...mockAudit, id: 1 },
        { ...mockAudit, id: 2, event: 'status_changed', modified_fields: ['status'] },
      ]

      const wrapper = mount(TicketAuditTimeline)

      // By default all are collapsed
      const toggleAllBtn = wrapper.find('button:has(span)')
      expect(wrapper.text()).toContain('Expand All')
      expect(wrapper.text()).not.toContain('Description Changed:')

      // Click Expand All
      await toggleAllBtn.trigger('click')
      expect(wrapper.text()).toContain('Collapse All')
      expect(wrapper.text()).toContain('Description Changed:')

      // Click Collapse All
      await toggleAllBtn.trigger('click')
      expect(wrapper.text()).toContain('Expand All')
      expect(wrapper.text()).not.toContain('Description Changed:')
    })

    it('renders empty state when ticket has no modifications yet', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.ticketAudits = []

      const wrapper = mount(TicketAuditTimeline)

      expect(wrapper.text()).toContain('No modifications recorded')
      expect(wrapper.text()).toContain('This ticket is in its original submitted state')
    })
  })

  describe('EditTicketModal Component', () => {
    it('populates fields from selected ticket and allows submitting update with audit reason', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isEditTicketModalOpen = true

      const updateSpy = vi.spyOn(store, 'updateTicketDetails').mockResolvedValue(true as any)

      const wrapper = mount(EditTicketModal, {
        global: {
          stubs: {
            teleport: true,
            CustomSelect: true,
          },
        },
      })

      // Form populated
      const titleInput = wrapper.find('input[placeholder*="Payment Gateway Timeout"]')
      expect((titleInput.element as HTMLInputElement).value).toBe(
        'Original Title with poor grammar',
      )

      // Set new title
      await titleInput.setValue('Refined Title')

      // Set reason
      const reasonInput = wrapper.find('input[placeholder*="Fixed grammatical mistakes"]')
      expect(reasonInput.exists()).toBe(true)
      await reasonInput.setValue('Corrected typo and grammar')

      // Submit form
      await wrapper.find('form').trigger('submit.prevent')

      expect(updateSpy).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          title: 'Refined Title',
          audit_reason: 'Corrected typo and grammar',
        }),
      )
    })
  })

  describe('TicketStore Audit Actions', () => {
    it('switches tabs between discussion and audits', () => {
      const store = useTicketStore()
      expect(store.activeDetailTab).toBe('discussion')

      store.activeDetailTab = 'audits'
      expect(store.activeDetailTab).toBe('audits')
    })

    it('refreshes ticket audits when status transition occurs on selected ticket', async () => {
      const authStore = useAuthStore()
      authStore.setRole('HQ ADMIN')

      const store = useTicketStore()
      store.tickets = [{ ...mockTicket, id: 101, status: 'open' }]
      store.selectedTicket = { ...mockTicket, id: 101, status: 'open' }

      vi.spyOn(ticketApi, 'updateTicket').mockResolvedValue({
        success: true,
        data: { ...mockTicket, id: 101, status: 'in_progress' },
        message: 'Status updated',
      } as any)

      const getAuditsSpy = vi.spyOn(ticketApi, 'getTicketAudits').mockResolvedValue({
        success: true,
        data: [
          {
            ...mockAudit,
            event: 'status_changed',
            modified_fields: ['status'],
            diff: { status: { old: 'open', new: 'in_progress' } },
          },
        ],
        meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
      } as any)

      const result = await store.transitionTicketStatus(
        101,
        'in_progress',
        'Starting investigation',
      )
      expect(result).toBe(true)

      expect(getAuditsSpy).toHaveBeenCalledWith(101)
      expect(store.ticketAudits.length).toBe(1)
      expect(store.ticketAudits[0]?.event).toBe('status_changed')
      expect(store.selectedTicket?.status).toBe('in_progress')
    })
  })

  describe('Status Change Audit in Timeline', () => {
    it('renders status_changed event with before and after status badges and reason', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket, status: 'resolved' }
      store.ticketAudits = [
        {
          ...mockAudit,
          event: 'status_changed',
          modified_fields: ['status'],
          old_values: { status: 'in_progress' },
          new_values: { status: 'resolved' },
          diff: {
            status: { old: 'in_progress', new: 'resolved' },
          },
          reason: "Status changed from 'in_progress' to 'resolved'",
        },
      ]

      const wrapper = mount(TicketAuditTimeline)

      // Event badge
      expect(wrapper.text()).toContain('status_changed')
      // Event summary
      expect(wrapper.text()).toContain('changed ticket status')

      // Expand audit details
      const expandBtn = wrapper.find('button[title*="Expand audit details"]')
      await expandBtn.trigger('click')

      // Status before and after
      expect(wrapper.text()).toContain('in_progress')
      expect(wrapper.text()).toContain('resolved')
      // Reason callout
      expect(wrapper.text()).toContain("Status changed from 'in_progress' to 'resolved'")
    })
  })
})

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
    it('renders company in submitter card and ticket properties', async () => {
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

    it('switches title to input form and description to HtmlDescriptionEditor without opening new modal popup', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket, description: '<p>Initial description</p>' }
      store.isDrawerOpen = true
      store.isEditTicketModalOpen = false

      const wrapper = mount(TicketDetailModal, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            HtmlDescriptionEditor: true,
            StatusDropdown: true,
          },
        },
      })

      // In view mode: title is in h2, no input
      expect(wrapper.find('h2').text()).toContain(mockTicket.title)
      expect(wrapper.find('input[placeholder="Enter ticket title..."]').exists()).toBe(false)

      // Find and click 'Edit Ticket' button
      const editBtn = wrapper.findAll('button').find((b) => b.text().includes('Edit Ticket'))
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')

      // Modal popup should NOT open
      expect(store.isEditTicketModalOpen).toBe(false)

      // Title should now be an input form populated with the title
      const titleInput = wrapper.find('input[placeholder="Enter ticket title..."]')
      expect(titleInput.exists()).toBe(true)
      expect((titleInput.element as HTMLInputElement).value).toBe(mockTicket.title)

      // Description should now be HtmlDescriptionEditor
      expect(wrapper.findComponent({ name: 'HtmlDescriptionEditor' }).exists()).toBe(true)

      // Clicking Cancel returns to view mode
      const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('Cancel'))
      expect(cancelBtn).toBeDefined()
      await cancelBtn!.trigger('click')

      expect(wrapper.find('h2').exists()).toBe(true)
      expect(wrapper.find('input[placeholder="Enter ticket title..."]').exists()).toBe(false)
    })

    it('saves inline title and description edits via updateTicketDetails', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket, description: '<p>Old details</p>' }
      store.isDrawerOpen = true
      const updateSpy = vi.spyOn(store, 'updateTicketDetails').mockResolvedValue(true as any)

      const wrapper = mount(TicketDetailModal, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            HtmlDescriptionEditor: true,
            StatusDropdown: true,
          },
        },
      })

      // Enter edit mode
      const editBtn = wrapper.findAll('button').find((b) => b.text().includes('Edit Ticket'))
      await editBtn!.trigger('click')

      // Modify title
      const titleInput = wrapper.find('input[placeholder="Enter ticket title..."]')
      await titleInput.setValue('Updated Database Timeout Issue')

      // Save changes
      const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save'))
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')

      expect(updateSpy).toHaveBeenCalledWith(
        mockTicket.id,
        expect.objectContaining({
          title: 'Updated Database Timeout Issue',
        }),
      )
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

    it('switches title to input form and description to HtmlDescriptionEditor in drawer mode', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket, description: '<p>Initial description</p>' }
      store.isDrawerOpen = true
      store.isEditTicketModalOpen = false

      const wrapper = mount(TicketDetailDrawer, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            HtmlDescriptionEditor: true,
            StatusDropdown: true,
          },
        },
      })

      // In view mode: title is in h2, no input
      expect(wrapper.find('h2').text()).toContain(mockTicket.title)
      expect(wrapper.find('input[placeholder="Enter ticket title..."]').exists()).toBe(false)

      // Find and click 'Edit Ticket' button
      const editBtn = wrapper.findAll('button').find((b) => b.text().includes('Edit Ticket'))
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')

      // Modal popup should NOT open
      expect(store.isEditTicketModalOpen).toBe(false)

      // Title should now be an input form
      const titleInput = wrapper.find('input[placeholder="Enter ticket title..."]')
      expect(titleInput.exists()).toBe(true)
      expect((titleInput.element as HTMLInputElement).value).toBe(mockTicket.title)

      // Description should now be HtmlDescriptionEditor
      expect(wrapper.findComponent({ name: 'HtmlDescriptionEditor' }).exists()).toBe(true)
    })

    it('renders TicketCommentsSection in TicketDetailDrawer with All Comments and Audit History tabs', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailDrawer, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            HtmlDescriptionEditor: true,
            StatusDropdown: true,
            TicketAuditTimeline: true,
          },
        },
      })

      expect(wrapper.findComponent({ name: 'TicketCommentsSection' }).exists()).toBe(true)
      const text = wrapper.text()
      expect(text).not.toContain('Discussion')
      expect(text).toContain('All Comments')
      expect(text).toContain('Audit History')
    })
  })

  describe('TicketDetailModal Comments Integration', () => {
    it('renders TicketCommentsSection in TicketDetailModal with All Comments and Audit History tabs', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailModal, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            HtmlDescriptionEditor: true,
            StatusDropdown: true,
            TicketAuditTimeline: true,
          },
        },
      })

      expect(wrapper.findComponent({ name: 'TicketCommentsSection' }).exists()).toBe(true)
      const text = wrapper.text()
      expect(text).not.toContain('Discussion')
      expect(text).toContain('All Comments')
      expect(text).toContain('Audit History')
    })

    it('splits ticket details into 45% and comments section into 55% height', async () => {
      const store = useTicketStore()
      store.selectedTicket = { ...mockTicket }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailModal, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            HtmlDescriptionEditor: true,
            StatusDropdown: true,
            TicketAuditTimeline: true,
          },
        },
      })

      // Top section has h-[45%] (45% height)
      const topSection = wrapper.find('.h-\\[45\\%\\]')
      expect(topSection.exists()).toBe(true)

      // Comments section has h-[55%] (55% height)
      const commentsContainer = wrapper.find('.h-\\[55\\%\\]')
      expect(commentsContainer.exists()).toBe(true)
    })

    it('renders image attachments as enlarged preview cards without displaying filename', async () => {
      const store = useTicketStore()
      store.selectedTicket = {
        ...mockTicket,
        attachments: [
          {
            id: 101,
            ticket_id: 1,
            file_name: 'super_long_ugly_hash_filename_snapshot.png',
            file_url: 'https://example.com/snapshot.png',
            file_size: 1024 * 500,
            mime_type: 'image/png',
            created_at: '2026-10-14T10:21:00Z',
          },
          {
            id: 102,
            ticket_id: 1,
            file_name: 'server_specification.pdf',
            file_url: 'https://example.com/spec.pdf',
            file_size: 1024 * 200,
            mime_type: 'application/pdf',
            created_at: '2026-10-14T10:21:00Z',
          },
        ],
      }
      store.isDrawerOpen = true

      const wrapper = mount(TicketDetailModal, {
        global: {
          stubs: {
            teleport: true,
            HtmlDescriptionViewer: true,
            HtmlDescriptionEditor: true,
            StatusDropdown: true,
            TicketAuditTimeline: true,
          },
        },
      })

      // Image attachment should be rendered in a neat card with w-10 and h-10
      const imageThumb = wrapper.find('.group\\/img')
      expect(imageThumb.exists()).toBe(true)
      expect(imageThumb.classes()).toContain('w-10')
      expect(imageThumb.classes()).toContain('h-10')

      // Image attachment should NOT display the filename text
      expect(imageThumb.text()).not.toContain('super_long_ugly_hash_filename_snapshot.png')

      // Non-image file attachment should still display its filename
      expect(wrapper.text()).toContain('server_specification.pdf')
    })
  })
})

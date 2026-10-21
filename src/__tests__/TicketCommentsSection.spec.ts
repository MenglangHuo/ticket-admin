import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TicketCommentsSection from '@/components/tickets/TicketCommentsSection.vue'
import { useTicketStore } from '@/stores/ticketStore'
import { useAuthStore } from '@/stores/authStore'
import type { Ticket, TicketComment } from '@/types/ticket'

const mockTicket: Ticket = {
  id: 101,
  public_id: 'uuid-101',
  ticket_key: 'TCK-101',
  number: 101,
  title: 'Connection reset issue',
  status: 'open',
  priority: 'high',
  type: 'bug',
  source: 'portal',
  reporter_name: 'customer_alex',
  reporter_email: 'alex@customer.com',
  created_at: '2026-03-15T08:00:00Z',
  updated_at: '2026-03-15T08:30:00Z',
}

const mockComments: TicketComment[] = [
  {
    id: 1,
    ticket_id: 101,
    username: 'admin_sarah',
    body: 'Investigating server cluster logs.',
    is_internal: true,
    created_at: '2026-03-15T08:05:00Z',
    updated_at: '2026-03-15T08:05:00Z',
    author: {
      id: 2,
      name: 'Sarah Admin',
    },
  },
  {
    id: 2,
    ticket_id: 101,
    username: 'customer_alex',
    body: 'Here is the error snapshot in base64 format.',
    is_internal: false,
    created_at: '2026-03-15T08:10:00Z',
    updated_at: '2026-03-15T08:10:00Z',
    files: [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    ],
  },
]

describe('TicketCommentsSection Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      username: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com',
      role: 'hq_admin',
    } as any
  })

  it('renders all three tabs: Discussion, All Comments, and Audit History', () => {
    const ticketStore = useTicketStore()
    ticketStore.comments = [...mockComments]
    ticketStore.activeDetailTab = 'discussion'

    const wrapper = mount(TicketCommentsSection, {
      props: { ticket: mockTicket },
      global: {
        stubs: {
          TicketAuditTimeline: true,
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Discussion')
    expect(text).toContain('All Comments')
    expect(text).toContain('Audit History')
  })

  it('switches between tabs and updates activeDetailTab in ticketStore', async () => {
    const ticketStore = useTicketStore()
    ticketStore.comments = [...mockComments]
    ticketStore.activeDetailTab = 'discussion'

    const wrapper = mount(TicketCommentsSection, {
      props: { ticket: mockTicket },
      global: {
        stubs: {
          TicketAuditTimeline: true,
        },
      },
    })

    const tabButtons = wrapper.findAll('button')
    const commentsTabBtn = tabButtons.find((b) => b.text().includes('All Comments'))
    expect(commentsTabBtn).toBeDefined()

    await commentsTabBtn!.trigger('click')
    expect(ticketStore.activeDetailTab).toBe('comments')

    const auditsTabBtn = tabButtons.find((b) => b.text().includes('Audit History'))
    expect(auditsTabBtn).toBeDefined()
    await auditsTabBtn!.trigger('click')
    expect(ticketStore.activeDetailTab).toBe('audits')

    const discussionTabBtn = tabButtons.find((b) => b.text().includes('Discussion'))
    expect(discussionTabBtn).toBeDefined()
    await discussionTabBtn!.trigger('click')
    expect(ticketStore.activeDetailTab).toBe('discussion')
  })

  describe('Tab 1: Discussion (Admin Composer)', () => {
    it('does NOT contain Discussion Stream and is dedicated for admin comments', () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'discussion'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      // Must NOT contain Discussion Stream
      expect(wrapper.text()).not.toContain('Discussion Stream')

      // Must indicate Admin Discussion Note
      expect(wrapper.text()).toContain('Add Admin Discussion Note')
      expect(wrapper.text()).not.toContain('Admin Only')
      expect(wrapper.text()).not.toContain('hq_admin')
    })

    it('supports posting multiple admin notes without 1-comment limitation and clears textarea on submit', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'discussion'

      const addCommentSpy = vi.spyOn(ticketStore, 'addTicketComment').mockResolvedValue(true)

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)

      // First note
      await textarea.setValue('First internal admin note')
      const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('Submit Note'))
      expect(submitBtn).toBeDefined()
      await submitBtn!.trigger('click')

      expect(addCommentSpy).toHaveBeenCalledWith(
        mockTicket.id,
        expect.objectContaining({
          username: 'admin',
          body: 'First internal admin note',
          is_internal: true,
          files: [],
        }),
      )

      // Form must be cleared
      expect((textarea.element as HTMLTextAreaElement).value).toBe('')

      // Post second note immediately
      await textarea.setValue('Second follow-up note')
      await submitBtn!.trigger('click')

      expect(addCommentSpy).toHaveBeenCalledTimes(2)
      expect(addCommentSpy).toHaveBeenLastCalledWith(
        mockTicket.id,
        expect.objectContaining({
          username: 'admin',
          body: 'Second follow-up note',
          is_internal: true,
          files: [],
        }),
      )
      expect((textarea.element as HTMLTextAreaElement).value).toBe('')
    })
  })

  describe('Tab 2: All Comments (Chat-like UI)', () => {
    it('removes the filter card, search input, and bottom Add Comment composer', () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const text = wrapper.text()
      // Filter card items should NOT exist
      expect(text).not.toContain('Public / Client (')
      expect(text).not.toContain('Internal Notes (')

      // Search input should NOT exist
      expect(wrapper.find('input[placeholder="Search comments..."]').exists()).toBe(false)

      // Bottom Add Comment composer should NOT exist
      expect(text).not.toContain('Add Comment or Reply')
      expect(text).not.toContain('Send Comment')
    })

    it('renders all comments and attachments for both admin and client in a clean chat-like timeline', () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const stream = wrapper.find('[data-testid="all-comments-stream"]')
      expect(stream.exists()).toBe(true)

      // Both admin and client comments are rendered with usernames
      expect(stream.text()).toContain('admin_sarah')
      expect(stream.text()).toContain('Investigating server cluster logs.')
      expect(stream.text()).toContain('customer_alex')
      expect(stream.text()).toContain('Here is the error snapshot in base64 format.')

      // Role badges and legends are removed (only username displayed)
      const tabText = wrapper.find('[data-testid="all-comments-tab"]').text()
      expect(tabText).not.toContain('Staff Admin')
      expect(tabText).not.toContain('Internal Note')

      // Attachments are rendered
      expect(stream.text()).toContain('snapshot_1.png')

      // Admin comments appear on the right (flex-row-reverse), Client on the left (flex-row)
      const commentItems = stream.findAll('.group')
      expect(commentItems.length).toBe(2)
      expect(commentItems[0]!.classes()).toContain('flex-row-reverse')
      expect(commentItems[1]!.classes()).toContain('flex-row')
      expect(commentItems[1]!.classes()).not.toContain('flex-row-reverse')

      // Stream container has scrollable class
      expect(stream.classes()).toContain('overflow-y-auto')
    })

    it('removes edit button in comments and allows deleting comments directly from the chat bubble', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const deleteCommentSpy = vi.spyOn(ticketStore, 'deleteTicketComment').mockResolvedValue(true)
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      // Requirement 2: Edit button must NOT exist in comments
      const editBtn = wrapper.find('button[title="Edit comment"]')
      expect(editBtn.exists()).toBe(false)

      // Click delete on comment #1
      const deleteBtn = wrapper.find('button[title="Delete comment"]')
      expect(deleteBtn.exists()).toBe(true)
      await deleteBtn.trigger('click')

      expect(deleteCommentSpy).toHaveBeenCalledWith(mockTicket.id, 1)
    })

    it('positions username outside the box card and renders space-saving compact images', () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const stream = wrapper.find('[data-testid="all-comments-stream"]')
      const commentItems = stream.findAll('.group')

      // Check first comment (admin): username outside box card with bold font and vertical centering
      const adminComment = commentItems[0]!
      const header = adminComment.find('[data-testid="comment-header"]')
      expect(header.exists()).toBe(true)
      expect(header.text()).toContain('admin_sarah')
      expect(header.classes()).toContain('h-8')
      expect(header.classes()).toContain('items-center')
      expect(header.find('span.font-bold').exists()).toBe(true)

      // Speech bubble card only holds body and attachments, not the username header
      const speechBubble = adminComment.find('.rounded-2xl.rounded-tr-xs')
      expect(speechBubble.exists()).toBe(true)
      expect(speechBubble.text()).not.toContain('admin_sarah')
      expect(speechBubble.text()).toContain('Investigating server cluster logs.')
      // Admin background color matches user/client side (slate-100/90)
      expect(speechBubble.classes()).toContain('bg-slate-100/90')

      // Check second comment (client): compact image styling (w-14 sm:w-16) and matching background
      const clientComment = commentItems[1]!
      const clientBubble = clientComment.find('.rounded-2xl.rounded-tl-xs')
      expect(clientBubble.exists()).toBe(true)
      expect(clientBubble.classes()).toContain('bg-slate-100/90')

      const imgThumbnail = clientComment.find('.group\\/img')
      expect(imgThumbnail.exists()).toBe(true)
      expect(imgThumbnail.classes()).toContain('w-14')
      expect(imgThumbnail.classes()).toContain('sm:w-16')
      expect(imgThumbnail.classes()).toContain('rounded-xl')
    })
  })
})

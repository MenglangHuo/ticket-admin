import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

  it('removes Discussion tab and renders only All Comments and Audit History tabs', () => {
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
    expect(text).not.toContain('Discussion')
    expect(text).toContain('All Comments')
    expect(text).toContain('Audit History')
  })

  it('switches between All Comments and Audit History tabs and updates activeDetailTab in ticketStore', async () => {
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

    const tabButtons = wrapper.findAll('button')
    const auditsTabBtn = tabButtons.find((b) => b.text().includes('Audit History'))
    expect(auditsTabBtn).toBeDefined()
    await auditsTabBtn!.trigger('click')
    expect(ticketStore.activeDetailTab).toBe('audits')

    const commentsTabBtn = tabButtons.find((b) => b.text().includes('All Comments'))
    expect(commentsTabBtn).toBeDefined()
    await commentsTabBtn!.trigger('click')
    expect(ticketStore.activeDetailTab).toBe('comments')
  })

  describe('Telegram / Messenger Style Custom Composer at Bottom of All Comments', () => {
    it('renders the custom chat composer at the bottom of All Comments', () => {
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

      const composer = wrapper.find('[data-testid="comments-composer"]')
      expect(composer.exists()).toBe(true)

      const textarea = composer.find('textarea')
      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('placeholder')).toContain('Write a comment')

      // Attach file button exists
      expect(composer.find('button[title*="Attach"]').exists()).toBe(true)

      // Internal note toggle pill is removed
      expect(composer.text()).not.toContain('Internal Note')
    })

    it('does not display Internal Note button in the composer', () => {
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

      const composer = wrapper.find('[data-testid="comments-composer"]')
      const toggleBtn = composer.findAll('button').find((b) => b.text().includes('Internal Note'))
      expect(toggleBtn).toBeUndefined()
    })

    it('submits a new comment and clears textarea', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const addCommentSpy = vi.spyOn(ticketStore, 'addTicketComment').mockResolvedValue(true)

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const composer = wrapper.find('[data-testid="comments-composer"]')
      const textarea = composer.find('textarea')
      await textarea.setValue('Resolving issue by restarting cluster pool')

      const sendBtn = composer.find('button[title*="Send Comment"]')
      expect(sendBtn.exists()).toBe(true)
      await sendBtn.trigger('click')

      expect(addCommentSpy).toHaveBeenCalledWith(
        mockTicket.id,
        expect.objectContaining({
          username: 'admin',
          body: 'Resolving issue by restarting cluster pool',
          parent_id: null,
          is_internal: false,
          files: [],
        }),
      )

      expect((textarea.element as HTMLTextAreaElement).value).toBe('')
    })

    it('supports keyboard Enter to send comment and Shift+Enter for newline', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const addCommentSpy = vi.spyOn(ticketStore, 'addTicketComment').mockResolvedValue(true)

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const textarea = wrapper.find('[data-testid="comments-composer"] textarea')
      await textarea.setValue('Sending via Enter key')

      // Shift+Enter should NOT submit
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })
      expect(addCommentSpy).not.toHaveBeenCalled()

      // Plain Enter should submit
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })
      expect(addCommentSpy).toHaveBeenCalledWith(
        mockTicket.id,
        expect.objectContaining({
          body: 'Sending via Enter key',
          parent_id: null,
        }),
      )
    })
  })

  describe('Reply Comment Feature (Telegram / Messenger UI)', () => {
    it('shows reply button on comment bubbles and displays Telegram-style reply banner on click', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
            transition: false,
          },
        },
      })

      // Reply banner should not exist initially
      expect(wrapper.find('[data-testid="composer-reply-banner"]').exists()).toBe(false)

      // Find reply button on the first comment (Sarah Admin)
      const replyButtons = wrapper.findAll('button[title="Reply to comment"]')
      expect(replyButtons.length).toBe(2)

      // Click reply on first comment
      await replyButtons[0]!.trigger('click')

      // Reply banner appears above composer
      const replyBanner = wrapper.find('[data-testid="composer-reply-banner"]')
      expect(replyBanner.exists()).toBe(true)
      expect(replyBanner.text()).toContain('Replying to admin_sarah')
      expect(replyBanner.text()).toContain('Investigating server cluster logs.')

      // Textarea placeholder updates to reply mode
      const textarea = wrapper.find('[data-testid="comments-composer"] textarea')
      expect(textarea.attributes('placeholder')).toContain('Write a reply to admin_sarah')

      // Cancel reply via (X) button
      const cancelBtn = replyBanner.find('button[title="Cancel reply"]')
      expect(cancelBtn.exists()).toBe(true)
      await cancelBtn.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="composer-reply-banner"]').exists()).toBe(false)
    })

    it('submits reply with parent_id and resets reply banner upon success', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const addCommentSpy = vi.spyOn(ticketStore, 'addTicketComment').mockResolvedValue(true)

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
            transition: false,
          },
        },
      })

      // Click reply on comment 2 (customer_alex)
      const replyButtons = wrapper.findAll('button[title="Reply to comment"]')
      await replyButtons[1]!.trigger('click')

      const replyBanner = wrapper.find('[data-testid="composer-reply-banner"]')
      expect(replyBanner.exists()).toBe(true)
      expect(replyBanner.text()).toContain('Replying to customer_alex')

      // Type reply body
      const composer = wrapper.find('[data-testid="comments-composer"]')
      const textarea = composer.find('textarea')
      await textarea.setValue('Thanks for providing the screenshot, fixing now.')

      // Click send reply button
      const sendBtn = composer.find('button[title*="Send"]')
      await sendBtn.trigger('click')
      await flushPromises()
      await wrapper.vm.$nextTick()

      // Must include parent_id: 2
      expect(addCommentSpy).toHaveBeenCalledWith(
        mockTicket.id,
        expect.objectContaining({
          username: 'admin',
          body: 'Thanks for providing the screenshot, fixing now.',
          parent_id: 2,
        }),
      )

      // Reply banner and textarea must reset
      expect(wrapper.find('[data-testid="composer-reply-banner"]').exists()).toBe(false)
      expect((textarea.element as HTMLTextAreaElement).value).toBe('')
    })

    it('renders Telegram-style parent quote banner inside speech bubble when comment has parent_id', () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [
        ...mockComments,
        {
          id: 3,
          ticket_id: 101,
          parent_id: 1,
          username: 'admin_sarah',
          body: 'We found the issue in database pool configuration.',
          is_internal: true,
          created_at: '2026-03-15T08:15:00Z',
          updated_at: '2026-03-15T08:15:00Z',
        },
      ]
      ticketStore.activeDetailTab = 'comments'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
            transition: false,
          },
        },
      })

      const stream = wrapper.find('[data-testid="all-comments-stream"]')
      expect(stream.text()).toContain('We found the issue in database pool configuration.')

      // The 3rd comment bubble should display the quoted parent preview banner
      const quoteBanner = stream.find('div[title="Click to jump to original message"]')
      expect(quoteBanner.exists()).toBe(true)
      expect(quoteBanner.text()).toContain('admin_sarah')
      expect(quoteBanner.text()).toContain('Investigating server cluster logs.')
    })
  })

  describe('All Comments Timeline & Visual Elements', () => {
    it('renders comments and compact attachments in a clean timeline', () => {
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

      expect(stream.text()).toContain('admin_sarah')
      expect(stream.text()).toContain('Investigating server cluster logs.')
      expect(stream.text()).toContain('customer_alex')
      expect(stream.text()).toContain('Here is the error snapshot in base64 format.')
      expect(stream.text()).toContain('snapshot_1.png')

      const commentItems = stream.findAll('.group')
      expect(commentItems.length).toBe(2)
      expect(stream.text()).toContain('Support Staff')
      expect(stream.text()).toContain('Customer')
    })

    it('renders the bottom sentinel element for anchoring auto-scroll', () => {
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

      const sentinel = wrapper.find('[data-testid="comments-bottom-sentinel"]')
      expect(sentinel.exists()).toBe(true)
    })

    it('shows floating scroll-to-bottom button when user scrolls up, and scrolls down on click', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const scrollToSpy = vi.fn()
      window.HTMLElement.prototype.scrollTo = scrollToSpy

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
            transition: false,
          },
        },
      })

      const stream = wrapper.find('[data-testid="all-comments-stream"]')
      expect(stream.exists()).toBe(true)

      Object.defineProperty(stream.element, 'scrollHeight', { value: 1200, configurable: true })
      Object.defineProperty(stream.element, 'clientHeight', { value: 400, configurable: true })
      Object.defineProperty(stream.element, 'scrollTop', { value: 100, configurable: true, writable: true })

      await stream.trigger('scroll')

      const scrollBtn = wrapper.find('[data-testid="scroll-to-bottom-btn"]')
      expect(scrollBtn.exists()).toBe(true)

      await scrollBtn.trigger('click')
      await wrapper.vm.$nextTick()
      expect(scrollToSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          top: 1200,
          behavior: 'smooth',
        }),
      )
    })

    it('handles 100+ comments with instant 0ms positioning on tab switch and smart jump on floating button', async () => {
      const ticketStore = useTicketStore()
      const manyComments: TicketComment[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        ticket_id: 101,
        username: i % 2 === 0 ? 'customer_alex' : 'hq_admin',
        body: `Comment #${i + 1}`,
        is_internal: false,
        created_at: new Date(Date.now() - (100 - i) * 60000).toISOString(),
        updated_at: new Date(Date.now() - (100 - i) * 60000).toISOString(),
      }))
      ticketStore.comments = manyComments
      ticketStore.activeDetailTab = 'audits'

      const scrollToSpy = vi.fn()
      window.HTMLElement.prototype.scrollTo = scrollToSpy

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
            transition: false,
          },
        },
      })

      const stream = wrapper.find('[data-testid="all-comments-stream"]')
      Object.defineProperty(stream.element, 'scrollHeight', { value: 10000, configurable: true })
      Object.defineProperty(stream.element, 'clientHeight', { value: 500, configurable: true })
      Object.defineProperty(stream.element, 'scrollTop', { value: 0, configurable: true, writable: true })

      // 1. User switches from Audits to "All Comments" tab
      const tabButtons = wrapper.findAll('button')
      const commentsTabBtn = tabButtons.find((b) => b.text().includes('All Comments'))
      await commentsTabBtn!.trigger('click')

      // Position should be set to bottom without smooth animation
      expect(stream.element.scrollTop).toBe(10000)
      expect(scrollToSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth' }),
      )

      // 2. User scrolls way up (scrollTop = 200, distance > 1200px)
      stream.element.scrollTop = 200
      await stream.trigger('scroll')

      const scrollBtn = wrapper.find('[data-testid="scroll-to-bottom-btn"]')
      expect(scrollBtn.exists()).toBe(true)

      // 3. User clicks floating button: performs Telegram smart jump to near-bottom first, then glides
      await scrollBtn.trigger('click')
      expect(stream.element.scrollTop).toBe(10000 - 350)
      expect(scrollToSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          top: 10000,
          behavior: 'smooth',
        }),
      )
    })

    it('positions customer comments on left and admin comments on right with appropriate badges', () => {
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

      // mockComments[0] is admin_sarah (admin/support staff)
      // mockComments[1] is customer_alex (client/customer)
      const commentItems = wrapper.findAll('[id^="comment-"]')
      expect(commentItems.length).toBe(2)

      // Admin comment: flex-row-reverse (on the right) with Support Staff badge
      expect(commentItems[0]!.classes()).toContain('flex-row-reverse')
      expect(commentItems[0]!.text()).toContain('Support Staff')

      // Client comment: flex-row (on the left) with Customer badge
      expect(commentItems[1]!.classes()).toContain('flex-row')
      expect(commentItems[1]!.text()).toContain('Customer')
    })

    it('starts with compact 1-row composer and expands to full composer on input focus/click', async () => {
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

      const compactInput = wrapper.find('[data-testid="compact-composer-input"]')
      expect(compactInput.exists()).toBe(true)

      // Initially, expandedBox has display: none and compactBar does not
      expect(wrapper.find('[data-testid="expanded-composer-box"]').attributes('style')).toContain('display: none')
      expect(wrapper.find('[data-testid="compact-composer-bar"]').attributes('style') || '').not.toContain('display: none')

      // Click compact input to expand
      await compactInput.trigger('click')
      await flushPromises()

      // Expanded composer now does NOT have display: none, while compactBar has display: none
      expect(wrapper.find('[data-testid="expanded-composer-box"]').attributes('style') || '').not.toContain('display: none')
      expect(wrapper.find('[data-testid="compact-composer-bar"]').attributes('style')).toContain('display: none')
    })

    it('emits toggle-maximize event when expand/normal height button is clicked', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [...mockComments]
      ticketStore.activeDetailTab = 'comments'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket, isMaximized: false },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const maximizeBtn = wrapper.findAll('button').find((b) => b.attributes('title')?.includes('Expand comments area'))
      expect(maximizeBtn).toBeDefined()

      await maximizeBtn!.trigger('click')
      expect(wrapper.emitted('toggle-maximize')).toBeTruthy()
      expect(wrapper.emitted('toggle-maximize')!.length).toBe(1)
    })

    it('styles admin comment speech bubble with client-style neutral background and smaller image thumbnail', async () => {
      const ticketStore = useTicketStore()
      ticketStore.comments = [
        {
          id: 201,
          ticket_id: 1,
          username: 'hq_admin',
          body: 'Already Fixed',
          is_internal: false,
          created_at: '2026-10-14T10:26:00Z',
          updated_at: '2026-10-14T10:26:00Z',
          files: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='],
          author: { id: 1, name: 'hq_admin' },
        },
      ]
      ticketStore.activeDetailTab = 'comments'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const adminComment = wrapper.find('#comment-201')
      expect(adminComment.exists()).toBe(true)

      // Bubble card should use client-style background: bg-slate-100 and NOT bg-indigo-600
      const bubble = adminComment.find('.rounded-2xl.shadow-2xs')
      expect(bubble.exists()).toBe(true)
      expect(bubble.classes()).toContain('bg-slate-100/90')
      expect(bubble.classes()).not.toContain('bg-indigo-600')

      // Image thumbnail in comment should have smaller size: w-9 or w-10 (not w-11/w-12)
      const commentImg = adminComment.find('.group\\/img')
      expect(commentImg.exists()).toBe(true)
      expect(commentImg.classes()).toContain('w-9')
      expect(commentImg.classes()).not.toContain('w-11')
      expect(commentImg.classes()).not.toContain('w-12')
    })

    it('ensures Audit History tab container is scrollable with flex-1 min-h-0 overflow-y-auto', async () => {
      const ticketStore = useTicketStore()
      ticketStore.activeDetailTab = 'audits'

      const wrapper = mount(TicketCommentsSection, {
        props: { ticket: mockTicket },
        global: {
          stubs: {
            TicketAuditTimeline: true,
          },
        },
      })

      const auditTab = wrapper.find('[data-testid="audit-history-tab"]')
      expect(auditTab.exists()).toBe(true)
      expect(auditTab.classes()).toContain('overflow-y-auto')
      expect(auditTab.classes()).toContain('flex-1')
      expect(auditTab.classes()).toContain('min-h-0')
    })
  })
})

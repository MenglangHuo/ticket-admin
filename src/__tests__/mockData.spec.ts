import { describe, it, expect, beforeEach } from 'vitest'
import mockService from '@/mocks/mockService'
import {
  isMockDataEnabled,
  getEnvMockDataStatus,
  hasMockOverride,
  setMockDataOverride,
  toggleMockDataMode,
} from '@/mocks/config'
import { ticketApi } from '@/api/ticketApi'
import { reportApi } from '@/api/reportApi'
import { telegramApi } from '@/api/telegramApi'

describe('Mock Data Configuration & Service Suite', () => {
  beforeEach(() => {
    // Clear any test overrides and reset mock stores
    setMockDataOverride(null)
    mockService.resetTickets()
    mockService.resetSubscribers()
  })

  describe('Configuration & Override Management', () => {
    it('reads .env default status correctly', () => {
      expect(typeof getEnvMockDataStatus()).toBe('boolean')
    })

    it('respects manual runtime override in localStorage', () => {
      setMockDataOverride(true)
      expect(hasMockOverride()).toBe(true)
      expect(isMockDataEnabled()).toBe(true)

      setMockDataOverride(false)
      expect(hasMockOverride()).toBe(true)
      expect(isMockDataEnabled()).toBe(false)

      setMockDataOverride(null)
      expect(hasMockOverride()).toBe(false)
    })

    it('toggles mode correctly', () => {
      const initial = isMockDataEnabled()
      const toggled = toggleMockDataMode()
      expect(toggled).toBe(!initial)
      expect(isMockDataEnabled()).toBe(!initial)
    })
  })

  describe('Tickets Page Mock Data', () => {
    beforeEach(() => {
      setMockDataOverride(true)
    })

    it('returns faceted mock ticket list with pagination', async () => {
      const res = await ticketApi.getTickets({ page: 1, per_page: 5 })
      expect(res.success).toBe(true)
      const data = res.data as any
      expect(Array.isArray(data.content)).toBe(true)
      expect(data.content.length).toBeLessThanOrEqual(5)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.total).toBeGreaterThan(0)
      expect(data.facets).toBeDefined()
      expect(data.facets.status.open).toBeGreaterThan(0)
    })

    it('filters tickets by status correctly', async () => {
      const res = await ticketApi.getTickets({ status: 'open' })
      const data = (res.data as any).content
      expect(data.every((t: any) => t.status === 'open')).toBe(true)
    })

    it('filters tickets by priority correctly', async () => {
      const res = await ticketApi.getTickets({ priority: 'critical' })
      const data = (res.data as any).content
      expect(data.every((t: any) => t.priority === 'critical')).toBe(true)
    })

    it('filters tickets by search query', async () => {
      const res = await ticketApi.getTickets({ search: 'Payment gateway' })
      const data = (res.data as any).content
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].title).toContain('Payment gateway')
    })

    it('fetches single ticket by id', async () => {
      const res = await ticketApi.getTicketById(1)
      expect(res.success).toBe(true)
      expect(res.data.id).toBe(1)
      expect(res.data.ticket_key).toBe('TCK-1001')
    })

    it('creates, updates, and deletes a mock ticket', async () => {
      // 1. Create
      const created = await ticketApi.createTicket({
        title: 'New Automated Unit Test Bug',
        type: 'bug',
        priority: 'high',
        reporter_name: 'Tester',
      })
      expect(created.success).toBe(true)
      expect(created.data.title).toBe('New Automated Unit Test Bug')
      const newId = created.data.id

      // 2. Update
      const updated = await ticketApi.updateTicket(newId, {
        status: 'in_progress',
        title: 'Updated Test Bug Title',
      })
      expect(updated.data.status).toBe('in_progress')
      expect(updated.data.title).toBe('Updated Test Bug Title')

      // 3. Delete
      const deleted = await ticketApi.deleteTicket(newId)
      expect(deleted.success).toBe(true)
    })

    it('manages ticket comments in mock mode', async () => {
      const newComment = await ticketApi.createTicketComment(1, {
        body: 'Unit test comment note',
        is_internal: true,
      })
      expect(newComment.success).toBe(true)
      expect(newComment.data.body).toBe('Unit test comment note')

      const commentsRes = await ticketApi.getTicketComments(1)
      expect(commentsRes.data.some((c) => c.body === 'Unit test comment note')).toBe(true)
    })

    it('handles client ticket submission in mock mode', async () => {
      const res = await ticketApi.submitClientTicket({
        title: 'Client Public Portal Issue',
        description: 'Unable to reach payment webhook',
        type: 'bug',
        reporter_name: 'External Client',
        reporter_email: 'client@domain.com',
        reporter_user_id: 104,
      })
      expect(res.success).toBe(true)
      expect(res.data.title).toBe('Client Public Portal Issue')
      expect(res.data.ticket_key).toMatch(/^TCK-\d+$/)
      expect(res.data.reporter_user_id).toBe(104)
    })
  })

  describe('Dashboard Page Mock Data', () => {
    beforeEach(() => {
      setMockDataOverride(true)
    })

    it('returns complete dashboard reports with summary metrics and trends', async () => {
      const reports = await reportApi.getReports({ days: 14 })
      expect(reports.success).toBe(true)
      expect(reports.summary.total_tickets).toBeGreaterThan(0)
      expect(reports.summary.resolution_rate).toBeGreaterThan(0)
      expect(reports.by_status.open).toBeDefined()
      expect(reports.by_priority.critical).toBeDefined()
      expect(reports.by_type.bug).toBeDefined()
      expect(reports.top_clients.length).toBeGreaterThan(0)
      expect(reports.trends.length).toBe(14)
    })
  })

  describe('Settings Page Mock Data', () => {
    beforeEach(() => {
      setMockDataOverride(true)
    })

    it('fetches subscribers with search and status filter', async () => {
      const res = await telegramApi.getSubscribers({ page: 1, per_page: 5 })
      expect(res.success).toBe(true)
      expect(res.data.length).toBeLessThanOrEqual(5)
      expect(res.pagination.total).toBeGreaterThan(0)

      const activeOnly = await telegramApi.getSubscribers({ status: 'active' })
      expect(activeOnly.data.every((s) => s.is_active)).toBe(true)
    })

    it('generates mock telegram invite link', async () => {
      const link = await telegramApi.generateInviteLink()
      expect(link).toMatch(/^https:\/\/t\.me\/.+\?start=inv_/)
    })

    it('returns aggregated telegram subscriber and invite counts', async () => {
      const counts = await telegramApi.getCounts()
      expect(counts.totalSubscribers).toBeGreaterThan(0)
      expect(counts.totalTelegramInvites).toBeGreaterThan(0)
    })

    it('deactivates subscriber in mock mode', async () => {
      await telegramApi.removeSubscriber('109283741')
      const res = await telegramApi.getSubscribers()
      const target = res.data.find((s) => s.telegram_chat_id === '109283741')
      expect(target?.is_active).toBe(false)
    })
  })

  describe('API Clients Page Mock Data', () => {
    it('returns structured mock API clients', () => {
      const clients = mockService.getClients()
      expect(clients.length).toBeGreaterThanOrEqual(4)
      const first = clients[0]
      expect(first).toBeDefined()
      expect(first?.client_id).toBeDefined()
      expect(first?.rate_limit).toBeDefined()
      expect(first?.allowed_types.length).toBeGreaterThan(0)
    })
  })

  describe('Auth Mock Operations', () => {
    it('generates mock access token and validates login', () => {
      const token = mockService.generateToken()
      expect(token.success).toBe(true)
      expect(token.access_token).toBeDefined()

      const adminLogin = mockService.login({ username: 'admin' })
      expect(adminLogin.success).toBe(true)
      expect(adminLogin.user.role).toBe('HQ ADMIN')

      const branchLogin = mockService.login({ username: 'branch_manager' })
      expect(branchLogin.success).toBe(true)
      expect(branchLogin.user.role).toBe('BRANCH MANAGER')
    })
  })
})

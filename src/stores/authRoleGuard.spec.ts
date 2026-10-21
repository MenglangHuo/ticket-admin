import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore, isAllowedRole } from './authStore'
import { authApi } from '@/api/ticketApi'

vi.mock('@/api/ticketApi', () => ({
  authApi: {
    generateToken: vi.fn(),
    loginWithToken: vi.fn(),
    validateTwoFactor: vi.fn(),
  },
}))

describe('Auth Role Guard & Dashboard Protection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  describe('normalizeRole and isAllowedRole', () => {
    it('allows HQ_ADMIN in various cases and formats', () => {
      expect(isAllowedRole('HQ ADMIN')).toBe(true)
      expect(isAllowedRole('hq admin')).toBe(true)
      expect(isAllowedRole('HQ_ADMIN')).toBe(true)
      expect(isAllowedRole('hq_admin')).toBe(true)
      expect(isAllowedRole('HQ-ADMIN')).toBe(true)
    })

    it('allows TICKET_ADMIN in various cases and formats', () => {
      expect(isAllowedRole('TICKET ADMIN')).toBe(true)
      expect(isAllowedRole('ticket admin')).toBe(true)
      expect(isAllowedRole('TICKET_ADMIN')).toBe(true)
      expect(isAllowedRole('ticket_admin')).toBe(true)
      expect(isAllowedRole('TICKET-ADMIN')).toBe(true)
    })

    it('rejects BRANCH ADMIN and all unauthorized roles', () => {
      expect(isAllowedRole('BRANCH ADMIN')).toBe(false)
      expect(isAllowedRole('branch admin')).toBe(false)
      expect(isAllowedRole('BRANCH_ADMIN')).toBe(false)
      expect(isAllowedRole('BRANCH MANAGER')).toBe(false)
      expect(isAllowedRole('STAFF')).toBe(false)
      expect(isAllowedRole('VIEWER')).toBe(false)
      expect(isAllowedRole('')).toBe(false)
      expect(isAllowedRole(null)).toBe(false)
      expect(isAllowedRole(undefined)).toBe(false)
    })
  })

  describe('Login Role Rejection', () => {
    it('rejects user with branch_admin role during login and displays notice', async () => {
      vi.mocked(authApi.generateToken).mockResolvedValue({
        success: true,
        access_token: 'temp_app_token',
      })

      vi.mocked(authApi.loginWithToken).mockResolvedValue({
        success: true,
        data: {
          id: 300,
          username: 'branch_user',
          role: 'BRANCH ADMIN',
          first_name: 'Branch',
          last_name: 'Admin',
        },
      } as any)

      const authStore = useAuthStore()
      const result = await authStore.login('branch_user', 'password123')

      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.token).toBeNull()
      expect(localStorage.getItem('bronx_access_token')).toBeNull()
      expect(authStore.error).toContain('Access Denied')
      expect(authStore.error).toContain('BRANCH ADMIN')
      expect(authStore.error).toContain('Only HQ_ADMIN and TICKET_ADMIN')
    })

    it('allows TICKET ADMIN to log in directly without 2FA', async () => {
      vi.mocked(authApi.generateToken).mockResolvedValue({
        success: true,
        access_token: 'temp_app_token',
      })

      vi.mocked(authApi.loginWithToken).mockResolvedValue({
        success: true,
        data: {
          id: 301,
          username: 'ticket_officer',
          role: 'TICKET ADMIN',
          first_name: 'Ticket',
          last_name: 'Admin',
          auth: {
            access_token: 'jwt_ticket_token',
          },
        },
      } as any)

      const authStore = useAuthStore()
      const result = await authStore.login('ticket_officer', 'password123')

      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.isTicketAdmin).toBe(true)
      expect(authStore.hasPendingTwoFactor).toBe(false)
      expect(localStorage.getItem('bronx_access_token')).toBe('jwt_ticket_token')
    })

    it('requires 2FA for HQ ADMIN role', async () => {
      vi.mocked(authApi.generateToken).mockResolvedValue({
        success: true,
        access_token: 'temp_app_token',
      })

      vi.mocked(authApi.loginWithToken).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          username: 'hq_admin',
          role: 'HQ ADMIN',
          first_name: 'HQ',
          last_name: 'Admin',
        },
      } as any)

      const authStore = useAuthStore()
      const result = await authStore.login('hq_admin', 'password123')

      expect(result).toBe(true)
      expect(authStore.hasPendingTwoFactor).toBe(true)
      expect(authStore.pendingTwoFactor?.role).toBe('HQ_ADMIN')
    })
  })

  describe('Session Restoration (initAuth)', () => {
    it('purges existing localStorage if stored user role is branch admin', () => {
      localStorage.setItem('bronx_access_token', 'stale_branch_token')
      localStorage.setItem(
        'bronx_user',
        JSON.stringify({
          id: 300,
          username: 'branch_user',
          role: 'BRANCH ADMIN',
        }),
      )

      const authStore = useAuthStore()
      authStore.initAuth()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.token).toBeNull()
      expect(localStorage.getItem('bronx_access_token')).toBeNull()
      expect(localStorage.getItem('bronx_user')).toBeNull()
    })

    it('restores session when stored user role is TICKET ADMIN', () => {
      localStorage.setItem('bronx_access_token', 'valid_ticket_token')
      localStorage.setItem(
        'bronx_user',
        JSON.stringify({
          id: 301,
          username: 'ticket_admin',
          role: 'TICKET ADMIN',
        }),
      )

      const authStore = useAuthStore()
      authStore.initAuth()

      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.isTicketAdmin).toBe(true)
      expect(authStore.user?.username).toBe('ticket_admin')
    })
  })
})

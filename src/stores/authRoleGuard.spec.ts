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

    it('allows standard administrative variants (ADMIN, SUPER_ADMIN, SUPERADMIN, ADMINISTRATOR)', () => {
      expect(isAllowedRole('ADMIN')).toBe(true)
      expect(isAllowedRole('admin')).toBe(true)
      expect(isAllowedRole('SUPER_ADMIN')).toBe(true)
      expect(isAllowedRole('super admin')).toBe(true)
      expect(isAllowedRole('SUPERADMIN')).toBe(true)
      expect(isAllowedRole('ADMINISTRATOR')).toBe(true)
    })

    it('handles role as an object with name or role_name property', () => {
      expect(isAllowedRole({ name: 'HQ ADMIN' })).toBe(true)
      expect(isAllowedRole({ role_name: 'TICKET ADMIN' })).toBe(true)
      expect(isAllowedRole({ name: 'BRANCH ADMIN' })).toBe(false)
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

    it('handles backend response serialized from PHP Collection with items property', async () => {
      vi.mocked(authApi.generateToken).mockResolvedValue({
        success: true,
        access_token: 'temp_app_token',
      })

      // Simulates Laravel's (array) collect(...) response format
      vi.mocked(authApi.loginWithToken).mockResolvedValue({
        '\u0000*\u0000items': {
          id: 1,
          username: 'hq_col_user',
          role: 'HQ ADMIN',
          first_name: 'HQ',
          last_name: 'User',
          email: 'hq_col@bronx.internal',
        },
        success: true,
        message: 'Two factor auth required',
      } as any)

      const authStore = useAuthStore()
      const result = await authStore.login('hq_col_user', 'password123')

      expect(result).toBe(true)
      expect(authStore.hasPendingTwoFactor).toBe(true)
      expect(authStore.pendingTwoFactor?.username).toBe('hq_col_user')
      expect(authStore.pendingTwoFactor?.role).toBe('HQ_ADMIN')
    })

    it('handles backend response wrapped in Laravel JsonResource (resource: {})', async () => {
      vi.mocked(authApi.generateToken).mockResolvedValue({
        success: true,
        access_token: 'temp_app_token',
      })

      vi.mocked(authApi.loginWithToken).mockResolvedValue({
        resource: {
          id: 302,
          username: 'ticket_resource_user',
          role: 'TICKET ADMIN',
          first_name: 'Ticket',
          last_name: 'Operator',
          auth: { access_token: 'resource_ticket_token' },
        },
        success: true,
      } as any)

      const authStore = useAuthStore()
      const result = await authStore.login('ticket_resource_user', 'password123')

      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.isTicketAdmin).toBe(true)
      expect(authStore.token).toBe('resource_ticket_token')
    })

    it('handles backend response with nested data.user', async () => {
      vi.mocked(authApi.generateToken).mockResolvedValue({
        success: true,
        access_token: 'temp_app_token',
      })

      vi.mocked(authApi.loginWithToken).mockResolvedValue({
        data: {
          user: {
            id: 303,
            username: 'nested_ticket_user',
            role: 'TICKET ADMIN',
          },
          access_token: 'nested_user_token',
        },
        success: true,
      } as any)

      const authStore = useAuthStore()
      const result = await authStore.login('nested_ticket_user', 'password123')

      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.token).toBe('nested_user_token')
    })

    it('handles user with role object and roles array', async () => {
      vi.mocked(authApi.generateToken).mockResolvedValue({
        success: true,
        access_token: 'temp_app_token',
      })

      vi.mocked(authApi.loginWithToken).mockResolvedValue({
        data: {
          id: 304,
          username: 'role_obj_user',
          role: { id: 1, name: 'TICKET ADMIN' },
          auth: { access_token: 'role_obj_token' },
        },
        success: true,
      } as any)

      const authStore = useAuthStore()
      const result = await authStore.login('role_obj_user', 'password123')

      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.token).toBe('role_obj_token')
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

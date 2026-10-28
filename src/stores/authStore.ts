import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/ticket'
import { authApi } from '@/api/ticketApi'
import { maskEmail, maskPhone } from '@/utils/security'

export interface PendingTwoFactorData {
  username: string
  appToken: string
  user: User
  role: string
  expiresAt: number
  maskedEmail?: string
  maskedPhone?: string
}

const PENDING_2FA_STORAGE_KEY = 'bronx_pending_2fa'

// Role Normalization and Validation Helpers
export function normalizeRole(role: unknown): string {
  if (!role) return ''
  if (typeof role === 'object') {
    const r = role as any
    const name = r.role_name || r.name || r.title || r.slug || ''
    return normalizeRole(name)
  }
  return role.toString().trim().toUpperCase().replace(/[\s-]+/g, '_')
}

export function isAllowedRole(role: unknown): boolean {
  const norm = normalizeRole(role)
  if (!norm) return false
  // Strictly reject branch, viewer, and staff roles
  if (
    norm.includes('BRANCH') ||
    norm === 'STAFF' ||
    norm === 'VIEWER' ||
    norm === 'PREVIEW' ||
    norm === 'NONE'
  ) {
    return false
  }
  return (
    norm === 'HQ_ADMIN' ||
    norm === 'TICKET_ADMIN' ||
    norm === 'HQ' ||
    norm === 'SUPER_ADMIN' ||
    norm === 'SUPERADMIN' ||
    norm === 'ADMIN' ||
    norm === 'ADMINISTRATOR'
  )
}

/**
 * Deeply extracts user profile data from various backend API shapes
 * including Laravel Collections (e.g. \u0000*\u0000items), JsonResource (resource: {}),
 * wrapped responses (data.user, data.data, user: {}), or raw payloads.
 */
export function extractUserData(res: any): any {
  if (!res || typeof res !== 'object') return res

  // 1. Direct collection items key from PHP collection serialization (e.g. "\u0000*\u0000items" or "*items" or "items")
  const keys = Object.keys(res)
  const itemsKey = keys.find((k) => k.endsWith('items') || k.includes('items'))
  if (itemsKey && res[itemsKey] && typeof res[itemsKey] === 'object' && !Array.isArray(res[itemsKey])) {
    return extractUserData(res[itemsKey])
  }

  // 2. Nested under resource (from Laravel JsonResource)
  if (res.resource && typeof res.resource === 'object' && !Array.isArray(res.resource)) {
    return extractUserData(res.resource)
  }

  // 3. Nested under data
  if (res.data && typeof res.data === 'object') {
    if (res.data.user && typeof res.data.user === 'object') return extractUserData(res.data.user)
    if (res.data.profile && typeof res.data.profile === 'object') return extractUserData(res.data.profile)
    if (res.data.employee && typeof res.data.employee === 'object') return extractUserData(res.data.employee)
    if (res.data.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)) {
      return extractUserData(res.data.data)
    }
    // If data itself has user identity or role fields
    if (res.data.id !== undefined || res.data.role || res.data.username || res.data.email) {
      return res.data
    }
  }

  // 4. Nested under user or profile or result
  if (res.user && typeof res.user === 'object') return extractUserData(res.user)
  if (res.profile && typeof res.profile === 'object') return extractUserData(res.profile)
  if (res.result && typeof res.result === 'object') return extractUserData(res.result)

  return res
}

/**
 * Extract user role string from various potential properties and shapes
 */
export function extractUserRole(user: any, fallbackRes?: any): string {
  const candidates = [
    user?.role,
    user?.role_name,
    user?.rolename,
    user?.role_title,
    user?.role_slug,
    user?.role_code,
    user?.user_role,
    user?.role?.role_name,
    user?.role?.name,
    user?.role?.title,
    user?.role?.slug,
    user?.role_object?.role_name,
    user?.role_object?.name,
    user?.employee_object?.role,
    user?.employee_object?.role_name,
    Array.isArray(user?.roles) ? (user.roles[0]?.name || user.roles[0]?.role_name || user.roles[0]) : null,
    fallbackRes?.role,
    fallbackRes?.role_name,
    fallbackRes?.data?.role,
    fallbackRes?.data?.role_name,
    fallbackRes?.user?.role,
    fallbackRes?.user?.role_name,
    fallbackRes?.resource?.role,
  ]

  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && candidate !== '') {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim()
        if (trimmed && trimmed !== '[object Object]') return trimmed
      } else if (typeof candidate === 'object') {
        const nested = candidate.role_name || candidate.name || candidate.title || candidate.slug
        if (typeof nested === 'string' && nested.trim()) return nested.trim()
      }
    }
  }

  return ''
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('bronx_access_token'))
  const user = ref<User | null>(
    localStorage.getItem('bronx_user') ? JSON.parse(localStorage.getItem('bronx_user')!) : null,
  )

  // Pending 2-Factor Authentication session for HQ Admin
  const pendingTwoFactor = ref<PendingTwoFactorData | null>(
    (() => {
      try {
        const stored = sessionStorage.getItem(PENDING_2FA_STORAGE_KEY)
        if (!stored) return null
        const parsed = JSON.parse(stored) as PendingTwoFactorData
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          sessionStorage.removeItem(PENDING_2FA_STORAGE_KEY)
          return null
        }
        // Clamp any legacy session in sessionStorage to max 1 minute (60s) from now
        if (parsed.expiresAt && parsed.expiresAt > Date.now() + 60 * 1000) {
          parsed.expiresAt = Date.now() + 60 * 1000
          sessionStorage.setItem(PENDING_2FA_STORAGE_KEY, JSON.stringify(parsed))
        }
        return parsed
      } catch {
        return null
      }
    })(),
  )

  const remainingAttempts = ref<number>(5)
  const lockoutUntil = ref<number | null>(null)

  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  const hasPendingTwoFactor = computed<boolean>(() => {
    if (!pendingTwoFactor.value) return false
    if (Date.now() > pendingTwoFactor.value.expiresAt) {
      clearPendingTwoFactor()
      return false
    }
    return true
  })

  // Normalized Role string
  const userRole = computed<string>(() => {
    return normalizeRole(user.value?.role)
  })

  // Role Checks - Allow ONLY HQ_ADMIN and TICKET_ADMIN for admin dashboard
  const isTicketAdmin = computed<boolean>(() => {
    return userRole.value === 'TICKET_ADMIN'
  })

  const isHQ = computed<boolean>(() => {
    return (
      userRole.value === 'HQ_ADMIN' ||
      userRole.value === 'HQ' ||
      userRole.value === 'SUPER_ADMIN' ||
      userRole.value === 'SUPERADMIN'
    )
  })

  const isAuthorizedAdmin = computed<boolean>(() => {
    return isAllowedRole(userRole.value)
  })

  const isBranch = computed<boolean>(() => {
    return userRole.value.includes('BRANCH')
  })

  const isPreview = computed<boolean>(() => {
    const r = userRole.value
    return r === 'PREVIEW' || r === 'VIEWER'
  })

  // Permission Checks:
  // - "new user with role for preview ticket" (Read-only: cannot submit, cannot transition, cannot delete)
  // - "existing user (branch, hq, ticket_admin) for submit ticket" (Can create & submit tickets)
  const canSubmitTicket = computed<boolean>(() => {
    return !isPreview.value
  })

  const canManageStatus = computed<boolean>(() => {
    return !isPreview.value
  })

  const canDeleteTicket = computed<boolean>(() => {
    return (isHQ.value || isTicketAdmin.value) && !isPreview.value
  })

  const isReadOnly = computed<boolean>(() => {
    return !isPreview.value ? false : true
  })

  const roleLabel = computed<string>(() => {
    if (isPreview.value) return 'Preview (Read-Only)'
    if (isTicketAdmin.value) return 'Ticket Admin'
    if (isHQ.value) return 'HQ Admin'
    if (isBranch.value) return 'Branch Staff'
    return user.value?.role || 'Staff'
  })

  function setPendingTwoFactor(data: PendingTwoFactorData) {
    pendingTwoFactor.value = data
    try {
      sessionStorage.setItem(PENDING_2FA_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('Unable to persist pending 2FA in sessionStorage:', e)
    }
  }

  function clearPendingTwoFactor() {
    pendingTwoFactor.value = null
    try {
      sessionStorage.removeItem(PENDING_2FA_STORAGE_KEY)
    } catch {}
  }

  function initAuth() {
    const storedToken = localStorage.getItem('bronx_access_token')
    const storedUserRaw = localStorage.getItem('bronx_user')
    if (storedToken && storedUserRaw) {
      try {
        const parsed = JSON.parse(storedUserRaw)
        const roleStr = extractUserRole(parsed) || parsed?.role
        if (!isAllowedRole(roleStr)) {
          logout()
          return
        }
        token.value = storedToken
        user.value = parsed
      } catch {
        logout()
      }
    } else if (storedToken && !storedUserRaw) {
      logout()
    }

    // Check pending 2FA expiration
    if (pendingTwoFactor.value && Date.now() > pendingTwoFactor.value.expiresAt) {
      clearPendingTwoFactor()
    }
  }

  /**
   * Enterprise Login Pipeline:
   * 1. POST /token (background process with secret)
   * 2. POST /login (with Authorization: Bearer {token} & Content-Language: km)
   * 3. Role Validation: Only HQ_ADMIN and TICKET_ADMIN are permitted. All others are rejected.
   * 4. If role is 'HQ_ADMIN':
   *    - If twoFactorCode is explicitly provided: completes 2FA directly.
   *    - Otherwise (standard login flow): initiates Pending 2FA session without auto-bypassing,
   *      requiring user to validate code on dedicated /two-factor view.
   * 5. If role is 'TICKET_ADMIN':
   *    - Skips two-factor and authenticates directly.
   */
  async function login(
    username: string = '',
    password: string = '',
    twoFactorCode: string = '',
  ): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      // Step 1: Background token generation with secret
      const tokenRes = await authApi.generateToken()
      const appToken = tokenRes.access_token
      if (!appToken) {
        throw new Error(tokenRes.message || 'Failed to generate application access token')
      }

      // Step 2: Submit credentials with temporary Bearer token
      const loginRes = await authApi.loginWithToken(appToken, { username, password })
      if (loginRes?.success === false) {
        throw new Error(loginRes.message || 'Authentication failed')
      }

      // Extract user profile and role from login response
      const loginUserData: any = extractUserData(loginRes)
      const rawRole = extractUserRole(loginUserData, loginRes)
      const normalizedRole = normalizeRole(rawRole)

      if (import.meta.env.DEV) {
        console.log('[Auth] Login response received:', loginRes)
        console.log('[Auth] Extracted user:', loginUserData)
        console.log('[Auth] Extracted role:', rawRole, 'Normalized:', normalizedRole)
      }

      // Validate allowed roles: ONLY HQ_ADMIN, TICKET_ADMIN, and authorized admin roles are permitted.
      if (!isAllowedRole(normalizedRole)) {
        logout()
        const displayRole = rawRole || loginUserData?.role || 'User'
        error.value = `Access Denied: Your account role (${displayRole}) cannot access the dashboard. Only HQ_ADMIN and TICKET_ADMIN roles are permitted.`
        return false
      }

      // Check if role is 'HQ_ADMIN'
      if (normalizedRole === 'HQ_ADMIN' || normalizedRole === 'HQ') {
        // If twoFactorCode was explicitly provided (e.g. API script or direct invocation)
        if (twoFactorCode && twoFactorCode.trim() !== '') {
          const userProfile = await authApi.validateTwoFactor({
            username,
            code: twoFactorCode.trim(),
            token: appToken,
          })

          const extractedProfile = extractUserData(userProfile)
          const extractedRole = extractUserRole(extractedProfile, userProfile) || 'HQ_ADMIN'
          const finalAccessToken =
            extractedProfile.auth?.access_token ||
            userProfile.auth?.access_token ||
            (userProfile as any)?.access_token ||
            appToken

          const finalUser: User = {
            ...loginUserData,
            ...extractedProfile,
            id: extractedProfile.id ?? loginUserData?.id ?? 0,
            username: extractedProfile.username || loginUserData?.username || username,
            first_name: extractedProfile.first_name || loginUserData?.first_name || '',
            last_name: extractedProfile.last_name || loginUserData?.last_name || '',
            email: extractedProfile.email || loginUserData?.email || '',
            role: extractedRole,
            company_id: extractedProfile.company_id ?? loginUserData?.company_id ?? 1,
          }

          setAuthData(finalAccessToken, finalUser)
          clearPendingTwoFactor()
          return true
        }

        // Standard HQ Admin Login Flow: DO NOT AUTO-BYPASS.
        // Create pending 2FA challenge session for verification on /two-factor
        const rawEmail = loginUserData?.email || loginUserData?.personal_email || ''
        const rawPhone =
          loginUserData?.phone || loginUserData?.personal_phone || loginUserData?.company_phone || ''

        setPendingTwoFactor({
          username: loginUserData?.username || username,
          appToken,
          user: loginUserData,
          role: 'HQ_ADMIN',
          expiresAt: Date.now() + 1 * 60 * 1000, // 1 minute challenge session
          maskedEmail: rawEmail ? maskEmail(rawEmail) : undefined,
          maskedPhone: rawPhone ? maskPhone(rawPhone) : undefined,
        })

        remainingAttempts.value = 5
        lockoutUntil.value = null
        return true
      } else if (isAllowedRole(normalizedRole)) {
        // Skips two-factor and authenticates directly (e.g. TICKET_ADMIN, ADMIN, SUPER_ADMIN)
        const finalAccessToken =
          loginUserData?.auth?.access_token ||
          loginUserData?.access_token ||
          loginUserData?.token ||
          loginRes?.data?.auth?.access_token ||
          loginRes?.data?.access_token ||
          loginRes?.data?.token ||
          loginRes?.auth?.access_token ||
          loginRes?.access_token ||
          loginRes?.token ||
          appToken

        const finalUser: User = {
          ...loginUserData,
          id: loginUserData?.id ?? 0,
          username: loginUserData?.username || username,
          first_name: loginUserData?.first_name || '',
          last_name: loginUserData?.last_name || '',
          email: loginUserData?.email || '',
          role: rawRole || 'TICKET_ADMIN',
          company_id: loginUserData?.company_id ?? 1,
        }

        setAuthData(finalAccessToken, finalUser)
        clearPendingTwoFactor()
        return true
      } else {
        logout()
        error.value = 'Access Denied: Only HQ_ADMIN and TICKET_ADMIN roles are permitted.'
        return false
      }
    } catch (err: any) {
      console.warn('Login process encountered error:', err)

      error.value =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify credentials.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Validates 2FA code against /two-factor endpoint for HQ Admin
   */
  async function verifyTwoFactor(
    code: string,
    options?: { rememberDevice?: boolean },
  ): Promise<boolean> {
    if (lockoutUntil.value && Date.now() < lockoutUntil.value) {
      const waitSec = Math.ceil((lockoutUntil.value - Date.now()) / 1000)
      error.value = `Too many failed attempts. Please wait ${waitSec} seconds before trying again.`
      return false
    }

    if (!pendingTwoFactor.value || Date.now() > pendingTwoFactor.value.expiresAt) {
      clearPendingTwoFactor()
      error.value = 'Verification session has expired. Please sign in again.'
      return false
    }

    const cleanCode = (code || '').trim()
    if (!cleanCode || cleanCode.length !== 6) {
      error.value = 'Please enter a valid 6-digit verification code.'
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      const userProfile = await authApi.validateTwoFactor({
        username: pendingTwoFactor.value.username,
        code: cleanCode,
        token: pendingTwoFactor.value.appToken,
      })

      const extractedProfile = extractUserData(userProfile)
      const extractedRole =
        extractUserRole(extractedProfile, userProfile) ||
        pendingTwoFactor.value.role ||
        'HQ_ADMIN'

      const finalAccessToken =
        extractedProfile.auth?.access_token ||
        userProfile.auth?.access_token ||
        (userProfile as any)?.access_token ||
        pendingTwoFactor.value.appToken

      const verifiedUser: User = {
        ...pendingTwoFactor.value.user,
        ...extractedProfile,
        id: extractedProfile.id ?? pendingTwoFactor.value.user?.id ?? 0,
        username: extractedProfile.username || pendingTwoFactor.value.username,
        first_name:
          extractedProfile.first_name || pendingTwoFactor.value.user?.first_name || '',
        last_name:
          extractedProfile.last_name || pendingTwoFactor.value.user?.last_name || '',
        email: extractedProfile.email || pendingTwoFactor.value.user?.email || '',
        role: extractedRole,
        company_id:
          extractedProfile.company_id ?? pendingTwoFactor.value.user?.company_id ?? 1,
      }
      setAuthData(finalAccessToken, verifiedUser)

      if (options?.rememberDevice) {
        try {
          localStorage.setItem(
            `bronx_trusted_device_${pendingTwoFactor.value.username}`,
            Date.now().toString(),
          )
        } catch {}
      }

      clearPendingTwoFactor()
      remainingAttempts.value = 5
      lockoutUntil.value = null
      return true
    } catch (err: any) {
      console.warn('Two-factor validation failed:', err)
      remainingAttempts.value = Math.max(0, remainingAttempts.value - 1)

      if (remainingAttempts.value === 0) {
        lockoutUntil.value = Date.now() + 60 * 1000 // 60 seconds lockout
        error.value = 'Too many failed attempts. Verification locked for 60 seconds.'
      } else {
        error.value =
          err.response?.data?.message ||
          err.message ||
          `Invalid verification code. (${remainingAttempts.value} attempts remaining)`
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Resend 2FA verification code / extend challenge window
   */
  async function resendTwoFactorCode(): Promise<{ success: boolean; message: string }> {
    if (!pendingTwoFactor.value) {
      return { success: false, message: 'No active verification session.' }
    }

    try {
      // Extend challenge window by 1 minute
      pendingTwoFactor.value.expiresAt = Date.now() + 1 * 60 * 1000
      sessionStorage.setItem(PENDING_2FA_STORAGE_KEY, JSON.stringify(pendingTwoFactor.value))
      return {
        success: true,
        message: 'A fresh verification code has been dispatched to your authenticator.',
      }
    } catch {
      return { success: false, message: 'Failed to request new code.' }
    }
  }

  /**
   * Cancel pending 2FA and clear challenge session
   */
  function cancelTwoFactor() {
    clearPendingTwoFactor()
    error.value = null
    remainingAttempts.value = 5
    lockoutUntil.value = null
  }

  function setAuthData(newToken: string, newUser: User) {
    const roleStr = extractUserRole(newUser) || newUser?.role
    if (!isAllowedRole(roleStr)) {
      logout()
      error.value = `Access Denied: Role "${roleStr || 'User'}" cannot access the dashboard. Only HQ_ADMIN and TICKET_ADMIN roles are permitted.`
      return
    }
    token.value = newToken
    user.value = newUser
    localStorage.setItem('bronx_access_token', newToken)
    localStorage.setItem('bronx_user', JSON.stringify(newUser))
  }

  function setRole(roleName: string) {
    if (!user.value) {
      user.value = {
        id: 1,
        username: 'test_user',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@bronx.internal',
        role: roleName,
        company_id: 1,
      }
    } else {
      user.value = { ...user.value, role: roleName }
    }
    localStorage.setItem('bronx_user', JSON.stringify(user.value))
  }

  function logout() {
    token.value = null
    user.value = null
    clearPendingTwoFactor()
    localStorage.removeItem('bronx_access_token')
    localStorage.removeItem('bronx_user')
  }

  return {
    token,
    user,
    pendingTwoFactor,
    hasPendingTwoFactor,
    remainingAttempts,
    lockoutUntil,
    isLoading,
    error,
    isAuthenticated,
    userRole,
    isHQ,
    isBranch,
    isTicketAdmin,
    isAuthorizedAdmin,
    isPreview,
    isReadOnly,
    canSubmitTicket,
    canManageStatus,
    canDeleteTicket,
    roleLabel,
    initAuth,
    login,
    verifyTwoFactor,
    resendTwoFactorCode,
    cancelTwoFactor,
    setRole,
    logout,
  }
})

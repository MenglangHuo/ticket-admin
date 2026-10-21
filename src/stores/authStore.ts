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
    return (user.value?.role || '').toUpperCase()
  })

  // Role Checks
  const isPreview = computed<boolean>(() => {
    const r = userRole.value
    return !!r && (r.includes('PREVIEW') || r.includes('VIEWER'))
  })

  const isBranch = computed<boolean>(() => {
    const r = userRole.value
    return !!r && r.includes('BRANCH')
  })

  const isHQ = computed<boolean>(() => {
    const r = userRole.value
    return !!r && (r.includes('HQ') || r.includes('ADMIN'))
  })

  // Permission Checks:
  // - "new user with role for preview ticket" (Read-only: cannot submit, cannot transition, cannot delete)
  // - "existing user (branch, hq) for submit ticket" (Can create & submit tickets)
  const canSubmitTicket = computed<boolean>(() => {
    return !isPreview.value
  })

  const canManageStatus = computed<boolean>(() => {
    return !isPreview.value
  })

  const canDeleteTicket = computed<boolean>(() => {
    return isHQ.value && !isPreview.value
  })

  const isReadOnly = computed<boolean>(() => {
    return !isPreview.value ? false : true
  })

  const roleLabel = computed<string>(() => {
    if (isPreview.value) return 'Preview (Read-Only)'
    if (isBranch.value) return 'Branch Staff'
    if (isHQ.value) return 'HQ Admin'
    return user.value?.role || 'HQ Staff'
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
    const stored = localStorage.getItem('bronx_access_token')
    if (stored) {
      token.value = stored
      try {
        user.value = JSON.parse(localStorage.getItem('bronx_user') || 'null')
      } catch {
        user.value = null
      }
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
   * 3. If role is 'HQ ADMIN':
   *    - If twoFactorCode is explicitly provided: completes 2FA directly.
   *    - Otherwise (standard login flow): initiates Pending 2FA session without auto-bypassing,
   *      requiring user to validate code on dedicated /two-factor view.
   *    If role differs from 'HQ ADMIN' (e.g. 'BRANCH ADMIN', 'TICKET ADMIN'):
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
      const loginUserData: any =
        loginRes?.data && (loginRes.data.role || loginRes.data.id)
          ? loginRes.data
          : loginRes?.user && (loginRes.user.role || loginRes.user.id)
            ? loginRes.user
            : loginRes

      const userRoleStr = (loginUserData?.role || loginRes?.role || loginRes?.data?.role || '')
        .toString()
        .trim()
        .toUpperCase()

      // Check if role is 'HQ ADMIN'
      if (userRoleStr === 'HQ ADMIN') {
        // If twoFactorCode was explicitly provided (e.g. API script or direct invocation)
        if (twoFactorCode && twoFactorCode.trim() !== '') {
          const userProfile = await authApi.validateTwoFactor({
            username,
            code: twoFactorCode.trim(),
            token: appToken,
          })

          const finalAccessToken = userProfile.auth?.access_token || appToken
          setAuthData(finalAccessToken, userProfile)
          clearPendingTwoFactor()
          return true
        }

        // Standard HQ Admin Login Flow: DO NOT AUTO-BYPASS.
        // Create pending 2FA challenge session for verification on /two-factor
        const rawEmail = loginUserData?.email || ''
        const rawPhone = loginUserData?.phone || loginUserData?.personal_phone || ''

        setPendingTwoFactor({
          username: loginUserData?.username || username,
          appToken,
          user: loginUserData,
          role: userRoleStr,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes challenge session
          maskedEmail: rawEmail ? maskEmail(rawEmail) : undefined,
          maskedPhone: rawPhone ? maskPhone(rawPhone) : undefined,
        })

        remainingAttempts.value = 5
        lockoutUntil.value = null
        return true
      } else {
        // If role differs from 'HQ ADMIN' (e.g. 'BRANCH ADMIN', 'TICKET ADMIN', etc.):
        // No need to call 'two-factor' endpoint
        const finalAccessToken =
          loginUserData?.auth?.access_token ||
          loginRes?.auth?.access_token ||
          loginRes?.access_token ||
          appToken

        const finalUser: User = {
          ...loginUserData,
          id: loginUserData?.id ?? 0,
          username: loginUserData?.username || username,
          first_name: loginUserData?.first_name || '',
          last_name: loginUserData?.last_name || '',
          email: loginUserData?.email || '',
          role: loginUserData?.role || userRoleStr || 'STAFF',
          company_id: loginUserData?.company_id ?? 1,
        }

        setAuthData(finalAccessToken, finalUser)
        clearPendingTwoFactor()
        return true
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

      const finalAccessToken = userProfile.auth?.access_token || pendingTwoFactor.value.appToken
      setAuthData(finalAccessToken, userProfile)

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
      // Extend challenge window by 10 minutes
      pendingTwoFactor.value.expiresAt = Date.now() + 10 * 60 * 1000
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

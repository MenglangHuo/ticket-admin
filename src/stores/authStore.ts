import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types/ticket';
import { authApi } from '@/api/ticketApi';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('bronx_access_token'));
  const user = ref<User | null>(
    localStorage.getItem('bronx_user')
      ? JSON.parse(localStorage.getItem('bronx_user')!)
      : null
  );
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  // Normalized Role string
  const userRole = computed<string>(() => {
    return (user.value?.role || '').toUpperCase();
  });

  // Role Checks
  const isPreview = computed<boolean>(() => {
    const r = userRole.value;
    return !!r && (r.includes('PREVIEW') || r.includes('VIEWER'));
  });

  const isBranch = computed<boolean>(() => {
    const r = userRole.value;
    return !!r && r.includes('BRANCH');
  });

  const isHQ = computed<boolean>(() => {
    const r = userRole.value;
    return !!r && (r.includes('HQ') || r.includes('ADMIN'));
  });

  // Permission Checks:
  // - "new user with role for preview ticket" (Read-only: cannot submit, cannot transition, cannot delete)
  // - "existing user (branch, hq) for submit ticket" (Can create & submit tickets)
  const canSubmitTicket = computed<boolean>(() => {
    return !isPreview.value;
  });

  const canManageStatus = computed<boolean>(() => {
    return !isPreview.value;
  });

  const canDeleteTicket = computed<boolean>(() => {
    return isHQ.value && !isPreview.value;
  });

  const isReadOnly = computed<boolean>(() => {
    return isPreview.value;
  });

  const roleLabel = computed<string>(() => {
    if (isPreview.value) return 'Preview (Read-Only)';
    if (isBranch.value) return 'Branch Staff';
    if (isHQ.value) return 'HQ Admin';
    return user.value?.role || 'HQ Staff';
  });

  function initAuth() {
    const stored = localStorage.getItem('bronx_access_token');
    if (stored) {
      token.value = stored;
      try {
        user.value = JSON.parse(localStorage.getItem('bronx_user') || 'null');
      } catch {
        user.value = null;
      }
    }
  }

  /**
   * Enhanced Login Pipeline:
   * 1. POST /token (background process with secret)
   * 2. POST /login (with Authorization: Bearer {token} & Content-Language: km)
   * 3. If role is 'HQ ADMIN': process POST /two-factor (validates code, retrieves full profile & user auth token)
   *    If role differs from 'HQ ADMIN' (e.g. 'BRANCH ADMIN', 'TICKET ADMIN'): skip two-factor and authenticate directly
   */
  async function login(
    username: string = '',
    password: string = '',
    twoFactorCode: string = ''
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      // Step 1: Background token generation with secret
      const tokenRes = await authApi.generateToken();
      const appToken = tokenRes.access_token;
      if (!appToken) {
        throw new Error(tokenRes.message || 'Failed to generate application access token');
      }

      // Step 2: Submit credentials with temporary Bearer token
      const loginRes = await authApi.loginWithToken(appToken, { username, password });
      if (loginRes?.success === false) {
        throw new Error(loginRes.message || 'Authentication failed');
      }

      // Extract user profile and role from login response
      const loginUserData: any = (loginRes?.data && (loginRes.data.role || loginRes.data.id))
        ? loginRes.data
        : (loginRes?.user && (loginRes.user.role || loginRes.user.id))
          ? loginRes.user
          : loginRes;

      const userRoleStr = (
        loginUserData?.role ||
        loginRes?.role ||
        loginRes?.data?.role ||
        ''
      ).toString().trim().toUpperCase();

      // Check if role is 'HQ ADMIN'
      if (userRoleStr === 'HQ ADMIN') {
        // Step 3: Process call to endpoint 'two-factor' (current flow for HQ ADMIN)
        const userProfile = await authApi.validateTwoFactor({
          username,
          code: twoFactorCode || '000000',
          token: appToken,
        });

        const finalAccessToken = userProfile.auth?.access_token || appToken;
        setAuthData(finalAccessToken, userProfile);
        return true;
      } else {
        // If role differs from 'HQ ADMIN' (e.g. 'BRANCH ADMIN', 'TICKET ADMIN', etc.):
        // No need to call 'two-factor' endpoint
        const finalAccessToken =
          loginUserData?.auth?.access_token ||
          loginRes?.auth?.access_token ||
          loginRes?.access_token ||
          appToken;

        const finalUser: User = {
          ...loginUserData,
          id: loginUserData?.id ?? 0,
          username: loginUserData?.username || username,
          first_name: loginUserData?.first_name || '',
          last_name: loginUserData?.last_name || '',
          email: loginUserData?.email || '',
          role: loginUserData?.role || userRoleStr || 'STAFF',
          company_id: loginUserData?.company_id ?? 1,
        };

        setAuthData(finalAccessToken, finalUser);
        return true;
      }
    } catch (err: any) {
      console.warn('Login process encountered error:', err);

      error.value =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify credentials.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function setAuthData(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('bronx_access_token', newToken);
    localStorage.setItem('bronx_user', JSON.stringify(newUser));
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
      };
    } else {
      user.value = { ...user.value, role: roleName };
    }
    localStorage.setItem('bronx_user', JSON.stringify(user.value));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('bronx_access_token');
    localStorage.removeItem('bronx_user');
  }

  return {
    token,
    user,
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
    setRole,
    logout,
  };
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/ticketApi';

describe('useAuthStore Login Pipeline', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls two-factor endpoint when role is HQ ADMIN', async () => {
    const authStore = useAuthStore();

    vi.spyOn(authApi, 'generateToken').mockResolvedValue({
      access_token: 'temp_app_token_123',
      success: true,
    });

    vi.spyOn(authApi, 'loginWithToken').mockResolvedValue({
      id: 1,
      username: 'hq_admin',
      role: 'HQ ADMIN',
      required_two_factors: 1,
      success: true,
    });

    const twoFactorSpy = vi.spyOn(authApi, 'validateTwoFactor').mockResolvedValue({
      id: 1,
      username: 'hq_admin',
      first_name: 'HQ',
      last_name: 'Administrator',
      email: 'hq@bronx.internal',
      role: 'HQ ADMIN',
      company_id: 1,
      auth: {
        token_type: 'Bearer',
        access_token: 'final_passport_hq_token',
      },
    });

    const result = await authStore.login('hq_admin', 'secret123', '000000');

    expect(result).toBe(true);
    expect(twoFactorSpy).toHaveBeenCalledTimes(1);
    expect(twoFactorSpy).toHaveBeenCalledWith({
      username: 'hq_admin',
      code: '000000',
      token: 'temp_app_token_123',
    });
    expect(authStore.token).toBe('final_passport_hq_token');
    expect(authStore.user?.role).toBe('HQ ADMIN');
    expect(localStorage.getItem('bronx_access_token')).toBe('final_passport_hq_token');
  });

  it('does NOT call two-factor endpoint when role is BRANCH ADMIN', async () => {
    const authStore = useAuthStore();

    vi.spyOn(authApi, 'generateToken').mockResolvedValue({
      access_token: 'temp_app_token_123',
      success: true,
    });

    vi.spyOn(authApi, 'loginWithToken').mockResolvedValue({
      id: 2,
      username: 'branch_user',
      first_name: 'Branch',
      last_name: 'Staff',
      email: 'branch@bronx.internal',
      role: 'BRANCH ADMIN',
      company_id: 1,
      required_two_factors: 0,
      auth: {
        token_type: 'Bearer',
        access_token: 'branch_passport_token_456',
      },
      success: true,
    });

    const twoFactorSpy = vi.spyOn(authApi, 'validateTwoFactor');

    const result = await authStore.login('branch_user', 'secret123');

    expect(result).toBe(true);
    expect(twoFactorSpy).not.toHaveBeenCalled();
    expect(authStore.token).toBe('branch_passport_token_456');
    expect(authStore.user?.role).toBe('BRANCH ADMIN');
    expect(authStore.isBranch).toBe(true);
    expect(localStorage.getItem('bronx_access_token')).toBe('branch_passport_token_456');
  });

  it('does NOT call two-factor endpoint when role is TICKET ADMIN', async () => {
    const authStore = useAuthStore();

    vi.spyOn(authApi, 'generateToken').mockResolvedValue({
      access_token: 'temp_app_token_123',
      success: true,
    });

    vi.spyOn(authApi, 'loginWithToken').mockResolvedValue({
      id: 3,
      username: 'ticket_admin',
      first_name: 'Ticket',
      last_name: 'Officer',
      email: 'ticket@bronx.internal',
      role: 'TICKET ADMIN',
      company_id: 1,
      required_two_factors: 0,
      auth: {
        token_type: 'Bearer',
        access_token: 'ticket_admin_token_789',
      },
      success: true,
    });

    const twoFactorSpy = vi.spyOn(authApi, 'validateTwoFactor');

    const result = await authStore.login('ticket_admin', 'secret123');

    expect(result).toBe(true);
    expect(twoFactorSpy).not.toHaveBeenCalled();
    expect(authStore.token).toBe('ticket_admin_token_789');
    expect(authStore.user?.role).toBe('TICKET ADMIN');
    expect(localStorage.getItem('bronx_access_token')).toBe('ticket_admin_token_789');
  });

  it('normalizes role casing (e.g. hq admin lowercase) and calls two-factor', async () => {
    const authStore = useAuthStore();

    vi.spyOn(authApi, 'generateToken').mockResolvedValue({
      access_token: 'temp_app_token_123',
      success: true,
    });

    vi.spyOn(authApi, 'loginWithToken').mockResolvedValue({
      id: 4,
      username: 'hq_lowercase',
      role: 'hq admin',
      success: true,
    });

    const twoFactorSpy = vi.spyOn(authApi, 'validateTwoFactor').mockResolvedValue({
      id: 4,
      username: 'hq_lowercase',
      first_name: 'HQ',
      last_name: 'Admin',
      email: 'hq_lower@bronx.internal',
      role: 'HQ ADMIN',
      company_id: 1,
      auth: {
        token_type: 'Bearer',
        access_token: 'hq_lower_token',
      },
    });

    const result = await authStore.login('hq_lowercase', 'secret');

    expect(result).toBe(true);
    expect(twoFactorSpy).toHaveBeenCalledTimes(1);
    expect(authStore.token).toBe('hq_lower_token');
  });

  it('correctly handles response data wrapped in .data object', async () => {
    const authStore = useAuthStore();

    vi.spyOn(authApi, 'generateToken').mockResolvedValue({
      access_token: 'temp_app_token_123',
      success: true,
    });

    vi.spyOn(authApi, 'loginWithToken').mockResolvedValue({
      data: {
        id: 5,
        username: 'custom_operator',
        first_name: 'Custom',
        last_name: 'Op',
        role: 'BRANCH ADMIN',
        company_id: 1,
        auth: {
          token_type: 'Bearer',
          access_token: 'wrapped_branch_token',
        },
      },
      success: true,
    });

    const twoFactorSpy = vi.spyOn(authApi, 'validateTwoFactor');

    const result = await authStore.login('custom_operator', 'secret');

    expect(result).toBe(true);
    expect(twoFactorSpy).not.toHaveBeenCalled();
    expect(authStore.token).toBe('wrapped_branch_token');
    expect(authStore.user?.role).toBe('BRANCH ADMIN');
  });

  it('sets error and returns false if login fails', async () => {
    const authStore = useAuthStore();

    vi.spyOn(authApi, 'generateToken').mockResolvedValue({
      access_token: 'temp_app_token_123',
      success: true,
    });

    vi.spyOn(authApi, 'loginWithToken').mockRejectedValue({
      response: {
        data: {
          message: 'Invalid username or password',
        },
      },
    });

    const result = await authStore.login('bad_user', 'wrong_pass');

    expect(result).toBe(false);
    expect(authStore.error).toBe('Invalid username or password');
    expect(authStore.token).toBeNull();
  });
});

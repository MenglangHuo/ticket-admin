import type { User, TokenResponse, TwoFactorResponse } from '@/types/ticket';

export const MOCK_ADMIN_USER: User = {
  id: 1,
  username: 'admin',
  first_name: 'Menglang',
  last_name: 'Huo',
  email: 'menglang@bronx.internal',
  phone: '010 334 556',
  personal_phone: '010 334 556',
  role: 'HQ ADMIN',
  company_id: 1,
  first_name_kh: 'ម៉េងឡាង',
  last_name_kh: 'ហួ',
  department_name: 'Core Technology & Infrastructure',
  division_name: 'Software Engineering',
  auth: {
    token_type: 'Bearer',
    access_token: 'mock_jwt_access_token_bronx_admin',
    expires_in: 86400,
  },
  permission: {
    is_expert: true,
    accept_card: true,
  },
};

export const MOCK_BRANCH_USER: User = {
  id: 2,
  username: 'branch_manager',
  first_name: 'Dara',
  last_name: 'Chan',
  email: 'dara.chan@uyfc.internal',
  phone: '012 889 901',
  role: 'BRANCH MANAGER',
  company_id: 1,
  department_name: 'Central Branch Operations',
  division_name: 'Branch Management',
  auth: {
    token_type: 'Bearer',
    access_token: 'mock_jwt_access_token_bronx_branch',
    expires_in: 86400,
  },
};

export function mockGenerateToken(): TokenResponse {
  return {
    success: true,
    access_token: 'mock_app_token_secret_initial_key',
    message: 'Application token generated (Mock Mode)',
  };
}

export function mockLogin(credentials: { username: string; password?: string }): {
  success: boolean;
  access_token: string;
  user: User;
  message: string;
} {
  const isBranch = credentials.username.toLowerCase().includes('branch');
  const user = isBranch ? MOCK_BRANCH_USER : MOCK_ADMIN_USER;

  return {
    success: true,
    access_token: user.auth?.access_token || 'mock_jwt_token',
    user: JSON.parse(JSON.stringify(user)),
    message: 'Authentication successful (Mock Mode)',
  };
}

export function mockValidateTwoFactor(params: { username: string; code?: string }): TwoFactorResponse {
  const user = JSON.parse(JSON.stringify(MOCK_ADMIN_USER)) as TwoFactorResponse;
  user.username = params.username || user.username;
  return user;
}

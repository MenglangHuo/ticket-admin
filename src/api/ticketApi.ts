import apiClient, { ROOT_API_URL } from './client';
import type {
  TicketListResponse,
  TicketSingleResponse,
  TicketStatus,
  TicketPriority,
  LoginResponse,
  TokenResponse,
  TwoFactorResponse,
  Attachment,
  TicketComment,
  CreateCommentPayload,
  UpdateCommentPayload
} from '@/types/ticket';

export interface TicketFilterParams {
  page?: number;
  per_page?: number;
  status?: string;
  priority?: string;
  type?: string;
  source?: string;
  search?: string;
  assignee_id?: number | string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export const authApi = {
  // Step 1: Generate access token using secret before submitting to login API
  async generateToken(secret?: string): Promise<TokenResponse> {
    const apiSecret = secret || (import.meta.env.VITE_API_SECRET as string) || '';
    if (!apiSecret && import.meta.env.DEV) {
      console.warn('Security Notice: VITE_API_SECRET is not set in environment.');
    }
    const formData = new FormData();
    formData.append('secret', apiSecret);

    const response = await apiClient.post<TokenResponse>('/token', formData, {
      baseURL: ROOT_API_URL,
    });
    return response.data;
  },

  // Step 2: Submit login credentials with Bearer token from Step 1
  async loginWithToken(token: string, credentials: { username: string; password: string }): Promise<any> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await apiClient.post('/login', formData, {
      baseURL: ROOT_API_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Language': 'km',
      },
    });
    return response.data;
  },

  // Step 3: Validate two-factor & retrieve user info + passport auth access_token
  async validateTwoFactor(params: { username: string; code?: string; token?: string }): Promise<TwoFactorResponse> {
    const urlParams = new URLSearchParams();
    urlParams.append('username', params.username);
    urlParams.append('code', params.code || '000000');

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Language': 'km',
    };
    if (params.token) {
      headers['Authorization'] = `Bearer ${params.token}`;
    }

    const response = await apiClient.post<TwoFactorResponse>('/two-factor', urlParams.toString(), {
      baseURL: ROOT_API_URL,
      headers,
    });
    return response.data;
  },

  // Fallback single-step login
  async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/login', credentials, {
      baseURL: ROOT_API_URL,
    });
    return response.data;
  },
};

export const ticketApi = {
  async getTickets(params: TicketFilterParams = {}): Promise<TicketListResponse> {
    const cleanParams: Record<string, any> = {};
    if (params.page) cleanParams.page = params.page;
    if (params.per_page) cleanParams.per_page = params.per_page;
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.priority && params.priority !== 'all') cleanParams.priority = params.priority;
    if (params.type && params.type !== 'all') cleanParams.type = params.type;
    if (params.source && params.source !== 'all') cleanParams.source = params.source;
    if (params.search) cleanParams.search = params.search;
    if (params.assignee_id) cleanParams.assignee_id = params.assignee_id;
    if (params.sort_by) cleanParams.sort_by = params.sort_by;
    if (params.sort_dir) cleanParams.sort_dir = params.sort_dir;

    const response = await apiClient.get<TicketListResponse>('/tickets', { params: cleanParams });
    return response.data;
  },

  async getTicketById(id: number | string): Promise<TicketSingleResponse> {
    const response = await apiClient.get<TicketSingleResponse>(`/tickets/${id}`);
    return response.data;
  },

  async createTicket(payload: {
    title: string;
    description?: string;
    type: string;
    priority: string;
    source?: string;
    reporter_name?: string;
    reporter_email?: string;
    reporter_phone?: string;
    due_at?: string;
    metadata?: Record<string, any>;
  }): Promise<TicketSingleResponse> {
    const response = await apiClient.post<TicketSingleResponse>('/tickets', payload);
    return response.data;
  },

  async updateTicket(
    id: number | string,
    data: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignee_id?: number;
      title?: string;
      description?: string;
    }
  ): Promise<TicketSingleResponse> {
    const response = await apiClient.put<TicketSingleResponse>(`/tickets/${id}`, data);
    return response.data;
  },

  async deleteTicket(id: number | string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/tickets/${id}`);
    return response.data;
  },

  async uploadAttachments(ticketId: number | string, files: File[]): Promise<{ data: Attachment[]; success: boolean }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files[]', file);
    });

    const response = await apiClient.post<{ data: Attachment[]; success: boolean }>(
      `/tickets/${ticketId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async deleteAttachment(ticketId: number | string, attachmentId: number | string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/tickets/${ticketId}/attachments/${attachmentId}`
    );
    return response.data;
  },

  async getTicketComments(
    ticketId: number | string,
    params: { include_internal?: boolean; per_page?: number } = {}
  ): Promise<{ data: TicketComment[]; success: boolean; message?: string }> {
    const response = await apiClient.get<{ data: TicketComment[]; success: boolean; message?: string }>(
      `/tickets/${ticketId}/comments`,
      { params }
    );
    return response.data;
  },

  async createTicketComment(
    ticketId: number | string,
    payload: CreateCommentPayload
  ): Promise<{ data: TicketComment; success: boolean; message?: string }> {
    if (payload.files && payload.files.length > 0) {
      const formData = new FormData();
      formData.append('body', payload.body);
      if (typeof payload.is_internal === 'boolean') {
        formData.append('is_internal', payload.is_internal ? '1' : '0');
      }
      if (payload.metadata) {
        formData.append('metadata', JSON.stringify(payload.metadata));
      }
      payload.files.forEach((file) => {
        formData.append('files[]', file);
      });
      const response = await apiClient.post<{ data: TicketComment; success: boolean; message?: string }>(
        `/tickets/${ticketId}/comments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    }

    const response = await apiClient.post<{ data: TicketComment; success: boolean; message?: string }>(
      `/tickets/${ticketId}/comments`,
      {
        body: payload.body,
        is_internal: payload.is_internal,
        metadata: payload.metadata,
      }
    );
    return response.data;
  },

  async updateTicketComment(
    ticketId: number | string,
    commentId: number | string,
    payload: UpdateCommentPayload
  ): Promise<{ data: TicketComment; success: boolean; message?: string }> {
    const response = await apiClient.put<{ data: TicketComment; success: boolean; message?: string }>(
      `/tickets/${ticketId}/comments/${commentId}`,
      payload
    );
    return response.data;
  },

  async deleteTicketComment(
    ticketId: number | string,
    commentId: number | string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/tickets/${ticketId}/comments/${commentId}`
    );
    return response.data;
  },

  async submitClientTicket(
    payload: FormData | Record<string, any>,
    clientId = (import.meta.env.VITE_CLIENT_ID as string) || '',
    clientSecret = (import.meta.env.VITE_CLIENT_SECRET as string) || ''
  ): Promise<TicketSingleResponse> {
    const isFormData = payload instanceof FormData;
    const headers: Record<string, string> = {};
    if (clientId) headers['X-Client-ID'] = clientId;
    if (clientSecret) headers['X-Client-Secret'] = clientSecret;
    if (isFormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }
    const response = await apiClient.post<TicketSingleResponse>('/client/tickets', payload, {
      headers,
    });
    return response.data;
  },
};

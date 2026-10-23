import apiClient, { ROOT_API_URL } from './client'
import mockService from '@/mocks/mockService'
import type {
  TicketListResponse,
  TicketSingleResponse,
  LoginResponse,
  TokenResponse,
  TwoFactorResponse,
  Attachment,
  TicketComment,
  CreateCommentPayload,
  UpdateCommentPayload,
  TicketAuditsResponse,
  UpdateTicketPayload,
} from '@/types/ticket'

export interface TicketFilterParams {
  page?: number
  per_page?: number
  status?: string
  priority?: string
  type?: string
  source?: string
  search?: string
  assignee_id?: number | string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export const authApi = {
  // Step 1: Generate access token using secret before submitting to login API
  async generateToken(secret?: string): Promise<TokenResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.generateToken()
    }
    const apiSecret = secret || (import.meta.env.VITE_API_SECRET as string) || ''
    if (!apiSecret && import.meta.env.DEV) {
      console.warn('Security Notice: VITE_API_SECRET is not set in environment.')
    }
    const formData = new FormData()
    formData.append('secret', apiSecret)

    const response = await apiClient.post<TokenResponse>('/token', formData, {
      baseURL: ROOT_API_URL,
    })
    return response.data
  },

  // Step 2: Submit login credentials with Bearer token from Step 1
  async loginWithToken(
    token: string,
    credentials: { username: string; password: string },
  ): Promise<any> {
    if (mockService.isMockDataEnabled()) {
      return mockService.login(credentials)
    }
    const formData = new FormData()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)

    const response = await apiClient.post('/login', formData, {
      baseURL: ROOT_API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Language': 'km',
      },
    })
    return response.data
  },

  // Step 3: Validate two-factor & retrieve user info + passport auth access_token
  async validateTwoFactor(params: {
    username: string
    code?: string
    token?: string
  }): Promise<TwoFactorResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.validateTwoFactor(params)
    }
    const urlParams = new URLSearchParams()
    urlParams.append('username', params.username)
    urlParams.append('code', params.code || '000000')

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Language': 'km',
    }
    if (params.token) {
      headers['Authorization'] = `Bearer ${params.token}`
    }

    const response = await apiClient.post<TwoFactorResponse>('/two-factor', urlParams.toString(), {
      baseURL: ROOT_API_URL,
      headers,
    })
    return response.data
  },

  // Fallback single-step login
  async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.login(credentials) as any
    }
    const response = await apiClient.post<LoginResponse>('/login', credentials, {
      baseURL: ROOT_API_URL,
    })
    return response.data
  },
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

export const ticketApi = {
  async getTickets(params: TicketFilterParams = {}): Promise<TicketListResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTickets(params)
    }
    const cleanParams: Record<string, any> = {}
    if (params.page) cleanParams.page = params.page
    if (params.per_page) cleanParams.per_page = params.per_page
    if (params.status && params.status !== 'all') cleanParams.status = params.status
    if (params.priority && params.priority !== 'all') cleanParams.priority = params.priority
    if (params.type && params.type !== 'all') cleanParams.type = params.type
    if (params.source && params.source !== 'all') cleanParams.source = params.source
    if (params.search) cleanParams.search = params.search
    if (params.assignee_id) cleanParams.assignee_id = params.assignee_id
    if (params.sort_by) cleanParams.sort_by = params.sort_by
    if (params.sort_dir) cleanParams.sort_dir = params.sort_dir

    const response = await apiClient.get<TicketListResponse>('/ticket', { params: cleanParams })
    return response.data
  },

  async getTicketById(id: number | string): Promise<TicketSingleResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTicketById(id)
    }
    const response = await apiClient.get<TicketSingleResponse>(`/ticket/${id}`)
    return response.data
  },

  async createTicket(
    payload:
      | FormData
      | {
          title: string
          description?: string
          type: string
          priority: string
          source?: string
          reporter_name?: string
          reporter_email?: string
          reporter_phone?: string
          reporter_user_id?: number | null
          phone?: string
          due_at?: string
          metadata?: Record<string, any>
          files?: File[]
        },
  ): Promise<TicketSingleResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.createTicket(payload as any)
    }
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData
    const headers: Record<string, string> = {}
    if (isFormData) {
      headers['Content-Type'] = 'multipart/form-data'
    }
    const response = await apiClient.post<TicketSingleResponse>('/ticket', payload, {
      headers,
    })
    return response.data
  },

  async updateTicket(
    id: number | string,
    data: UpdateTicketPayload,
  ): Promise<TicketSingleResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.updateTicket(id, data)
    }
    const response = await apiClient.put<TicketSingleResponse>(`/ticket/${id}`, data)
    return response.data
  },

  async getTicketAudits(
    ticketId: number | string,
    params: { page?: number; per_page?: number; field?: string } = {},
  ): Promise<TicketAuditsResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTicketAudits(ticketId, params)
    }
    const response = await apiClient.get<TicketAuditsResponse>(`/ticket/${ticketId}/audits`, {
      params,
    })
    return response.data
  },

  async deleteTicket(id: number | string): Promise<{ success: boolean; message: string }> {
    if (mockService.isMockDataEnabled()) {
      return mockService.deleteTicket(id)
    }
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/ticket/${id}`)
    return response.data
  },

  async uploadAttachments(
    ticketId: number | string,
    files: File[],
  ): Promise<{ data: Attachment[]; success: boolean }> {
    if (mockService.isMockDataEnabled()) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      const mockAttachments: Attachment[] = files.map((file) => ({
        id: Math.floor(Math.random() * 10000) + 100,
        ticket_id: Number(ticketId),
        file_name: file.name,
        file_url: URL.createObjectURL(file),
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        created_at: now,
      }))
      return { data: mockAttachments, success: true }
    }
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files[]', file)
    })

    const response = await apiClient.post<{ data: Attachment[]; success: boolean }>(
      `/ticket/${ticketId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    return response.data
  },

  async deleteAttachment(
    ticketId: number | string,
    attachmentId: number | string,
  ): Promise<{ success: boolean; message: string }> {
    if (mockService.isMockDataEnabled()) {
      return { success: true, message: 'Attachment deleted successfully (Mock Mode)' }
    }
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/ticket/${ticketId}/attachments/${attachmentId}`,
    )
    return response.data
  },

  async getTicketComments(
    ticketId: number | string,
    params: { include_internal?: boolean; per_page?: number } = {},
  ): Promise<{ data: TicketComment[]; success: boolean; message?: string }> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTicketComments(ticketId)
    }
    const response = await apiClient.get<{
      data: TicketComment[]
      success: boolean
      message?: string
    }>(`/ticket/${ticketId}/comments`, { params })
    return response.data
  },

  async createTicketComment(
    ticketId: number | string,
    payload: CreateCommentPayload,
  ): Promise<{ data: TicketComment; success: boolean; message?: string }> {
    if (mockService.isMockDataEnabled()) {
      return mockService.createTicketComment(ticketId, payload)
    }

    const base64Files: string[] = []
    if (payload.files && payload.files.length > 0) {
      for (const item of payload.files) {
        if (typeof item === 'string') {
          base64Files.push(item)
        } else if (typeof File !== 'undefined' && item instanceof File) {
          const b64 = await fileToBase64(item)
          base64Files.push(b64)
        }
      }
    }

    const jsonPayload = {
      username: payload.username || 'customer_alex',
      body: payload.body,
      parent_id: payload.parent_id !== undefined ? payload.parent_id : null,
      is_internal: typeof payload.is_internal === 'boolean' ? payload.is_internal : false,
      files: base64Files,
      ...(payload.metadata ? { metadata: payload.metadata } : {}),
    }

    const response = await apiClient.post<{
      data: TicketComment
      success: boolean
      message?: string
    }>(`/ticket/${ticketId}/comments`, jsonPayload)
    return response.data
  },

  async updateTicketComment(
    ticketId: number | string,
    commentId: number | string,
    payload: UpdateCommentPayload,
  ): Promise<{ data: TicketComment; success: boolean; message?: string }> {
    if (mockService.isMockDataEnabled()) {
      return {
        data: {
          id: Number(commentId),
          ticket_id: Number(ticketId),
          body: payload.body || '',
          is_internal: Boolean(payload.is_internal),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        success: true,
      }
    }
    const response = await apiClient.put<{
      data: TicketComment
      success: boolean
      message?: string
    }>(`/ticket/${ticketId}/comments/${commentId}`, payload)
    return response.data
  },

  async deleteTicketComment(
    ticketId: number | string,
    commentId: number | string,
  ): Promise<{ success: boolean; message: string }> {
    if (mockService.isMockDataEnabled()) {
      return mockService.deleteTicketComment(ticketId, commentId)
    }
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/ticket/${ticketId}/comments/${commentId}`,
    )
    return response.data
  },

  async submitClientTicket(
    payload:
      | FormData
      | {
          title: string
          description?: string
          type?: string
          priority?: string
          reporter_name?: string
          reporter_email?: string
          reporter_phone?: string
          reporter_user_id?: number | null
          files?: (File | string)[]
          metadata?: Record<string, any>
          [key: string]: any
        },
    clientId = (import.meta.env.VITE_CLIENT_ID as string) || '',
    clientSecret = (import.meta.env.VITE_CLIENT_SECRET as string) || '',
  ): Promise<TicketSingleResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.submitClientTicket(payload)
    }
    const isFormData = payload instanceof FormData
    const headers: Record<string, string> = {}
    if (clientId) headers['X-Client-ID'] = clientId
    if (clientSecret) headers['X-Client-Secret'] = clientSecret
    if (isFormData) {
      headers['Content-Type'] = 'multipart/form-data'
    }
    const response = await apiClient.post<TicketSingleResponse>('/ticket/client', payload, {
      headers,
    })
    return response.data
  },

  async getClientTicket(
    id: number | string,
    clientId = (import.meta.env.VITE_CLIENT_ID as string) || '',
    clientSecret = (import.meta.env.VITE_CLIENT_SECRET as string) || '',
  ): Promise<TicketSingleResponse> {
    if (mockService.isMockDataEnabled()) {
      return mockService.getTicketById(id)
    }
    const headers: Record<string, string> = {}
    if (clientId) headers['X-Client-ID'] = clientId
    if (clientSecret) headers['X-Client-Secret'] = clientSecret
    const response = await apiClient.get<TicketSingleResponse>(`/ticket/client/tickets/${id}`, {
      headers,
    })
    return response.data
  },

  async submitClientComment(
    ticketId: number | string,
    payload: { body: string },
    clientId = (import.meta.env.VITE_CLIENT_ID as string) || '',
    clientSecret = (import.meta.env.VITE_CLIENT_SECRET as string) || '',
  ): Promise<{ data: TicketComment; success: boolean; message?: string }> {
    if (mockService.isMockDataEnabled()) {
      return mockService.createTicketComment(ticketId, payload)
    }
    const headers: Record<string, string> = {}
    if (clientId) headers['X-Client-ID'] = clientId
    if (clientSecret) headers['X-Client-Secret'] = clientSecret
    const response = await apiClient.post<{
      data: TicketComment
      success: boolean
      message?: string
    }>(`/ticket/client/tickets/${ticketId}/comments`, payload, { headers })
    return response.data
  },
}

import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketType,
  TicketListResponse,
  TicketSingleResponse,
  TicketComment,
  CreateCommentPayload,
  Attachment,
  TicketAudit,
  UpdateTicketPayload,
} from '@/types/ticket'
import type { TicketFilterParams } from '@/api/ticketApi'

const INITIAL_MOCK_TICKETS: Ticket[] = [
  {
    id: 1,
    public_id: 'tck_pub_001',
    ticket_key: 'TCK-1001',
    number: 1001,
    title: 'Payment gateway timeout during QR Pay checkout',
    description:
      '<h3>Issue Summary</h3><p>Customers at the Central Branch reported intermittent <strong>HTTP 504 Gateway Timeouts</strong> when confirming KHQR dynamic payment tokens.</p><ul><li>Failed Transactions: 14 instances</li><li>Affected Gateway: Bakong KHQR Provider</li></ul><pre><code>Error: Connection reset by peer at /gateway/khqr/verify</code></pre>',
    description_preview:
      'Customers reported intermittent HTTP 504 timeouts when confirming KHQR payment tokens.',
    type: 'bug',
    status: 'open',
    priority: 'critical',
    source: 'api',
    company: 'UYFC',
    company_name: 'UYFC Central',
    reporter_name: 'Dara Chan',
    reporter_email: 'dara.chan@uyfc.internal',
    reporter_phone: '012 889 901',
    reporter: {
      id: 101,
      name: 'Dara Chan',
      phone: '012 889 901',
      role: 'BRANCH MANAGER',
    },
    assignee: {
      id: 2,
      name: 'Sophea Kem',
    },
    metadata: {
      api_client_name: 'Branch POS Terminal Sync',
      api_client_id: 'pos_sync_service_v2',
      role: 'BRANCH MANAGER',
      app_version: 'v2.4.1',
      os: 'Android 14',
    },
    attachments: [
      {
        id: 101,
        ticket_id: 1,
        file_name: 'khqr_gateway_error.log',
        file_url:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        file_size: 145020,
        mime_type: 'text/plain',
        created_at: '2026-10-10 08:30:00',
      },
    ],
    comments: [
      {
        id: 201,
        ticket_id: 1,
        body: 'Investigating API latency spikes with the national payment switch team.',
        is_internal: true,
        author: {
          id: 2,
          name: 'Sophea Kem',
          email: 'sophea.kem@bronx.internal',
        },
        created_at: '2026-10-10 09:15:00',
        updated_at: '2026-10-10 09:15:00',
      },
    ],
    created_at: '2026-10-10 08:24:12',
    updated_at: '2026-10-10 09:15:00',
  },
  {
    id: 2,
    public_id: 'tck_pub_002',
    ticket_key: 'TCK-1002',
    number: 1002,
    title: 'Add dark mode toggle and report PDF export',
    description:
      '<p>The executive operations team requests the ability to <strong>export monthly ticket performance</strong> directly into a branded PDF report with dark mode support.</p>',
    description_preview: 'Operations team requests PDF report export with dark mode support.',
    type: 'enhancement',
    status: 'in_progress',
    priority: 'medium',
    source: 'admin',
    company: 'UYFC',
    company_name: 'UYFC Headquarters',
    reporter_name: 'Menglang Huo',
    reporter_email: 'menglang@bronx.internal',
    reporter_phone: '010 334 556',
    reporter: {
      id: 1,
      name: 'Menglang Huo',
      phone: '010 334 556',
      role: 'HQ ADMIN',
    },
    assignee: {
      id: 1,
      name: 'Menglang Huo',
    },
    metadata: {
      role: 'HQ ADMIN',
    },
    attachments: [],
    comments: [
      {
        id: 202,
        ticket_id: 2,
        body: 'Implemented theme store and dynamic chart styling. Finalizing PDF print layout.',
        is_internal: false,
        author: {
          id: 1,
          name: 'Menglang Huo',
          email: 'menglang@bronx.internal',
        },
        created_at: '2026-10-11 11:00:00',
        updated_at: '2026-10-11 11:00:00',
      },
    ],
    created_at: '2026-10-09 14:10:00',
    updated_at: '2026-10-11 11:00:00',
  },
  {
    id: 3,
    public_id: 'tck_pub_003',
    ticket_key: 'TCK-1003',
    number: 1003,
    title: 'Client unable to update company registration address',
    description:
      '<p>User reported a validation constraint error when trying to update district and commune in profile settings.</p>',
    description_preview: 'User reported validation constraint error when updating address.',
    type: 'bug',
    status: 'open',
    priority: 'high',
    source: 'api',
    company: 'UYFC',
    company_name: 'UYFC Siem Reap',
    reporter_name: 'Bopha Vann',
    reporter_email: 'bopha.vann@client.com',
    reporter_phone: '098 776 543',
    reporter: {
      id: 103,
      name: 'Bopha Vann',
      phone: '098 776 543',
      role: 'CLIENT',
    },
    assignee: {
      id: 3,
      name: 'Alexandre Vane',
    },
    metadata: {
      api_client_name: 'Bronx Mobile Storefront (iOS & Android)',
      api_client_id: 'bronx_mobile_app_prod',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-11 16:45:00',
    updated_at: '2026-10-11 16:45:00',
  },
  {
    id: 4,
    public_id: 'tck_pub_004',
    ticket_key: 'TCK-1004',
    number: 1004,
    title: 'Configure Telegram automated alerts for critical incidents',
    description:
      '<p>Set up automated Webhook dispatch for all <strong>Critical</strong> severity tickets so on-call engineers receive immediate notifications via Telegram bot.</p>',
    description_preview: 'Set up automated Telegram notifications for critical tickets.',
    type: 'task',
    status: 'resolved',
    priority: 'high',
    source: 'telegram_bot',
    company: 'UYFC',
    company_name: 'UYFC HQ',
    reporter_name: 'Sreypov Meas',
    reporter_email: 'sreypov.meas@bronx.internal',
    reporter_phone: '077 123 456',
    reporter: {
      id: 104,
      name: 'Sreypov Meas',
      phone: '077 123 456',
      role: 'DEVOPS ENGINEER',
    },
    assignee: {
      id: 2,
      name: 'Sophea Kem',
    },
    metadata: {
      role: 'DEVOPS ENGINEER',
    },
    attachments: [],
    comments: [
      {
        id: 203,
        ticket_id: 4,
        body: 'Telegram bot webhook configured and outbox processor worker enabled.',
        is_internal: true,
        author: {
          id: 2,
          name: 'Sophea Kem',
          email: 'sophea.kem@bronx.internal',
        },
        created_at: '2026-10-12 10:20:00',
        updated_at: '2026-10-12 10:20:00',
      },
    ],
    created_at: '2026-10-08 09:00:00',
    updated_at: '2026-10-12 10:20:00',
    resolved_at: '2026-10-12 10:20:00',
  },
  {
    id: 5,
    public_id: 'tck_pub_005',
    ticket_key: 'TCK-1005',
    number: 1005,
    title: 'Database connection pool exhausted during peak sales hour',
    description:
      '<h3>Post-Mortem & Fix</h3><p>PostgreSQL max connections reached 100 during noon promotions. Resolved by increasing pool size and adding PgBouncer pooling.</p>',
    description_preview: 'PostgreSQL max connections reached 100. Resolved with PgBouncer.',
    type: 'bug',
    status: 'closed',
    priority: 'critical',
    source: 'admin',
    company: 'UYFC',
    company_name: 'UYFC HQ',
    reporter_name: 'Dararith Seng',
    reporter_email: 'dararith.seng@bronx.internal',
    reporter_phone: '012 345 678',
    reporter: {
      id: 105,
      name: 'Dararith Seng',
      phone: '012 345 678',
      role: 'DATABASE ADMIN',
    },
    assignee: {
      id: 1,
      name: 'Menglang Huo',
    },
    metadata: {
      role: 'DATABASE ADMIN',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-05 12:15:00',
    updated_at: '2026-10-06 18:00:00',
    resolved_at: '2026-10-06 16:00:00',
    closed_at: '2026-10-06 18:00:00',
  },
  {
    id: 6,
    public_id: 'tck_pub_006',
    ticket_key: 'TCK-1006',
    number: 1006,
    title: 'Inquiry regarding API rate limits and Webhook retry policy',
    description:
      '<p>Integration partner requested clarification on rate limit headers (X-RateLimit-Limit) and exponential backoff behavior on 429 status codes.</p>',
    description_preview: 'Partner requested clarification on rate limits and webhook retries.',
    type: 'question',
    status: 'resolved',
    priority: 'low',
    source: 'api',
    company: 'UYFC',
    company_name: 'UYFC Battambang',
    reporter_name: 'Sokha Rith',
    reporter_email: 'sokha.rith@partner.io',
    reporter_phone: '089 990 011',
    reporter: {
      id: 106,
      name: 'Sokha Rith',
      phone: '089 990 011',
      role: 'INTEGRATION PARTNER',
    },
    assignee: {
      id: 3,
      name: 'Alexandre Vane',
    },
    metadata: {
      api_client_name: 'Customer Helpdesk Ingestion Webhook',
      api_client_id: 'helpdesk_webhook_int',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-07 10:00:00',
    updated_at: '2026-10-07 15:30:00',
    resolved_at: '2026-10-07 15:30:00',
  },
  {
    id: 7,
    public_id: 'tck_pub_007',
    ticket_key: 'TCK-1007',
    number: 1007,
    title: 'Implement 2FA backup codes recovery for HQ Admin',
    description:
      '<p>Provide admin users with 10 one-time emergency backup recovery codes during two-factor authentication setup.</p>',
    description_preview: 'Provide admin users with 10 backup recovery codes during 2FA setup.',
    type: 'enhancement',
    status: 'in_progress',
    priority: 'high',
    source: 'admin',
    company: 'UYFC',
    company_name: 'UYFC HQ',
    reporter_name: 'Menglang Huo',
    reporter_email: 'menglang@bronx.internal',
    reporter_phone: '010 334 556',
    reporter: {
      id: 1,
      name: 'Menglang Huo',
      phone: '010 334 556',
      role: 'HQ ADMIN',
    },
    assignee: {
      id: 1,
      name: 'Menglang Huo',
    },
    metadata: {
      role: 'HQ ADMIN',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-11 09:30:00',
    updated_at: '2026-10-12 14:00:00',
  },
  {
    id: 8,
    public_id: 'tck_pub_008',
    ticket_key: 'TCK-1008',
    number: 1008,
    title: 'Audit log archiving for quarterly compliance review',
    description:
      '<p>Archive Q3 user activity audit logs into encrypted S3 storage buckets with 7-year retention policy.</p>',
    description_preview: 'Archive Q3 audit logs into encrypted S3 storage with 7-year retention.',
    type: 'task',
    status: 'closed',
    priority: 'medium',
    source: 'admin',
    company: 'UYFC',
    company_name: 'UYFC HQ',
    reporter_name: 'Channary Long',
    reporter_email: 'channary.long@bronx.internal',
    reporter_phone: '017 889 001',
    reporter: {
      id: 108,
      name: 'Channary Long',
      phone: '017 889 001',
      role: 'SECURITY AUDITOR',
    },
    assignee: {
      id: 2,
      name: 'Sophea Kem',
    },
    metadata: {
      role: 'SECURITY AUDITOR',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-01 11:00:00',
    updated_at: '2026-10-03 16:00:00',
    resolved_at: '2026-10-03 15:30:00',
    closed_at: '2026-10-03 16:00:00',
  },
  {
    id: 9,
    public_id: 'tck_pub_009',
    ticket_key: 'TCK-1009',
    number: 1009,
    title: 'Slow response time on ticket search with multiple facets',
    description:
      '<p>Queries filtering by both priority and status with full-text search exceed 1.8s response time. Add composite GIN indexes on title and description.</p>',
    description_preview: 'Search queries taking 1.8s. Need composite GIN index on tickets table.',
    type: 'bug',
    status: 'in_progress',
    priority: 'high',
    source: 'admin',
    company: 'UYFC',
    company_name: 'UYFC HQ',
    reporter_name: 'Dararith Seng',
    reporter_email: 'dararith.seng@bronx.internal',
    reporter_phone: '012 345 678',
    reporter: {
      id: 105,
      name: 'Dararith Seng',
      phone: '012 345 678',
      role: 'HQ ADMIN',
    },
    assignee: {
      id: 1,
      name: 'Menglang Huo',
    },
    metadata: {
      role: 'HQ ADMIN',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-12 11:20:00',
    updated_at: '2026-10-12 17:00:00',
  },
  {
    id: 10,
    public_id: 'tck_pub_010',
    ticket_key: 'TCK-1010',
    number: 1010,
    title: 'POS barcode scanner character encoding glitch on Khmer font',
    description:
      '<p>Scanned product serial numbers containing unicode characters display garbled text on receipt printer output.</p>',
    description_preview: 'Barcode scanner character encoding glitch on Khmer font on receipts.',
    type: 'bug',
    status: 'open',
    priority: 'medium',
    source: 'branch',
    company: 'UYFC',
    company_name: 'UYFC Kampong Cham',
    reporter_name: 'Vannak Oum',
    reporter_email: 'vannak.oum@uyfc.internal',
    reporter_phone: '011 445 667',
    reporter: {
      id: 110,
      name: 'Vannak Oum',
      phone: '011 445 667',
      role: 'BRANCH CASHIER',
    },
    assignee: {
      id: 3,
      name: 'Alexandre Vane',
    },
    metadata: {
      role: 'BRANCH CASHIER',
      branch: 'Kampong Cham Branch #2',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-12 14:10:00',
    updated_at: '2026-10-12 14:10:00',
  },
  {
    id: 11,
    public_id: 'tck_pub_011',
    ticket_key: 'TCK-1011',
    number: 1011,
    title: 'How to subscribe multiple telegram notification channels?',
    description:
      '<p>Can branch supervisors link one bot invite link to a department group channel instead of individual private chat accounts?</p>',
    description_preview:
      'Inquiry on linking bot invite link to department Telegram group channels.',
    type: 'question',
    status: 'open',
    priority: 'low',
    source: 'telegram_bot',
    company: 'UYFC',
    company_name: 'UYFC HQ',
    reporter_name: 'Kosal Chea',
    reporter_email: 'kosal.chea@uyfc.internal',
    reporter_phone: '015 990 123',
    reporter: {
      id: 111,
      name: 'Kosal Chea',
      phone: '015 990 123',
      role: 'BRANCH SUPERVISOR',
    },
    assignee: {
      id: 2,
      name: 'Sophea Kem',
    },
    metadata: {
      role: 'BRANCH SUPERVISOR',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-12 16:30:00',
    updated_at: '2026-10-12 16:30:00',
  },
  {
    id: 12,
    public_id: 'tck_pub_012',
    ticket_key: 'TCK-1012',
    number: 1012,
    title: 'Automate weekly ticket backlog summary report',
    description:
      '<p>Send automated email summary every Monday morning at 08:00 AM outlining resolved tickets and SLA compliance rate.</p>',
    description_preview: 'Automate weekly ticket backlog summary report sent every Monday morning.',
    type: 'enhancement',
    status: 'resolved',
    priority: 'medium',
    source: 'admin',
    company: 'UYFC',
    company_name: 'UYFC HQ',
    reporter_name: 'Menglang Huo',
    reporter_email: 'menglang@bronx.internal',
    reporter_phone: '010 334 556',
    reporter: {
      id: 1,
      name: 'Menglang Huo',
      phone: '010 334 556',
      role: 'HQ ADMIN',
    },
    assignee: {
      id: 1,
      name: 'Menglang Huo',
    },
    metadata: {
      role: 'HQ ADMIN',
    },
    attachments: [],
    comments: [],
    created_at: '2026-10-04 10:00:00',
    updated_at: '2026-10-09 17:00:00',
    resolved_at: '2026-10-09 17:00:00',
  },
]

// In-memory reactive state for mock tickets
let mockTicketsState: Ticket[] = JSON.parse(JSON.stringify(INITIAL_MOCK_TICKETS))

export function resetMockTickets(): void {
  mockTicketsState = JSON.parse(JSON.stringify(INITIAL_MOCK_TICKETS))
}

export function getMockTicketsList(params: TicketFilterParams = {}): TicketListResponse {
  let list = [...mockTicketsState]

  // Search filter
  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim()
    list = list.filter(
      (t) =>
        t.ticket_key.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.reporter_name && t.reporter_name.toLowerCase().includes(q)) ||
        (t.reporter_phone && t.reporter_phone.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.description_preview && t.description_preview.toLowerCase().includes(q)) ||
        (t.metadata?.api_client_name && t.metadata.api_client_name.toLowerCase().includes(q)),
    )
  }

  // Status filter
  if (params.status && params.status !== 'all') {
    list = list.filter((t) => t.status === params.status)
  }

  // Priority filter
  if (params.priority && params.priority !== 'all') {
    list = list.filter((t) => t.priority === params.priority)
  }

  // Type filter
  if (params.type && params.type !== 'all') {
    list = list.filter((t) => t.type === params.type)
  }

  // Source filter
  if (params.source && params.source !== 'all') {
    list = list.filter((t) => t.source === params.source)
  }

  // Sorting
  const sortBy = params.sort_by || 'created_at'
  const sortDir = params.sort_dir || 'desc'
  list.sort((a: any, b: any) => {
    const valA = a[sortBy] ?? ''
    const valB = b[sortBy] ?? ''
    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Calculate facets from ALL mock tickets in current state
  const statusFacets: Record<TicketStatus, number> = {
    open: mockTicketsState.filter((t) => t.status === 'open').length,
    in_progress: mockTicketsState.filter((t) => t.status === 'in_progress').length,
    resolved: mockTicketsState.filter((t) => t.status === 'resolved').length,
    closed: mockTicketsState.filter((t) => t.status === 'closed').length,
  }

  const priorityFacets: Record<TicketPriority, number> = {
    critical: mockTicketsState.filter((t) => t.priority === 'critical').length,
    high: mockTicketsState.filter((t) => t.priority === 'high').length,
    medium: mockTicketsState.filter((t) => t.priority === 'medium').length,
    low: mockTicketsState.filter((t) => t.priority === 'low').length,
  }

  // Pagination
  const page = Number(params.page || 1)
  const perPage = Number(params.per_page || 10)
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const startIndex = (page - 1) * perPage
  const pageItems = list.slice(startIndex, startIndex + perPage)

  return {
    success: true,
    data: {
      content: pageItems,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
      applied_filters: params as Record<string, any>,
      facets: {
        status: statusFacets,
        priority: priorityFacets,
        total: mockTicketsState.length,
      },
    },
    meta: {
      current_page: page,
      per_page: perPage,
      total,
      last_page: totalPages,
      from: total > 0 ? startIndex + 1 : 0,
      to: Math.min(startIndex + perPage, total),
      path: '/tickets',
    },
  }
}

export function getMockTicketById(id: number | string): TicketSingleResponse {
  const numId = Number(id)
  const found = mockTicketsState.find(
    (t) => t.id === numId || t.ticket_key === String(id) || t.public_id === String(id),
  )

  if (!found) {
    throw new Error(`Ticket #${id} not found in mock store`)
  }

  return {
    success: true,
    data: JSON.parse(JSON.stringify(found)),
  }
}

export function createMockTicket(
  payload:
    | FormData
    | {
        title: string
        description?: string
        type?: string
        priority?: string
        source?: string
        reporter_name?: string
        reporter_email?: string
        reporter_phone?: string
        phone?: string
        due_at?: string
        metadata?: Record<string, any>
        files?: File[]
      },
): TicketSingleResponse {
  let title = 'Untitled Ticket'
  let description = ''
  let type: TicketType = 'task'
  let priority: TicketPriority = 'medium'
  let source = 'admin'
  let reporter_name = 'Admin User'
  let reporter_email = 'admin@bronx.internal'
  let reporter_phone = '012 345 678'
  let due_at: string | null = null
  let metadata: Record<string, any> = {}
  const mockAttachments: Attachment[] = []

  if (payload instanceof FormData) {
    title = (payload.get('title') as string) || title
    description = (payload.get('description') as string) || ''
    type = (payload.get('type') as string as TicketType) || type
    priority = (payload.get('priority') as string as TicketPriority) || priority
    source = (payload.get('source') as string) || source
    reporter_name = (payload.get('reporter_name') as string) || reporter_name
    reporter_email = (payload.get('reporter_email') as string) || reporter_email
    reporter_phone = (payload.get('reporter_phone') as string) || reporter_phone
    due_at = (payload.get('due_at') as string) || null

    const files = payload.getAll('files[]') as File[]
    if (files && files.length > 0) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      files.forEach((file) => {
        if (file instanceof File) {
          mockAttachments.push({
            id: Math.floor(Math.random() * 10000) + 100,
            ticket_id: 0,
            file_name: file.name,
            file_url: URL.createObjectURL(file),
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            created_at: now,
          })
        }
      })
    }
  } else {
    title = payload.title || title
    description = payload.description || ''
    type = (payload.type as TicketType) || type
    priority = (payload.priority as TicketPriority) || priority
    source = payload.source || source
    reporter_name = payload.reporter_name || reporter_name
    reporter_email = payload.reporter_email || reporter_email
    reporter_phone = payload.reporter_phone || payload.phone || reporter_phone
    due_at = payload.due_at || null
    metadata = payload.metadata || {}

    if (payload.files && Array.isArray(payload.files)) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      payload.files.forEach((file: File) => {
        if (file instanceof File) {
          mockAttachments.push({
            id: Math.floor(Math.random() * 10000) + 100,
            ticket_id: 0,
            file_name: file.name,
            file_url: URL.createObjectURL(file),
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            created_at: now,
          })
        }
      })
    }
  }

  const nextId =
    mockTicketsState.length > 0 ? Math.max(...mockTicketsState.map((t) => t.id)) + 1 : 1
  const nextNumber = 1000 + nextId
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  mockAttachments.forEach((a) => {
    a.ticket_id = nextId
  })

  const newTicket: Ticket = {
    id: nextId,
    public_id: `tck_pub_${String(nextId).padStart(3, '0')}`,
    ticket_key: `TCK-${nextNumber}`,
    number: nextNumber,
    title,
    description,
    description_preview: description ? description.replace(/<[^>]*>/g, '').substring(0, 120) : '',
    type,
    status: 'open',
    priority,
    source,
    company: 'UYFC',
    company_name: 'UYFC Headquarters',
    reporter_name,
    reporter_email,
    reporter_phone,
    reporter: {
      id: 999,
      name: reporter_name,
      phone: reporter_phone,
      role: 'ADMIN',
    },
    assignee: null,
    due_at,
    metadata,
    attachments: mockAttachments,
    comments: [],
    created_at: now,
    updated_at: now,
  }

  mockTicketsState.unshift(newTicket)

  return {
    success: true,
    data: newTicket,
    message: 'Ticket created successfully (Mock Mode)',
  }
}

const INITIAL_MOCK_AUDITS: Record<number, TicketAudit[]> = {
  1: [
    {
      id: 1,
      ticket_id: 1,
      company_id: 1,
      event: 'updated',
      editor: {
        id: 10,
        name: 'Vannak Admin',
        email: 'admin@dev.local',
        profile_url: null,
      },
      modified_fields: ['title', 'description', 'priority'],
      old_values: {
        title: 'paymnt fail timeout qr',
        description: 'Customer reported paying with qr code broke.',
        priority: 'high',
      },
      new_values: {
        title: 'Payment gateway timeout during QR Pay checkout',
        description:
          '<h3>Issue Summary</h3><p>Customers at the Central Branch reported intermittent <strong>HTTP 504 Gateway Timeouts</strong> when confirming KHQR dynamic payment tokens.</p>',
        priority: 'critical',
      },
      diff: {
        title: {
          old: 'paymnt fail timeout qr',
          new: 'Payment gateway timeout during QR Pay checkout',
        },
        description: {
          old: 'Customer reported paying with qr code broke.',
          new: '<h3>Issue Summary</h3><p>Customers at the Central Branch reported intermittent <strong>HTTP 504 Gateway Timeouts</strong> when confirming KHQR dynamic payment tokens.</p>',
        },
        priority: {
          old: 'high',
          new: 'critical',
        },
      },
      reason:
        'Fixed grammatical typos in title, clarified steps to reproduce, and upgraded priority to critical.',
      ip_address: '192.168.1.45',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      created_at: '2026-03-15 08:30:00',
      updated_at: '2026-03-15 08:30:00',
    },
  ],
}

const mockAuditsState: Record<number, TicketAudit[]> = { ...INITIAL_MOCK_AUDITS }

export function getMockTicketAudits(
  ticketId: number | string,
  _params: { page?: number; per_page?: number; field?: string } = {},
) {
  const numId = Number(ticketId)
  const audits = mockAuditsState[numId] || []
  return {
    success: true,
    data: audits,
    message: 'Audits retrieved successfully (Mock Mode)',
  }
}

export function updateMockTicket(
  id: number | string,
  data: UpdateTicketPayload,
): TicketSingleResponse {
  const numId = Number(id)
  const index = mockTicketsState.findIndex(
    (t) => t.id === numId || t.ticket_key === String(id) || t.public_id === String(id),
  )

  if (index === -1) {
    throw new Error(`Ticket #${id} not found in mock store`)
  }

  const existing = mockTicketsState[index]
  if (!existing) {
    throw new Error(`Ticket #${id} not found in mock store`)
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // Capture diff for audit
  const modifiedFields: string[] = []
  const oldValues: Record<string, any> = {}
  const newValues: Record<string, any> = {}
  const diff: Record<string, { old: any; new: any }> = {}

  if (data.title && data.title !== existing.title) {
    modifiedFields.push('title')
    oldValues.title = existing.title
    newValues.title = data.title
    diff.title = { old: existing.title, new: data.title }
    existing.title = data.title
  }

  if (data.description !== undefined && data.description !== existing.description) {
    modifiedFields.push('description')
    oldValues.description = existing.description
    newValues.description = data.description
    diff.description = { old: existing.description, new: data.description }
    existing.description = data.description
    existing.description_preview = data.description.replace(/<[^>]*>/g, '').substring(0, 120)
  }

  if (data.priority && data.priority !== existing.priority) {
    modifiedFields.push('priority')
    oldValues.priority = existing.priority
    newValues.priority = data.priority
    diff.priority = { old: existing.priority, new: data.priority }
    existing.priority = data.priority
  }

  if (data.type && data.type !== existing.type) {
    modifiedFields.push('type')
    oldValues.type = existing.type
    newValues.type = data.type
    diff.type = { old: existing.type, new: data.type }
    existing.type = data.type
  }

  if (data.status && data.status !== existing.status) {
    modifiedFields.push('status')
    oldValues.status = existing.status
    newValues.status = data.status
    diff.status = { old: existing.status, new: data.status }
    existing.status = data.status
  }

  if (data.assignee_id !== undefined) {
    existing.assignee = data.assignee_id ? { id: data.assignee_id, name: 'Sophea Kem' } : null
  }

  existing.updated_at = now

  // Record audit if any auditable fields changed
  if (modifiedFields.length > 0) {
    if (!mockAuditsState[existing.id]) {
      mockAuditsState[existing.id] = []
    }
    const newAudit: TicketAudit = {
      id: Math.floor(Math.random() * 100000) + 10,
      ticket_id: existing.id,
      company_id: 1,
      event:
        modifiedFields.includes('status') && modifiedFields.length === 1
          ? 'status_changed'
          : 'updated',
      editor: {
        id: 99,
        name: 'Current Admin',
        email: 'admin@bronx.test',
        profile_url: null,
      },
      modified_fields: modifiedFields,
      old_values: oldValues,
      new_values: newValues,
      diff,
      reason:
        data.audit_reason ||
        (modifiedFields.includes('status') && modifiedFields.length === 1
          ? `Status changed from '${oldValues.status}' to '${newValues.status}'`
          : 'Updated ticket details and clarified information'),
      ip_address: '127.0.0.1',
      user_agent: 'Browser Client',
      created_at: now,
      updated_at: now,
    }
    const auditsList = mockAuditsState[existing.id] || []
    auditsList.unshift(newAudit)
    mockAuditsState[existing.id] = auditsList
  }

  return {
    success: true,
    data: existing,
    message: 'Ticket updated successfully (Mock Mode)',
  }
}

export function deleteMockTicket(id: number | string): { success: boolean; message: string } {
  const numId = Number(id)
  const initialLen = mockTicketsState.length
  mockTicketsState = mockTicketsState.filter(
    (t) => t.id !== numId && t.ticket_key !== String(id) && t.public_id !== String(id),
  )

  return {
    success: mockTicketsState.length < initialLen,
    message: 'Ticket deleted successfully (Mock Mode)',
  }
}

export function getMockTicketComments(ticketId: number | string): {
  data: TicketComment[]
  success: boolean
} {
  const numId = Number(ticketId)
  const ticket = mockTicketsState.find((t) => t.id === numId)
  return {
    data: ticket?.comments || [],
    success: true,
  }
}

export function createMockTicketComment(
  ticketId: number | string,
  payload: CreateCommentPayload,
): { data: TicketComment; success: boolean; message: string } {
  const numId = Number(ticketId)
  const ticket = mockTicketsState.find((t) => t.id === numId)
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const attachments: Attachment[] = []
  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((fileOrStr, idx) => {
      if (typeof fileOrStr === 'string') {
        attachments.push({
          id: Math.floor(Math.random() * 10000) + 500,
          ticket_id: numId,
          file_name: `snapshot_${idx + 1}.png`,
          file_url: fileOrStr,
          file_size: 1024,
          mime_type: 'image/png',
          created_at: now,
        })
      } else if (typeof File !== 'undefined' && fileOrStr instanceof File) {
        attachments.push({
          id: Math.floor(Math.random() * 10000) + 500,
          ticket_id: numId,
          file_name: fileOrStr.name,
          file_url: typeof URL !== 'undefined' ? URL.createObjectURL(fileOrStr) : '',
          file_size: fileOrStr.size,
          mime_type: fileOrStr.type || 'application/octet-stream',
          created_at: now,
        })
      }
    })
  }

  const newComment: TicketComment = {
    id: Math.floor(Math.random() * 10000) + 1000,
    ticket_id: numId,
    username: payload.username,
    body: payload.body,
    is_internal: Boolean(payload.is_internal),
    author: {
      id: 1,
      name: payload.username || 'Menglang Huo',
      email: payload.username ? `${payload.username}@client.portal` : 'menglang@bronx.internal',
    },
    attachments,
    files: attachments,
    created_at: now,
    updated_at: now,
  }

  if (ticket) {
    if (!ticket.comments) ticket.comments = []
    ticket.comments.push(newComment)
  }

  return {
    data: newComment,
    success: true,
    message: 'Comment posted successfully (Mock Mode)',
  }
}

export function deleteMockTicketComment(
  ticketId: number | string,
  commentId: number | string,
): { success: boolean; message: string } {
  const numTicketId = Number(ticketId)
  const numCommentId = Number(commentId)
  const ticket = mockTicketsState.find((t) => t.id === numTicketId)
  if (ticket && ticket.comments) {
    ticket.comments = ticket.comments.filter((c) => c.id !== numCommentId)
  }
  return {
    success: true,
    message: 'Comment deleted successfully (Mock Mode)',
  }
}

export function submitMockClientTicket(
  payload: FormData | Record<string, any>,
): TicketSingleResponse {
  let title = 'Client Ingestion Ticket'
  let description = ''
  let type = 'bug'
  let reporter_name = 'Client Ingestion User'
  let reporter_email = 'client@partner.com'
  let reporter_phone = '012 999 888'

  if (payload instanceof FormData) {
    title = (payload.get('title') as string) || title
    description = (payload.get('description') as string) || ''
    type = (payload.get('type') as string) || type
    reporter_name = (payload.get('reporter_name') as string) || reporter_name
    reporter_email = (payload.get('reporter_email') as string) || reporter_email
    reporter_phone = (payload.get('reporter_phone') as string) || reporter_phone
  } else if (typeof payload === 'object') {
    title = payload.title || title
    description = payload.description || ''
    type = payload.type || type
    reporter_name = payload.reporter_name || reporter_name
    reporter_email = payload.reporter_email || reporter_email
    reporter_phone = payload.reporter_phone || reporter_phone
  }

  return createMockTicket({
    title,
    description,
    type,
    priority: 'high',
    source: 'api',
    reporter_name,
    reporter_email,
    reporter_phone,
    metadata: {
      api_client_name: 'Client Ingestion Portal',
      client_submitted: true,
    },
  })
}

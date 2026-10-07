export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketType = 'bug' | 'enhancement' | 'question' | 'task';

export interface Attachment {
  id: number;
  ticket_id: number;
  comment_id?: number | null;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: number;
  created_at: string;
  updated_at?: string;
}

export interface TicketAssignee {
  id: number;
  name: string;
}

export interface TicketMetadata {
  api_client_id?: string;
  api_client_name?: string;
  reporter_phone?: string;
  phone?: string;
  role?: string;
  rolename?: string;
  company?: string;
  company_name?: string;
  app_version?: string;
  os?: string;
  [key: string]: any;
}

export interface TicketReporter {
  id: number;
  name?: string | null;
  phone?: string | null;
  personal_phone?: string | null;
  role?: string | null;
  [key: string]: any;
}

export interface Ticket {
  id: number;
  public_id: string;
  ticket_key: string;
  number: number;
  title: string;
  description?: string | null;
  description_preview?: string | null;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  source: string; // 'api' | 'portal' | 'admin' | rolename
  company?: string;
  company_name?: string;
  reporter_phone?: string;
  phone?: string;
  role?: string;
  rolename?: string;
  external_ref?: string | null;
  reporter_name?: string | null;
  reporter_email?: string | null;
  reporter?: TicketReporter | null;
  assignee?: TicketAssignee | null;
  due_at?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  metadata?: TicketMetadata;
  attachments?: Attachment[];
  comments?: TicketComment[];
  created_at: string;
  updated_at: string;
}

export interface CommentAuthor {
  id: number;
  name?: string | null;
  profile_url?: string | null;
  email?: string | null;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  body: string;
  is_internal: boolean;
  author?: CommentAuthor | null;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentPayload {
  body: string;
  is_internal?: boolean;
  files?: File[];
  metadata?: Record<string, any>;
}

export interface UpdateCommentPayload {
  body?: string;
  is_internal?: boolean;
  metadata?: Record<string, any>;
}

export interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  path: string;
  per_page: number;
  to: number;
  total: number;
}

export interface TicketPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface TicketFacets {
  status: Record<TicketStatus, number>;
  priority: Record<TicketPriority, number>;
  total: number;
}

export interface TicketListData {
  content: Ticket[];
  pagination: TicketPagination;
  applied_filters: Record<string, any>;
  facets: TicketFacets;
}

export interface TicketListResponse {
  data: Ticket[] | TicketListData;
  meta?: PaginationMeta;
  pagination?: TicketPagination;
  facets?: TicketFacets;
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
  success?: boolean;
  message?: string;
  timestamp?: string;
}

export interface TicketSingleResponse {
  data: Ticket;
  success: boolean;
  message?: string;
}

export interface UserAuthTokens {
  token_type: string;
  expires_in?: number;
  access_token: string;
  refresh_token?: string;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  personal_phone?: string;
  role: string;
  role_id?: number;
  company_id: number;
  first_name_kh?: string;
  last_name_kh?: string;
  profile?: string;
  department_id?: number;
  department_name?: string;
  division_name?: string;
  auth?: UserAuthTokens;
  permission?: {
    is_expert?: boolean;
    chat_group?: any[];
    accept_card?: boolean;
    [key: string]: any;
  };
}

export interface TokenResponse {
  access_token: string;
  success: boolean;
  message?: string;
}

export interface TwoFactorResponse extends User {
  auth: UserAuthTokens;
}

export interface LoginResponse {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  user?: User;
  [key: string]: any;
}

export interface ReportSummary {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  critical_tickets: number;
  high_tickets: number;
  medium_tickets: number;
  low_tickets: number;
  resolution_rate: number;
  avg_resolution_hours: number;
}

export interface TopClient {
  client_name: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface DashboardReportsResponse {
  summary: ReportSummary;
  by_status: Record<TicketStatus, number>;
  by_priority: Record<TicketPriority, number>;
  by_source: Record<string, number>;
  by_type: Record<TicketType, number>;
  top_clients: TopClient[];
  trends: TrendPoint[];
  success: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

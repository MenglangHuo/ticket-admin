import type { Ticket } from '@/types/ticket'

/**
 * Extracts and formats the company name for a ticket with fallback to 'UYFC'.
 */
export function getTicketCompany(ticket?: Partial<Ticket> | null): string {
  if (!ticket) return 'UYFC'
  return (
    ticket.company ||
    ticket.company_name ||
    (ticket as any).company?.name ||
    (ticket as any).company?.company_name ||
    ticket.metadata?.company ||
    ticket.metadata?.company_name ||
    'UYFC'
  )
}

/**
 * Safely extracts user role from localStorage key 'bronx_user'.
 */
export function getUserRoleFromLocalStorage(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const rawUser = localStorage.getItem('bronx_user')
    if (!rawUser) return null

    const parsed = JSON.parse(rawUser)
    if (!parsed || typeof parsed !== 'object') return null

    const roleVal =
      (typeof parsed.role === 'string' ? parsed.role : null) ||
      (parsed.role && typeof parsed.role === 'object' && typeof parsed.role.name === 'string'
        ? parsed.role.name
        : null) ||
      (typeof parsed.role_name === 'string' ? parsed.role_name : null) ||
      (typeof parsed.rolename === 'string' ? parsed.rolename : null)

    if (roleVal && roleVal.trim()) {
      return roleVal.trim()
    }
    return null
  } catch {
    return null
  }
}

/**
 * Standardizes a role or source string into a consistent display label.
 */
function standardizeSourceRole(source: string): string {
  const trimmed = source.trim()
  const lower = trimmed.toLowerCase()

  if (lower === 'admin' || lower === 'hq' || lower === 'hq admin' || lower === 'hq_admin') {
    return 'HQ ADMIN'
  }
  if (lower === 'branch' || lower === 'branch admin' || lower === 'branch_admin') {
    return 'BRANCH ADMIN'
  }
  return trimmed.toUpperCase()
}

/**
 * Extracts and standardizes the submission origin/source role for a ticket.
 * Flow:
 * 1. First, get from ticket.source.
 * 2. If empty or null, get from localStorage with key='bronx_user' (object) -> field role.
 * 3. Fallback to ticket direct role metadata/fields.
 * 4. Default fallback to 'HQ ADMIN'.
 */
export function getTicketSource(ticket?: Partial<Ticket> | null): string {
  // 1. Check ticket.source first
  const rawSource = ticket?.source
  if (
    rawSource !== undefined &&
    rawSource !== null &&
    String(rawSource).trim() !== 'api' &&
    String(rawSource).trim() !== ''
  ) {
    const src = String(rawSource).trim()
    const lower = src.toLowerCase()

    if (lower === 'admin' || lower === 'hq' || lower === 'hq admin' || lower === 'hq_admin') {
      return 'HQ ADMIN'
    }
    if (lower === 'branch' || lower === 'branch admin' || lower === 'branch_admin') {
      return 'BRANCH ADMIN'
    }
    if (lower === 'portal') {
      if (
        ticket?.reporter_email?.includes('admin@') ||
        ticket?.reporter_name?.toLowerCase().includes('admin')
      ) {
        return 'HQ ADMIN'
      }
      return 'BRANCH ADMIN'
    }
    if (lower === 'client') {
      return ticket?.metadata?.api_client_name || 'CLIENT API'
    }
    return src.toUpperCase()
  }

  // 2. If empty or null, get from localStorage with key=bronx_user -> field role
  const storageRole = getUserRoleFromLocalStorage()
  if (storageRole) {
    return standardizeSourceRole(storageRole)
  }

  // 3. Fallback to ticket direct role metadata/fields
  const directRole =
    ticket?.metadata?.role ||
    ticket?.metadata?.rolename ||
    ticket?.metadata?.role_name ||
    ticket?.rolename ||
    ticket?.role ||
    ticket?.reporter?.role ||
    (ticket?.reporter as any)?.employee_object?.role

  if (directRole && String(directRole).trim()) {
    return standardizeSourceRole(String(directRole))
  }

  // 4. Default fallback
  return 'HQ ADMIN'
}

/**
 * Extracts the reporter phone number with fallback defaults based on source role.
 */
export function getTicketPhone(ticket?: Partial<Ticket> | null): string {
  if (!ticket) return '-'

  const directPhone =
    ticket.reporter_phone ||
    ticket.metadata?.reporter_phone ||
    ticket.phone ||
    ticket.metadata?.phone ||
    ticket.metadata?.personal_phone ||
    ticket.reporter?.phone ||
    ticket.reporter?.personal_phone

  if (directPhone && String(directPhone).trim()) {
    return String(directPhone).trim()
  }

  const source = getTicketSource(ticket)
  if (source === 'BRANCH ADMIN') {
    return '0964096111'
  }
  if (source === 'HQ ADMIN') {
    return '0928989888'
  }

  return '-'
}

export type SourceThemeCategory = 'hq' | 'branch' | 'other'

/**
 * Categorizes a source string to apply consistent theme coloring and iconography.
 */
export function getSourceCategory(source: string): SourceThemeCategory {
  const s = (source || '').toUpperCase()
  if (s.includes('HQ')) return 'hq'
  if (s.includes('BRANCH')) return 'branch'
  return 'other'
}

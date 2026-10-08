import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTicketCompany,
  getTicketSource,
  getUserRoleFromLocalStorage,
  getTicketPhone,
  getSourceCategory,
} from '@/utils/ticket'
import type { Ticket } from '@/types/ticket'

describe('Ticket Utility Functions', () => {
  describe('getTicketCompany', () => {
    it('returns direct company if present', () => {
      const ticket: Partial<Ticket> = { company: 'Acme Global' }
      expect(getTicketCompany(ticket)).toBe('Acme Global')
    })

    it('returns company_name if company is missing', () => {
      const ticket: Partial<Ticket> = { company_name: 'TechCorp' }
      expect(getTicketCompany(ticket)).toBe('TechCorp')
    })

    it('returns metadata company if top-level company is missing', () => {
      const ticket: Partial<Ticket> = {
        metadata: { company: 'MetaCorp' },
      }
      expect(getTicketCompany(ticket)).toBe('MetaCorp')
    })

    it('falls back to UYFC when no company fields are present', () => {
      expect(getTicketCompany({})).toBe('UYFC')
      expect(getTicketCompany(null)).toBe('UYFC')
      expect(getTicketCompany(undefined)).toBe('UYFC')
    })
  })

  describe('getTicketSource', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('returns uppercase direct role from metadata if source is missing and localStorage has no user', () => {
      const ticket: Partial<Ticket> = {
        metadata: { role: 'Branch Supervisor' },
      }
      expect(getTicketSource(ticket)).toBe('BRANCH SUPERVISOR')
    })

    it('standardizes admin/hq sources to HQ ADMIN', () => {
      expect(getTicketSource({ source: 'admin' })).toBe('HQ ADMIN')
      expect(getTicketSource({ source: 'hq' })).toBe('HQ ADMIN')
      expect(getTicketSource({ source: 'hq_admin' })).toBe('HQ ADMIN')
    })

    it('standardizes branch sources to BRANCH ADMIN', () => {
      expect(getTicketSource({ source: 'branch' })).toBe('BRANCH ADMIN')
      expect(getTicketSource({ source: 'branch_admin' })).toBe('BRANCH ADMIN')
    })

    it('handles portal source based on reporter email / name', () => {
      expect(
        getTicketSource({
          source: 'portal',
          reporter_email: 'admin@bronx.test',
        }),
      ).toBe('HQ ADMIN')

      expect(
        getTicketSource({
          source: 'portal',
          reporter_name: 'Super Admin',
        }),
      ).toBe('HQ ADMIN')

      expect(
        getTicketSource({
          source: 'portal',
          reporter_name: 'Regular Staff',
        }),
      ).toBe('BRANCH ADMIN')
    })

    it('returns api client name or CLIENT API for api source', () => {
      expect(
        getTicketSource({
          source: 'api',
          metadata: { api_client_name: 'Acme Mobile App' },
        }),
      ).toBe('Acme Mobile App')

      expect(getTicketSource({ source: 'api' })).toBe('CLIENT API')
    })

    it('prioritizes ticket.source over localStorage bronx_user role', () => {
      localStorage.setItem('bronx_user', JSON.stringify({ role: 'BRANCH MANAGER' }))
      expect(getTicketSource({ source: 'api' })).toBe('CLIENT API')
      expect(getTicketSource({ source: 'admin' })).toBe('HQ ADMIN')
      expect(getTicketSource({ source: 'telegram_bot' })).toBe('TELEGRAM_BOT')
    })

    it('prioritizes ticket.source over metadata role', () => {
      const ticket: Partial<Ticket> = {
        source: 'api',
        metadata: { role: 'BRANCH SUPERVISOR' },
      }
      expect(getTicketSource(ticket)).toBe('CLIENT API')
    })

    it('reads role from localStorage bronx_user when ticket.source is empty, null, or undefined', () => {
      localStorage.setItem('bronx_user', JSON.stringify({ role: 'BRANCH MANAGER' }))

      expect(getTicketSource({ source: '' })).toBe('BRANCH MANAGER')
      expect(getTicketSource({ source: '   ' })).toBe('BRANCH MANAGER')
      expect(getTicketSource({ source: null as any })).toBe('BRANCH MANAGER')
      expect(getTicketSource({ source: undefined })).toBe('BRANCH MANAGER')
      expect(getTicketSource({})).toBe('BRANCH MANAGER')
      expect(getTicketSource(null)).toBe('BRANCH MANAGER')
    })

    it('standardizes role from localStorage bronx_user (e.g. hq_admin, branch, etc.)', () => {
      localStorage.setItem('bronx_user', JSON.stringify({ role: 'hq_admin' }))
      expect(getTicketSource({})).toBe('HQ ADMIN')

      localStorage.setItem('bronx_user', JSON.stringify({ role: 'branch' }))
      expect(getTicketSource({})).toBe('BRANCH ADMIN')

      localStorage.setItem('bronx_user', JSON.stringify({ role: 'branch_admin' }))
      expect(getTicketSource({})).toBe('BRANCH ADMIN')
    })

    it('supports nested or alternative role keys in bronx_user object', () => {
      localStorage.setItem('bronx_user', JSON.stringify({ role: { name: 'BRANCH TECH' } }))
      expect(getTicketSource({})).toBe('BRANCH TECH')

      localStorage.setItem('bronx_user', JSON.stringify({ role_name: 'OPS LEAD' }))
      expect(getTicketSource({})).toBe('OPS LEAD')
    })

    it('falls back to ticket direct role if localStorage bronx_user has no role or is invalid', () => {
      localStorage.setItem('bronx_user', JSON.stringify({ name: 'John Doe' }))
      const ticketWithMeta: Partial<Ticket> = {
        metadata: { role: 'Branch Supervisor' },
      }
      expect(getTicketSource(ticketWithMeta)).toBe('BRANCH SUPERVISOR')

      localStorage.setItem('bronx_user', 'invalid-json')
      expect(getTicketSource(ticketWithMeta)).toBe('BRANCH SUPERVISOR')
    })

    it('returns custom source uppercase if provided', () => {
      expect(getTicketSource({ source: 'telegram_bot' })).toBe('TELEGRAM_BOT')
    })

    it('falls back to HQ ADMIN when source, localStorage role, and metadata are all missing', () => {
      expect(getTicketSource({})).toBe('HQ ADMIN')
      expect(getTicketSource(null)).toBe('HQ ADMIN')
    })
  })

  describe('getUserRoleFromLocalStorage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('returns null if bronx_user key does not exist', () => {
      expect(getUserRoleFromLocalStorage()).toBeNull()
    })

    it('returns role string from valid bronx_user object', () => {
      localStorage.setItem('bronx_user', JSON.stringify({ role: 'BRANCH MANAGER' }))
      expect(getUserRoleFromLocalStorage()).toBe('BRANCH MANAGER')
    })

    it('returns null if bronx_user is malformed JSON or non-object', () => {
      localStorage.setItem('bronx_user', 'not-json')
      expect(getUserRoleFromLocalStorage()).toBeNull()

      localStorage.setItem('bronx_user', JSON.stringify(12345))
      expect(getUserRoleFromLocalStorage()).toBeNull()
    })
  })

  describe('getTicketPhone', () => {
    it('returns direct phone if present', () => {
      expect(getTicketPhone({ reporter_phone: '012345678' })).toBe('012345678')
      expect(getTicketPhone({ phone: '098765432' })).toBe('098765432')
    })

    it('returns fallback phones based on source role', () => {
      expect(getTicketPhone({ source: 'branch' })).toBe('0964096111')
      expect(getTicketPhone({ source: 'hq' })).toBe('0928989888')
    })
  })

  describe('getSourceCategory', () => {
    it('categorizes hq, branch, and other sources correctly', () => {
      expect(getSourceCategory('HQ ADMIN')).toBe('hq')
      expect(getSourceCategory('BRANCH ADMIN')).toBe('branch')
      expect(getSourceCategory('CLIENT API')).toBe('other')
      expect(getSourceCategory('TELEGRAM')).toBe('other')
    })
  })
})

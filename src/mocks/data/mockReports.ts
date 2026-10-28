import type { DashboardReportsResponse, TrendPoint } from '@/types/ticket'
import type { ReportFilterParams } from '@/api/reportApi'

function generateTrendPoints(days = 14): TrendPoint[] {
  const points: TrendPoint[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseCount = isWeekend ? 1 : 3
    const jitter = Math.floor(Math.sin(i * 0.8) * 2) + Math.floor(Math.random() * 2)
    points.push({
      date: dateStr || '',
      count: Math.max(1, baseCount + jitter),
    })
  }

  return points
}

export function getMockReports(params: ReportFilterParams = {}): DashboardReportsResponse {
  const days = params.days || 14
  const trends = generateTrendPoints(Math.min(30, Math.max(7, days)))

  return {
    success: true,
    summary: {
      total_tickets: 25,
      open_tickets: 6,
      in_progress_tickets: 6,
      resolved_tickets: 6,
      closed_tickets: 7,
      critical_tickets: 2,
      high_tickets: 19,
      medium_tickets: 4,
      low_tickets: 0,
      resolution_rate: 52.0,
      avg_resolution_hours: 3.5,
    },
    by_status: {
      open: 6,
      in_progress: 6,
      resolved: 6,
      closed: 7,
    },
    by_type: {
      bug: 20,
      enhancement: 2,
      question: 2,
      task: 1,
    },
    by_priority: {
      critical: 2,
      high: 19,
      medium: 4,
      low: 0,
    },
    telegram_subscribers: {
      total: 4,
      active: 4,
      resolvers: 2,
      requesters: 2,
    },
    telegram_invited: {
      total: 15,
      used: 11,
      available: 4,
      expired: 0,
      conversion_rate: 73.3,
    },
    by_source: {
      admin: 11,
      api: 8,
      telegram_bot: 4,
      branch: 2,
    },
    top_clients: [
      { client_name: 'Bronx Mobile Storefront (iOS & Android)', count: 11 },
      { client_name: 'Branch POS Terminal Sync', count: 7 },
      { client_name: 'Customer Helpdesk Ingestion Webhook', count: 4 },
      { client_name: 'E-Commerce Payment Gateway Monitor', count: 3 },
    ],
    trends,
  }
}

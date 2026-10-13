import type { DashboardReportsResponse, TrendPoint } from '@/types/ticket';
import type { ReportFilterParams } from '@/api/reportApi';

function generateTrendPoints(days = 14): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    // Realistic curve with weekday peaks and weekend dips
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseCount = isWeekend ? 3 : 12;
    const jitter = Math.floor(Math.sin(i * 0.8) * 4) + Math.floor(Math.random() * 3);
    points.push({
      date: dateStr || '',
      count: Math.max(1, baseCount + jitter),
    });
  }

  return points;
}

export function getMockReports(params: ReportFilterParams = {}): DashboardReportsResponse {
  const days = params.days || 14;
  const trends = generateTrendPoints(Math.min(30, Math.max(7, days)));

  return {
    success: true,
    summary: {
      total_tickets: 48,
      open_tickets: 14,
      in_progress_tickets: 15,
      resolved_tickets: 12,
      closed_tickets: 7,
      critical_tickets: 6,
      high_tickets: 15,
      medium_tickets: 18,
      low_tickets: 9,
      resolution_rate: 76.5,
      avg_resolution_hours: 4.8,
    },
    by_status: {
      open: 14,
      in_progress: 15,
      resolved: 12,
      closed: 7,
    },
    by_priority: {
      critical: 6,
      high: 15,
      medium: 18,
      low: 9,
    },
    by_source: {
      admin: 18,
      api: 16,
      telegram_bot: 9,
      branch: 5,
    },
    by_type: {
      bug: 20,
      enhancement: 14,
      question: 8,
      task: 6,
    },
    top_clients: [
      { client_name: 'Bronx Mobile Storefront (iOS & Android)', count: 16 },
      { client_name: 'Branch POS Terminal Sync', count: 12 },
      { client_name: 'Customer Helpdesk Ingestion Webhook', count: 9 },
      { client_name: 'E-Commerce Payment Gateway Monitor', count: 7 },
      { client_name: 'Branch #3 Battambang Store', count: 4 },
    ],
    trends,
  };
}

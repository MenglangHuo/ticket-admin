import apiClient from './client';
import type { DashboardReportsResponse } from '@/types/ticket';

export interface ReportFilterParams {
  company_id?: number | string;
  date_from?: string;
  date_to?: string;
  from_date?: string;
  to_date?: string;
  days?: number;
  refresh?: boolean;
  signal?: AbortSignal;
}

export const reportApi = {
  async getReports(params: ReportFilterParams = {}): Promise<DashboardReportsResponse> {
    const cleanParams: Record<string, any> = {};
    if (params.company_id) cleanParams.company_id = params.company_id;
    if (params.date_from) cleanParams.date_from = params.date_from;
    if (params.date_to) cleanParams.date_to = params.date_to;
    if (params.from_date && !cleanParams.date_from) cleanParams.date_from = params.from_date;
    if (params.to_date && !cleanParams.date_to) cleanParams.date_to = params.to_date;
    if (params.days && !cleanParams.date_from && !cleanParams.date_to) cleanParams.days = params.days;
    if (params.refresh) cleanParams.refresh = 1;

    const response = await apiClient.get<{ data?: DashboardReportsResponse } & DashboardReportsResponse>(
      '/tickets/reports',
      {
        params: cleanParams,
        signal: params.signal,
      }
    );
    // In case the API wraps the result in data: { ... } or returns directly
    if (response.data && response.data.summary) {
      return response.data;
    } else if ((response.data as any)?.data?.summary) {
      return (response.data as any).data;
    }
    return response.data;
  },
};

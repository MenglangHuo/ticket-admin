import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { DashboardReportsResponse } from '@/types/ticket';
import { reportApi } from '@/api/reportApi';

function getDefaultMonthRange(): { date_from: string; date_to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { date_from: start, date_to: end };
}

export const useReportStore = defineStore('reports', () => {
  const initialRange = getDefaultMonthRange();
  const dateFrom = ref<string>(initialRange.date_from);
  const dateTo = ref<string>(initialRange.date_to);
  const selectedPreset = ref<string>('this_month');
  const selectedCompanyId = ref<number | undefined>(undefined);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  // In-memory cache to make re-visiting presets 0ms instant
  const memoryCache = new Map<string, DashboardReportsResponse>();
  let activeAbortController: AbortController | null = null;

  const reportData = ref<DashboardReportsResponse>({
    summary: {
      total_tickets: 0,
      open_tickets: 0,
      in_progress_tickets: 0,
      resolved_tickets: 0,
      closed_tickets: 0,
      critical_tickets: 0,
      high_tickets: 0,
      medium_tickets: 0,
      low_tickets: 0,
      resolution_rate: 0,
      avg_resolution_hours: 0,
    },
    by_status: {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    },
    by_priority: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    by_source: {},
    by_type: {
      bug: 0,
      enhancement: 0,
      question: 0,
      task: 0,
    },
    top_clients: [],
    trends: [],
    success: true,
  });

  interface FetchOptions {
    date_from?: string;
    date_to?: string;
    preset?: string;
    company_id?: number | string;
    refresh?: boolean;
    days?: number;
  }

  // Fetch reports with date_from & date_to parameters and request cancellation
  async function fetchReports(optionsOrDays?: FetchOptions | number) {
    if (typeof optionsOrDays === 'number') {
      // Backward compatibility if called with days
      const now = new Date();
      const past = new Date();
      past.setDate(past.getDate() - (optionsOrDays - 1));
      const pad = (n: number) => String(n).padStart(2, '0');
      dateFrom.value = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
      dateTo.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    } else if (optionsOrDays) {
      if (optionsOrDays.date_from) dateFrom.value = optionsOrDays.date_from;
      if (optionsOrDays.date_to) dateTo.value = optionsOrDays.date_to;
      if (optionsOrDays.preset) selectedPreset.value = optionsOrDays.preset;
      if (optionsOrDays.company_id !== undefined) {
        selectedCompanyId.value =
          typeof optionsOrDays.company_id === 'number'
            ? optionsOrDays.company_id
            : Number(optionsOrDays.company_id);
      }
    }

    const isRefresh = typeof optionsOrDays === 'object' && Boolean(optionsOrDays.refresh);
    const cacheKey = `${dateFrom.value}_${dateTo.value}_${selectedCompanyId.value ?? ''}`;

    // If cached and not explicit refresh, populate immediately for instant UI
    if (!isRefresh && memoryCache.has(cacheKey)) {
      reportData.value = memoryCache.get(cacheKey)!;
    }

    // Cancel any previous in-flight request to prevent race conditions
    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    isLoading.value = true;
    error.value = null;

    try {
      const res = await reportApi.getReports({
        company_id: selectedCompanyId.value,
        date_from: dateFrom.value,
        date_to: dateTo.value,
        refresh: isRefresh,
        signal: activeAbortController.signal,
      });

      if (res && res.summary) {
        reportData.value = res;
        memoryCache.set(cacheKey, res);
        lastUpdated.value = new Date();
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return; // Normal abort, ignore
      }
      error.value = err.response?.data?.message || err.message || 'Failed to fetch reports from API';
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshReports() {
    return fetchReports({ refresh: true });
  }

  return {
    dateFrom,
    dateTo,
    selectedPreset,
    selectedCompanyId,
    isLoading,
    error,
    lastUpdated,
    reportData,
    fetchReports,
    refreshReports,
  };
});

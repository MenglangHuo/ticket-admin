import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useReportStore } from '@/stores/reportStore';
import { reportApi } from '@/api/reportApi';

describe('useReportStore & Date Range Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with default this_month preset and valid date_from / date_to', () => {
    const store = useReportStore();
    expect(store.selectedPreset).toBe('this_month');
    expect(store.dateFrom).toMatch(/^\d{4}-\d{2}-01$/);
    expect(store.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(store.isLoading).toBe(false);
  });

  it('fetches reports passing date_from and date_to parameters to reportApi', async () => {
    const mockReportData = {
      summary: {
        total_tickets: 35,
        open_tickets: 10,
        in_progress_tickets: 5,
        resolved_tickets: 8,
        closed_tickets: 12,
        critical_tickets: 3,
        high_tickets: 12,
        medium_tickets: 10,
        low_tickets: 10,
        resolution_rate: 57.1,
        avg_resolution_hours: 48.0,
      },
      by_status: { open: 10, in_progress: 5, resolved: 8, closed: 12 },
      by_priority: { critical: 3, high: 12, medium: 10, low: 10 },
      by_source: { client_api: 0, internal: 35 },
      by_type: { bug: 15, enhancement: 10, question: 4, task: 6 },
      top_clients: [],
      trends: [],
      success: true,
    };

    const spy = vi.spyOn(reportApi, 'getReports').mockResolvedValue(mockReportData);

    const store = useReportStore();
    await store.fetchReports({
      date_from: '2026-10-01',
      date_to: '2026-10-31',
      preset: 'this_month',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        date_from: '2026-10-01',
        date_to: '2026-10-31',
      })
    );

    expect(store.reportData.summary.total_tickets).toBe(35);
    expect(store.reportData.by_type.bug).toBe(15);
  });

  it('handles in-memory caching and force refresh', async () => {
    const mockData = {
      summary: {
        total_tickets: 20,
        open_tickets: 5,
        in_progress_tickets: 5,
        resolved_tickets: 5,
        closed_tickets: 5,
        critical_tickets: 2,
        high_tickets: 5,
        medium_tickets: 5,
        low_tickets: 8,
        resolution_rate: 50,
        avg_resolution_hours: 24,
      },
      by_status: { open: 5, in_progress: 5, resolved: 5, closed: 5 },
      by_priority: { critical: 2, high: 5, medium: 5, low: 8 },
      by_source: {},
      by_type: { bug: 10, enhancement: 5, question: 2, task: 3 },
      top_clients: [],
      trends: [],
      success: true,
    };

    const spy = vi.spyOn(reportApi, 'getReports').mockResolvedValue(mockData);

    const store = useReportStore();
    await store.fetchReports({ date_from: '2026-10-01', date_to: '2026-10-07' });
    expect(spy).toHaveBeenCalledTimes(1);

    // Call again with same dates - should use memory cache immediately
    await store.fetchReports({ date_from: '2026-10-01', date_to: '2026-10-07' });
    expect(store.reportData.summary.total_tickets).toBe(20);

    // Call refreshReports - should bypass cache with refresh: true
    await store.refreshReports();
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        refresh: true,
      })
    );
  });
});

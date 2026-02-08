/**
 * Benchmarking Query Hook
 *
 * TanStack Query wrapper for benchmarking/analytics data.
 * Uses canonical key BENCHMARKING_QUERY_KEY so prefetch, hook, and restore share one cache entry.
 *
 * Invalidation: Only survey upload, survey delete, or mapping changes should invalidate
 * benchmarking cache. No invalidation on navigation, window focus, or mount.
 *
 * COMPATIBILITY: Matches exact interface of useAnalyticsData hook
 * to ensure seamless integration with existing SurveyAnalytics component.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnalyticsDataService } from '../services/analyticsDataService';
import { getDataService } from '../../../services/DataService';
import { BENCHMARKING_QUERY_KEY } from '../../../shared/services/queryClient';
import { createQueryFn } from '../../../shared/services/queryFetcher';
import { trackFetch } from '../../../shared/hooks/useQueryTelemetry';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import { AnalyticsFilters, AggregatedData } from '../types/analytics';
import { DynamicAggregatedData } from '../types/variables';
import { filterAnalyticsData } from '../utils/analyticsCalculations';

interface UseBenchmarkingQueryOptions {
  initialFilters?: AnalyticsFilters;
  selectedVariables?: string[]; // For compatibility with existing hook
}

interface BenchmarkingQueryData {
  data: AggregatedData[] | DynamicAggregatedData[]; // Support both old and new data formats
  mappings: any[];
  columnMappings: any[];
  regionMappings: any[];
}

/**
 * Hook return interface - matches UseAnalyticsReturn exactly
 */
export interface UseBenchmarkingQueryReturn {
  data: AggregatedData[] | DynamicAggregatedData[]; // Filtered data for display (supports both formats)
  allData: AggregatedData[] | DynamicAggregatedData[]; // All data for filter options (supports both formats)
  loading: boolean;
  loadingProgress: number;
  error: string | null;
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  refetch: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  exportToExcel: () => void;
  exportToCSV: () => void;
}

/**
 * Fetch function for benchmarking data
 * Exported for use in prefetching
 */
export async function fetchBenchmarkingData(
  filters: AnalyticsFilters,
  signal?: AbortSignal
): Promise<BenchmarkingQueryData> {
  const startTime = performance.now();
  
  try {
    // Check if aborted
    if (signal?.aborted) {
      throw new Error('Query was aborted');
    }

    const dataService = getDataService();
    const analyticsDataService = new AnalyticsDataService();

    // CRITICAL FIX: Use getAnalyticsDataByVariables instead of getAnalyticsData
    // getAnalyticsData only processes TCC, wRVU, and CF (old format)
    // getAnalyticsDataByVariables processes ALL variables (base_salary, on_call_compensation, etc.)
    // Pass empty array to process ALL variables (no filtering)
    const [allData, specialtyMappings, columnMappings, regionMappings] = await Promise.all([
      analyticsDataService.getAnalyticsDataByVariables({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      }, []), // Empty array = process ALL variables
      dataService.getAllSpecialtyMappings(),
      dataService.getAllColumnMappings(),
      dataService.getRegionMappings()
    ]);

    const fetchTime = performance.now() - startTime;
    trackFetch(fetchTime);

    return {
      data: allData,
      mappings: specialtyMappings,
      columnMappings,
      regionMappings,
    };
  } catch (error) {
    const fetchTime = performance.now() - startTime;
    trackFetch(fetchTime);
    
    throw error;
  }
}

/**
 * Hook for fetching benchmarking data with TanStack Query
 * 
 * COMPATIBILITY: Matches useAnalyticsData hook interface exactly
 * Uses stale-while-revalidate pattern:
 * - Shows cached data immediately if available
 * - Refreshes in background if data is stale
 * - No loading spinner on return navigation (if cached)
 */
export const useBenchmarkingQuery = (
  initialFilters: AnalyticsFilters = {
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '',
    year: ''
  },
  selectedVariables: string[] = []
): UseBenchmarkingQueryReturn => {
  const queryClient = useQueryClient();
  
  // Local filter state (matches useAnalyticsData behavior)
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  
  // Loading progress hook (matches useAnalyticsData)
  const { progress: loadingProgress, startProgress, completeProgress, resetProgress } = useSmoothProgress();

  // Canonical key: single cache entry for full benchmarking dataset (filter in UI)
  const queryKey = BENCHMARKING_QUERY_KEY;

  // Query options with caching policy
  const query = useQuery<BenchmarkingQueryData>({
    queryKey,
    queryFn: createQueryFn((signal) => fetchBenchmarkingData(initialFilters, signal)),
    enabled: true,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - benchmarking data changes only on upload
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache for a week
    refetchOnWindowFocus: false, // Don't refetch on focus - data only changes on upload (which invalidates cache)
    refetchOnMount: false, // Don't refetch if data is fresh (stale-while-revalidate)
    refetchOnReconnect: false, // Don't refetch on reconnect - data is local
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data (v5 API)
  });

  // Start/stop progress only when we have no data (initial load). Don't show loading during background refetch.
  useEffect(() => {
    if (query.isLoading) {
      startProgress();
    } else {
      completeProgress();
      resetProgress();
    }
  }, [query.isLoading, startProgress, completeProgress, resetProgress]);

  // Apply filters client-side (matches useAnalyticsData behavior)
  // NOTE: Component may re-filter this data, but we maintain interface compatibility
  const filteredData = useMemo(() => {
    if (!query.data || !query.data.data) return [];
    return filterAnalyticsData(query.data.data, filters);
  }, [query.data, filters]);

  // Refetch function (matches interface)
  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  // Force refresh function (matches interface)
  const forceRefresh = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: BENCHMARKING_QUERY_KEY });
    await query.refetch();
  }, [queryClient, query]);

  // Export functions (matches interface - import dynamically to avoid bundle bloat)
  const exportToExcel = useCallback(() => {
    if (filteredData.length === 0) {
      console.warn('No data to export');
      return;
    }
    
    // Dynamic import to avoid bundle bloat
    import('../utils/exportUtils').then(({ exportToExcel: exportToExcelUtil }) => {
      exportToExcelUtil(filteredData, filters, selectedVariables);
    });
  }, [filteredData, filters, selectedVariables]);

  const exportToCSV = useCallback(() => {
    if (filteredData.length === 0) {
      console.warn('No data to export');
      return;
    }
    
    // Dynamic import to avoid bundle bloat
    import('../utils/exportUtils').then(({ exportToCSV: exportToCSVUtil }) => {
      exportToCSVUtil(filteredData, filters, selectedVariables);
    });
  }, [filteredData, filters, selectedVariables]);

  // Return interface matching useAnalyticsData exactly.
  // loading = only when no cached data (isLoading). When we have data, never show skeleton (stale-while-revalidate).
  return {
    data: filteredData, // Filtered data for display
    allData: query.data?.data || [], // All data for filter options
    loading: query.isLoading,
    loadingProgress,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    filters,
    setFilters,
    refetch,
    forceRefresh,
    exportToExcel,
    exportToCSV,
  };
};

/**
 * Invalidate benchmarking queries.
 * Call only when surveys are uploaded/deleted or mappings are updated (not on navigation/focus).
 */
export const invalidateBenchmarkingQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: BENCHMARKING_QUERY_KEY });
};


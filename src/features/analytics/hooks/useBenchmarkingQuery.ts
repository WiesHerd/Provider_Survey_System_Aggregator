/**
 * Benchmarking Query Hook
 * 
 * TanStack Query wrapper for benchmarking/analytics data.
 * Provides instant render with background refresh pattern.
 * 
 * COMPATIBILITY: Matches exact interface of useAnalyticsData hook
 * to ensure seamless integration with existing SurveyAnalytics component.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnalyticsDataService } from '../services/analyticsDataService';
import { getDataService } from '../../../services/DataService';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn, createFiltersHash } from '../../../shared/services/queryFetcher';
import { trackFetch } from '../../../shared/hooks/useQueryTelemetry';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import { AnalyticsFilters, AggregatedData } from '../types/analytics';
import { filterAnalyticsData } from '../utils/analyticsCalculations';

interface UseBenchmarkingQueryOptions {
  initialFilters?: AnalyticsFilters;
  selectedVariables?: string[]; // For compatibility with existing hook
}

interface BenchmarkingQueryData {
  data: AggregatedData[];
  mappings: any[];
  columnMappings: any[];
  regionMappings: any[];
}

/**
 * Hook return interface - matches UseAnalyticsReturn exactly
 */
export interface UseBenchmarkingQueryReturn {
  data: AggregatedData[]; // Filtered data for display
  allData: AggregatedData[]; // All data for filter options
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
 */
async function fetchBenchmarkingData(
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

    // Fetch all data (no filtering at service level - filter in UI)
    // Use getAnalyticsData with empty filters to get all data
    const [allData, specialtyMappings, columnMappings, regionMappings] = await Promise.all([
      analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      }),
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

  // Query key for caching (always fetch all data, filter in UI)
  const queryKey = queryKeys.benchmarking({
    year: '', // Always fetch all data - filtering happens client-side
    specialty: '',
    providerType: '',
    region: '',
    surveySource: '',
  });

  // Query options with caching policy
  const query = useQuery<BenchmarkingQueryData>({
    queryKey,
    queryFn: createQueryFn((signal) => fetchBenchmarkingData(initialFilters, signal)),
    enabled: true,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - benchmarking data changes only on upload
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache for a week
    refetchOnWindowFocus: true, // Refresh on window focus
    refetchOnMount: false, // Don't refetch if data is fresh (stale-while-revalidate)
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data (v5 API)
  });

  // Start/stop progress based on loading state
  useEffect(() => {
    if (query.isLoading || query.isFetching) {
      startProgress();
    } else {
      completeProgress();
      resetProgress();
    }
  }, [query.isLoading, query.isFetching, startProgress, completeProgress, resetProgress]);

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
    queryClient.invalidateQueries({ queryKey });
    await query.refetch();
  }, [queryClient, queryKey, query]);

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

  // Return interface matching useAnalyticsData exactly
  return {
    data: filteredData, // Filtered data for display
    allData: query.data?.data || [], // All data for filter options
    loading: query.isLoading || query.isFetching,
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
 * Invalidate benchmarking queries
 * Call this when surveys are uploaded/deleted or mappings are updated
 */
export const invalidateBenchmarkingQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['benchmarking'] });
};


/**
 * Regional Analytics Query Hook
 * 
 * TanStack Query wrapper for regional analytics data.
 * Provides instant render with background refresh pattern.
 * 
 * COMPATIBILITY: Matches exact interface of useRegionalData hook
 * to ensure seamless integration with existing RegionalAnalytics component.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDataService } from '../../../services/DataService';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn } from '../../../shared/services/queryFetcher';
import { trackFetch } from '../../../shared/hooks/useQueryTelemetry';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import { 
  RegionalData, 
  RegionalFilters, 
  RegionalSummary,
  RegionalCalculationParams 
} from '../types/regional';
import { calculateRegionalAnalytics, REGION_NAMES } from '../utils/regionalCalculations';
import { ProviderType, GeographicRegion, SurveySource } from '../../../shared/types';

interface RegionalQueryData {
  rawData: any[];
  mappings: any[];
}

/**
 * Fetch function for regional analytics data
 */
async function fetchRegionalData(
  signal?: AbortSignal
): Promise<RegionalQueryData> {
  const startTime = performance.now();
  
  try {
    // Check if aborted
    if (signal?.aborted) {
      throw new Error('Query was aborted');
    }

    const dataService = getDataService();

    // Get specialty mappings and surveys in parallel
    const [allMappings, surveys] = await Promise.all([
      dataService.getAllSpecialtyMappings(),
      dataService.getAllSurveys()
    ]);

    console.log(`📋 Loaded ${allMappings.length} specialty mappings`);
    console.log(`📊 Found ${surveys.length} surveys`);

    // Load data from each survey
    let allRows: any[] = [];

    for (const survey of surveys) {
      if (signal?.aborted) {
        throw new Error('Query was aborted');
      }

      console.log(`🔍 Loading data for survey: ${survey.id}`);
      const data = await dataService.getSurveyData(survey.id, undefined, { limit: 10000 });
      
      if (data && data.rows) {
        console.log(`✅ Loaded ${data.rows.length} rows from survey ${survey.id}`);
        
        const surveySource = (survey as any).type || 'Survey';
        const transformedRows = data.rows.map((row: any) => ({
          ...row,
          surveySource: surveySource,
          specialty: row.specialty || row.normalizedSpecialty || '',
          geographicRegion: row.geographic_region || row.region,
          tcc_p25: row.tcc_p25,
          tcc_p50: row.tcc_p50,
          tcc_p75: row.tcc_p75,
          tcc_p90: row.tcc_p90,
          cf_p25: row.cf_p25,
          cf_p50: row.cf_p50,
          cf_p75: row.cf_p75,
          cf_p90: row.cf_p90,
          wrvu_p25: row.wrvu_p25,
          wrvu_p50: row.wrvu_p50,
          wrvu_p75: row.wrvu_p75,
          wrvu_p90: row.wrvu_p90,
        }));
        
        allRows = allRows.concat(transformedRows);
      }
    }

    console.log(`🎯 Total rows loaded: ${allRows.length}`);

    const fetchTime = performance.now() - startTime;
    trackFetch(fetchTime);

    return {
      rawData: allRows,
      mappings: allMappings,
    };
  } catch (error) {
    const fetchTime = performance.now() - startTime;
    trackFetch(fetchTime);
    
    throw error;
  }
}

/**
 * Hook return interface - matches UseRegionalDataReturn exactly
 */
export interface UseRegionalQueryReturn {
  // Data
  data: RegionalData[];
  summary: RegionalSummary | null;
  rawData: any[];
  mappings: any[];
  
  // State
  loading: boolean;
  error: string | null;
  selectedSpecialty: string;
  
  // Filters
  filters: RegionalFilters;
  availableOptions: {
    specialties: string[];
    providerTypes: ProviderType[];
    regions: GeographicRegion[];
    surveySources: SurveySource[];
    years: string[];
  };
  
  // Actions
  setSelectedSpecialty: (specialty: string) => void;
  setFilters: (filters: RegionalFilters) => void;
  clearFilters: () => void;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for fetching regional analytics data with TanStack Query
 * 
 * COMPATIBILITY: Matches useRegionalData hook interface exactly
 */
export const useRegionalQuery = (
  initialFilters: RegionalFilters = {}
): UseRegionalQueryReturn => {
  const queryClient = useQueryClient();
  
  // Local state (matches useRegionalData behavior)
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [filters, setFilters] = useState<RegionalFilters>(initialFilters);
  
  // Loading progress hook
  const { progress: loadingProgress, startProgress, completeProgress, resetProgress } = useSmoothProgress();

  // Query key for caching
  const queryKey = queryKeys.regional({
    specialty: '',
    providerType: '',
    surveySource: '',
    year: '',
  });

  // Query options with caching policy
  const query = useQuery<RegionalQueryData>({
    queryKey,
    queryFn: createQueryFn((signal) => fetchRegionalData(signal)),
    enabled: true,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - regional data changes only on upload
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    refetchOnWindowFocus: false, // Don't refetch on focus - data only changes on upload (which invalidates cache)
    refetchOnMount: false, // Don't refetch if data is fresh (stale-while-revalidate)
    refetchOnReconnect: false, // Don't refetch on reconnect - data is local
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (v5 API)
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

  // Calculate available options from raw data (matches useRegionalData)
  const availableOptions = useMemo(() => {
    if (!query.data) {
      return {
        specialties: [],
        providerTypes: [],
        regions: [],
        surveySources: [],
        years: [],
      };
    }

    const specialties = [...new Set(query.data.mappings.map((m: any) => m.standardizedName))].sort() as string[];
    const providerTypes = [...new Set(query.data.rawData.map((row: any) => row.providerType))].sort() as ProviderType[];
    const regions = [...new Set(query.data.rawData.map((row: any) => row.geographicRegion))].sort() as GeographicRegion[];
    const surveySources = [...new Set(query.data.rawData.map((row: any) => row.surveySource))].sort() as SurveySource[];
    const years = [...new Set(query.data.rawData.map((row: any) => row.surveyYear))].filter(Boolean).sort() as string[];

    return {
      specialties,
      providerTypes,
      regions,
      surveySources,
      years,
    };
  }, [query.data]);

  // Calculate regional data based on selected specialty and filters (matches useRegionalData)
  const { data, summary } = useMemo(() => {
    if (!selectedSpecialty || !query.data || query.data.rawData.length === 0) {
      return { data: [], summary: null };
    }

    try {
      // Update filters with selected specialty
      const updatedFilters = { ...filters, specialty: selectedSpecialty };

      const calculationParams: RegionalCalculationParams = {
        data: query.data.rawData,
        filters: updatedFilters,
        regions: REGION_NAMES,
        metrics: ['tcc', 'cf', 'wrvus'],
      };

      const result = calculateRegionalAnalytics(calculationParams, query.data.mappings);
      return {
        data: result.regionalData,
        summary: result.summary,
      };
    } catch (err) {
      console.error('Error calculating regional data:', err);
      return { data: [], summary: null };
    }
  }, [selectedSpecialty, filters, query.data]);

  // Actions (matches interface)
  const handleSetFilters = useCallback((newFilters: RegionalFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleRefreshData = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey });
    await query.refetch();
  }, [queryClient, queryKey, query]);

  const handleClearError = useCallback(() => {
    // Error is managed by query, but we maintain interface compatibility
  }, []);

  // Return interface matching useRegionalData exactly
  return {
    // Data
    data,
    summary,
    rawData: query.data?.rawData || [],
    mappings: query.data?.mappings || [],
    
    // State
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    selectedSpecialty,
    
    // Filters
    filters,
    availableOptions,
    
    // Actions
    setSelectedSpecialty,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,
    refreshData: handleRefreshData,
    clearError: handleClearError,
  };
};

/**
 * Invalidate regional queries
 * Call this when surveys are uploaded/deleted or mappings are updated
 */
export const invalidateRegionalQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['regional'] });
};


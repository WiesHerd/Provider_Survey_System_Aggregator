/**
 * TanStack Query hook for fetching survey data (for DataPreview component)
 * 
 * Provides caching for survey data to enable instant navigation.
 * Matches the interface expected by DataPreview component.
 */

import { useQuery } from '@tanstack/react-query';
import { getDataService } from '../../../services/DataService';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn } from '../../../shared/services/queryFetcher';
import { trackFetch } from '../../../shared/hooks/useQueryTelemetry';

// IMPORTANT: Avoid returning a new [] on every render when query.data is undefined.
// A changing array reference can trigger downstream effects that set state repeatedly.
const EMPTY_SURVEY_DATA: any[] = [];

interface SurveyDataFilters {
  specialty?: string;
  providerType?: string;
  region?: string;
  variable?: string;
}

interface SurveyDataQueryParams {
  surveyId: string;
  filters: SurveyDataFilters;
  limit?: number;
}

async function fetchSurveyData(params: SurveyDataQueryParams, signal?: AbortSignal): Promise<any[]> {
  const startTime = performance.now();
  const dataService = getDataService();
  
  if (signal?.aborted) {
    throw new Error('Query was aborted');
  }
  
  const { rows } = await dataService.getSurveyData(
    params.surveyId,
    params.filters,
    { limit: params.limit || 10000 }
  );
  
  const fetchTime = performance.now() - startTime;
  trackFetch(fetchTime);
  
  return rows;
}

/**
 * Hook for fetching survey data with TanStack Query caching
 * 
 * @param surveyId - ID of the survey to fetch
 * @param filters - Filters to apply (specialty, providerType, region, variable)
 * @param limit - Maximum number of rows to fetch (default: 10000)
 * @param enabled - Whether the query should run (default: true)
 */
export const useSurveyDataQuery = (
  surveyId: string,
  filters: SurveyDataFilters = {},
  limit: number = 10000,
  enabled: boolean = true
) => {
  // Create filters hash for cache key
  const filtersHash = JSON.stringify(filters);
  const queryKey = queryKeys.surveyData(surveyId, filtersHash);
  
  const query = useQuery<any[]>({
    queryKey,
    queryFn: createQueryFn((signal) => fetchSurveyData({ surveyId, filters, limit }, signal)),
    enabled: enabled && !!surveyId,
    staleTime: 1000 * 60 * 5, // 5 minutes - survey data doesn't change often
    gcTime: 1000 * 60 * 60, // 1 hour - keep in cache for 1 hour
    refetchOnWindowFocus: false, // Don't refetch on focus (data rarely changes)
    refetchOnMount: false, // Use cached data if available
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
  
  return {
    data: query.data ?? EMPTY_SURVEY_DATA,
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    refetch: query.refetch,
  };
};


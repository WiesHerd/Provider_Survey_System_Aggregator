/**
 * TanStack Query hook for fetching survey list (for SurveyUpload component)
 * 
 * Provides caching for survey list to enable instant navigation.
 * Matches the interface expected by SurveyUpload component.
 */

import { useQuery } from '@tanstack/react-query';
import { getDataService } from '../../../services/DataService';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn } from '../../../shared/services/queryFetcher';
import { trackFetch } from '../../../shared/hooks/useQueryTelemetry';
import { getPerformanceOptimizedDataService } from '../../../services/PerformanceOptimizedDataService';

// IMPORTANT: Avoid returning a new [] on every render when query.data is undefined.
// A changing array reference can trigger downstream effects that set state repeatedly.
const EMPTY_SURVEY_LIST: any[] = [];

async function fetchSurveyList(year?: string, providerType?: string, signal?: AbortSignal): Promise<any[]> {
  const startTime = performance.now();
  
  if (signal?.aborted) {
    throw new Error('Query was aborted');
  }
  
  // Use performance service for caching (5-minute TTL)
  const performanceService = getPerformanceOptimizedDataService();
  const cacheKey = `all_surveys_${year || 'all'}_${providerType || 'all'}`;
  
  // CRITICAL FIX: Don't use performance cache for upload screen queries
  // The performance cache can return stale data (0 surveys) even when database has surveys
  // React Query's cache is sufficient and more reliable for this use case
  // Only check performance cache if explicitly needed (not for upload screen)
  // const cached = performanceService.getCacheEntry<any[]>(cacheKey);
  // if (cached) {
  //   console.log('🎯 Cache hit for survey list');
  //   const fetchTime = performance.now() - startTime;
  //   trackFetch(fetchTime);
  //   return cached;
  // }
  
  console.log('🚀 Loading survey list from IndexedDB...', { year, providerType });
  const dataService = getDataService();
  const allSurveys = await dataService.getAllSurveys();
  console.log(`📊 Loaded ${allSurveys.length} total surveys from IndexedDB`);
  
  // Filter by year if provided
  let filteredSurveys = allSurveys;
  if (year) {
    const beforeCount = filteredSurveys.length;
    filteredSurveys = filteredSurveys.filter((survey: any) => {
      const surveyYear = survey.year || survey.surveyYear || '';
      // CRITICAL FIX: Robust year comparison - handle string/number conversion
      // Convert both to strings for comparison to handle "2025" vs 2025
      const surveyYearStr = String(surveyYear).trim();
      const filterYearStr = String(year).trim();
      const matches = surveyYearStr === filterYearStr;
      
      // Debug logging for year mismatch
      if (!matches && surveyYearStr) {
        console.log(`🔍 Year filter: survey "${survey.name}" year "${surveyYearStr}" !== filter year "${filterYearStr}"`);
      }
      
      return matches;
    });
    console.log(`📅 After year filter (${year}): ${beforeCount} → ${filteredSurveys.length} surveys`);
  }
  
  // Filter by provider type if provided
  if (providerType && providerType !== 'BOTH') {
    const beforeCount = filteredSurveys.length;
    filteredSurveys = filteredSurveys.filter((survey: any) => {
      const surveyProviderType = survey.providerType || 'PHYSICIAN'; // Default to PHYSICIAN for legacy surveys
      const surveyDataCategory = survey.dataCategory;
      
      // Check if this is a Call Pay survey (by dataCategory or name)
      const isCallPay = surveyDataCategory === 'CALL_PAY' || 
                       surveyProviderType === 'CALL' ||
                       (survey.name && survey.name.toLowerCase().includes('call pay')) ||
                       (survey.type && survey.type.toLowerCase().includes('call pay'));
      
      let matches = false;
      
      // If filtering for CALL type, show only Call Pay surveys
      if (providerType === 'CALL') {
        matches = isCallPay;
      }
      // For PHYSICIAN and APP views, exclude Call Pay surveys
      // Only show surveys that match the provider type AND are not Call Pay
      else if (providerType === 'PHYSICIAN' || providerType === 'APP') {
        matches = surveyProviderType === providerType && !isCallPay;
      }
      // For other provider types (CUSTOM, etc.), use standard filtering
      else {
        matches = surveyProviderType === providerType;
      }
      
      // Debug logging for provider type mismatch
      if (!matches) {
        console.log(`🔍 Provider filter: survey "${survey.name}" providerType "${surveyProviderType}" (isCallPay: ${isCallPay}) doesn't match filter "${providerType}"`);
      }
      
      return matches;
    });
    console.log(`👥 After provider type filter (${providerType}): ${beforeCount} → ${filteredSurveys.length} surveys`);
  }
  
  // CRITICAL FIX: Don't cache in performance service for upload screen
  // React Query handles caching, and performance cache was causing stale data issues
  // performanceService.setCacheEntry(cacheKey, filteredSurveys, 5 * 60 * 1000); // 5 minutes TTL
  
  const fetchTime = performance.now() - startTime;
  trackFetch(fetchTime);
  console.log(`✅ Survey list loaded in ${fetchTime.toFixed(2)}ms (${filteredSurveys.length} surveys)`);
  
  return filteredSurveys;
}

/**
 * Hook for fetching survey list with TanStack Query caching
 * 
 * ENTERPRISE CACHING STRATEGY:
 * - Surveys only change when explicitly uploaded/deleted (which invalidates cache)
 * - No need to refetch on window focus or after short intervals
 * - Provides instant navigation with cached data (0ms response time)
 * - Cache persists for 30 minutes (staleTime) and 24 hours in memory (gcTime)
 * - Automatic cache invalidation on upload/delete operations
 * 
 * @param year - Year to filter by (optional)
 * @param providerType - Provider type to filter by (optional, 'BOTH' means no filter)
 * @param enabled - Whether the query should run (default: true)
 */
export const useSurveyListQuery = (
  year?: string,
  providerType?: string,
  enabled: boolean = true
) => {
  const queryKey = queryKeys.surveyList(year, providerType);
  
  const query = useQuery<any[]>({
    queryKey,
    queryFn: createQueryFn((signal) => fetchSurveyList(year, providerType, signal)),
    enabled,
    // ENTERPRISE: 30 minutes staleTime - surveys only change on upload/delete (which invalidates cache)
    // This eliminates unnecessary IndexedDB reads and provides instant navigation
    staleTime: 1000 * 60 * 30, // 30 minutes
    // ENTERPRISE: 24 hours gcTime - keep surveys in memory for entire session
    // Survey list is small (~100KB for 100 surveys), so memory impact is minimal
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    // ENTERPRISE: Disable refetch on window focus - surveys don't change unless explicitly uploaded/deleted
    // Cache invalidation on upload/delete handles updates automatically
    refetchOnWindowFocus: false,
    // CRITICAL FIX: Refetch on mount to ensure fresh data after cache invalidation
    // This ensures surveys appear immediately after upload
    refetchOnMount: true,
    // Keep previous data visible while fetching in background (stale-while-revalidate)
    placeholderData: (previousData) => previousData,
  });
  
  // ENTERPRISE: Cache debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    if (query.dataUpdatedAt > 0) {
      const cacheAge = Date.now() - query.dataUpdatedAt;
      const isStale = cacheAge > 1000 * 60 * 30; // 30 minutes
      const source = query.isFetching ? 'fetching' : (isStale ? 'stale-cache' : 'fresh-cache');
      console.log(`🔍 Survey List Cache: ${source} (age: ${Math.round(cacheAge / 1000)}s, count: ${query.data?.length || 0})`);
    }
  }
  
  return {
    data: query.data ?? EMPTY_SURVEY_LIST,
    // ENTERPRISE: Show loading only on initial load (isLoading), not background refresh (isFetching)
    // This provides instant navigation with cached data, but shows spinner on first load
    loading: query.isLoading,
    // Expose isFetching separately for subtle background refresh indicators
    isFetching: query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    refetch: query.refetch,
  };
};


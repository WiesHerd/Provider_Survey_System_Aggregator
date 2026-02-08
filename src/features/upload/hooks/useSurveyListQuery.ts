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
import { getOrphanedSurveyService } from '../../../services/OrphanedSurveyService';
import { filterSurveysByProviderType } from '../utils/surveyListFilters';

// IMPORTANT: Avoid returning a new [] on every render when query.data is undefined.
// A changing array reference can trigger downstream effects that set state repeatedly.
const EMPTY_SURVEY_LIST: any[] = [];

/** Exported for sidebar prefetch so cache key and data shape match useSurveyListQuery. */
export async function fetchSurveyList(year?: string, providerType?: string, signal?: AbortSignal): Promise<any[]> {
  const startTime = performance.now();
  
  if (signal?.aborted) {
    throw new Error('Query was aborted');
  }
  
  // Reduced logging - only log key milestones, not every query
  const dataService = getDataService();
  const allSurveys = await dataService.getAllSurveys();
  
  // Reduced logging - only log in debug mode to prevent console spam
  if (allSurveys.length > 0 && typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true') {
    console.log('📋 All surveys in database:', allSurveys.map((s: any) => ({
      id: s.id,
      name: s.name,
      year: s.year || s.surveyYear,
      providerType: s.providerType,
      dataCategory: s.dataCategory
    })));
  }
  
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
      
      // Reduced logging - only log in debug mode
      if (!matches && surveyYearStr && typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true') {
        console.log(`🔍 Year filter: survey "${survey.name}" year "${surveyYearStr}" !== filter year "${filterYearStr}"`);
      }
      
      return matches;
    });
    // Reduced logging - only log in debug mode
    if (typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true') {
      console.log(`📅 After year filter (${year}): ${beforeCount} → ${filteredSurveys.length} surveys`);
    }
  }
  
  // Filter by provider type if provided (shared util for consistency with client-side filtering)
  if (providerType && providerType !== 'BOTH') {
    filteredSurveys = filterSurveysByProviderType(filteredSurveys, providerType);
  }

  // Mark orphaned surveys (surveys with metadata but no data rows)
  // Only check for orphaned surveys if there are surveys to check (performance optimization)
  if (filteredSurveys.length > 0) {
    try {
      const orphanedService = getOrphanedSurveyService();
      const orphanedSurveys = await orphanedService.detectOrphanedSurveys();
      const orphanedIds = new Set(orphanedSurveys.map(s => s.surveyId));
      
      // Mark orphaned surveys
      filteredSurveys.forEach((survey: any) => {
        if (orphanedIds.has(survey.id)) {
          survey.isOrphaned = true;
          survey.orphanedInfo = orphanedSurveys.find(s => s.surveyId === survey.id);
        }
      });
      
      if (orphanedSurveys.length > 0) {
        console.warn(`⚠️ Found ${orphanedSurveys.length} orphaned survey(s) in list`);
      }
    } catch (error) {
      // Don't fail the entire query if orphaned detection fails
      console.warn('⚠️ Failed to detect orphaned surveys:', error);
    }
  }

  const fetchTime = performance.now() - startTime;
  trackFetch(fetchTime);
  // Reduced logging - only log in debug mode
  if (typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true') {
    console.log(`✅ Survey list loaded in ${fetchTime.toFixed(2)}ms (${filteredSurveys.length} surveys)`);
  }

  return filteredSurveys;
}

/**
 * Hook for fetching survey list with TanStack Query caching
 * 
 * ENTERPRISE CACHING STRATEGY:
 * - Surveys only change when explicitly uploaded/deleted (which invalidates cache)
 * - No need to refetch on window focus or after short intervals
 * - Provides instant navigation with cached data (0ms response time)
 * - Survey metadata is effectively static after upload (once-a-year updates).
 * - Cache persists for 24 hours (staleTime) and 24 hours in memory (gcTime)
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
    // ENTERPRISE: 24 hours staleTime - survey list is static after upload; upload/delete invalidates cache
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    // ENTERPRISE: 7 days gcTime - same as Analysis Tools; survives session + IndexedDB restore
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    // ENTERPRISE: Disable refetch on window focus - surveys don't change unless explicitly uploaded/deleted
    // Cache invalidation on upload/delete handles updates automatically
    refetchOnWindowFocus: false,
    // INDUSTRY STANDARD: Don't refetch on mount if data is fresh (stale-while-revalidate pattern)
    // This prevents excessive Firebase reads on every page refresh
    // Data is considered fresh for 24 hours (staleTime), so we show cached data immediately
    // Cache invalidation on upload/delete ensures fresh data when needed
    refetchOnMount: false, // Use cached data if fresh - only refetch if stale
    // Keep previous data visible while fetching in background (stale-while-revalidate)
    placeholderData: (previousData) => previousData,
  });
  
  // ENTERPRISE: Cache debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    if (query.dataUpdatedAt > 0) {
      const cacheAge = Date.now() - query.dataUpdatedAt;
      const isStale = cacheAge > 1000 * 60 * 60 * 24; // 24 hours
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


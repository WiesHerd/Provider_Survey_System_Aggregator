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
import { getOrphanedSurveyService } from '../../../services/OrphanedSurveyService';

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
  
  // Filter by provider type if provided
  if (providerType && providerType !== 'BOTH') {
    const beforeCount = filteredSurveys.length;
    const debugMode = typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true';
    
    // Always log when filtering (not just in debug mode) to help diagnose issues
    console.log(`🔍 Filtering surveys by provider type "${providerType}":`, {
      beforeCount,
      allSurveys: filteredSurveys.map((s: any) => ({
        id: s.id,
        name: s.name,
        providerType: s.providerType,
        dataCategory: s.dataCategory,
        year: s.year
      }))
    });
    
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
      // For PHYSICIAN view, treat "PHYSICIAN" and "Staff Physician" as equivalent
      // This handles the case where user selects "Physician" but data contains "Staff Physician"
      else if (providerType === 'PHYSICIAN') {
        const normalizedSurveyType = (surveyProviderType as string)?.toUpperCase().trim() || '';
        // Match PHYSICIAN, STAFF PHYSICIAN, STAFFPHYSICIAN, or any variation
        const isPhysician = normalizedSurveyType === 'PHYSICIAN' || 
                           normalizedSurveyType === 'STAFF PHYSICIAN' || 
                           normalizedSurveyType === 'STAFFPHYSICIAN' ||
                           normalizedSurveyType === 'PHYS' ||
                           normalizedSurveyType.startsWith('PHYSICIAN') ||
                           // Also check if survey name suggests physician (fallback)
                           (!surveyProviderType && survey.name && 
                            (survey.name.toLowerCase().includes('physician') ||
                             (survey.name.toLowerCase().includes('mgma') && !survey.name.toLowerCase().includes('app')) ||
                             (survey.name.toLowerCase().includes('gallagher') && !survey.name.toLowerCase().includes('app')) ||
                             (survey.name.toLowerCase().includes('sullivan') && !survey.name.toLowerCase().includes('app'))));
        matches = isPhysician && !isCallPay;
        
        // Enhanced debug logging for physician filtering (always log for physician surveys to help diagnose issues)
        const debugMode = typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true';
        if (debugMode || (!matches && survey.name && (survey.name.toLowerCase().includes('sullivan') || survey.name.toLowerCase().includes('physician')))) {
          console.log(`🔍 PHYSICIAN filter: Survey "${survey.name}" ${matches ? 'INCLUDED' : 'EXCLUDED'}:`, {
            surveyId: survey.id,
            providerType: surveyProviderType,
            normalized: normalizedSurveyType,
            isCallPay,
            isPhysician,
            surveyName: survey.name,
            surveyType: survey.type,
            year: survey.year,
            reason: isCallPay ? 'is Call Pay' : !isPhysician ? 'not recognized as PHYSICIAN' : 'matched as PHYSICIAN'
          });
        }
      }
      // For APP views, exclude Call Pay surveys
      // Only show surveys that match the provider type AND are not Call Pay
      else if (providerType === 'APP') {
        matches = surveyProviderType === providerType && !isCallPay;
      }
      // For other provider types (CUSTOM, etc.), use standard filtering
      else {
        matches = surveyProviderType === providerType;
      }
      
      // Enhanced logging for provider type filtering
      // Always log Sullivan-Cotter physician surveys to help diagnose issues
      const isSullivanPhysician = survey.name && 
                                  survey.name.toLowerCase().includes('sullivan') && 
                                  !survey.name.toLowerCase().includes('app') &&
                                  (providerType === 'PHYSICIAN' || surveyProviderType === 'PHYSICIAN');
      
      if (debugMode || (isSullivanPhysician && !matches)) {
        console.log(`🔍 Provider filter: survey "${survey.name}" ${matches ? 'MATCHED' : 'EXCLUDED'}:`, {
          surveyId: survey.id,
          surveyProviderType,
          filterProviderType: providerType,
          isCallPay,
          matches,
          reason: !matches ? `providerType "${surveyProviderType}" doesn't match filter "${providerType}"` : 'matched'
        });
      }
      
      return matches;
    });
    
    console.log(`👥 After provider type filter (${providerType}): ${beforeCount} → ${filteredSurveys.length} surveys`);
    
    // Log which surveys were included/excluded for debugging
    if (debugMode && filteredSurveys.length === 0 && beforeCount > 0) {
      console.warn(`⚠️ No surveys matched provider type filter "${providerType}" - all ${beforeCount} surveys were filtered out`);
    }
  } else {
    console.log(`👥 No provider type filter applied - showing all ${filteredSurveys.length} surveys`);
  }
  
  // CRITICAL FIX: Don't cache in performance service for upload screen
  // React Query handles caching, and performance cache was causing stale data issues
  // performanceService.setCacheEntry(cacheKey, filteredSurveys, 5 * 60 * 1000); // 5 minutes TTL
  
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
    // This eliminates unnecessary Firebase reads and provides instant navigation
    staleTime: 1000 * 60 * 30, // 30 minutes
    // ENTERPRISE: 24 hours gcTime - keep surveys in memory for entire session
    // Survey list is small (~100KB for 100 surveys), so memory impact is minimal
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    // ENTERPRISE: Disable refetch on window focus - surveys don't change unless explicitly uploaded/deleted
    // Cache invalidation on upload/delete handles updates automatically
    refetchOnWindowFocus: false,
    // INDUSTRY STANDARD: Don't refetch on mount if data is fresh (stale-while-revalidate pattern)
    // This prevents excessive Firebase reads on every page refresh
    // Data is considered fresh for 30 minutes (staleTime), so we show cached data immediately
    // Cache invalidation on upload/delete ensures fresh data when needed
    refetchOnMount: false, // Use cached data if fresh - only refetch if stale
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


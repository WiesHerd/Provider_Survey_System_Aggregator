/**
 * Unified delete utility for survey deletion
 * ENTERPRISE: Centralizes cache invalidation logic to ensure consistency
 * across all delete paths (useUploadData, SurveyUpload, etc.)
 */

import { getPerformanceOptimizedDataService } from '../../services/PerformanceOptimizedDataService';
import { AnalyticsDataService } from '../../features/analytics/services/analyticsDataService';
import { queryClient } from '../services/queryClient';

/**
 * Clear all performance caches related to surveys
 */
export function clearPerformanceCaches(): void {
  try {
    const performanceService = getPerformanceOptimizedDataService();
    // Clear all survey list cache entries (pattern matches "all_surveys_*")
    performanceService.clearCache('all_surveys');
    // Clear mapping caches so Provider Type / Specialty / Region mapping pages show new surveys
    performanceService.clearCache('provider_type_mapping');
    performanceService.clearCache('specialty_mapping');
    performanceService.clearCache('region_mapping');
    console.log('✅ Cleared performance cache for survey list and mapping screens');
  } catch (error) {
    console.warn('⚠️ Failed to clear performance cache:', error);
  }
}

/**
 * Invalidate all TanStack Query caches related to surveys
 */
export async function invalidateQueryCaches(surveyId?: string): Promise<void> {
  try {
    // Invalidate all survey list queries (matches queryKeys.surveyList pattern)
    queryClient.invalidateQueries({ 
      queryKey: ['surveys', 'list'],
      exact: false // Invalidate all queries that start with ['surveys', 'list']
    });
    
    // Invalidate survey data queries
    if (surveyId) {
      queryClient.invalidateQueries({ 
        queryKey: ['surveyData', surveyId],
        exact: false
      });
    } else {
      // Invalidate all survey data queries if no specific survey ID
      queryClient.invalidateQueries({ 
        queryKey: ['surveyData'],
        exact: false
      });
    }
    
    // Invalidate benchmarking queries
    try {
      const { invalidateBenchmarkingQueries } = require('../../features/analytics/hooks/useBenchmarkingQuery');
      // invalidateBenchmarkingQueries expects the queryClient instance directly
      invalidateBenchmarkingQueries(queryClient as any);
    } catch (error) {
      // Benchmarking queries might not be available, that's okay
      console.debug('Benchmarking query invalidation not available');
    }
    
    console.log('✅ Invalidated TanStack Query cache after deletion');
  } catch (error) {
    console.warn('⚠️ Failed to invalidate query cache:', error);
  }
}

/**
 * Invalidate analytics cache
 */
export function invalidateAnalyticsCache(): void {
  try {
    const analyticsService = new AnalyticsDataService();
    analyticsService.invalidateCache();
    console.log('✅ Invalidated analytics cache after deletion');
  } catch (error) {
    console.warn('⚠️ Failed to invalidate analytics cache:', error);
  }
}

/**
 * Unified cache invalidation after survey deletion
 * ENTERPRISE: Ensures all cache layers are cleared consistently
 * 
 * @param surveyId - Optional survey ID for targeted cache invalidation
 */
export async function invalidateAllCachesAfterDelete(surveyId?: string): Promise<void> {
  console.log(`🗑️ Invalidating all caches after survey deletion${surveyId ? ` (survey: ${surveyId})` : ''}`);
  
  // Clear performance caches first (synchronous)
  clearPerformanceCaches();
  
  // CRITICAL: Invalidate duplicate detection cache so re-upload after delete sees fresh survey list
  try {
    const { duplicateDetectionService } = await import('../../services/DuplicateDetectionService');
    duplicateDetectionService.invalidateCache();
    console.log('✅ Invalidated duplicate detection cache after deletion');
  } catch (error) {
    console.warn('⚠️ Failed to invalidate duplicate detection cache:', error);
  }
  
  // Invalidate query caches (asynchronous)
  await invalidateQueryCaches(surveyId);
  
  // Invalidate analytics cache (synchronous)
  invalidateAnalyticsCache();
  
  console.log('✅ All caches invalidated after deletion');
}

/**
 * Verify that a survey has been deleted from IndexedDB
 * ENTERPRISE: Confirms deletion before allowing refetch
 * 
 * @param dataService - Data service instance
 * @param surveyId - Survey ID to verify
 * @param maxRetries - Maximum number of verification attempts
 * @param retryDelay - Delay between retries in milliseconds
 * @returns Promise that resolves to true if survey is confirmed deleted
 */
export async function verifySurveyDeletion(
  dataService: { getSurveyById?: (id: string) => Promise<any> },
  surveyId: string,
  maxRetries: number = 3,
  retryDelay: number = 100
): Promise<boolean> {
  if (!dataService.getSurveyById) {
    console.warn('⚠️ DataService does not support getSurveyById, skipping verification');
    return true; // Assume success if we can't verify
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const survey = await dataService.getSurveyById(surveyId);
      
      if (!survey) {
        console.log(`✅ Survey deletion verified (attempt ${attempt}/${maxRetries})`);
        return true;
      }
      
      if (attempt < maxRetries) {
        console.warn(`⚠️ Survey still exists after deletion (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`❌ Survey still exists after deletion after ${maxRetries} attempts`);
        return false;
      }
    } catch (error) {
      // If getSurveyById throws an error, it likely means the survey doesn't exist
      // (which is what we want)
      console.log(`✅ Survey deletion verified (survey not found, attempt ${attempt}/${maxRetries})`);
      return true;
    }
  }
  
  return false;
}

/**
 * Dispatch events to notify other components of survey deletion
 * 
 * @param surveyId - Survey ID that was deleted
 */
export function notifySurveyDeletion(surveyId: string): void {
  // Dispatch custom event for same-tab communication
  window.dispatchEvent(new CustomEvent('survey-deleted', { 
    detail: { surveyId, type: 'single' } 
  }));
  
  // Dispatch storage event for cross-tab communication
  try {
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'survey-deleted',
      newValue: surveyId,
      url: window.location.href
    }));
  } catch (error) {
    // StorageEvent might not be available in all contexts, that's okay
    console.debug('StorageEvent not available for cross-tab communication');
  }
  
  console.log(`📢 Notified components of survey deletion: ${surveyId}`);
}


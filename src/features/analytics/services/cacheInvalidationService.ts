/**
 * Cache Invalidation Service
 * 
 * Centralized service for managing analytics cache invalidation
 * when data changes (surveys uploaded, mappings changed, etc.)
 */

import { AnalyticsDataService } from './analyticsDataService';
import { analyticsComputationCache } from './analyticsComputationCache';

class CacheInvalidationService {
  private static instance: CacheInvalidationService;
  private analyticsDataService: AnalyticsDataService;

  private constructor() {
    this.analyticsDataService = new AnalyticsDataService();
  }

  public static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  /**
   * Invalidate all analytics caches (call when new survey is uploaded)
   */
  public onSurveyUploaded(): void {
    console.log('🔍 Survey uploaded - invalidating all analytics caches');
    this.analyticsDataService.invalidateCache();
    analyticsComputationCache.clear();
  }

  /**
   * Invalidate mapping-related caches (call when mappings change)
   */
  public onMappingsChanged(): void {
    console.log('🔍 Mappings changed - invalidating aggregation caches');
    this.analyticsDataService.invalidateCache();
    // Clear computation cache for aggregation operations
    analyticsComputationCache.clearByPattern('agg:*');
    analyticsComputationCache.clearByPattern('group:*');
  }

  /**
   * Invalidate variable-related caches (call when variable selection changes)
   */
  public onVariablesChanged(): void {
    console.log('🔍 Variables changed - invalidating variable caches');
    analyticsComputationCache.clearByPattern('summary:*');
    analyticsComputationCache.clearByPattern('group:*');
  }

  /**
   * Invalidate filter caches only (call when filters change)
   */
  public onFiltersChanged(): void {
    console.log('🔍 Filters changed - invalidating filter caches');
    analyticsComputationCache.clearByPattern('filter:*');
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): {
    analyticsCache: { hasFreshData: boolean; isStale: boolean };
    computationCache: { hits: number; misses: number; size: number };
  } {
    return {
      analyticsCache: {
        hasFreshData: true, // This would need to be implemented in GlobalCache
        isStale: false
      },
      computationCache: analyticsComputationCache.getStats()
    };
  }
}

export const cacheInvalidationService = CacheInvalidationService.getInstance();

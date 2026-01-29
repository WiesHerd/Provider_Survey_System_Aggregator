/**
 * Cache Manager Service
 * 
 * Unified cache invalidation with optimistic updates and delayed revalidation
 * to handle Firebase eventual consistency. Enterprise-grade cache management.
 */

import { QueryClient } from '@tanstack/react-query';

export class CacheManager {
  private static instance: CacheManager;
  private queryClient: QueryClient | null = null;
  private pendingInvalidations: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize the cache manager with React Query client
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
    console.log('✅ CacheManager initialized');
  }

  /**
   * Optimistically update survey list cache
   * Use this when creating a new survey to show immediate feedback
   */
  optimisticallyAddSurvey(survey: any): void {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return;
    }

    try {
      // Update the cache optimistically
      this.queryClient.setQueryData(['surveys', 'list'], (oldData: any) => {
        if (!oldData) return [survey];
        return [...oldData, survey];
      });

      console.log('✅ CacheManager: Optimistically added survey to cache', survey.id);
    } catch (error) {
      console.error('❌ CacheManager: Failed to optimistically update cache:', error);
    }
  }

  /**
   * Optimistically remove survey from cache
   * Use this when deleting a survey to show immediate feedback
   */
  optimisticallyRemoveSurvey(surveyId: string): void {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return;
    }

    try {
      // Update the cache optimistically
      this.queryClient.setQueryData(['surveys', 'list'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.filter((s: any) => s.id !== surveyId);
      });

      console.log('✅ CacheManager: Optimistically removed survey from cache', surveyId);
    } catch (error) {
      console.error('❌ CacheManager: Failed to optimistically update cache:', error);
    }
  }

  /**
   * Invalidate survey list with delayed revalidation
   * Accounts for Firebase eventual consistency (2-5 seconds)
   * 
   * @param immediate - If true, invalidate immediately. If false, wait for eventual consistency
   */
  async invalidateSurveyList(immediate: boolean = false): Promise<void> {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return;
    }

    const cacheKey = 'surveys-list';

    // Cancel any pending invalidation for this key
    if (this.pendingInvalidations.has(cacheKey)) {
      clearTimeout(this.pendingInvalidations.get(cacheKey)!);
      this.pendingInvalidations.delete(cacheKey);
    }

    if (immediate) {
      // Immediate invalidation (use for reads)
      await this.queryClient.invalidateQueries({ queryKey: ['surveys', 'list'] });
      console.log('✅ CacheManager: Immediately invalidated survey list');
    } else {
      // Delayed invalidation (use after writes to account for eventual consistency)
      const delay = 3000; // 3 seconds for Firebase eventual consistency
      
      const timeout = setTimeout(async () => {
        await this.queryClient!.invalidateQueries({ queryKey: ['surveys', 'list'] });
        this.pendingInvalidations.delete(cacheKey);
        console.log('✅ CacheManager: Delayed invalidation complete for survey list');
      }, delay);

      this.pendingInvalidations.set(cacheKey, timeout);
      console.log(`⏳ CacheManager: Scheduled invalidation for survey list in ${delay}ms`);
    }
  }

  /**
   * Invalidate survey data cache
   */
  async invalidateSurveyData(surveyId?: string): Promise<void> {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return;
    }

    if (surveyId) {
      await this.queryClient.invalidateQueries({ queryKey: ['surveyData', surveyId] });
      console.log('✅ CacheManager: Invalidated survey data cache', surveyId);
    } else {
      await this.queryClient.invalidateQueries({ queryKey: ['surveyData'] });
      console.log('✅ CacheManager: Invalidated all survey data caches');
    }
  }

  /**
   * Invalidate mapping caches
   */
  async invalidateMappings(mappingType?: string): Promise<void> {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return;
    }

    if (mappingType) {
      await this.queryClient.invalidateQueries({ queryKey: ['mappings', mappingType] });
      console.log('✅ CacheManager: Invalidated mapping cache', mappingType);
    } else {
      await this.queryClient.invalidateQueries({ queryKey: ['mappings'] });
      console.log('✅ CacheManager: Invalidated all mapping caches');
    }
  }

  /**
   * Invalidate analytics caches
   */
  async invalidateAnalytics(): Promise<void> {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return;
    }

    await this.queryClient.invalidateQueries({ queryKey: ['analytics'] });
    console.log('✅ CacheManager: Invalidated analytics caches');
  }

  /**
   * Invalidate all caches (nuclear option)
   */
  async invalidateAll(surveyId?: string): Promise<void> {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return;
    }

    console.log('💥 CacheManager: Invalidating ALL caches...');

    // Clear all pending invalidations
    this.pendingInvalidations.forEach(timeout => clearTimeout(timeout));
    this.pendingInvalidations.clear();

    // Invalidate all query caches
    if (surveyId) {
      await Promise.all([
        this.queryClient.invalidateQueries({ queryKey: ['surveys', surveyId] }),
        this.queryClient.invalidateQueries({ queryKey: ['surveyData', surveyId] }),
        this.queryClient.invalidateQueries({ queryKey: ['mappings'] }),
        this.queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
      console.log('✅ CacheManager: Invalidated all caches for survey', surveyId);
    } else {
      await Promise.all([
        this.queryClient.invalidateQueries({ queryKey: ['surveys'] }),
        this.queryClient.invalidateQueries({ queryKey: ['surveyData'] }),
        this.queryClient.invalidateQueries({ queryKey: ['mappings'] }),
        this.queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
      console.log('✅ CacheManager: Invalidated ALL caches');
    }

    // Clear performance cache (if exists)
    this.clearPerformanceCache();
  }

  /**
   * Clear performance cache (localStorage-based cache used by analytics)
   */
  private clearPerformanceCache(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clear any performance-related cache keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.includes('analytics') || key.includes('performance') || key.includes('cache'))) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => window.localStorage.removeItem(key));
        
        if (keysToRemove.length > 0) {
          console.log(`✅ CacheManager: Cleared ${keysToRemove.length} performance cache entries`);
        }
      }
    } catch (error) {
      console.warn('⚠️ CacheManager: Failed to clear performance cache:', error);
    }
  }

  /**
   * Verify that optimistic update was correct
   * Compares optimistic data with actual data after server response
   */
  async verifyOptimisticUpdate(surveyId: string, expectedSurvey: any): Promise<boolean> {
    if (!this.queryClient) {
      console.warn('⚠️ CacheManager: QueryClient not initialized');
      return false;
    }

    try {
      // Wait for eventual consistency
      await this.delay(3000);

      // Fetch fresh data
      const actualData = await this.queryClient.fetchQuery({
        queryKey: ['surveys', 'list'],
        staleTime: 0 // Force fresh fetch
      }) as any[];

      // Check if survey exists in actual data
      const surveyExists = actualData.some((s: any) => s.id === surveyId);

      if (!surveyExists) {
        console.error('❌ CacheManager: Optimistic update verification failed - survey not found');
        return false;
      }

      console.log('✅ CacheManager: Optimistic update verified successfully');
      return true;
    } catch (error) {
      console.error('❌ CacheManager: Optimistic update verification failed:', error);
      return false;
    }
  }

  /**
   * Delay utility for eventual consistency handling
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up pending invalidations (call on unmount)
   */
  cleanup(): void {
    this.pendingInvalidations.forEach(timeout => clearTimeout(timeout));
    this.pendingInvalidations.clear();
    console.log('✅ CacheManager: Cleaned up pending invalidations');
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

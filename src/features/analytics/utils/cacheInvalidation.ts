/**
 * Cache Invalidation Utilities
 * 
 * Handles cache invalidation for analytics data when underlying data changes.
 * Implements smart invalidation strategies to maintain cache efficiency.
 */

import { analyticsComputationCache, cacheUtils } from '../services/analyticsComputationCache';

/**
 * Cache invalidation events
 */
export enum CacheInvalidationEvent {
  NEW_SURVEY_UPLOADED = 'new_survey_uploaded',
  SURVEY_DELETED = 'survey_deleted',
  MAPPING_CHANGED = 'mapping_changed',
  VARIABLE_SELECTION_CHANGED = 'variable_selection_changed',
  FILTER_CHANGED = 'filter_changed',
  DATA_CLEARED = 'data_cleared'
}

/**
 * Cache invalidation strategies
 */
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private invalidationListeners: Map<CacheInvalidationEvent, (() => void)[]> = new Map();

  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  /**
   * Register a listener for cache invalidation events
   */
  onInvalidation(event: CacheInvalidationEvent, callback: () => void): () => void {
    if (!this.invalidationListeners.has(event)) {
      this.invalidationListeners.set(event, []);
    }
    this.invalidationListeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.invalidationListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Trigger cache invalidation for a specific event
   */
  invalidate(event: CacheInvalidationEvent): void {
    console.log(`🔄 Cache invalidation triggered: ${event}`);
    
    switch (event) {
      case CacheInvalidationEvent.NEW_SURVEY_UPLOADED:
        this.invalidateNewSurvey();
        break;
      case CacheInvalidationEvent.SURVEY_DELETED:
        this.invalidateSurveyDeleted();
        break;
      case CacheInvalidationEvent.MAPPING_CHANGED:
        this.invalidateMappingChanged();
        break;
      case CacheInvalidationEvent.VARIABLE_SELECTION_CHANGED:
        this.invalidateVariableSelection();
        break;
      case CacheInvalidationEvent.FILTER_CHANGED:
        this.invalidateFilterChanged();
        break;
      case CacheInvalidationEvent.DATA_CLEARED:
        this.invalidateDataCleared();
        break;
    }

    // Notify listeners
    const listeners = this.invalidationListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback());
    }
  }

  /**
   * New survey uploaded - clear all caches
   */
  private invalidateNewSurvey(): void {
    console.log('🗑️ Clearing all caches due to new survey upload');
    analyticsComputationCache.clear();
  }

  /**
   * Survey deleted - clear aggregation and grouping caches
   */
  private invalidateSurveyDeleted(): void {
    console.log('🗑️ Clearing aggregation and grouping caches due to survey deletion');
    cacheUtils.clearAggregation();
    cacheUtils.clearGrouping();
    cacheUtils.clearSummary();
  }

  /**
   * Mapping changed - clear aggregation and summary caches
   */
  private invalidateMappingChanged(): void {
    console.log('🗑️ Clearing aggregation and summary caches due to mapping change');
    cacheUtils.clearAggregation();
    cacheUtils.clearSummary();
    // Keep filtering cache as it's not affected by mappings
  }

  /**
   * Variable selection changed - clear summary and grouping caches
   */
  private invalidateVariableSelection(): void {
    console.log('🗑️ Clearing summary and grouping caches due to variable selection change');
    cacheUtils.clearSummary();
    cacheUtils.clearGrouping();
    // Keep aggregation and filtering caches
  }

  /**
   * Filter changed - clear only filtering cache
   */
  private invalidateFilterChanged(): void {
    console.log('🗑️ Clearing filtering cache due to filter change');
    cacheUtils.clearFiltering();
    // Keep all other caches as they're not affected by filters
  }

  /**
   * Data cleared - clear all caches
   */
  private invalidateDataCleared(): void {
    console.log('🗑️ Clearing all caches due to data clear');
    analyticsComputationCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return analyticsComputationCache.getStats();
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    return analyticsComputationCache.getMemoryUsage();
  }
}

// Export singleton instance
export const cacheInvalidationManager = CacheInvalidationManager.getInstance();

/**
 * Convenience functions for common invalidation scenarios
 */
export const cacheInvalidation = {
  /**
   * Invalidate when new survey is uploaded
   */
  onNewSurvey: () => {
    cacheInvalidationManager.invalidate(CacheInvalidationEvent.NEW_SURVEY_UPLOADED);
  },

  /**
   * Invalidate when survey is deleted
   */
  onSurveyDeleted: () => {
    cacheInvalidationManager.invalidate(CacheInvalidationEvent.SURVEY_DELETED);
  },

  /**
   * Invalidate when mappings change
   */
  onMappingChanged: () => {
    cacheInvalidationManager.invalidate(CacheInvalidationEvent.MAPPING_CHANGED);
  },

  /**
   * Invalidate when variable selection changes
   */
  onVariableSelectionChanged: () => {
    cacheInvalidationManager.invalidate(CacheInvalidationEvent.VARIABLE_SELECTION_CHANGED);
  },

  /**
   * Invalidate when filters change
   */
  onFilterChanged: () => {
    cacheInvalidationManager.invalidate(CacheInvalidationEvent.FILTER_CHANGED);
  },

  /**
   * Invalidate when data is cleared
   */
  onDataCleared: () => {
    cacheInvalidationManager.invalidate(CacheInvalidationEvent.DATA_CLEARED);
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    return cacheInvalidationManager.getCacheStats();
  },

  /**
   * Get memory usage
   */
  getMemoryUsage: () => {
    return cacheInvalidationManager.getMemoryUsage();
  }
};

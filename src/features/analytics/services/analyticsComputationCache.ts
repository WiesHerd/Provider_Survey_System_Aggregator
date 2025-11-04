/**
 * Analytics Computation Cache Service
 * 
 * Enterprise-grade LRU cache for heavy analytics computations.
 * Implements Google/Apple-style memoization for expensive operations.
 */

interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  accessCount: number;
  size: number; // Estimated memory size in bytes
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * LRU Cache implementation for analytics computations
 * 
 * Features:
 * - LRU eviction policy
 * - Memory size tracking
 * - Access frequency tracking
 * - Statistics reporting
 * - TTL support (optional)
 */
export class AnalyticsComputationCache {
  private cache: Map<string, CacheEntry>;
  private maxEntries: number;
  private maxMemorySize: number; // in bytes
  private currentMemorySize: number;
  private hits: number;
  private misses: number;
  private evictions: number;
  private accessOrder: string[]; // For LRU tracking

  constructor(maxEntries: number = 50, maxMemorySize: number = 50 * 1024 * 1024) { // 50MB default
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.maxMemorySize = maxMemorySize;
    this.currentMemorySize = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.accessOrder = [];
  }

  /**
   * Generate a cache key from operation, data, and parameters
   * Uses fast hash for large objects, JSON.stringify for small ones
   */
  generateKey(operation: string, data: any, params?: any): string {
    const dataHash = this.hashData(data);
    const paramsHash = params ? this.hashData(params) : '';
    return `${operation}:${dataHash}:${paramsHash}`;
  }

  /**
   * Fast hash function for large objects
   * Falls back to JSON.stringify for small objects
   */
  private hashData(data: any): string {
    if (data === null || data === undefined) {
      return 'null';
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return String(data);
    }

    if (Array.isArray(data)) {
      if (data.length === 0) return '[]';
      if (data.length > 1000) {
        // For large arrays, use length and first/last elements
        return `array:${data.length}:${this.hashData(data[0])}:${this.hashData(data[data.length - 1])}`;
      }
      return `[${data.map(item => this.hashData(item)).join(',')}]`;
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return '{}';
      if (keys.length > 20) {
        // For large objects, use key count and sample
        const sample = keys.slice(0, 3).map(key => `${key}:${this.hashData(data[key])}`).join(',');
        return `object:${keys.length}:${sample}`;
      }
      return `{${keys.map(key => `${key}:${this.hashData(data[key])}`).join(',')}}`;
    }

    return JSON.stringify(data);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Update access tracking for LRU
    this.updateAccessOrder(key);
    entry.accessCount++;
    this.hits++;

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T): void {
    const size = this.estimateSize(value);
    
    // Check if we need to evict entries
    this.evictIfNeeded(key, size);

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size
    };

    this.cache.set(key, entry);
    this.currentMemorySize += size;
    this.updateAccessOrder(key);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentMemorySize = 0;
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Clear entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.currentMemorySize -= entry.size;
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      }
    });
  }

  /**
   * Clear entries matching a pattern (alias for clearPattern)
   */
  clearByPattern(pattern: string): void {
    this.clearPattern(pattern);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      maxSize: this.maxEntries,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0
    };
  }

  /**
   * Get memory usage in MB
   */
  getMemoryUsage(): number {
    return this.currentMemorySize / (1024 * 1024);
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict entries if cache is full
   */
  private evictIfNeeded(newKey: string, newSize: number): void {
    // Remove existing entry if updating
    if (this.cache.has(newKey)) {
      const existingEntry = this.cache.get(newKey);
      if (existingEntry) {
        this.currentMemorySize -= existingEntry.size;
        this.cache.delete(newKey);
        const index = this.accessOrder.indexOf(newKey);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      }
    }

    // Evict by entry count
    while (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    // Evict by memory size
    while (this.currentMemorySize + newSize > this.maxMemorySize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    const entry = this.cache.get(lruKey);
    
    if (entry) {
      this.currentMemorySize -= entry.size;
      this.cache.delete(lruKey);
      this.accessOrder.shift();
      this.evictions++;
    }
  }

  /**
   * Estimate memory size of a value
   */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'string') {
      return value.length * 2; // 2 bytes per character
    }
    
    if (typeof value === 'number') {
      return 8; // 8 bytes for number
    }
    
    if (typeof value === 'boolean') {
      return 4; // 4 bytes for boolean
    }
    
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 0) + 100; // Array overhead
    }
    
    if (typeof value === 'object') {
      let size = 0;
      for (const [key, val] of Object.entries(value)) {
        size += key.length * 2; // Key size
        size += this.estimateSize(val); // Value size
      }
      return size + 100; // Object overhead
    }
    
    // Fallback: rough estimate
    return JSON.stringify(value).length * 2;
  }
}

// Export singleton instance
export const analyticsComputationCache = new AnalyticsComputationCache();

/**
 * Cache utility functions
 */
export const cacheUtils = {
  /**
   * Generate cache key for aggregation operations
   */
  aggregationKey: (dataHash: string, surveyIds: string[]): string => {
    return `agg:${dataHash}:${surveyIds.join(',')}`;
  },

  /**
   * Generate cache key for grouping operations
   */
  groupingKey: (dataHash: string, groupKey: string): string => {
    return `group:${dataHash}:${groupKey}`;
  },

  /**
   * Generate cache key for summary operations
   */
  summaryKey: (dataHash: string, variables: string[]): string => {
    return `summary:${dataHash}:${variables.join(',')}`;
  },

  /**
   * Generate cache key for filtering operations
   */
  filterKey: (dataHash: string, filterHash: string): string => {
    return `filter:${dataHash}:${filterHash}`;
  },

  /**
   * Clear cache by operation type
   */
  clearByOperation: (operation: string): void => {
    analyticsComputationCache.clearPattern(`${operation}:`);
  },

  /**
   * Clear all aggregation caches
   */
  clearAggregation: (): void => {
    analyticsComputationCache.clearPattern('agg:');
  },

  /**
   * Clear all grouping caches
   */
  clearGrouping: (): void => {
    analyticsComputationCache.clearPattern('group:');
  },

  /**
   * Clear all summary caches
   */
  clearSummary: (): void => {
    analyticsComputationCache.clearPattern('summary:');
  },

  /**
   * Clear all filter caches
   */
  clearFiltering: (): void => {
    analyticsComputationCache.clearPattern('filter:');
  }
};

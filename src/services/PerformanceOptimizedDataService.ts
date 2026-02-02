/**
 * Performance-Optimized Data Service
 * Enterprise-grade caching and batching for Data Management screens
 */

import { getDataService } from './DataService';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../features/mapping/types/mapping';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface BatchQuery {
  id: string;
  queries: Array<{
    name: string;
    fn: () => Promise<any>;
  }>;
}

export class PerformanceOptimizedDataService {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingQueries = new Map<string, Promise<any>>();
  private batchQueue: BatchQuery[] = [];
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_DELAY = 50; // 50ms batch delay

  constructor() {
    // Start batch processor
    this.startBatchProcessor();
  }

  /**
   * Intelligent caching with TTL
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private setCached<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Public cache access for external services
   */
  public getCacheEntry<T>(key: string): T | null {
    return this.getCached<T>(key);
  }

  public setCacheEntry<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.setCached(key, data, ttl);
  }

  /**
   * Batch query processor for optimal performance
   */
  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }, this.BATCH_DELAY);
  }

  private async processBatch(): Promise<void> {
    const batch = this.batchQueue.shift();
    if (!batch) return;

    console.log(`🚀 Processing batch ${batch.id} with ${batch.queries.length} queries`);
    
    try {
      // Execute all queries in parallel
      const results = await Promise.all(
        batch.queries.map(async (query) => {
          const startTime = performance.now();
          const result = await query.fn();
          const duration = performance.now() - startTime;
          console.log(`✅ ${query.name} completed in ${duration.toFixed(2)}ms`);
          return { name: query.name, result };
        })
      );

      // Cache results
      results.forEach(({ name, result }) => {
        this.setCached(`${batch.id}_${name}`, result);
      });

    } catch (error) {
      console.error(`❌ Batch ${batch.id} failed:`, error);
    }
  }

  /**
   * Optimized specialty mapping data loading
   */
  async getSpecialtyMappingData(providerType?: string): Promise<{
    mappings: ISpecialtyMapping[];
    unmapped: IUnmappedSpecialty[];
    learned: Record<string, string>;
    learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  }> {
    const cacheKey = `specialty_mapping_${providerType || 'all'}`;
    
    // Check cache first
    const cached = this.getCached<{
      mappings: ISpecialtyMapping[];
      unmapped: IUnmappedSpecialty[];
      learned: Record<string, string>;
      learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
    }>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for specialty mapping data`);
      return cached;
    }

    // Check if query is already pending
    if (this.pendingQueries.has(cacheKey)) {
      console.log(`⏳ Waiting for pending specialty mapping query`);
      return this.pendingQueries.get(cacheKey)!;
    }

    // Create new query
    const queryPromise = this.loadSpecialtyMappingData(providerType);
    this.pendingQueries.set(cacheKey, queryPromise);

    try {
      const result = await queryPromise;
      this.setCached(cacheKey, result);
      return result;
    } finally {
      this.pendingQueries.delete(cacheKey);
    }
  }

  private async loadSpecialtyMappingData(providerType?: string) {
    const dataService = getDataService();
    
    console.log(`🚀 Loading specialty mapping data for provider type: ${providerType}`);
    const startTime = performance.now();

    // Batch all queries together
    const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
      this.optimizedGetAllSpecialtyMappings(dataService, providerType),
      this.optimizedGetUnmappedSpecialties(dataService, providerType),
      dataService.getLearnedMappings('specialty', providerType),
      dataService.getLearnedMappingsWithSource('specialty', providerType)
    ]);

    const duration = performance.now() - startTime;
    console.log(`✅ Specialty mapping data loaded in ${duration.toFixed(2)}ms`);

    return {
      mappings,
      unmapped,
      learned: learned || {},
      learnedWithSource: learnedWithSource || []
    };
  }

  /**
   * Optimized getAllSpecialtyMappings with intelligent caching
   */
  private async optimizedGetAllSpecialtyMappings(
    dataService: any, 
    providerType?: string
  ): Promise<ISpecialtyMapping[]> {
    const cacheKey = `all_specialty_mappings_${providerType || 'all'}`;
    
    const cached = this.getCached<ISpecialtyMapping[]>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for specialty mappings`);
      return cached;
    }

    console.log(`🔍 Loading specialty mappings with optimization...`);
    
    // Use the existing method but with performance monitoring
    const startTime = performance.now();
    const mappings = await dataService.getAllSpecialtyMappings(providerType);
    const duration = performance.now() - startTime;
    
    console.log(`✅ Loaded ${mappings.length} specialty mappings in ${duration.toFixed(2)}ms`);
    
    // Cache the result
    this.setCached(cacheKey, mappings);
    
    return mappings;
  }

  /**
   * Optimized getUnmappedSpecialties with batching
   */
  private async optimizedGetUnmappedSpecialties(
    dataService: any, 
    providerType?: string
  ): Promise<IUnmappedSpecialty[]> {
    const cacheKey = `unmapped_specialties_${providerType || 'all'}`;
    
    const cached = this.getCached<IUnmappedSpecialty[]>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for unmapped specialties`);
      return cached;
    }

    console.log(`🔍 Loading unmapped specialties with optimization...`);
    
    const startTime = performance.now();
    const unmapped = await dataService.getUnmappedSpecialties(providerType);
    const duration = performance.now() - startTime;
    
    console.log(`✅ Loaded ${unmapped.length} unmapped specialties in ${duration.toFixed(2)}ms`);
    
    // Cache the result
    this.setCached(cacheKey, unmapped);
    
    return unmapped;
  }

  /**
   * Optimized provider type mapping data loading.
   * No year filter - show all surveys (same behavior as Specialty Mapping).
   */
  async getProviderTypeMappingData(providerType?: string): Promise<{
    mappings: any[];
    unmapped: any[];
    learned: Record<string, string>;
    learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  }> {
    const cacheKey = `provider_type_mapping_${providerType || 'all'}`;

    const cached = this.getCached<{
      mappings: any[];
      unmapped: any[];
      learned: Record<string, string>;
      learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
    }>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for provider type mapping data`);
      return cached;
    }

    const dataService = getDataService();
    console.log(`🚀 Loading provider type mapping data for provider type: ${providerType}`);

    const startTime = performance.now();

    const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
      dataService.getProviderTypeMappings(providerType),
      dataService.getUnmappedProviderTypes(providerType),
      dataService.getLearnedMappings('providerType', providerType),
      dataService.getLearnedMappingsWithSource('providerType', providerType)
    ]);

    const duration = performance.now() - startTime;
    console.log(`✅ Provider type mapping data loaded in ${duration.toFixed(2)}ms`);

    const result = {
      mappings,
      unmapped,
      learned: learned || {},
      learnedWithSource: learnedWithSource || []
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Optimized region mapping data loading
   */
  async getRegionMappingData(providerType?: string): Promise<{
    mappings: any[];
    unmapped: any[];
    learned: Record<string, string>;
    learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  }> {
    const cacheKey = `region_mapping_${providerType || 'all'}`;
    
    const cached = this.getCached<{
      mappings: any[];
      unmapped: any[];
      learned: Record<string, string>;
      learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
    }>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for region mapping data`);
      return cached;
    }

    const dataService = getDataService();
    console.log(`🚀 Loading region mapping data for provider type: ${providerType}`);
    
    const startTime = performance.now();
    
    const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
      dataService.getRegionMappings(providerType),
      dataService.getUnmappedRegions(providerType),
      dataService.getLearnedMappings('region', providerType),
      dataService.getLearnedMappingsWithSource('region', providerType)
    ]);

    const duration = performance.now() - startTime;
    console.log(`✅ Region mapping data loaded in ${duration.toFixed(2)}ms`);

    const result = {
      mappings,
      unmapped,
      learned: learned || {},
      learnedWithSource: learnedWithSource || []
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Optimized variable mapping data loading
   */
  async getVariableMappingData(providerType?: string): Promise<{
    mappings: any[];
    unmapped: any[];
    learned: Record<string, string>;
    learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  }> {
    const cacheKey = `variable_mapping_${providerType || 'all'}`;
    
    const cached = this.getCached<{
      mappings: any[];
      unmapped: any[];
      learned: Record<string, string>;
      learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
    }>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for variable mapping data`);
      return cached;
    }

    const dataService = getDataService();
    console.log(`🚀 Loading variable mapping data for provider type: ${providerType}`);
    
    const startTime = performance.now();
    
    const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
      dataService.getVariableMappings(providerType),
      dataService.getUnmappedVariables(providerType),
      dataService.getLearnedMappings('variable', providerType),
      dataService.getLearnedMappingsWithSource('variable', providerType)
    ]);

    const duration = performance.now() - startTime;
    console.log(`✅ Variable mapping data loaded in ${duration.toFixed(2)}ms`);

    const result = {
      mappings,
      unmapped,
      learned: learned || {},
      learnedWithSource: learnedWithSource || []
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Optimized column mapping data loading
   */
  async getColumnMappingData(providerType?: string): Promise<{
    mappings: any[];
    unmapped: any[];
    learned: Record<string, string>;
    learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  }> {
    const cacheKey = `column_mapping_${providerType || 'all'}`;
    
    const cached = this.getCached<{
      mappings: any[];
      unmapped: any[];
      learned: Record<string, string>;
      learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
    }>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for column mapping data`);
      return cached;
    }

    const dataService = getDataService();
    console.log(`🚀 Loading column mapping data for provider type: ${providerType}`);
    
    const startTime = performance.now();
    
    const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
      dataService.getAllColumnMappings(providerType),
      dataService.getUnmappedColumns(providerType),
      dataService.getLearnedMappings('column', providerType),
      dataService.getLearnedMappingsWithSource('column', providerType)
    ]);

    const duration = performance.now() - startTime;
    console.log(`✅ Column mapping data loaded in ${duration.toFixed(2)}ms`);

    const result = {
      mappings,
      unmapped,
      learned: learned || {},
      learnedWithSource: learnedWithSource || []
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Clear cache for specific data type
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for pattern: ${pattern}`);
    } else {
      this.cache.clear();
      console.log(`🗑️ Cleared all cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}

// Singleton instance
let performanceService: PerformanceOptimizedDataService | null = null;

export const getPerformanceOptimizedDataService = (): PerformanceOptimizedDataService => {
  if (!performanceService) {
    performanceService = new PerformanceOptimizedDataService();
  }
  return performanceService;
};

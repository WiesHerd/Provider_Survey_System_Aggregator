/**
 * Analysis Tools Performance Service
 * Enterprise-grade caching and batching for all Analysis Tools screens
 */

import { getDataService } from './DataService';
import { AnalyticsDataService } from '../features/analytics/services/analyticsDataService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface AnalysisToolsCache {
  regionalAnalytics: Map<string, CacheEntry<any>>;
  customBlending: Map<string, CacheEntry<any>>;
  customReports: Map<string, CacheEntry<any>>;
  fmv: Map<string, CacheEntry<any>>;
}

export class AnalysisToolsPerformanceService {
  private cache: AnalysisToolsCache = {
    regionalAnalytics: new Map(),
    customBlending: new Map(),
    customReports: new Map(),
    fmv: new Map()
  };
  
  private pendingQueries = new Map<string, Promise<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_DELAY = 50; // 50ms batch delay

  constructor() {
    // Start cache cleanup interval
    setInterval(() => this.cleanupExpiredCache(), 60000); // Clean every minute
  }

  /**
   * Intelligent caching with TTL
   */
  private getCached<T>(cacheType: keyof AnalysisToolsCache, key: string): T | null {
    const entry = this.cache[cacheType].get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache[cacheType].delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private setCached<T>(cacheType: keyof AnalysisToolsCache, key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache[cacheType].set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    Object.values(this.cache).forEach(cacheMap => {
      for (const [key, entry] of cacheMap.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          cacheMap.delete(key);
        }
      }
    });
  }

  /**
   * Optimized Regional Analytics data loading
   */
  async getRegionalAnalyticsData(filters: {
    specialty?: string;
    providerType?: string;
    surveySource?: string;
    year?: string;
  } = {}): Promise<{
    analyticsData: any[];
    mappings: any[];
    regionMappings: any[];
    loadingTime: number;
  }> {
    const cacheKey = `regional_analytics_${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = this.getCached<{
      analyticsData: any[];
      mappings: any[];
      regionMappings: any[];
      loadingTime: number;
    }>('regionalAnalytics', cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for regional analytics data`);
      return cached;
    }

    // Check if query is already pending
    if (this.pendingQueries.has(cacheKey)) {
      console.log(`⏳ Waiting for pending regional analytics query`);
      return this.pendingQueries.get(cacheKey)!;
    }

    // Create new query
    const queryPromise = this.loadRegionalAnalyticsData(filters);
    this.pendingQueries.set(cacheKey, queryPromise);

    try {
      const result = await queryPromise;
      this.setCached('regionalAnalytics', cacheKey, result);
      return result;
    } finally {
      this.pendingQueries.delete(cacheKey);
    }
  }

  private async loadRegionalAnalyticsData(filters: any) {
    console.log(`🚀 Loading regional analytics data with optimization...`);
    const startTime = performance.now();
    
    const dataService = getDataService();
    const analyticsDataService = new AnalyticsDataService();
    
    // Batch all queries together
    const [analyticsData, mappings, regionMappings] = await Promise.all([
      analyticsDataService.getAnalyticsData(filters),
      dataService.getAllSpecialtyMappings(),
      dataService.getRegionMappings()
    ]);

    const duration = performance.now() - startTime;
    console.log(`✅ Regional analytics data loaded in ${duration.toFixed(2)}ms`);

    return {
      analyticsData,
      mappings,
      regionMappings,
      loadingTime: duration
    };
  }

  /**
   * Optimized Custom Blending data loading
   */
  async getCustomBlendingData(filters: {
    specialties?: string[];
    providerType?: string;
    region?: string;
  } = {}): Promise<{
    allData: any[];
    availableSpecialties: string[];
    loadingTime: number;
  }> {
    const cacheKey = `custom_blending_${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = this.getCached<{
      allData: any[];
      availableSpecialties: string[];
      loadingTime: number;
    }>('customBlending', cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for custom blending data`);
      return cached;
    }

    // Check if query is already pending
    if (this.pendingQueries.has(cacheKey)) {
      console.log(`⏳ Waiting for pending custom blending query`);
      return this.pendingQueries.get(cacheKey)!;
    }

    // Create new query
    const queryPromise = this.loadCustomBlendingData(filters);
    this.pendingQueries.set(cacheKey, queryPromise);

    try {
      const result = await queryPromise;
      this.setCached('customBlending', cacheKey, result);
      return result;
    } finally {
      this.pendingQueries.delete(cacheKey);
    }
  }

  private async loadCustomBlendingData(filters: any) {
    console.log(`🚀 Loading custom blending data with optimization...`);
    const startTime = performance.now();
    
    const analyticsDataService = new AnalyticsDataService();
    
    // Get all survey data using optimized service
    const allSurveyData = await analyticsDataService.getAnalyticsData({
      specialty: '',
      surveySource: '',
      geographicRegion: filters.region || '',
      providerType: filters.providerType || '',
      year: ''
    });

    // Extract available specialties
    const availableSpecialties = Array.from(new Set(
      allSurveyData.map(row => (row as any).specialty).filter(Boolean)
    )).sort();

    const duration = performance.now() - startTime;
    console.log(`✅ Custom blending data loaded in ${duration.toFixed(2)}ms`);

    return {
      allData: allSurveyData,
      availableSpecialties,
      loadingTime: duration
    };
  }

  /**
   * Optimized Custom Reports data loading
   */
  async getCustomReportsData(filters: {
    specialty?: string;
    providerType?: string;
    region?: string;
    year?: string;
  } = {}): Promise<{
    analyticsData: any[];
    loadingTime: number;
  }> {
    const cacheKey = `custom_reports_${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = this.getCached<{
      analyticsData: any[];
      loadingTime: number;
    }>('customReports', cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for custom reports data`);
      return cached;
    }

    // Check if query is already pending
    if (this.pendingQueries.has(cacheKey)) {
      console.log(`⏳ Waiting for pending custom reports query`);
      return this.pendingQueries.get(cacheKey)!;
    }

    // Create new query
    const queryPromise = this.loadCustomReportsData(filters);
    this.pendingQueries.set(cacheKey, queryPromise);

    try {
      const result = await queryPromise;
      this.setCached('customReports', cacheKey, result);
      return result;
    } finally {
      this.pendingQueries.delete(cacheKey);
    }
  }

  private async loadCustomReportsData(filters: any) {
    console.log(`🚀 Loading custom reports data with optimization...`);
    const startTime = performance.now();
    
    const analyticsDataService = new AnalyticsDataService();
    
    // Get analytics data using optimized service
    const analyticsData = await analyticsDataService.getAnalyticsData(filters);

    const duration = performance.now() - startTime;
    console.log(`✅ Custom reports data loaded in ${duration.toFixed(2)}ms`);

    return {
      analyticsData,
      loadingTime: duration
    };
  }

  /**
   * Optimized Fair Market Value data loading
   */
  async getFMVData(filters: {
    specialty?: string;
    providerType?: string;
    region?: string;
    year?: string;
    aggregationMethod?: string;
  } = {}): Promise<{
    marketData: any;
    normalizedRows: any[];
    loadingTime: number;
  }> {
    const cacheKey = `fmv_${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = this.getCached<{
      marketData: any;
      normalizedRows: any[];
      loadingTime: number;
    }>('fmv', cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for FMV data`);
      return cached;
    }

    // Check if query is already pending
    if (this.pendingQueries.has(cacheKey)) {
      console.log(`⏳ Waiting for pending FMV query`);
      return this.pendingQueries.get(cacheKey)!;
    }

    // Create new query
    const queryPromise = this.loadFMVData(filters);
    this.pendingQueries.set(cacheKey, queryPromise);

    try {
      const result = await queryPromise;
      this.setCached('fmv', cacheKey, result);
      return result;
    } finally {
      this.pendingQueries.delete(cacheKey);
    }
  }

  private async loadFMVData(filters: any) {
    console.log(`🚀 Loading FMV data with optimization...`);
    const startTime = performance.now();
    
    const analyticsDataService = new AnalyticsDataService();
    
    // Get analytics data using optimized service
    const analyticsData = await analyticsDataService.getAnalyticsData(filters);
    
    // Calculate market data
    const marketData = this.calculateMarketData(analyticsData, filters.aggregationMethod || 'median');

    const duration = performance.now() - startTime;
    console.log(`✅ FMV data loaded in ${duration.toFixed(2)}ms`);

    return {
      marketData,
      normalizedRows: analyticsData,
      loadingTime: duration
    };
  }

  /**
   * Calculate market data from analytics data
   */
  private calculateMarketData(data: any[], aggregationMethod: string) {
    if (data.length === 0) {
      return {
        tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
        wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
        cf: { p25: 0, p50: 0, p75: 0, p90: 0 }
      };
    }

    // Extract percentile values
    const tccValues = data.map(d => d.tcc_p50).filter(v => v > 0);
    const wrvuValues = data.map(d => d.wrvu_p50).filter(v => v > 0);
    const cfValues = data.map(d => d.cf_p50).filter(v => v > 0);

    return {
      tcc: {
        p25: this.calculatePercentile(tccValues, 25),
        p50: this.calculatePercentile(tccValues, 50),
        p75: this.calculatePercentile(tccValues, 75),
        p90: this.calculatePercentile(tccValues, 90)
      },
      wrvu: {
        p25: this.calculatePercentile(wrvuValues, 25),
        p50: this.calculatePercentile(wrvuValues, 50),
        p75: this.calculatePercentile(wrvuValues, 75),
        p90: this.calculatePercentile(wrvuValues, 90)
      },
      cf: {
        p25: this.calculatePercentile(cfValues, 25),
        p50: this.calculatePercentile(cfValues, 50),
        p75: this.calculatePercentile(cfValues, 75),
        p90: this.calculatePercentile(cfValues, 90)
      }
    };
  }

  /**
   * Calculate percentile value
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Clear cache for specific analysis tool
   */
  clearCache(tool?: keyof AnalysisToolsCache): void {
    if (tool) {
      this.cache[tool].clear();
      console.log(`🗑️ Cleared ${tool} cache`);
    } else {
      Object.values(this.cache).forEach(cacheMap => cacheMap.clear());
      console.log(`🗑️ Cleared all analysis tools cache`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    entriesByTool: Record<string, number>;
    memoryUsage: number;
  } {
    const entriesByTool: Record<string, number> = {};
    let totalEntries = 0;

    Object.entries(this.cache).forEach(([tool, cacheMap]) => {
      const count = cacheMap.size;
      entriesByTool[tool] = count;
      totalEntries += count;
    });

    return {
      totalEntries,
      entriesByTool,
      memoryUsage: totalEntries * 0.1 // Estimated memory usage
    };
  }
}

// Singleton instance
let analysisToolsService: AnalysisToolsPerformanceService | null = null;

export const getAnalysisToolsPerformanceService = (): AnalysisToolsPerformanceService => {
  if (!analysisToolsService) {
    analysisToolsService = new AnalysisToolsPerformanceService();
  }
  return analysisToolsService;
};

/**
 * Analytics Data Service
 * Handles data retrieval, normalization, and stacking for analytics
 */

import { getDataService } from '../../../services/DataService';
import { ISpecialtyMapping } from '../../../types/specialty';
import { IColumnMapping } from '../../../types/column';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';
import { 
  DynamicAggregatedData, 
  DynamicNormalizedRow, 
  VariableMetrics 
} from '../types/variables';
import { normalizeVariableName } from '../utils/variableFormatters';
import { analyticsComputationCache, cacheUtils } from './analyticsComputationCache';
import { cacheInvalidation } from '../utils/cacheInvalidation';

export interface RawSurveyRow {
  [key: string]: any;
  specialty?: string;
  surveySpecialty?: string;
  normalizedSpecialty?: string;
  provider_type?: string;
  providerType?: string;
  geographic_region?: string;
  region?: string;
  geographicRegion?: string;
  n_orgs?: number;
  n_incumbents?: number;
  tcc_p25?: number;
  tcc_p50?: number;
  tcc_p75?: number;
  tcc_p90?: number;
  wrvu_p25?: number;
  wrvu_p50?: number;
  wrvu_p75?: number;
  wrvu_p90?: number;
  cf_p25?: number;
  cf_p50?: number;
  cf_p75?: number;
  cf_p90?: number;
}

export interface NormalizedRow {
  specialty: string;
  providerType: string;
  region: string;
  n_orgs: number;
  n_incumbents: number;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  surveySource: string;
  surveyYear: string;
  rawData: RawSurveyRow;
}

// Global cache that persists across component mounts
class GlobalAnalyticsCache {
  private static instance: GlobalAnalyticsCache;
  private dataCache: {
    data: AggregatedData[] | null;
    lastFetch: number;
    isStale: boolean;
    version: string; // Cache version for invalidation
  } = {
    data: null,
    lastFetch: 0,
    isStale: false,
    version: ''
  };
  
  private mappingsCache: {
    specialtyMappings: any[] | null;
    columnMappings: any[] | null;
    learnedSpecialtyMappings: Record<string, string> | null;
    learnedColumnMappings: Record<string, string> | null;
    learnedRegionMappings: Record<string, string> | null;
    learnedVariableMappings: Record<string, string> | null;
    learnedProviderTypeMappings: Record<string, string> | null;
    lastFetch: number;
    version: string; // Cache version for invalidation
  } = {
    specialtyMappings: null,
    columnMappings: null,
    learnedSpecialtyMappings: null,
    learnedColumnMappings: null,
    learnedRegionMappings: null,
    learnedVariableMappings: null,
    learnedProviderTypeMappings: null,
    lastFetch: 0,
    version: ''
  };

  // Intermediate result caches
  private normalizedRowsCache: {
    data: NormalizedRow[] | null;
    surveyIds: string[];
    lastFetch: number;
    version: string;
  } = {
    data: null,
    surveyIds: [],
    lastFetch: 0,
    version: ''
  };

  private aggregationCache: {
    data: AggregatedData[] | null;
    normalizedRowsHash: string;
    lastFetch: number;
    version: string;
  } = {
    data: null,
    normalizedRowsHash: '',
    lastFetch: 0,
    version: ''
  };
  
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (Google-style)
  private readonly STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes (show stale data while refreshing)
  
  static getInstance(): GlobalAnalyticsCache {
    if (!GlobalAnalyticsCache.instance) {
      GlobalAnalyticsCache.instance = new GlobalAnalyticsCache();
    }
    return GlobalAnalyticsCache.instance;
  }
  
  // Check if we have fresh data
  hasFreshData(): boolean {
    const now = Date.now();
    return this.dataCache.data !== null && 
           (now - this.dataCache.lastFetch) < this.CACHE_DURATION;
  }
  
  // Check if we have stale data (for background refresh)
  hasStaleData(): boolean {
    const now = Date.now();
    return this.dataCache.data !== null && 
           (now - this.dataCache.lastFetch) < this.STALE_THRESHOLD;
  }
  
  // Get cached data
  getCachedData(): AggregatedData[] | null {
    return this.dataCache.data;
  }
  
  // Set cached data
  setCachedData(data: AggregatedData[]): void {
    this.dataCache = {
      data,
      lastFetch: Date.now(),
      isStale: false,
      version: this.generateCacheVersion()
    };
  }
  
  // Mark data as stale (trigger background refresh)
  markAsStale(): void {
    this.dataCache.isStale = true;
  }
  
  // Clear cache completely
  clearCache(): void {
    this.dataCache = {
      data: null,
      lastFetch: 0,
      isStale: false,
      version: ''
    };
    this.mappingsCache = {
      specialtyMappings: null,
      columnMappings: null,
      learnedSpecialtyMappings: null,
      learnedColumnMappings: null,
      learnedRegionMappings: null,
      learnedVariableMappings: null,
      learnedProviderTypeMappings: null,
      lastFetch: 0,
      version: ''
    };
    this.normalizedRowsCache = {
      data: null,
      surveyIds: [],
      lastFetch: 0,
      version: ''
    };
    this.aggregationCache = {
      data: null,
      normalizedRowsHash: '',
      lastFetch: 0,
      version: ''
    };
    
    // Clear computation cache as well
    analyticsComputationCache.clear();
    
    // Trigger cache invalidation event
    cacheInvalidation.onDataCleared();
  }

  // Generate cache version based on current data state
  private generateCacheVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Check if normalized rows cache is valid
  hasValidNormalizedRows(surveyIds: string[]): boolean {
    const now = Date.now();
    const isSameSurveys = JSON.stringify(surveyIds.sort()) === JSON.stringify(this.normalizedRowsCache.surveyIds.sort());
    const isFresh = (now - this.normalizedRowsCache.lastFetch) < this.CACHE_DURATION;
    return this.normalizedRowsCache.data !== null && isSameSurveys && isFresh;
  }

  // Get cached normalized rows
  getCachedNormalizedRows(): NormalizedRow[] | null {
    return this.normalizedRowsCache.data;
  }

  // Set cached normalized rows
  setCachedNormalizedRows(data: NormalizedRow[], surveyIds: string[]): void {
    this.normalizedRowsCache = {
      data,
      surveyIds: [...surveyIds],
      lastFetch: Date.now(),
      version: this.generateCacheVersion()
    };
  }

  // Check if aggregation cache is valid
  hasValidAggregation(normalizedRowsHash: string): boolean {
    const now = Date.now();
    const isSameHash = this.aggregationCache.normalizedRowsHash === normalizedRowsHash;
    const isFresh = (now - this.aggregationCache.lastFetch) < this.CACHE_DURATION;
    return this.aggregationCache.data !== null && isSameHash && isFresh;
  }

  // Get cached aggregation
  getCachedAggregation(): AggregatedData[] | null {
    return this.aggregationCache.data;
  }

  // Set cached aggregation
  setCachedAggregation(data: AggregatedData[], normalizedRowsHash: string): void {
    this.aggregationCache = {
      data,
      normalizedRowsHash,
      lastFetch: Date.now(),
      version: this.generateCacheVersion()
    };
  }

  // Clear intermediate caches when data changes
  clearIntermediateCaches(): void {
    this.normalizedRowsCache = {
      data: null,
      surveyIds: [],
      lastFetch: 0,
      version: ''
    };
    this.aggregationCache = {
      data: null,
      normalizedRowsHash: '',
      lastFetch: 0,
      version: ''
    };
    
    // Clear computation cache for intermediate results
    cacheUtils.clearAggregation();
    cacheUtils.clearGrouping();
  }
  
  // Get cached mappings
  getCachedMappings(): { 
    specialtyMappings: any[] | null, 
    columnMappings: any[] | null,
    learnedSpecialtyMappings: Record<string, string> | null,
    learnedColumnMappings: Record<string, string> | null,
    learnedRegionMappings: Record<string, string> | null,
    learnedVariableMappings: Record<string, string> | null,
    learnedProviderTypeMappings: Record<string, string> | null
  } {
    const now = Date.now();
    if (this.mappingsCache.specialtyMappings && 
        this.mappingsCache.columnMappings && 
        (now - this.mappingsCache.lastFetch) < this.CACHE_DURATION) {
      return {
        specialtyMappings: this.mappingsCache.specialtyMappings,
        columnMappings: this.mappingsCache.columnMappings,
        learnedSpecialtyMappings: this.mappingsCache.learnedSpecialtyMappings,
        learnedColumnMappings: this.mappingsCache.learnedColumnMappings,
        learnedRegionMappings: this.mappingsCache.learnedRegionMappings,
        learnedVariableMappings: this.mappingsCache.learnedVariableMappings,
        learnedProviderTypeMappings: this.mappingsCache.learnedProviderTypeMappings
      };
    }
    return { 
      specialtyMappings: null, 
      columnMappings: null,
      learnedSpecialtyMappings: null,
      learnedColumnMappings: null,
      learnedRegionMappings: null,
      learnedVariableMappings: null,
      learnedProviderTypeMappings: null
    };
  }
  
  // Set cached mappings
  setCachedMappings(
    specialtyMappings: any[], 
    columnMappings: any[],
    learnedSpecialtyMappings?: Record<string, string>,
    learnedColumnMappings?: Record<string, string>,
    learnedRegionMappings?: Record<string, string>,
    learnedVariableMappings?: Record<string, string>,
    learnedProviderTypeMappings?: Record<string, string>
  ): void {
    this.mappingsCache = {
      specialtyMappings,
      columnMappings,
      learnedSpecialtyMappings: learnedSpecialtyMappings || null,
      learnedColumnMappings: learnedColumnMappings || null,
      learnedRegionMappings: learnedRegionMappings || null,
      learnedVariableMappings: learnedVariableMappings || null,
      learnedProviderTypeMappings: learnedProviderTypeMappings || null,
      lastFetch: Date.now(),
      version: this.generateCacheVersion()
    };
  }
}

export class AnalyticsDataService {
  private dataService = getDataService();
  private globalCache = GlobalAnalyticsCache.getInstance();
  private lastDataHash: string | null = null;

  /**
   * Check if survey data has changed since last cache
   */
  private async hasDataChanged(): Promise<boolean> {
    try {
      const surveys = await this.dataService.getAllSurveys();
      const currentHash = JSON.stringify(surveys.map(s => ({
        id: s.id,
        uploadDate: s.uploadDate,
        rowCount: s.rowCount,
        specialtyCount: s.specialtyCount
      })));
      
      if (this.lastDataHash === null || this.lastDataHash !== currentHash) {
        this.lastDataHash = currentHash;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking data changes:', error);
      return true; // Assume changed if we can't check
    }
  }

  /**
   * Smart cache invalidation - only clear when data actually changes
   */
  private async shouldInvalidateCache(): Promise<boolean> {
    const dataChanged = await this.hasDataChanged();
    
    if (dataChanged) {
      console.log('🔍 Data has changed, invalidating cache');
      this.globalCache.clearCache();
      return true;
    }
    
    return false;
  }

  /**
   * Check if we have cached data available
   */
  public hasCachedData(): boolean {
    return this.globalCache.hasFreshData();
  }

  /**
   * Get cached data without triggering a fetch
   */
  public getCachedData(): AggregatedData[] | null {
    return this.globalCache.getCachedData();
  }

  /**
   * Manually invalidate cache (call this when surveys are uploaded or mappings change)
   */
  public invalidateCache(): void {
    console.log('🔍 Manually invalidating analytics cache');
    this.globalCache.clearCache();
    this.lastDataHash = null;
  }

  /**
   * Get cached mappings or fetch fresh ones (including learned mappings)
   */
  private async getCachedMappings(providerType?: string): Promise<{ 
    specialtyMappings: any[], 
    columnMappings: any[],
    learnedSpecialtyMappings: Record<string, string>,
    learnedColumnMappings: Record<string, string>,
    learnedRegionMappings: Record<string, string>,
    learnedVariableMappings: Record<string, string>,
    learnedProviderTypeMappings: Record<string, string>
  }> {
    // Check global cache first
    const cachedMappings = this.globalCache.getCachedMappings();
    if (cachedMappings.specialtyMappings && cachedMappings.columnMappings) {
      return {
        specialtyMappings: cachedMappings.specialtyMappings,
        columnMappings: cachedMappings.columnMappings,
        learnedSpecialtyMappings: cachedMappings.learnedSpecialtyMappings || {},
        learnedColumnMappings: cachedMappings.learnedColumnMappings || {},
        learnedRegionMappings: cachedMappings.learnedRegionMappings || {},
        learnedVariableMappings: cachedMappings.learnedVariableMappings || {},
        learnedProviderTypeMappings: cachedMappings.learnedProviderTypeMappings || {}
      };
    }
    
    // Fetch fresh mappings and learned mappings
    const [
      specialtyMappings, 
      columnMappings,
      learnedSpecialtyMappings,
      learnedColumnMappings,
      learnedRegionMappings,
      learnedVariableMappings,
      learnedProviderTypeMappings
    ] = await Promise.all([
      this.dataService.getAllSpecialtyMappings(),
      this.dataService.getAllColumnMappings(),
      this.dataService.getLearnedMappings('specialty', providerType),
      this.dataService.getLearnedMappings('column', providerType),
      this.dataService.getLearnedMappings('region', providerType),
      this.dataService.getLearnedMappings('variable', providerType),
      this.dataService.getLearnedMappings('providerType', providerType)
    ]);
    
    // Update global cache with all mappings
    this.globalCache.setCachedMappings(
      specialtyMappings, 
      columnMappings,
      learnedSpecialtyMappings,
      learnedColumnMappings,
      learnedRegionMappings,
      learnedVariableMappings,
      learnedProviderTypeMappings
    );
    
    return { 
      specialtyMappings, 
      columnMappings,
      learnedSpecialtyMappings,
      learnedColumnMappings,
      learnedRegionMappings,
      learnedVariableMappings,
      learnedProviderTypeMappings
    };
  }

  /**
   * Get all analytics data with Google-style caching
   */
  async getAnalyticsData(filters: AnalyticsFilters = {
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '',
    year: ''
  }): Promise<AggregatedData[]> {
    try {
      // Smart cache invalidation - only clear if data has actually changed
      await this.shouldInvalidateCache();
      
      // Google-style caching: Check if we have fresh data first
      if (this.globalCache.hasFreshData()) {
        const cachedData = this.globalCache.getCachedData();
        if (cachedData) {
          console.log('🚀 Using cached analytics data (fast!)');
          // Trigger background refresh if data is getting stale
          if (this.globalCache.hasStaleData()) {
            this.refreshDataInBackground();
          }
          return cachedData;
        }
      }
      
      // If no fresh data, fetch it
      
      // Get all surveys and cached mappings (including learned mappings)
      const [surveys, { 
        specialtyMappings, 
        columnMappings,
        learnedSpecialtyMappings,
        learnedColumnMappings,
        learnedRegionMappings,
        learnedVariableMappings,
        learnedProviderTypeMappings
      }] = await Promise.all([
        this.dataService.getAllSurveys(),
        this.getCachedMappings()
      ]);
      
      
      if (surveys.length === 0) {
        return [];
      }
      
      // Check for cached normalized rows first
      const surveyIds = surveys.map(s => s.id);
      let allNormalizedRows: NormalizedRow[] = [];
      
      if (this.globalCache.hasValidNormalizedRows(surveyIds)) {
        const cachedRows = this.globalCache.getCachedNormalizedRows();
        if (cachedRows) {
          allNormalizedRows = cachedRows;
        }
      }
      
      if (allNormalizedRows.length === 0) {
        // Process surveys in parallel for better performance
        const maxConcurrent = Math.min(3, surveys.length);
        const surveyPromises = surveys.slice(0, maxConcurrent).map(async (survey) => {
        
        try {
          // Get survey data with pagination to limit memory usage (reduced for faster loading)
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 500 });
          
          if (surveyData.rows.length === 0) {
            return [];
          }
          
          // Normalize rows in batches to avoid blocking the main thread (smaller batches for faster processing)
          const normalizedRows: NormalizedRow[] = [];
          const batchSize = 50;
          
          for (let i = 0; i < surveyData.rows.length; i += batchSize) {
            const batch = surveyData.rows.slice(i, i + batchSize);
            const batchNormalized = batch.map(row => 
            this.normalizeRow(row, survey, specialtyMappings, columnMappings, {
              learnedSpecialtyMappings,
              learnedColumnMappings,
              learnedRegionMappings,
              learnedVariableMappings,
              learnedProviderTypeMappings
            })
          );
            normalizedRows.push(...batchNormalized);
            
            // Yield control to allow UI updates
            if (i + batchSize < surveyData.rows.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          return normalizedRows;
          
        } catch (error) {
          return [];
        }
      });
      
        // Wait for all surveys to complete
        const surveyResults = await Promise.all(surveyPromises);
        
        // Flatten results
        surveyResults.forEach(normalizedRows => {
          allNormalizedRows.push(...normalizedRows);
        });
        
        // Cache normalized rows for future use
        if (allNormalizedRows.length > 0) {
          this.globalCache.setCachedNormalizedRows(allNormalizedRows, surveyIds);
        }
      }
      
      if (allNormalizedRows.length === 0) {
        return [];
      }
      
      // Check for cached aggregation
      const normalizedRowsHash = JSON.stringify(allNormalizedRows.map(r => ({
        specialty: r.specialty,
        providerType: r.providerType,
        region: r.region,
        surveySource: r.surveySource,
        surveyYear: r.surveyYear
      })));
      
      let aggregatedData: AggregatedData[];
      
      if (this.globalCache.hasValidAggregation(normalizedRowsHash)) {
        const cachedAggregation = this.globalCache.getCachedAggregation();
        if (cachedAggregation) {
          aggregatedData = cachedAggregation;
        } else {
          aggregatedData = await this.stackAndAggregateDataOptimized(allNormalizedRows);
          this.globalCache.setCachedAggregation(aggregatedData, normalizedRowsHash);
        }
      } else {
        // Stack and aggregate the normalized data in chunks for better performance
        aggregatedData = await this.stackAndAggregateDataOptimized(allNormalizedRows);
        
        // Cache both aggregation and final data
        this.globalCache.setCachedAggregation(aggregatedData, normalizedRowsHash);
        this.globalCache.setCachedData(aggregatedData);
      }
      
      return aggregatedData;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get analytics data for selected variables (DYNAMIC)
   * NEW METHOD: Fetch data for any combination of variables
   */
  async getAnalyticsDataByVariables(
    filters: AnalyticsFilters,
    selectedVariables: string[] // e.g., ["tcc", "base_salary", "work_rvus"]
  ): Promise<DynamicAggregatedData[]> {
    try {
      console.log('🔍 AnalyticsDataService: Fetching data for variables:', selectedVariables);
      console.log('🔍 AnalyticsDataService: Filters:', filters);
      
      // Get all surveys and cached mappings
      const [surveys, { 
        specialtyMappings, 
        columnMappings,
        learnedSpecialtyMappings,
        learnedColumnMappings,
        learnedRegionMappings,
        learnedVariableMappings,
        learnedProviderTypeMappings
      }] = await Promise.all([
        this.dataService.getAllSurveys(),
        this.getCachedMappings()
      ]);
      
      if (surveys.length === 0) {
        return [];
      }
      
      // Process surveys in parallel for better performance
      const allNormalizedRows: DynamicNormalizedRow[] = [];
      console.log('🔍 AnalyticsDataService: Processing', surveys.length, 'surveys');
      
      // Limit concurrent surveys to avoid overwhelming IndexedDB
      const maxConcurrent = Math.min(3, surveys.length);
      const surveyPromises = surveys.slice(0, maxConcurrent).map(async (survey) => {
        try {
          // Get survey data with pagination to limit memory usage
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 500 });
          
          if (surveyData.rows.length === 0) {
            return [];
          }
          
          // Normalize rows dynamically based on selected variables
          const normalizedRows: DynamicNormalizedRow[] = [];
          const batchSize = 50;
          
          for (let i = 0; i < surveyData.rows.length; i += batchSize) {
            const batch = surveyData.rows.slice(i, i + batchSize);
            const batchNormalized = batch.map(row => 
              this.normalizeRowDynamic(row, survey, selectedVariables, {
                specialtyMappings,
                columnMappings,
                learnedSpecialtyMappings,
                learnedColumnMappings,
                learnedRegionMappings,
                learnedVariableMappings,
                learnedProviderTypeMappings
              })
            );
            normalizedRows.push(...batchNormalized);
            
            // Yield control to allow UI updates
            if (i + batchSize < surveyData.rows.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          return normalizedRows;
          
        } catch (error) {
          console.warn(`⚠️ AnalyticsDataService: Failed to process survey ${survey.id}:`, error);
          return [];
        }
      });
      
      // Wait for all surveys to complete
      const surveyResults = await Promise.all(surveyPromises);
      
      // Flatten results
      surveyResults.forEach(normalizedRows => {
        allNormalizedRows.push(...normalizedRows);
      });
      
      if (allNormalizedRows.length === 0) {
        return [];
      }
      
      // Aggregate the normalized data dynamically
      console.log('🔍 AnalyticsDataService: Normalized rows count:', allNormalizedRows.length);
      if (allNormalizedRows.length > 0) {
        console.log('🔍 AnalyticsDataService: First normalized row:', JSON.stringify(allNormalizedRows[0], null, 2));
      }
      
      const aggregatedData = await this.aggregateByVariables(allNormalizedRows);
      
      console.log(`✅ AnalyticsDataService: Aggregated ${aggregatedData.length} records for ${selectedVariables.length} variables`);
      if (aggregatedData.length > 0) {
        console.log('🔍 AnalyticsDataService: First aggregated record:', JSON.stringify(aggregatedData[0], null, 2));
      }
      
      return aggregatedData;
      
    } catch (error) {
      console.error('❌ AnalyticsDataService: Error fetching dynamic data:', error);
      throw error;
    }
  }


  /**
   * Force refresh cache (call this when data structure changes)
   */
  forceRefreshCache(): void {
    this.globalCache.clearCache();
  }

  /**
   * Clear cache completely (call this when data structure changes)
   */
  clearCache(): void {
    this.globalCache.clearCache();
  }

  /**
   * Background refresh method (Google-style)
   * Refreshes data in the background without blocking the UI
   */
  private async refreshDataInBackground(): Promise<void> {
    try {
      
      // Get fresh data without affecting current cache (including learned mappings)
      const [surveys, { 
        specialtyMappings, 
        columnMappings,
        learnedSpecialtyMappings,
        learnedColumnMappings,
        learnedRegionMappings,
        learnedVariableMappings,
        learnedProviderTypeMappings
      }] = await Promise.all([
        this.dataService.getAllSurveys(),
        this.getCachedMappings()
      ]);
      
      if (surveys.length === 0) return;
      
      // Process data in background
      const allNormalizedRows: NormalizedRow[] = [];
      
      const surveyPromises = surveys.map(async (survey) => {
        try {
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 1000 });
          
          if (surveyData.rows.length === 0) return [];
          
          const normalizedRows: NormalizedRow[] = [];
          const batchSize = 100;
          
          for (let i = 0; i < surveyData.rows.length; i += batchSize) {
            const batch = surveyData.rows.slice(i, i + batchSize);
            const batchNormalized = batch.map(row => 
              this.normalizeRow(row, survey, specialtyMappings, columnMappings, {
                learnedSpecialtyMappings,
                learnedColumnMappings,
                learnedRegionMappings,
                learnedVariableMappings,
                learnedProviderTypeMappings
              })
            );
            normalizedRows.push(...batchNormalized);
            
            // Yield control
            if (i + batchSize < surveyData.rows.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          return normalizedRows;
        } catch (error) {
          return [];
        }
      });
      
      const surveyResults = await Promise.all(surveyPromises);
      surveyResults.forEach(normalizedRows => {
        allNormalizedRows.push(...normalizedRows);
      });
      
      if (allNormalizedRows.length > 0) {
        const aggregatedData = await this.stackAndAggregateDataOptimized(allNormalizedRows);
        this.globalCache.setCachedData(aggregatedData);
      }
      
    } catch (error) {
    }
  }

  /**
   * Normalize a raw survey row using mappings and learned mappings
   * Data is in long format: each row has a 'variable' field (TCC, wRVU, CF) and p25/p50/p75/p90 values
   */
  private normalizeRow(
    row: any, 
    survey: any, 
    specialtyMappings: ISpecialtyMapping[], 
    columnMappings: IColumnMapping[],
    learnedMappings?: {
      learnedSpecialtyMappings: Record<string, string>;
      learnedColumnMappings: Record<string, string>;
      learnedRegionMappings: Record<string, string>;
      learnedVariableMappings: Record<string, string>;
      learnedProviderTypeMappings: Record<string, string>;
    }
  ): NormalizedRow {
    // The row might be a SurveyData object with the actual data in the 'data' property
    const actualRowData = row.data || row;
    
    
    // Extract specialty - check multiple possible locations and formats
    const rawSpecialty = actualRowData.specialty || actualRowData.Specialty || 
                        actualRowData.normalizedSpecialty || actualRowData['Provider Type'] ||
                        row.specialty || 'Unknown';
    
    // Normalize specialty using specialty mappings and learned mappings
    const normalizedSpecialty = this.normalizeSpecialty(
      rawSpecialty,
      specialtyMappings,
      survey.type,
      learnedMappings?.learnedSpecialtyMappings
    );
    
    // Extract provider type
    const rawProviderType = actualRowData.providerType || actualRowData['Provider Type'] ||
                           actualRowData.provider_type || row.providerType || 'Physician';
    
    // Normalize provider type using learned mappings
    const normalizedProviderType = this.normalizeProviderType(rawProviderType, learnedMappings?.learnedProviderTypeMappings);
    
    // Extract region
    const rawRegion = actualRowData.geographicRegion || actualRowData.region || 
                     actualRowData.Region || actualRowData.geographic_region ||
                     row.region || 'National';
    
    // Normalize region using learned mappings
    const normalizedRegion = this.normalizeRegion(rawRegion, learnedMappings?.learnedRegionMappings);
    
    // Extract organizational data
    const extractOrgNumber = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseInt(value.replace(/[,$]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    const n_orgs = extractOrgNumber(
      actualRowData.n_orgs || actualRowData.N_orgs || actualRowData.n_org || actualRowData.N_org || 
      actualRowData['# Orgs'] || actualRowData['# Organizations'] || actualRowData['Number of Organizations'] ||
      actualRowData['N Orgs'] || actualRowData['N Organizations'] || 
      row.n_orgs || 0
    );
    
    const n_incumbents = extractOrgNumber(
      actualRowData.n_incumbents || actualRowData.N_incumbents || actualRowData.n_incumbent || actualRowData.N_incumbent ||
      actualRowData['# Incumbents'] || actualRowData['Number of Incumbents'] || actualRowData['Incumbents'] ||
      actualRowData['N Incumbents'] || actualRowData['N Incumbent'] ||
      row.n_incumbents || 0
    );
    
    // Handle both WIDE format (separate columns) and LONG format (variable field)
    const hasVariableField = actualRowData.variable !== undefined;
    
    // Initialize all metrics to 0
    const normalizedMetrics = {
      tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
      wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
      cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0
    };
    
    if (hasVariableField) {
      // LONG FORMAT: Data has a 'variable' field (TCC, Work RVUs, TCC per Work RVU)
      const variable = String(actualRowData.variable).toLowerCase();
      const p25 = this.extractNumber(actualRowData.p25);
      const p50 = this.extractNumber(actualRowData.p50);
      const p75 = this.extractNumber(actualRowData.p75);
      const p90 = this.extractNumber(actualRowData.p90);
      
      
      // Set the appropriate metrics based on the variable type
      // IMPORTANT: Order matters - check most specific patterns first
      
      
      if (variable.includes('tcc per work rvu') || variable.includes('conversion factor')) {
        // This is definitely a conversion factor
        normalizedMetrics.cf_p25 = p25;
        normalizedMetrics.cf_p50 = p50;
        normalizedMetrics.cf_p75 = p75;
        normalizedMetrics.cf_p90 = p90;
      } else if (variable === 'tcc' || 
                 variable.includes('total cash compensation') || 
                 variable.includes('total compensation') ||
                 variable.includes('cash compensation') ||
                 variable.includes('total comp')) {
        // This is total cash compensation
        normalizedMetrics.tcc_p25 = p25;
        normalizedMetrics.tcc_p50 = p50;
        normalizedMetrics.tcc_p75 = p75;
        normalizedMetrics.tcc_p90 = p90;
      } else if (variable.includes('work rvu') || variable.includes('wrvu')) {
        // This is work RVUs (but NOT if it contains "per" or "conversion")
        console.log('🔍 Processing wRVU variable:', variable);
        if (!variable.includes('per') && !variable.includes('conversion')) {
          // Additional check: wRVU values are typically much larger than CF values
          // If the values are small (< 1000), they're likely conversion factors
          if (p50 > 1000) {
            normalizedMetrics.wrvu_p25 = p25;
            normalizedMetrics.wrvu_p50 = p50;
            normalizedMetrics.wrvu_p75 = p75;
            normalizedMetrics.wrvu_p90 = p90;
          } else {
            // Small values in wRVU field are likely conversion factors
            console.log('✅ Detected CF variable (small wRVU values):', variable);
            normalizedMetrics.cf_p25 = p25;
            normalizedMetrics.cf_p50 = p50;
            normalizedMetrics.cf_p75 = p75;
            normalizedMetrics.cf_p90 = p90;
          }
        } else {
          // This is actually a conversion factor disguised as wRVU
          console.log('✅ Detected CF variable (wRVU with per/conversion):', variable);
          normalizedMetrics.cf_p25 = p25;
          normalizedMetrics.cf_p50 = p50;
          normalizedMetrics.cf_p75 = p75;
          normalizedMetrics.cf_p90 = p90;
        }
      } else if (variable.includes('cf') || variable.includes('conversion')) {
        // This is a conversion factor
        console.log('✅ Detected CF variable:', variable);
        normalizedMetrics.cf_p25 = p25;
        normalizedMetrics.cf_p50 = p50;
        normalizedMetrics.cf_p75 = p75;
        normalizedMetrics.cf_p90 = p90;
      }
    } else {
      // WIDE FORMAT: Data has separate columns for each metric
      // Debug logging for WIDE format (temporarily enabled for debugging)
      const hasTccColumns = Object.keys(actualRowData).some(key => 
        key.toLowerCase().includes('tcc') || 
        (key.toLowerCase().includes('total') && key.toLowerCase().includes('comp'))
      );
      if (hasTccColumns) {
        console.log('🔍 Processing WIDE format data with TCC columns. Available columns:', Object.keys(actualRowData));
      }
      
      // Extract TCC metrics with fallback column names
      const tcc_p25 = this.extractNumber(
        actualRowData.tcc_p25 || actualRowData['TCC P25'] || actualRowData['tcc_p25'] || actualRowData['TCC_p25']
      );
      const tcc_p50 = this.extractNumber(
        actualRowData.tcc_p50 || actualRowData['TCC P50'] || actualRowData['tcc_p50'] || actualRowData['TCC_p50'] || actualRowData['TCC Median']
      );
      const tcc_p75 = this.extractNumber(
        actualRowData.tcc_p75 || actualRowData['TCC P75'] || actualRowData['tcc_p75'] || actualRowData['TCC_p75']
      );
      const tcc_p90 = this.extractNumber(
        actualRowData.tcc_p90 || actualRowData['TCC P90'] || actualRowData['tcc_p90'] || actualRowData['TCC_p90']
      );
      
      console.log('💰 TCC values extracted:', { tcc_p25, tcc_p50, tcc_p75, tcc_p90 });
      
      normalizedMetrics.tcc_p25 = tcc_p25;
      normalizedMetrics.tcc_p50 = tcc_p50;
      normalizedMetrics.tcc_p75 = tcc_p75;
      normalizedMetrics.tcc_p90 = tcc_p90;
      
      // Extract wRVU metrics with fallback column names
      normalizedMetrics.wrvu_p25 = this.extractNumber(
        actualRowData.wrvu_p25 || actualRowData['wRVU P25'] || actualRowData['WRVU P25'] || actualRowData['wrvu_p25'] || actualRowData['WRVU_p25']
      );
      normalizedMetrics.wrvu_p50 = this.extractNumber(
        actualRowData.wrvu_p50 || actualRowData['wRVU P50'] || actualRowData['WRVU P50'] || actualRowData['wrvu_p50'] || actualRowData['WRVU_p50'] || actualRowData['wRVU Median']
      );
      normalizedMetrics.wrvu_p75 = this.extractNumber(
        actualRowData.wrvu_p75 || actualRowData['wRVU P75'] || actualRowData['WRVU P75'] || actualRowData['wrvu_p75'] || actualRowData['WRVU_p75']
      );
      normalizedMetrics.wrvu_p90 = this.extractNumber(
        actualRowData.wrvu_p90 || actualRowData['wRVU P90'] || actualRowData['WRVU P90'] || actualRowData['wrvu_p90'] || actualRowData['WRVU_p90']
      );
      
      // Extract CF metrics with fallback column names
      normalizedMetrics.cf_p25 = this.extractNumber(
        actualRowData.cf_p25 || actualRowData['CF P25'] || actualRowData['cf_p25'] || actualRowData['CF_p25'] || actualRowData['Conversion Factor P25']
      );
      normalizedMetrics.cf_p50 = this.extractNumber(
        actualRowData.cf_p50 || actualRowData['CF P50'] || actualRowData['cf_p50'] || actualRowData['CF_p50'] || actualRowData['Conversion Factor P50'] || actualRowData['CF Median']
      );
      normalizedMetrics.cf_p75 = this.extractNumber(
        actualRowData.cf_p75 || actualRowData['CF P75'] || actualRowData['cf_p75'] || actualRowData['CF_p75'] || actualRowData['Conversion Factor P75']
      );
      normalizedMetrics.cf_p90 = this.extractNumber(
        actualRowData.cf_p90 || actualRowData['CF P90'] || actualRowData['cf_p90'] || actualRowData['CF_p90'] || actualRowData['Conversion Factor P90']
      );
      
      // If we still don't have wRVU or CF data, try intelligent column matching
      if (normalizedMetrics.wrvu_p50 === 0 || normalizedMetrics.cf_p50 === 0) {
        
        // Try to find wRVU columns using pattern matching
        for (const [key, value] of Object.entries(actualRowData)) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('wrvu') || lowerKey.includes('rvu') || lowerKey.includes('work')) {
            if (lowerKey.includes('25') && normalizedMetrics.wrvu_p25 === 0) {
              normalizedMetrics.wrvu_p25 = this.extractNumber(value);
            } else if (lowerKey.includes('50') && normalizedMetrics.wrvu_p50 === 0) {
              normalizedMetrics.wrvu_p50 = this.extractNumber(value);
            } else if (lowerKey.includes('75') && normalizedMetrics.wrvu_p75 === 0) {
              normalizedMetrics.wrvu_p75 = this.extractNumber(value);
            } else if (lowerKey.includes('90') && normalizedMetrics.wrvu_p90 === 0) {
              normalizedMetrics.wrvu_p90 = this.extractNumber(value);
            }
          }
          
          // Try to find CF columns using pattern matching
          if (lowerKey.includes('cf') || lowerKey.includes('conversion') || lowerKey.includes('factor')) {
            if (lowerKey.includes('25') && normalizedMetrics.cf_p25 === 0) {
              normalizedMetrics.cf_p25 = this.extractNumber(value);
            } else if (lowerKey.includes('50') && normalizedMetrics.cf_p50 === 0) {
              normalizedMetrics.cf_p50 = this.extractNumber(value);
            } else if (lowerKey.includes('75') && normalizedMetrics.cf_p75 === 0) {
              normalizedMetrics.cf_p75 = this.extractNumber(value);
            } else if (lowerKey.includes('90') && normalizedMetrics.cf_p90 === 0) {
              normalizedMetrics.cf_p90 = this.extractNumber(value);
            }
          }
        }
      }
      
      
    }
    
    return {
      specialty: normalizedSpecialty,
      providerType: normalizedProviderType,
      region: normalizedRegion,
      n_orgs,
      n_incumbents,
      ...normalizedMetrics,
      surveySource: survey.type || survey.name || 'Unknown',
      surveyYear: survey.year?.toString() || 'Unknown',
      rawData: actualRowData
    };
  }
  
  /**
   * Extract number from various formats
   */
  private extractNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle "***" values as 0
      if (value === '***' || value === '' || value === 'null' || value === 'undefined') return 0;
      const parsed = parseFloat(value.replace(/[,$]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    if (value === null || value === undefined) return 0;
    return 0;
  }

  /**
   * Normalize specialty using specialty mappings and learned mappings
   */
  private normalizeSpecialty(
    specialty: string, 
    mappings: ISpecialtyMapping[], 
    surveySource: string,
    learnedMappings?: Record<string, string>
  ): string {
    if (!specialty || specialty === 'Unknown') return 'Unknown';
    
    // First, try learned mappings (highest priority for enterprise scalability)
    if (learnedMappings && learnedMappings[specialty.toLowerCase()]) {
      return learnedMappings[specialty.toLowerCase()];
    }
    
    // Second, try exact mapping match
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some(source => 
        source.surveySource === surveySource && 
        source.specialty.toLowerCase() === specialty.toLowerCase()
      );
      
      if (hasSourceSpecialty) {
        return mapping.standardizedName;
      }
    }
    
    // If no exact mapping found, try fuzzy matching for common variations
    const normalizedSpecialty = this.normalizeSpecialtyName(specialty);
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some(source => {
        const normalizedSourceSpecialty = this.normalizeSpecialtyName(source.specialty);
        return source.surveySource === surveySource && 
               normalizedSourceSpecialty === normalizedSpecialty;
      });
      
      if (hasSourceSpecialty) {
        return mapping.standardizedName;
      }
    }
    
    // If still no mapping found, return normalized version
    return normalizedSpecialty;
  }

  /**
   * Normalize specialty name for fuzzy matching
   */
  private normalizeSpecialtyName(specialty: string): string {
    if (!specialty) return '';
    
    return specialty
      .toLowerCase()
      .replace(/\s+and\s+/g, ' ')  // Replace "and" with space
      .replace(/\s+/g, ' ')        // Normalize multiple spaces
      .trim();
  }

  /**
   * Normalize provider type using learned mappings
   */
  private normalizeProviderType(providerType: string, learnedMappings?: Record<string, string>): string {
    if (!providerType || providerType === 'Staff Physician') return 'Staff Physician';
    
    // First, try learned mappings (highest priority for enterprise scalability)
    if (learnedMappings && learnedMappings[providerType.toLowerCase()]) {
      return learnedMappings[providerType.toLowerCase()];
    }
    
    const lower = providerType.toLowerCase();
    
    // Handle PhD roles first
    if (lower.includes('phd') || lower.includes('doctor of philosophy')) {
      return 'PhD';
    } else if (lower.includes('physician') || lower.includes('md') || lower.includes('do')) {
      return 'Staff Physician';
    } else if (lower.includes('nurse practitioner') || lower.includes('np')) {
      return 'Nurse Practitioner';
    } else if (lower.includes('physician assistant') || lower.includes('pa')) {
      return 'Physician Assistant';
    } else if (lower.includes('crna')) {
      return 'CRNA';
    } else if (lower.includes('advanced practice') || lower.includes('app')) {
      return 'Advanced Practice Provider';
    }
    
    return providerType;
  }

  /**
   * Normalize region using learned mappings
   */
  private normalizeRegion(region: string, learnedMappings?: Record<string, string>): string {
    if (!region || region === 'National') return 'National';
    
    // First, try learned mappings (highest priority for enterprise scalability)
    if (learnedMappings && learnedMappings[region.toLowerCase()]) {
      return learnedMappings[region.toLowerCase()];
    }
    
    const lower = region.toLowerCase();
    
    if (lower.includes('northeast') || lower.includes('northeastern') || lower.includes('ne')) {
      return 'Northeast';
    } else if (lower.includes('southeast') || lower.includes('southern') || lower.includes('se')) {
      return 'South';
    } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('north central') || lower.includes('nc')) {
      return 'Midwest';
    } else if (lower.includes('west') || lower.includes('western')) {
      return 'West';
    } else if (lower.includes('national')) {
      return 'National';
    }
    
    return region;
  }


  /**
   * Optimized version of stackAndAggregateData that processes data in chunks
   */
  private async stackAndAggregateDataOptimized(
    normalizedRows: NormalizedRow[]
  ): Promise<AggregatedData[]> {
    
    // Process data in chunks to avoid blocking the main thread
    const chunkSize = 1000;
    const groupedData = new Map<string, NormalizedRow[]>();
    
    for (let i = 0; i < normalizedRows.length; i += chunkSize) {
      const chunk = normalizedRows.slice(i, i + chunkSize);
      
      // Process chunk
      chunk.forEach(row => {
        const key = `${row.specialty}_${row.providerType}_${row.region}_${row.surveySource}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, []);
        }
        
        groupedData.get(key)!.push(row);
      });
      
      // Yield control to allow UI updates
      if (i + chunkSize < normalizedRows.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    
    // Convert grouped data to aggregated format
    const aggregatedData: AggregatedData[] = [];
    
    for (const [key, rows] of groupedData) {
      if (rows.length === 0) continue;
      
      const aggregatedRecord = this.createAggregatedRecord(rows, key);
      aggregatedData.push(aggregatedRecord);
    }
    
    
    return aggregatedData;
  }

  /**
   * Create a single aggregated record from a group of rows
   * FIXED: Now shows raw data instead of incorrectly recalculating percentiles
   */
  private createAggregatedRecord(rows: NormalizedRow[], key: string): AggregatedData {
    const firstRow = rows[0];
    
    // Extract original specialty name from raw data
    const originalSpecialty = firstRow.rawData?.specialty || 
                             firstRow.rawData?.Specialty || 
                             firstRow.rawData?.normalizedSpecialty || 
                             firstRow.specialty || 'Unknown';

    // Initialize aggregated record
    const aggregatedRecord: AggregatedData = {
      standardizedName: firstRow.specialty,
      surveySource: firstRow.surveySource,
      surveySpecialty: firstRow.specialty,
      originalSpecialty: originalSpecialty,
      geographicRegion: firstRow.region,
      providerType: firstRow.providerType,
      surveyYear: firstRow.surveyYear,
      tcc_n_orgs: 0,
      tcc_n_incumbents: 0,
      tcc_p25: 0,
      tcc_p50: 0,
      tcc_p75: 0,
      tcc_p90: 0,
      wrvu_n_orgs: 0,
      wrvu_n_incumbents: 0,
      wrvu_p25: 0,
      wrvu_p50: 0,
      wrvu_p75: 0,
      wrvu_p90: 0,
      cf_n_orgs: 0,
      cf_n_incumbents: 0,
      cf_p25: 0,
      cf_p50: 0,
      cf_p75: 0,
      cf_p90: 0
    };
    
    // FIXED: Find the best row for each metric type to ensure we get the right data
    // This ensures analytics matches the raw data shown in upload screen
    if (rows.length > 0) {
      // Find the best representative row for organizational data
      const representativeRow = rows.find(r => r.n_orgs > 0 && r.n_incumbents > 0) || rows[0];
      
      // Find rows with each metric type
      const tccRow = rows.find(r => r.tcc_p50 > 0);
      const wrvuRow = rows.find(r => r.wrvu_p50 > 0);
      const cfRow = rows.find(r => r.cf_p50 > 0);
      
      // Use organizational data from the specific row that contains each metric type
      // TCC organizational data from TCC row
      aggregatedRecord.tcc_n_orgs = tccRow ? tccRow.n_orgs || 0 : 0;
      aggregatedRecord.tcc_n_incumbents = tccRow ? tccRow.n_incumbents || 0 : 0;
      
      // wRVU organizational data from wRVU row
      aggregatedRecord.wrvu_n_orgs = wrvuRow ? wrvuRow.n_orgs || 0 : 0;
      aggregatedRecord.wrvu_n_incumbents = wrvuRow ? wrvuRow.n_incumbents || 0 : 0;
      
      // CF organizational data from CF row
      aggregatedRecord.cf_n_orgs = cfRow ? cfRow.n_orgs || 0 : 0;
      aggregatedRecord.cf_n_incumbents = cfRow ? cfRow.n_incumbents || 0 : 0;
      
      // Use TCC data from TCC row if available
      if (tccRow) {
        aggregatedRecord.tcc_p25 = tccRow.tcc_p25 || 0;
        aggregatedRecord.tcc_p50 = tccRow.tcc_p50 || 0;
        aggregatedRecord.tcc_p75 = tccRow.tcc_p75 || 0;
        aggregatedRecord.tcc_p90 = tccRow.tcc_p90 || 0;
      }
      
      // Use wRVU data from wRVU row if available
      if (wrvuRow) {
        aggregatedRecord.wrvu_p25 = wrvuRow.wrvu_p25 || 0;
        aggregatedRecord.wrvu_p50 = wrvuRow.wrvu_p50 || 0;
        aggregatedRecord.wrvu_p75 = wrvuRow.wrvu_p75 || 0;
        aggregatedRecord.wrvu_p90 = wrvuRow.wrvu_p90 || 0;
      }
      
      // Use CF data from CF row if available
      if (cfRow) {
        aggregatedRecord.cf_p25 = cfRow.cf_p25 || 0;
        aggregatedRecord.cf_p50 = cfRow.cf_p50 || 0;
        aggregatedRecord.cf_p75 = cfRow.cf_p75 || 0;
        aggregatedRecord.cf_p90 = cfRow.cf_p90 || 0;
      }
    }
    
    
    return aggregatedRecord;
  }

  /**
   * NEW: Dynamic row normalization for any variables
   */
  private normalizeRowDynamic(
    row: any,
    survey: any,
    selectedVariables: string[],
    mappings: {
      specialtyMappings: any[];
      columnMappings: any[];
      learnedSpecialtyMappings: Record<string, string>;
      learnedColumnMappings: Record<string, string>;
      learnedRegionMappings: Record<string, string>;
      learnedVariableMappings: Record<string, string>;
      learnedProviderTypeMappings: Record<string, string>;
    }
  ): DynamicNormalizedRow {
    const actualRowData = row.data || row;
    const variables: Record<string, VariableMetrics> = {};
    
    // Extract specialty, provider type, region (same as existing logic)
    const rawSpecialty = actualRowData.specialty || actualRowData.Specialty || 
                        actualRowData.normalizedSpecialty || actualRowData['Provider Type'] ||
                        row.specialty || 'Unknown';
    
    const normalizedSpecialty = this.normalizeSpecialty(
      rawSpecialty,
      mappings.specialtyMappings,
      survey.type,
      mappings.learnedSpecialtyMappings
    );
    
    const rawProviderType = actualRowData.providerType || actualRowData['Provider Type'] ||
                           actualRowData.provider_type || row.providerType || 'Physician';
    
    const normalizedProviderType = this.normalizeProviderType(rawProviderType, mappings.learnedProviderTypeMappings);
    
    const rawRegion = actualRowData.geographicRegion || actualRowData.region || 
                     actualRowData.Region || actualRowData.geographic_region ||
                     row.region || 'National';
    
    const normalizedRegion = this.normalizeRegion(rawRegion, mappings.learnedRegionMappings);
    
    // Extract organizational data
    const extractOrgNumber = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseInt(value.replace(/[,$]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    const n_orgs = extractOrgNumber(
      actualRowData.n_orgs || actualRowData.N_orgs || actualRowData.n_org || actualRowData.N_org || 
      actualRowData['# Orgs'] || actualRowData['# Organizations'] || actualRowData['Number of Organizations'] ||
      actualRowData['N Orgs'] || actualRowData['N Organizations'] || 
      row.n_orgs || 0
    );
    
    const n_incumbents = extractOrgNumber(
      actualRowData.n_incumbents || actualRowData.N_incumbents || actualRowData.n_incumbent || actualRowData.N_incumbent ||
      actualRowData['# Incumbents'] || actualRowData['Number of Incumbents'] || actualRowData['Incumbents'] ||
      actualRowData['N Incumbents'] || actualRowData['N Incumbent'] ||
      row.n_incumbents || 0
    );
    
    // Handle both LONG format (variable field) and WIDE format (separate columns)
    const hasVariableField = actualRowData.variable !== undefined;
    
    if (hasVariableField) {
      // LONG FORMAT: Data has a 'variable' field
      const variable = String(actualRowData.variable).toLowerCase();
      const normalizedVarName = normalizeVariableName(actualRowData.variable);
      
      if (selectedVariables.includes(normalizedVarName)) {
        variables[normalizedVarName] = {
          variableName: actualRowData.variable,
          n_orgs,
          n_incumbents,
          p25: this.extractNumber(actualRowData.p25),
          p50: this.extractNumber(actualRowData.p50),
          p75: this.extractNumber(actualRowData.p75),
          p90: this.extractNumber(actualRowData.p90)
        };
      }
    } else {
      // WIDE FORMAT: Data has separate columns for each variable
      selectedVariables.forEach(varName => {
        const p50Value = this.extractNumber(actualRowData[`${varName}_p50`]);
        if (p50Value > 0) {
          variables[varName] = {
            variableName: this.formatVariableDisplayName(varName),
            n_orgs,
            n_incumbents,
            p25: this.extractNumber(actualRowData[`${varName}_p25`]),
            p50: p50Value,
            p75: this.extractNumber(actualRowData[`${varName}_p75`]),
            p90: this.extractNumber(actualRowData[`${varName}_p90`])
          };
        }
      });
    }
    
    return {
      specialty: normalizedSpecialty,
      providerType: normalizedProviderType,
      region: normalizedRegion,
      surveySource: survey.type || survey.name || 'Unknown',
      surveyYear: survey.year?.toString() || 'Unknown',
      variables
    };
  }
  
  /**
   * NEW: Aggregate normalized rows by variables
   */
  private async aggregateByVariables(
    normalizedRows: DynamicNormalizedRow[]
  ): Promise<DynamicAggregatedData[]> {
    // Group rows by specialty, provider type, region, and survey source
    const groupedData = new Map<string, DynamicNormalizedRow[]>();
    
    normalizedRows.forEach(row => {
      const key = `${row.specialty}_${row.providerType}_${row.region}_${row.surveySource}`;
      
      if (!groupedData.has(key)) {
        groupedData.set(key, []);
      }
      
      groupedData.get(key)!.push(row);
    });
    
    // Convert grouped data to aggregated format
    const aggregatedData: DynamicAggregatedData[] = [];
    
    for (const [key, rows] of groupedData) {
      if (rows.length === 0) continue;
      
      const firstRow = rows[0];
      
      // Extract original specialty name from raw data
      const originalSpecialty = firstRow.specialty || 'Unknown';
      
      // Initialize aggregated record
      const aggregatedRecord: DynamicAggregatedData = {
        standardizedName: firstRow.specialty,
        surveySource: firstRow.surveySource,
        surveySpecialty: firstRow.specialty,
        originalSpecialty: originalSpecialty,
        geographicRegion: firstRow.region,
        providerType: firstRow.providerType,
        surveyYear: firstRow.surveyYear,
        variables: {}
      };
      
      // Aggregate variables from all rows
      const variableMap = new Map<string, VariableMetrics[]>();
      
      rows.forEach(row => {
        Object.entries(row.variables).forEach(([varName, metrics]) => {
          if (!variableMap.has(varName)) {
            variableMap.set(varName, []);
          }
          variableMap.get(varName)!.push(metrics);
        });
      });
      
      // Create aggregated metrics for each variable
      variableMap.forEach((metricsList, varName) => {
        if (metricsList.length > 0) {
          // Use the first metrics as base (they should all be the same for same variable)
          const baseMetrics = metricsList[0];
          aggregatedRecord.variables[varName] = {
            variableName: baseMetrics.variableName,
            n_orgs: baseMetrics.n_orgs,
            n_incumbents: baseMetrics.n_incumbents,
            p25: baseMetrics.p25,
            p50: baseMetrics.p50,
            p75: baseMetrics.p75,
            p90: baseMetrics.p90
          };
        }
      });
      
      aggregatedData.push(aggregatedRecord);
    }
    
    return aggregatedData;
  }
  
  /**
   * Format variable display name (helper method)
   */
  private formatVariableDisplayName(normalizedName: string): string {
    const displayMap: Record<string, string> = {
      'tcc': 'TCC',
      'work_rvus': 'Work RVUs',
      'work_rvu': 'Work RVUs',
      'wrvu': 'Work RVUs',
      'tcc_per_work_rvu': 'CFs',
      'cf': 'CFs',
      'base_salary': 'Base Salary',
      'asa_units': 'ASA Units',
      'panel_size': 'Panel Size',
      'total_encounters': 'Total Encounters'
    };
    
    return displayMap[normalizedName] || normalizedName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Calculate percentile from a sorted array of numbers
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.floor((percentile / 100) * sortedValues.length);
    return sortedValues[index] || 0;
  }

  /**
   * Stack and aggregate normalized data (legacy method - kept for compatibility)
   * This is the key function that ensures each metric section has its own n_orgs/n_incumbents
   */
  private stackAndAggregateData(
    normalizedRows: NormalizedRow[]
  ): AggregatedData[] {
    
    // Group rows by specialty, provider type, region, and survey source
    const groupedData = new Map<string, NormalizedRow[]>();
    
    normalizedRows.forEach(row => {
      // Create grouping key
      const key = `${row.specialty}_${row.providerType}_${row.region}_${row.surveySource}`;
      
      if (!groupedData.has(key)) {
        groupedData.set(key, []);
      }
      
      groupedData.get(key)!.push(row);
    });
    
    
    // Convert grouped data to aggregated format
    const aggregatedData: AggregatedData[] = [];
    
    groupedData.forEach((rows, key) => {
      if (rows.length === 0) return;
      
      
      // For long format data, we need to combine multiple rows (one for each variable type)
      // For wide format data, each row contains all metrics
      
      // FIXED: Find the best row for each metric type to ensure we get the right data
      // This ensures analytics matches the raw data shown in upload screen
      const representativeRow = rows.find(r => r.n_orgs > 0 && r.n_incumbents > 0) || rows[0];
      
      // Find rows with each metric type
      const tccRow = rows.find(r => r.tcc_p50 > 0);
      const wrvuRow = rows.find(r => r.wrvu_p50 > 0);
      const cfRow = rows.find(r => r.cf_p50 > 0);
      
      
      // Extract original specialty name from raw data
      const originalSpecialty = representativeRow.rawData?.specialty || 
                               representativeRow.rawData?.Specialty || 
                               representativeRow.rawData?.normalizedSpecialty || 
                               representativeRow.specialty || 'Unknown';

      const aggregatedRecord: AggregatedData = {
        standardizedName: representativeRow.specialty,
        surveySource: representativeRow.surveySource as any,
        surveySpecialty: representativeRow.specialty,
        originalSpecialty: originalSpecialty,
        geographicRegion: representativeRow.region as any,
        providerType: representativeRow.providerType as any,
        surveyYear: representativeRow.surveyYear,
        
        // Use organizational data from the specific row that contains each metric type
        // TCC organizational data from TCC row
        tcc_n_orgs: tccRow ? tccRow.n_orgs || 0 : 0,
        tcc_n_incumbents: tccRow ? tccRow.n_incumbents || 0 : 0,
        
        // wRVU organizational data from wRVU row
        wrvu_n_orgs: wrvuRow ? wrvuRow.n_orgs || 0 : 0,
        wrvu_n_incumbents: wrvuRow ? wrvuRow.n_incumbents || 0 : 0,
        
        // CF organizational data from CF row
        cf_n_orgs: cfRow ? cfRow.n_orgs || 0 : 0,
        cf_n_incumbents: cfRow ? cfRow.n_incumbents || 0 : 0,
        
        // Use TCC data from TCC row if available
        tcc_p25: tccRow ? tccRow.tcc_p25 || 0 : 0,
        tcc_p50: tccRow ? tccRow.tcc_p50 || 0 : 0,
        tcc_p75: tccRow ? tccRow.tcc_p75 || 0 : 0,
        tcc_p90: tccRow ? tccRow.tcc_p90 || 0 : 0,
        
        // Use wRVU data from wRVU row if available
        wrvu_p25: wrvuRow ? wrvuRow.wrvu_p25 || 0 : 0,
        wrvu_p50: wrvuRow ? wrvuRow.wrvu_p50 || 0 : 0,
        wrvu_p75: wrvuRow ? wrvuRow.wrvu_p75 || 0 : 0,
        wrvu_p90: wrvuRow ? wrvuRow.wrvu_p90 || 0 : 0,
        
        // Use CF data from CF row if available
        cf_p25: cfRow ? cfRow.cf_p25 || 0 : 0,
        cf_p50: cfRow ? cfRow.cf_p50 || 0 : 0,
        cf_p75: cfRow ? cfRow.cf_p75 || 0 : 0,
        cf_p90: cfRow ? cfRow.cf_p90 || 0 : 0
      };
      
      
      aggregatedData.push(aggregatedRecord);
    });
    
    
    return aggregatedData;
  }

}

// Export singleton instance
export const analyticsDataService = new AnalyticsDataService();

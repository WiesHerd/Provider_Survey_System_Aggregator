/**
 * Analytics Data Service
 * Handles data retrieval, normalization, and stacking for analytics
 */

import { getDataService } from '../../../services/DataService';
import { ISpecialtyMapping } from '../../../types/specialty';
import { IColumnMapping } from '../../../types/column';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';

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
  } = {
    data: null,
    lastFetch: 0,
    isStale: false
  };
  
  private mappingsCache: {
    specialtyMappings: any[] | null;
    columnMappings: any[] | null;
    lastFetch: number;
  } = {
    specialtyMappings: null,
    columnMappings: null,
    lastFetch: 0
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
      isStale: false
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
      isStale: false
    };
    this.mappingsCache = {
      specialtyMappings: null,
      columnMappings: null,
      lastFetch: 0
    };
  }
  
  // Get cached mappings
  getCachedMappings(): { specialtyMappings: any[] | null, columnMappings: any[] | null } {
    const now = Date.now();
    if (this.mappingsCache.specialtyMappings && 
        this.mappingsCache.columnMappings && 
        (now - this.mappingsCache.lastFetch) < this.CACHE_DURATION) {
      return {
        specialtyMappings: this.mappingsCache.specialtyMappings,
        columnMappings: this.mappingsCache.columnMappings
      };
    }
    return { specialtyMappings: null, columnMappings: null };
  }
  
  // Set cached mappings
  setCachedMappings(specialtyMappings: any[], columnMappings: any[]): void {
    this.mappingsCache = {
      specialtyMappings,
      columnMappings,
      lastFetch: Date.now()
    };
  }
}

export class AnalyticsDataService {
  private dataService = getDataService();
  private globalCache = GlobalAnalyticsCache.getInstance();

  /**
   * Get cached mappings or fetch fresh ones
   */
  private async getCachedMappings(): Promise<{ specialtyMappings: any[], columnMappings: any[] }> {
    // Check global cache first
    const cachedMappings = this.globalCache.getCachedMappings();
    if (cachedMappings.specialtyMappings && cachedMappings.columnMappings) {
      console.log('🔍 AnalyticsDataService: Using global cached mappings');
      return {
        specialtyMappings: cachedMappings.specialtyMappings,
        columnMappings: cachedMappings.columnMappings
      };
    }
    
    // Fetch fresh mappings
    console.log('🔍 AnalyticsDataService: Fetching fresh mappings');
    const [specialtyMappings, columnMappings] = await Promise.all([
      this.dataService.getAllSpecialtyMappings(),
      this.dataService.getAllColumnMappings()
    ]);
    
    // Update global cache
    this.globalCache.setCachedMappings(specialtyMappings, columnMappings);
    
    return { specialtyMappings, columnMappings };
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
      console.log('🔍 AnalyticsDataService: Starting data retrieval with filters:', filters);
      
      // Google-style caching: Check if we have fresh data first
      if (this.globalCache.hasFreshData()) {
        console.log('🔍 AnalyticsDataService: Using fresh cached data (Google-style)');
        const cachedData = this.globalCache.getCachedData();
        if (cachedData) {
          // Trigger background refresh if data is getting stale
          if (this.globalCache.hasStaleData()) {
            console.log('🔍 AnalyticsDataService: Data is stale, triggering background refresh');
            this.refreshDataInBackground();
          }
          return cachedData;
        }
      }
      
      // If no fresh data, fetch it
      console.log('🔍 AnalyticsDataService: No fresh data, fetching from database');
      
      // Get all surveys and cached mappings
      const [surveys, { specialtyMappings, columnMappings }] = await Promise.all([
        this.dataService.getAllSurveys(),
        this.getCachedMappings()
      ]);
      
      console.log(`🔍 AnalyticsDataService: Found ${surveys.length} surveys, ${specialtyMappings.length} specialty mappings, ${columnMappings.length} column mappings`);
      
      if (surveys.length === 0) {
        console.log('🔍 AnalyticsDataService: No surveys found, returning empty array');
        return [];
      }
      
      // Process surveys in parallel for better performance
      const allNormalizedRows: NormalizedRow[] = [];
      
      console.log(`🔍 AnalyticsDataService: Processing ${surveys.length} surveys in parallel...`);
      
      // Limit concurrent surveys to avoid overwhelming IndexedDB
      const maxConcurrent = Math.min(3, surveys.length);
      const surveyPromises = surveys.slice(0, maxConcurrent).map(async (survey) => {
        console.log(`🔍 AnalyticsDataService: Processing survey: ${survey.name} (${survey.type})`);
        
        try {
          // Get survey data with pagination to limit memory usage (reduced for faster loading)
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 500 });
          console.log(`🔍 AnalyticsDataService: Survey ${survey.name} returned ${surveyData.rows.length} rows`);
          
          if (surveyData.rows.length === 0) {
            return [];
          }
          
          // Normalize rows in batches to avoid blocking the main thread (smaller batches for faster processing)
          const normalizedRows: NormalizedRow[] = [];
          const batchSize = 50;
          
          for (let i = 0; i < surveyData.rows.length; i += batchSize) {
            const batch = surveyData.rows.slice(i, i + batchSize);
            const batchNormalized = batch.map(row => 
            this.normalizeRow(row, survey, specialtyMappings, columnMappings)
          );
            normalizedRows.push(...batchNormalized);
            
            // Yield control to allow UI updates
            if (i + batchSize < surveyData.rows.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          return normalizedRows;
          
        } catch (error) {
          console.error(`🔍 AnalyticsDataService: Error processing survey ${survey.name}:`, error);
          return [];
        }
      });
      
      // Wait for all surveys to complete
      const surveyResults = await Promise.all(surveyPromises);
      
      // Flatten results
      surveyResults.forEach(normalizedRows => {
        allNormalizedRows.push(...normalizedRows);
      });
      
      console.log(`🔍 AnalyticsDataService: Total normalized rows: ${allNormalizedRows.length}`);
      
      if (allNormalizedRows.length === 0) {
        console.log('🔍 AnalyticsDataService: No normalized rows found, returning empty array');
        return [];
      }
      
      // Stack and aggregate the normalized data in chunks for better performance
      const aggregatedData = await this.stackAndAggregateDataOptimized(allNormalizedRows);
      
      // Cache the results (Google-style)
      this.globalCache.setCachedData(aggregatedData);
      
      console.log(`🔍 AnalyticsDataService: Final aggregated records: ${aggregatedData.length}`);
      return aggregatedData;
      
    } catch (error) {
      console.error('🔍 AnalyticsDataService: Error in getAnalyticsData:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache (call this when data changes)
   */
  invalidateCache(): void {
    console.log('🔍 AnalyticsDataService: Invalidating cache');
    this.globalCache.markAsStale();
  }

  /**
   * Force refresh cache (call this when data structure changes)
   */
  forceRefreshCache(): void {
    console.log('🔍 AnalyticsDataService: Force refreshing cache due to data structure changes');
    this.globalCache.clearCache();
  }

  /**
   * Clear cache completely (call this when data structure changes)
   */
  clearCache(): void {
    console.log('🔍 AnalyticsDataService: Clearing cache completely');
    this.globalCache.clearCache();
  }

  /**
   * Background refresh method (Google-style)
   * Refreshes data in the background without blocking the UI
   */
  private async refreshDataInBackground(): Promise<void> {
    try {
      console.log('🔍 AnalyticsDataService: Starting background refresh');
      
      // Get fresh data without affecting current cache
      const [surveys, { specialtyMappings, columnMappings }] = await Promise.all([
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
              this.normalizeRow(row, survey, specialtyMappings, columnMappings)
            );
            normalizedRows.push(...batchNormalized);
            
            // Yield control
            if (i + batchSize < surveyData.rows.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          return normalizedRows;
        } catch (error) {
          console.error(`🔍 AnalyticsDataService: Error in background refresh for survey ${survey.name}:`, error);
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
        console.log('🔍 AnalyticsDataService: Background refresh completed');
      }
      
    } catch (error) {
      console.error('🔍 AnalyticsDataService: Error in background refresh:', error);
    }
  }

  /**
   * Normalize a raw survey row using mappings
   * Data is in long format: each row has a 'variable' field (TCC, wRVU, CF) and p25/p50/p75/p90 values
   */
  private normalizeRow(
    row: any, 
    survey: any, 
    specialtyMappings: ISpecialtyMapping[], 
    columnMappings: IColumnMapping[]
  ): NormalizedRow {
    // The row might be a SurveyData object with the actual data in the 'data' property
    const actualRowData = row.data || row;
    
    console.log('🔍 AnalyticsDataService: Processing row:', {
      hasDataProperty: !!row.data,
      actualRowDataKeys: Object.keys(actualRowData),
      sampleData: {
        specialty: actualRowData.specialty,
        tcc_p50: actualRowData.tcc_p50,
        wrvu_p50: actualRowData.wrvu_p50,
        cf_p50: actualRowData.cf_p50
      }
    });
    
    // Extract specialty - check multiple possible locations and formats
    const rawSpecialty = actualRowData.specialty || actualRowData.Specialty || 
                        actualRowData.normalizedSpecialty || actualRowData['Provider Type'] ||
                        row.specialty || 'Unknown';
    
    // Normalize specialty using specialty mappings
    const normalizedSpecialty = this.normalizeSpecialty(
      rawSpecialty,
      specialtyMappings,
      survey.type
    );
    
    // Extract provider type
    const rawProviderType = actualRowData.providerType || actualRowData['Provider Type'] ||
                           actualRowData.provider_type || row.providerType || 'Physician';
    
    // Normalize provider type
    const normalizedProviderType = this.normalizeProviderType(rawProviderType);
    
    // Extract region
    const rawRegion = actualRowData.geographicRegion || actualRowData.region || 
                     actualRowData.Region || actualRowData.geographic_region ||
                     row.region || 'National';
    
    // Normalize region
    const normalizedRegion = this.normalizeRegion(rawRegion);
    
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
      
      console.log('🔍 AnalyticsDataService: Processing LONG format data - variable:', actualRowData.variable, 'values:', { p25, p50, p75, p90 });
      
      // Set the appropriate metrics based on the variable type
      // IMPORTANT: Order matters - check most specific patterns first
      if (variable.includes('tcc per work rvu') || variable.includes('conversion factor')) {
        // This is definitely a conversion factor
        normalizedMetrics.cf_p25 = p25;
        normalizedMetrics.cf_p50 = p50;
        normalizedMetrics.cf_p75 = p75;
        normalizedMetrics.cf_p90 = p90;
        console.log('🔍 AnalyticsDataService: Set CF metrics (TCC per Work RVU):', { p25, p50, p75, p90 });
      } else if (variable === 'tcc' || variable.includes('total cash compensation')) {
        // This is total cash compensation
        normalizedMetrics.tcc_p25 = p25;
        normalizedMetrics.tcc_p50 = p50;
        normalizedMetrics.tcc_p75 = p75;
        normalizedMetrics.tcc_p90 = p90;
        console.log('🔍 AnalyticsDataService: Set TCC metrics:', { p25, p50, p75, p90 });
      } else if (variable.includes('work rvu') || variable.includes('wrvu')) {
        // This is work RVUs (but NOT if it contains "per" or "conversion")
        if (!variable.includes('per') && !variable.includes('conversion')) {
          // Additional check: wRVU values are typically much larger than CF values
          // If the values are small (< 1000), they're likely conversion factors
          if (p50 > 1000) {
            normalizedMetrics.wrvu_p25 = p25;
            normalizedMetrics.wrvu_p50 = p50;
            normalizedMetrics.wrvu_p75 = p75;
            normalizedMetrics.wrvu_p90 = p90;
            console.log('🔍 AnalyticsDataService: Set wRVU metrics (large values):', { p25, p50, p75, p90 });
          } else {
            // Small values in wRVU field are likely conversion factors
            normalizedMetrics.cf_p25 = p25;
            normalizedMetrics.cf_p50 = p50;
            normalizedMetrics.cf_p75 = p75;
            normalizedMetrics.cf_p90 = p90;
            console.log('🔍 AnalyticsDataService: Set CF metrics (small values in wRVU field):', { p25, p50, p75, p90 });
          }
        } else {
          // This is actually a conversion factor disguised as wRVU
          normalizedMetrics.cf_p25 = p25;
          normalizedMetrics.cf_p50 = p50;
          normalizedMetrics.cf_p75 = p75;
          normalizedMetrics.cf_p90 = p90;
          console.log('🔍 AnalyticsDataService: Set CF metrics (disguised as wRVU):', { p25, p50, p75, p90 });
        }
      } else if (variable.includes('cf') || variable.includes('conversion')) {
        // This is a conversion factor
        normalizedMetrics.cf_p25 = p25;
        normalizedMetrics.cf_p50 = p50;
        normalizedMetrics.cf_p75 = p75;
        normalizedMetrics.cf_p90 = p90;
        console.log('🔍 AnalyticsDataService: Set CF metrics:', { p25, p50, p75, p90 });
      } else {
        console.log('🔍 AnalyticsDataService: Unknown variable type:', variable, 'values:', { p25, p50, p75, p90 });
      }
    } else {
      // WIDE FORMAT: Data has separate columns for each metric
      console.log('🔍 AnalyticsDataService: Processing WIDE format data');
      console.log('🔍 AnalyticsDataService: Available columns:', Object.keys(actualRowData));
      console.log('🔍 AnalyticsDataService: Sample wRVU values:', {
        wrvu_p25: actualRowData.wrvu_p25,
        wrvu_p50: actualRowData.wrvu_p50,
        wrvu_p75: actualRowData.wrvu_p75,
        wrvu_p90: actualRowData.wrvu_p90
      });
      console.log('🔍 AnalyticsDataService: Sample CF values:', {
        cf_p25: actualRowData.cf_p25,
        cf_p50: actualRowData.cf_p50,
        cf_p75: actualRowData.cf_p75,
        cf_p90: actualRowData.cf_p90
      });
      console.log('🔍 AnalyticsDataService: Sample TCC values:', {
        tcc_p25: actualRowData.tcc_p25,
        tcc_p50: actualRowData.tcc_p50,
        tcc_p75: actualRowData.tcc_p75,
        tcc_p90: actualRowData.tcc_p90
      });
      
      // Extract TCC metrics with fallback column names
      normalizedMetrics.tcc_p25 = this.extractNumber(
        actualRowData.tcc_p25 || actualRowData['TCC P25'] || actualRowData['tcc_p25'] || actualRowData['TCC_p25']
      );
      normalizedMetrics.tcc_p50 = this.extractNumber(
        actualRowData.tcc_p50 || actualRowData['TCC P50'] || actualRowData['tcc_p50'] || actualRowData['TCC_p50'] || actualRowData['TCC Median']
      );
      normalizedMetrics.tcc_p75 = this.extractNumber(
        actualRowData.tcc_p75 || actualRowData['TCC P75'] || actualRowData['tcc_p75'] || actualRowData['TCC_p75']
      );
      normalizedMetrics.tcc_p90 = this.extractNumber(
        actualRowData.tcc_p90 || actualRowData['TCC P90'] || actualRowData['tcc_p90'] || actualRowData['TCC_p90']
      );
      
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
        console.log('🔍 AnalyticsDataService: Attempting intelligent column matching for missing data');
        
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
      
      console.log('🔍 AnalyticsDataService: After extraction:', {
        tcc_p50: normalizedMetrics.tcc_p50,
        wrvu_p50: normalizedMetrics.wrvu_p50,
        cf_p50: normalizedMetrics.cf_p50
      });
      
      console.log('🔍 AnalyticsDataService: Extracted metrics:', normalizedMetrics);
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
   * Normalize specialty using specialty mappings
   */
  private normalizeSpecialty(
    specialty: string, 
    mappings: ISpecialtyMapping[], 
    surveySource: string
  ): string {
    if (!specialty || specialty === 'Unknown') return 'Unknown';
    
    // First, try exact mapping match
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some(source => 
        source.surveySource === surveySource && 
        source.specialty.toLowerCase() === specialty.toLowerCase()
      );
      
      if (hasSourceSpecialty) {
        console.log('🔍 AnalyticsDataService: Found exact specialty mapping:', specialty, '->', mapping.standardizedName);
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
        console.log('🔍 AnalyticsDataService: Found fuzzy specialty mapping:', specialty, '->', mapping.standardizedName);
        return mapping.standardizedName;
      }
    }
    
    // If still no mapping found, return normalized version
    console.log('🔍 AnalyticsDataService: No specialty mapping found for:', specialty, 'returning normalized version');
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
   * Normalize provider type
   */
  private normalizeProviderType(providerType: string): string {
    if (!providerType || providerType === 'Staff Physician') return 'Staff Physician';
    
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
   * Normalize region
   */
  private normalizeRegion(region: string): string {
    if (!region || region === 'National') return 'National';
    
    const lower = region.toLowerCase();
    
    if (lower.includes('northeast') || lower.includes('northeastern') || lower.includes('ne')) {
      return 'Northeastern';
    } else if (lower.includes('southeast') || lower.includes('southern') || lower.includes('se')) {
      return 'Southern';
    } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('north central') || lower.includes('nc')) {
      return 'Midwestern';
    } else if (lower.includes('west') || lower.includes('western')) {
      return 'Western';
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
    console.log('🔍 AnalyticsDataService: Starting optimized data stacking and aggregation');
    console.log('🔍 AnalyticsDataService: Total normalized rows to process:', normalizedRows.length);
    
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
    
    console.log(`🔍 AnalyticsDataService: Grouped data into ${groupedData.size} groups`);
    
    // Convert grouped data to aggregated format
    const aggregatedData: AggregatedData[] = [];
    
    for (const [key, rows] of groupedData) {
      if (rows.length === 0) continue;
      
      const aggregatedRecord = this.createAggregatedRecord(rows, key);
      aggregatedData.push(aggregatedRecord);
    }
    
    console.log(`🔍 AnalyticsDataService: Created ${aggregatedData.length} aggregated records`);
    
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
    
    console.log('🔍 AnalyticsDataService: Created aggregated record from raw data:', {
      specialty: aggregatedRecord.standardizedName,
      surveySource: aggregatedRecord.surveySource,
      tcc_p50: aggregatedRecord.tcc_p50,
      wrvu_p50: aggregatedRecord.wrvu_p50,
      cf_p50: aggregatedRecord.cf_p50,
      n_orgs: aggregatedRecord.tcc_n_orgs,
      n_incumbents: aggregatedRecord.tcc_n_incumbents
    });
    
    return aggregatedRecord;
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
    console.log('🔍 AnalyticsDataService: Starting data stacking and aggregation');
    console.log('🔍 AnalyticsDataService: Total normalized rows to process:', normalizedRows.length);
    
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
    
    console.log(`🔍 AnalyticsDataService: Grouped data into ${groupedData.size} groups`);
    
    // Convert grouped data to aggregated format
    const aggregatedData: AggregatedData[] = [];
    
    groupedData.forEach((rows, key) => {
      if (rows.length === 0) return;
      
      console.log('🔍 AnalyticsDataService: Processing group:', key, 'with', rows.length, 'rows');
      
      // For long format data, we need to combine multiple rows (one for each variable type)
      // For wide format data, each row contains all metrics
      
      // FIXED: Find the best row for each metric type to ensure we get the right data
      // This ensures analytics matches the raw data shown in upload screen
      const representativeRow = rows.find(r => r.n_orgs > 0 && r.n_incumbents > 0) || rows[0];
      
      // Find rows with each metric type
      const tccRow = rows.find(r => r.tcc_p50 > 0);
      const wrvuRow = rows.find(r => r.wrvu_p50 > 0);
      const cfRow = rows.find(r => r.cf_p50 > 0);
      
      console.log('🔍 AnalyticsDataService: Found metric rows - TCC:', !!tccRow, 'wRVU:', !!wrvuRow, 'CF:', !!cfRow);
      
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
      
      console.log('🔍 AnalyticsDataService: Final aggregated record:', {
        specialty: aggregatedRecord.standardizedName,
        tcc_p50: aggregatedRecord.tcc_p50,
        wrvu_p50: aggregatedRecord.wrvu_p50,
        cf_p50: aggregatedRecord.cf_p50,
        tcc_n_orgs: aggregatedRecord.tcc_n_orgs,
        wrvu_n_orgs: aggregatedRecord.wrvu_n_orgs,
        cf_n_orgs: aggregatedRecord.cf_n_orgs
      });
      
      aggregatedData.push(aggregatedRecord);
    });
    
    console.log(`🔍 AnalyticsDataService: Created ${aggregatedData.length} aggregated records`);
    
    return aggregatedData;
  }

}

// Export singleton instance
export const analyticsDataService = new AnalyticsDataService();

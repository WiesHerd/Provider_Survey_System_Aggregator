/**
 * Analytics Data Service - Enterprise Grade
 * Handles data retrieval, normalization, and aggregation for analytics
 * 
 * Google-Level Architecture:
 * - Single source of truth: IndexedDB
 * - No dual-layer caching (removes race conditions)
 * - Direct data loading with proper error handling
 * - Fail-fast initialization pattern
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

/**
 * Analytics Data Service - Simplified Enterprise Architecture
 * 
 * Key Changes from Previous Version:
 * 1. Removed GlobalAnalyticsCache singleton (eliminates race conditions)
 * 2. Removed dual-layer caching (memory + IndexedDB)
 * 3. Direct IndexedDB access via DataService
 * 4. Simplified initialization (no async complexity)
 * 5. Fail-fast error handling
 */
export class AnalyticsDataService {
  private dataService = getDataService();

  /**
   * Get all analytics data with Google-style direct loading
   * Always fetches fresh data from IndexedDB - no caching layer
   */
  async getAnalyticsData(filters: AnalyticsFilters = {
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '',
    year: ''
  }): Promise<AggregatedData[]> {
    try {
      console.log('🔍 AnalyticsDataService: Fetching fresh data from IndexedDB');
      
      // Get all surveys and mappings directly from IndexedDB
      const [surveys, specialtyMappings, columnMappings, learnedMappings] = await Promise.all([
        this.dataService.getAllSurveys(),
        this.dataService.getAllSpecialtyMappings(),
        this.dataService.getAllColumnMappings(),
        this.getLearnedMappings()
      ]);
      
      if (surveys.length === 0) {
        console.log('📊 No surveys found in IndexedDB');
        return [];
      }
      
      console.log(`📊 Processing ${surveys.length} surveys from IndexedDB`);
      
        // Process surveys in parallel for better performance
      const allNormalizedRows: NormalizedRow[] = [];
        const maxConcurrent = Math.min(3, surveys.length);
        
      const surveyPromises = surveys.slice(0, maxConcurrent).map(async (survey) => {
        try {
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 500 });
          
          if (surveyData.rows.length === 0) {
            return [];
          }
          
          // Normalize rows in batches
          const normalizedRows: NormalizedRow[] = [];
          const batchSize = 50;
          
          for (let i = 0; i < surveyData.rows.length; i += batchSize) {
            const batch = surveyData.rows.slice(i, i + batchSize);
            const batchNormalized = batch.map(row => 
              this.normalizeRow(row, survey, specialtyMappings, columnMappings, learnedMappings)
          );
            normalizedRows.push(...batchNormalized);
            
            // Yield control to allow UI updates
            if (i + batchSize < surveyData.rows.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          return normalizedRows;
        } catch (error) {
          console.warn(`⚠️ Failed to process survey ${survey.id}:`, error);
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
        console.log('📊 No normalized data found');
        return [];
      }
      
      // Aggregate the normalized data
      console.log(`📊 Aggregating ${allNormalizedRows.length} normalized rows`);
      const aggregatedData = await this.stackAndAggregateDataOptimized(allNormalizedRows);
      
      console.log(`✅ AnalyticsDataService: Successfully processed ${aggregatedData.length} aggregated records`);
      return aggregatedData;
      
    } catch (error) {
      console.error('❌ AnalyticsDataService: Error fetching data:', error);
      throw new Error(`Failed to load analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get analytics data for selected variables (DYNAMIC)
   * Processes ALL variables found in data by default
   */
  async getAnalyticsDataByVariables(
    filters: AnalyticsFilters,
    selectedVariables: string[] = [] // Optional - if empty, process all variables
  ): Promise<DynamicAggregatedData[]> {
    try {
      console.log('🔍 AnalyticsDataService: Fetching dynamic data for variables:', selectedVariables);
      
      // Get all surveys and mappings directly from IndexedDB
      const [surveys, specialtyMappings, columnMappings, learnedMappings] = await Promise.all([
        this.dataService.getAllSurveys(),
        this.dataService.getAllSpecialtyMappings(),
        this.dataService.getAllColumnMappings(),
        this.getLearnedMappings()
      ]);
      
      if (surveys.length === 0) {
        console.log('📊 No surveys found in IndexedDB');
        return [];
      }
      
      console.log(`📊 Processing ${surveys.length} surveys for dynamic variables`);
      
      // Process surveys in parallel
      const allNormalizedRows: DynamicNormalizedRow[] = [];
      const maxConcurrent = Math.min(3, surveys.length);
      
      const surveyPromises = surveys.slice(0, maxConcurrent).map(async (survey) => {
        try {
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 500 });
          
          if (surveyData.rows.length === 0) {
            console.log(`📊 Survey ${survey.id} has no data rows`);
            return [];
          }
          
          console.log(`📊 Survey ${survey.id} has ${surveyData.rows.length} data rows`);
          
          // Normalize rows dynamically
          const normalizedRows: DynamicNormalizedRow[] = [];
          const batchSize = 50;
          
          for (let i = 0; i < surveyData.rows.length; i += batchSize) {
            const batch = surveyData.rows.slice(i, i + batchSize);
            const batchNormalized = batch.map(row => 
              this.normalizeRowDynamic(row, survey, selectedVariables, {
                specialtyMappings,
                columnMappings,
                learnedSpecialtyMappings: learnedMappings.learnedSpecialtyMappings,
                learnedColumnMappings: learnedMappings.learnedColumnMappings,
                learnedRegionMappings: learnedMappings.learnedRegionMappings,
                learnedVariableMappings: learnedMappings.learnedVariableMappings,
                learnedProviderTypeMappings: learnedMappings.learnedProviderTypeMappings
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
          console.warn(`⚠️ Failed to process survey ${survey.id}:`, error);
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
        console.log('❌ AnalyticsDataService: No normalized rows generated');
        return [];
      }
      
      // Aggregate the normalized data dynamically
      console.log(`📊 Aggregating ${allNormalizedRows.length} normalized rows for dynamic variables`);
      const aggregatedData = await this.aggregateByVariables(allNormalizedRows);
      
      console.log(`✅ AnalyticsDataService: Successfully processed ${aggregatedData.length} dynamic records`);
      return aggregatedData;
      
    } catch (error) {
      console.error('❌ AnalyticsDataService: Error fetching dynamic data:', error);
      throw new Error(`Failed to load dynamic analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear cache (for backward compatibility)
   * Since we removed caching, this is a no-op
   */
  public clearCache(): void {
    console.log('🔍 AnalyticsDataService: clearCache called (no-op - no cache to clear)');
    // No-op since we removed caching
  }

  /**
   * Force refresh cache (for backward compatibility)
   * Since we removed caching, this is a no-op
   */
  public forceRefreshCache(): void {
    console.log('🔍 AnalyticsDataService: forceRefreshCache called (no-op - no cache to refresh)');
    // No-op since we removed caching
  }

  /**
   * Invalidate cache (for backward compatibility)
   * Since we removed caching, this is a no-op
   */
  public invalidateCache(): void {
    console.log('🔍 AnalyticsDataService: invalidateCache called (no-op - no cache to invalidate)');
    // No-op since we removed caching
  }

  /**
   * Get learned mappings from IndexedDB
   */
  private async getLearnedMappings(): Promise<{
    learnedSpecialtyMappings: Record<string, string>;
    learnedColumnMappings: Record<string, string>;
    learnedRegionMappings: Record<string, string>;
    learnedVariableMappings: Record<string, string>;
    learnedProviderTypeMappings: Record<string, string>;
  }> {
    try {
      const [
        learnedSpecialtyMappings,
        learnedColumnMappings,
        learnedRegionMappings,
        learnedVariableMappings,
        learnedProviderTypeMappings
      ] = await Promise.all([
        this.dataService.getLearnedMappings('specialty'),
        this.dataService.getLearnedMappings('column'),
        this.dataService.getLearnedMappings('region'),
        this.dataService.getLearnedMappings('variable'),
        this.dataService.getLearnedMappings('providerType')
      ]);
      
      return {
                learnedSpecialtyMappings,
                learnedColumnMappings,
                learnedRegionMappings,
                learnedVariableMappings,
                learnedProviderTypeMappings
      };
        } catch (error) {
      console.warn('Failed to load learned mappings:', error);
      return {
        learnedSpecialtyMappings: {},
        learnedColumnMappings: {},
        learnedRegionMappings: {},
        learnedVariableMappings: {},
        learnedProviderTypeMappings: {}
      };
    }
  }

  /**
   * Normalize a raw survey row using mappings and learned mappings
   */
  private normalizeRow(
    row: any, 
    survey: any, 
    specialtyMappings: ISpecialtyMapping[], 
    columnMappings: IColumnMapping[],
    learnedMappings: {
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
      learnedMappings.learnedSpecialtyMappings
    );
    
    // Extract provider type
    const rawProviderType = actualRowData.providerType || actualRowData['Provider Type'] ||
                           actualRowData.provider_type || row.providerType || 'Physician';
    
    // Normalize provider type using learned mappings
    const normalizedProviderType = this.normalizeProviderType(rawProviderType, learnedMappings.learnedProviderTypeMappings);
    
    // Extract region
    const rawRegion = actualRowData.geographicRegion || actualRowData.region || 
                     actualRowData.Region || actualRowData.geographic_region ||
                     row.region || 'National';
    
    // Normalize region using learned mappings
    const normalizedRegion = this.normalizeRegion(rawRegion, learnedMappings.learnedRegionMappings);
    
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
        if (!variable.includes('per') && !variable.includes('conversion')) {
          // Additional check: wRVU values are typically much larger than CF values
          if (p50 > 1000) {
            normalizedMetrics.wrvu_p25 = p25;
            normalizedMetrics.wrvu_p50 = p50;
            normalizedMetrics.wrvu_p75 = p75;
            normalizedMetrics.wrvu_p90 = p90;
          } else {
            // Small values in wRVU field are likely conversion factors
            normalizedMetrics.cf_p25 = p25;
            normalizedMetrics.cf_p50 = p50;
            normalizedMetrics.cf_p75 = p75;
            normalizedMetrics.cf_p90 = p90;
          }
        } else {
          // This is actually a conversion factor disguised as wRVU
          normalizedMetrics.cf_p25 = p25;
          normalizedMetrics.cf_p50 = p50;
          normalizedMetrics.cf_p75 = p75;
          normalizedMetrics.cf_p90 = p90;
        }
      } else if (variable.includes('cf') || variable.includes('conversion')) {
        // This is a conversion factor
        normalizedMetrics.cf_p25 = p25;
        normalizedMetrics.cf_p50 = p50;
        normalizedMetrics.cf_p75 = p75;
        normalizedMetrics.cf_p90 = p90;
      }
    } else {
      // WIDE FORMAT: Data has separate columns for each metric
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
    
    for (const [, rows] of groupedData) {
      if (rows.length === 0) continue;
      
      const aggregatedRecord = this.createAggregatedRecord(rows, '');
      aggregatedData.push(aggregatedRecord);
    }
    
    return aggregatedData;
  }

  /**
   * Create a single aggregated record from a group of rows
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
    
    // Find the best row for each metric type to ensure we get the right data
    if (rows.length > 0) {
      
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
   * Dynamic row normalization for any variables
   */
  private normalizeRowDynamic(
    row: any,
    survey: any,
    selectedVariables: string[], // Optional - if empty, process all variables
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
    
    // Note: We handle both LONG format (variable field) and WIDE format (separate columns) below
    
    if (hasVariableField) {
      // LONG FORMAT: Data has a 'variable' field
      const variable = String(actualRowData.variable).trim();
      const normalizedVarName = normalizeVariableName(variable);
      
      // Process ALL variables by default, only filter if specific variables are selected
      const shouldProcess = selectedVariables.length === 0 || selectedVariables.includes(normalizedVarName);
      
      if (shouldProcess) {
        variables[normalizedVarName] = {
          variableName: variable,
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
      const percentilePattern = /^(.+)_(p25|p50|p75|p90)$/i;
      const variableMap = new Map<string, { p25?: number; p50?: number; p75?: number; p90?: number }>();
      
      // Scan all columns for percentile patterns
      Object.entries(actualRowData).forEach(([key, value]) => {
        const match = key.match(percentilePattern);
        if (match) {
          const [, varName, percentile] = match;
          const normalizedVarName = normalizeVariableName(varName);
          const numValue = this.extractNumber(value);
          
          if (!variableMap.has(normalizedVarName)) {
            variableMap.set(normalizedVarName, {});
          }
          
          const varData = variableMap.get(normalizedVarName)!;
          if (percentile.toLowerCase() === 'p25') varData.p25 = numValue;
          else if (percentile.toLowerCase() === 'p50') varData.p50 = numValue;
          else if (percentile.toLowerCase() === 'p75') varData.p75 = numValue;
          else if (percentile.toLowerCase() === 'p90') varData.p90 = numValue;
        }
      });
      
      // Process discovered variables
      variableMap.forEach((varData, normalizedVarName) => {
        // Only process if no selectedVariables filter or if variable is selected
        const shouldProcess = selectedVariables.length === 0 || selectedVariables.includes(normalizedVarName);
        
        if (shouldProcess && varData.p50 && varData.p50 > 0) {
          variables[normalizedVarName] = {
            variableName: this.formatVariableDisplayName(normalizedVarName),
            n_orgs,
            n_incumbents,
            p25: varData.p25 || 0,
            p50: varData.p50 || 0,
            p75: varData.p75 || 0,
            p90: varData.p90 || 0
          };
        }
      });
    }
    
    // FALLBACK: If no variables were processed and we have data, try to process any numeric columns
    if (Object.keys(variables).length === 0 && selectedVariables.length === 0) {
      // Look for any columns that might be variables (contain numbers)
      Object.entries(actualRowData).forEach(([key, value]) => {
        if (typeof value === 'number' && value > 0 && !key.toLowerCase().includes('org') && !key.toLowerCase().includes('incumbent')) {
          const normalizedVarName = normalizeVariableName(key);
          variables[normalizedVarName] = {
            variableName: key,
            n_orgs,
            n_incumbents,
            p25: value,
            p50: value,
            p75: value,
            p90: value
          };
        }
      });
    }
    
    return {
      specialty: rawSpecialty, // Original specialty name from survey
      standardizedSpecialty: normalizedSpecialty, // Mapped standardized specialty name
      providerType: normalizedProviderType,
      region: normalizedRegion,
      surveySource: survey.type || survey.name || 'Unknown',
      surveyYear: survey.year?.toString() || 'Unknown',
      variables
    };
  }
  
  /**
   * Aggregate normalized rows by variables
   */
  private async aggregateByVariables(
    normalizedRows: DynamicNormalizedRow[]
  ): Promise<DynamicAggregatedData[]> {
    // Group rows by specialty, provider type, region, and survey source
    const groupedData = new Map<string, DynamicNormalizedRow[]>();
    
    normalizedRows.forEach(row => {
      // Group by standardized specialty, survey source, provider type, and region
      // This keeps individual survey data separate instead of combining them
      const key = `${row.standardizedSpecialty}_${row.surveySource}_${row.providerType}_${row.region}`;
      
      if (!groupedData.has(key)) {
        groupedData.set(key, []);
      }
      
      groupedData.get(key)!.push(row);
    });
    
    // Convert grouped data to aggregated format
    const aggregatedData: DynamicAggregatedData[] = [];
    
    for (const [, rows] of groupedData) {
      if (rows.length === 0) continue;
      
      const firstRow = rows[0];
      
      // Initialize aggregated record - each group now represents a single survey
      const aggregatedRecord: DynamicAggregatedData = {
        standardizedName: firstRow.standardizedSpecialty, // Mapped standardized specialty name
        surveySource: firstRow.surveySource, // Individual survey source, not combined
        surveySpecialty: firstRow.specialty, // Original specialty name from THIS survey
        originalSpecialty: firstRow.specialty, // Same as surveySpecialty for consistency
        geographicRegion: firstRow.region,
        providerType: firstRow.providerType,
        surveyYear: firstRow.surveyYear, // Individual survey year
        variables: {}
      };
      
      // Aggregate variables from all rows (weighted by n_incumbents)
      const variableMap = new Map<string, VariableMetrics[]>();
      
      rows.forEach(row => {
        Object.entries(row.variables).forEach(([varName, metrics]) => {
          if (!variableMap.has(varName)) {
            variableMap.set(varName, []);
          }
          variableMap.get(varName)!.push(metrics);
        });
      });
      
      // Create aggregated metrics for each variable - use direct metrics from single survey
      variableMap.forEach((metricsList, varName) => {
        if (metricsList.length > 0) {
          // Use the metrics directly from the single survey source
          // Since we're now grouping by survey source, each group has only one survey
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
}

// Export singleton instance
export const analyticsDataService = new AnalyticsDataService();
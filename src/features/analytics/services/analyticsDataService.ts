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
import { normalizeVariableName, mapVariableNameToStandard } from '../utils/variableFormatters';

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
  dataCategory?: string; // NEW: Data category from survey (COMPENSATION, CALL_PAY, MOONLIGHTING, CUSTOM)
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
      
      // CRITICAL FIX: Process ALL surveys, not just first 3
      // Process surveys in parallel for better performance
      const allNormalizedRows: NormalizedRow[] = [];
      
      // Process all surveys in parallel
      const surveyPromises = surveys.map(async (survey) => {
        try {
          console.log('🔍 Processing survey:', {
            id: survey.id,
            name: survey.name,
            type: survey.type,
            providerType: survey.providerType
          });
          
          // Firestore max query limit is 10,000; use that so all specialties appear in filters where possible
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 10000 });
          
          if (surveyData.rows.length === 0) {
            console.log('⚠️ No data rows for survey:', survey.name);
            return [];
          }
          
          console.log('📊 Survey data loaded:', {
            surveyName: survey.name,
            rowCount: surveyData.rows.length,
            sampleRow: surveyData.rows[0] ? {
              specialty: surveyData.rows[0].specialty,
              surveySpecialty: surveyData.rows[0].surveySpecialty,
              providerType: surveyData.rows[0].providerType || surveyData.rows[0].provider_type
            } : 'No rows'
          });
          
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
      // CRITICAL: Include variable mappings that user created in mapping screen
      const [surveys, specialtyMappings, columnMappings, variableMappings, learnedMappings] = await Promise.all([
        this.dataService.getAllSurveys(),
        this.dataService.getAllSpecialtyMappings(),
        this.dataService.getAllColumnMappings(),
        this.dataService.getVariableMappings(), // CRITICAL: Get user-created variable mappings
        this.getLearnedMappings()
      ]);
      
      // CRITICAL DEBUG: Log all surveys to verify MGMA Physician exists
      console.log('🔍 AnalyticsDataService: All surveys from IndexedDB:', {
        totalSurveys: surveys.length,
        surveys: surveys.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          providerType: s.providerType,
          source: (s as any).source,
          dataCategory: (s as any).dataCategory,
          year: s.year
        }))
      });
      
      // Build lookup map: variable name + survey source -> standardized name
      // This handles MGMA's "Compensation to Work RVU Ratio" -> "total_cash_compensation_per_work_rvus"
      const variableMappingLookup = new Map<string, string>();
      variableMappings.forEach((mapping: any) => {
        const standardizedName = mapping.standardizedName;
        mapping.sourceVariables?.forEach((source: any) => {
          // Key: surveySource + originalVariableName -> standardizedName
          // Handle both exact match and case-insensitive
          const key = `${source.surveySource}::${source.originalVariableName}`.toLowerCase().trim();
          variableMappingLookup.set(key, standardizedName);
          
          // Also add a more flexible key without exact survey source match
          // This handles variations in survey source naming
          const flexibleKey = `::${source.originalVariableName}`.toLowerCase().trim();
          if (!variableMappingLookup.has(flexibleKey)) {
            variableMappingLookup.set(flexibleKey, standardizedName);
          }
        });
      });
      
      console.log('🔍 Variable Mapping Lookup built:', {
        totalMappings: variableMappings.length,
        lookupEntries: variableMappingLookup.size,
        sampleEntries: Array.from(variableMappingLookup.entries()).slice(0, 5),
        mgmaEntries: Array.from(variableMappingLookup.entries()).filter(([key]) => key.toLowerCase().includes('mgma')).slice(0, 3)
      });
      
      if (surveys.length === 0) {
        console.log('📊 No surveys found in IndexedDB');
        return [];
      }
      
      console.log(`📊 Processing ${surveys.length} surveys for dynamic variables`);
      
      // CRITICAL FIX: Process ALL surveys, not just first 3
      // Process all surveys in parallel for better performance
      const allNormalizedRows: DynamicNormalizedRow[] = [];
      
      // Process all surveys
      const surveyPromises = surveys.map(async (survey) => {
        try {
          // CRITICAL DEBUG: Log survey info before processing
          console.log('🔍 Processing survey for analytics:', {
            id: survey.id,
            name: survey.name,
            type: survey.type,
            providerType: survey.providerType,
            source: (survey as any).source,
            dataCategory: (survey as any).dataCategory,
            year: survey.year
          });
          
          // Firestore max query limit is 10,000; use that so all specialties appear in filters where possible
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 10000 });
          
          if (surveyData.rows.length === 0) {
            console.log(`📊 Survey ${survey.id} (${survey.name}) has no data rows - SKIPPED`);
            return [];
          }
          
          console.log(`📊 Survey ${survey.id} (${survey.name}) has ${surveyData.rows.length} data rows`);
          
          // Normalize rows dynamically
          const normalizedRows: DynamicNormalizedRow[] = [];
          const batchSize = 50;
          
          for (let i = 0; i < surveyData.rows.length; i += batchSize) {
            const batch = surveyData.rows.slice(i, i + batchSize);
            const batchNormalized = batch.map(row => 
              this.normalizeRowDynamic(row, survey, selectedVariables, {
                specialtyMappings,
                columnMappings,
                variableMappingLookup, // CRITICAL: Pass user-created variable mappings
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
    // ENTERPRISE FIX: For Call Pay surveys, use survey's providerType first
    // This ensures Call Pay surveys are correctly identified even if data rows don't have providerType
    let rawProviderType: string;
    if (survey.providerType === 'CALL') {
      // Call Pay surveys should use 'CALL' as providerType
      rawProviderType = 'CALL';
    } else {
      // For other surveys, extract from data row
      rawProviderType = actualRowData.providerType || actualRowData['Provider Type'] ||
                       actualRowData.provider_type || row.providerType || survey.providerType || 'Physician';
    }
    
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
    // CRITICAL: Support case-insensitive variable column - CSV/Excel often use "Variable" (capital V)
    const variableFieldKey = Object.keys(actualRowData).find(k => k.toLowerCase() === 'variable' || k.toLowerCase() === 'benchmark');
    const hasVariableField = variableFieldKey !== undefined;

    // Initialize all metrics to 0
    const normalizedMetrics = {
      tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
      wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
      cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0
    };

    if (hasVariableField && variableFieldKey) {
      // LONG FORMAT: Data has a variable/benchmark field (variable, Variable, Benchmark, etc.)
      const variable = String(actualRowData[variableFieldKey] ?? '').toLowerCase();
      const p25 = this.extractNumber(actualRowData.p25);
      const p50 = this.extractNumber(actualRowData.p50);
      const p75 = this.extractNumber(actualRowData.p75);
      const p90 = this.extractNumber(actualRowData.p90);
      
      // CRITICAL: Apply learned variable mappings FIRST before pattern matching
      // This handles cases like MGMA's "compensation to work rvus ratio" 
      let mappedVariable = variable;
      const originalVariable = variable;
      if (learnedMappings.learnedVariableMappings && learnedMappings.learnedVariableMappings[variable]) {
        mappedVariable = learnedMappings.learnedVariableMappings[variable].toLowerCase();
        console.log('🔍 Applied learned variable mapping:', variable, '->', mappedVariable);
      }
      
      // Enhanced logging for MGMA data
      if (survey.name && survey.name.toLowerCase().includes('mgma') && 
          (variable.toLowerCase().includes('compensation') || variable.toLowerCase().includes('cf') || variable.toLowerCase().includes('rvu'))) {
        console.log('🔍 MGMA Variable Processing:', {
          surveyName: survey.name,
          originalVariable,
          mappedVariable,
          hasLearnedMapping: !!learnedMappings.learnedVariableMappings?.[originalVariable],
          learnedMappings: learnedMappings.learnedVariableMappings,
          p25, p50, p75, p90
        });
      }
      
      // Set the appropriate metrics based on the variable type
      // Check for CF/conversion factor patterns FIRST (most specific)
      // CRITICAL: Include "to" patterns for MGMA (e.g., "compensation to work rvus ratio")
      const isCF = mappedVariable.includes('tcc per work rvu') || 
                   mappedVariable.includes('tcc per wrvu') ||
                   mappedVariable.includes('total comp per work rvu') ||
                   mappedVariable.includes('total comp per wrvu') ||
                   mappedVariable.includes('total compensation per work rvu') ||
                   mappedVariable.includes('total compensation per wrvu') ||
                   mappedVariable.includes('compensation per work rvu') ||
                   mappedVariable.includes('compensation per wrvu') ||
                   mappedVariable.includes('compensation to work rvu') || // MGMA pattern
                   mappedVariable.includes('compensation to wrvu') || // MGMA pattern
                   mappedVariable.includes('compensation to work rvus') || // MGMA pattern
                   mappedVariable.includes('comp to work rvu') || // MGMA pattern
                   mappedVariable.includes('comp to wrvu') || // MGMA pattern
                   mappedVariable.includes('total comp to work rvu') || // MGMA pattern
                   mappedVariable.includes('tcc to work rvu') || // MGMA pattern
                   mappedVariable.includes('comp per work rvu') ||
                   mappedVariable.includes('comp per wrvu') ||
                   mappedVariable.includes('conversion factor') ||
                   mappedVariable.includes('conversion') ||
                   mappedVariable.includes(' cf ') ||
                   mappedVariable.includes('_cf_') ||
                   mappedVariable.includes(' per rvu') ||
                   mappedVariable.includes(' per wrvu') ||
                   mappedVariable.includes(' to rvu') || // MGMA "to" pattern
                   mappedVariable.includes(' to wrvu') || // MGMA "to" pattern
                   mappedVariable.includes('/rvu') ||
                   mappedVariable.includes('/wrvu') ||
                   mappedVariable.includes('dollars per rvu') ||
                   mappedVariable.includes('dollars per wrvu') ||
                   mappedVariable.includes('$ per rvu') ||
                   mappedVariable.includes('$ per wrvu') ||
                   (mappedVariable.includes('ratio') && (mappedVariable.includes('rvu') || mappedVariable.includes('wrvu'))); // MGMA ratio pattern
      
      if (isCF) {
        // This is definitely a conversion factor
        normalizedMetrics.cf_p25 = p25;
        normalizedMetrics.cf_p50 = p50;
        normalizedMetrics.cf_p75 = p75;
        normalizedMetrics.cf_p90 = p90;
        
        // Enhanced logging for MGMA CF detection
        if (survey.name && survey.name.toLowerCase().includes('mgma')) {
          console.log('✅ MGMA CF Detected:', {
            surveyName: survey.name,
            variable: originalVariable,
            mappedVariable,
            cf_p25: p25,
            cf_p50: p50,
            cf_p75: p75,
            cf_p90: p90
          });
        }
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
      } else if ((variable.includes('on') && variable.includes('call')) || 
                 variable.includes('oncall') ||
                 variable.includes('daily rate on call') ||
                 variable.includes('daily rate oncall')) {
        // This is on-call compensation - will be handled by dynamic variable system
        // We don't need to set normalizedMetrics here as dynamic variables handle it
        // This check is primarily for logging/debugging purposes
        console.log('🔍 On-Call Compensation detected in LONG format:', {
          surveyName: survey.name,
          variable: originalVariable,
          mappedVariable,
          p25, p50, p75, p90
        });
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
      }
      // Note: CF detection is now handled above in the isCF check
    } else {
      // WIDE FORMAT: Data has separate columns for each metric
      // Extract TCC metrics with fallback column names
      normalizedMetrics.tcc_p25 = this.extractNumber(
        (actualRowData.tcc_p25 || actualRowData['TCC P25'] || actualRowData['tcc_p25'] || actualRowData['TCC_p25'])
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
      // First try standard column names
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
      
      // If CF values are still 0, try to find CF columns dynamically (for MGMA and other surveys)
      // This handles variations like "TCC per Work RVU P25", "Total Comp per wRVU P50", etc.
      if (!normalizedMetrics.cf_p25 && !normalizedMetrics.cf_p50 && !normalizedMetrics.cf_p75 && !normalizedMetrics.cf_p90) {
        const allColumns = Object.keys(actualRowData);
        
        // Enhanced logging for MGMA WIDE format
        if (survey.name && survey.name.toLowerCase().includes('mgma')) {
          const cfRelatedColumns = allColumns.filter(col => 
            col.toLowerCase().includes('compensation') && 
            (col.toLowerCase().includes('rvu') || col.toLowerCase().includes('ratio') || col.toLowerCase().includes('cf'))
          );
          if (cfRelatedColumns.length > 0) {
            console.log('🔍 MGMA WIDE Format - CF Related Columns Found:', {
              surveyName: survey.name,
              allColumns: allColumns.length,
              cfRelatedColumns,
              sampleValues: cfRelatedColumns.slice(0, 2).map(col => ({ column: col, value: actualRowData[col] }))
            });
          }
        }
        const cfColumnPatterns = [
          // Standard CF patterns
          /cf.*p25/i, /conversion.*factor.*p25/i, /cf.*25th/i,
          // TCC per Work RVU patterns (MGMA, Gallagher, etc.)
          /tcc.*per.*work.*rvu.*p25/i, /tcc.*per.*wrvu.*p25/i,
          /total.*comp.*per.*work.*rvu.*p25/i, /total.*comp.*per.*wrvu.*p25/i,
          /comp.*per.*work.*rvu.*p25/i, /comp.*per.*wrvu.*p25/i,
          /total.*cash.*per.*work.*rvu.*p25/i, /total.*cash.*per.*wrvu.*p25/i,
          // MGMA "to" patterns (e.g., "compensation to work rvus ratio")
          /compensation.*to.*work.*rvu.*p25/i, /compensation.*to.*wrvu.*p25/i,
          /comp.*to.*work.*rvu.*p25/i, /comp.*to.*wrvu.*p25/i,
          /tcc.*to.*work.*rvu.*p25/i, /tcc.*to.*wrvu.*p25/i,
          /ratio.*p25/i, // MGMA ratio pattern
          // Dollar per RVU patterns
          /\$.*per.*rvu.*p25/i, /\$.*per.*work.*rvu.*p25/i
        ];
        
        const p25Column = allColumns.find(col => cfColumnPatterns.some(pattern => pattern.test(col)));
        if (p25Column) {
          normalizedMetrics.cf_p25 = this.extractNumber(actualRowData[p25Column]);
        }
        
        const p50Patterns = [
          /cf.*p50/i, /conversion.*factor.*p50/i, /cf.*median/i, /cf.*50th/i,
          /tcc.*per.*work.*rvu.*p50/i, /tcc.*per.*wrvu.*p50/i,
          /total.*comp.*per.*work.*rvu.*p50/i, /total.*comp.*per.*wrvu.*p50/i,
          /total.*comp.*per.*work.*rvu.*median/i, /total.*comp.*per.*wrvu.*median/i,
          /comp.*per.*work.*rvu.*p50/i, /comp.*per.*wrvu.*p50/i,
          /comp.*per.*work.*rvu.*median/i, /comp.*per.*wrvu.*median/i,
          /total.*cash.*per.*work.*rvu.*p50/i, /total.*cash.*per.*wrvu.*p50/i,
          // MGMA "to" patterns
          /compensation.*to.*work.*rvu.*p50/i, /compensation.*to.*wrvu.*p50/i,
          /comp.*to.*work.*rvu.*p50/i, /comp.*to.*wrvu.*p50/i,
          /comp.*to.*work.*rvu.*median/i, /comp.*to.*wrvu.*median/i,
          /tcc.*to.*work.*rvu.*p50/i, /tcc.*to.*wrvu.*p50/i,
          /ratio.*p50/i, /ratio.*median/i, // MGMA ratio pattern
          /\$.*per.*rvu.*p50/i, /\$.*per.*work.*rvu.*p50/i, /\$.*per.*rvu.*median/i
        ];
        
        const p50Column = allColumns.find(col => p50Patterns.some(pattern => pattern.test(col)));
        if (p50Column) {
          normalizedMetrics.cf_p50 = this.extractNumber(actualRowData[p50Column]);
        }
        
        const p75Patterns = [
          /cf.*p75/i, /conversion.*factor.*p75/i, /cf.*75th/i,
          /tcc.*per.*work.*rvu.*p75/i, /tcc.*per.*wrvu.*p75/i,
          /total.*comp.*per.*work.*rvu.*p75/i, /total.*comp.*per.*wrvu.*p75/i,
          /comp.*per.*work.*rvu.*p75/i, /comp.*per.*wrvu.*p75/i,
          /total.*cash.*per.*work.*rvu.*p75/i, /total.*cash.*per.*wrvu.*p75/i,
          // MGMA "to" patterns
          /compensation.*to.*work.*rvu.*p75/i, /compensation.*to.*wrvu.*p75/i,
          /comp.*to.*work.*rvu.*p75/i, /comp.*to.*wrvu.*p75/i,
          /tcc.*to.*work.*rvu.*p75/i, /tcc.*to.*wrvu.*p75/i,
          /ratio.*p75/i, // MGMA ratio pattern
          /\$.*per.*rvu.*p75/i, /\$.*per.*work.*rvu.*p75/i
        ];
        
        const p75Column = allColumns.find(col => p75Patterns.some(pattern => pattern.test(col)));
        if (p75Column) {
          normalizedMetrics.cf_p75 = this.extractNumber(actualRowData[p75Column]);
        }
        
        const p90Patterns = [
          /cf.*p90/i, /conversion.*factor.*p90/i, /cf.*90th/i,
          /tcc.*per.*work.*rvu.*p90/i, /tcc.*per.*wrvu.*p90/i,
          /total.*comp.*per.*work.*rvu.*p90/i, /total.*comp.*per.*wrvu.*p90/i,
          /comp.*per.*work.*rvu.*p90/i, /comp.*per.*wrvu.*p90/i,
          /total.*cash.*per.*work.*rvu.*p90/i, /total.*cash.*per.*wrvu.*p90/i,
          // MGMA "to" patterns
          /compensation.*to.*work.*rvu.*p90/i, /compensation.*to.*wrvu.*p90/i,
          /comp.*to.*work.*rvu.*p90/i, /comp.*to.*wrvu.*p90/i,
          /tcc.*to.*work.*rvu.*p90/i, /tcc.*to.*wrvu.*p90/i,
          /ratio.*p90/i, // MGMA ratio pattern
          /\$.*per.*rvu.*p90/i, /\$.*per.*work.*rvu.*p90/i
        ];
        
        const p90Column = allColumns.find(col => p90Patterns.some(pattern => pattern.test(col)));
        if (p90Column) {
          normalizedMetrics.cf_p90 = this.extractNumber(actualRowData[p90Column]);
        }
      }
    }
    
    // NEW: Use survey.source and survey.dataCategory if available (new architecture)
    // Fallback to old logic for backward compatibility
    let finalSurveySource: string;
    if ((survey as any).source && (survey as any).dataCategory) {
      // New architecture: Construct surveySource from source + dataCategory
      const source = (survey as any).source;
      const dataCategory = (survey as any).dataCategory;
      const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay' 
        : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
        : dataCategory === 'COMPENSATION' ? (survey.providerType === 'APP' ? 'APP' : 'Physician')
        : dataCategory;
      finalSurveySource = `${source} ${categoryDisplay}`;
      
      console.log('🔍 Survey Source Construction (New Architecture):', {
        surveyName: survey.name,
        source,
        dataCategory,
        providerType: survey.providerType,
        categoryDisplay,
        finalSurveySource
      });
    } else {
      // Backward compatibility: Use old logic
      // CRITICAL FIX: Handle MGMA surveys properly - check if name contains "Physician" or "Call Pay"
      if (survey.name && survey.name.includes('MGMA')) {
        // Extract "MGMA Physician" or "MGMA Call Pay" from the name
        // Survey name format: "MGMA Physician 2025" or "MGMA Call Pay 2025"
        const nameWithoutYear = survey.name.replace(/\s+\d{4}$/, '').trim(); // Remove year suffix
        finalSurveySource = nameWithoutYear;
        
        console.log('🔍 Survey Source Construction (Old Architecture - MGMA):', {
          surveyName: survey.name,
          surveyType: survey.type,
          providerType: survey.providerType,
          nameWithoutYear,
          finalSurveySource
        });
      } else {
        // Backward compatibility: Use old logic
        // CRITICAL FIX: Better handling for surveys without source/dataCategory
        // Try multiple fallback strategies to ensure we get the correct survey source
        let sourceFromType = survey.type || '';
        let sourceFromName = survey.name ? survey.name.replace(/\s+\d{4}$/, '').trim() : '';
        
        // Priority 1: Use type if it contains both source and category (e.g., "MGMA Physician")
        if (sourceFromType && sourceFromType.includes(' ')) {
          finalSurveySource = sourceFromType;
        }
        // Priority 2: Use name without year if available
        else if (sourceFromName) {
          finalSurveySource = sourceFromName;
        }
        // Priority 3: Fallback to type as-is
        else {
          finalSurveySource = sourceFromType || 'Unknown';
        }
        
        // Special handling for Call Pay: ensure we preserve "Call Pay" in the name
        if (survey.providerType === 'CALL' || (survey.name && survey.name.toLowerCase().includes('call pay'))) {
          if (survey.name && survey.name.includes('Call Pay')) {
            finalSurveySource = survey.name.replace(/\s+\d{4}$/, '').trim();
          } else if (!finalSurveySource.includes('Call Pay')) {
            // If we got a source but it doesn't have "Call Pay", add it
            finalSurveySource = sourceFromType && sourceFromType.includes('Physician')
              ? sourceFromType.replace('Physician', 'Call Pay')
              : `${sourceFromType || sourceFromName} Call Pay`;
          }
        }
        
        console.log('🔍 Survey Source Construction (Old Architecture):', {
          surveyName: survey.name,
          surveyType: survey.type,
          providerType: survey.providerType,
          sourceFromType,
          sourceFromName,
          finalSurveySource
        });
      }
    }
    
    // Debug logging for Call Pay surveys
    // FIXED: Check for Call Pay using dataCategory OR old providerType for backward compatibility
    if ((survey as any).dataCategory === 'CALL_PAY' || survey.providerType === 'CALL') {
      console.log('🎯 Call Pay Data Normalization:', {
        surveyName: survey.name,
        surveyType: survey.type,
        surveyProviderType: survey.providerType,
        nameIncludesCallPay: survey.name && survey.name.includes('Call Pay'),
        finalSurveySource,
        finalSurveySourceLength: finalSurveySource.length,
        finalSurveySourceChars: finalSurveySource.split('').map((c: string) => `${c}(${c.charCodeAt(0)})`).join(''),
        rawSpecialty,
        normalizedSpecialty,
        rawProviderType,
        normalizedProviderType
      });
    }
    
    // Debug logging for MGMA data
    if (survey.name && survey.name.toLowerCase().includes('mgma')) {
      console.log('🎯 MGMA Data Normalization:', {
        surveyName: survey.name,
        surveyType: survey.type,
        finalSurveySource,
        rawSpecialty,
        normalizedSpecialty,
        rawProviderType,
        normalizedProviderType,
        rawRegion,
        normalizedRegion
      });
    }
    
    // Debug logging for SullivanCotter data
    if (survey.name && survey.name.toLowerCase().includes('sullivan')) {
      console.log('🎯 SullivanCotter Data Normalization:', {
        surveyName: survey.name,
        surveyType: survey.type,
        finalSurveySource,
        rawSpecialty,
        normalizedSpecialty,
        rawProviderType,
        normalizedProviderType,
        rawRegion,
        normalizedRegion
      });
    }
    
    // Debug logging for Gallagher data
    if (survey.name && survey.name.toLowerCase().includes('gallagher')) {
      console.log('🎯 Gallagher Data Normalization:', {
        surveyName: survey.name,
        surveyType: survey.type,
        finalSurveySource,
        rawSpecialty,
        normalizedSpecialty,
        rawProviderType,
        normalizedProviderType,
        rawRegion,
        normalizedRegion,
        cf_p25: normalizedMetrics.cf_p25,
        cf_p50: normalizedMetrics.cf_p50,
        cf_p75: normalizedMetrics.cf_p75,
        cf_p90: normalizedMetrics.cf_p90
      });
    }
    
    return {
      specialty: normalizedSpecialty,
      providerType: normalizedProviderType,
      region: normalizedRegion,
      n_orgs,
      n_incumbents,
      ...normalizedMetrics,
      surveySource: finalSurveySource,
      surveyYear: survey.year?.toString() || 'Unknown',
      // NEW: Include dataCategory if available from survey
      dataCategory: (survey as any).dataCategory,
      rawData: actualRowData
    };
  }
  
  /**
   * Extract number from various formats
   * Handles vendor markers (asterisks, ISD, N/A) as 0 (missing data)
   */
  private extractNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const upper = value.trim().toUpperCase();
      // Handle vendor markers (asterisks, ISD, N/A) as 0
      if (upper === 'ISD' || upper === 'N/A' || upper === 'NA' || 
          value === '***' || value === '*' || value === '**' || 
          value === '' || value === 'null' || value === 'undefined') return 0;
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
    // ENTERPRISE FIX: Normalize surveySource to handle year suffixes
    // surveySource might be "MGMA Call Pay 2025" but mapping has "MGMA Call Pay"
    const normalizedSurveySource = surveySource.replace(/\s+\d{4}$/, '').trim();
    
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some(source => {
        // Try exact match first
        if (source.surveySource === surveySource || source.surveySource === normalizedSurveySource) {
          return source.specialty.toLowerCase() === specialty.toLowerCase();
        }
        // Also try normalized comparison (remove year from both)
        const normalizedMappingSource = source.surveySource.replace(/\s+\d{4}$/, '').trim();
        if (normalizedMappingSource === normalizedSurveySource) {
          return source.specialty.toLowerCase() === specialty.toLowerCase();
        }
        return false;
      });
      
      if (hasSourceSpecialty) {
        return mapping.standardizedName;
      }
    }
    
    // If no exact mapping found, try fuzzy matching for common variations
    const normalizedSpecialty = this.normalizeSpecialtyName(specialty);
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some(source => {
        const normalizedSourceSpecialty = this.normalizeSpecialtyName(source.specialty);
        // ENTERPRISE FIX: Also normalize surveySource for fuzzy matching (handle year suffixes)
        const sourceSurveySource = source.surveySource.replace(/\s+\d{4}$/, '').trim();
        const compareSurveySource = normalizedSurveySource;
        return (source.surveySource === surveySource || sourceSurveySource === compareSurveySource) && 
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
   * ENTERPRISE FIX: Preserve leadership roles (Chief, Chair, Director) - don't normalize them to "Staff Physician"
   */
  private normalizeProviderType(providerType: string, learnedMappings?: Record<string, string>): string {
    if (!providerType) return 'Staff Physician';
    
    // ENTERPRISE FIX: Handle 'CALL' provider type explicitly first
    // This ensures Call Pay surveys are correctly identified
    const lower = providerType.toLowerCase();
    if (providerType === 'CALL' || lower === 'call') {
      return 'CALL';
    }
    
    // First, try learned mappings (highest priority for enterprise scalability)
    if (learnedMappings && learnedMappings[lower]) {
      return learnedMappings[lower];
    }
    
    // ENTERPRISE FIX: Preserve leadership/administrative roles - don't normalize them
    // These are distinct provider types and should not be converted to "Staff Physician"
    const leadershipKeywords = [
      'chief', 'chair', 'director', 'head', 'leader', 'medical director', 
      'program director', 'department chair', 'division chief', 'section chief',
      'vice chair', 'associate director', 'assistant director'
    ];
    
    const isLeadershipRole = leadershipKeywords.some(keyword => 
      lower.includes(keyword)
    );
    
    // If it's a leadership role, preserve it as-is (don't normalize to "Staff Physician")
    if (isLeadershipRole) {
      return providerType; // Preserve original value
    }
    
    // Handle PhD roles
    if (lower.includes('phd') || lower.includes('doctor of philosophy')) {
      return 'PhD';
    } else if (lower.includes('physician') || lower.includes('md') || lower.includes('do')) {
      // Only normalize to "Staff Physician" if it's NOT a leadership role
      // Check again to be safe (in case the keyword check missed something)
      if (!isLeadershipRole) {
        return 'Staff Physician';
      }
      // If it contains "physician" but is a leadership role, preserve it
      return providerType;
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
   * ENTERPRISE FIX: Preserve subregions (like "Great Lakes") - don't collapse them into parent regions
   */
  private normalizeRegion(region: string, learnedMappings?: Record<string, string>): string {
    if (!region || region === 'National') return 'National';
    
    // First, try learned mappings (highest priority for enterprise scalability)
    if (learnedMappings && learnedMappings[region.toLowerCase()]) {
      return learnedMappings[region.toLowerCase()];
    }
    
    const lower = region.toLowerCase();
    
    // ENTERPRISE FIX: Preserve legitimate subregions - don't collapse them into parent regions
    // Subregions like "Great Lakes", "Plains", "Central" should be preserved as-is
    const subregions = [
      'great lakes', 'plains', 'central', 'mountain', 'pacific', 'atlantic',
      'new england', 'mid-atlantic', 'south atlantic', 'east north central',
      'west north central', 'east south central', 'west south central'
    ];
    
    const isSubregion = subregions.some(sub => lower.includes(sub));
    if (isSubregion) {
      // Preserve subregion with proper capitalization
      return region.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Handle "Eastern" - typically maps to "Northeast"
    if (lower === 'eastern' || (lower.includes('eastern') && !lower.includes('great lakes'))) {
      return 'Northeast';
    } else if (lower.includes('northeast') || lower.includes('northeastern') || lower === 'ne') {
      return 'Northeast';
    } else if (lower.includes('southeast') || lower.includes('southern') || (lower.includes('south') && !lower.includes('west'))) {
      return 'South';
    } else if (lower.includes('midwest') || lower.includes('midwestern') || lower === 'nc') {
      // ENTERPRISE FIX: Only normalize to "Midwest" if it's explicitly "midwest" or "north central"
      // Don't collapse "Great Lakes" or other subregions
      return 'Midwest';
    } else if (lower.includes('west') || lower.includes('western')) {
      return 'West';
    } else if (lower.includes('national')) {
      return 'National';
    }
    
    // Preserve original region if it doesn't match known patterns
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
        
        // Debug MGMA data grouping (SUPPRESSED - too verbose)
        // Only log for target specialty to reduce console noise
        const isTargetGrouping = row.specialty?.toLowerCase().includes('pediatric') && 
                                 row.specialty?.toLowerCase().includes('general') &&
                                 row.surveySource?.toLowerCase().includes('mgma') &&
                                 row.surveySource?.toLowerCase().includes('call pay');
        if (isTargetGrouping) {
          console.log('🔍 [TARGET TRACE] MGMA Data Grouping:', {
            key,
            specialty: row.specialty,
            providerType: row.providerType,
            region: row.region,
            surveySource: row.surveySource,
            n_orgs: row.n_orgs,
            n_incumbents: row.n_incumbents
          });
        }
        
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
      dataCategory: firstRow.dataCategory, // NEW: Include dataCategory from normalized row
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
      variableMappingLookup: Map<string, string>; // CRITICAL: User-created variable mappings
      learnedSpecialtyMappings: Record<string, string>;
      learnedColumnMappings: Record<string, string>;
      learnedRegionMappings: Record<string, string>;
      learnedVariableMappings: Record<string, string>;
      learnedProviderTypeMappings: Record<string, string>;
    }
  ): DynamicNormalizedRow {
    const actualRowData = row.data || row;
    const variables: Record<string, VariableMetrics> = {};
    
    // CRITICAL DEBUG: Log first few SullivanCotter APP rows to see structure
    const isSullivanCotterAPP = (survey.name && survey.name.toLowerCase().includes('sullivan') && survey.providerType === 'APP') ||
                                 ((survey as any).source === 'SullivanCotter' && survey.providerType === 'APP');
    if (isSullivanCotterAPP && Object.keys(variables).length === 0) {
      // Only log first row to avoid spam
      const shouldLog = !(globalThis as any).__sullivancotter_app_logged;
      if (shouldLog) {
        (globalThis as any).__sullivancotter_app_logged = true;
        console.log('🔍 SullivanCotter APP Row Structure (first row):', {
          surveyId: survey.id,
          surveyName: survey.name,
          surveyType: survey.type,
          providerType: survey.providerType,
          source: (survey as any).source,
          dataCategory: (survey as any).dataCategory,
          rowKeys: Object.keys(actualRowData),
          hasVariable: actualRowData.variable !== undefined,
          hasVariableCapital: actualRowData.Variable !== undefined,
          hasBenchmark: actualRowData.benchmark !== undefined,
          variableValue: actualRowData.variable || actualRowData.Variable || actualRowData.benchmark || 'NOT FOUND',
          sampleData: {
            specialty: actualRowData.specialty || actualRowData.Specialty,
            region: actualRowData.region || actualRowData.Region || actualRowData.geographic_region,
            p25: actualRowData.p25 || actualRowData.P25 || actualRowData['25th%'],
            p50: actualRowData.p50 || actualRowData.P50 || actualRowData['50th%'] || actualRowData.Median,
            p75: actualRowData.p75 || actualRowData.P75 || actualRowData['75th%'],
            p90: actualRowData.p90 || actualRowData.P90 || actualRowData['90th%']
          }
        });
      }
    }
    
    // Extract specialty, provider type, region (same as existing logic)
    const rawSpecialty = actualRowData.specialty || actualRowData.Specialty || 
                        actualRowData.normalizedSpecialty || actualRowData['Provider Type'] ||
                        row.specialty || 'Unknown';
    
    // ENTERPRISE DEBUG: Log specialty normalization for Call Pay surveys
    const isCallPaySurvey = survey.providerType === 'CALL' || 
                           (survey.name && survey.name.toLowerCase().includes('call pay')) ||
                           ((survey as any).dataCategory === 'CALL_PAY');
    
    const normalizedSpecialty = this.normalizeSpecialty(
      rawSpecialty,
      mappings.specialtyMappings,
      survey.type,
      mappings.learnedSpecialtyMappings
    );
    
    // ENTERPRISE DEBUG: Log if Call Pay specialty normalization might have failed
    if (isCallPaySurvey && normalizedSpecialty.toLowerCase() === this.normalizeSpecialtyName(rawSpecialty).toLowerCase()) {
      // If normalized specialty is just the normalized raw specialty (no mapping found), log it
      console.log('⚠️ Call Pay specialty normalization - no mapping found:', {
        surveyId: survey.id,
        surveyName: survey.name,
        surveyType: survey.type,
        rawSpecialty,
        normalizedSpecialty,
        expectedMapping: 'Should match mapping with surveySource: "MGMA Call Pay"'
      });
    }
    
    // Removed verbose logging - keeping normalization logic clean
    
    // ENTERPRISE FIX: For Call Pay surveys, use survey's providerType first
    // This ensures Call Pay surveys are correctly identified even if data rows don't have providerType
    let rawProviderType: string;
    if (survey.providerType === 'CALL') {
      // Call Pay surveys should use 'CALL' as providerType
      rawProviderType = 'CALL';
    } else {
      // For other surveys, extract from data row
      rawProviderType = actualRowData.providerType || actualRowData['Provider Type'] ||
                       actualRowData.provider_type || row.providerType || survey.providerType || 'Physician';
    }
    
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
    // CRITICAL: Support case-insensitive variable column - CSV/Excel often use "Variable" (capital V)
    const variableFieldKey = Object.keys(actualRowData).find(k => k.toLowerCase() === 'variable' || k.toLowerCase() === 'benchmark');
    const hasVariableField = variableFieldKey !== undefined;

    // Note: We handle both LONG format (variable field) and WIDE format (separate columns) below

    if (hasVariableField && variableFieldKey) {
      // LONG FORMAT: Data has a variable/benchmark field (variable, Variable, Benchmark, etc.)
      let variable = String(actualRowData[variableFieldKey] ?? '').trim();
      const originalVariable = variable;
      
      // CRITICAL STEP 1: Check user-created variable mappings FIRST (from mapping screen)
      // This handles MGMA's "Compensation to Work RVU Ratio" -> "total_cash_compensation_per_work_rvus"
      // NEW: Use survey.source and survey.dataCategory if available (new architecture)
      // Fallback to old logic for backward compatibility
      let surveySource: string;
      if ((survey as any).source && (survey as any).dataCategory) {
        // New architecture: Construct surveySource from source + dataCategory
        const source = (survey as any).source;
        const dataCategory = (survey as any).dataCategory;
        const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay' 
          : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
          : dataCategory === 'COMPENSATION' ? (survey.providerType === 'APP' ? 'APP' : 'Physician')
          : dataCategory;
        surveySource = `${source} ${categoryDisplay}`;
      } else {
          // Backward compatibility: Use old logic
          // CRITICAL FIX: Better handling for surveys without source/dataCategory
          // Try multiple fallback strategies to ensure we get the correct survey source
          let sourceFromType = survey.type || '';
          let sourceFromName = survey.name ? survey.name.replace(/\s+\d{4}$/, '').trim() : '';
          
          // Priority 1: Use type if it contains both source and category (e.g., "MGMA Physician")
          if (sourceFromType && sourceFromType.includes(' ')) {
            surveySource = sourceFromType;
          }
          // Priority 2: Use name without year if available (for MGMA surveys)
          else if (survey.name && survey.name.includes('MGMA')) {
            surveySource = sourceFromName;
          }
          // Priority 3: Fallback to name without year
          else if (sourceFromName) {
            surveySource = sourceFromName;
          }
          // Priority 4: Fallback to type as-is
          else {
            surveySource = sourceFromType || '';
          }
          
          // Special handling for Call Pay: ensure we preserve "Call Pay" in the name
          if (survey.providerType === 'CALL' || (survey.name && survey.name.toLowerCase().includes('call pay'))) {
            if (survey.name && survey.name.includes('Call Pay')) {
              surveySource = survey.name.replace(/\s+\d{4}$/, '').trim();
            } else if (!surveySource.includes('Call Pay')) {
              // If we got a source but it doesn't have "Call Pay", add it
              surveySource = sourceFromType && sourceFromType.includes('Physician')
                ? sourceFromType.replace('Physician', 'Call Pay')
                : `${sourceFromType || sourceFromName} Call Pay`;
            }
          }
        }
      const exactMappingKey = `${surveySource}::${originalVariable}`.toLowerCase().trim();
      const flexibleMappingKey = `::${originalVariable}`.toLowerCase().trim();
      
      // Try exact match first, then flexible match
      let standardizedNameFromMapping = mappings.variableMappingLookup?.get(exactMappingKey);
      if (!standardizedNameFromMapping) {
        standardizedNameFromMapping = mappings.variableMappingLookup?.get(flexibleMappingKey);
      }
      
      if (standardizedNameFromMapping) {
        // Use the standardized name from user-created mapping
        variable = standardizedNameFromMapping;
        console.log('✅ Applied user-created variable mapping:', {
          surveySource,
          originalVariable,
          standardizedName: standardizedNameFromMapping,
          exactKey: exactMappingKey,
          flexibleKey: flexibleMappingKey,
          matchedKey: mappings.variableMappingLookup?.has(exactMappingKey) ? exactMappingKey : flexibleMappingKey
        });
      } else if (mappings.learnedVariableMappings && mappings.learnedVariableMappings[originalVariable]) {
        // FALLBACK: Apply learned variable mappings if no user mapping exists
        const mappedName = mappings.learnedVariableMappings[originalVariable];
        console.log('🔍 Applied learned variable mapping:', originalVariable, '->', mappedName);
        variable = mappedName;
      }
      
      // Enhanced logging for MGMA
      if (survey.name && survey.name.toLowerCase().includes('mgma') && 
          (originalVariable.toLowerCase().includes('compensation') || originalVariable.toLowerCase().includes('rvu') || originalVariable.toLowerCase().includes('ratio'))) {
        console.log('🔍 MGMA Dynamic Processing:', {
          surveyName: survey.name,
          originalVariable,
          mappedVariable: variable,
          hasUserMapping: !!standardizedNameFromMapping,
          hasLearnedMapping: !!mappings.learnedVariableMappings?.[originalVariable],
          exactKey: exactMappingKey,
          flexibleKey: flexibleMappingKey,
          normalizedVarName: normalizeVariableName(variable)
        });
      }
      
      // CRITICAL DEBUG: Enhanced logging for SullivanCotter APP
      const isSullivanCotterAPP = (survey.name && survey.name.toLowerCase().includes('sullivan') && survey.providerType === 'APP') ||
                                   (surveySource && surveySource.toLowerCase().includes('sullivancotter app'));
      if (isSullivanCotterAPP) {
        console.log('🔍 SullivanCotter APP Dynamic Processing:', {
          surveyId: survey.id,
          surveyName: survey.name,
          surveyType: survey.type,
          surveySource: surveySource,
          providerType: survey.providerType,
          dataCategory: (survey as any).dataCategory,
          source: (survey as any).source,
          hasVariableField,
          variableFieldKey,
          originalVariable,
          mappedVariable: variable,
          hasUserMapping: !!standardizedNameFromMapping,
          hasLearnedMapping: !!mappings.learnedVariableMappings?.[originalVariable],
          exactKey: exactMappingKey,
          flexibleKey: flexibleMappingKey,
          normalizedVarName: normalizeVariableName(variable),
          p25: actualRowData.p25 || actualRowData['P25'] || actualRowData['25th%'] || 'NOT FOUND',
          p50: actualRowData.p50 || actualRowData['P50'] || actualRowData['50th%'] || actualRowData['Median'] || 'NOT FOUND',
          p75: actualRowData.p75 || actualRowData['P75'] || actualRowData['75th%'] || 'NOT FOUND',
          p90: actualRowData.p90 || actualRowData['P90'] || actualRowData['90th%'] || 'NOT FOUND',
          allKeys: Object.keys(actualRowData).slice(0, 20),
          n_orgs,
          n_incumbents
        });
      }
      
      const normalizedVarName = normalizeVariableName(variable);
      
      // CRITICAL FIX: Always process ALL variables during normalization
      // Filtering by selectedVariables should only happen at DISPLAY time, not during data processing
      // This ensures all variables are available when user changes their selection
      const shouldProcess = true; // Always process - don't filter during normalization
      
      if (shouldProcess) {
        // Extract percentiles with fallback to handle column name variations
        // Handles mapped column names like "25th%", "p25", etc.
        const p25 = this.extractNumber(
          actualRowData.p25 || actualRowData['25th%'] || actualRowData['25th'] || 
          actualRowData['P25'] || actualRowData['p25'] || 0
        );
        const p50 = this.extractNumber(
          actualRowData.p50 || actualRowData['50th%'] || actualRowData['50th'] || 
          actualRowData['P50'] || actualRowData['p50'] || actualRowData['Median'] || 0
        );
        const p75 = this.extractNumber(
          actualRowData.p75 || actualRowData['75th%'] || actualRowData['75th'] || 
          actualRowData['P75'] || actualRowData['p75'] || 0
        );
        const p90 = this.extractNumber(
          actualRowData.p90 || actualRowData['90th%'] || actualRowData['90th'] || 
          actualRowData['P90'] || actualRowData['p90'] || 0
        );
        
        variables[normalizedVarName] = {
          variableName: variable,
          n_orgs,
          n_incumbents,
          p25,
          p50,
          p75,
          p90
        };
        
        // CRITICAL DEBUG: Log when TCC variable is processed for SullivanCotter APP
        if (isSullivanCotterAPP && (normalizedVarName === 'tcc' || originalVariable.toLowerCase().includes('tcc') || originalVariable.toLowerCase().includes('total cash'))) {
          console.log('✅ SullivanCotter APP TCC Variable Processed:', {
            surveySource: surveySource,
            originalVariable,
            normalizedVarName,
            metrics: {
              n_orgs,
              n_incumbents,
              p25,
              p50,
              p75,
              p90
            },
            storedInVariables: variables[normalizedVarName] ? 'YES' : 'NO'
          });
        }
        
        // Enhanced logging for Call Pay variables (suppressed to reduce noise)
        const isCallPayVariable = normalizedVarName === 'on_call_compensation' || 
                                  normalizedVarName.includes('on_call') || 
                                  normalizedVarName.includes('oncall');
        // FIXED: Check for Call Pay using dataCategory OR old providerType for backward compatibility
        const isCallPaySurvey = (survey as any).dataCategory === 'CALL_PAY' || 
                                survey.providerType === 'CALL' ||
                                (survey.name && survey.name.toLowerCase().includes('call pay'));
        
        // ENTERPRISE DEBUG: Comprehensive logging for Call Pay variable normalization (suppressed to reduce noise)
        // Removed verbose logging
        if (false && (isCallPayVariable || (isCallPaySurvey && (originalVariable.toLowerCase().includes('on') && originalVariable.toLowerCase().includes('call'))))) {
          console.log('🔍 Call Pay variable extracted in normalizeRowDynamic:', {
            surveyId: survey.id,
            surveyName: survey.name,
            surveySource: surveySource,
            dataCategory: (survey as any).dataCategory,
            providerType: survey.providerType,
            specialty: normalizedSpecialty,
            originalVariable,
            mappedVariable: variable,
            normalizedVarName,
            hasUserMapping: !!standardizedNameFromMapping,
            hasLearnedMapping: !!mappings.learnedVariableMappings?.[originalVariable],
            n_orgs,
            n_incumbents,
            p25,
            p50,
            p75,
            p90,
            hasP25: !!actualRowData.p25 || !!actualRowData['25th%'],
            hasP50: !!actualRowData.p50 || !!actualRowData['50th%'],
            rowKeys: Object.keys(actualRowData).slice(0, 10),
            variableStoredWithKey: normalizedVarName,
            willBeStoredInVariables: {
              [normalizedVarName]: {
                variableName: variable,
                n_orgs,
                n_incumbents,
                p25,
                p50,
                p75,
                p90
              }
            }
          });
          
          // CRITICAL: Verify the key that will be used for storage
          if (normalizedVarName !== 'on_call_compensation') {
            console.warn('⚠️ Call Pay variable normalized to unexpected key:', {
              expected: 'on_call_compensation',
              actual: normalizedVarName,
              originalVariable,
              mappedVariable: variable
            });
          }
        }
      }
    } else {
      // WIDE FORMAT: Data has separate columns for each variable
      // DESIGN RULE (see docs/issues/BENCHMARKING_WIDE_FORMAT_ASTERISK_FIX.md):
      // - Store variable if ANY percentile is defined (including 0). Never require p50 > 0 for storage.
      // - Use flexible column pattern; missing/zero handling is display-only (***), not storage.
      // ENTERPRISE FIX: More flexible pattern to handle variations:
      // - "tcc_p50" (standard)
      // - "Total Cash Compensation_p50" (with spaces in variable name)
      // - "Total Cash Compensation p50" (space instead of underscore)
      // - "tcc_p50", "tcc P50", "TCC_p50" (case variations)
      const percentilePattern = /^(.+?)[_\s]+(p25|p50|p75|p90|25th|50th|75th|90th|25th%|50th%|75th%|90th%)$/i;
      const variableMap = new Map<string, { p25?: number; p50?: number; p75?: number; p90?: number }>();
      
      // Scan all columns for percentile patterns
      const isSullivanCotterAPP = (survey.name && survey.name.toLowerCase().includes('sullivan') && survey.providerType === 'APP') ||
                                 ((survey as any).source === 'SullivanCotter' && survey.providerType === 'APP');
      
      Object.entries(actualRowData).forEach(([key, value]) => {
        const match = key.match(percentilePattern);
        if (match) {
          const [, varName, percentile] = match;
          // CRITICAL: normalizeVariableName already maps to standard names (e.g., "Total Cash Compensation" -> "tcc")
          const normalizedVarName = normalizeVariableName(varName);
          const numValue = this.extractNumber(value);
          
          // CRITICAL DEBUG: Log TCC-related columns for Sullivan Cotter APP
          if (isSullivanCotterAPP && (varName.toLowerCase().includes('tcc') || 
                                     varName.toLowerCase().includes('total') && varName.toLowerCase().includes('cash') ||
                                     (varName.toLowerCase().includes('compensation') && !varName.toLowerCase().includes('per') && !varName.toLowerCase().includes('to')))) {
            console.log('🔍 SullivanCotter APP WIDE Format Column Found:', {
              originalColumn: key,
              extractedVarName: varName,
              normalizedVarName,
              percentile,
              value,
              extractedNumber: numValue
            });
          }
          
          if (!variableMap.has(normalizedVarName)) {
            variableMap.set(normalizedVarName, {});
          }
          
          const varData = variableMap.get(normalizedVarName)!;
          // Handle percentile variations: p25, 25th, 25th%, etc.
          const percentileLower = percentile.toLowerCase().replace(/%/g, '').replace('th', '');
          if (percentileLower === 'p25' || percentileLower === '25') varData.p25 = numValue;
          else if (percentileLower === 'p50' || percentileLower === '50') varData.p50 = numValue;
          else if (percentileLower === 'p75' || percentileLower === '75') varData.p75 = numValue;
          else if (percentileLower === 'p90' || percentileLower === '90') varData.p90 = numValue;
        } else if (isSullivanCotterAPP && (key.toLowerCase().includes('tcc') || 
                                          (key.toLowerCase().includes('total') && key.toLowerCase().includes('cash')))) {
          // Log columns that might be TCC but don't match the pattern
          console.warn('⚠️ SullivanCotter APP Column Found But No Pattern Match:', {
            column: key,
            value,
            reason: 'Column name does not match percentile pattern (e.g., "tcc_p50")'
          });
        }
      });
      
      // Process discovered variables
      variableMap.forEach((varData, normalizedVarName) => {
        // CRITICAL FIX: Always process ALL variables during normalization
        // Filtering by selectedVariables should only happen at DISPLAY time, not during data processing
        const shouldProcess = true; // Always process - don't filter during normalization
        
        // CRITICAL DEBUG: Check if this is Sullivan Cotter APP TCC variable (for logging)
        const isSullivanCotterAPP = (survey.name && survey.name.toLowerCase().includes('sullivan') && survey.providerType === 'APP') ||
                                   ((survey as any).source === 'SullivanCotter' && survey.providerType === 'APP');
        const isTCCVariable = normalizedVarName === 'tcc' || 
                             normalizedVarName.includes('total_cash') ||
                             (normalizedVarName.includes('compensation') && !normalizedVarName.includes('per') && !normalizedVarName.includes('to'));
        
        // ENTERPRISE RULE: Store if ANY percentile present (including 0). Do NOT require p50 > 0.
        // See docs/issues/BENCHMARKING_WIDE_FORMAT_ASTERISK_FIX.md
        const hasAnyValue = varData.p25 !== undefined && varData.p25 !== null ||
                           varData.p50 !== undefined && varData.p50 !== null ||
                           varData.p75 !== undefined && varData.p75 !== null ||
                           varData.p90 !== undefined && varData.p90 !== null;
        
        if (shouldProcess && hasAnyValue) {
          if (isSullivanCotterAPP && isTCCVariable) {
            console.log('✅ SullivanCotter APP WIDE Format TCC Variable Processed:', {
              surveyName: survey.name,
              surveySource: (survey as any).source,
              providerType: survey.providerType,
              normalizedVarName,
              varData,
              willBeStored: true
            });
          }
          
          variables[normalizedVarName] = {
            variableName: this.formatVariableDisplayName(normalizedVarName),
            n_orgs,
            n_incumbents,
            p25: varData.p25 || 0,
            p50: varData.p50 || 0,
            p75: varData.p75 || 0,
            p90: varData.p90 || 0
          };
        } else if (isSullivanCotterAPP && isTCCVariable) {
          // Log why TCC variable wasn't stored
          console.warn('⚠️ SullivanCotter APP TCC Variable NOT Stored:', {
            surveyName: survey.name,
            normalizedVarName,
            varData,
            reason: 'No percentile values found or all are null/undefined'
          });
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
    
    // NEW: Use survey.source and survey.dataCategory if available (new architecture)
    // Fallback to old logic for backward compatibility
    let finalSurveySource: string;
    if ((survey as any).source && (survey as any).dataCategory) {
      // New architecture: Construct surveySource from source + dataCategory
      const source = (survey as any).source;
      const dataCategory = (survey as any).dataCategory;
      const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay' 
        : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
        : dataCategory === 'COMPENSATION' ? (survey.providerType === 'APP' ? 'APP' : 'Physician')
        : dataCategory;
      finalSurveySource = `${source} ${categoryDisplay}`;
    } else {
      // Backward compatibility: Use old logic
      // ENTERPRISE FIX: Use survey.name if it includes "Call Pay" to ensure proper distinction
      finalSurveySource = (survey.providerType === 'CALL' && survey.name && survey.name.includes('Call Pay')) 
        ? survey.name 
        : (survey.type || survey.name || 'Unknown');
    }
    
    // Removed verbose Call Pay logging - keeping normalization logic clean
    
    // CRITICAL FIX: Ensure dataCategory is set correctly, especially for Call Pay surveys
    // If survey doesn't have dataCategory but it's a Call Pay survey, infer it
    let rowDataCategory = (survey as any).dataCategory;
    if (!rowDataCategory) {
      // Infer from survey properties for backward compatibility
      if ((survey.providerType === 'CALL') || 
          (survey.name && survey.name.toLowerCase().includes('call pay')) ||
          (finalSurveySource && finalSurveySource.toLowerCase().includes('call pay'))) {
        rowDataCategory = 'CALL_PAY';
      } else if (survey.name && survey.name.toLowerCase().includes('moonlighting')) {
        rowDataCategory = 'MOONLIGHTING';
      } else {
        rowDataCategory = 'COMPENSATION'; // Default
      }
    }
    
    // Removed verbose logging - keeping normalization logic clean
    
    return {
      specialty: rawSpecialty, // Original specialty name from survey
      standardizedSpecialty: normalizedSpecialty, // Mapped standardized specialty name
      providerType: normalizedProviderType,
      region: normalizedRegion,
      surveySource: finalSurveySource,
      surveyYear: survey.year?.toString() || 'Unknown',
      // NEW: Include dataCategory if available from survey, with fallback inference
      dataCategory: rowDataCategory,
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
      
      // CRITICAL FIX: Ensure dataCategory is set on aggregated record
      // Use firstRow.dataCategory, but fallback to inference if missing
      let aggregatedDataCategory = firstRow.dataCategory;
      if (!aggregatedDataCategory) {
        // Infer from surveySource for backward compatibility
        const surveySource = firstRow.surveySource || '';
        if (surveySource.toLowerCase().includes('call pay')) {
          aggregatedDataCategory = 'CALL_PAY';
        } else if (surveySource.toLowerCase().includes('moonlighting')) {
          aggregatedDataCategory = 'MOONLIGHTING';
        } else {
          aggregatedDataCategory = 'COMPENSATION'; // Default
        }
      }
      
      // Initialize aggregated record - each group now represents a single survey
      const aggregatedRecord: DynamicAggregatedData = {
        standardizedName: firstRow.standardizedSpecialty, // Mapped standardized specialty name
        surveySource: firstRow.surveySource, // Individual survey source, not combined
        surveySpecialty: firstRow.specialty, // Original specialty name from THIS survey
        originalSpecialty: firstRow.specialty, // Same as surveySpecialty for consistency
        geographicRegion: firstRow.region,
        providerType: firstRow.providerType,
        surveyYear: firstRow.surveyYear, // Individual survey year
        dataCategory: aggregatedDataCategory, // NEW: Include dataCategory from normalized row with fallback
        variables: {}
      };
      
      // Aggregate variables from all rows (weighted by n_incumbents)
      const variableMap = new Map<string, VariableMetrics[]>();
      
      // Removed verbose logging - keeping aggregation logic clean
      
      rows.forEach(row => {
        
        Object.entries(row.variables || {}).forEach(([varName, metrics]) => {
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
          
          // Removed verbose logging - keeping aggregation logic clean
        }
      });
      
      // Removed verbose logging - keeping aggregation logic clean
      
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
      'total_encounters': 'Total Encounters',
      'on_call_compensation': 'Daily Rate On-Call Compensation',
      'oncall_compensation': 'Daily Rate On-Call Compensation',
      'daily_rate_on_call': 'Daily Rate On-Call Compensation'
    };
    
    return displayMap[normalizedName] || normalizedName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Export singleton instance
export const analyticsDataService = new AnalyticsDataService();
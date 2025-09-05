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

export class AnalyticsDataService {
  private dataService = getDataService();

  /**
   * Get all analytics data with proper normalization
   */
  async getAnalyticsData(filters: AnalyticsFilters = {}): Promise<AggregatedData[]> {
    try {
      console.log('🔍 AnalyticsDataService: Starting data retrieval with filters:', filters);
      
      // Get all surveys and mappings
      const surveys = await this.dataService.getAllSurveys();
      const specialtyMappings = await this.dataService.getAllSpecialtyMappings();
      const columnMappings = await this.dataService.getAllColumnMappings();
      
      console.log(`🔍 AnalyticsDataService: Found ${surveys.length} surveys, ${specialtyMappings.length} specialty mappings, ${columnMappings.length} column mappings`);
      
      // Process each survey and normalize data
      const allNormalizedRows: NormalizedRow[] = [];
      
      for (const survey of surveys) {
        console.log(`🔍 AnalyticsDataService: Processing survey: ${survey.name} (${survey.type})`);
        
        try {
          // Get survey data with filters applied
          const surveyData = await this.dataService.getSurveyData(survey.id, filters);
          console.log(`🔍 AnalyticsDataService: Survey ${survey.name} returned ${surveyData.rows.length} rows`);
          
          // Normalize each row
          const normalizedRows = surveyData.rows.map(row => 
            this.normalizeRow(row, survey, specialtyMappings, columnMappings)
          );
          
          allNormalizedRows.push(...normalizedRows);
          
        } catch (error) {
          console.error(`🔍 AnalyticsDataService: Error processing survey ${survey.name}:`, error);
        }
      }
      
      console.log(`🔍 AnalyticsDataService: Total normalized rows: ${allNormalizedRows.length}`);
      
      // Stack and aggregate the normalized data
      const aggregatedData = this.stackAndAggregateData(allNormalizedRows, filters);
      
      console.log(`🔍 AnalyticsDataService: Final aggregated records: ${aggregatedData.length}`);
      
      return aggregatedData;
      
    } catch (error) {
      console.error('🔍 AnalyticsDataService: Error in getAnalyticsData:', error);
      throw error;
    }
  }

  /**
   * Normalize a raw survey row using mappings
   */
  private normalizeRow(
    row: RawSurveyRow, 
    survey: any, 
    specialtyMappings: ISpecialtyMapping[], 
    columnMappings: IColumnMapping[]
  ): NormalizedRow {
    // Normalize specialty using specialty mappings
    const normalizedSpecialty = this.normalizeSpecialty(
      row.specialty || row.surveySpecialty || row.normalizedSpecialty || 'Unknown',
      specialtyMappings,
      survey.type
    );
    
    // Normalize provider type
    const normalizedProviderType = this.normalizeProviderType(
      row.provider_type || row.providerType || 'Physician'
    );
    
    // Normalize region
    const normalizedRegion = this.normalizeRegion(
      row.geographic_region || row.region || row.geographicRegion || 'National'
    );
    
    // Normalize compensation metrics using column mappings
    const normalizedMetrics = this.normalizeCompensationMetrics(row, columnMappings);
    
    // Extract organizational data - check both the raw row and the SurveyData interface
    // The organizational data is now stored in the SurveyData interface from IndexedDBService
    const n_orgs = row.n_orgs || row.N_orgs || row.n_org || row.N_org || 0;
    const n_incumbents = row.n_incumbents || row.N_incumbents || row.n_incumbent || row.N_incumbent || 0;
    
    console.log(`🔍 AnalyticsDataService: Extracted organizational data - n_orgs: ${n_orgs}, n_incumbents: ${n_incumbents}`);
    
    return {
      specialty: normalizedSpecialty,
      providerType: normalizedProviderType,
      region: normalizedRegion,
      n_orgs,
      n_incumbents,
      ...normalizedMetrics,
      surveySource: survey.type || survey.name || 'Unknown',
      surveyYear: survey.year?.toString() || 'Unknown',
      rawData: row
    };
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
    
    // Find mapping that includes this specialty
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some(source => 
        source.surveySource === surveySource && 
        source.specialty.toLowerCase() === specialty.toLowerCase()
      );
      
      if (hasSourceSpecialty) {
        return mapping.standardizedName;
      }
    }
    
    // If no mapping found, return original
    return specialty;
  }

  /**
   * Normalize provider type
   */
  private normalizeProviderType(providerType: string): string {
    if (!providerType || providerType === 'Physician') return 'Physician';
    
    const lower = providerType.toLowerCase();
    
    if (lower.includes('physician') || lower.includes('md') || lower.includes('do')) {
      return 'Physician';
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
    
    if (lower.includes('northeast') || lower.includes('ne')) {
      return 'Northeast';
    } else if (lower.includes('southeast') || lower.includes('se')) {
      return 'Southeast';
    } else if (lower.includes('midwest') || lower.includes('north central') || lower.includes('nc')) {
      return 'Midwest';
    } else if (lower.includes('west')) {
      return 'West';
    } else if (lower.includes('national')) {
      return 'National';
    }
    
    return region;
  }

  /**
   * Normalize compensation metrics using column mappings
   */
  private normalizeCompensationMetrics(row: RawSurveyRow, columnMappings: IColumnMapping[]): {
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
  } {
    // For now, use direct column access since column mappings may not be fully implemented
    // This will be enhanced when column mappings are properly set up
    
    return {
      tcc_p25: row.tcc_p25 || 0,
      tcc_p50: row.tcc_p50 || 0,
      tcc_p75: row.tcc_p75 || 0,
      tcc_p90: row.tcc_p90 || 0,
      wrvu_p25: row.wrvu_p25 || 0,
      wrvu_p50: row.wrvu_p50 || 0,
      wrvu_p75: row.wrvu_p75 || 0,
      wrvu_p90: row.wrvu_p90 || 0,
      cf_p25: row.cf_p25 || 0,
      cf_p50: row.cf_p50 || 0,
      cf_p75: row.cf_p75 || 0,
      cf_p90: row.cf_p90 || 0,
    };
  }

  /**
   * Stack and aggregate normalized data
   * This is the key function that ensures each metric section has its own n_orgs/n_incumbents
   */
  private stackAndAggregateData(
    normalizedRows: NormalizedRow[], 
    filters: AnalyticsFilters
  ): AggregatedData[] {
    console.log('🔍 AnalyticsDataService: Starting data stacking and aggregation');
    
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
      
      const firstRow = rows[0];
      
      // Create aggregated record with separate organizational data for each metric section
      const aggregatedRecord: AggregatedData = {
        id: key,
        standardizedName: firstRow.specialty,
        surveySource: firstRow.surveySource as any,
        surveySpecialty: firstRow.specialty,
        geographicRegion: firstRow.region as any,
        providerType: firstRow.providerType as any,
        surveyYear: firstRow.surveyYear,
        
        // TCC metrics with their own n_orgs/n_incumbents
        tcc_n_orgs: this.calculateTccNOrgs(rows),
        tcc_n_incumbents: this.calculateTccNIncumbents(rows),
        tcc_p25: this.calculatePercentile(rows.map(r => r.tcc_p25), 25),
        tcc_p50: this.calculatePercentile(rows.map(r => r.tcc_p50), 50),
        tcc_p75: this.calculatePercentile(rows.map(r => r.tcc_p75), 75),
        tcc_p90: this.calculatePercentile(rows.map(r => r.tcc_p90), 90),
        
        // wRVU metrics with their own n_orgs/n_incumbents
        wrvu_n_orgs: this.calculateWrvuNOrgs(rows),
        wrvu_n_incumbents: this.calculateWrvuNIncumbents(rows),
        wrvu_p25: this.calculatePercentile(rows.map(r => r.wrvu_p25), 25),
        wrvu_p50: this.calculatePercentile(rows.map(r => r.wrvu_p50), 50),
        wrvu_p75: this.calculatePercentile(rows.map(r => r.wrvu_p75), 75),
        wrvu_p90: this.calculatePercentile(rows.map(r => r.wrvu_p90), 90),
        
        // CF metrics with their own n_orgs/n_incumbents
        cf_n_orgs: this.calculateCfNOrgs(rows),
        cf_n_incumbents: this.calculateCfNIncumbents(rows),
        cf_p25: this.calculatePercentile(rows.map(r => r.cf_p25), 25),
        cf_p50: this.calculatePercentile(rows.map(r => r.cf_p50), 50),
        cf_p75: this.calculatePercentile(rows.map(r => r.cf_p75), 75),
        cf_p90: this.calculatePercentile(rows.map(r => r.cf_p90), 90),
        
        // Legacy fields for backward compatibility
        n_orgs: this.calculateTccNOrgs(rows),
        n_incumbents: this.calculateTccNIncumbents(rows),
        
        rawData: { rows, key }
      };
      
      aggregatedData.push(aggregatedRecord);
    });
    
    console.log(`🔍 AnalyticsDataService: Created ${aggregatedData.length} aggregated records`);
    
    return aggregatedData;
  }

  /**
   * Calculate n_orgs for TCC metrics
   */
  private calculateTccNOrgs(rows: NormalizedRow[]): number {
    // Sum n_orgs for rows that have TCC data
    const tccRows = rows.filter(r => r.tcc_p50 > 0);
    return tccRows.reduce((sum, r) => sum + (r.n_orgs || 0), 0);
  }

  /**
   * Calculate n_incumbents for TCC metrics
   */
  private calculateTccNIncumbents(rows: NormalizedRow[]): number {
    // Sum n_incumbents for rows that have TCC data
    const tccRows = rows.filter(r => r.tcc_p50 > 0);
    return tccRows.reduce((sum, r) => sum + (r.n_incumbents || 0), 0);
  }

  /**
   * Calculate n_orgs for wRVU metrics
   */
  private calculateWrvuNOrgs(rows: NormalizedRow[]): number {
    // Sum n_orgs for rows that have wRVU data
    const wrvuRows = rows.filter(r => r.wrvu_p50 > 0);
    return wrvuRows.reduce((sum, r) => sum + (r.n_orgs || 0), 0);
  }

  /**
   * Calculate n_incumbents for wRVU metrics
   */
  private calculateWrvuNIncumbents(rows: NormalizedRow[]): number {
    // Sum n_incumbents for rows that have wRVU data
    const wrvuRows = rows.filter(r => r.wrvu_p50 > 0);
    return wrvuRows.reduce((sum, r) => sum + (r.n_incumbents || 0), 0);
  }

  /**
   * Calculate n_orgs for CF metrics
   */
  private calculateCfNOrgs(rows: NormalizedRow[]): number {
    // Sum n_orgs for rows that have CF data
    const cfRows = rows.filter(r => r.cf_p50 > 0);
    return cfRows.reduce((sum, r) => sum + (r.n_orgs || 0), 0);
  }

  /**
   * Calculate n_incumbents for CF metrics
   */
  private calculateCfNIncumbents(rows: NormalizedRow[]): number {
    // Sum n_incumbents for rows that have CF data
    const cfRows = rows.filter(r => r.cf_p50 > 0);
    return cfRows.reduce((sum, r) => sum + (r.n_incumbents || 0), 0);
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const validValues = values.filter(v => v > 0 && !isNaN(v));
    if (validValues.length === 0) return 0;
    
    const sorted = validValues.sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index] || 0;
  }
}

// Export singleton instance
export const analyticsDataService = new AnalyticsDataService();

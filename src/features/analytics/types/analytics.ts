/**
 * Analytics Feature - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the analytics feature.
 * Following enterprise patterns for type safety and maintainability.
 */

/**
 * Variable mapping interface for analytics data
 */
export interface VariableMapping {
  id: string;
  standardizedName: string;
  variableType: 'compensation' | 'categorical';
  variableSubType: string;
  sourceVariables: Array<{
    surveySource: string;
    originalVariableName: string;
    frequency?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregated analytics data structure
 * Each metric section (TCC, wRVU, CF) has independent organizational data
 */
export interface AggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;
  originalSpecialty: string; // Original specialty name from the survey source
  geographicRegion: string;
  providerType?: string;
  surveyYear?: string;
  
  // TCC (Total Cash Compensation) metrics with independent organizational data
  tcc_n_orgs: number;
  tcc_n_incumbents: number;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  
  // wRVU (Productivity - wRVUs) metrics with independent organizational data
  wrvu_n_orgs: number;
  wrvu_n_incumbents: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  
  // CF (Conversion Factors) metrics with independent organizational data
  cf_n_orgs: number;
  cf_n_incumbents: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
}

/**
 * Individual year in a multi-year blend
 */
export interface YearBlendItem {
  year: string;
  percentage: number; // Percentage weight (0-100)
  weight: number;     // Alternative weight (e.g., sample size)
  sampleSize?: number; // Sample size for this year
  surveyCount?: number; // Number of surveys in this year
}

/**
 * Multi-year blending configuration
 */
export interface YearBlendingConfig {
  years: YearBlendItem[];
  method: 'percentage' | 'weighted' | 'equal';
  totalPercentage: number; // Must equal 100 for percentage method
}

/**
 * Analytics filter state
 */
export interface AnalyticsFilters {
  specialty: string;
  surveySource: string;
  geographicRegion: string;
  providerType: string;
  year: string; // Single year selection (legacy/simple mode)
  
  // Multi-year blending
  useMultiYearBlending?: boolean;
  multiYearBlending?: YearBlendingConfig;
}

/**
 * Summary calculation result
 */
export interface SummaryCalculation {
  simple: {
    tcc_n_orgs: number;
    tcc_n_incumbents: number;
    tcc_p25: number;
    tcc_p50: number;
    tcc_p75: number;
    tcc_p90: number;
    wrvu_n_orgs: number;
    wrvu_n_incumbents: number;
    wrvu_p25: number;
    wrvu_p50: number;
    wrvu_p75: number;
    wrvu_p90: number;
    cf_n_orgs: number;
    cf_n_incumbents: number;
    cf_p25: number;
    cf_p50: number;
    cf_p75: number;
    cf_p90: number;
  };
  weighted: {
    tcc_n_orgs: number;
    tcc_n_incumbents: number;
    tcc_p25: number;
    tcc_p50: number;
    tcc_p75: number;
    tcc_p90: number;
    wrvu_n_orgs: number;
    wrvu_n_incumbents: number;
    wrvu_p25: number;
    wrvu_p50: number;
    wrvu_p75: number;
    wrvu_p90: number;
    cf_n_orgs: number;
    cf_n_incumbents: number;
    cf_p25: number;
    cf_p50: number;
    cf_p75: number;
    cf_p90: number;
  };
}

/**
 * Analytics component props
 */
export interface AnalyticsTableProps {
  data: AggregatedData[];
  loading: boolean;
  error: string | null;
  onExport: () => void;
}

export interface AnalyticsSummaryProps {
  data: AggregatedData[];
  filters: AnalyticsFilters;
}

export interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  availableSpecialties: string[];
  availableSources: string[];
  availableRegions: string[];
  availableProviderTypes: string[];
  availableYears: string[];
}

/**
 * Blended analytics result with year breakdown
 */
export interface BlendedAnalyticsResult {
  // Final blended data
  blendedData: AggregatedData[];
  
  // Year-level breakdown for transparency
  yearBreakdown: {
    [year: string]: {
      data: AggregatedData[];
      sampleSize: number;
      surveyCount: number;
      contribution: number; // Percentage or weight contribution
    };
  };
  
  // Quality metrics
  confidence: number; // 0-1, based on sample sizes and data quality
  qualityWarnings: string[];
  
  // Metadata
  totalSampleSize: number;
  totalSurveyCount: number;
  yearsIncluded: string[];
  blendingMethod: 'percentage' | 'weighted' | 'equal';
}

/**
 * Analytics hook return type
 */
export interface UseAnalyticsReturn {
  data: AggregatedData[];
  allData: AggregatedData[];
  loading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  refetch: () => Promise<void>;
  exportToExcel: () => void;
  exportToCSV: () => void;
  blendedResult?: BlendedAnalyticsResult | null; // Multi-year blending result
}
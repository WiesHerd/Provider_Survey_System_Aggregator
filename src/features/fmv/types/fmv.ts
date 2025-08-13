import { BaseEntity, SurveySource, ProviderType, GeographicRegion } from '../../../shared/types';

/**
 * FMV Calculator filters for market data
 */
export interface FMVFilters {
  specialty: string;
  providerType: string;
  region: string;
  surveySource: string;
  year: string;
  fte: number;
}

/**
 * Compensation component for TCC calculation
 */
export interface CompensationComponent {
  type: string;
  amount: string;
  notes: string;
}

/**
 * Market data percentiles for different metrics
 */
export interface MarketPercentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/**
 * Complete market data structure
 */
export interface MarketData {
  tcc: MarketPercentiles;
  wrvu: MarketPercentiles;
  cf: MarketPercentiles;
}

/**
 * User percentile rankings
 */
export interface UserPercentiles {
  tcc: number | null;
  wrvu: number | null;
  cf: number | null;
}

/**
 * Comparison type for FMV analysis
 */
export type CompareType = 'TCC' | 'wRVUs' | 'CFs';

/**
 * Unique values available for filters
 */
export interface UniqueFilterValues {
  specialties: string[];
  providerTypes: string[];
  regions: string[];
  surveySources: string[];
  years: string[];
}

/**
 * FMV calculation state
 */
export interface FMVCalculationState {
  filters: FMVFilters;
  compComponents: CompensationComponent[];
  wrvus: string;
  cf: string;
  compareType: CompareType;
  marketData: MarketData | null;
  percentiles: UserPercentiles;
  uniqueValues: UniqueFilterValues;
  loading: boolean;
  error: string | null;
}

/**
 * Normalized survey row for FMV calculations
 */
export interface NormalizedSurveyRow extends BaseEntity {
  providerType: string;
  geographicRegion: string;
  specialty: string;
  normalizedSpecialty: string;
  surveySource: SurveySource;
  year: string;
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
}

/**
 * FMV calculation result
 */
export interface FMVCalculationResult {
  marketData: MarketData;
  percentiles: UserPercentiles;
  filteredRows: NormalizedSurveyRow[];
  totalRecords: number;
}

/**
 * Component props for FMV filters
 */
export interface FMVFiltersProps {
  filters: FMVFilters;
  onFiltersChange: (filters: FMVFilters) => void;
  uniqueValues: UniqueFilterValues;
}

/**
 * Component props for comparison type selector
 */
export interface CompareTypeSelectorProps {
  compareType: CompareType;
  onCompareTypeChange: (type: CompareType) => void;
}

/**
 * Component props for TCC itemization
 */
export interface TCCItemizationProps {
  components: CompensationComponent[];
  onComponentsChange: (components: CompensationComponent[]) => void;
}

/**
 * Component props for WRVUs input
 */
export interface WRVUsInputProps {
  value: string;
  onChange: (value: string) => void;
  fte: number;
}

/**
 * Component props for conversion factor input
 */
export interface CFInputProps {
  value: string;
  onChange: (value: string) => void;
  fte: number;
  percentile?: number | null;
}

/**
 * Component props for results panel
 */
export interface ResultsPanelProps {
  compareType: CompareType;
  marketData: MarketData | null;
  percentiles: UserPercentiles;
  inputValue: string | number;
  rawValue: number;
  fte: number;
  onResetFilters?: () => void;
}

/**
 * Component props for main FMV calculator
 */
export interface FMVCalculatorProps {
  onPrint?: () => void;
}

/**
 * FMV calculation parameters
 */
export interface FMVCalculationParams {
  filters: FMVFilters;
  tcc: number;
  wrvus: number;
  cf: number;
  compareType: CompareType;
}

/**
 * FMV export configuration
 */
export interface FMVExportConfig {
  includeCharts: boolean;
  includeRawData: boolean;
  format: 'pdf' | 'docx' | 'xlsx';
  filename: string;
}

/**
 * FMV API response
 */
export interface FMVApiResponse {
  success: boolean;
  data?: FMVCalculationResult;
  error?: string;
  metadata?: {
    calculationTime: number;
    dataSource: string;
    lastUpdated: string;
  };
}

/**
 * FMV validation result
 */
export interface FMVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * FMV calculation options
 */
export interface FMVCalculationOptions {
  useFTEAdjustment: boolean;
  includeOutliers: boolean;
  confidenceLevel: number;
  interpolationMethod: 'linear' | 'cubic';
}

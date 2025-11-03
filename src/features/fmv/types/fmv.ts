import { BaseEntity, SurveySource } from '../../../shared/types';

/**
 * Aggregation method for multiple surveys
 */
export type AggregationMethod = 'simple' | 'weighted' | 'pure';

/**
 * Specialty blending configuration for multi-specialty FMV calculations
 */
export interface SpecialtyBlendingConfig {
  specialties: SpecialtyBlendItem[];
  blendingMethod: 'percentage' | 'weighted';
  totalPercentage: number; // Must equal 100 for percentage method
}

/**
 * Individual specialty in a blended calculation
 */
export interface SpecialtyBlendItem {
  specialty: string;
  percentage: number; // For percentage-based blending (0-100)
  weight: number;     // For weighted blending (sample size, etc.)
  sampleSize?: number; // Optional: track sample size for quality assessment
}

/**
 * Blended market data result
 */
export interface BlendedMarketData {
  specialties: SpecialtyBlendingConfig;
  blendedPercentiles: {
    tcc: MarketPercentiles;
    wrvu: MarketPercentiles;
    cf: MarketPercentiles;
    callPay?: MarketPercentiles;
  };
  sourceData: {
    [specialty: string]: MarketData;
  };
  confidence: number; // 0-1, based on sample sizes and data quality
  totalSampleSize: number;
  qualityWarnings: string[];
}

/**
 * Call Pay adjustment factors for market data or user input
 */
export interface CallPayAdjustments {
  weekendPremium: number; // 0-100 percentage (e.g., 50 = 1.5x)
  majorHolidayPremium: number; // 0-200 percentage (e.g., 100 = 2x)
  highValueHolidayPremium: number; // 0-300 percentage (e.g., 200 = 3x)
  frequencyMultiplier: number; // 0-50 percentage (e.g., 25 = 1.25x)
  acuityMultiplier: number; // 0-50 percentage (e.g., 20 = 1.2x)
  applyToMarketData: boolean; // If true, adjusts market data; if false, adjusts user input
}

/**
 * FMV Calculator filters for market data
 */
export interface FMVFilters {
  specialty: string;
  providerType: string;
  region: string;
  surveySource: string;
  year: string;
  fte: number; // Keep FTE in filters for now since it's used in calculations
  aggregationMethod: AggregationMethod; // Method for aggregating multiple surveys
  useSpecialtyBlending: boolean; // Toggle between single specialty and blended specialties
  specialtyBlending?: SpecialtyBlendingConfig; // Configuration for specialty blending
  callPayAdjustments?: CallPayAdjustments; // Call Pay adjustment factors
}

/**
 * Saved FMV calculation for a specific provider
 */
export interface SavedFMVCalculation extends BaseEntity {
  providerName: string;
  filters: FMVFilters;
  compComponents: CompensationComponent[];
  wrvus: string;
  cf: string;
  callPay?: string;
  compareType: CompareType;
  marketData: MarketData;
  percentiles: UserPercentiles;
  calculatedValue: number;
  marketPercentile: number;
  notes?: string;
  created: Date;
  lastModified: Date;
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
  callPay?: MarketPercentiles;
}

/**
 * User percentile rankings
 */
export interface UserPercentiles {
  tcc: number | null;
  wrvu: number | null;
  cf: number | null;
  callPay: number | null;
}

/**
 * Comparison type for FMV analysis
 */
export type CompareType = 'TCC' | 'wRVUs' | 'CFs' | 'CallPay';

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
  // TCC metrics with organizational data
  tcc_n_orgs: number;
  tcc_n_incumbents: number;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  // wRVU metrics with organizational data
  wrvu_n_orgs: number;
  wrvu_n_incumbents: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  // CF metrics with organizational data
  cf_n_orgs: number;
  cf_n_incumbents: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  // Call Pay metrics with organizational data
  callPay_n_orgs?: number;
  callPay_n_incumbents?: number;
  callPay_p25?: number;
  callPay_p50?: number;
  callPay_p75?: number;
  callPay_p90?: number;
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
  fte: number;
  onFTEChange: (fte: number) => void;
}

/**
 * Component props for WRVUs input
 */
export interface WRVUsInputProps {
  value: string;
  onChange: (value: string) => void;
  fte: number;
  onFTEChange: (fte: number) => void;
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
 * Component props for Call Pay input
 */
export interface CallPayInputProps {
  value: string;
  onChange: (value: string) => void;
  fte: number;
  onFTEChange: (fte: number) => void;
  adjustments: CallPayAdjustments;
  onAdjustmentsChange: (adjustments: CallPayAdjustments) => void;
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
  aggregationMethod: AggregationMethod;
  surveyCount?: number;
  isFilteringSpecificSurvey?: boolean;
  onResetFilters?: () => void;
  onAggregationMethodChange?: (method: AggregationMethod) => void;
  callPayAdjustments?: CallPayAdjustments;
  availableCallPaySpecialties?: string[]; // Available specialties with Call Pay data
  availableCallPaySurveySources?: string[]; // Available survey sources with Call Pay data
}

/**
 * Component props for aggregation method selector
 */
export interface AggregationMethodSelectorProps {
  aggregationMethod: AggregationMethod;
  onAggregationMethodChange: (method: AggregationMethod) => void;
  disabled?: boolean;
}

/**
 * Component props for main FMV calculator
 */
export interface FMVCalculatorProps {
  onPrint?: () => void;
}

/**
 * Component props for specialty blending selector
 */
export interface SpecialtyBlendingSelectorProps {
  useBlending: boolean;
  blendingConfig: SpecialtyBlendingConfig | null;
  availableSpecialties: string[];
  onBlendingToggle: (useBlending: boolean) => void;
  onBlendingConfigChange: (config: SpecialtyBlendingConfig) => void;
}

/**
 * Component props for specialty blend item
 */
export interface SpecialtyBlendItemProps {
  item: SpecialtyBlendItem;
  availableSpecialties: string[];
  onItemChange: (item: SpecialtyBlendItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}

/**
 * Component props for blended results panel
 */
export interface BlendedResultsPanelProps {
  blendedData: BlendedMarketData | null;
  compareType: CompareType;
  inputValue: string | number;
  rawValue: number;
  fte: number;
  aggregationMethod: AggregationMethod;
  surveyCount?: number;
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

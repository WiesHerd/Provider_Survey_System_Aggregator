import { BaseEntity, SurveySource, ProviderType, GeographicRegion } from '../../../shared/types';

/**
 * Regional data structure for comparison tables
 * LEGACY: Kept for backward compatibility
 */
export interface RegionalData {
  region: string;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  wrvus_p25: number;
  wrvus_p50: number;
  wrvus_p75: number;
  wrvus_p90: number;
}

/**
 * Variable-specific percentile data
 */
export interface VariablePercentileData {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/**
 * Variable-aware regional data structure
 * Supports any variable dynamically
 */
export interface VariableRegionalData {
  region: string;
  variables: Record<string, VariablePercentileData>;
}

/**
 * Regional filters for data filtering
 */
export interface RegionalFilters {
  specialty?: string;
  providerType?: ProviderType;
  region?: GeographicRegion;
  surveySource?: SurveySource;
  year?: string;
}

/**
 * Regional analytics summary statistics
 */
export interface RegionalSummary {
  totalRegions: number;
  totalRecords: number;
  averageTCC: number;
  averageCF: number;
  averageWRVUs: number;
  regionWithHighestTCC: string;
  regionWithLowestTCC: string;
  dataDiversity: number;
}

/**
 * Regional chart data for visualizations
 */
export interface RegionalChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }[];
}

/**
 * Regional table configuration
 */
export interface RegionalTableConfig {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  sorting?: {
    column: keyof RegionalData;
    direction: 'asc' | 'desc';
  };
  filters: RegionalFilters;
}

/**
 * Regional table row data
 */
export interface RegionalTableRow extends RegionalData {
  isSelected?: boolean;
  isHighlighted?: boolean;
}

/**
 * Regional table column definition
 */
export interface RegionalTableColumn {
  key: keyof RegionalData;
  label: string;
  sortable: boolean;
  filterable: boolean;
  width?: number;
  format?: (value: any) => string;
}

/**
 * Regional map data for geographic visualization
 */
export interface RegionalMapData {
  region: string;
  value: number;
  color: string;
  tooltip: string;
}

/**
 * Regional calculation parameters
 */
export interface RegionalCalculationParams {
  data: any[];
  filters: RegionalFilters;
  regions: string[];
  metrics: string[];
}

/**
 * Regional calculation result
 */
export interface RegionalCalculationResult {
  regionalData: RegionalData[];
  summary: RegionalSummary;
  chartData: RegionalChartData;
  mapData: RegionalMapData[];
}

/**
 * Regional API response
 */
export interface RegionalApiResponse {
  data: RegionalData[];
  summary: RegionalSummary;
  total: number;
  page: number;
  pageSize: number;
  filters: RegionalFilters;
}

/**
 * Regional validation result
 */
export interface RegionalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Regional export configuration
 */
export interface RegionalExportConfig {
  format: 'csv' | 'excel' | 'pdf';
  includeSummary: boolean;
  includeCharts: boolean;
  filename?: string;
}

/**
 * Component Props
 */
export interface RegionalAnalyticsProps {
  initialFilters?: RegionalFilters;
  onDataChange?: (data: RegionalData[]) => void;
  onFiltersChange?: (filters: RegionalFilters) => void;
  onSummaryChange?: (summary: RegionalSummary) => void;
  className?: string;
}

export interface RegionalFiltersProps {
  filters: RegionalFilters;
  onFiltersChange: (filters: RegionalFilters) => void;
  onClearFilters: () => void;
  availableOptions: {
    specialties: string[];
    providerTypes: ProviderType[];
    regions: GeographicRegion[];
    surveySources: SurveySource[];
    years: string[];
  };
  loading?: boolean;
}

export interface RegionalComparisonProps {
  data: RegionalData[] | VariableRegionalData[];
  selectedVariables?: string[]; // Variable names to display (e.g., ['tcc', 'tcc_per_work_rvu', 'work_rvus'])
  variableMetadata?: Record<string, { label: string; format: (value: number) => string }>; // Variable display metadata
  onRegionClick?: (region: string) => void;
  onMetricClick?: (metric: string, region: string) => void;
  // Optional provenance support
  regionTooltips?: Record<string, string>;
  onRegionInfoClick?: (region: string) => void;
  className?: string;
}

export interface RegionalMapProps {
  data: RegionalMapData[];
  onRegionClick?: (region: string) => void;
  height?: number;
  width?: number;
  className?: string;
}

export interface RegionalSummaryProps {
  summary: RegionalSummary;
  className?: string;
}

export interface RegionalTableProps {
  data: RegionalData[];
  config: RegionalTableConfig;
  onSort: (column: keyof RegionalData, direction: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (row: RegionalTableRow) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Regional calculation options
 */
export interface RegionalCalculationOptions {
  includeNational: boolean;
  includeRegions: string[];
  metrics: string[];
  percentiles: number[];
  aggregationMethod: 'average' | 'median' | 'weighted';
}

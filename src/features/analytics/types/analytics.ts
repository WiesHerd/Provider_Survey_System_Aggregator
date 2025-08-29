/**
 * Analytics feature type definitions
 * These types are specific to the analytics feature and extend shared types
 */

import { BaseEntity, SurveySource, ProviderType, GeographicRegion, CompensationMetrics } from '@/shared/types';

/**
 * Aggregated survey data for analytics display
 */
export interface AggregatedData extends BaseEntity, CompensationMetrics {
  standardizedName: string;
  surveySource: SurveySource;
  surveySpecialty: string;
  geographicRegion: GeographicRegion;
  providerType: ProviderType;
  n_orgs: number;
  n_incumbents: number;
  surveyYear: string;
  
  // Normalized data fields
  variable: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  
  rawData?: Record<string, any>;
}

/**
 * Analytics filters for data filtering
 */
export interface AnalyticsFilters {
  specialty?: string;
  providerType?: ProviderType;
  region?: GeographicRegion;
  surveySource?: SurveySource;
  year?: string;
  variable?: string;
  search?: string;
}

/**
 * Analytics table row data
 */
export interface AnalyticsTableRow extends AggregatedData {
  // Additional properties specific to table display
  isSelected?: boolean;
  isHighlighted?: boolean;
}

/**
 * Analytics summary statistics
 */
export interface AnalyticsSummary {
  totalRecords: number;
  totalOrganizations: number;
  totalIncumbents: number;
  averageTccP50: number;
  averageWrvuP50: number;
  averageCfP50: number;
  specialtiesCount: number;
  sourcesCount: number;
  regionsCount: number;
}

/**
 * Chart data for analytics visualizations
 */
export interface AnalyticsChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }>;
}

/**
 * Analytics table column definition
 */
export interface AnalyticsTableColumn {
  key: keyof AggregatedData;
  label: string;
  type: 'string' | 'number' | 'currency' | 'percentage';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

/**
 * Analytics table configuration
 */
export interface AnalyticsTableConfig {
  columns: AnalyticsTableColumn[];
  data: AnalyticsTableRow[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  sorting?: {
    column: keyof AggregatedData;
    direction: 'asc' | 'desc';
  };
  filters?: AnalyticsFilters;
}

/**
 * Analytics component props
 */
export interface AnalyticsProps {
  initialFilters?: AnalyticsFilters;
  onDataChange?: (data: AggregatedData[]) => void;
  onFiltersChange?: (filters: AnalyticsFilters) => void;
}

/**
 * Analytics table component props
 */
export interface AnalyticsTableProps {
  data: AnalyticsTableRow[];
  config: AnalyticsTableConfig;
  onRowClick?: (row: AnalyticsTableRow) => void;
  onSort?: (column: keyof AggregatedData, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: AnalyticsFilters) => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * Analytics filters component props
 */
export interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onClearFilters: () => void;
  availableOptions: {
    specialties: string[];
    providerTypes: ProviderType[];
    regions: GeographicRegion[];
    surveySources: SurveySource[];
    years: string[];
    variables: string[];
  };
}

/**
 * Analytics charts component props
 */
export interface AnalyticsChartsProps {
  data: AggregatedData[];
  filters: AnalyticsFilters;
  onChartClick?: (chartData: any) => void;
}

/**
 * Analytics summary component props
 */
export interface AnalyticsSummaryProps {
  data: AggregatedData[];
  filters: AnalyticsFilters;
}

/**
 * Analytics data transformation result
 */
export interface DataTransformationResult {
  transformedData: AggregatedData[];
  summary: AnalyticsSummary;
  chartData: AnalyticsChartData;
  errors: string[];
  warnings: string[];
}

/**
 * Analytics export configuration
 */
export interface AnalyticsExportConfig {
  format: 'csv' | 'excel' | 'pdf';
  filename?: string;
  includeFilters?: boolean;
  includeSummary?: boolean;
  columns?: (keyof AggregatedData)[];
}

/**
 * Analytics API response
 */
export interface AnalyticsApiResponse {
  data: AggregatedData[];
  summary: AnalyticsSummary;
  total: number;
  page: number;
  pageSize: number;
  filters: AnalyticsFilters;
}

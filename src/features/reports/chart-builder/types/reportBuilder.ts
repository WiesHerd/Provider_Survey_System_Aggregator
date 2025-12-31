/**
 * Type definitions for Chart Builder feature
 * 
 * Extracted from CustomReports.tsx for maintainability
 */

import { ISurveyRow } from '../../../../types/survey';

/**
 * Report configuration interface
 */
export interface ReportConfig {
  id: string;
  name: string;
  dimension: string;
  secondaryDimension?: string | null;
  metric: string;
  metrics: string[];
  chartType: 'bar' | 'line' | 'pie';
  filters: ReportFilters;
  created: Date;
}

/**
 * Report configuration without id and created date (for editing)
 */
export type ReportConfigInput = Omit<ReportConfig, 'id' | 'created'>;

/**
 * Report filters
 */
export interface ReportFilters {
  specialties: string[];
  regions: string[];
  surveySources: string[];
  providerTypes: string[];
  years: string[];
}

/**
 * Chart data item for rendering
 */
export interface ChartDataItem {
  name: string;
  value: number;
  count: number;
  originalName: string;
  metrics?: string[];
  metricValues?: Record<string, number>;
  metricTotals?: Record<string, number>;
  metricCounts?: Record<string, number>;
}

/**
 * Available options for filters and dimensions
 */
export interface AvailableOptions {
  dimensions: string[];
  metrics: string[];
  specialties: string[];
  regions: string[];
  surveySources: string[];
  providerTypes: string[];
  years: string[];
}

/**
 * Chart type options
 */
export type ChartType = 'bar' | 'line' | 'pie';

/**
 * Dimension options
 */
export type Dimension = 'specialty' | 'region' | 'providerType' | 'surveySource';

/**
 * Metric options
 */
export type Metric = 
  | 'tcc_p25' | 'tcc_p50' | 'tcc_p75' | 'tcc_p90'
  | 'wrvu_p25' | 'wrvu_p50' | 'wrvu_p75' | 'wrvu_p90'
  | 'cf_p25' | 'cf_p50' | 'cf_p75' | 'cf_p90';

/**
 * Y-axis configuration for charts
 */
export interface YAxisConfig {
  min: number;
  max: number;
}

/**
 * Report builder component props
 */
export interface ReportBuilderProps {
  data?: ISurveyRow[];
  title?: string;
}

/**
 * Report config panel props
 */
export interface ReportConfigPanelProps {
  config: ReportConfigInput;
  availableOptions: AvailableOptions;
  onConfigChange: (field: keyof ReportConfigInput, value: any) => void;
  onTemplateSelect?: (config: ReportConfigInput) => void;
}

/**
 * Report filters props
 */
export interface ReportFiltersProps {
  filters: ReportFilters;
  availableOptions: AvailableOptions;
  onFilterChange: (filterType: keyof ReportFilters, value: string[]) => void;
  specialtyOptions?: any[];
  specialtyMappings?: Map<string, Set<string>>;
  filterImpacts?: {
    specialties: number;
    regions: number;
    surveySources: number;
    providerTypes: number;
    years: number;
  };
  totalRecords?: number;
  onClearAll?: () => void;
}

/**
 * Report chart props
 */
export interface ReportChartProps {
  chartData: ChartDataItem[];
  chartType: ChartType;
  metrics: string[];
  metric: string;
}

/**
 * Report table props
 */
export interface ReportTableProps {
  tableData: ChartDataItem[];
  dimension: string;
  metrics: string[];
  metric: string;
  onSort?: (desc: boolean) => void;
  sortDesc?: boolean;
}

/**
 * Report actions props
 */
export interface ReportActionsProps {
  reportName: string;
  chartData: ChartDataItem[];
  onSave: () => void;
  onExport: () => void;
  savedReports: ReportConfig[];
  onLoadReport: (report: ReportConfig) => void;
  onDeleteReport?: (reportId: string) => void;
}

/**
 * Data quality indicator props
 */
export interface DataQualityIndicatorProps {
  chartData: ChartDataItem[];
  totalRecords: number;
  filteredRecords: number;
}


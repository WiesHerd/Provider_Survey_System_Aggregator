/**
 * Reports Feature - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the reports feature.
 * Following enterprise patterns for type safety and maintainability.
 */

/**
 * Report configuration interface
 */
export interface ReportConfig {
  id: string;
  name: string;
  dimension: string;
  metric: string;
  chartType: 'bar' | 'line' | 'pie';
  filters: {
    specialties: string[];
    regions: string[];
    surveySources: string[];
  };
  created: Date;
}

/**
 * Chart data item interface
 */
export interface ChartDataItem {
  name: string;
  value: number;
  count: number;
  originalName: string;
}

/**
 * Report filters interface
 */
export interface ReportFilters {
  specialties: string[];
  regions: string[];
  surveySources: string[];
}

/**
 * Available options for report configuration
 */
export interface AvailableOptions {
  specialties: string[];
  regions: string[];
  surveySources: string[];
  dimensions: string[];
  metrics: string[];
}

/**
 * Report configuration form state
 */
export interface ReportConfigForm {
  name: string;
  dimension: string;
  metric: string;
  chartType: 'bar' | 'line' | 'pie';
  filters: ReportFilters;
}

/**
 * Custom reports component props
 */
export interface CustomReportsProps {
  data?: any[];
  title?: string;
}

/**
 * Report builder component props
 */
export interface ReportBuilderProps {
  config: ReportConfigForm;
  onConfigChange: (config: ReportConfigForm) => void;
  availableOptions: AvailableOptions;
  onSaveReport: (config: ReportConfigForm) => void;
  onLoadReport: (reportId: string) => void;
  savedReports: ReportConfig[];
}

/**
 * Chart component props
 */
export interface ChartComponentProps {
  data: ChartDataItem[];
  chartType: 'bar' | 'line' | 'pie';
  dimension: string;
  metric: string;
  height?: number;
}

/**
 * Report filters component props
 */
export interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  availableOptions: AvailableOptions;
}

/**
 * Saved reports component props
 */
export interface SavedReportsProps {
  reports: ReportConfig[];
  onLoadReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
}

/**
 * Reports hook return type
 */
export interface UseReportsReturn {
  loading: boolean;
  error: string | null;
  surveyData: any[];
  savedReports: ReportConfig[];
  availableOptions: AvailableOptions;
  config: ReportConfigForm;
  setConfig: (config: ReportConfigForm) => void;
  saveReport: (config: ReportConfigForm) => void;
  loadReport: (reportId: string) => void;
  deleteReport: (reportId: string) => void;
  generateChartData: (config: ReportConfigForm) => ChartDataItem[];
  exportReport: (config: ReportConfigForm, data: ChartDataItem[]) => void;
}

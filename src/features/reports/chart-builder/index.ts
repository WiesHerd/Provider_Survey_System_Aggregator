/**
 * Chart Builder Feature - Barrel Exports
 * 
 * Public API for the chart-builder feature
 */

// Components
export { ReportActions } from './components/ReportActions';
export { ReportConfigPanel } from './components/ReportConfigPanel';
export { ReportFilters } from './components/ReportFilters';
export { ReportChart } from './components/ReportChart';
export { ReportTable } from './components/ReportTable';
export { ReportPreview } from './components/ReportPreview';
export { TemplateSelector } from './components/TemplateSelector';
export { DataQualityIndicator } from './components/DataQualityIndicator';
export { FilterAutocomplete } from './components/FilterAutocomplete';
export { FilterSection } from './components/FilterSection';
export { ErrorBoundary } from './components/ErrorBoundary';
export { FilterImpactIndicator } from './components/FilterImpactIndicator';
export { EnhancedErrorMessage } from './components/EnhancedErrorMessage';
export type { ErrorContext } from './components/EnhancedErrorMessage';
export { ProcessingProgress } from './components/ProcessingProgress';

// Hooks
export { useReportConfig } from './hooks/useReportConfig';
export { useReportData } from './hooks/useReportData';
export { useSavedReports } from './hooks/useSavedReports';
export { useSpecialtyMappings } from './hooks/useSpecialtyMappings';
export { useReportErrorDetection } from './hooks/useReportErrorDetection';

// Types
export type {
  ReportConfig,
  ReportConfigInput,
  ChartDataItem,
  AvailableOptions,
  ChartType,
  Dimension,
  Metric,
  YAxisConfig,
  ReportBuilderProps,
  ReportConfigPanelProps,
  ReportFiltersProps,
  ReportChartProps,
  ReportTableProps,
  ReportActionsProps,
  DataQualityIndicatorProps
} from './types/reportBuilder';

// Utils
export {
  getSpecialtyField,
  getRegionField,
  getProviderTypeField,
  getSurveySourceField,
  getYearField,
  getMetricDisplayVariableColor,
  getMetricTableHeaderColor,
  getMetricBackgroundColor,
  getDarkerColor,
  sortMetricsForDisplay,
  formatMetricValue,
  getMetricDisplayLabel,
  getMetricShortLabel
} from './utils/reportFormatters';

export { exportReportToCSV } from './utils/reportExport';

export {
  calculateOptimalYAxis,
  calculateAverage,
  calculateMedian,
  calculateTotalCount,
  isCurrencyMetric,
  isWRVUMetric
} from './utils/reportCalculations';

export {
  validateReportConfig,
  validateReportName,
  validateChartData
} from './utils/reportValidators';

// Services
export {
  loadSavedReports,
  saveReports,
  deleteReport
} from './services/reportStorage';


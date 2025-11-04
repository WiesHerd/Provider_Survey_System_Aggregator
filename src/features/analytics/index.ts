/**
 * Analytics Feature - Public API
 * 
 * This file provides the public API for the analytics feature.
 * Following enterprise patterns for clean imports and module boundaries.
 */

// Components
export { AnalyticsTable } from './components/AnalyticsTable';
export { AnalyticsFilters } from './components/AnalyticsFilters';
export { APPAnalytics } from './components/APPAnalytics';
export { PhysicianAnalytics } from './components/PhysicianAnalytics';
export { AnalyticsTableControls } from './components/AnalyticsTableControls';
export { AnalyticsTableHeader } from './components/AnalyticsTableHeader';
export { AnalyticsTableRow } from './components/AnalyticsTableRow';
export { AnalyticsSummaryRow } from './components/AnalyticsSummaryRow';
export { AnalyticsErrorBoundary } from './components/AnalyticsErrorBoundary';

// Hooks
export { useAnalyticsData } from './hooks/useAnalyticsData';
export { useAnalyticsFilters } from './hooks/useAnalyticsFilters';
export { useAnalyticsExport } from './hooks/useAnalyticsExport';
export { 
  useMemoizedGrouping, 
  useMemoizedSummary, 
  useMemoizedSummaryRows, 
  useMemoizedFiltering, 
  useMemoizedColumnGroups, 
  useCacheInvalidation 
} from './hooks/useMemoizedCalculations';

// Types
export type {
  AggregatedData,
  AnalyticsFilters as AnalyticsFiltersType,
  AnalyticsTableProps,
  AnalyticsFiltersProps,
  UseAnalyticsReturn,
  VariableMapping,
  SummaryCalculation
} from './types/analytics';

// Utilities
export {
  calculatePercentile,
  formatCurrency,
  groupBySpecialty,
  calculateSummaryRows,
  transformSurveyData,
  filterAnalyticsData
} from './utils/analyticsCalculations';

export {
  exportToCSV,
  exportToExcel
} from './utils/exportUtils';

export {
  formatVariableValue,
  getVariableLightBackgroundColor,
  mapVariableNameToStandard,
  formatVariableDisplayName,
  getVariableColor
} from './utils/variableFormatters';
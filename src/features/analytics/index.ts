/**
 * Analytics feature barrel exports
 * This file provides a clean import interface for all analytics components and utilities
 */

// Main component
export { SurveyAnalytics } from './components/SurveyAnalytics';

// Sub-components
export { AnalyticsFilters } from './components/AnalyticsFilters';
export { AnalyticsSummary } from './components/AnalyticsSummary';
export { AnalyticsTable } from './components/AnalyticsTable';

// Hooks
export { useAnalyticsData } from './hooks/useAnalyticsData';

// Types
export type {
  AggregatedData,
  AnalyticsFilters,
  AnalyticsTableRow,
  AnalyticsSummary,
  AnalyticsChartData,
  AnalyticsTableColumn,
  AnalyticsTableConfig,
  AnalyticsProps,
  AnalyticsTableProps,
  AnalyticsFiltersProps,
  AnalyticsChartsProps,
  AnalyticsSummaryProps,
  DataTransformationResult,
  AnalyticsExportConfig,
  AnalyticsApiResponse
} from './types/analytics';

// Utilities
export {
  calculateAnalyticsSummary,
  applyAnalyticsFilters,
  sortAnalyticsData,
  calculateWeightedCompensation,
  calculateCompensationRanges,
  groupAnalyticsData,
  calculateGroupedStatistics,
  validateAnalyticsData
} from './utils/analyticsCalculations';

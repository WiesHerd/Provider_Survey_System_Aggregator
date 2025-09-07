/**
 * Analytics Feature - Public API
 * 
 * This file provides the public API for the analytics feature.
 * Following enterprise patterns for clean imports and module boundaries.
 */

// Components
export { AnalyticsTable } from './components/AnalyticsTable';
export { AnalyticsFilters } from './components/AnalyticsFilters';

// Hooks
export { useAnalyticsData } from './hooks/useAnalyticsData';

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
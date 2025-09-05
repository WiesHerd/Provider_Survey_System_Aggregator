/**
 * Analytics Feature - Barrel Export
 * Public API for the analytics feature
 */

// Components
export { AnalyticsContainer } from './components/AnalyticsContainer';
export { AnalyticsTable } from './components/AnalyticsTable';
export { AnalyticsFilters } from './components/AnalyticsFilters';
export { AnalyticsSummary } from './components/AnalyticsSummary';
export { AnalyticsExport } from './components/AnalyticsExport';

// Hooks
export { useAnalyticsData } from './hooks/useAnalyticsData';

// Types
export type { 
  AggregatedData,
  AnalyticsFilters as AnalyticsFiltersType,
  AnalyticsState,
  AnalyticsContainerProps,
  AnalyticsTableProps,
  AnalyticsFiltersProps,
  AnalyticsSummaryProps,
  AnalyticsExportProps,
  VariableMapping
} from './types/analytics';

// Services
export { analyticsDataService } from './services/analyticsDataService';

// Utilities
export { 
  calculatePercentile, 
  formatCurrency, 
  formatNumber,
  calculateAnalyticsSummary,
  filterAnalyticsData,
  sortAnalyticsData
} from './utils/analyticsCalculations';

export {
  transformSurveyData,
  getVariableMappings,
  extractUniqueValues
} from './utils/dataTransformation';
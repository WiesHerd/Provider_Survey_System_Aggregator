// Main component
export { RegionalAnalytics } from './components/RegionalAnalytics';

// Sub-components
export { RegionalComparison } from './components/RegionalComparison';

// Hooks
export { useRegionalData } from './hooks/useRegionalData';

// Types
export type {
  RegionalData,
  RegionalChartData,
  RegionalTableConfig,
  RegionalTableRow,
  RegionalTableColumn,
  RegionalMapData,
  RegionalCalculationParams,
  RegionalCalculationResult,
  RegionalApiResponse,
  RegionalValidationResult,
  RegionalExportConfig,
  RegionalAnalyticsProps,
  RegionalComparisonProps,
  RegionalMapProps,
  RegionalTableProps,
  RegionalCalculationOptions,
} from './types/regional';

// Utilities
export {
  REGION_NAMES,
  REGIONAL_METRICS,
  PERCENTILES,
  calculateRegionalData,
  generateRegionalChartData,
  generateRegionalMapData,
  sortRegionalData,
  validateRegionalCalculation,
  calculateRegionalAnalytics,
} from './utils/regionalCalculations';

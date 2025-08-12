// Main FMV Calculator component
export { FMVCalculator } from './components/FMVCalculator';

// Sub-components
export { FMVFilters } from './components/FMVFilters';
export { CompareTypeSelector } from './components/CompareTypeSelector';
export { TCCItemization } from './components/TCCItemization';
export { WRVUsInput } from './components/WRVUsInput';
export { CFInput } from './components/CFInput';
export { ResultsPanel } from './components/ResultsPanel';

// Hooks
export { useFMVData } from './hooks/useFMVData';

// Types
export type {
  FMVFilters as FMVFiltersType,
  CompensationComponent,
  MarketPercentiles,
  MarketData,
  UserPercentiles,
  CompareType,
  UniqueFilterValues,
  FMVCalculationState,
  NormalizedSurveyRow,
  FMVCalculationResult,
  FMVFiltersProps,
  CompareTypeSelectorProps,
  TCCItemizationProps,
  WRVUsInputProps,
  CFInputProps,
  ResultsPanelProps,
  FMVCalculatorProps,
  FMVCalculationParams,
  FMVExportConfig,
  FMVApiResponse,
  FMVValidationResult,
  FMVCalculationOptions,
} from './types/fmv';

// Utilities
export {
  normalizeSurveyRow,
  normalizeString,
  applyFMVFilters,
  calculateMarketData,
  getPercentileRank,
  calculateUserPercentiles,
  calculateTotalTCC,
  applyFTEAdjustment,
  validateFMVCalculation,
  formatFMVValue,
  extractUniqueFilterValues,
} from './utils/fmvCalculations';

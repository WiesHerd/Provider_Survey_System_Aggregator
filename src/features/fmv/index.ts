// Main FMV Calculator component
export { FMVCalculator } from './components/FMVCalculator';

// Sub-components
export { FMVFilters } from './components/FMVFilters';
export { CompareTypeSelector } from './components/CompareTypeSelector';
export { TCCItemization } from './components/TCCItemization';
export { WRVUsInput } from './components/WRVUsInput';
export { CFInput } from './components/CFInput';
export { ResultsPanel } from './components/ResultsPanel';
export { SavedFMVManager } from './components/SavedFMVManager';
export { AggregationMethodSelector } from './components/AggregationMethodSelector';

// Specialty Blending Components
export { SpecialtyBlendingSelector } from './components/SpecialtyBlendingSelector';
export { SpecialtyBlendItemComponent } from './components/SpecialtyBlendItemComponent';
export { BlendedResultsPanel } from './components/BlendedResultsPanel';

// Hooks
export { useFMVData } from './hooks/useFMVData';

// Types
export type {
  FMVFilters as FMVFiltersType,
  SavedFMVCalculation,
  CompensationComponent,
  MarketPercentiles,
  MarketData,
  UserPercentiles,
  CompareType,
  AggregationMethod,
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
  AggregationMethodSelectorProps,
  FMVCalculatorProps,
  FMVCalculationParams,
  FMVExportConfig,
  FMVApiResponse,
  FMVValidationResult,
  FMVCalculationOptions,
  // Specialty Blending Types
  SpecialtyBlendingConfig,
  SpecialtyBlendItem,
  BlendedMarketData,
  SpecialtyBlendingSelectorProps,
  SpecialtyBlendItemProps,
  BlendedResultsPanelProps,
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

// Specialty Blending Utilities
export {
  calculateBlendedMarketData,
  validateSpecialtyBlending,
  getRecommendedBlendingMethod,
} from './utils/specialtyBlendingCalculations';

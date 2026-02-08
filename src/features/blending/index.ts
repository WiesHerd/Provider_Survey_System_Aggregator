/**
 * Specialty Blending Feature
 * 
 * This file exports the public API for the specialty blending feature,
 * providing access to components, hooks, types, and utilities.
 */

// Components
export { SpecialtyBlendingScreen } from './components/SpecialtyBlendingScreen';
export { SortableSpecialtyItem } from './components/SortableSpecialtyItem';
export { WeightControl } from './components/WeightControl';
export { TemplateManager } from './components/TemplateManager';
export { BlendingResults } from './components/BlendingResults';

// Hooks
export { useSpecialtyBlending, prefetchBlendingData } from './hooks/useSpecialtyBlending';

// Types
export type {
  SpecialtyItem,
  SpecialtyBlend,
  SpecialtyBlendTemplate,
  BlendedResult,
  BlendingConfig,
  BlendingValidation,
  BlendingState,
  BlendingActions,
  BlendingProps
} from './types/blending';

// Utilities
export {
  validateBlend,
  normalizeWeights,
  calculateWeightedAverage,
  calculateBlendedMetrics,
  calculateConfidence,
  generateBlendId,
  formatWeight,
  areWeightsBalanced
} from './utils/blendingCalculations';

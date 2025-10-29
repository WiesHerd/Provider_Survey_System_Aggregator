/**
 * Main shared barrel exports for the Survey Aggregator application
 * This file provides a clean import interface for all shared resources
 */

// Types
export * from './types';

// Hooks
export * from './hooks';

// Utilities
export * from './utils';

// Components
export * from './components';

// Re-export commonly used utilities for convenience
export {
  calculatePercentile,
  calculateAverage,
  formatCurrency,
  formatNumber,
  formatPercentage,
  normalizeSpecialty,
  fuzzyMatchSpecialty,
  standardizeSpecialty,
  formatSpecialtyForDisplay,
  sortSpecialtiesForDisplay
} from './utils';

// Re-export commonly used components for convenience
export { ConfirmationDialog } from './components';
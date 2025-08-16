/**
 * Main shared barrel exports for the Survey Aggregator application
 * This file provides a clean import interface for all shared resources
 */

// Types
export * from './types';

// Utilities
export * from './utils';

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

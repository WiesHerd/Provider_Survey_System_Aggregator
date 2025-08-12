/**
 * Barrel exports for shared utilities
 * This file provides a clean import interface for all shared utility functions
 */

// Calculation utilities
export {
  calculatePercentile,
  calculateWeightedAverage,
  calculateAverage,
  calculateMedian,
  calculateStandardDeviation,
  calculateCoefficientOfVariation
} from './calculations';

// Formatting utilities
export {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatFileSize,
  formatPhoneNumber,
  truncateText,
  capitalizeWords
} from './formatters';

// Specialty matching utilities
export {
  normalizeSpecialty,
  fuzzyMatchSpecialty,
  findBestSpecialtyMatch,
  calculateSimilarity,
  groupSimilarSpecialties,
  standardizeSpecialty
} from './specialtyMatching';

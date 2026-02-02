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
  capitalizeWords,
  formatSpecialtyForDisplay,
  formatRegionForDisplay,
  formatProviderTypeForDisplay,
  formatFieldNameForDisplay,
  sortSpecialtiesForDisplay
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

// CSV parsing utilities
export {
  parseCSVLine,
  parseCSVContent,
  testCSVParsing
} from './csvParser';

// Text encoding utilities
export {
  readCSVFile,
  readFileWithEncoding,
  normalizeText,
  normalizeRowStrings,
  detectEncodingIssues
} from './textEncoding';

export type {
  EncodingIssue,
  FileEncodingResult
} from './textEncoding';

// Streaming CSV parser utilities
export {
  parseCSVStreaming,
  parseCSVNonStreaming,
  parseCSVSmart,
  shouldUseStreaming,
  shouldUseWorker
} from './streamingCSVParser';

export type {
  StreamingParseOptions,
  StreamingParseResult
} from './streamingCSVParser';
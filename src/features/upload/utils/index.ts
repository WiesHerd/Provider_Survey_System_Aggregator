/**
 * Barrel exports for upload utilities
 * Using explicit exports to avoid naming conflicts
 */

// File parsing
export * from './fileParser';
export * from './parserRouter';

// Validation - explicit exports to avoid conflicts
export {
  validateCSVStructure,
  validateCSVContent,
  detectDuplicates,
  validateUploadTransaction,
  validateFileUpload as validateFileUploadStructure,
  type ValidationResult,
  type DuplicateCheckResult
} from './uploadValidation';

// Data validation - explicit exports
export {
  isMissingDataIndicator,
  validateDataTypes as validateDataTypesDetailed,
  validateBusinessRules,
  type DataValidationResult,
  type ValidationError as DataValidationError
} from './dataValidation';

// Pre-upload validation
export {
  validateFileStructure,
  validateHeaders,
  type PreUploadValidationResult,
  type ValidationError as PreUploadValidationError
} from './preUploadValidation';

// Validation engine
export * from './validationEngine';

// Row validation
export * from './rowValidation';

// Data integrity
export * from './dataIntegrity';

// Checkpoint and recovery
export * from './uploadCheckpoint';

// Progress tracking
export * from './progressTracker';

// Error handling
export * from './errorMessageFormatter';

// Auto-detection
export * from './autoDetection';
export * from './formatDetection';

// Calculations - explicit exports to avoid conflicts
export {
  calculateSurveyStats,
  extractUniqueValues,
  filterSurveys,
  validateFileUpload as validateFileUploadCalculations,
  validateSurveyForm,
  calculateUploadSummary,
  sortSurveysByDate,
  formatSurveyMetadata,
  generateSurveyPreview,
  REQUIRED_COLUMNS,
  NORMALIZED_REQUIRED_COLUMNS,
  COLUMN_ALIASES,
  validateColumns,
  checkIfMappingNeeded,
  getExpectedColumns,
  type ColumnValidationResult
} from './uploadCalculations';

// Mapping
export * from './mappingApplication';

// Survey list filters (client-side DATA VIEW filtering)
export { filterSurveysByProviderType } from './surveyListFilters';

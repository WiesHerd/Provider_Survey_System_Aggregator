/**
 * Upload feature barrel exports
 * This file provides a clean import interface for all upload components and utilities
 */

// Hooks
export { useUploadData } from './hooks/useUploadData';

// Types
export type {
  FileWithPreview,
  UploadedSurvey,
  UploadedSurveyMetadata,
  UploadFormState,
  UploadProgress,
  DeleteProgress,
  UploadGlobalFilters,
  UniqueValues,
  UploadSectionState,
  FileUploadConfig,
  UploadValidationResult,
  UploadProps,
  UploadFormProps,
  FileUploadProps,
  YearPickerProps,
  UploadedSurveysProps,
  UploadSummaryProps,
  UploadErrorProps,
  UploadApiResponse,
  UploadValidationRules
} from './types/upload';

// Utilities
export {
  calculateSurveyStats,
  extractUniqueValues,
  filterSurveys,
  validateFileUpload,
  validateSurveyForm,
  calculateUploadSummary,
  sortSurveysByDate,
  formatSurveyMetadata,
  generateSurveyPreview
} from './utils/uploadCalculations';

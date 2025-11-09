/**
 * Upload feature barrel exports
 * This file provides a clean import interface for all upload components and utilities
 */

// Main component
export { SurveyUpload } from './components/SurveyUpload';

// Sub-components
export { UploadForm } from './components/UploadForm';
export { FileUpload } from './components/FileUpload';
export { UploadedSurveys } from './components/UploadedSurveys';
export { ColumnValidationDisplay } from './components/ColumnValidationDisplay';
export { EncodingWarning } from './components/EncodingWarning';
export { ValidationBanner } from './components/ValidationBanner';
export { SheetSelector } from './components/SheetSelector';
export { ValidationPreviewTable } from './components/ValidationPreviewTable';
export { EditableCell } from './components/EditableCell';

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

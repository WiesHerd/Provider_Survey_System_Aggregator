/**
 * Upload feature type definitions
 * These types are specific to the upload feature and extend shared types
 */

import { BaseEntity, SurveySource } from '@/shared/types';

/**
 * File with preview and upload metadata
 */
export interface FileWithPreview extends File {
  preview?: string;
  id?: string;
  surveyType?: string;
  surveyYear?: string;
  uploadDate?: Date;
}

/**
 * Uploaded survey metadata
 */
export interface UploadedSurveyMetadata {
  id: string;
  fileName: string;
  surveyType: SurveySource;
  surveyYear: string;
  uploadDate: Date;
  stats: {
    totalRows: number;
    uniqueSpecialties: number;
    totalDataPoints: number;
  };
}

/**
 * Complete uploaded survey with file content and rows
 */
export interface UploadedSurvey extends UploadedSurveyMetadata {
  fileContent: string;
  rows: any[];
  columnMappings?: Record<string, string>;
}

/**
 * Upload form state
 */
export interface UploadFormState {
  surveyType: string;
  customSurveyType: string;
  surveyYear: string;
  providerType: string;
  isCustom: boolean;
}

/**
 * Upload progress state
 */
export interface UploadProgress {
  isUploading: boolean;
  progress: number;
  currentFile?: string;
  totalFiles: number;
  currentFileIndex: number;
}

/**
 * Delete progress state
 */
export interface DeleteProgress {
  isDeleting: boolean;
  progress: number;
  currentFile?: string;
  totalFiles: number;
  currentFileIndex: number;
}

/**
 * Global filters for uploaded surveys
 */
export interface UploadGlobalFilters {
  specialty: string;
  providerType: string;
  region: string;
}

/**
 * Unique values across all surveys
 */
export interface UniqueValues {
  specialties: Set<string>;
  providerTypes: Set<string>;
  regions: Set<string>;
}

/**
 * Upload section collapse state
 */
export interface UploadSectionState {
  isUploadSectionCollapsed: boolean;
  isUploadedSurveysCollapsed: boolean;
}

/**
 * File upload configuration
 */
export interface FileUploadConfig {
  accept: Record<string, string[]>;
  maxSize: number;
  maxFiles: number;
  multiple: boolean;
}

/**
 * Upload validation result
 */
export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Upload component props
 */
export interface UploadProps {
  onSurveySelect?: (surveyId: string | null) => void;
  onSurveyDelete?: (surveyId: string) => void;
  onUploadComplete?: (surveys: UploadedSurvey[]) => void;
  onError?: (error: string) => void;
  initialFilters?: UploadGlobalFilters;
}

/**
 * Upload form component props
 */
export interface UploadFormProps {
  formState: UploadFormState;
  onFormChange: (field: keyof UploadFormState, value: any) => void;
  onCustomToggle: () => void;
  disabled?: boolean;
}

/**
 * File upload component props
 */
export interface FileUploadProps {
  files: FileWithPreview[];
  onDrop: (acceptedFiles: File[]) => void;
  onRemove: (file: FileWithPreview) => void;
  onClear: () => void;
  uploadProgress: UploadProgress;
  disabled?: boolean;
}

/**
 * Year picker component props
 */
export interface YearPickerProps {
  value: string;
  onChange: (year: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  disabled?: boolean;
}

/**
 * Uploaded surveys list component props
 */
export interface UploadedSurveysProps {
  surveys: UploadedSurvey[];
  selectedSurvey: string | null;
  onSurveySelect: (surveyId: string) => void;
  onSurveyDelete: (surveyId: string) => void;
  deleteProgress: DeleteProgress;
  globalFilters: UploadGlobalFilters;
  onFilterChange: (filterName: keyof UploadGlobalFilters, value: string) => void;
  uniqueValues: UniqueValues;
  sectionState: UploadSectionState;
  onSectionToggle: (section: keyof UploadSectionState) => void;
  loading?: boolean;
}

/**
 * Upload summary component props
 */
export interface UploadSummaryProps {
  surveys: UploadedSurvey[];
  totalFiles: number;
  totalRows: number;
  totalSpecialties: number;
  totalDataPoints: number;
}

/**
 * Upload error component props
 */
export interface UploadErrorProps {
  error: string | null;
  onClear: () => void;
}

/**
 * Upload API response
 */
export interface UploadApiResponse {
  success: boolean;
  data?: UploadedSurvey[];
  error?: string;
  message?: string;
}

/**
 * Upload validation rules
 */
export interface UploadValidationRules {
  maxFileSize: number;
  allowedFileTypes: string[];
  requiredFields: string[];
  maxFiles: number;
  maxRowsPerFile: number;
}

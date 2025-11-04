/**
 * Upload State Types
 * Defines the various states and progress tracking for upload operations
 */

export type UploadStep = 
  | 'idle'
  | 'validating'
  | 'parsing'
  | 'saving'
  | 'verifying'
  | 'completed'
  | 'error';

export type UploadErrorType = 
  | 'validation'
  | 'parsing'
  | 'database'
  | 'network'
  | 'permission'
  | 'unknown';

export interface UploadProgress {
  isUploading: boolean;
  step: UploadStep;
  progress: number; // 0-100
  currentFile?: string;
  currentFileIndex: number;
  totalFiles: number;
  message: string;
  details?: string;
}

export interface UploadError {
  type: UploadErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  suggestedAction?: string;
  retryCount: number;
  maxRetries: number;
}

export interface UploadTransaction {
  id: string;
  surveyId?: string;
  fileName: string;
  step: UploadStep;
  startTime: number;
  endTime?: number;
  error?: UploadError;
  rollbackData?: any;
}

export interface UploadState {
  // Current upload
  currentTransaction?: UploadTransaction;
  progress: UploadProgress;
  error?: UploadError;
  
  // History
  completedTransactions: UploadTransaction[];
  failedTransactions: UploadTransaction[];
  
  // Settings
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
}

export interface UploadValidationSummary {
  fileName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
  detectedColumns: string[];
  sampleData: any[];
  duplicateCheck?: {
    isDuplicate: boolean;
    similarSurveys: Array<{
      id: string;
      name: string;
      similarity: number;
    }>;
  };
}

export interface UploadConfirmation {
  files: UploadValidationSummary[];
  totalRows: number;
  estimatedTime: string;
  requiresConfirmation: boolean;
}

// Upload step messages
export const UPLOAD_STEP_MESSAGES: Record<UploadStep, string> = {
  idle: 'Ready to upload',
  validating: 'Validating file format and content...',
  parsing: 'Parsing CSV data...',
  saving: 'Saving to database...',
  verifying: 'Verifying data integrity...',
  completed: 'Upload completed successfully',
  error: 'Upload failed'
};

// Error type descriptions
export const ERROR_TYPE_DESCRIPTIONS: Record<UploadErrorType, string> = {
  validation: 'File validation failed',
  parsing: 'CSV parsing failed',
  database: 'Database operation failed',
  network: 'Network connection failed',
  permission: 'Permission denied',
  unknown: 'Unknown error occurred'
};

// Default upload settings
export const DEFAULT_UPLOAD_SETTINGS = {
  autoRetry: true,
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxRows: 100000, // 100k rows
  validationTimeout: 30000, // 30 seconds
  uploadTimeout: 120000 // 2 minutes
};

/**
 * Upload-related type definitions
 * Enterprise-grade upload system types
 */

export interface UploadProgress {
  step: 'idle' | 'validating' | 'parsing' | 'uploading' | 'verifying' | 'indexing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
  bytesUploaded?: number;
  bytesTotal?: number;
  currentFile?: string;
}

export interface UploadTransaction {
  id: string;
  surveyId?: string;
  fileName: string;
  fileSize: number;
  step: 'pending' | 'parsing' | 'saving' | 'verifying' | 'completed' | 'error';
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: UploadError;
  metadata?: Record<string, any>;
}

export interface UploadIntent {
  id: string;
  surveyId: string;
  userId: string;
  status: 'pending' | 'inProgress' | 'completed' | 'failed' | 'rolledBack';
  startTime: Date;
  completionTime?: Date;
  metadata: {
    fileName: string;
    fileSize: number;
    expectedRowCount: number;
    surveyYear: number;
    surveyType: string;
    providerType: string;
  };
}

export interface UploadError {
  code: string;
  message: string;
  technicalDetails?: string;
  recoverable: boolean;
  userMessage: string;
  suggestedAction?: string;
}

export interface UploadVerificationResult {
  success: boolean;
  surveyExists: boolean;
  rowCountMatches: boolean;
  expectedRows: number;
  actualRows: number;
  sampleDataValid: boolean;
  errors: string[];
}

export interface UploadMetrics {
  surveyId: string;
  fileSize: number;
  rowCount: number;
  uploadDuration: number; // ms
  validationDuration: number; // ms
  verificationDuration: number; // ms
  success: boolean;
  errorCode?: string;
  retryCount: number;
}

export interface HealthReport {
  firebaseAvailable: boolean;
  authValid: boolean;
  storageQuotaAvailable: number; // bytes
  indexedDBWorking: boolean;
  networkSpeed?: number; // bytes per second
  timestamp: Date;
  issues: string[];
}

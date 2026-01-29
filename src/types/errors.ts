/**
 * Error type definitions
 * Enterprise-grade error handling types
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  technicalDetails?: string;
  recoverable?: boolean;
}

export interface ErrorLog {
  timestamp: Date;
  userId: string;
  operation: string;
  errorCode: string;
  errorMessage: string;
  stack?: string;
  context: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export class UploadError extends Error {
  code: string;
  userMessage: string;
  recoverable: boolean;
  technicalDetails?: string;
  originalError?: Error;

  constructor(
    message: string,
    code: string = 'UPLOAD_ERROR',
    userMessage?: string,
    recoverable: boolean = true,
    originalError?: Error
  ) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.userMessage = userMessage || message;
    this.recoverable = recoverable;
    this.technicalDetails = originalError?.message;
    this.originalError = originalError;
    Object.setPrototypeOf(this, UploadError.prototype);
  }
}

export class VerificationError extends Error {
  details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'VerificationError';
    this.details = details;
    Object.setPrototypeOf(this, VerificationError.prototype);
  }
}

export class IntegrityError extends Error {
  expectedValue: any;
  actualValue: any;

  constructor(message: string, expectedValue?: any, actualValue?: any) {
    super(message);
    this.name = 'IntegrityError';
    this.expectedValue = expectedValue;
    this.actualValue = actualValue;
    Object.setPrototypeOf(this, IntegrityError.prototype);
  }
}

export class QuotaExceededError extends Error {
  quotaType: 'storage' | 'writes' | 'reads';
  currentUsage?: number;
  limit?: number;

  constructor(
    message: string,
    quotaType: 'storage' | 'writes' | 'reads' = 'storage',
    currentUsage?: number,
    limit?: number
  ) {
    super(message);
    this.name = 'QuotaExceededError';
    this.quotaType = quotaType;
    this.currentUsage = currentUsage;
    this.limit = limit;
    Object.setPrototypeOf(this, QuotaExceededError.prototype);
  }
}

export class ConfigurationError extends Error {
  missingFields: string[];

  constructor(message: string, missingFields: string[] = []) {
    super(message);
    this.name = 'ConfigurationError';
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

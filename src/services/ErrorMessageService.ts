/**
 * Error Message Service
 * 
 * Translates technical Firebase/system errors into user-friendly messages
 * with actionable guidance. Enterprise-grade error handling.
 */

import { UserFriendlyError } from '../types/errors';

export class ErrorMessageService {
  /**
   * Translate Firebase/system error into user-friendly message
   */
  static translateFirebaseError(error: any): UserFriendlyError {
    const errorCode = error?.code || error?.message || 'UNKNOWN_ERROR';
    const errorMessage = error?.message || String(error);

    // Firebase Authentication Errors
    if (errorCode.includes('auth/')) {
      return this.translateAuthError(errorCode, errorMessage);
    }

    // Firebase Firestore Errors
    if (errorCode.includes('firestore/') || errorCode.includes('permission-denied') || errorCode.includes('unauthenticated')) {
      return this.translateFirestoreError(errorCode, errorMessage);
    }

    // Upload-specific Errors
    if (errorCode.includes('upload') || errorCode.includes('UPLOAD')) {
      return this.translateUploadError(errorCode, errorMessage);
    }

    // Network Errors
    if (errorCode.includes('network') || errorCode.includes('unavailable') || errorCode.includes('failed to fetch')) {
      return this.translateNetworkError(errorCode, errorMessage);
    }

    // Default fallback
    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      action: 'Retry',
      severity: 'error',
      technicalDetails: errorMessage,
      recoverable: true
    };
  }

  /**
   * Translate Firebase Authentication errors
   */
  private static translateAuthError(code: string, message: string): UserFriendlyError {
    const errorMap: Record<string, UserFriendlyError> = {
      'auth/invalid-email': {
        title: 'Invalid Email',
        message: 'The email address is not valid. Please check and try again.',
        action: 'Fix Email',
        severity: 'error',
        recoverable: true
      },
      'auth/user-disabled': {
        title: 'Account Disabled',
        message: 'Your account has been disabled. Please contact support.',
        action: 'Contact Support',
        severity: 'error',
        recoverable: false
      },
      'auth/user-not-found': {
        title: 'Account Not Found',
        message: 'No account exists with this email. Please sign up first.',
        action: 'Sign Up',
        severity: 'warning',
        recoverable: true
      },
      'auth/wrong-password': {
        title: 'Incorrect Password',
        message: 'The password is incorrect. Please try again or reset your password.',
        action: 'Retry or Reset',
        severity: 'warning',
        recoverable: true
      },
      'auth/too-many-requests': {
        title: 'Too Many Attempts',
        message: 'Too many failed login attempts. Please wait a few minutes and try again.',
        action: 'Wait and Retry',
        severity: 'warning',
        recoverable: true
      },
      'auth/network-request-failed': {
        title: 'Network Error',
        message: 'Unable to connect to authentication server. Check your internet connection.',
        action: 'Check Connection',
        severity: 'error',
        recoverable: true
      },
      'auth/email-already-in-use': {
        title: 'Email Already Registered',
        message: 'An account with this email already exists. Please sign in instead.',
        action: 'Sign In',
        severity: 'warning',
        recoverable: true
      },
      'auth/weak-password': {
        title: 'Weak Password',
        message: 'Password should be at least 6 characters long.',
        action: 'Choose Stronger Password',
        severity: 'warning',
        recoverable: true
      },
      'auth/invalid-api-key': {
        title: 'Configuration Error',
        message: 'Firebase configuration is invalid. Please contact support.',
        action: 'Contact Support',
        severity: 'critical',
        recoverable: false
      }
    };

    return errorMap[code] || {
      title: 'Authentication Error',
      message: 'Unable to authenticate. Please try signing in again.',
      action: 'Sign In',
      severity: 'error',
      technicalDetails: message,
      recoverable: true
    };
  }

  /**
   * Translate Firestore errors
   */
  private static translateFirestoreError(code: string, message: string): UserFriendlyError {
    const errorMap: Record<string, UserFriendlyError> = {
      'permission-denied': {
        title: 'Permission Denied',
        message: 'You don\'t have permission to perform this action. Your session may have expired.',
        action: 'Sign In Again',
        severity: 'error',
        recoverable: true
      },
      'unauthenticated': {
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again to continue.',
        action: 'Sign In',
        severity: 'warning',
        recoverable: true
      },
      'resource-exhausted': {
        title: 'Storage Quota Exceeded',
        message: 'Your Firebase storage quota is full. This typically happens with free tier limits. Please upgrade your plan or delete old data.',
        action: 'Contact Support',
        severity: 'error',
        technicalDetails: 'Firebase Firestore write quota exceeded. Upgrade to paid plan or wait for quota reset.',
        recoverable: false
      },
      'quota-exceeded': {
        title: 'Daily Limit Reached',
        message: 'You\'ve reached your daily upload limit. Free tier allows 20,000 writes per day. Please wait until tomorrow or upgrade your plan.',
        action: 'Upgrade Plan',
        severity: 'error',
        recoverable: false
      },
      'unavailable': {
        title: 'Service Unavailable',
        message: 'Unable to connect to the database. Check your internet connection or try again in a moment.',
        action: 'Retry',
        severity: 'warning',
        recoverable: true
      },
      'deadline-exceeded': {
        title: 'Request Timeout',
        message: 'The operation took too long to complete. This may be due to slow internet or a large file.',
        action: 'Try Smaller File',
        severity: 'warning',
        recoverable: true
      },
      'not-found': {
        title: 'Data Not Found',
        message: 'The requested data could not be found. It may have been deleted.',
        action: 'Refresh',
        severity: 'warning',
        recoverable: true
      },
      'already-exists': {
        title: 'Already Exists',
        message: 'This data already exists in the database.',
        action: 'Use Different Name',
        severity: 'warning',
        recoverable: true
      },
      'failed-precondition': {
        title: 'Invalid Operation',
        message: 'The operation cannot be performed in the current state.',
        action: 'Refresh and Retry',
        severity: 'warning',
        recoverable: true
      },
      'cancelled': {
        title: 'Operation Cancelled',
        message: 'The operation was cancelled.',
        action: 'Retry',
        severity: 'info',
        recoverable: true
      }
    };

    // Check if error code contains any of the keys
    for (const [key, value] of Object.entries(errorMap)) {
      if (code.includes(key)) {
        return value;
      }
    }

    return {
      title: 'Database Error',
      message: 'An error occurred while accessing the database. Please try again.',
      action: 'Retry',
      severity: 'error',
      technicalDetails: message,
      recoverable: true
    };
  }

  /**
   * Translate upload-specific errors
   */
  private static translateUploadError(code: string, message: string): UserFriendlyError {
    const errorMap: Record<string, UserFriendlyError> = {
      'UPLOAD_ERROR': {
        title: 'Upload Failed',
        message: 'The file upload failed. Please try again.',
        action: 'Retry Upload',
        severity: 'error',
        recoverable: true
      },
      'VERIFICATION_ERROR': {
        title: 'Upload Verification Failed',
        message: 'The uploaded data could not be verified. This may indicate data corruption or a connection issue.',
        action: 'Try Again',
        severity: 'error',
        recoverable: true
      },
      'INTEGRITY_ERROR': {
        title: 'Data Integrity Error',
        message: 'The uploaded data doesn\'t match the original file. Please try uploading again.',
        action: 'Retry Upload',
        severity: 'error',
        recoverable: true
      },
      'INVALID_FILE_FORMAT': {
        title: 'Invalid File Format',
        message: 'The file format is not supported. Please upload a CSV or Excel file.',
        action: 'Check File Format',
        severity: 'error',
        recoverable: true
      },
      'FILE_TOO_LARGE': {
        title: 'File Too Large',
        message: 'The file exceeds the maximum size limit of 10MB.',
        action: 'Use Smaller File',
        severity: 'error',
        recoverable: false
      },
      'EMPTY_FILE': {
        title: 'Empty File',
        message: 'The file is empty or contains no data rows.',
        action: 'Check File Content',
        severity: 'error',
        recoverable: false
      },
      'MISSING_REQUIRED_COLUMNS': {
        title: 'Missing Required Columns',
        message: 'The file is missing required columns. Please ensure your file has all necessary headers.',
        action: 'Check File Structure',
        severity: 'error',
        recoverable: false
      },
      'DUPLICATE_SURVEY': {
        title: 'Duplicate Survey',
        message: 'A survey with this name and year already exists.',
        action: 'Use Different Name',
        severity: 'warning',
        recoverable: true
      }
    };

    // Check if error code contains any of the keys
    for (const [key, value] of Object.entries(errorMap)) {
      if (code.includes(key) || message.includes(key)) {
        return value;
      }
    }

    return {
      title: 'Upload Error',
      message: 'An error occurred during file upload. Please try again.',
      action: 'Retry Upload',
      severity: 'error',
      technicalDetails: message,
      recoverable: true
    };
  }

  /**
   * Translate network errors
   */
  private static translateNetworkError(code: string, message: string): UserFriendlyError {
    return {
      title: 'Connection Issue',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      action: 'Check Connection',
      severity: 'warning',
      technicalDetails: message,
      recoverable: true
    };
  }

  /**
   * Create user-friendly error from code and message
   */
  static createError(
    code: string,
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'error',
    action?: string
  ): UserFriendlyError {
    return {
      title,
      message,
      action,
      severity,
      recoverable: severity !== 'critical'
    };
  }

  /**
   * Format error for user display
   */
  static formatForDisplay(error: UserFriendlyError): string {
    let display = `${error.title}\n\n${error.message}`;
    
    if (error.action) {
      display += `\n\nAction: ${error.action}`;
    }
    
    if (error.technicalDetails && process.env.NODE_ENV === 'development') {
      display += `\n\nTechnical Details: ${error.technicalDetails}`;
    }
    
    return display;
  }
}

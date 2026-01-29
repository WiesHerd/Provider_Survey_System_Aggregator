/**
 * Upload Error Display Component
 * 
 * Displays validation errors and upload progress with error states
 * Provides actionable error messages with fix suggestions
 * Shows retry button for transient failures
 */

import React, { memo } from 'react';
import {
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { FileValidationResult, ValidationError } from '../../services/FileValidationService';

export interface UploadErrorDisplayProps {
  validationResult?: FileValidationResult | null;
  uploadError?: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
  currentStep?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Upload Error Display Component
 * Shows validation errors before upload and upload errors during process
 */
export const UploadErrorDisplay: React.FC<UploadErrorDisplayProps> = memo(({
  validationResult,
  uploadError,
  isUploading = false,
  uploadProgress = 0,
  currentStep,
  onRetry,
  onDismiss
}) => {
  // Show upload error if present
  if (uploadError) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
          <XCircleIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Upload Failed
            </p>
            <p className="text-sm text-gray-700 mt-1">
              {uploadError}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Retry Upload
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="mt-2 ml-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show validation errors if present
  if (validationResult && (!validationResult.isValid || validationResult.errors.length > 0 || validationResult.warnings.length > 0)) {
    const criticalErrors = validationResult.errors.filter(e => e.severity === 'critical');
    const warnings = validationResult.warnings.filter(e => e.severity === 'warning');
    const info = validationResult.info || [];

    const isBlocking = criticalErrors.length > 0;

    return (
      <div className="space-y-3">
        {/* Status Summary */}
        <div className={`flex gap-3 p-4 rounded-xl border ${
          isBlocking 
            ? 'border-red-200 bg-red-50' 
            : warnings.length > 0
            ? 'border-amber-200 bg-amber-50'
            : 'border-blue-200 bg-blue-50'
        }`}>
          {isBlocking ? (
            <XCircleIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
          ) : warnings.length > 0 ? (
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-600" />
          ) : (
            <InformationCircleIcon className="h-5 w-5 flex-shrink-0 text-blue-600" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {isBlocking 
                ? 'Cannot upload file' 
                : warnings.length > 0
                ? 'File needs attention'
                : 'File ready to upload'}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              {isBlocking
                ? 'Fix the issues below before uploading'
                : warnings.length > 0
                ? 'Review the warnings below before uploading'
                : 'File validation passed. You can proceed with upload.'}
            </p>
            {validationResult.validationTime && (
              <p className="text-xs text-gray-500 mt-2">
                Validated in {validationResult.validationTime.toFixed(0)}ms
              </p>
            )}
          </div>
        </div>

        {/* Critical Errors */}
        {criticalErrors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Critical Issues</h4>
            {criticalErrors.map((error, index) => (
              <ErrorItem key={`error-${index}`} error={error} />
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Warnings</h4>
            {warnings.map((warning, index) => (
              <ErrorItem key={`warning-${index}`} error={warning} />
            ))}
          </div>
        )}

        {/* Info Messages */}
        {info.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Information</h4>
            {info.map((infoItem, index) => (
              <ErrorItem key={`info-${index}`} error={infoItem} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show upload progress if uploading
  if (isUploading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
          <div className="flex-shrink-0">
            <div className="animate-spin">
              <ArrowPathIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Uploading...
            </p>
            {currentStep && (
              <p className="text-sm text-gray-700 mt-1">
                {currentStep}
              </p>
            )}
            {uploadProgress > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(uploadProgress)}% complete
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No errors or validation issues
  if (validationResult?.isValid) {
    return (
      <div className="flex gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
        <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            File is valid and ready to upload
          </p>
          <p className="text-sm text-gray-700 mt-1">
            All validation checks passed. You can proceed with the upload.
          </p>
        </div>
      </div>
    );
  }

  return null;
});

UploadErrorDisplay.displayName = 'UploadErrorDisplay';

/**
 * Error Item Component
 * Displays individual validation error with fix instructions
 */
interface ErrorItemProps {
  error: ValidationError;
}

const ErrorItem: React.FC<ErrorItemProps> = memo(({ error }) => {
  const getIconAndColor = () => {
    switch (error.severity) {
      case 'critical':
        return {
          icon: <XCircleIcon className="h-5 w-5" />,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200'
        };
      case 'warning':
        return {
          icon: <ExclamationTriangleIcon className="h-5 w-5" />,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200'
        };
      default:
        return {
          icon: <InformationCircleIcon className="h-5 w-5" />,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200'
        };
    }
  };

  const { icon, color, bg, border } = getIconAndColor();

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${border} ${bg}`}>
      <div className={`flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {error.message}
        </p>
        {error.fixInstructions && error.fixInstructions.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-gray-700">How to fix:</p>
            <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
              {error.fixInstructions.map((instruction, index) => (
                <li key={`fix-${index}`}>{instruction}</li>
              ))}
            </ul>
          </div>
        )}
        {error.affectedRows && error.affectedRows.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Affected rows: {error.affectedRows.slice(0, 10).join(', ')}
            {error.affectedRows.length > 10 && ` +${error.affectedRows.length - 10} more`}
          </p>
        )}
        {error.affectedColumns && error.affectedColumns.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Affected columns: {error.affectedColumns.join(', ')}
          </p>
        )}
        {error.example && (
          <p className="text-xs text-gray-500 mt-2 font-mono bg-gray-100 p-2 rounded">
            Example: {error.example}
          </p>
        )}
      </div>
    </div>
  );
});

ErrorItem.displayName = 'ErrorItem';

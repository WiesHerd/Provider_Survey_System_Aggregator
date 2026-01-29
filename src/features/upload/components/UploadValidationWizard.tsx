/**
 * Upload Validation Wizard
 * Clean, minimal validation interface - Apple-inspired design
 * 
 * Design Philosophy:
 * - White space and breathing room
 * - Clear visual hierarchy
 * - Actionable, not alarming
 * - Progressive disclosure
 */

import React, { memo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { UploadTemplateFormat } from '../../../utils/downloadUtils';
import { CompleteValidationResult } from '../types/validation';
import { ValidationIssueList } from './ValidationIssueList';

export interface UploadValidationWizardProps {
  isVisible: boolean;
  missingColumns?: string[];
  unknownHeaders?: string[];
  requiredColumns?: string[];
  optionalColumns?: string[];
  detectedFormat?: UploadTemplateFormat;
  expectedFormats?: UploadTemplateFormat[];
  validationResult?: CompleteValidationResult | null;
  onDownloadRecommended: () => void;
  onDownloadFormat: (format: UploadTemplateFormat) => void;
  onContinueUpload?: () => void;
  reviewContent?: React.ReactNode;
}

/**
 * Clean validation display with minimal, focused design
 */
export const UploadValidationWizard: React.FC<UploadValidationWizardProps> = memo(({
  isVisible,
  missingColumns = [],
  unknownHeaders = [],
  requiredColumns = [],
  optionalColumns = [],
  detectedFormat,
  expectedFormats = [],
  validationResult,
  onDownloadRecommended,
  onDownloadFormat,
  onContinueUpload,
  reviewContent
}) => {
  const [expandedDetails, setExpandedDetails] = useState(false);

  const hasExpectedFormats = expectedFormats.length > 0;
  const hasFormatMismatch = Boolean(
    hasExpectedFormats &&
    detectedFormat &&
    !expectedFormats.includes(detectedFormat)
  );
  const hasMissingColumns = missingColumns.length > 0;
  const hasDataIssues = Boolean(validationResult && validationResult.totalIssues > 0);
  const isBlocking = hasMissingColumns || (validationResult && !validationResult.canProceed);
  const hasAnyIssues = hasFormatMismatch || hasMissingColumns || hasDataIssues;

  if (!isVisible || !hasAnyIssues) {
    return null;
  }

  const statusStyles = isBlocking
    ? {
        accent: 'border-l-red-500',
        icon: 'text-red-500',
        badge: 'text-red-700 bg-red-50 border-red-200'
      }
    : {
        accent: 'border-l-amber-500',
        icon: 'text-amber-500',
        badge: 'text-amber-700 bg-amber-50 border-amber-200'
      };

  return (
    <div className="space-y-3">
      {/* Status Bar */}
      <div className={`flex gap-3 p-4 rounded-xl border ${isBlocking ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
        {isBlocking ? (
          <XCircleIcon className={`h-5 w-5 flex-shrink-0 ${statusStyles.icon}`} />
        ) : (
          <ExclamationTriangleIcon className={`h-5 w-5 flex-shrink-0 ${statusStyles.icon}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {isBlocking ? 'Cannot upload file' : 'File needs attention'}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            {isBlocking
              ? 'Fix the issues below before uploading'
              : 'Review these recommendations for best results'}
          </p>
        </div>
      </div>

      {/* Issues */}
      <div className="space-y-4">
        {/* Format Mismatch */}
        {hasFormatMismatch && (
          <ValidationItem
            type="warning"
            title="Format mismatch"
            description={`Found ${detectedFormat}, expected ${expectedFormats.join(' or ')}`}
            action={
              <button
                onClick={onDownloadRecommended}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                Template
              </button>
            }
          />
        )}

        {/* Missing Columns */}
        {hasMissingColumns && (
          <ValidationItem
            type="error"
            title="Missing required columns"
            description={`${missingColumns.length} column${missingColumns.length === 1 ? '' : 's'} missing`}
            expandable
            details={
              <div className="space-y-2">
                <div className="text-xs text-gray-700">
                  <span className="font-medium">Missing:</span>{' '}
                  {missingColumns.join(', ')}
                </div>
                {requiredColumns.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Required:</span>{' '}
                    {requiredColumns.join(', ')}
                  </div>
                )}
              </div>
            }
            action={
              <button
                onClick={onDownloadRecommended}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                Template
              </button>
            }
          />
        )}

        {/* Data Issues */}
        {hasDataIssues && validationResult && (
          <ValidationItem
            type={validationResult.canProceed ? 'warning' : 'error'}
            title="Data validation"
            description={`${validationResult.totalIssues} issue${validationResult.totalIssues === 1 ? '' : 's'} found`}
            expandable
            details={
              <div className="pt-3">
                <ValidationIssueList validationResult={validationResult} />
              </div>
            }
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {onContinueUpload && !isBlocking && (
          <button
            onClick={onContinueUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600 shadow-sm hover:shadow-md"
          >
            Continue Upload
          </button>
        )}
        <button
          onClick={onDownloadRecommended}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download Template
        </button>
      </div>
    </div>
  );
});

UploadValidationWizard.displayName = 'UploadValidationWizard';

// Validation Item Component
interface ValidationItemProps {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  expandable?: boolean;
  details?: React.ReactNode;
  action?: React.ReactNode;
}

const ValidationItem: React.FC<ValidationItemProps> = ({
  type,
  title,
  description,
  expandable,
  details,
  action
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const colors = {
    error: {
      icon: 'text-red-500',
      accent: 'border-l-red-500',
      badge: 'text-red-700 bg-red-50 border-red-200'
    },
    warning: {
      icon: 'text-amber-500',
      accent: 'border-l-amber-500',
      badge: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    info: {
      icon: 'text-blue-500',
      accent: 'border-l-blue-500',
      badge: 'text-blue-700 bg-blue-50 border-blue-200'
    }
  };

  const style = colors[type];
  const bgClass = type === 'error' ? 'bg-red-50' : type === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
  const borderClass = type === 'error' ? 'border-red-200' : type === 'warning' ? 'border-amber-200' : 'border-blue-200';

  return (
    <div className={`flex gap-4 p-5 rounded-2xl border ${borderClass} ${bgClass} shadow-sm`}>
      <div className={`flex-shrink-0 ${style.icon} mt-0.5`}>
        {type === 'error' ? (
          <XCircleIcon className="h-5 w-5" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-5">{title}</p>
        <p className="text-sm text-gray-600 mt-1.5 leading-5">{description}</p>

        {expandable && details && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              <span>{isExpanded ? 'Hide' : 'Show'} details</span>
              <ChevronRightIcon
                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {details}
              </div>
            )}
          </>
        )}
        {!expandable && details && details}
      </div>
      
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { UploadTemplateFormat } from '../../utils/downloadUtils';

interface UploadFixGuidanceProps {
  isVisible: boolean;
  missingColumns?: string[];
  unknownHeaders?: string[];
  requiredColumns?: string[];
  optionalColumns?: string[];
  detectedFormat?: UploadTemplateFormat;
  expectedFormat?: UploadTemplateFormat;
  onDownloadRecommended: () => void;
  onDownloadFormat: (format: UploadTemplateFormat) => void;
}

export const UploadFixGuidance: React.FC<UploadFixGuidanceProps> = ({
  isVisible,
  missingColumns = [],
  unknownHeaders = [],
  requiredColumns = [],
  optionalColumns = [],
  detectedFormat,
  expectedFormat,
  onDownloadRecommended,
  onDownloadFormat
}) => {
  if (!isVisible) {
    return null;
  }

  const showFormatHint = expectedFormat && detectedFormat && expectedFormat !== detectedFormat;

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-amber-900">
              Fix your file in 3 quick steps
            </h3>
          </div>

          {showFormatHint && (
            <p className="mt-1 text-xs text-amber-800">
              Detected <span className="font-medium">{detectedFormat}</span> format, but expected{' '}
              <span className="font-medium">{expectedFormat}</span>.
            </p>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <ArrowDownTrayIcon className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-medium text-gray-900">1. Download template</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Use the template that matches your selections.
              </p>
              <button
                type="button"
                onClick={onDownloadRecommended}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                Download recommended
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-gray-900">2. Match columns</span>
              </div>
              {missingColumns.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Missing: {missingColumns.join(', ')}
                </p>
              )}
              {requiredColumns.length > 0 && (
                <p className="mt-1 text-xs text-gray-600">
                  Required: {requiredColumns.join(', ')}
                </p>
              )}
              {optionalColumns.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Optional: {optionalColumns.join(', ')}
                </p>
              )}
              {unknownHeaders.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Extra columns are okay. Detected: {unknownHeaders.slice(0, 6).join(', ')}
                  {unknownHeaders.length > 6 ? '…' : ''}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-900">3. Re-upload</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Save the file and upload it again.
              </p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onDownloadFormat('normalized')}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
                >
                  Normalized Format
                </button>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                This is the only supported format.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

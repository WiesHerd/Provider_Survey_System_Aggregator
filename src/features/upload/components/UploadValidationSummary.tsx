/**
 * Upload Validation Summary
 * Clean, minimal summary dialog for upload validation
 * 
 * Design Philosophy:
 * - Clear visual hierarchy
 * - Scannable information
 * - Actionable, not overwhelming
 * - Professional, not alarming
 */

import React, { memo } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { UploadValidationSummary as ValidationSummary } from '../types/uploadStates';

interface UploadValidationSummaryProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResults: ValidationSummary[];
  totalRows: number;
  estimatedTime: string;
}

export const UploadValidationSummary: React.FC<UploadValidationSummaryProps> = memo(({
  open,
  onClose,
  onConfirm,
  validationResults,
  totalRows,
  estimatedTime
}) => {
  if (!open) return null;

  const hasErrors = validationResults.some(result => !result.isValid);
  const hasWarnings = validationResults.some(result => result.warnings.length > 0);
  const hasDuplicates = validationResults.some(result => result.duplicateCheck?.isDuplicate);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Review before upload
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {validationResults.length} file{validationResults.length === 1 ? '' : 's'} ready to process
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasErrors && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                  <XCircleIcon className="h-4 w-4" />
                  Errors found
                </span>
              )}
              {!hasErrors && hasWarnings && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  Warnings
                </span>
              )}
              {!hasErrors && !hasWarnings && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                  <CheckCircleIcon className="h-4 w-4" />
                  Ready
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              icon={<TableCellsIcon className="h-5 w-5" />}
              value={validationResults.length.toString()}
              label="Files"
              color="indigo"
            />
            <StatCard
              icon={<DocumentTextIcon className="h-5 w-5" />}
              value={totalRows.toLocaleString()}
              label="Rows"
              color="green"
            />
            <StatCard
              icon={<ClockIcon className="h-5 w-5" />}
              value={estimatedTime}
              label="Est. time"
              color="blue"
            />
            <StatCard
              icon={hasDuplicates ? <ExclamationTriangleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
              value={hasDuplicates ? 'Yes' : 'No'}
              label="Duplicates"
              color={hasDuplicates ? 'amber' : 'green'}
            />
          </div>

          {/* Alert */}
          {hasErrors && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Cannot upload</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Some files have validation errors. Fix these issues before uploading.
                </p>
              </div>
            </div>
          )}

          {!hasErrors && hasWarnings && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Review warnings</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Files can be uploaded, but review the warnings below.
                </p>
              </div>
            </div>
          )}

          {!hasErrors && !hasWarnings && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">All files validated</p>
                <p className="text-xs text-green-700 mt-0.5">
                  No issues found. Ready to upload.
                </p>
              </div>
            </div>
          )}

          {/* File List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Files</h3>
            <div className="space-y-2">
              {validationResults.map((result, index) => (
                <FileRow key={index} result={result} />
              ))}
            </div>
          </div>

          {/* Duplicates */}
          {hasDuplicates && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Potential duplicates</h3>
              <div className="space-y-2">
                {validationResults
                  .filter(result => result.duplicateCheck?.isDuplicate)
                  .map((result, index) => (
                    <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        {result.fileName}
                      </p>
                      <p className="text-xs text-amber-700 mb-2">
                        May be similar to existing surveys:
                      </p>
                      <div className="space-y-1">
                        {result.duplicateCheck?.similarSurveys.slice(0, 3).map((survey, i) => (
                          <p key={i} className="text-xs text-amber-600">
                            • {survey.name} ({Math.round(survey.similarity * 100)}% similar)
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sample Data */}
          {validationResults[0]?.sampleData?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Data preview</h3>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {validationResults[0].detectedColumns.slice(0, 5).map((column, index) => (
                        <th
                          key={index}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                        >
                          {column}
                        </th>
                      ))}
                      {validationResults[0].detectedColumns.length > 5 && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          +{validationResults[0].detectedColumns.length - 5} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults[0].sampleData.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {validationResults[0].detectedColumns.slice(0, 5).map((column, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap"
                            title={row[column] || '-'}
                          >
                            {String(row[column] || '-').substring(0, 30)}
                            {String(row[column] || '').length > 30 ? '...' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={hasErrors}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              hasErrors
                ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {hasErrors ? 'Fix errors first' : 'Upload files'}
          </button>
        </div>
      </div>
    </div>
  );
});

UploadValidationSummary.displayName = 'UploadValidationSummary';

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: 'indigo' | 'green' | 'blue' | 'amber';
}

const StatCard: React.FC<StatCardProps> = memo(({ icon, value, label, color }) => {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600'
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-2`}>
        {icon}
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
});

StatCard.displayName = 'StatCard';

// File Row Component
interface FileRowProps {
  result: ValidationSummary;
}

const FileRow: React.FC<FileRowProps> = memo(({ result }) => {
  const hasErrors = !result.isValid;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {hasErrors ? (
            <XCircleIcon className="h-5 w-5 text-red-600" />
          ) : hasWarnings ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
          ) : (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {result.fileName}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{result.rowCount.toLocaleString()} rows</span>
              <span>·</span>
              <span>{result.columnCount} cols</span>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {result.errors.slice(0, 2).map((error, i) => (
                <p key={i} className="text-xs text-red-700">
                  • {error}
                </p>
              ))}
              {result.errors.length > 2 && (
                <p className="text-xs text-red-600">
                  • +{result.errors.length - 2} more errors
                </p>
              )}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {result.warnings.slice(0, 2).map((warning, i) => (
                <p key={i} className="text-xs text-amber-700">
                  • {warning}
                </p>
              ))}
              {result.warnings.length > 2 && (
                <p className="text-xs text-amber-600">
                  • +{result.warnings.length - 2} more warnings
                </p>
              )}
            </div>
          )}

          {result.errors.length === 0 && result.warnings.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              No issues found
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

FileRow.displayName = 'FileRow';

/**
 * Expected Columns Information Component
 * 
 * Displays the required columns for CSV uploads in an expandable, user-friendly format.
 * Enterprise-grade transparency - tells users exactly what columns are needed.
 */

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ExpectedColumnsInfoProps {
  format?: 'normalized' | 'wide';
  providerType?: 'PHYSICIAN' | 'APP' | 'CALL';
}

export const ExpectedColumnsInfo: React.FC<ExpectedColumnsInfoProps> = ({ 
  format = 'normalized',
  providerType = 'PHYSICIAN' 
}) => {
  // Enterprise UX: Collapsed by default, user expands when needed
  const [isExpanded, setIsExpanded] = useState(false);

  // Define expected columns based on format
  const normalizedColumns = [
    { name: 'specialty', required: true, description: 'Medical specialty (e.g., Cardiology, Pediatrics)' },
    { name: 'variable', required: true, description: 'Variable name (e.g., TCC, Work RVUs, Daily Rate On-Call Compensation)' },
    { name: 'n_orgs', required: true, description: 'Number of organizations reporting' },
    { name: 'n_incumbents', required: true, description: 'Number of individual providers' },
    { name: 'p25', required: true, description: '25th percentile value' },
    { name: 'p50', required: true, description: '50th percentile (median) value' },
    { name: 'p75', required: true, description: '75th percentile value' },
    { name: 'p90', required: true, description: '90th percentile value' },
    { name: 'geographic_region', required: false, description: 'Geographic region (optional)' },
    { name: 'provider_type', required: false, description: 'Provider type (optional)' }
  ];

  const wideColumns = [
    { name: 'specialty', required: true, description: 'Medical specialty' },
    { name: 'provider_type', required: true, description: 'Provider type (e.g., Staff Physician, APP)' },
    { name: 'geographic_region', required: true, description: 'Geographic region' },
    { name: 'tcc_p25, tcc_p50, tcc_p75, tcc_p90', required: false, description: 'Total Cash Compensation percentiles (optional)' },
    { name: 'wrvu_p25, wrvu_p50, wrvu_p75, wrvu_p90', required: false, description: 'Work RVU percentiles (optional)' },
    { name: 'cf_p25, cf_p50, cf_p75, cf_p90', required: false, description: 'Conversion Factor percentiles (optional)' }
  ];

  const columns = format === 'normalized' ? normalizedColumns : wideColumns;
  const requiredColumns = columns.filter(c => c.required);
  const optionalColumns = columns.filter(c => !c.required);

  // Handle column name variations for display
  const getDisplayName = (columnName: string): string => {
    const variations: Record<string, string> = {
      'variable': 'Variable / Benchmark',
      'n_orgs': 'Group Count / n_orgs',
      'n_incumbents': 'Indv Count / n_incumbents',
      'p25': '25th% / p25',
      'p50': '50th% / p50',
      'p75': '75th% / p75',
      'p90': '90th% / p90'
    };
    return variations[columnName] || columnName;
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">
            Expected Column Format ({format === 'normalized' ? 'Normalized' : 'Wide'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 space-y-5 border-t border-gray-200">
          {/* Required Columns */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Required Columns
            </h4>
            <div className="space-y-2">
              {requiredColumns.map((column, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                      Required
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-semibold text-gray-900">
                        {getDisplayName(column.name)}
                      </code>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{column.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Columns */}
          {optionalColumns.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Optional Columns
              </h4>
              <div className="space-y-2">
                {optionalColumns.map((column, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                        Optional
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-semibold text-gray-700">
                          {getDisplayName(column.name)}
                        </code>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{column.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Format-specific notes - Google-style subtle info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-700 leading-relaxed">
              <span className="font-medium text-gray-900">Note:</span> Column names are case-insensitive and accept variations. 
              For example, "Benchmark" maps to "variable", "Group Count" maps to "n_orgs", 
              and "25th%" maps to "p25".
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


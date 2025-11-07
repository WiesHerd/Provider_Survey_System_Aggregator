/**
 * Blended Results Preview Component
 * 
 * Shows a preview of blended metrics before creating the final blend
 * Appears after selections are made and blending method is chosen
 */

import React, { useMemo } from 'react';
import { formatNumber } from '../../../shared/utils/formatters';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BlendedMetrics {
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  totalRecords: number;
  specialties: string[];
  method: 'weighted' | 'simple' | 'custom';
}

interface BlendedResultsPreviewProps {
  metrics: BlendedMetrics | null;
  blendingMethod: 'weighted' | 'simple' | 'custom';
  selectedCount: number;
  onCreateBlend: () => void;
  isCreating?: boolean;
  selectedDataRows?: number[];
  filteredSurveyData?: any[];
  customWeights?: Record<number, number>;
}

export const BlendedResultsPreview: React.FC<BlendedResultsPreviewProps> = ({
  metrics,
  blendingMethod,
  selectedCount,
  onCreateBlend,
  isCreating = false,
  selectedDataRows = [],
  filteredSurveyData = [],
  customWeights = {}
}) => {
  const methodLabels = {
    weighted: 'Weighted by incumbent count',
    simple: 'Simple average (equal weights)',
    custom: 'Custom weights applied'
  };

  // Validate percentile ordering (must be before early return)
  const hasPercentileIssues = useMemo(() => {
    if (!metrics) return false;
    return (
      metrics.cf_p90 < metrics.cf_p75 ||
      metrics.cf_p75 < metrics.cf_p50 ||
      metrics.tcc_p90 < metrics.tcc_p75 ||
      metrics.wrvu_p90 < metrics.wrvu_p75
    );
  }, [metrics]);

  // Early return after hooks
  if (!metrics || selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Step 4: Preview Blended Results
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {methodLabels[blendingMethod]}
              {' • '}{metrics.specialties.slice(0, 3).join(', ')}
              {metrics.specialties.length > 3 && ` +${metrics.specialties.length - 3} more`}
              {' • '}{metrics.totalRecords.toLocaleString()} records
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCreateBlend}
              disabled={isCreating}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Create Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="px-6 py-6">
        {/* Google-style metrics table */}
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P25
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P50
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P75
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P90
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <div className="text-sm font-medium text-gray-900">Total Cash Compensation</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(metrics.tcc_p25, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  {formatNumber(metrics.tcc_p50, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(metrics.tcc_p75, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 border-r-2 border-gray-300">
                  {formatNumber(metrics.tcc_p90, 0)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div className="text-sm font-medium text-gray-900">Work RVUs</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(metrics.wrvu_p25, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  {formatNumber(metrics.wrvu_p50, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(metrics.wrvu_p75, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 border-r-2 border-gray-300">
                  {formatNumber(metrics.wrvu_p90, 0)}
                </td>
              </tr>
              <tr className={`hover:bg-gray-50 border-t-2 border-gray-200 ${hasPercentileIssues ? 'bg-amber-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <div className="text-sm font-medium text-gray-900">Conversion Factor</div>
                    {hasPercentileIssues && (
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 ml-2" title="Percentile ordering issue detected" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  ${formatNumber(metrics.cf_p25, 2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  ${formatNumber(metrics.cf_p50, 2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${metrics.cf_p90 < metrics.cf_p75 ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                  ${formatNumber(metrics.cf_p75, 2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${metrics.cf_p90 < metrics.cf_p75 ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                  ${formatNumber(metrics.cf_p90, 2)}
                  {metrics.cf_p90 < metrics.cf_p75 && (
                    <span className="ml-1 text-xs" title="P90 is lower than P75 - this is unusual">
                      ⚠
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};


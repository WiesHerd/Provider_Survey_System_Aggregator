/**
 * Data Quality Indicator Component
 * 
 * Shows data quality metrics (sample sizes, completeness)
 */

import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { DataQualityIndicatorProps } from '../types/reportBuilder';
import { calculateTotalCount } from '../utils/reportCalculations';

export const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({
  chartData,
  totalRecords,
  filteredRecords
}) => {
  const totalCount = calculateTotalCount(chartData);
  const dataCompleteness = totalRecords > 0 ? (filteredRecords / totalRecords * 100).toFixed(1) : '0';

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start">
        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Data Quality</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Total Records:</span>
              <span className="ml-2 text-blue-900">{totalRecords.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Filtered Records:</span>
              <span className="ml-2 text-blue-900">{filteredRecords.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Data Points:</span>
              <span className="ml-2 text-blue-900">{totalCount.toLocaleString()}</span>
            </div>
          </div>
          {parseFloat(dataCompleteness) < 50 && (
            <div className="mt-2 text-xs text-amber-700">
              ⚠️ Low data completeness ({dataCompleteness}%) - consider adjusting filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};










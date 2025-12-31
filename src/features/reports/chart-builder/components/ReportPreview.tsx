/**
 * Report Preview Component
 * 
 * Wrapper for chart and table preview with quality indicators
 */

import React from 'react';
import { ReportChart } from './ReportChart';
import { ReportTable } from './ReportTable';
import { ErrorBoundary } from './ErrorBoundary';
import { ChartDataItem, ReportConfigInput } from '../types/reportBuilder';
import { EmptyState } from '../../../mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';

interface ReportPreviewProps {
  config: ReportConfigInput;
  chartData: ChartDataItem[];
  tableData: ChartDataItem[];
  totalRecords: number;
  filteredRecords: number;
  onSort?: (desc: boolean) => void;
  sortDesc?: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  config,
  chartData,
  tableData,
  totalRecords,
  filteredRecords,
  onSort,
  sortDesc
}) => {
  const getPreviewDescription = () => {
    const metricLabelMap: Record<string, string> = {
      'tcc_p25': 'TCC 25th', 'tcc_p50': 'TCC 50th', 'tcc_p75': 'TCC 75th', 'tcc_p90': 'TCC 90th',
      'wrvu_p25': 'wRVU 25th', 'wrvu_p50': 'wRVU 50th', 'wrvu_p75': 'wRVU 75th', 'wrvu_p90': 'wRVU 90th',
      'cf_p25': 'CF 25th', 'cf_p50': 'CF 50th', 'cf_p75': 'CF 75th', 'cf_p90': 'CF 90th'
    };
    const yearsText = config.filters.years.length > 0 ? `(${config.filters.years.join(', ')})` : '';
    const regionsText = config.filters.regions.length > 0 ? `${config.filters.regions.length} regions` : 'All regions';
    const sourcesText = config.filters.surveySources.length > 0 ? `${config.filters.surveySources.length} sources` : 'All sources';
    const specialtiesText = config.dimension === 'specialty' ? (
      config.filters.specialties.length > 0 ? `${config.filters.specialties.length} specialties` : 'All specialties'
    ) : '';
    return `${config.dimension.replace('_',' ')} × ${metricLabelMap[config.metric] || config.metric} ${yearsText} • ${chartData.length} items • ${regionsText} • ${sourcesText}${specialtiesText ? ' • ' + specialtiesText : ''}`;
  };

  // Check if any filters are actually applied
  const hasActiveFilters = 
    config.filters.specialties.length > 0 ||
    config.filters.regions.length > 0 ||
    config.filters.surveySources.length > 0 ||
    config.filters.providerTypes.length > 0 ||
    config.filters.years.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {config.name || 'Report Preview'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {getPreviewDescription()}
          </p>
        </div>
      </div>
      <div className="px-6 py-6">
        <ErrorBoundary>
          {chartData.length > 0 ? (
            <>
              <ReportChart
                chartData={chartData}
                chartType={config.chartType}
                metrics={config.metrics}
                metric={config.metric}
              />
              <ReportTable
                tableData={tableData}
                dimension={config.dimension}
                metrics={config.metrics}
                metric={config.metric}
                onSort={onSort}
                sortDesc={sortDesc}
              />
            </>
          ) : hasActiveFilters ? (
            // Only show empty state if filters are applied but no data matches
            <EmptyState
              icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
              title="No Data Available"
              message="No data matches your current filter selections. Try adjusting your filters to see results."
            />
          ) : null}
        </ErrorBoundary>
      </div>
    </div>
  );
};


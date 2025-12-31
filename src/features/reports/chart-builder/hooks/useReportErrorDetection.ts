/**
 * Hook for detecting and managing report errors
 * 
 * Extracted from CustomReports for better testability and maintainability
 */

import { useState, useEffect } from 'react';
import { ErrorContext } from '../components/EnhancedErrorMessage';
import { ReportConfigInput, ReportFilters, ChartDataItem } from '../types/reportBuilder';

interface UseReportErrorDetectionParams {
  loading: boolean;
  totalRecords: number;
  chartData: ChartDataItem[];
  config: ReportConfigInput;
  updateFilter: (filterType: keyof ReportFilters, value: string[]) => void;
}

/**
 * Detects various error conditions in report data and configuration
 * Returns error context with suggestions and actions
 */
export const useReportErrorDetection = ({
  loading,
  totalRecords,
  chartData,
  config,
  updateFilter
}: UseReportErrorDetectionParams) => {
  const [error, setError] = useState<ErrorContext | null>(null);

  useEffect(() => {
    // No data available
    if (!loading && totalRecords === 0) {
      setError({
        type: 'no_data',
        message: 'No survey data available',
        suggestions: [
          'Upload survey data from the Upload screen',
          'Check that surveys contain data for the selected year',
          'Verify that data has been properly processed'
        ]
      });
      return;
    }

    // Data exists but no results after filtering
    if (!loading && chartData.length === 0 && totalRecords > 0) {
      const hasFilters = 
        config.filters.specialties.length > 0 ||
        config.filters.regions.length > 0 ||
        config.filters.surveySources.length > 0 ||
        config.filters.providerTypes.length > 0 ||
        config.filters.years.length > 0;
      
      if (hasFilters) {
        setError({
          type: 'filter_too_restrictive',
          message: 'No data matches your current filter selection',
          suggestions: [
            'Try removing some filters to expand your selection',
            'Select more specialties or regions',
            'Check if data exists for the selected survey sources'
          ],
          onAction: () => {
            updateFilter('specialties', []);
            updateFilter('regions', []);
            updateFilter('surveySources', []);
            updateFilter('providerTypes', []);
            updateFilter('years', []);
          },
          actionLabel: 'Clear All Filters'
        });
        return;
      }

      // Specialty dimension requires specialty selection
      if (config.dimension === 'specialty' && config.filters.specialties.length === 0) {
        setError({
          type: 'no_specialties',
          message: 'Please select at least one specialty to view data',
          suggestions: [
            'Select specialties from the filter dropdown',
            'Try selecting multiple specialties for comparison'
          ]
        });
        return;
      }
    }

    // No error conditions detected
    setError(null);
  }, [loading, totalRecords, chartData.length, config, updateFilter]);

  return { error, setError };
};








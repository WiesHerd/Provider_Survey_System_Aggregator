/**
 * Analytics Export Hook
 * 
 * Custom hook for managing analytics data export functionality.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { useState, useCallback } from 'react';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';
import { DynamicAggregatedData } from '../types/variables';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';

interface UseAnalyticsExportReturn {
  exportToCSV: (data: AggregatedData[] | DynamicAggregatedData[], filters: AnalyticsFilters, selectedVariables: string[]) => void;
  exportToExcel: (data: AggregatedData[] | DynamicAggregatedData[], filters: AnalyticsFilters, selectedVariables: string[]) => void;
  isExporting: boolean;
}

/**
 * Custom hook for managing analytics export functionality
 * 
 * @returns Object containing export functions and loading state
 */
export const useAnalyticsExport = (): UseAnalyticsExportReturn => {
  const [isExporting, setIsExporting] = useState(false);

  // CSV export handler
  const handleExportToCSV = useCallback(async (data: AggregatedData[] | DynamicAggregatedData[], filters: AnalyticsFilters, selectedVariables: string[]) => {
    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    try {
      setIsExporting(true);
      exportToCSV(data, filters, selectedVariables);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Excel export handler
  const handleExportToExcel = useCallback(async (data: AggregatedData[] | DynamicAggregatedData[], filters: AnalyticsFilters, selectedVariables: string[]) => {
    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    try {
      setIsExporting(true);
      exportToExcel(data, filters, selectedVariables);
    } catch (error) {
      console.error('Failed to export Excel:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportToCSV: handleExportToCSV,
    exportToExcel: handleExportToExcel,
    isExporting
  };
};

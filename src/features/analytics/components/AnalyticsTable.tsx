/**
 * Analytics Feature - Data Table Component
 * 
 * This component displays analytics data in a structured table format.image.png
 * 
 * Following enterprise patterns for component composition and performance.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
// Removed Material-UI table imports - using HTML table instead
import { AnalyticsTableProps } from '../types/analytics';
import { calculateSummaryRows } from '../utils/analyticsCalculations';
import { AnalysisProgressBar, ModernPagination } from '../../../shared/components';
import { BoltIcon } from '@heroicons/react/24/outline';
import { useMemoizedGrouping, useMemoizedColumnGroups } from '../hooks/useMemoizedCalculations';
import { AnalyticsTableControls } from './AnalyticsTableControls';
import { AnalyticsTableHeader } from './AnalyticsTableHeader';
import { AnalyticsTableRow } from './AnalyticsTableRow';
import { AnalyticsSummaryRow } from './AnalyticsSummaryRow';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';

// formatRegionForDisplay is now imported from shared utils

/**
 * AnalyticsTable component for displaying analytics data
 * 
 * @param data - The analytics data to display
 * @param loading - Loading state
 * @param error - Error state
 * @param onExport - Export callback function
 */
export const AnalyticsTable: React.FC<AnalyticsTableProps> = memo(({
  data,
  loading,
  loadingProgress,
  error,
  onExport,
  onFormatVariables,
  selectedVariables = [], // Default to empty array for backward compatibility
  formattingRules = [] // Default to empty array for backward compatibility
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Production-grade: All data is in dynamic format
  // No conditional logic needed - unified data structure
  
  // Use memoized column groups for dynamic variables
  const columnGroups = useMemoizedColumnGroups(selectedVariables, true);
  
  // Use memoized grouping to avoid recalculation
  const groupedData = useMemoizedGrouping(data);
  
  // Pagination calculations
  const totalSpecialties = Object.keys(groupedData).length;
  const totalPages = Math.ceil(totalSpecialties / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Get paginated specialties
  const paginatedSpecialties = useMemo(() => {
    const specialties = Object.keys(groupedData);
    return specialties.slice(startIndex, endIndex);
  }, [groupedData, startIndex, endIndex]);

  // Production-grade: Unified summary calculation for all specialties
  const summaryRowsCache = useMemo(() => {
    const cache: Record<string, any> = {};
    Object.keys(groupedData).forEach(specialty => {
      const rows = groupedData[specialty];
      // Single calculation function for all data
      cache[specialty] = calculateSummaryRows(rows, selectedVariables);
    });
    return cache;
  }, [groupedData, selectedVariables]);

  // Helper function to get cached summary rows
  const getSummaryRows = useCallback((specialty: string) => {
    return summaryRowsCache[specialty] || { simple: {}, weighted: {} };
  }, [summaryRowsCache]);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  // Handle items per page change
  const handleItemsPerPageChange = useCallback((newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1); // Reset to first page
  }, []);

  if (loading) {
    return (
      <AnalysisProgressBar
        message="Loading analytics data..."
        progress={loadingProgress || 0}
        recordCount={data.length}
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <BoltIcon className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Benchmarking Data Available</h3>
          <p className="text-gray-600 mb-4">All specialties are mapped, or no survey data is available.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <BoltIcon className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <BoltIcon className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Benchmarking Data Available</h3>
          <p className="text-gray-600 mb-4">All specialties are mapped, or no survey data is available.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <BoltIcon className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 w-full max-w-full" style={{ overflow: 'hidden' }}>
      {/* Control buttons */}
      <AnalyticsTableControls
        onExport={onExport}
        onFormatVariables={onFormatVariables}
      />

      {/* HTML Table with frozen headers */}
      <div 
        className="rounded-xl border border-gray-200 shadow-sm"
        style={{ 
          maxHeight: '600px',
          maxWidth: '100%',
          overflow: 'auto',
          backgroundColor: 'white',
          position: 'relative'
        }}
      >
        <table 
          className="w-full border-collapse"
          style={{ 
            minWidth: '1200px',
            borderSpacing: '0',
            borderCollapse: 'collapse',
            position: 'relative'
          }}
        >
          <AnalyticsTableHeader
            columnGroups={columnGroups}
            selectedVariables={selectedVariables}
          />
          <tbody>
            {paginatedSpecialties.map((specialty) => {
              const rows = groupedData[specialty];
              const firstRow = rows[0];
              const surveySource = firstRow?.surveySource || '';
              
              return (
                <React.Fragment key={specialty}>
                {/* Data Rows */}
                {rows.map((row, index) => (
                  <AnalyticsTableRow
                    key={`${row.surveySource}-${row.geographicRegion}-${index}`}
                    row={row}
                    selectedVariables={selectedVariables}
                    index={index}
                    formattingRules={formattingRules}
                    showSpecialty={true} // Show specialty on all rows
                    showSurveySource={true} // Show survey source on all rows
                    specialty={specialty}
                    surveySource={surveySource}
                  />
                ))}

                {/* Summary Rows */}
                <AnalyticsSummaryRow
                  specialty={specialty}
                  summaryData={getSummaryRows(specialty)}
                  selectedVariables={selectedVariables}
                  formattingRules={formattingRules}
                  showSpecialty={false}
                  showSurveySource={false}
                />
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modern Pagination - Consistent with other screens */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <ModernPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={itemsPerPage}
            totalRows={totalSpecialties}
            onPageChange={handlePageChange}
            onPageSizeChange={handleItemsPerPageChange}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </div>
      )}
    </div>
  );
});

AnalyticsTable.displayName = 'AnalyticsTable';

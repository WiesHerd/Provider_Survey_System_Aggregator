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
import { EmptyState } from '../../mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';
import { useMemoizedGrouping, useMemoizedColumnGroups } from '../hooks/useMemoizedCalculations';
import { AnalyticsTableControls } from './AnalyticsTableControls';
import { AnalyticsTableHeader } from './AnalyticsTableHeader';
import { AnalyticsTableRow } from './AnalyticsTableRow';
import { AnalyticsSummaryRow } from './AnalyticsSummaryRow';

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <EmptyState
          icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
          title="No Benchmarking Data Available"
          message="Try adjusting your filters to see results. Upload surveys and complete mappings to generate analytics data."
        />
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
                  />
                ))}

                {/* Summary Rows */}
                <AnalyticsSummaryRow
                  specialty={specialty}
                  summaryData={getSummaryRows(specialty)}
                  selectedVariables={selectedVariables}
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

/**
 * Analytics Feature - Data Table Component
 * 
 * This component displays analytics data in a structured table format.image.png
 * 
 * Following enterprise patterns for component composition and performance.
 */

import React, { memo, useState, useMemo, useCallback, useEffect } from 'react';
// Removed Material-UI table imports - using HTML table instead
import { AnalyticsTableProps } from '../types/analytics';
import { calculateSummaryRows } from '../utils/analyticsCalculations';
import { AnalysisProgressBar, ModernPagination } from '../../../shared/components';
import { BoltIcon, ArrowDownTrayIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useMemoizedGrouping, useMemoizedColumnGroups } from '../hooks/useMemoizedCalculations';
import { AnalyticsTableHeader } from './AnalyticsTableHeader';
import { AnalyticsTableRow } from './AnalyticsTableRow';
import { AnalyticsSummaryRow } from './AnalyticsSummaryRow';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { EmptyState } from '../../mapping/components/shared/EmptyState';

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
  formattingRules = [], // Default to empty array for backward compatibility
  isExporting = false // New prop for export state
}) => {
  // CRITICAL DEBUG: Log selectedVariables received by AnalyticsTable
  useEffect(() => {
    const { formatVariableDisplayName } = require('../utils/variableFormatters');
    console.log('🔍 AnalyticsTable: Received selectedVariables:', {
      count: selectedVariables.length,
      variables: selectedVariables,
      hasBaseSalary: selectedVariables.includes('base_salary'),
      hasOnCallComp: selectedVariables.includes('on_call_compensation'),
      allVariables: selectedVariables.map(v => ({ 
        key: v, 
        displayName: formatVariableDisplayName(v) 
      }))
    });
  }, [selectedVariables]);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    specialty: true,
    surveySource: true,
    region: true,
    providerType: true
  });
  
  // Production-grade: All data is in dynamic format
  // No conditional logic needed - unified data structure
  
  // Use memoized column groups for dynamic variables
  const columnGroups = useMemoizedColumnGroups(selectedVariables, true);
  
  // CRITICAL FIX: Reset pagination to page 1 when data changes (e.g., filters change)
  // This ensures that when switching between "Call Pay" and "All Categories", 
  // the user sees data from the beginning instead of staying on a page that might not have Call Pay data
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]); // Reset when data length changes (which happens when filters change)
  
  // No grouping - use data directly for global averaging
  // ENTERPRISE PERFORMANCE: Cap at 500 rows per page for optimal performance when "All" is selected
  // Rendering more than 500 rows in a standard HTML table causes significant performance degradation
  const paginatedData = useMemo(() => {
    // CRITICAL FIX: For "All" option, use 500 rows per page and allow pagination through all data
    // This allows users to see all data while maintaining performance
    const effectiveItemsPerPage = itemsPerPage >= data.length ? 500 : itemsPerPage;
    const safeItemsPerPage = effectiveItemsPerPage > 0 ? effectiveItemsPerPage : 10;
    const startIndex = (currentPage - 1) * safeItemsPerPage;
    const endIndex = startIndex + safeItemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);
  
  // Pagination calculations
  const totalRows = data.length;
  // ENTERPRISE FIX: Prevent division by zero and handle edge cases
  // CRITICAL FIX: For "All" option, use 500 rows per page for pagination calculation
  const effectiveItemsPerPage = itemsPerPage >= totalRows ? 500 : itemsPerPage;
  const safeItemsPerPage = effectiveItemsPerPage > 0 ? effectiveItemsPerPage : 10;
  const totalPages = Math.ceil(totalRows / safeItemsPerPage);

  // Global summary calculation for all visible data
  const globalSummaryData = useMemo(() => {
    return calculateSummaryRows(data, selectedVariables);
  }, [data, selectedVariables]);

  // Helper function to get global summary rows
  const getGlobalSummaryRows = useCallback((rows: any[]) => {
    return calculateSummaryRows(rows, selectedVariables);
  }, [selectedVariables]);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  // Handle items per page change
  const handleItemsPerPageChange = useCallback((newPageSize: number) => {
    // CRITICAL FIX: Allow "All" option - set to totalRows to show all data
    // Remove artificial 1000 limit - users should be able to see all their data
    const validPageSize = newPageSize > 0 ? newPageSize : 10;
    setItemsPerPage(validPageSize);
    setCurrentPage(1); // Reset to first page
  }, []);
  
  // Handle column visibility toggle
  const handleColumnToggle = useCallback((column: keyof typeof columnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
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
      {/* Column Visibility Controls with View Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Column Visibility</h4>
          {/* View Controls Toolbar - Format and Export grouped together */}
          <div className="flex items-center gap-2">
            {/* Format Variables - Icon Button */}
            <div className="relative group">
              <button
                onClick={onFormatVariables}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full border border-gray-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                aria-label="Format variables"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  Format Variables
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Export Data - Icon Button */}
            <div className="relative group">
              <button
                onClick={onExport}
                disabled={isExporting}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full border border-gray-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={isExporting ? "Exporting data" : "Export data"}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  {isExporting ? 'Exporting...' : 'Export Data'}
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={columnVisibility.specialty}
              onChange={() => handleColumnToggle('specialty')}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
              style={{ accentColor: '#9333ea' }}
            />
            <span className="text-sm text-gray-700">Specialty</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={columnVisibility.surveySource}
              onChange={() => handleColumnToggle('surveySource')}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
              style={{ accentColor: '#9333ea' }}
            />
            <span className="text-sm text-gray-700">Survey Source</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={columnVisibility.region}
              onChange={() => handleColumnToggle('region')}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
              style={{ accentColor: '#9333ea' }}
            />
            <span className="text-sm text-gray-700">Region</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={columnVisibility.providerType}
              onChange={() => handleColumnToggle('providerType')}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
              style={{ accentColor: '#9333ea' }}
            />
            <span className="text-sm text-gray-700">Provider Type</span>
          </label>
        </div>
      </div>

      {/* Show empty state when no variables are selected */}
      {selectedVariables.length === 0 ? (
        <div className="rounded-xl border border-gray-200 shadow-sm bg-white">
          <EmptyState
            icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
            title="No Variables Selected"
            message="Please select at least one variable from the 'Display Variables' dropdown above to view data in the table."
          />
        </div>
      ) : (
        /* HTML Table with frozen headers */
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
            minWidth: `${400 + (Object.values(columnVisibility).filter(Boolean).length * 150) + (selectedVariables.length * 100)}px`,
            width: 'auto',
            borderSpacing: '0',
            borderCollapse: 'collapse',
            position: 'relative'
          }}
        >
          <AnalyticsTableHeader
            columnGroups={columnGroups}
            selectedVariables={selectedVariables}
            columnVisibility={columnVisibility}
          />
          <tbody>
            {/* All Data Rows - No grouping */}
            {/* ENTERPRISE PERFORMANCE: Use stable keys and memoization for better rendering */}
            {paginatedData.map((row, index) => {
              // Extract specialty name for display
              const specialty = row.standardizedName || row.surveySpecialty || 'Unknown';
              const surveySource = row.surveySource || '';
              
              // CRITICAL: Use stable, unique key for React optimization
              // Use actual row data for key, not index-based
              const stableKey = `${row.surveySource || 'unknown'}-${row.geographicRegion || 'unknown'}-${row.providerType || 'unknown'}-${specialty}-${index}`;
              
              return (
                <AnalyticsTableRow
                  key={stableKey}
                  row={row}
                  selectedVariables={selectedVariables}
                  index={index}
                  formattingRules={formattingRules}
                  showSpecialty={columnVisibility.specialty}
                  showSurveySource={columnVisibility.surveySource}
                  showRegion={columnVisibility.region}
                  showProviderType={columnVisibility.providerType}
                  specialty={specialty}
                  surveySource={surveySource}
                />
              );
            })}

            {/* Global Summary Rows - One set for all visible data */}
            {paginatedData.length > 0 && (
              <AnalyticsSummaryRow
                specialty="All Data"
                summaryData={getGlobalSummaryRows(paginatedData)}
                selectedVariables={selectedVariables}
                formattingRules={formattingRules}
                showSpecialty={columnVisibility.specialty}
                showSurveySource={columnVisibility.surveySource}
                showRegion={columnVisibility.region}
                showProviderType={columnVisibility.providerType}
              />
            )}
          </tbody>
        </table>
        </div>
      )}

      {/* Modern Pagination - Only show when variables are selected and data exists */}
      {selectedVariables.length > 0 && (
        <div className="pagination-container">
        <ModernPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={itemsPerPage}
          totalRows={totalRows}
          onPageChange={handlePageChange}
          onPageSizeChange={handleItemsPerPageChange}
            pageSizeOptions={[10, 25, 50, 100, 250, 500]}
        />
        </div>
      )}
    </div>
  );
});

AnalyticsTable.displayName = 'AnalyticsTable';

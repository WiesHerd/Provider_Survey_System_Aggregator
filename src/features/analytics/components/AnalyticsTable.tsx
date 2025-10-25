/**
 * Analytics Feature - Data Table Component
 * 
 * This component displays analytics data in a structured table format.image.png
 * 
 * Following enterprise patterns for component composition and performance.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
// Removed Material-UI table imports - using HTML table instead
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { AnalyticsTableProps } from '../types/analytics';
import { calculateSummaryRows } from '../utils/analyticsCalculations';
import { formatCurrency, formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { 
  formatVariableValue, 
  getVariableLightBackgroundColor,
  mapVariableNameToStandard
} from '../utils/variableFormatters';
import { DynamicAggregatedData } from '../types/variables';
import { AnalysisProgressBar, ModernPagination } from '../../../shared/components';
import { EmptyState } from '../../mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';
import { useMemoizedGrouping, useMemoizedColumnGroups } from '../hooks/useMemoizedCalculations';

/**
 * Format region name for display in proper case
 */
const formatRegionForDisplay = (region: string): string => {
  if (!region) return 'Unknown';
  
  const lower = region.toLowerCase();
  
  if (lower.includes('northeast') || lower.includes('northeastern') || lower.includes('ne')) {
    return 'Northeast';
  } else if (lower.includes('southeast') || lower.includes('southern') || lower.includes('se')) {
    return 'South';
  } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('north central') || lower.includes('nc')) {
    return 'Midwest';
  } else if (lower.includes('west') || lower.includes('western')) {
    return 'West';
  } else if (lower.includes('national')) {
    return 'National';
  }
  
  // Default: capitalize first letter
  return region.charAt(0).toUpperCase() + region.slice(1).toLowerCase();
};

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
  selectedVariables = [] // Default to empty array for backward compatibility
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Freeze state for left columns
  const [freezeLeftColumns, setFreezeLeftColumns] = useState(true);
  
  // Debug logging
  console.log('🔍 AnalyticsTable: freezeLeftColumns state:', freezeLeftColumns);
  
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
      {/* Control buttons positioned at top right */}
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={() => setFreezeLeftColumns(!freezeLeftColumns)}
          className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl ${
            freezeLeftColumns 
              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white focus:ring-green-500' 
              : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white focus:ring-gray-500'
          }`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {freezeLeftColumns ? 'Unfreeze Left Columns' : 'Freeze Left Columns'}
        </button>
        <button
          onClick={onExport}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          Export Data
        </button>
      </div>

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
          <thead style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 10, 
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <tr style={{ margin: '0', padding: '0' }}>
              {/* Survey Data Section Header */}
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: freezeLeftColumns ? '#e9ecef' : '#F5F5F5', 
                  borderRight: '1px solid #E0E0E0',
                  borderBottom: 'none',
                  textAlign: 'center',
                  color: '#424242',
                  position: freezeLeftColumns ? 'sticky' : 'static',
                  left: freezeLeftColumns ? 0 : 'auto',
                  top: 0,
                  zIndex: freezeLeftColumns ? 15 : 'auto',
                  minWidth: '440px',
                  padding: '12px 8px',
                  boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
                }} 
                colSpan={3}
              >
                Survey Data
              </th>
              
              {/* DYNAMIC: Generate headers for selected variables */}
              {columnGroups.length > 0 && columnGroups.map((group, index) => (
                <th 
                  key={group.normalizedName}
                  style={{
                    fontWeight: 'bold',
                    backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                    textAlign: 'center',
                    borderRight: '1px solid #E0E0E0',
                    borderBottom: 'none',
                    position: 'sticky',
                    top: 0,
                    zIndex: 11,
                    padding: '12px 8px'
                  }}
                  colSpan={6}
                >
                  {group.displayName}
                </th>
              ))}
              
              {/* FALLBACK: Original hardcoded headers for backward compatibility */}
              {columnGroups.length === 0 && (
                <>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E3F2FD', 
                  borderRight: '1px solid #E0E0E0',
                  borderBottom: 'none',
                  textAlign: 'center',
                  color: '#1976D2',
                  position: 'sticky',
                  top: 0,
                  zIndex: 11,
                  padding: '12px 8px'
                }} 
                colSpan={6}
              >
                Total Cash Compensation
              </th>
              
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E8F5E8', 
                  borderRight: '1px solid #E0E0E0',
                  borderBottom: 'none',
                  textAlign: 'center',
                  color: '#388E3C',
                  position: 'sticky',
                  top: 0,
                  zIndex: 11,
                  padding: '12px 8px'
                }} 
                colSpan={6}
              >
                Productivity - wRVUs
              </th>
              
              <th 
                style={{ 
                  fontWeight: 'bold',
                  backgroundColor: '#FFF3E0', 
                  borderBottom: 'none',
                  textAlign: 'center',
                  color: '#F57C00',
                  position: 'sticky',
                  top: 0,
                  zIndex: 11,
                  padding: '12px 8px'
                }} 
                colSpan={6}
              >
                Conversion Factors
              </th>
                </>
              )}
            </tr>
            
            {/* Sub-header row with column names */}
            <tr style={{
              borderBottom: 'none',
              marginTop: '0',
              marginBottom: '0'
            }}>
              {/* Survey Data Sub-headers */}
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: freezeLeftColumns ? '#e9ecef' : '#F5F5F5',
                  position: freezeLeftColumns ? 'sticky' : 'static',
                  left: freezeLeftColumns ? 0 : 'auto',
                  top: freezeLeftColumns ? '48px' : 'auto',
                  zIndex: freezeLeftColumns ? 15 : 'auto',
                  minWidth: '140px',
                  padding: '8px',
                  textAlign: 'left',
                  borderBottom: 'none',
                  boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Survey Source
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: freezeLeftColumns ? '#e9ecef' : '#F5F5F5',
                  position: freezeLeftColumns ? 'sticky' : 'static',
                  left: freezeLeftColumns ? '140px' : 'auto',
                  top: freezeLeftColumns ? '48px' : 'auto',
                  zIndex: freezeLeftColumns ? 15 : 'auto',
                  minWidth: '180px',
                  padding: '8px',
                  textAlign: 'left',
                  borderBottom: 'none',
                  boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Specialty
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: freezeLeftColumns ? '#e9ecef' : '#F5F5F5',
                  position: freezeLeftColumns ? 'sticky' : 'static',
                  left: freezeLeftColumns ? '320px' : 'auto',
                  top: freezeLeftColumns ? '48px' : 'auto',
                  zIndex: freezeLeftColumns ? 15 : 'auto',
                  minWidth: '120px',
                  borderRight: '1px solid #E0E0E0',
                  padding: '8px',
                  textAlign: 'left',
                  borderBottom: 'none',
                  boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Region
              </th>
               
              {/* DYNAMIC: Generate sub-headers for selected variables */}
              {columnGroups.length > 0 && columnGroups.map((group, index) => (
                <React.Fragment key={group.normalizedName}>
                  <th 
                    style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                      position: 'sticky',
                      top: '48px',
                      zIndex: 11,
                      padding: '8px',
                      textAlign: 'right',
                      borderBottom: 'none'
                    }}
                  >
                    # Orgs
                  </th>
                  <th 
                    style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                      position: 'sticky',
                      top: '48px',
                      zIndex: 11,
                      padding: '8px',
                      textAlign: 'right',
                      borderBottom: 'none'
                    }}
                  >
                    # Inc
                  </th>
                  <th 
                    style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                      position: 'sticky',
                      top: '48px',
                      zIndex: 11,
                      padding: '8px',
                      textAlign: 'right',
                      borderBottom: 'none'
                    }}
                  >
                    P25
                  </th>
                  <th 
                    style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                      position: 'sticky',
                      top: '48px',
                      zIndex: 11,
                      padding: '8px',
                      textAlign: 'right',
                      borderBottom: 'none'
                    }}
                  >
                    P50
                  </th>
                  <th 
                    style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                      position: 'sticky',
                      top: '48px',
                      zIndex: 11,
                      padding: '8px',
                      textAlign: 'right',
                      borderBottom: 'none'
                    }}
                  >
                    P75
                  </th>
                  <th 
                    style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index), 
                      borderRight: '1px solid #E0E0E0',
                      position: 'sticky',
                      top: '48px',
                      zIndex: 11,
                      padding: '8px',
                      textAlign: 'right',
                      borderBottom: 'none'
                    }}
                  >
                    P90
                  </th>
                </React.Fragment>
              ))}
               
              {/* FALLBACK: Original hardcoded sub-headers for backward compatibility */}
              {columnGroups.length === 0 && (
                <>
              {/* TCC Sub-headers */}
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E3F2FD',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                # Orgs
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E3F2FD',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                # Incumbents
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E3F2FD',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                TCC P25
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E3F2FD',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                TCC P50
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E3F2FD',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                TCC P75
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E3F2FD', 
                  borderRight: '1px solid #E0E0E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                TCC P90
              </th>
              
              {/* wRVU Sub-headers */}
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E8F5E8',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                # Orgs
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E8F5E8',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                # Incumbents
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E8F5E8',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                wRVU P25
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E8F5E8',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                wRVU P50
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E8F5E8',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                wRVU P75
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#E8F5E8', 
                  borderRight: '1px solid #E0E0E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                wRVU P90
              </th>
              
              {/* CF Sub-headers */}
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#FFF3E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                # Orgs
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#FFF3E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                # Incumbents
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#FFF3E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                CF P25
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#FFF3E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                CF P50
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#FFF3E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                CF P75
              </th>
              <th 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#FFF3E0',
                  position: 'sticky',
                  top: '48px',
                  zIndex: 11,
                  padding: '8px',
                  textAlign: 'right',
                  borderBottom: 'none'
                }}
              >
                CF P90
              </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedSpecialties.map((specialty) => {
              const rows = groupedData[specialty];
              return (
                <React.Fragment key={specialty}>
                {/* Data Rows */}
                {rows.map((row, index) => (
                  <tr key={`${row.surveySource}-${row.geographicRegion}-${index}`} className="hover:bg-gray-50">
                    <td 
                      style={{ 
                        position: freezeLeftColumns ? 'sticky' : 'static',
                        left: freezeLeftColumns ? 0 : 'auto',
                        backgroundColor: freezeLeftColumns ? '#f8f9fa' : 'white',
                        borderRight: '1px solid #e0e0e0',
                        zIndex: freezeLeftColumns ? 5 : 'auto',
                        padding: '8px',
                        boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {row.surveySource}
                    </td>
                    <td 
                      style={{ 
                        position: freezeLeftColumns ? 'sticky' : 'static',
                        left: freezeLeftColumns ? '140px' : 'auto',
                        backgroundColor: freezeLeftColumns ? '#f8f9fa' : 'white',
                        borderRight: '1px solid #e0e0e0',
                        zIndex: freezeLeftColumns ? 5 : 'auto',
                        padding: '8px',
                        boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {formatSpecialtyForDisplay(row.originalSpecialty)}
                    </td>
                    <td 
                      style={{ 
                        position: freezeLeftColumns ? 'sticky' : 'static',
                        left: freezeLeftColumns ? '320px' : 'auto',
                        backgroundColor: freezeLeftColumns ? '#f8f9fa' : 'white',
                        borderRight: '1px solid #e0e0e0',
                        zIndex: freezeLeftColumns ? 5 : 'auto',
                        padding: '8px',
                        boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {formatRegionForDisplay(row.geographicRegion)}
                    </td>
                    
                    {/* Production-grade: Unified rendering for all variables */}
                    {selectedVariables.map((varName, varIndex) => {
                      const dynamicRow = row as DynamicAggregatedData;
                      const legacyRow = row as any; // Legacy data format
                      const lightColor = getVariableLightBackgroundColor(varName, varIndex);
                      
                      // Try dynamic format first
                      const normalizedVarName = mapVariableNameToStandard(varName);
                      let metrics = dynamicRow.variables?.[normalizedVarName];
                      
                      // Fallback to legacy format if dynamic format not available
                      if (!metrics && !dynamicRow.variables) {
                        const legacyFieldMap: Record<string, string> = {
                          'tcc': 'tcc',
                          'work_rvus': 'wrvu',
                          'wrvu': 'wrvu',
                          'cf': 'cf',
                          'conversion_factor': 'cf',
                          'tcc_per_work_rvu': 'cf',
                          'cfs': 'cf',  // Map 'cfs' to 'cf' for legacy data
                          'tcc_per_work_rvus': 'cf'
                        };
                        
                        const legacyPrefix = legacyFieldMap[varName] || varName;
                        const nOrgs = legacyRow[`${legacyPrefix}_n_orgs`] || 0;
                        const nIncumbents = legacyRow[`${legacyPrefix}_n_incumbents`] || 0;
                        const p25 = legacyRow[`${legacyPrefix}_p25`] || 0;
                        const p50 = legacyRow[`${legacyPrefix}_p50`] || 0;
                        const p75 = legacyRow[`${legacyPrefix}_p75`] || 0;
                        const p90 = legacyRow[`${legacyPrefix}_p90`] || 0;
                        
                        if (p50 > 0) {
                          metrics = {
                            variableName: varName,
                            n_orgs: nOrgs,
                            n_incumbents: nIncumbents,
                            p25: p25,
                            p50: p50,
                            p75: p75,
                            p90: p90
                          };
                        }
                      }
                      
                      return metrics ? (
                        <React.Fragment key={varName}>
                          <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{metrics.n_orgs.toLocaleString()}</td>
                          <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{metrics.n_incumbents.toLocaleString()}</td>
                          <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p25, varName)}</td>
                          <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p50, varName)}</td>
                          <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p75, varName)}</td>
                          <td style={{ backgroundColor: lightColor, borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p90, varName)}</td>
                        </React.Fragment>
                      ) : (
                        <React.Fragment key={varName}>
                          <td style={{ backgroundColor: lightColor, textAlign: 'center', color: '#9ca3af', padding: '8px' }} colSpan={6}>
                            n/a
                          </td>
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Production-grade: No legacy fallback needed - unified data structure */}
                  </tr>
                ))}

                {/* Summary Rows - Memoized for performance */}
                {(() => {
                  const summaryData = getSummaryRows(specialty);
                  
                  
                  // Production-grade: Unified summary rendering
                  return (
                    <>
                      {/* Simple Average Row */}
                      <tr style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #d1d5db' }}>
                        <td 
                          style={{ 
                            fontWeight: 'bold',
                            position: freezeLeftColumns ? 'sticky' : 'static',
                            left: freezeLeftColumns ? 0 : 'auto',
                            backgroundColor: '#f5f5f5',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: freezeLeftColumns ? 5 : 'auto',
                            padding: '8px'
                          }}
                        >
                          {formatSpecialtyForDisplay(specialty)} - Simple Average
                        </td>
                        <td 
                          style={{ 
                            position: freezeLeftColumns ? 'sticky' : 'static',
                            left: freezeLeftColumns ? '140px' : 'auto',
                            backgroundColor: '#f5f5f5',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: freezeLeftColumns ? 5 : 'auto',
                            padding: '8px'
                          }}
                        ></td>
                        <td 
                          style={{ 
                            position: freezeLeftColumns ? 'sticky' : 'static',
                            left: freezeLeftColumns ? '320px' : 'auto',
                            backgroundColor: '#f5f5f5',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: freezeLeftColumns ? 5 : 'auto',
                            padding: '8px'
                          }}
                        ></td>
                        
                        {/* Unified variable summary data */}
                        {selectedVariables.map((varName, varIndex) => {
                          const summary = summaryData.simple[varName];
                          
                          return summary ? (
                            <React.Fragment key={varName}>
                              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {summary.n_orgs.toLocaleString()}
                              </td>
                              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {summary.n_incumbents.toLocaleString()}
                              </td>
                              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p25, varName)}
                              </td>
                              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p50, varName)}
                              </td>
                              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p75, varName)}
                              </td>
                              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p90, varName)}
                              </td>
                            </React.Fragment>
                          ) : (
                            <React.Fragment key={varName}>
                              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'center', color: '#9ca3af', padding: '8px' }} colSpan={6}>
                                n/a
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                      
                      {/* Weighted Average Row */}
                      <tr style={{ backgroundColor: '#e8eaf6', borderBottom: '1px solid #d1d5db' }}>
                        <td 
                          style={{ 
                            fontWeight: 'bold',
                            position: freezeLeftColumns ? 'sticky' : 'static',
                            left: freezeLeftColumns ? 0 : 'auto',
                            backgroundColor: '#e8eaf6',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: freezeLeftColumns ? 5 : 'auto',
                            padding: '8px'
                          }}
                        >
                          {formatSpecialtyForDisplay(specialty)} - Weighted Average
                        </td>
                        <td 
                          style={{ 
                            position: freezeLeftColumns ? 'sticky' : 'static',
                            left: freezeLeftColumns ? '140px' : 'auto',
                            backgroundColor: '#e8eaf6',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: freezeLeftColumns ? 5 : 'auto',
                            padding: '8px'
                          }}
                        ></td>
                        <td 
                          style={{ 
                            position: freezeLeftColumns ? 'sticky' : 'static',
                            left: freezeLeftColumns ? '320px' : 'auto',
                            backgroundColor: '#e8eaf6',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: freezeLeftColumns ? 5 : 'auto',
                            padding: '8px'
                          }}
                        ></td>
                        
                        {/* Unified variable weighted summary data */}
                        {selectedVariables.map((varName, varIndex) => {
                          const summary = summaryData.weighted[varName];
                          
                          return summary ? (
                            <React.Fragment key={varName}>
                              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {summary.n_orgs.toLocaleString()}
                              </td>
                              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {summary.n_incumbents.toLocaleString()}
                              </td>
                              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p25, varName)}
                              </td>
                              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p50, varName)}
                              </td>
                              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p75, varName)}
                              </td>
                              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px' }}>
                                {formatVariableValue(summary.p90, varName)}
                              </td>
                            </React.Fragment>
                          ) : (
                            <React.Fragment key={varName}>
                              <td style={{ backgroundColor: '#e8eaf6', textAlign: 'center', color: '#9ca3af', padding: '8px' }} colSpan={6}>
                                n/a
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    </>
                  );
                })()}
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

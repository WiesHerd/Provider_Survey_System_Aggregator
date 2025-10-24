/**
 * Analytics Feature - Data Table Component
 * 
 * This component displays analytics data in a structured table format.image.png
 * 
 * Following enterprise patterns for component composition and performance.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { AnalyticsTableProps } from '../types/analytics';
import { calculateSummaryRows, calculateDynamicSummaryRows } from '../utils/analyticsCalculations';
import { formatCurrency, formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { 
  formatVariableValue, 
  getVariableLightBackgroundColor 
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
  
  // Detect if we're using dynamic data format OR if we have selected variables
  const isDynamicData = useMemo(() => {
    const hasVariables = data.length > 0 && 'variables' in data[0];
    // Reduced logging to prevent console spam
    if (data.length > 0) {
      console.log('🔍 AnalyticsTable: Data format check:', { 
        hasVariables: 'variables' in data[0], 
        selectedVariablesCount: selectedVariables.length,
        isDynamicData: hasVariables
      });
    }
    // FIXED: Only use dynamic format if data actually has variables property
    return hasVariables;
  }, [data, selectedVariables]);
  
  // Use memoized column groups for dynamic variables
  const columnGroups = useMemoizedColumnGroups(selectedVariables, isDynamicData);
  
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

  // Pre-calculate summary rows for all specialties to avoid hook calls in render
  const summaryRowsCache = useMemo(() => {
    const cache: Record<string, any> = {};
    Object.keys(groupedData).forEach(specialty => {
      const rows = groupedData[specialty];
      if (isDynamicData) {
        // For dynamic data, use the calculation directly
        cache[specialty] = calculateDynamicSummaryRows(rows as DynamicAggregatedData[], selectedVariables);
      } else {
        // For legacy data, use legacy calculation but convert to dynamic format for rendering
        const legacySummary = calculateSummaryRows(rows as any[]);
        // Convert legacy summary to dynamic format for consistent rendering
        const dynamicFormat: {
          simple: Record<string, any>;
          weighted: Record<string, any>;
        } = {
          simple: {},
          weighted: {}
        };
        
        // Map legacy fields to dynamic variable names
        if (selectedVariables.includes('tcc')) {
          dynamicFormat.simple.tcc = {
            n_orgs: legacySummary.simple.tcc_n_orgs,
            n_incumbents: legacySummary.simple.tcc_n_incumbents,
            p25: legacySummary.simple.tcc_p25,
            p50: legacySummary.simple.tcc_p50,
            p75: legacySummary.simple.tcc_p75,
            p90: legacySummary.simple.tcc_p90
          };
          dynamicFormat.weighted.tcc = {
            n_orgs: legacySummary.weighted.tcc_n_orgs,
            n_incumbents: legacySummary.weighted.tcc_n_incumbents,
            p25: legacySummary.weighted.tcc_p25,
            p50: legacySummary.weighted.tcc_p50,
            p75: legacySummary.weighted.tcc_p75,
            p90: legacySummary.weighted.tcc_p90
          };
        }
        
        if (selectedVariables.includes('work_rvus') || selectedVariables.includes('wrvu')) {
          dynamicFormat.simple.work_rvus = {
            n_orgs: legacySummary.simple.wrvu_n_orgs,
            n_incumbents: legacySummary.simple.wrvu_n_incumbents,
            p25: legacySummary.simple.wrvu_p25,
            p50: legacySummary.simple.wrvu_p50,
            p75: legacySummary.simple.wrvu_p75,
            p90: legacySummary.simple.wrvu_p90
          };
          dynamicFormat.weighted.work_rvus = {
            n_orgs: legacySummary.weighted.wrvu_n_orgs,
            n_incumbents: legacySummary.weighted.wrvu_n_incumbents,
            p25: legacySummary.weighted.wrvu_p25,
            p50: legacySummary.weighted.wrvu_p50,
            p75: legacySummary.weighted.wrvu_p75,
            p90: legacySummary.weighted.wrvu_p90
          };
        }
        
        if (selectedVariables.includes('cfs') || selectedVariables.includes('cf')) {
          dynamicFormat.simple.cfs = {
            n_orgs: legacySummary.simple.cf_n_orgs,
            n_incumbents: legacySummary.simple.cf_n_incumbents,
            p25: legacySummary.simple.cf_p25,
            p50: legacySummary.simple.cf_p50,
            p75: legacySummary.simple.cf_p75,
            p90: legacySummary.simple.cf_p90
          };
          dynamicFormat.weighted.cfs = {
            n_orgs: legacySummary.weighted.cf_n_orgs,
            n_incumbents: legacySummary.weighted.cf_n_incumbents,
            p25: legacySummary.weighted.cf_p25,
            p50: legacySummary.weighted.cf_p50,
            p75: legacySummary.weighted.cf_p75,
            p90: legacySummary.weighted.cf_p90
          };
        }
        
        cache[specialty] = dynamicFormat;
      }
    });
    return cache;
  }, [groupedData, isDynamicData, selectedVariables]);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
      {/* Export button positioned at top right */}
      <div className="flex justify-end mb-2">
        <button
          onClick={onExport}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          Export Data
        </button>
      </div>

      {/* Table with horizontal scrolling */}
      <div className="overflow-x-auto">
        <TableContainer 
          component={Paper} 
          sx={{ 
            maxHeight: '600px',
            overflow: 'auto',
            borderRadius: '12px', // Add rounded corners to container
            border: '1px solid #e5e7eb', // Add border to the container
            '& .MuiTable-root': {
              minWidth: '1200px', // Ensure table has minimum width for all columns
              borderRadius: '12px', // Add rounded corners to table
              overflow: 'hidden' // Ensure content respects rounded corners
            }
          }}
        >
        <Table stickyHeader size="small">
           <TableHead>
             <TableRow>
               {/* Survey Data Section Header */}
               <TableCell sx={{ 
                 fontWeight: 'bold', 
                 backgroundColor: '#F5F5F5', 
                 borderRight: '1px solid #E0E0E0',
                 textAlign: 'center',
                 color: '#424242',
                 position: 'sticky',
                 left: 0,
                 zIndex: 2
               }} colSpan={3}>
                 Survey Data
               </TableCell>
              
              {/* DYNAMIC: Generate headers for selected variables */}
              {columnGroups.length > 0 && columnGroups.map((group, index) => (
                <TableCell 
                  key={group.normalizedName}
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                    textAlign: 'center',
                    borderRight: '1px solid #E0E0E0'
                  }}
                  colSpan={6}
                >
                  {group.displayName}
                </TableCell>
              ))}
              
              {/* FALLBACK: Original hardcoded headers for backward compatibility */}
              {columnGroups.length === 0 && (
                <>
              <TableCell sx={{ 
                fontWeight: 'bold', 
                backgroundColor: '#E3F2FD', 
                borderRight: '1px solid #E0E0E0',
                textAlign: 'center',
                color: '#1976D2'
              }} colSpan={6}>
                Total Cash Compensation
              </TableCell>
              
              <TableCell sx={{ 
                fontWeight: 'bold', 
                backgroundColor: '#E8F5E8', 
                borderRight: '1px solid #E0E0E0',
                textAlign: 'center',
                color: '#388E3C'
              }} colSpan={6}>
                Productivity - wRVUs
              </TableCell>
              
              <TableCell sx={{ 
                fontWeight: 'bold',
                backgroundColor: '#FFF3E0', 
                textAlign: 'center',
                color: '#F57C00'
              }} colSpan={6}>
                Conversion Factors
                </TableCell>
                </>
              )}
            </TableRow>
            
             {/* Sub-header row with column names */}
             <TableRow>
               {/* Survey Data Sub-headers */}
               <TableCell sx={{ 
                 fontWeight: 'bold', 
                 backgroundColor: '#F5F5F5',
                 position: 'sticky',
                 left: 0,
                 zIndex: 2,
                 minWidth: '140px'
               }}>Survey Source</TableCell>
               <TableCell sx={{ 
                 fontWeight: 'bold', 
                 backgroundColor: '#F5F5F5',
                 position: 'sticky',
                 left: '140px',
                 zIndex: 2,
                 minWidth: '180px'
               }}>Specialty</TableCell>
               <TableCell sx={{ 
                 fontWeight: 'bold', 
                 backgroundColor: '#F5F5F5',
                 position: 'sticky',
                 left: '320px',
                 zIndex: 2,
                 minWidth: '120px',
                 borderRight: '1px solid #E0E0E0'
               }}>Region</TableCell>
               
               {/* DYNAMIC: Generate sub-headers for selected variables */}
               {columnGroups.length > 0 && columnGroups.map((group, index) => (
                 <React.Fragment key={group.normalizedName}>
                   <TableCell sx={{ fontWeight: 'bold', backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index) }} align="right"># Orgs</TableCell>
                   <TableCell sx={{ fontWeight: 'bold', backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index) }} align="right"># Inc</TableCell>
                   <TableCell sx={{ fontWeight: 'bold', backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index) }} align="right">P25</TableCell>
                   <TableCell sx={{ fontWeight: 'bold', backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index) }} align="right">P50</TableCell>
                   <TableCell sx={{ fontWeight: 'bold', backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index) }} align="right">P75</TableCell>
                   <TableCell sx={{ fontWeight: 'bold', backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index), borderRight: '1px solid #E0E0E0' }} align="right">P90</TableCell>
                 </React.Fragment>
               ))}
               
               {/* FALLBACK: Original hardcoded sub-headers for backward compatibility */}
               {columnGroups.length === 0 && (
                 <>
               {/* TCC Sub-headers */}
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }} align="right"># Orgs</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }} align="right"># Incumbents</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }} align="right">TCC P25</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }} align="right">TCC P50</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }} align="right">TCC P75</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', borderRight: '1px solid #E0E0E0' }} align="right">TCC P90</TableCell>
               
               {/* wRVU Sub-headers */}
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }} align="right"># Orgs</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }} align="right"># Incumbents</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }} align="right">wRVU P25</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }} align="right">wRVU P50</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }} align="right">wRVU P75</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', borderRight: '1px solid #E0E0E0' }} align="right">wRVU P90</TableCell>
               
               {/* CF Sub-headers */}
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }} align="right"># Orgs</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }} align="right"># Incumbents</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }} align="right">CF P25</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }} align="right">CF P50</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }} align="right">CF P75</TableCell>
               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }} align="right">CF P90</TableCell>
                 </>
               )}
             </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSpecialties.map((specialty) => {
              const rows = groupedData[specialty];
              return (
              <React.Fragment key={specialty}>
                {/* Data Rows */}
                {rows.map((row, index) => (
                  <TableRow key={`${row.surveySource}-${row.geographicRegion}-${index}`} hover>
                    <TableCell sx={{ 
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'white',
                      borderRight: '1px solid #e0e0e0',
                      zIndex: 1
                    }}>{row.surveySource}</TableCell>
                    <TableCell sx={{ 
                      position: 'sticky',
                      left: '140px',
                      backgroundColor: 'white',
                      borderRight: '1px solid #e0e0e0',
                      zIndex: 1
                    }}>{formatSpecialtyForDisplay(row.originalSpecialty)}</TableCell>
                    <TableCell sx={{ 
                      position: 'sticky',
                      left: '320px',
                      backgroundColor: 'white',
                      borderRight: '1px solid #e0e0e0',
                      zIndex: 1
                    }}>{formatRegionForDisplay(row.geographicRegion)}</TableCell>
                    
                    {/* DYNAMIC: Render data for selected variables */}
                    {columnGroups.length > 0 && selectedVariables.map((varName, varIndex) => {
                      const dynamicRow = row as unknown as DynamicAggregatedData;
                      const legacyRow = row as any; // Legacy data format
                      const lightColor = getVariableLightBackgroundColor(varName, varIndex);
                      
                      // Reduced logging to prevent console spam
                      if (varName === 'cfs' && row.surveySource === 'Gallagher Physician') {
                        console.log(`🔍 AnalyticsTable: Processing CF variable for Gallagher data:`, {
                          hasVariables: !!dynamicRow.variables,
                          variableKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables) : [],
                          cfData: dynamicRow.variables?.[varName]
                        });
                      }
                      
                      // Check if we have dynamic variables format
                      if (dynamicRow.variables) {
                        const metrics = dynamicRow.variables[varName];
                        return metrics ? (
                          <React.Fragment key={varName}>
                            <TableCell sx={{ backgroundColor: lightColor }} align="right">{metrics.n_orgs.toLocaleString()}</TableCell>
                            <TableCell sx={{ backgroundColor: lightColor }} align="right">{metrics.n_incumbents.toLocaleString()}</TableCell>
                            <TableCell sx={{ backgroundColor: lightColor }} align="right">{formatVariableValue(metrics.p25, varName)}</TableCell>
                            <TableCell sx={{ backgroundColor: lightColor }} align="right">{formatVariableValue(metrics.p50, varName)}</TableCell>
                            <TableCell sx={{ backgroundColor: lightColor }} align="right">{formatVariableValue(metrics.p75, varName)}</TableCell>
                            <TableCell sx={{ backgroundColor: lightColor, borderRight: '1px solid #E0E0E0' }} align="right">{formatVariableValue(metrics.p90, varName)}</TableCell>
                          </React.Fragment>
                        ) : (
                          <React.Fragment key={varName}>
                            <TableCell sx={{ backgroundColor: lightColor, textAlign: 'center', color: '#9ca3af' }} colSpan={6}>
                              n/a
                            </TableCell>
                          </React.Fragment>
                        );
                      } else {
                        // Handle legacy data format - map variable names to legacy fields
                        const legacyFieldMap: Record<string, string> = {
                          'tcc': 'tcc',
                          'work_rvus': 'wrvu',
                          'wrvu': 'wrvu',
                          'cf': 'cf',
                          'conversion_factor': 'cf',
                          'tcc_per_work_rvu': 'cf',
                          'cfs': 'cf',  // Add mapping for 'cfs' to 'cf'
                          'tcc_per_work_rvus': 'cf'  // Add mapping for plural form
                        };
                        
                        // Reduced logging to prevent console spam
                        if (varName === 'cfs') {
                          console.log(`🔍 AnalyticsTable: Processing CF variable for legacy data:`, {
                            variable: varName,
                            mappedField: legacyFieldMap[varName]
                          });
                        }
                        
                        const legacyPrefix = legacyFieldMap[varName] || varName;
                        const nOrgs = legacyRow[`${legacyPrefix}_n_orgs`] || 0;
                        const nIncumbents = legacyRow[`${legacyPrefix}_n_incumbents`] || 0;
                        const p25 = legacyRow[`${legacyPrefix}_p25`] || 0;
                        const p50 = legacyRow[`${legacyPrefix}_p50`] || 0;
                        const p75 = legacyRow[`${legacyPrefix}_p75`] || 0;
                        const p90 = legacyRow[`${legacyPrefix}_p90`] || 0;
                        
                        // Reduced logging to prevent console spam
                        if (varName === 'cfs') {
                          console.log(`🔍 AnalyticsTable: CF data values:`, {
                            nOrgs, nIncumbents, p25, p50, p75, p90,
                            availableCFFields: Object.keys(legacyRow).filter(k => k.includes('cf'))
                          });
                        }
                        
                        // Only show if we have meaningful data
                        if (p50 > 0) {
                          return (
                            <React.Fragment key={varName}>
                              <TableCell sx={{ backgroundColor: lightColor }} align="right">{nOrgs.toLocaleString()}</TableCell>
                              <TableCell sx={{ backgroundColor: lightColor }} align="right">{nIncumbents.toLocaleString()}</TableCell>
                              <TableCell sx={{ backgroundColor: lightColor }} align="right">{formatVariableValue(p25, varName)}</TableCell>
                              <TableCell sx={{ backgroundColor: lightColor }} align="right">{formatVariableValue(p50, varName)}</TableCell>
                              <TableCell sx={{ backgroundColor: lightColor }} align="right">{formatVariableValue(p75, varName)}</TableCell>
                              <TableCell sx={{ backgroundColor: lightColor, borderRight: '1px solid #E0E0E0' }} align="right">{formatVariableValue(p90, varName)}</TableCell>
                            </React.Fragment>
                          );
                        } else {
                          return (
                            <React.Fragment key={varName}>
                              <TableCell sx={{ backgroundColor: lightColor, textAlign: 'center', color: '#9ca3af' }} colSpan={6}>
                                n/a
                              </TableCell>
                            </React.Fragment>
                          );
                        }
                      }
                    })}
                    
                    {/* FALLBACK: Original hardcoded sections for backward compatibility */}
                    {columnGroups.length === 0 && (() => {
                      const legacyRow = row as any; // Cast to any for legacy data
                      return (
                        <>
                          {/* TCC Section */}
                          <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{legacyRow.tcc_n_orgs?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{legacyRow.tcc_n_incumbents?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{formatCurrency(legacyRow.tcc_p25 || 0, 2)}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{formatCurrency(legacyRow.tcc_p50 || 0, 2)}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{formatCurrency(legacyRow.tcc_p75 || 0, 2)}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E3F2FD', borderRight: '1px solid #E0E0E0' }} align="right">{formatCurrency(legacyRow.tcc_p90 || 0, 2)}</TableCell>
                    
                    {/* wRVU Section */}
                          <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{legacyRow.wrvu_n_orgs?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{legacyRow.wrvu_n_incumbents?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{legacyRow.wrvu_p25?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{legacyRow.wrvu_p50?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{legacyRow.wrvu_p75?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#E8F5E8', borderRight: '1px solid #E0E0E0' }} align="right">{legacyRow.wrvu_p90?.toLocaleString() || '0'}</TableCell>
                    
                    {/* CF Section */}
                          <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{legacyRow.cf_n_orgs?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{legacyRow.cf_n_incumbents?.toLocaleString() || '0'}</TableCell>
                          <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(legacyRow.cf_p25 || 0, 2)}</TableCell>
                          <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(legacyRow.cf_p50 || 0, 2)}</TableCell>
                          <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(legacyRow.cf_p75 || 0, 2)}</TableCell>
                          <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(legacyRow.cf_p90 || 0, 2)}</TableCell>
                        </>
                      );
                    })()}
                  </TableRow>
                ))}

                {/* Summary Rows - Memoized for performance */}
                {(() => {
                  const summaryData = getSummaryRows(specialty);
                  if (columnGroups.length > 0) {
                    return (
                      <>
                        {/* Simple Average Row */}
                        <TableRow sx={{ backgroundColor: 'grey.50' }}>
                          <TableCell sx={{ 
                            fontWeight: 'bold',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'grey.50',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: 1
                          }}>
                            {formatSpecialtyForDisplay(specialty)} - Simple Average
                          </TableCell>
                          <TableCell sx={{ 
                            position: 'sticky',
                            left: '140px',
                            backgroundColor: 'grey.50',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: 1
                          }}></TableCell>
                          <TableCell sx={{ 
                            position: 'sticky',
                            left: '320px',
                            backgroundColor: 'grey.50',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: 1
                          }}></TableCell>
                          
                          {/* Dynamic variable summary data */}
                          {selectedVariables.map((varName, varIndex) => {
                            const summary = summaryData.simple[varName];
                            const lightColor = getVariableLightBackgroundColor(varName, varIndex);
                            
                            return summary ? (
                              <React.Fragment key={varName}>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {summary.n_orgs.toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {summary.n_incumbents.toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {formatVariableValue(summary.p25, varName)}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {formatVariableValue(summary.p50, varName)}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {formatVariableValue(summary.p75, varName)}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold', borderRight: '1px solid #E0E0E0' }} align="right">
                                  {formatVariableValue(summary.p90, varName)}
                                </TableCell>
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={varName}>
                                <TableCell sx={{ backgroundColor: lightColor, textAlign: 'center', color: '#9ca3af' }} colSpan={6}>
                                  n/a
                                </TableCell>
                              </React.Fragment>
                            );
                          })}
                        </TableRow>
                        
                        {/* Weighted Average Row */}
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                          <TableCell sx={{ 
                            fontWeight: 'bold',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'grey.100',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: 1
                          }}>
                            {formatSpecialtyForDisplay(specialty)} - Weighted Average
                          </TableCell>
                          <TableCell sx={{ 
                            position: 'sticky',
                            left: '140px',
                            backgroundColor: 'grey.100',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: 1
                          }}></TableCell>
                          <TableCell sx={{ 
                            position: 'sticky',
                            left: '320px',
                            backgroundColor: 'grey.100',
                            borderRight: '1px solid #e0e0e0',
                            zIndex: 1
                          }}></TableCell>
                          
                          {/* Dynamic variable weighted summary data */}
                          {selectedVariables.map((varName, varIndex) => {
                            const summary = summaryData.weighted[varName];
                            const lightColor = getVariableLightBackgroundColor(varName, varIndex);
                            
                            return summary ? (
                              <React.Fragment key={varName}>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {summary.n_orgs.toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {summary.n_incumbents.toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {formatVariableValue(summary.p25, varName)}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {formatVariableValue(summary.p50, varName)}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold' }} align="right">
                                  {formatVariableValue(summary.p75, varName)}
                                </TableCell>
                                <TableCell sx={{ backgroundColor: lightColor, fontWeight: 'bold', borderRight: '1px solid #E0E0E0' }} align="right">
                                  {formatVariableValue(summary.p90, varName)}
                                </TableCell>
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={varName}>
                                <TableCell sx={{ backgroundColor: lightColor, textAlign: 'center', color: '#9ca3af' }} colSpan={6}>
                                  n/a
                                </TableCell>
                              </React.Fragment>
                            );
                          })}
                        </TableRow>
                      </>
                    );
                  }
                  
                  const { simple, weighted } = summaryData;
                  return (
                    <>
                      <TableRow sx={{ backgroundColor: 'grey.50' }}>
                        <TableCell sx={{ 
                          fontWeight: 'bold',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'grey.50',
                          borderRight: '1px solid #e0e0e0',
                          zIndex: 1
                        }}>
                          {formatSpecialtyForDisplay(specialty)} - Simple Average
                        </TableCell>
                        <TableCell sx={{ 
                          position: 'sticky',
                          left: '140px',
                          backgroundColor: 'grey.50',
                          borderRight: '1px solid #e0e0e0',
                          zIndex: 1
                        }}></TableCell>
                        <TableCell sx={{ 
                          position: 'sticky',
                          left: '320px',
                          backgroundColor: 'grey.50',
                          borderRight: '1px solid #e0e0e0',
                          zIndex: 1
                        }}></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {simple.tcc_n_orgs.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {simple.tcc_n_incumbents.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {formatCurrency(simple.tcc_p25, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {formatCurrency(simple.tcc_p50, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {formatCurrency(simple.tcc_p75, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', borderRight: '1px solid #E0E0E0' }}>
                          {formatCurrency(simple.tcc_p90, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {simple.wrvu_n_orgs.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {simple.wrvu_n_incumbents.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {simple.wrvu_p25.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {simple.wrvu_p50.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {simple.wrvu_p75.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', borderRight: '1px solid #E0E0E0' }}>
                          {simple.wrvu_p90.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {simple.cf_n_orgs.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {simple.cf_n_incumbents.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(simple.cf_p25, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(simple.cf_p50, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(simple.cf_p75, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(simple.cf_p90, 2)}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'primary.50' }}>
                        <TableCell sx={{ 
                          fontWeight: 'bold',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'primary.50',
                          borderRight: '1px solid #e0e0e0',
                          zIndex: 1
                        }}>
                          {formatSpecialtyForDisplay(specialty)} - Weighted Average
                        </TableCell>
                        <TableCell sx={{ 
                          position: 'sticky',
                          left: '140px',
                          backgroundColor: 'primary.50',
                          borderRight: '1px solid #e0e0e0',
                          zIndex: 1
                        }}></TableCell>
                        <TableCell sx={{ 
                          position: 'sticky',
                          left: '320px',
                          backgroundColor: 'primary.50',
                          borderRight: '1px solid #e0e0e0',
                          zIndex: 1
                        }}></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {weighted.tcc_n_orgs.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {weighted.tcc_n_incumbents.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {formatCurrency(weighted.tcc_p25, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {formatCurrency(weighted.tcc_p50, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD' }}>
                          {formatCurrency(weighted.tcc_p75, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', borderRight: '1px solid #E0E0E0' }}>
                          {formatCurrency(weighted.tcc_p90, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {weighted.wrvu_n_orgs.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {weighted.wrvu_n_incumbents.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {weighted.wrvu_p25.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {weighted.wrvu_p50.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
                          {weighted.wrvu_p75.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', borderRight: '1px solid #E0E0E0' }}>
                          {weighted.wrvu_p90.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {weighted.cf_n_orgs.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {weighted.cf_n_incumbents.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(weighted.cf_p25, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(weighted.cf_p50, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(weighted.cf_p75, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#FFF3E0' }}>
                          {formatCurrency(weighted.cf_p90, 2)}
                        </TableCell>
              </TableRow>
                    </>
                  );
                })()}
              </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
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
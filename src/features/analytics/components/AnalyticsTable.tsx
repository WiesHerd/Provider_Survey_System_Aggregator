/**
 * Analytics Feature - Data Table Component
 * 
 * This component displays analytics data in a structured table format.
 * Following enterprise patterns for component composition and performance.
 */

import React, { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Button
} from '@mui/material';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { AnalyticsTableProps } from '../types/analytics';
import { groupBySpecialty, calculateSummaryRows } from '../utils/analyticsCalculations';
import { formatCurrency, formatSpecialtyForDisplay } from '../../../shared/utils/formatters';

/**
 * Format number without dollar sign, with proper comma separators and decimals
 * Following user preference for number formatting
 */
const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
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
  error,
  onExport
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading analytics data...</span>
        </div>
      </div>
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
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Try adjusting your filters to see results</p>
        </div>
      </div>
    );
  }

  const groupedData = groupBySpecialty(data);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Survey Analytics Data</h3>
        </div>
        <Button
          variant="outlined"
          startIcon={<DocumentTextIcon className="w-4 h-4" />}
          onClick={onExport}
          className="rounded-lg"
        >
          Export Data
        </Button>
      </div>

      {/* Properly contained scrollable area with visible scrollbars */}
      <div className="rounded-lg border border-gray-200 overflow-auto">
        <TableContainer component={Paper} sx={{ 
          maxHeight: 600, 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            height: '12px',
            width: '12px'
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f5f9',
            borderRadius: '6px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#94a3b8',
            borderRadius: '6px',
            border: '2px solid #f1f5f9',
            '&:hover': {
              backgroundColor: '#64748b'
            }
          },
          '&::-webkit-scrollbar-corner': {
            backgroundColor: '#f1f5f9'
          }
        }}>
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
              
              {/* TCC Section Header */}
              <TableCell sx={{ 
                fontWeight: 'bold', 
                backgroundColor: '#E3F2FD', 
                borderRight: '1px solid #E0E0E0',
                textAlign: 'center',
                color: '#1976D2'
              }} colSpan={6}>
                Total Cash Compensation
              </TableCell>
              
              {/* wRVU Section Header */}
              <TableCell sx={{ 
                fontWeight: 'bold', 
                backgroundColor: '#E8F5E8', 
                borderRight: '1px solid #E0E0E0',
                textAlign: 'center',
                color: '#388E3C'
              }} colSpan={6}>
                Productivity - wRVUs
              </TableCell>
              
              {/* CF Section Header */}
              <TableCell sx={{ 
                fontWeight: 'bold',
                backgroundColor: '#FFF3E0', 
                textAlign: 'center',
                color: '#F57C00'
              }} colSpan={6}>
                Conversion Factors
                </TableCell>
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
             </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupedData).slice(0, 25).map(([specialty, rows]) => (
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
                    }}>{formatSpecialtyForDisplay(row.surveySpecialty)}</TableCell>
                    <TableCell sx={{ 
                      position: 'sticky',
                      left: '320px',
                      backgroundColor: 'white',
                      borderRight: '1px solid #e0e0e0',
                      zIndex: 1
                    }}>{row.geographicRegion}</TableCell>
                    
                    {/* TCC Section */}
                    <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{row.tcc_n_orgs.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{row.tcc_n_incumbents.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{formatCurrency(row.tcc_p25, 2)}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{formatCurrency(row.tcc_p50, 2)}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E3F2FD' }} align="right">{formatCurrency(row.tcc_p75, 2)}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E3F2FD', borderRight: '1px solid #E0E0E0' }} align="right">{formatCurrency(row.tcc_p90, 2)}</TableCell>
                    
                    {/* wRVU Section */}
                    <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{row.wrvu_n_orgs.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{row.wrvu_n_incumbents.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{row.wrvu_p25.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{row.wrvu_p50.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E8F5E8' }} align="right">{row.wrvu_p75.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#E8F5E8', borderRight: '1px solid #E0E0E0' }} align="right">{row.wrvu_p90.toLocaleString()}</TableCell>
                    
                    {/* CF Section */}
                    <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{row.cf_n_orgs.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{row.cf_n_incumbents.toLocaleString()}</TableCell>
                    <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(row.cf_p25, 2)}</TableCell>
                    <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(row.cf_p50, 2)}</TableCell>
                    <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(row.cf_p75, 2)}</TableCell>
                    <TableCell sx={{ backgroundColor: '#FFF3E0' }} align="right">{formatCurrency(row.cf_p90, 2)}</TableCell>
                  </TableRow>
                ))}

                {/* Summary Rows */}
                {(() => {
                  const { simple, weighted } = calculateSummaryRows(rows);
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </div>

      {Object.entries(groupedData).length > 25 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Showing first 25 specialties for performance. Total: {Object.entries(groupedData).length} specialties.
          </p>
        </div>
      )}
    </div>
  );
});

AnalyticsTable.displayName = 'AnalyticsTable';
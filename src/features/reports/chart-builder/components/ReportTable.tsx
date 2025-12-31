/**
 * Report Table Component
 * 
 * Displays chart data in a sortable table format
 */

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { ReportTableProps } from '../types/reportBuilder';
import { sortMetricsForDisplay, getMetricDisplayLabel, formatMetricValue } from '../utils/reportFormatters';
import { ErrorBoundary } from './ErrorBoundary';

const getDimensionLabel = (dimension: string): string => {
  const labels: Record<string, string> = {
    'specialty': 'Specialty',
    'region': 'Region',
    'providerType': 'Provider Type',
    'surveySource': 'Survey Source'
  };
  return labels[dimension] || dimension;
};

export const ReportTable: React.FC<ReportTableProps> = ({
  tableData,
  dimension,
  metrics,
  metric,
  onSort,
  sortDesc = true
}) => {
  const [localSortDesc, setLocalSortDesc] = useState(sortDesc);

  const sortedData = useMemo(() => {
    const rows = [...tableData];
    rows.sort((a, b) => (localSortDesc ? b.value - a.value : a.value - b.value));
    return rows;
  }, [tableData, localSortDesc]);

  const handleSort = () => {
    const newSort = !localSortDesc;
    setLocalSortDesc(newSort);
    onSort?.(newSort);
  };

  const displayMetrics = metrics.length > 1 ? metrics : [metric];

  return (
    <ErrorBoundary>
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Table</h3>
        <div className="overflow-x-auto">
          <TableContainer 
            component={Paper} 
            sx={{ 
              maxHeight: '600px', 
              overflow: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid #e5e7eb'
            }}
          >
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow sx={{ 
                  backgroundColor: '#fafafa',
                  borderBottom: '2px solid #e5e7eb',
                  '& .MuiTableCell-root': { 
                    borderBottom: '2px solid #e5e7eb',
                    backgroundColor: '#fafafa'
                  } 
                }}>
                  <TableCell sx={{ 
                    fontWeight: 500, 
                    backgroundColor: '#fafafa',
                    color: '#6b7280',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    minWidth: '200px',
                    padding: '14px 20px',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {getDimensionLabel(dimension)}
                  </TableCell>
                  {displayMetrics.map((m, index) => (
                    <TableCell 
                      key={m}
                      sx={{ 
                        fontWeight: 500, 
                        backgroundColor: '#fafafa',
                        color: '#6b7280',
                        padding: '14px 20px',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: index === 0 ? 'pointer' : 'default',
                        '&:hover': index === 0 ? { backgroundColor: '#f3f4f6' } : {}
                      }} 
                      align="right"
                      onClick={index === 0 ? handleSort : undefined}
                      title={index === 0 ? 'Toggle sort' : undefined}
                    >
                      {getMetricDisplayLabel(m).replace(' Percentile', '') + (index === 0 ? (localSortDesc ? ' ▼' : ' ▲') : '')}
                    </TableCell>
                  ))}
                  <TableCell sx={{ 
                    fontWeight: 500, 
                    backgroundColor: '#fafafa',
                    color: '#6b7280',
                    padding: '14px 20px',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }} align="right">
                    Count
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.map((item, index) => (
                  <TableRow 
                    key={index}
                    sx={{
                      backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                      '&:last-child td': { borderBottom: 'none' },
                      '&:hover': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    <TableCell sx={{ 
                      position: 'sticky',
                      left: 0,
                      backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                      borderRight: '1px solid #f3f4f6',
                      zIndex: 1,
                      padding: '14px 20px',
                      fontSize: '14px',
                      color: '#1f2937',
                      boxShadow: '2px 0 4px -2px rgba(0, 0, 0, 0.05)'
                    }}>
                      {item.name}
                    </TableCell>
                    {displayMetrics.map((m) => {
                      // Use metricValues if available (multi-metric), otherwise use value
                      const metricValue = displayMetrics.length > 1 
                        ? (item.metricValues?.[m] || 0)
                        : (item.metricValues?.[m] || item.value || 0);
                      return (
                        <TableCell 
                          key={m}
                          sx={{ 
                            padding: '14px 20px',
                            fontSize: '14px',
                            color: '#1f2937',
                            fontWeight: '500'
                          }} 
                          align="right"
                        >
                          {formatMetricValue(metricValue, m)}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ 
                      padding: '14px 20px',
                      fontSize: '14px',
                      color: '#1f2937'
                    }} align="right">
                      {item.count || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </div>
    </ErrorBoundary>
  );
};


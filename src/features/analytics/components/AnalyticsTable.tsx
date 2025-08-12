/**
 * Analytics Table component
 * This component handles data display in a table format with sorting and interaction
 */

import React, { memo, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  TablePagination,
  Alert
} from '@mui/material';
import { 
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { AnalyticsTableProps, AnalyticsTableRow } from '../types/analytics';
import { formatCurrency, formatNumber } from '@/shared/utils';

/**
 * Analytics Table component for displaying survey data
 * 
 * @param data - Table data array
 * @param config - Table configuration
 * @param onRowClick - Callback when a row is clicked
 * @param onSort - Callback when sorting changes
 * @param onFilter - Callback when filtering changes
 * @param loading - Loading state
 * @param error - Error state
 */
export const AnalyticsTable: React.FC<AnalyticsTableProps> = memo(({
  data,
  config,
  onRowClick,
  onSort,
  onFilter,
  loading = false,
  error = null
}) => {
  // Table columns configuration
  const columns = useMemo(() => [
    {
      key: 'standardizedName' as const,
      label: 'Standardized Name',
      type: 'string' as const,
      sortable: true,
      width: 200
    },
    {
      key: 'surveySpecialty' as const,
      label: 'Specialty',
      type: 'string' as const,
      sortable: true,
      width: 150
    },
    {
      key: 'surveySource' as const,
      label: 'Survey Source',
      type: 'string' as const,
      sortable: true,
      width: 120
    },
    {
      key: 'geographicRegion' as const,
      label: 'Region',
      type: 'string' as const,
      sortable: true,
      width: 120
    },
    {
      key: 'n_orgs' as const,
      label: 'Organizations',
      type: 'number' as const,
      sortable: true,
      width: 100,
      align: 'right' as const
    },
    {
      key: 'n_incumbents' as const,
      label: 'Incumbents',
      type: 'number' as const,
      sortable: true,
      width: 100,
      align: 'right' as const
    },
    {
      key: 'tcc_p50' as const,
      label: 'TCC P50',
      type: 'currency' as const,
      sortable: true,
      width: 120,
      align: 'right' as const
    },
    {
      key: 'wrvu_p50' as const,
      label: 'WRVU P50',
      type: 'number' as const,
      sortable: true,
      width: 120,
      align: 'right' as const
    },
    {
      key: 'cf_p50' as const,
      label: 'CF P50',
      type: 'currency' as const,
      sortable: true,
      width: 120,
      align: 'right' as const
    }
  ], []);

  // Event handlers
  const handleSort = (column: keyof AnalyticsTableRow) => {
    if (!onSort) return;
    
    const currentDirection = config.sorting?.column === column ? config.sorting.direction : 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  };

  const handleRowClick = (row: AnalyticsTableRow) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Cell value formatter
  const formatCellValue = (value: any, type: string) => {
    if (value == null || value === '') return '-';
    
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return formatNumber(value);
      case 'percentage':
        return `${formatNumber(value)}%`;
      default:
        return String(value);
    }
  };

  // Render sort icon
  const renderSortIcon = (column: keyof AnalyticsTableRow) => {
    if (!config.sorting || config.sorting.column !== column) {
      return <SortIcon fontSize="small" color="disabled" />;
    }
    
    return config.sorting.direction === 'asc' 
      ? <ArrowUpwardIcon fontSize="small" color="primary" />
      : <ArrowDownwardIcon fontSize="small" color="primary" />;
  };

  // Early returns for loading and error states
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading analytics data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No data available. Try adjusting your filters.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: 'background.paper',
                    borderBottom: 2,
                    borderColor: 'divider',
                    minWidth: column.width,
                    cursor: column.sortable ? 'pointer' : 'default',
                    '&:hover': column.sortable ? {
                      backgroundColor: 'action.hover'
                    } : {}
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle2">
                      {column.label}
                    </Typography>
                    {column.sortable && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort(column.key);
                        }}
                        sx={{ p: 0.5 }}
                      >
                        {renderSortIcon(column.key)}
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={row.id || index}
                onClick={() => handleRowClick(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  },
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align || 'left'}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      minWidth: column.width
                    }}
                  >
                    <Typography variant="body2">
                      {formatCellValue(row[column.key], column.type)}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {config.pagination && (
        <TablePagination
          component="div"
          count={config.pagination.total}
          page={config.pagination.page - 1}
          onPageChange={(_, newPage) => {
            // Handle page change
            console.log('Page changed to:', newPage + 1);
          }}
          rowsPerPage={config.pagination.pageSize}
          onRowsPerPageChange={(event) => {
            // Handle rows per page change
            console.log('Rows per page changed to:', event.target.value);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{
            borderTop: 1,
            borderColor: 'divider'
          }}
        />
      )}
    </Paper>
  );
});

AnalyticsTable.displayName = 'AnalyticsTable';

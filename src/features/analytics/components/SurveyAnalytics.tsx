/**
 * Main Survey Analytics component
 * This component orchestrates all analytics functionality and components
 */

import React, { memo, useEffect } from 'react';
import { Box, Alert, Typography, Button, Stack } from '@mui/material';
import { 
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { AnalyticsProps } from '../types/analytics';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsSummary } from './AnalyticsSummary';
import { AnalyticsTable } from './AnalyticsTable';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

/**
 * Main Survey Analytics component that orchestrates all analytics functionality
 * 
 * @param initialFilters - Initial filters to apply
 * @param onDataChange - Callback when data changes
 * @param onFiltersChange - Callback when filters change
 */
export const SurveyAnalytics: React.FC<AnalyticsProps> = memo(({
  initialFilters = {},
  onDataChange,
  onFiltersChange
}) => {
  // Use the analytics data hook
  const {
    data,
    filteredData,
    summary,
    loading,
    filters,
    sorting,
    setFilters,
    clearFilters,
    setSorting,
    refreshData,
    availableOptions,
    validation
  } = useAnalyticsData({
    initialFilters,
    autoRefresh: false
  });

  // Event handlers
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleClearFilters = () => {
    clearFilters();
    onFiltersChange?.({});
  };

  const handleSort = (column: keyof typeof data[0], direction: 'asc' | 'desc') => {
    setSorting(column, direction);
  };

  const handleRowClick = (row: typeof data[0]) => {
    // Handle row click - could open detail modal, navigate to detail page, etc.
    console.log('Row clicked:', row);
  };

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(filteredData, filters, {
      includeFilters: true,
      includeSummary: true
    });
  };

  const handleExportCSV = () => {
    exportToCSV(filteredData, filters, {
      includeFilters: true,
      includeSummary: true
    });
  };

  // Table configuration
  const tableConfig = {
    columns: [], // Will be handled by AnalyticsTable component
    data: filteredData,
    pagination: {
      page: 1,
      pageSize: 25,
      total: filteredData.length
    },
    sorting: sorting.column ? {
      column: sorting.column,
      direction: sorting.direction
    } : undefined,
    filters
  };

  // Data Change Callback
  useEffect(() => {
    if (onDataChange) {
      onDataChange(filteredData);
    }
  }, [filteredData, onDataChange]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Survey Analytics
        </Typography>
        
        {/* Export Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<TableCellsIcon className="h-4 w-4" />}
            onClick={handleExportExcel}
            disabled={filteredData.length === 0}
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Export to Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<DocumentTextIcon className="h-4 w-4" />}
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Export to CSV
          </Button>
        </Stack>
      </Box>

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Data Quality Warnings:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {validation.warnings.map((warning, index) => (
              <li key={index}>
                <Typography variant="body2">{warning}</Typography>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Data Quality Errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {validation.errors.map((error, index) => (
              <li key={index}>
                <Typography variant="body2">{error}</Typography>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Filters */}
      <AnalyticsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        availableOptions={availableOptions}
      />

      {/* Summary */}
      <AnalyticsSummary
        data={filteredData}
        filters={filters}
      />

      {/* Table */}
      <AnalyticsTable
        data={filteredData}
        config={tableConfig}
        onRowClick={handleRowClick}
        onSort={handleSort}
        loading={loading.loading}
        error={loading.error}
      />

      {/* Data Change Callback */}
    </Box>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

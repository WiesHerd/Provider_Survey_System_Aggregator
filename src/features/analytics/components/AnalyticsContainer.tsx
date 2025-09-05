/**
 * Analytics Container Component
 * Main container for the analytics feature
 */

import React, { memo } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { AnalyticsContainerProps } from '../types/analytics';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsSummary } from './AnalyticsSummary';
import { AnalyticsTable } from './AnalyticsTable';
import { AnalyticsExport } from './AnalyticsExport';

/**
 * Analytics Container component - main container for analytics feature
 * 
 * @param className - Optional CSS class name
 */
export const AnalyticsContainer: React.FC<AnalyticsContainerProps> = memo(({ 
  className 
}) => {
  // Use analytics data hook
  const {
    data,
    loading,
    error,
    filters,
    uniqueValues,
    summaryStats,
    updateFilters,
    clearFilters,
    refreshData
  } = useAnalyticsData();

  // Handle row click
  const handleRowClick = (row: any) => {
    console.log('Row clicked:', row);
    // Add row click logic here
  };

  // Handle export
  const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
    console.log(`Exporting to ${format}:`, data);
    // Add export logic here
  };

  return (
    <Box className={`analytics-container ${className || ''}`}>
      {/* Header */}
      <Box className="mb-6">
        <Typography variant="h4" className="font-bold text-gray-900 mb-2">
          Survey Analytics
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Analyze and explore survey data with advanced filtering and export capabilities
        </Typography>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <AnalyticsFilters
        filters={filters}
        uniqueValues={uniqueValues}
        onFilterChange={(filterName, value) => updateFilters({ [filterName]: value })}
        onClearFilters={clearFilters}
      />

      {/* Summary Statistics */}
      <AnalyticsSummary
        data={data}
        loading={loading}
      />

      {/* Export Controls */}
      <AnalyticsExport
        data={data}
        onExport={handleExport}
        loading={loading}
      />

      {/* Data Table */}
      <AnalyticsTable
        data={data}
        loading={loading}
        onRowClick={handleRowClick}
      />
    </Box>
  );
});

AnalyticsContainer.displayName = 'AnalyticsContainer';

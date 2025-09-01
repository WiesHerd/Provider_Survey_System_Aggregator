/**
 * SurveyAnalytics component - Main analytics dashboard
 * Refactored from massive 1,637-line component to follow enterprise standards
 */

import React, { memo } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsTable } from './AnalyticsTable';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsSummary } from './AnalyticsSummary';
import LoadingSpinner from '../../../components/ui/loading-spinner';

/**
 * Main SurveyAnalytics component
 * Orchestrates the analytics dashboard with proper separation of concerns
 */
export const SurveyAnalytics: React.FC = memo(() => {
  const {
    data,
    loading,
    error,
    refetch,
    filters,
    setFilters,
    filteredData
  } = useAnalyticsData();

  // Handle error state
  if (error) {
    return (
      <Box className="p-6">
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
        <button 
          onClick={refetch}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </Box>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <Box className="p-6">
        <LoadingSpinner />
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Box className="mb-6">
        <Typography variant="h4" className="text-gray-900 font-bold mb-2">
          Survey Analytics
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Analyze and compare compensation data across multiple surveys
        </Typography>
      </Box>

      {/* Summary Cards */}
      <AnalyticsSummary data={filteredData} filters={filters} />

      {/* Filters */}
      <AnalyticsFilters 
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters({})}
        availableOptions={{
          specialties: [...new Set(data.map(row => row.surveySpecialty))].sort(),
          providerTypes: [...new Set(data.map(row => row.providerType))].sort(),
          regions: [...new Set(data.map(row => row.geographicRegion))].sort(),
          surveySources: [...new Set(data.map(row => row.surveySource))].sort(),
          years: [...new Set(data.map(row => row.surveyYear))].sort()
        }}
      />

      {/* Data Table */}
      <AnalyticsTable 
        data={filteredData}
        config={{
          columns: [],
          data: filteredData,
          pagination: {
            page: 1,
            pageSize: 25,
            total: filteredData.length
          }
        }}
        loading={loading}
        onRowClick={(row) => console.log('Row clicked:', row)}
        onSort={(column, direction) => console.log('Sort:', column, direction)}
      />
    </Box>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

/**
 * Analytics Filters Component
 * Provides filter controls for analytics data
 */

import React, { memo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
} from '@mui/material';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AnalyticsFiltersProps } from '../types/analytics';

/**
 * Analytics Filters component for filtering analytics data
 * 
 * @param filters - Current filter values
 * @param uniqueValues - Available filter options
 * @param onFilterChange - Callback when filters change
 * @param onClearFilters - Callback to clear all filters
 */
export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = memo(({
  filters,
  uniqueValues,
  onFilterChange,
  onClearFilters
}) => {
  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value && value.trim() !== '');

  return (
    <Box className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <Box className="flex items-center justify-between mb-4">
        <Box className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-600" />
          <Typography variant="h6" className="font-semibold text-gray-900">
            Filters
          </Typography>
        </Box>
        {hasActiveFilters && (
          <Button
            onClick={onClearFilters}
            variant="outlined"
            size="small"
            startIcon={<XMarkIcon className="h-4 w-4" />}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Clear Filters
          </Button>
        )}
      </Box>

      <Stack direction="row" spacing={2} className="flex-wrap">
        {/* Specialty Filter */}
        <FormControl size="small" className="min-w-[200px]">
          <InputLabel>Specialty</InputLabel>
          <Select
            value={filters.specialty}
            onChange={(e: any) => onFilterChange('specialty', e.target.value)}
            label="Specialty"
            sx={{
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem value="">All Specialties</MenuItem>
            {uniqueValues.specialties.map((specialty) => (
              <MenuItem key={specialty} value={specialty}>
                {specialty}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Provider Type Filter */}
        <FormControl size="small" className="min-w-[200px]">
          <InputLabel>Provider Type</InputLabel>
          <Select
            value={filters.providerType}
            onChange={(e: any) => onFilterChange('providerType', e.target.value)}
            label="Provider Type"
            sx={{
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem value="">All Types</MenuItem>
            {uniqueValues.providerTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Region Filter */}
        <FormControl size="small" className="min-w-[200px]">
          <InputLabel>Region</InputLabel>
          <Select
            value={filters.region}
            onChange={(e: any) => onFilterChange('region', e.target.value)}
            label="Region"
            sx={{
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem value="">All Regions</MenuItem>
            {uniqueValues.regions.map((region) => (
              <MenuItem key={region} value={region}>
                {region}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Variable Filter */}
        <FormControl size="small" className="min-w-[200px]">
          <InputLabel>Variable</InputLabel>
          <Select
            value={filters.variable}
            onChange={(e: any) => onFilterChange('variable', e.target.value)}
            label="Variable"
            sx={{
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem value="">All Variables</MenuItem>
            {uniqueValues.variables.map((variable) => (
              <MenuItem key={variable} value={variable}>
                {variable}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Survey Source Filter */}
        <FormControl size="small" className="min-w-[200px]">
          <InputLabel>Survey Source</InputLabel>
          <Select
            value={filters.surveySource}
            onChange={(e: any) => onFilterChange('surveySource', e.target.value)}
            label="Survey Source"
            sx={{
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem value="">All Sources</MenuItem>
            {uniqueValues.surveySources.map((source) => (
              <MenuItem key={source} value={source}>
                {source}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
});

AnalyticsFilters.displayName = 'AnalyticsFilters';
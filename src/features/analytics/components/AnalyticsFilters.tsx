/**
 * Analytics Feature - Filters Component
 * 
 * This component handles all filter controls for analytics data.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Box
} from '@mui/material';
import { AnalyticsFiltersProps } from '../types/analytics';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';

/**
 * AnalyticsFilters component for filtering analytics data
 * 
 * @param filters - Current filter values
 * @param onFiltersChange - Callback when filters change
 * @param availableSpecialties - Available specialty options
 * @param availableSources - Available survey source options
 * @param availableRegions - Available region options
 * @param availableProviderTypes - Available provider type options
 * @param availableYears - Available year options
 */
export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = memo(({
  filters,
  onFiltersChange,
  availableSpecialties,
  availableSources,
  availableRegions,
  availableProviderTypes,
  availableYears
}) => {
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    // Simply update the specific filter that changed
    // Allow multiple filters to work together
    const newFilters = { ...filters, [field]: value };
    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analytics Filters</h3>
        </div>
        
        {/* Clear Filters Button */}
        {(filters.specialty || filters.surveySource || filters.geographicRegion || filters.providerType || filters.year) && (
          <button
            onClick={() => {
              onFiltersChange({
                specialty: '',
                surveySource: '',
                geographicRegion: '',
                providerType: '',
                year: ''
              });
            }}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Clear all filters"
          >
            <div className="relative w-4 h-4 mr-2">
              {/* Funnel Icon */}
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
              </svg>
              {/* X Overlay - Only show when filters are active */}
              <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs">Clear Filters</span>
          </button>
        )}
      </div>

      {/* Cascading Filters - Responsive Layout with Natural Width */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: '1fr 1fr', 
          md: '1fr 1fr 1fr', 
          lg: '1fr 1fr 1fr 1fr 1fr' 
        }, 
        gap: 2, 
        width: '100%',
        maxWidth: '100%' // Use full available width but don't stretch with table
      }}>
        {/* Year Filter - First (leftmost) */}
        <Box>
          <FormControl fullWidth size="small">
            <InputLabel>Year</InputLabel>
            <Select
              value={filters.year}
              label="Year"
              onChange={(e: any) => handleFilterChange('year', e.target.value)}
              disableRipple
              sx={{
                '& .MuiSelect-select': {
                  transition: 'none !important',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                }
              }}
            >
              <MenuItem value="All Years" disableRipple>All Years</MenuItem>
              {availableYears.map((year) => (
                <MenuItem key={year} value={year} disableRipple>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Survey Source Filter */}
        <Box>
          <FormControl fullWidth size="small">
            <InputLabel>Survey Source</InputLabel>
            <Select
              value={filters.surveySource}
              label="Survey Source"
              onChange={(e: any) => handleFilterChange('surveySource', e.target.value)}
              disableRipple
              sx={{
                '& .MuiSelect-select': {
                  transition: 'none !important',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                }
              }}
            >
              <MenuItem value="All Sources" disableRipple>All Sources</MenuItem>
              {availableSources.map((source) => (
                <MenuItem key={source} value={source} disableRipple>
                  {source}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Specialty Filter */}
        <Box>
          <Autocomplete
            value={filters.specialty}
            onChange={(_: any, newValue: string | null) => handleFilterChange('specialty', newValue || '')}
            options={availableSpecialties}
            getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
            renderInput={(params: any) => (
              <TextField
                {...params}
                label="Specialty"
                variant="outlined"
                size="small"
                placeholder="Select specialty..."
              />
            )}
            clearOnEscape
            clearOnBlur
            selectOnFocus
            handleHomeEndKeys
          />
        </Box>

        {/* Geographic Region Filter */}
        <Box>
          <Autocomplete
            value={filters.geographicRegion}
            onChange={(_: any, newValue: string | null) => handleFilterChange('geographicRegion', newValue || '')}
            options={availableRegions}
            renderInput={(params: any) => (
              <TextField
                {...params}
                label="Geographic Region"
                variant="outlined"
                size="small"
                placeholder="Select region..."
              />
            )}
            clearOnEscape
            clearOnBlur
            selectOnFocus
            handleHomeEndKeys
          />
        </Box>

        {/* Provider Type Filter */}
        <Box>
          <FormControl fullWidth size="small">
            <InputLabel>Provider Type</InputLabel>
            <Select
              value={filters.providerType}
              label="Provider Type"
              onChange={(e: any) => handleFilterChange('providerType', e.target.value)}
              disableRipple
              sx={{
                '& .MuiSelect-select': {
                  transition: 'none !important',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  transition: 'none !important',
                }
              }}
            >
              <MenuItem value="All Types" disableRipple>All Types</MenuItem>
              {availableProviderTypes.map((type) => (
                <MenuItem key={type} value={type} disableRipple>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

    </div>
  );
});

AnalyticsFilters.displayName = 'AnalyticsFilters';
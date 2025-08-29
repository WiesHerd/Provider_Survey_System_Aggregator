/**
 * Analytics Filters component
 * This component handles all filtering functionality for the analytics feature
 */

import React, { memo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Grid,
  Typography,
  Chip
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { AnalyticsFiltersProps } from '../types/analytics';
import { PROVIDER_TYPES, GEOGRAPHIC_REGIONS, SURVEY_SOURCES } from '../../../shared/constants';
import { formatSpecialtyForDisplay, sortSpecialtiesForDisplay } from '../../../shared/utils';

/**
 * Analytics Filters component for filtering survey data
 * 
 * @param filters - Current filter values
 * @param onFiltersChange - Callback when filters change
 * @param onClearFilters - Callback to clear all filters
 * @param availableOptions - Available options for each filter
 */
export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = memo(({
  filters,
  onFiltersChange,
  onClearFilters,
  availableOptions
}) => {
  // Event handlers
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const handleClearFilters = () => {
    onClearFilters();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        Filters
        {hasActiveFilters && (
          <Chip 
            label={`${Object.values(filters).filter(v => v).length} active`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Typography>

      <Grid container spacing={2}>
        {/* Specialty Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="specialty-filter-label">Specialty</InputLabel>
            <Select
              labelId="specialty-filter-label"
              value={filters.specialty || ''}
              label="Specialty"
              onChange={(e: SelectChangeEvent<string>) => handleFilterChange('specialty', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>All Specialties</em>
              </MenuItem>
              {sortSpecialtiesForDisplay(availableOptions.specialties).map((specialty: string) => (
                <MenuItem key={specialty} value={specialty}>
                  {formatSpecialtyForDisplay(specialty)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Provider Type Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="provider-type-filter-label">Provider Type</InputLabel>
            <Select
              labelId="provider-type-filter-label"
              value={filters.providerType || ''}
              label="Provider Type"
              onChange={(e: SelectChangeEvent<string>) => handleFilterChange('providerType', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>All Provider Types</em>
              </MenuItem>
              {PROVIDER_TYPES.map((providerType) => (
                <MenuItem key={providerType} value={providerType}>
                  {providerType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Region Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="region-filter-label">Region</InputLabel>
            <Select
              labelId="region-filter-label"
              value={filters.region || ''}
              label="Region"
              onChange={(e: SelectChangeEvent<string>) => handleFilterChange('region', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>All Regions</em>
              </MenuItem>
              {GEOGRAPHIC_REGIONS.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Survey Source Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="survey-source-filter-label">Survey Source</InputLabel>
            <Select
              labelId="survey-source-filter-label"
              value={filters.surveySource || ''}
              label="Survey Source"
              onChange={(e: SelectChangeEvent<string>) => handleFilterChange('surveySource', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>All Sources</em>
              </MenuItem>
              {SURVEY_SOURCES.map((source) => (
                <MenuItem key={source} value={source}>
                  {source}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Year Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="year-filter-label">Year</InputLabel>
            <Select
              labelId="year-filter-label"
              value={filters.year || ''}
              label="Year"
              onChange={(e: SelectChangeEvent<string>) => handleFilterChange('year', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>All Years</em>
              </MenuItem>
              {availableOptions.years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Variable Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="variable-filter-label">Variable</InputLabel>
            <Select
              labelId="variable-filter-label"
              value={filters.variable || ''}
              label="Variable"
              onChange={(e: SelectChangeEvent<string>) => handleFilterChange('variable', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>All Variables</em>
              </MenuItem>
              {availableOptions.variables?.map((variable) => (
                <MenuItem key={variable} value={variable}>
                  {variable}
                </MenuItem>
              )) || []}
            </Select>
          </FormControl>
        </Grid>

        {/* Search Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Search"
            placeholder="Search specialties, regions..."
            value={filters.search || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('search', e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          />
        </Grid>

        {/* Clear Filters Button */}
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            fullWidth
            sx={{
              height: '40px',
              borderRadius: '8px',
              textTransform: 'none'
            }}
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            return (
              <Chip
                key={key}
                label={`${key}: ${value}`}
                onDelete={() => handleFilterChange(key as keyof typeof filters, '')}
                size="small"
                color="primary"
                variant="outlined"
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
});

AnalyticsFilters.displayName = 'AnalyticsFilters';

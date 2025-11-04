/**
 * Analytics Summary component
 * This component displays key statistics and summary information
 */

import React, { memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import { AnalyticsSummaryProps } from '../types/analytics';
import { formatCurrency, formatNumber } from '../../../shared/utils';
import { useMemoizedSummary } from '../hooks/useMemoizedCalculations';

/**
 * Analytics Summary component for displaying key statistics
 * 
 * @param data - Analytics data array
 * @param filters - Current active filters
 */
export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = memo(({
  data,
  filters
}) => {
  // Use memoized summary calculations for all statistics
  const {
    totalRecords,
    totalTccOrganizations,
    totalTccIncumbents,
    totalWrvuOrganizations,
    totalWrvuIncumbents,
    totalCfOrganizations,
    totalCfIncumbents,
    averageTccP50,
    averageWrvuP50,
    averageCfP50,
    uniqueSpecialties,
    uniqueSources,
    uniqueRegions
  } = useMemoizedSummary(data);

  const activeFiltersCount = Object.values(filters).filter(value => value !== undefined && value !== '').length;

  return (
    <Card sx={{ mb: 3, borderRadius: '8px' }}>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h6" component="h2">
            Analytics Summary
          </Typography>
          {activeFiltersCount > 0 && (
            <Chip 
              label={`${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </div>

        <Grid container spacing={3}>
          {/* Data Volume Metrics */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Data Volume
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="primary">
                    {formatNumber(totalRecords)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Records
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="primary">
                    {formatNumber(totalTccOrganizations + totalWrvuOrganizations + totalCfOrganizations)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Organizations
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="primary">
                    {formatNumber(totalTccIncumbents + totalWrvuIncumbents + totalCfIncumbents)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Incumbents
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="primary">
                    {uniqueSpecialties.size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Specialties
                  </Typography>
                </div>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} md={6}>
            <Divider orientation="vertical" flexItem />
          </Grid>

          {/* Compensation Metrics */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Average Compensation (P50)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="success.main">
                    {formatCurrency(averageTccP50)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    TCC P50
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="success.main">
                    {formatNumber(averageWrvuP50)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    WRVU P50
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="success.main">
                    {formatCurrency(averageCfP50)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CF P50
                  </Typography>
                </div>
              </Grid>
              <Grid item xs={6}>
                <div>
                  <Typography variant="h4" component="div" color="success.main">
                    {averageCfP50 > 0 ? formatCurrency(averageTccP50 / averageCfP50) : '$0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    TCC/CF Ratio
                  </Typography>
                </div>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Data Diversity */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Data Diversity
          </Typography>
          <div className="flex gap-2 flex-wrap">
            <Chip 
              label={`${uniqueSources.size} Survey Sources`}
              size="small"
              variant="outlined"
            />
            <Chip 
              label={`${uniqueRegions.size} Geographic Regions`}
              size="small"
              variant="outlined"
            />
            <Chip 
              label={`${uniqueSpecialties.size} Medical Specialties`}
              size="small"
              variant="outlined"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Active Filters
            </Typography>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                return (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AnalyticsSummary.displayName = 'AnalyticsSummary';

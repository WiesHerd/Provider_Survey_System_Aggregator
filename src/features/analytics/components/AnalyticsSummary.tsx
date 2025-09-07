/**
 * Analytics Summary component
 * This component displays key statistics and summary information
 */

import React, { memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import { AnalyticsSummaryProps, AggregatedData } from '../types/analytics';
import { formatCurrency, formatNumber } from '../../../shared/utils';

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
  // Calculate summary statistics
  const totalRecords = data.length;
  const totalTccOrganizations = data.reduce((sum: number, row: AggregatedData) => sum + row.tcc_n_orgs, 0);
  const totalTccIncumbents = data.reduce((sum: number, row: AggregatedData) => sum + row.tcc_n_incumbents, 0);
  const totalWrvuOrganizations = data.reduce((sum: number, row: AggregatedData) => sum + row.wrvu_n_orgs, 0);
  const totalWrvuIncumbents = data.reduce((sum: number, row: AggregatedData) => sum + row.wrvu_n_incumbents, 0);
  const totalCfOrganizations = data.reduce((sum: number, row: AggregatedData) => sum + row.cf_n_orgs, 0);
  const totalCfIncumbents = data.reduce((sum: number, row: AggregatedData) => sum + row.cf_n_incumbents, 0);
  
  const tccP50Values = data.map((row: AggregatedData) => row.tcc_p50).filter((val: number) => val > 0);
  const wrvuP50Values = data.map((row: AggregatedData) => row.wrvu_p50).filter((val: number) => val > 0);
  const cfP50Values = data.map((row: AggregatedData) => row.cf_p50).filter((val: number) => val > 0);

  const averageTccP50 = tccP50Values.length > 0 
    ? tccP50Values.reduce((sum: number, val: number) => sum + val, 0) / tccP50Values.length 
    : 0;
  const averageWrvuP50 = wrvuP50Values.length > 0 
    ? wrvuP50Values.reduce((sum: number, val: number) => sum + val, 0) / wrvuP50Values.length 
    : 0;
  const averageCfP50 = cfP50Values.length > 0 
    ? cfP50Values.reduce((sum: number, val: number) => sum + val, 0) / cfP50Values.length 
    : 0;

  const uniqueSpecialties = new Set(data.map((row: AggregatedData) => row.surveySpecialty));
  const uniqueSources = new Set(data.map((row: AggregatedData) => row.surveySource));
  const uniqueRegions = new Set(data.map((row: AggregatedData) => row.geographicRegion));

  const activeFiltersCount = Object.values(filters).filter(value => value !== undefined && value !== '').length;

  return (
    <Card sx={{ mb: 3, borderRadius: '8px' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
        </Box>

        <Grid container spacing={3}>
          {/* Data Volume Metrics */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Data Volume
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="h4" component="div" color="primary">
                    {formatNumber(totalRecords)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Records
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="h4" component="div" color="primary">
                    {formatNumber(totalTccOrganizations + totalWrvuOrganizations + totalCfOrganizations)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Organizations
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="h4" component="div" color="primary">
                    {formatNumber(totalTccIncumbents + totalWrvuIncumbents + totalCfIncumbents)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Incumbents
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="h4" component="div" color="primary">
                    {uniqueSpecialties.size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Specialties
                  </Typography>
                </Box>
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
                <Box>
                  <Typography variant="h4" component="div" color="success.main">
                    {formatCurrency(averageTccP50)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    TCC P50
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="h4" component="div" color="success.main">
                    {formatNumber(averageWrvuP50)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    WRVU P50
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="h4" component="div" color="success.main">
                    {formatCurrency(averageCfP50)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CF P50
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="h4" component="div" color="success.main">
                    {averageCfP50 > 0 ? formatCurrency(averageTccP50 / averageCfP50) : '$0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    TCC/CF Ratio
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Data Diversity */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Data Diversity
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
          </Box>
        </Box>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Active Filters
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

AnalyticsSummary.displayName = 'AnalyticsSummary';

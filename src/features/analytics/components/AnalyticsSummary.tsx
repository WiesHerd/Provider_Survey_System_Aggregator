/**
 * Analytics Summary Component
 * Displays summary statistics for analytics data
 */

import React, { memo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { AnalyticsSummaryProps } from '../types/analytics';
import { formatNumber } from '../utils/analyticsCalculations';
import LoadingSpinner from '../../../components/ui/loading-spinner';

/**
 * Analytics Summary component for displaying summary statistics
 * 
 * @param data - The analytics data to summarize
 * @param loading - Whether data is loading
 */
export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = memo(({ 
  data, 
  loading 
}) => {
  if (loading) {
    return (
      <Box className="flex items-center justify-center p-8">
        <LoadingSpinner message="Loading summary..." size="sm" variant="primary" />
      </Box>
    );
  }

  const summaryStats = {
    totalRecords: data.length,
    uniqueSpecialties: new Set(data.map(row => row.surveySpecialty)).size,
    uniqueRegions: new Set(data.map(row => row.geographicRegion)).size,
    uniqueSurveySources: new Set(data.map(row => row.surveySource)).size,
    totalOrganizations: data.reduce((sum, row) => sum + row.n_orgs, 0),
    totalIncumbents: data.reduce((sum, row) => sum + row.n_incumbents, 0)
  };

  const summaryCards = [
    {
      title: 'Total Records',
      value: formatNumber(summaryStats.totalRecords),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Unique Specialties',
      value: formatNumber(summaryStats.uniqueSpecialties),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Unique Regions',
      value: formatNumber(summaryStats.uniqueRegions),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Survey Sources',
      value: formatNumber(summaryStats.uniqueSurveySources),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Total Organizations',
      value: formatNumber(summaryStats.totalOrganizations),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Total Incumbents',
      value: formatNumber(summaryStats.totalIncumbents),
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    }
  ];

  return (
    <Box className="mb-6">
      <Typography variant="h6" className="font-semibold text-gray-900 mb-4">
        Summary Statistics
      </Typography>
      
      <Grid container spacing={3}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card className="rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <Box className={`${card.bgColor} rounded-lg p-3 mb-3`}>
                  <Typography 
                    variant="h4" 
                    className={`font-bold ${card.color}`}
                  >
                    {card.value}
                  </Typography>
                </Box>
                <Typography 
                  variant="body2" 
                  className="text-gray-600 font-medium"
                >
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
});

AnalyticsSummary.displayName = 'AnalyticsSummary';
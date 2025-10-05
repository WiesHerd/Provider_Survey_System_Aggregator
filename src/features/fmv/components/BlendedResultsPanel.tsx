/**
 * Blended Results Panel Component
 * 
 * Displays results for blended specialty FMV calculations with confidence indicators
 * and source data transparency.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { BlendedResultsPanelProps } from '../types/fmv';
import { formatCurrency } from '../../../shared/utils/formatters';

/**
 * Blended Results Panel Component
 * 
 * Shows FMV calculation results for blended specialties with quality indicators
 * and source data breakdown.
 */
export const BlendedResultsPanel: React.FC<BlendedResultsPanelProps> = ({
  blendedData,
  compareType,
  inputValue,
  rawValue,
  fte,
  aggregationMethod,
  surveyCount
}) => {
  if (!blendedData) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <Typography variant="h6" className="text-gray-900 font-semibold mb-2">
            Blended Results
          </Typography>
          <Typography variant="body2" className="text-gray-600">
            Configure specialty blending to see results
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentile ranking
  const calculatePercentile = (value: number, percentiles: any) => {
    if (value <= percentiles.p25) return 25;
    if (value <= percentiles.p50) return 50;
    if (value <= percentiles.p75) return 75;
    if (value <= percentiles.p90) return 90;
    return 95;
  };

  const currentPercentiles = blendedData.blendedPercentiles[compareType.toLowerCase() as keyof typeof blendedData.blendedPercentiles];
  const percentileRanking = calculatePercentile(rawValue, currentPercentiles);

  // Get confidence level description
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return { level: 'High', color: 'success' as const };
    if (confidence >= 0.6) return { level: 'Medium', color: 'warning' as const };
    return { level: 'Low', color: 'error' as const };
  };

  const confidenceLevel = getConfidenceLevel(blendedData.confidence);

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Typography variant="h6" className="text-gray-900 font-semibold">
            Blended FMV Results
          </Typography>
          <Chip
            label={`${confidenceLevel.level} Confidence`}
            color={confidenceLevel.color}
            size="small"
            icon={<InformationCircleIcon className="w-4 h-4" />}
          />
        </div>

        {/* Confidence Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="body2" className="text-gray-600">
              Data Quality Confidence
            </Typography>
            <Typography variant="body2" className="font-medium">
              {Math.round(blendedData.confidence * 100)}%
            </Typography>
          </div>
          <LinearProgress
            variant="determinate"
            value={blendedData.confidence * 100}
            color={confidenceLevel.color}
            className="rounded-full"
          />
        </div>

        {/* Blended Specialties Summary */}
        <div className="mb-4">
          <Typography variant="subtitle2" className="text-gray-700 font-medium mb-2">
            Blended Specialties
          </Typography>
          <div className="flex flex-wrap gap-2">
            {blendedData.specialties.specialties.map((specialty, index) => (
              <Chip
                key={index}
                label={`${specialty.specialty} (${specialty.percentage}%)`}
                color="primary"
                size="small"
                variant="outlined"
              />
            ))}
          </div>
        </div>

        {/* Quality Warnings */}
        {blendedData.qualityWarnings.length > 0 && (
          <Alert severity="warning" className="mb-4">
            <Typography variant="body2">
              <strong>Data Quality Warnings:</strong>
            </Typography>
            <ul className="mt-1 ml-4">
              {blendedData.qualityWarnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Market Data Results */}
        <Grid container spacing={3} className="mb-4">
          <Grid item xs={12} md={4}>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Typography variant="body2" className="text-blue-600 font-medium">
                P25
              </Typography>
              <Typography variant="h6" className="text-blue-900 font-bold">
                {formatCurrency(currentPercentiles.p25)}
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Typography variant="body2" className="text-green-600 font-medium">
                P50 (Median)
              </Typography>
              <Typography variant="h6" className="text-green-900 font-bold">
                {formatCurrency(currentPercentiles.p50)}
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Typography variant="body2" className="text-purple-600 font-medium">
                P75
              </Typography>
              <Typography variant="h6" className="text-purple-900 font-bold">
                {formatCurrency(currentPercentiles.p75)}
              </Typography>
            </div>
          </Grid>
        </Grid>

        {/* Your Value vs Market */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <Typography variant="subtitle2" className="text-gray-700 font-medium mb-2">
            Your {compareType} vs Market
          </Typography>
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="body2" className="text-gray-600">
                Your Value: {formatCurrency(rawValue)}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Market Median: {formatCurrency(currentPercentiles.p50)}
              </Typography>
            </div>
            <div className="text-right">
              <Chip
                label={`${percentileRanking}th Percentile`}
                color={percentileRanking >= 75 ? 'success' : percentileRanking >= 50 ? 'warning' : 'error'}
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Source Data Breakdown */}
        <div>
          <Typography variant="subtitle2" className="text-gray-700 font-medium mb-2">
            Source Data Breakdown
          </Typography>
          <div className="space-y-2">
            {Object.entries(blendedData.sourceData).map(([specialty, data]) => (
              <div key={specialty} className="p-2 bg-gray-50 rounded border">
                <Typography variant="body2" className="font-medium text-gray-700">
                  {specialty}
                </Typography>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="text-center">
                    <Typography variant="caption" className="text-gray-500">P25</Typography>
                    <Typography variant="body2" className="font-medium">
                      {formatCurrency(data[compareType.toLowerCase() as keyof typeof data].p25)}
                    </Typography>
                  </div>
                  <div className="text-center">
                    <Typography variant="caption" className="text-gray-500">P50</Typography>
                    <Typography variant="body2" className="font-medium">
                      {formatCurrency(data[compareType.toLowerCase() as keyof typeof data].p50)}
                    </Typography>
                  </div>
                  <div className="text-center">
                    <Typography variant="caption" className="text-gray-500">P75</Typography>
                    <Typography variant="body2" className="font-medium">
                      {formatCurrency(data[compareType.toLowerCase() as keyof typeof data].p75)}
                    </Typography>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Size Information */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Typography variant="body2" className="text-gray-600">
            Total Sample Size: {blendedData.totalSampleSize.toLocaleString()} incumbents
          </Typography>
          <Typography variant="body2" className="text-gray-600">
            Aggregation Method: {aggregationMethod === 'simple' ? 'Simple Average' : 
                               aggregationMethod === 'weighted' ? 'Weighted Average' : 'Pure'}
          </Typography>
          {surveyCount && (
            <Typography variant="body2" className="text-gray-600">
              Surveys: {surveyCount}
            </Typography>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlendedResultsPanel;

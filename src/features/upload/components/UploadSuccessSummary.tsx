/**
 * Upload Success Summary Component
 * 
 * Displays success message with mapping coverage and quick actions after upload
 */

import React, { memo } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert
} from '@mui/material';
import {
  CheckCircleIcon,
  PresentationChartLineIcon,
  MapIcon
} from '@heroicons/react/24/outline';
import { MappingApplicationResult } from '../utils/mappingApplication';

interface UploadSuccessSummaryProps {
  surveyName: string;
  rowCount: number;
  coverage?: MappingApplicationResult | null;
  onViewAnalytics?: () => void;
  onReviewMappings?: () => void;
  onUploadAnother?: () => void;
}

/**
 * Upload Success Summary component
 * 
 * @param surveyName - Name of the uploaded survey
 * @param rowCount - Number of rows processed
 * @param coverage - Mapping coverage results (optional)
 * @param onViewAnalytics - Callback to view analytics
 * @param onReviewMappings - Callback to review mappings
 * @param onUploadAnother - Callback to upload another survey
 */
export const UploadSuccessSummary: React.FC<UploadSuccessSummaryProps> = memo(({
  surveyName,
  rowCount,
  coverage,
  onViewAnalytics,
  onReviewMappings,
  onUploadAnother
}) => {
  const getOverallCoverage = (): number => {
    if (!coverage) return 1.0;
    
    const totalItems = 
      coverage.coverage.specialties.mapped + coverage.coverage.specialties.unmapped +
      coverage.coverage.providerTypes.mapped + coverage.coverage.providerTypes.unmapped +
      coverage.coverage.regions.mapped + coverage.coverage.regions.unmapped +
      coverage.coverage.variables.mapped + coverage.coverage.variables.unmapped;

    const totalMapped = 
      coverage.coverage.specialties.mapped +
      coverage.coverage.providerTypes.mapped +
      coverage.coverage.regions.mapped +
      coverage.coverage.variables.mapped;

    return totalItems > 0 ? totalMapped / totalItems : 1.0;
  };

  const overallCoverage = getOverallCoverage();
  const needsReview = coverage && (
    coverage.coverage.specialties.unmapped > 0 ||
    coverage.coverage.providerTypes.unmapped > 0 ||
    coverage.coverage.regions.unmapped > 0 ||
    coverage.coverage.variables.unmapped > 0
  );

  return (
    <Alert 
      severity="success" 
      icon={<CheckCircleIcon style={{ width: 24, height: 24 }} />}
      sx={{ 
        mt: 3,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
            ✅ Upload Complete!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {surveyName} • {rowCount.toLocaleString()} rows processed
          </Typography>
        </Box>

        {coverage && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Auto-Mapping: <strong>{Math.round(overallCoverage * 100)}%</strong> coverage
            </Typography>
            {needsReview && (
              <Typography variant="caption" color="text.secondary">
                Some items need review. You can map them now or continue to analytics.
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
          {onViewAnalytics && (
            <Button
              variant="contained"
              startIcon={<PresentationChartLineIcon style={{ width: 18, height: 18 }} />}
              onClick={onViewAnalytics}
              sx={{ borderRadius: '8px' }}
            >
              View Analytics
            </Button>
          )}
          
          {onReviewMappings && needsReview && (
            <Button
              variant="outlined"
              startIcon={<MapIcon style={{ width: 18, height: 18 }} />}
              onClick={onReviewMappings}
              sx={{ borderRadius: '8px' }}
            >
              Review Mappings
            </Button>
          )}
          
          {onUploadAnother && (
            <Button
              variant="text"
              onClick={onUploadAnother}
              sx={{ borderRadius: '8px' }}
            >
              Upload Another
            </Button>
          )}
        </Box>
      </Box>
    </Alert>
  );
});

UploadSuccessSummary.displayName = 'UploadSuccessSummary';

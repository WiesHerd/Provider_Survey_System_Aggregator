/**
 * Mapping Coverage Summary Component
 * 
 * Displays auto-mapping results after survey upload
 */

import React, { memo } from 'react';
import {
  Box,
  Typography,
  Box as MuiBox,
  Chip,
  Alert
} from '@mui/material';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { MappingApplicationResult } from '../utils/mappingApplication';

interface MappingCoverageSummaryProps {
  coverage: MappingApplicationResult;
  onReviewMappings?: () => void;
}

/**
 * Mapping Coverage Summary component
 * 
 * @param coverage - Mapping coverage results
 * @param onReviewMappings - Callback when user clicks to review mappings
 */
export const MappingCoverageSummary: React.FC<MappingCoverageSummaryProps> = memo(({
  coverage,
  onReviewMappings
}) => {
  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const getCoverageColor = (coverage: number): 'success' | 'warning' | 'error' => {
    if (coverage >= 0.9) return 'success';
    if (coverage >= 0.7) return 'warning';
    return 'error';
  };

  const getCoverageIcon = (coverage: number) => {
    if (coverage >= 0.9) {
      return <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />;
    }
    if (coverage >= 0.7) {
      return <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />;
    }
    return <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#ef4444' }} />;
  };

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

  const overallCoverage = totalItems > 0 ? totalMapped / totalItems : 0;

  return (
    <MuiBox sx={{ mt: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Auto-Mapping Results
        </Typography>
        <Chip
          icon={getCoverageIcon(overallCoverage)}
          label={`${formatPercentage(overallCoverage)} overall coverage`}
          color={getCoverageColor(overallCoverage)}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
        {/* Specialties Coverage */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {getCoverageIcon(coverage.coverage.specialties.coverage)}
            <Typography variant="subtitle2" fontWeight={600}>
              Specialties
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {coverage.coverage.specialties.mapped} / {coverage.coverage.specialties.mapped + coverage.coverage.specialties.unmapped} mapped
          </Typography>
          <Typography variant="h6" color={getCoverageColor(coverage.coverage.specialties.coverage) === 'success' ? 'success.main' : 'warning.main'}>
            {formatPercentage(coverage.coverage.specialties.coverage)}
          </Typography>
          {coverage.coverage.specialties.unmapped > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {coverage.coverage.specialties.unmapped} need review
            </Typography>
          )}
        </Box>

        {/* Provider Types Coverage */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {getCoverageIcon(coverage.coverage.providerTypes.coverage)}
            <Typography variant="subtitle2" fontWeight={600}>
              Provider Types
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {coverage.coverage.providerTypes.mapped} / {coverage.coverage.providerTypes.mapped + coverage.coverage.providerTypes.unmapped} mapped
          </Typography>
          <Typography variant="h6" color={getCoverageColor(coverage.coverage.providerTypes.coverage) === 'success' ? 'success.main' : 'warning.main'}>
            {formatPercentage(coverage.coverage.providerTypes.coverage)}
          </Typography>
          {coverage.coverage.providerTypes.unmapped > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {coverage.coverage.providerTypes.unmapped} need review
            </Typography>
          )}
        </Box>

        {/* Regions Coverage */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {getCoverageIcon(coverage.coverage.regions.coverage)}
            <Typography variant="subtitle2" fontWeight={600}>
              Regions
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {coverage.coverage.regions.mapped} / {coverage.coverage.regions.mapped + coverage.coverage.regions.unmapped} mapped
          </Typography>
          <Typography variant="h6" color={getCoverageColor(coverage.coverage.regions.coverage) === 'success' ? 'success.main' : 'warning.main'}>
            {formatPercentage(coverage.coverage.regions.coverage)}
          </Typography>
          {coverage.coverage.regions.unmapped > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {coverage.coverage.regions.unmapped} need review
            </Typography>
          )}
        </Box>

        {/* Variables Coverage */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {getCoverageIcon(coverage.coverage.variables.coverage)}
            <Typography variant="subtitle2" fontWeight={600}>
              Variables
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {coverage.coverage.variables.mapped} / {coverage.coverage.variables.mapped + coverage.coverage.variables.unmapped} mapped
          </Typography>
          <Typography variant="h6" color={getCoverageColor(coverage.coverage.variables.coverage) === 'success' ? 'success.main' : 'warning.main'}>
            {formatPercentage(coverage.coverage.variables.coverage)}
          </Typography>
          {coverage.coverage.variables.unmapped > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {coverage.coverage.variables.unmapped} need review
            </Typography>
          )}
        </Box>
      </Box>

      {/* Applied Counts Summary */}
      {(coverage.appliedCounts.specialties > 0 || 
        coverage.appliedCounts.providerTypes > 0 || 
        coverage.appliedCounts.regions > 0 || 
        coverage.appliedCounts.variables > 0) && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Applied {coverage.appliedCounts.specialties + coverage.appliedCounts.providerTypes + coverage.appliedCounts.regions + coverage.appliedCounts.variables} learned mappings automatically
          </Typography>
        </Alert>
      )}

      {/* Unmapped Items Warning */}
      {(coverage.coverage.specialties.unmapped > 0 || 
        coverage.coverage.providerTypes.unmapped > 0 || 
        coverage.coverage.regions.unmapped > 0 || 
        coverage.coverage.variables.unmapped > 0) && (
        <Alert 
          severity="info" 
          icon={<InformationCircleIcon style={{ width: 20, height: 20 }} />}
          action={
            onReviewMappings && (
              <Typography 
                variant="body2" 
                sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'primary.main' }}
                onClick={onReviewMappings}
              >
                Review Mappings
              </Typography>
            )
          }
        >
          <Typography variant="body2">
            Some items need manual mapping. You can review and map them now, or continue to analytics.
          </Typography>
        </Alert>
      )}

      {/* Errors */}
      {coverage.errors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Mapping Application Warnings:
          </Typography>
          {coverage.errors.map((error, index) => (
            <Typography key={index} variant="body2" sx={{ ml: 2 }}>
              • {error}
            </Typography>
          ))}
        </Alert>
      )}
    </MuiBox>
  );
});

MappingCoverageSummary.displayName = 'MappingCoverageSummary';

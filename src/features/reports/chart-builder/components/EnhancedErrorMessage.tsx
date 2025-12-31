/**
 * Enhanced Error Message Component
 * 
 * Provides specific, actionable error messages with guidance
 */

import React from 'react';
import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material';
import { ExclamationTriangleIcon, LightBulbIcon } from '@heroicons/react/24/outline';

export interface ErrorContext {
  type: 'no_data' | 'filter_too_restrictive' | 'no_specialties' | 'no_metrics' | 'processing_error' | 'unknown';
  message: string;
  suggestions?: string[];
  onAction?: () => void;
  actionLabel?: string;
}

interface EnhancedErrorMessageProps {
  error: ErrorContext;
  onDismiss?: () => void;
}

export const EnhancedErrorMessage: React.FC<EnhancedErrorMessageProps> = ({
  error,
  onDismiss
}) => {
  const getDefaultSuggestions = (type: ErrorContext['type']): string[] => {
    switch (type) {
      case 'no_data':
        return [
          'Upload survey data from the Upload screen',
          'Check that surveys contain data for the selected year',
          'Verify that data has been properly processed'
        ];
      case 'filter_too_restrictive':
        return [
          'Try removing some filters to expand your selection',
          'Select more specialties or regions',
          'Check if data exists for the selected survey sources'
        ];
      case 'no_specialties':
        return [
          'Select at least one specialty from the filters',
          'Try selecting "All Specialties" if available',
          'Check that specialty data exists in your surveys'
        ];
      case 'no_metrics':
        return [
          'Select at least one metric (TCC, wRVU, or CF)',
          'Check that your data contains the selected metrics',
          'Try selecting different percentile values'
        ];
      case 'processing_error':
        return [
          'Try refreshing the page',
          'Check your browser console for detailed errors',
          'Contact support if the issue persists'
        ];
      default:
        return ['Try adjusting your filters', 'Refresh the page', 'Contact support if needed'];
    }
  };

  const suggestions = error.suggestions || getDefaultSuggestions(error.type);

  return (
    <Alert 
      severity="warning" 
      icon={<ExclamationTriangleIcon className="h-5 w-5" />}
      onClose={onDismiss}
      sx={{
        mb: 3,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <AlertTitle sx={{ fontWeight: 600, mb: 1 }}>
        {error.message}
      </AlertTitle>
      
      {suggestions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LightBulbIcon className="h-4 w-4 mr-1" style={{ color: '#f59e0b' }} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#92400e' }}>
              Suggestions:
            </Typography>
          </Box>
          <Box component="ul" sx={{ m: 0, pl: 3, mb: error.onAction ? 2 : 0 }}>
            {suggestions.map((suggestion, index) => (
              <Typography 
                key={index} 
                component="li" 
                variant="body2" 
                sx={{ color: '#78350f', mb: 0.5 }}
              >
                {suggestion}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {error.onAction && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={error.onAction}
            sx={{
              borderColor: '#f59e0b',
              color: '#92400e',
              '&:hover': {
                borderColor: '#d97706',
                backgroundColor: '#fef3c7'
              }
            }}
          >
            {error.actionLabel || 'Take Action'}
          </Button>
        </Box>
      )}
    </Alert>
  );
};










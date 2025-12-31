/**
 * Processing Progress Component
 * 
 * Shows progress indicator during data processing
 */

import React from 'react';
import { LinearProgress, Box, Typography } from '@mui/material';

interface ProcessingProgressProps {
  progress: number;
  message?: string;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  progress,
  message = 'Processing data...'
}) => {
  if (progress === 0 || progress >= 100) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {message}
        </Typography>
        <Typography variant="body2" sx={{ ml: 'auto', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
          {Math.round(progress)}%
        </Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: '#e5e7eb',
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            backgroundColor: '#6366f1'
          }
        }}
      />
    </Box>
  );
};










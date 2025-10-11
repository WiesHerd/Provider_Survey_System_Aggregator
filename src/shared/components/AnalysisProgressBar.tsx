import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Typography } from '@mui/material';

interface AnalysisProgressBarProps {
  message: string;
  progress: number;
  recordCount?: number;
  className?: string;
}

/**
 * Reusable progress bar component for analysis tools
 * Provides consistent loading experience across all analysis screens
 */
export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({
  message,
  progress,
  recordCount = 0,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
        <LoadingSpinner 
          message={message}
          size="lg"
          variant="primary"
        />
        <div className="mt-4 text-center">
          <Typography variant="body2" color="textSecondary">
            Processing {recordCount} records for optimal performance...
          </Typography>
          {progress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <Typography variant="caption" color="textSecondary" className="mt-1">
                {progress.toFixed(2)}% complete
              </Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

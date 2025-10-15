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
        <div className="text-center">
          {/* Purple/Indigo Arc Spinner - LARGER SIZE TO MATCH SCREENSHOT */}
          <div className="w-12 h-12 mx-auto mb-4">
            <div 
              className="w-12 h-12 rounded-full animate-spin"
              style={{
                background: 'conic-gradient(from 0deg, #8B5CF6, #A855F7, #C084FC, transparent 70%)',
                animationDuration: '1s',
                animationTimingFunction: 'linear',
                mask: 'radial-gradient(circle at center, transparent 60%, black 60%)',
                WebkitMask: 'radial-gradient(circle at center, transparent 60%, black 60%)'
              }}
            />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
        </div>
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

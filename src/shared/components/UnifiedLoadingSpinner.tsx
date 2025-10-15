import React, { useEffect } from 'react';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import './UnifiedLoadingSpinner.css';

interface UnifiedLoadingSpinnerProps {
  message: string;
  recordCount?: number;
  showProgress?: boolean;
  progress?: number; // If provided, use this; otherwise use useSmoothProgress
  className?: string;
  onComplete?: () => void;
}

/**
 * UNIFIED LOADING SPINNER - Single Source of Truth
 * 
 * This is the ONLY spinner component that should be used throughout the application.
 * All other spinner components are deprecated in favor of this unified implementation.
 * 
 * Features:
 * - Standard w-12 h-12 (48px) size matching user's screenshot preference
 * - Conic-gradient purple/indigo animation
 * - Built-in progress bar support
 * - Dynamic progress using useSmoothProgress hook
 * - Consistent styling across all screens
 */
export const UnifiedLoadingSpinner: React.FC<UnifiedLoadingSpinnerProps> = ({
  message,
  recordCount = 0,
  showProgress = true,
  progress: externalProgress,
  className = '',
  onComplete
}) => {
  // Use external progress if provided, otherwise use internal smooth progress
  const { progress: internalProgress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000, // 3 seconds default
    maxProgress: 90, // Stop at 90% until completion
    intervalMs: 100
  });

  // Start progress animation on mount if no external progress
  useEffect(() => {
    if (externalProgress === undefined) {
      startProgress();
    }
  }, [startProgress, externalProgress]);

  // Complete progress when external progress is provided and is 100%
  useEffect(() => {
    if (externalProgress !== undefined && externalProgress >= 100) {
      completeProgress();
      onComplete?.();
    }
  }, [externalProgress, completeProgress, onComplete]);

  // Use external progress if provided, otherwise use internal smooth progress
  const currentProgress = externalProgress !== undefined ? externalProgress : internalProgress;
  
  console.log(`🔄 UnifiedLoadingSpinner progress: ${currentProgress.toFixed(1)}% (external: ${externalProgress}, internal: ${internalProgress.toFixed(1)})`);

  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Purple/Indigo Arc Spinner - UNIFIED SIZE */}
          <div className="w-12 h-12 mx-auto mb-4">
            <div 
              className="w-12 h-12 rounded-full animate-spin unified-spinner"
            />
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
          <p className="text-gray-600 mb-4">Processing {recordCount} records for optimal performance...</p>
          
          {/* Progress Bar - Only show if showProgress is true */}
          {showProgress && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
              
              {/* Progress Percentage */}
              <p className="text-sm text-gray-700 font-medium">{currentProgress.toFixed(2)}% complete</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedLoadingSpinner;

import React, { useEffect, useMemo } from 'react';
import { useLoadingProgress } from '../hooks/useLoadingProgress';
import './UnifiedLoadingSpinner.css';

export interface EnterpriseLoadingSpinnerProps {
  /**
   * Loading message to display
   */
  message: string;
  
  /**
   * Record count to display
   * - If number: use this value
   * - If 'auto': calculate from data prop
   * - If undefined: show generic message without count
   */
  recordCount?: number | 'auto';
  
  /**
   * Data array for auto-calculating record count when recordCount='auto'
   */
  data?: any[];
  
  /**
   * External progress value (0-100)
   * If provided, will use this instead of internal animation
   */
  progress?: number;
  
  /**
   * Whether to show progress bar (default: true)
   */
  showProgress?: boolean;
  
  /**
   * Display variant
   * - 'overlay': Modal overlay with backdrop
   * - 'inline': Inline within content
   * - 'fullscreen': Full screen centered
   */
  variant?: 'overlay' | 'inline' | 'fullscreen';
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Callback when loading completes
   */
  onComplete?: () => void;
  
  /**
   * Loading state (for auto-progress management)
   */
  loading?: boolean;
}

/**
 * Enterprise-Grade Loading Spinner Component
 * 
 * World-class, uniform loading spinner used throughout the application.
 * Implements Google/Microsoft-style design with professional UX patterns.
 * 
 * Features:
 * - Consistent 48px spinner with purple/indigo gradient
 * - Smart record count calculation
 * - Smooth progress animation (0-90% then 100% on completion)
 * - Accessibility compliant (ARIA labels, screen reader support)
 * - Performance optimized (CSS-only animations)
 * - Multiple display variants (overlay, inline, fullscreen)
 * 
 * @example
 * ```tsx
 * <EnterpriseLoadingSpinner
 *   message="Loading analytics data..."
 *   recordCount="auto"
 *   data={analyticsData}
 *   progress={loadingProgress}
 *   variant="overlay"
 * />
 * ```
 */
export const EnterpriseLoadingSpinner: React.FC<EnterpriseLoadingSpinnerProps> = ({
  message,
  recordCount: recordCountProp,
  data,
  progress: externalProgress,
  showProgress = true,
  variant = 'overlay',
  className = '',
  onComplete,
  loading = true
}) => {
  // Calculate record count
  const calculatedRecordCount = useMemo(() => {
    if (typeof recordCountProp === 'number') {
      return recordCountProp;
    }
    if (recordCountProp === 'auto' && data && Array.isArray(data)) {
      return data.length;
    }
    return undefined; // Will show generic message
  }, [recordCountProp, data]);

  // Use loading progress hook for smart progress tracking
  const {
    progress: hookProgress,
    formattedRecordCount
  } = useLoadingProgress({
    totalRecords: calculatedRecordCount,
    data,
    loading,
    externalProgress
  });

  // Use external progress if provided, otherwise use hook progress
  const currentProgress = externalProgress !== undefined 
    ? Math.max(0, Math.min(100, externalProgress))
    : hookProgress;

  // Ensure progress never shows 0% indefinitely - minimum 5% after 500ms
  const [displayProgress, setDisplayProgress] = React.useState(0);
  
  useEffect(() => {
    if (currentProgress > 0) {
      setDisplayProgress(currentProgress);
    } else {
      // Show minimum 5% after 500ms if still at 0%
      const timer = setTimeout(() => {
        if (currentProgress === 0) {
          setDisplayProgress(5);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentProgress]);

  // Call onComplete when progress reaches 100%
  useEffect(() => {
    if (currentProgress >= 100 && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentProgress, onComplete]);

  // Format record count message
  const recordCountMessage = useMemo(() => {
    if (calculatedRecordCount === undefined) {
      return 'Processing data for optimal performance...';
    }
    if (calculatedRecordCount === 0) {
      return 'Preparing data...';
    }
    return `Processing ${formattedRecordCount} record${calculatedRecordCount !== 1 ? 's' : ''} for optimal performance...`;
  }, [calculatedRecordCount, formattedRecordCount]);

  // Spinner content
  const spinnerContent = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
      <div className="text-center">
        {/* Purple/Indigo Arc Spinner - UNIFIED SIZE (48px) */}
        <div className="w-12 h-12 mx-auto mb-4" role="status" aria-label="Loading">
          <div 
            className="w-12 h-12 rounded-full animate-spin unified-spinner"
            aria-hidden="true"
          />
        </div>
        
        {/* Main Message */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
        
        {/* Record Count Message */}
        <p className="text-gray-600 mb-4">{recordCountMessage}</p>
        
        {/* Progress Bar - Always show unless explicitly disabled */}
        {showProgress && (
          <>
            <div 
              className="w-full bg-gray-200 rounded-full h-2 mb-2"
              role="progressbar"
              aria-valuenow={Math.round(displayProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${message}: ${displayProgress.toFixed(1)}% complete`}
            >
              <div 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            
            {/* Progress Percentage */}
            <p className="text-sm text-gray-700 font-medium" aria-live="polite">
              {displayProgress.toFixed(2)}% complete
            </p>
          </>
        )}
      </div>
    </div>
  );

  // Render based on variant
  if (variant === 'overlay') {
    return (
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60] ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={message}
      >
        {spinnerContent}
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div 
        className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}
        role="status"
        aria-label={message}
      >
        {spinnerContent}
      </div>
    );
  }

  // Inline variant
  return (
    <div 
      className={`flex items-center justify-center py-8 ${className}`}
      role="status"
      aria-label={message}
    >
      {spinnerContent}
    </div>
  );
};

export default EnterpriseLoadingSpinner;




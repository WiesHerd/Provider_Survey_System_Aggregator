import React from 'react';
import { UnifiedLoadingSpinner } from './UnifiedLoadingSpinner';

interface AnalysisProgressBarProps {
  message: string;
  progress: number;
  recordCount?: number;
  className?: string;
}

/**
 * DEPRECATED: Use UnifiedLoadingSpinner directly instead
 * This component is kept for backward compatibility only
 * 
 * @deprecated Use UnifiedLoadingSpinner directly for new implementations
 */
export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({
  message,
  progress,
  recordCount = 0,
  className = ''
}) => {
  return (
    <UnifiedLoadingSpinner
      message={message}
      recordCount={recordCount}
      progress={progress}
      showProgress={true}
      className={className}
    />
  );
};

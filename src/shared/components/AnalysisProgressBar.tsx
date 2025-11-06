import React from 'react';
import { EnterpriseLoadingSpinner } from './EnterpriseLoadingSpinner';

interface AnalysisProgressBarProps {
  message: string;
  progress: number;
  recordCount?: number;
  className?: string;
}

/**
 * DEPRECATED: Use EnterpriseLoadingSpinner directly instead
 * This component is kept for backward compatibility only
 * 
 * @deprecated Use EnterpriseLoadingSpinner from './EnterpriseLoadingSpinner' for new implementations
 */
export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({
  message,
  progress,
  recordCount = 0,
  className = ''
}) => {
  console.warn('⚠️ AnalysisProgressBar is deprecated. Use EnterpriseLoadingSpinner instead.');
  return (
    <EnterpriseLoadingSpinner
      message={message}
      recordCount={recordCount}
      progress={progress}
      variant="overlay"
      className={className}
      loading={true}
    />
  );
};

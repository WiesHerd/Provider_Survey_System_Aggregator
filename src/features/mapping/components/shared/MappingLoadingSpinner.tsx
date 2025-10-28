import React from 'react';
import { AnalysisProgressBar } from '../../../../shared/components';

interface MappingLoadingSpinnerProps {
  entityName: string;
  message?: string;
}

/**
 * Standardized loading spinner for all mapping screens
 * Ensures consistent positioning and styling across all mapping screens
 */
export const MappingLoadingSpinner: React.FC<MappingLoadingSpinnerProps> = ({ 
  entityName, 
  message 
}) => {
  const defaultMessage = message || `Loading ${entityName.toLowerCase()} mappings...`;
  
  return (
    <AnalysisProgressBar
      message={defaultMessage}
      progress={100}
      recordCount={0}
    />
  );
};

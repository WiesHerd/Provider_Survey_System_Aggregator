import React from 'react';
import { EnterpriseLoadingSpinner } from '../../../../shared/components/EnterpriseLoadingSpinner';

interface MappingLoadingSpinnerProps {
  entityName: string;
  message?: string;
  data?: any[];
}

/**
 * Standardized loading spinner for all mapping screens
 * Ensures consistent positioning and styling across all mapping screens
 */
export const MappingLoadingSpinner: React.FC<MappingLoadingSpinnerProps> = ({ 
  entityName, 
  message,
  data
}) => {
  const defaultMessage = message || `Loading ${entityName.toLowerCase()} mappings...`;
  
  return (
    <EnterpriseLoadingSpinner
      message={defaultMessage}
      recordCount="auto"
      data={data}
      variant="overlay"
      loading={true}
    />
  );
};

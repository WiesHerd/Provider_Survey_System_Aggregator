import React from 'react';
import { EnterpriseLoadingSpinner } from '../../../../shared/components/EnterpriseLoadingSpinner';

interface MappingLoadingSpinnerProps {
  entityName: string;
  message?: string;
  data?: any[];
  /** Use 'inline' to show spinner in content area (avoids double spinner with Suspense). */
  variant?: 'overlay' | 'inline';
}

/**
 * Standardized loading spinner for all mapping screens.
 * Prefer variant="inline" with a page shell to avoid multiple full-page spinners (Suspense + data).
 */
export const MappingLoadingSpinner: React.FC<MappingLoadingSpinnerProps> = ({ 
  entityName, 
  message,
  data,
  variant = 'overlay'
}) => {
  const defaultMessage = message || `Loading ${entityName.toLowerCase()} mappings...`;
  
  return (
    <EnterpriseLoadingSpinner
      message={defaultMessage}
      recordCount="auto"
      data={data}
      variant={variant}
      loading={true}
    />
  );
};

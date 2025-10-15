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
    <div className="w-full min-h-screen">
      <div className="w-full flex flex-col gap-4">
        {/* Main Mapping Section - Same container as actual content */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <AnalysisProgressBar
            message={defaultMessage}
            progress={100}
            recordCount={0}
          />
        </div>
      </div>
    </div>
  );
};

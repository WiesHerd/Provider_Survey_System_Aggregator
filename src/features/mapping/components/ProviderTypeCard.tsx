import React from 'react';
import { Paper, Typography } from '@mui/material';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ProviderTypeCardProps } from '../types/mapping';
import { getSurveySourceColor } from '../utils/mappingCalculations';
import { formatProviderTypeForDisplay } from '../../../shared/utils';

/**
 * ProviderTypeCard component for displaying individual unmapped provider types
 * Matches the SpecialtyCard structure exactly
 * 
 * @param providerType - The unmapped provider type to display
 * @param isSelected - Whether the provider type is currently selected
 * @param onSelect - Callback when the provider type is clicked
 */
export const ProviderTypeCard: React.FC<ProviderTypeCardProps> = ({ 
  providerType, 
  isSelected, 
  onSelect
}) => {
  const handleClick = () => {
    onSelect(providerType);
  };

  return (
    <Paper 
      onClick={handleClick}
      className={`p-3 relative transition-colors duration-200 border cursor-pointer ${
        isSelected 
          ? 'bg-indigo-50 border-2 border-indigo-400 shadow-md' 
          : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      style={{ 
        borderLeftColor: getSurveySourceColor(providerType.surveySource), 
        borderLeftWidth: '3px' 
      }}
    >
      {/* Green checkmark for selected items */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="flex items-center">
        <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
          {formatProviderTypeForDisplay(providerType.name)}
        </Typography>
      </div>
    </Paper>
  );
};




import React from 'react';
import { Paper, Typography } from '@mui/material';
import { CheckIcon } from '@heroicons/react/24/solid';
import { VariableCardProps } from '../types/mapping';
import { getSurveySourceColor } from '../utils/mappingCalculations';
import { formatFieldNameForDisplay } from '../../../shared/utils';

/**
 * VariableCard component for displaying individual unmapped variables
 * Matches the SpecialtyCard structure exactly
 * 
 * @param variable - The unmapped variable to display
 * @param isSelected - Whether the variable is currently selected
 * @param onSelect - Callback when the variable is clicked
 */
export const VariableCard: React.FC<VariableCardProps> = ({ 
  variable, 
  isSelected, 
  onSelect
}) => {
  const handleClick = () => {
    onSelect(variable);
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
        borderLeftColor: getSurveySourceColor(variable.surveySource), 
        borderLeftWidth: '3px' 
      }}
    >
      {/* Green checkmark for selected items */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm z-10">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="flex items-center pr-8">
        <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
          {formatFieldNameForDisplay(variable.name)}
        </Typography>
      </div>
    </Paper>
  );
};


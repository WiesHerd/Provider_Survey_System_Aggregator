import React from 'react';
import { Paper, Typography } from '@mui/material';
import { CheckIcon } from '@heroicons/react/24/solid';
import { VariableCardProps } from '../types/mapping';
import { getSurveySourceColor } from '../utils/mappingCalculations';

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
        <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
            {variable.name}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Frequency: {variable.frequency}
          </Typography>
        </div>
        <div className="ml-2">
          <Typography 
            variant="caption" 
            style={{ color: getSurveySourceColor(variable.surveySource) }} 
            className="text-xs font-medium whitespace-nowrap"
          >
            {variable.surveySource}
          </Typography>
        </div>
      </div>
    </Paper>
  );
};


import React from 'react';
import { Paper, Typography } from '@mui/material';
import { CheckIcon } from '@heroicons/react/24/solid';
import { SpecialtyCardProps } from '../types/mapping';
import { getSurveySourceColor } from '../utils/mappingCalculations';

/**
 * SpecialtyCard component for displaying individual unmapped specialties
 * 
 * @param specialty - The unmapped specialty to display
 * @param isSelected - Whether the specialty is currently selected
 * @param onSelect - Callback when the specialty is clicked to select
 * @param onDeselect - Callback when the specialty is clicked to deselect
 */
export const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ 
  specialty, 
  isSelected, 
  onSelect,
  onDeselect
}) => {
  const handleClick = () => {
    if (isSelected) {
      onDeselect?.(specialty);
    } else {
      onSelect(specialty);
    }
  };

  return (
    <Paper 
      onClick={handleClick}
      className={`p-3 relative transition-all duration-200 border cursor-pointer ${
        isSelected 
          ? 'bg-indigo-50 border-2 border-indigo-500 ring-2 ring-indigo-200 shadow-md' 
          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      style={{ 
        borderLeftColor: getSurveySourceColor(specialty.surveySource), 
        borderLeftWidth: isSelected ? '5px' : '3px' 
      }}
    >
      {/* Green checkmark for selected items */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow">
          <CheckIcon className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
            {specialty.name}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Frequency: {specialty.frequency}
          </Typography>
        </div>
        <div className="ml-2">
          <Typography 
            variant="caption" 
            style={{ color: getSurveySourceColor(specialty.surveySource) }} 
            className="text-xs font-medium whitespace-nowrap"
          >
            {specialty.surveySource}
          </Typography>
        </div>
      </div>
    </Paper>
  );
};

import React from 'react';
import { Paper, Typography } from '@mui/material';
import { SpecialtyCardProps } from '../types/mapping';
import { getSurveySourceColor } from '../utils/mappingCalculations';

/**
 * SpecialtyCard component for displaying individual unmapped specialties
 * 
 * @param specialty - The unmapped specialty to display
 * @param isSelected - Whether the specialty is currently selected
 * @param onSelect - Callback when the specialty is clicked
 */
export const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ 
  specialty, 
  isSelected, 
  onSelect
}) => {
  const handleClick = () => {
    onSelect(specialty);
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
        borderLeftColor: getSurveySourceColor(specialty.surveySource), 
        borderLeftWidth: '3px' 
      }}
    >
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

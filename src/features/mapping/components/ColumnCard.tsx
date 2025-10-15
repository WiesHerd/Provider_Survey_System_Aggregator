import React from 'react';
import { Paper, Typography } from '@mui/material';
import { CheckIcon } from '@heroicons/react/24/solid';
import { IColumnInfo } from '../../../types/column';
import { getSurveySourceColor } from '../utils/mappingCalculations';

interface ColumnCardProps {
  column: IColumnInfo;
  isSelected: boolean;
  onSelect: (column: IColumnInfo) => void;
}

/**
 * ColumnCard component for displaying individual unmapped columns
 * Matches the structure of SpecialtyCard exactly for consistency
 * 
 * @param column - The column information to display
 * @param isSelected - Whether the column is currently selected
 * @param onSelect - Callback when the column is clicked to select
 */
export const ColumnCard: React.FC<ColumnCardProps> = ({ 
  column, 
  isSelected, 
  onSelect
}) => {
  const handleClick = () => {
    onSelect(column);
  };

  return (
    <Paper 
      onClick={handleClick}
      role="button"
      className={`p-3 relative transition-all duration-200 border cursor-pointer ${
        isSelected 
          ? 'bg-indigo-50 border-2 border-indigo-500 ring-2 ring-indigo-200 shadow-md' 
          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      style={{ 
        borderLeftColor: getSurveySourceColor(column.surveySource), 
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
            {column.name}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Frequency: {(column as any).frequency || 'N/A'}
          </Typography>
        </div>
        <div className="ml-2">
          <Typography 
            variant="caption" 
            style={{ color: getSurveySourceColor(column.surveySource) }} 
            className="text-xs font-medium whitespace-nowrap"
          >
            {column.surveySource}
          </Typography>
        </div>
      </div>
    </Paper>
  );
};

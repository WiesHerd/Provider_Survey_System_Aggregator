import React from 'react';
import { Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { PencilIcon as EditIcon, TrashIcon as DeleteIcon } from '@heroicons/react/24/outline';
import { IColumnMapping } from '../types/column';
import { getSurveySourceColor } from '../features/mapping/utils/mappingCalculations';

interface MappedColumnsProps {
  mapping: IColumnMapping;
  onEdit?: () => void;
  onDelete?: () => void;
  selected?: boolean;
}

const MappedColumns: React.FC<MappedColumnsProps> = ({ mapping, onEdit, onDelete, selected = false }) => {

  // Format date to be more readable
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Paper className={`p-3 relative transition-all duration-200 border ${
      selected
        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-md'
        : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}>
      {/* Header with standardized name and actions */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
            {mapping.standardizedName}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Last updated: {formatDate(mapping.updatedAt)}
          </Typography>
        </div>
        <div className="flex space-x-1">
          {selected && (
            <div className="mr-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            </div>
          )}
          {onEdit && (
            <Tooltip title="Edit mapping">
              <IconButton onClick={onEdit} size="small">
                <EditIcon className="h-4 w-4 text-gray-500" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete mapping">
              <IconButton onClick={onDelete} size="small">
                <DeleteIcon className="h-4 w-4 text-gray-500" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Connected columns display */}
      <div className="relative mt-2">
        {/* Source columns in horizontal layout */}
        <div className="flex flex-wrap gap-2 ml-6">
          {mapping.sourceColumns.map((column, index) => (
            <div key={column.id} className="relative">
              {/* Connector line to main column */}
              {index > 0 && (
                <div className="absolute -left-1 top-1/2 h-0.5 w-2 bg-gray-200" />
              )}
              
              {/* Column card */}
              <div 
                className="p-2 rounded border border-gray-200 min-w-0 bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm hover:shadow-md"
                style={{ 
                  borderLeftColor: getSurveySourceColor(column.surveySource), 
                  borderLeftWidth: '3px' 
                }}
              >
                <div className="flex justify-between items-center gap-2">
                  <Typography className="font-medium text-sm truncate">
                    {column.name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    style={{ color: getSurveySourceColor(column.surveySource) }} 
                    className="text-xs font-medium whitespace-nowrap"
                  >
                    {column.surveySource}
                  </Typography>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Paper>
  );
};

export default MappedColumns; 
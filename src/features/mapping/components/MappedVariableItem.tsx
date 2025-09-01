import React from 'react';
import { Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { 
  PencilIcon as EditIcon, 
  TrashIcon as DeleteIcon 
} from '@heroicons/react/24/outline';
import { IVariableMapping } from '../types/mapping';
import { getSurveySourceColor, formatMappingDate } from '../utils/mappingCalculations';

interface MappedVariableItemProps {
  mapping: IVariableMapping;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * MappedVariableItem component for displaying individual mapped variable items
 * 
 * @param mapping - The variable mapping to display
 * @param onEdit - Optional callback when the mapping is edited
 * @param onDelete - Optional callback when the mapping is deleted
 */
export const MappedVariableItem: React.FC<MappedVariableItemProps> = ({ 
  mapping, 
  onEdit, 
  onDelete 
}) => {
  return (
    <Paper className="p-3 relative bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md">
      {/* Header with standardized name and actions */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
            {mapping.standardizedName}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Last updated: {formatMappingDate(mapping.updatedAt)}
          </Typography>
        </div>
        <div className="flex space-x-1">
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

      {/* Connected variables display */}
      <div className="relative mt-2">
        {/* Source variables in horizontal layout */}
        <div className="flex flex-wrap gap-2 ml-6">
          {mapping.sourceVariables.map((variable, index) => (
            <div key={variable.id} className="relative">
              {/* Connector line to main variable */}
              {index > 0 && (
                <div className="absolute -left-1 top-1/2 h-0.5 w-2 bg-gray-200" />
              )}
              
              {/* Variable card */}
              <div 
                className="p-2 rounded border border-gray-200 min-w-0 bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm hover:shadow-md"
                style={{ 
                  borderLeftColor: getSurveySourceColor(variable.surveySource), 
                  borderLeftWidth: '3px' 
                }}
              >
                <div className="flex justify-between items-center gap-2">
                  <Typography className="font-medium text-sm truncate">
                    {variable.originalVariableName}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    style={{ color: getSurveySourceColor(variable.surveySource) }} 
                    className="text-xs font-medium whitespace-nowrap"
                  >
                    {variable.surveySource}
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



import React from 'react';
import { Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { 
  PencilIcon as EditIcon, 
  TrashIcon as DeleteIcon 
} from '@heroicons/react/24/outline';
import { IProviderTypeMapping } from '../types/mapping';
import { getSurveySourceColor, formatMappingDate } from '../utils/mappingCalculations';

interface MappedProviderTypeItemProps {
  mapping: IProviderTypeMapping;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * MappedProviderTypeItem component for displaying individual mapped provider type items
 * Matches the structure of MappedSpecialtyItem exactly
 * 
 * @param mapping - The provider type mapping to display
 * @param onEdit - Optional callback when the mapping is edited
 * @param onDelete - Optional callback when the mapping is deleted
 */
export const MappedProviderTypeItem: React.FC<MappedProviderTypeItemProps> = ({ 
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

      {/* Connected provider types display */}
      <div className="relative mt-2">
        {/* Source provider types in horizontal layout */}
        <div className="flex flex-wrap gap-2 ml-6">
          {mapping.sourceProviderTypes.map((providerType, index) => (
            <div key={`${providerType.surveySource}-${providerType.providerType}`} className="relative">
              {/* Connector line to main provider type */}
              {index > 0 && (
                <div className="absolute -left-1 top-1/2 h-0.5 w-2 bg-gray-200" />
              )}
              
              {/* Provider type card */}
              <div 
                className="p-2 rounded border border-gray-200 min-w-0 bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm hover:shadow-md"
                style={{ 
                  borderLeftColor: getSurveySourceColor(providerType.surveySource), 
                  borderLeftWidth: '3px' 
                }}
              >
                <div className="flex justify-between items-center gap-2">
                  <Typography className="font-medium text-sm truncate">
                    {providerType.providerType}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    style={{ color: getSurveySourceColor(providerType.surveySource) }} 
                    className="text-xs font-medium whitespace-nowrap"
                  >
                    {providerType.surveySource}
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



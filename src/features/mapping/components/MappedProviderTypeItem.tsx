import React, { memo } from 'react';
import { Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { 
  PencilIcon as EditIcon, 
  TrashIcon as DeleteIcon 
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { IProviderTypeMapping } from '../types/mapping';
import { getSurveySourceColor, formatMappingDate } from '../utils/mappingCalculations';
import { formatProviderTypeForDisplay } from '../../../shared/utils';

interface MappedProviderTypeItemProps {
  mapping: IProviderTypeMapping;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  isBulkMode?: boolean;
  onSelect?: () => void;
}

/**
 * MappedProviderTypeItem component for displaying individual mapped provider type items
 * Matches the structure of MappedSpecialtyItem exactly
 * 
 * @param mapping - The provider type mapping to display
 * @param onEdit - Optional callback when the mapping is edited
 * @param onDelete - Optional callback when the mapping is deleted
 */
export const MappedProviderTypeItem: React.FC<MappedProviderTypeItemProps> = memo(({ 
  mapping, 
  onEdit, 
  onDelete,
  isSelected = false,
  isBulkMode = false,
  onSelect
}) => {
  // Handle card click for bulk selection
  const handleCardClick = () => {
    if (isBulkMode && onSelect) {
      onSelect();
    }
  };

  // Handle delete button click - prevent card selection
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  // Handle edit button click - prevent card selection
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  // Determine card styling based on selection state
  const cardClassName = isBulkMode && isSelected
    ? 'p-3 relative bg-indigo-50 border-2 border-indigo-300 ring-2 ring-indigo-100 shadow-md transition-all duration-200 cursor-pointer'
    : isBulkMode
    ? 'p-3 relative bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'
    : 'p-3 relative bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md';

  return (
    <Paper 
      className={cardClassName}
      onClick={isBulkMode ? handleCardClick : undefined}
    >
      {/* Header with standardized name and actions */}
      <div className="flex justify-between items-start mb-2">
        <div className={`flex-1 ${isBulkMode && isSelected ? 'pl-7' : ''}`}>
          {/* Purple checkmark for selected items in bulk mode */}
          {isBulkMode && isSelected && (
            <div className="absolute top-2 left-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm z-10">
              <CheckIcon className="w-3 h-3 text-white" />
            </div>
          )}
          <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
            {mapping.standardizedName}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Last updated: {formatMappingDate(mapping.updatedAt)}
          </Typography>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <Tooltip title="Edit mapping">
              <IconButton onClick={handleEditClick} size="small" className="p-1">
                <EditIcon className="h-4 w-4 text-gray-500" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete mapping">
              <button
                onClick={handleDeleteClick}
                className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
                aria-label="Delete mapping"
              >
                <DeleteIcon className="h-4 w-4" />
              </button>
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
                    {formatProviderTypeForDisplay(providerType.providerType)}
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
});

MappedProviderTypeItem.displayName = 'MappedProviderTypeItem';




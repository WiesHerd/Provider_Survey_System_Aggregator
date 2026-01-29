import React, { memo, useMemo, useState } from 'react';
import { Paper, Typography, Tooltip } from '@mui/material';
import { 
  PencilIcon as EditIcon, 
  TrashIcon as DeleteIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon
} from '@heroicons/react/24/solid';
import { ISpecialtyMapping } from '../types/mapping';
import { getSurveySourceColor, formatMappingDate } from '../utils/mappingCalculations';
import { formatSpecialtyForDisplay } from '../../../shared/utils';

interface MappedSpecialtyItemProps {
  mapping: ISpecialtyMapping;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  isBulkMode?: boolean;
  onSelect?: () => void;
}

/**
 * MappedSpecialtyItem component for displaying individual mapped specialty items
 * Features circular pop-out action icons that appear on selection
 * 
 * @param mapping - The specialty mapping to display
 * @param onEdit - Optional callback when the mapping is edited
 * @param onDelete - Optional callback when the mapping is deleted
 */
export const MappedSpecialtyItem: React.FC<MappedSpecialtyItemProps> = memo(({ 
  mapping, 
  onEdit, 
  onDelete,
  isSelected = false,
  isBulkMode = false,
  onSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Memoize the formatted date to prevent unnecessary recalculations
  const formattedDate = useMemo(() => formatMappingDate(mapping.updatedAt), [mapping.updatedAt]);
  
  // Show action icons when selected or hovered (in bulk mode)
  const showActionIcons = isBulkMode && (isSelected || isHovered);
  
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

  // Handle select/deselect button click
  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Circular Pop-Out Action Icons - Appear on selection or hover in bulk mode */}
      {isBulkMode && (
        <div className={`absolute top-2 right-2 flex items-center gap-2 z-20 transition-all duration-300 ${
          showActionIcons 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}>
          {/* Select/Deselect Button */}
          <Tooltip title={isSelected ? "Deselect" : "Select"}>
            <span>
              <button
                onClick={handleSelectClick}
                className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
                aria-label={isSelected ? "Deselect mapping" : "Select mapping"}
              >
                {isSelected ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                )}
              </button>
            </span>
          </Tooltip>

          {/* Delete Button */}
          {onDelete && (
            <Tooltip title="Delete mapping">
              <span>
                <button
                  onClick={handleDeleteClick}
                  className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
                  aria-label="Delete mapping"
                >
                  <DeleteIcon className="w-4 h-4" />
                </button>
              </span>
            </Tooltip>
          )}

          {/* Edit Button (if provided) */}
          {onEdit && (
            <Tooltip title="Edit mapping">
              <span>
                <button
                  onClick={handleEditClick}
                  className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
                  aria-label="Edit mapping"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
              </span>
            </Tooltip>
          )}
        </div>
      )}

      {/* Header with standardized name */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-2">
          <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
            {formatSpecialtyForDisplay(mapping.standardizedName)}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Original specialties → Standardized specialty • Last updated: {formattedDate}
          </Typography>
        </div>
      </div>

      {/* Connected specialties display */}
      <div className="relative mt-2">
        {/* Source specialties in horizontal layout */}
        <div className="flex flex-wrap gap-2 ml-6">
          {mapping.sourceSpecialties.map((specialty, index) => (
            <div key={specialty.id} className="relative">
              {/* Connector line to main specialty */}
              {index > 0 && (
                <div className="absolute -left-1 top-1/2 h-0.5 w-2 bg-gray-200" />
              )}
              
              {/* Specialty card */}
              <div 
                className="p-2 rounded border border-gray-200 min-w-0 bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm hover:shadow-md"
                style={{ 
                  borderLeftColor: getSurveySourceColor(specialty.surveySource), 
                  borderLeftWidth: '3px' 
                }}
              >
                <div className="flex justify-between items-center gap-2">
                  <Typography className="font-medium text-sm truncate">
                    {formatSpecialtyForDisplay(specialty.specialty)}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    style={{ color: getSurveySourceColor(specialty.surveySource) }} 
                    className="text-xs font-medium whitespace-nowrap"
                  >
                    {specialty.surveySource}
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

MappedSpecialtyItem.displayName = 'MappedSpecialtyItem';

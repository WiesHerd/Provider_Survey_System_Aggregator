/**
 * Sortable Specialty Item Component
 * 
 * This component represents a draggable specialty item in the blending interface,
 * featuring modern drag & drop with @dnd-kit and precision weight controls.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SpecialtyItem } from '../types/blending';
import { WeightControl } from './WeightControl';

interface SortableSpecialtyItemProps {
  specialty: SpecialtyItem;
  onRemove: (specialtyId: string) => void;
  onWeightChange: (specialtyId: string, weight: number) => void;
}

export const SortableSpecialtyItem: React.FC<SortableSpecialtyItemProps> = ({
  specialty,
  onRemove,
  onWeightChange
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: specialty.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

  const handleWeightChange = (weight: number) => {
    onWeightChange(specialty.id, weight);
  };

  const handleRemove = () => {
    onRemove(specialty.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-4 ${
        isDragging ? 'shadow-lg' : 'shadow-sm'
      } hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center space-x-3 cursor-move"
        >
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          
          {/* Specialty Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {specialty.name}
            </h3>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{specialty.records.toLocaleString()} records</span>
              <span>•</span>
              <span>{specialty.surveySource}</span>
              <span>•</span>
              <span>{specialty.surveyYear}</span>
              <span>•</span>
              <span>{specialty.geographicRegion}</span>
            </div>
          </div>
        </div>
        
        {/* Weight Control */}
        <div className="flex items-center space-x-4">
          <div className="w-64">
            <WeightControl
              specialty={specialty}
              onChange={handleWeightChange}
            />
          </div>
          
          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-200"
            title="Remove specialty"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Weight Display */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Weight: {specialty.weight.toFixed(2)}%
        </div>
        <div className="w-full max-w-xs">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(specialty.weight, 100)}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

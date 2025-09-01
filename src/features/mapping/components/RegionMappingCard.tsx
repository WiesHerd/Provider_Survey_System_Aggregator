import React from 'react';
import { 
  TrashIcon as DeleteIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { RegionMappingCardProps } from '../types/mapping';

export const RegionMappingCard: React.FC<RegionMappingCardProps> = ({
  mapping,
  onDelete,
  onEdit
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {mapping.standardizedName}
          </h4>
          <div className="space-y-2">
            {mapping.sourceRegions.map((source, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <span className="text-gray-400 mr-2">→</span>
                <span className="font-medium">{source.region}</span>
                <span className="text-gray-400 mx-2">•</span>
                <span>{source.surveySource}</span>
                {source.frequency && (
                  <>
                    <span className="text-gray-400 mx-2">•</span>
                    <span>{source.frequency} occurrences</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Created: {mapping.createdAt.toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(mapping)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit mapping"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(mapping.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete mapping"
          >
            <DeleteIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};



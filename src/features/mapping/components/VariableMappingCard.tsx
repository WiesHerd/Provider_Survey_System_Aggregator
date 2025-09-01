import React from 'react';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { VariableMappingCardProps } from '../types/mapping';

export const VariableMappingCard: React.FC<VariableMappingCardProps> = ({
  mapping,
  onDelete,
  onEdit
}) => {
  const getVariableTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tcc':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'wrvu':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cf':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'bonus':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'quality':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSurveySourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'mgma':
        return 'bg-green-100 text-green-800';
      case 'sullivancotter':
        return 'bg-purple-100 text-purple-800';
      case 'gallagher':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getVariableTypeColor(mapping.variableType)}`}>
            {mapping.variableType.toUpperCase()}
          </span>
          <h3 className="text-lg font-semibold text-gray-900">
            {mapping.standardizedName}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
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
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Source Variables */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Source Variables:</h4>
        <div className="space-y-2">
          {mapping.sourceVariables.map((source, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSurveySourceColor(source.surveySource)}`}>
                  {source.surveySource}
                </span>
                <span className="text-sm text-gray-900 font-medium">
                  {source.originalVariableName}
                </span>
              </div>
              {source.frequency && (
                <span className="text-xs text-gray-500">
                  {source.frequency} occurrences
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created: {formatDate(mapping.createdAt)}</span>
          <span>Updated: {formatDate(mapping.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};




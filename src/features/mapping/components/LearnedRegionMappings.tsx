import React from 'react';
import { 
  MagnifyingGlassIcon,
  TrashIcon as DeleteIcon
} from '@heroicons/react/24/outline';

interface LearnedRegionMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
}

export const LearnedRegionMappings: React.FC<LearnedRegionMappingsProps> = ({
  learnedMappings,
  searchTerm,
  onSearchChange,
  onRemoveMapping
}) => {
  const mappingEntries = Object.entries(learnedMappings);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Learned Region Mappings ({mappingEntries.length})
        </h3>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search learned mappings..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Mapping List */}
      <div className="space-y-3">
        {mappingEntries.map(([original, standardized]) => (
          <div
            key={original}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-900">{original}</span>
              <span className="text-gray-400">→</span>
              <span className="text-sm text-purple-600 font-medium">{standardized}</span>
            </div>
            <button
              onClick={() => onRemoveMapping(original)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Remove mapping"
            >
              <DeleteIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {mappingEntries.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <DeleteIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No learned mappings</h3>
          <p className="mt-1 text-sm text-gray-500">
            Learned mappings will appear here after auto-mapping operations.
          </p>
        </div>
      )}
    </div>
  );
};



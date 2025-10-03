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

      {/* Empty State - Consistent enterprise pattern */}
      {mappingEntries.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learned Mappings Yet</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'No learned mappings match your search criteria.'
                : 'Learned mappings will appear here after you create region mappings.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};




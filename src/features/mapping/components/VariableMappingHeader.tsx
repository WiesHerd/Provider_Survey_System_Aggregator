import React from 'react';
import { 
  LightBulbIcon,
  TrashIcon as DeleteSweepIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface VariableMappingHeaderProps {
  // Tab state
  activeTab: 'unmapped' | 'mapped' | 'learned';
  onTabChange: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  
  // Counts
  unmappedCount: number;
  mappedCount: number;
  learnedCount: number;
  
  // Selection state
  selectedCount: number;
  allUnmappedCount: number;
  
  // Actions
  onShowHelp: () => void;
  onCreateMapping: () => void;
  onCreateIndividualMappings: () => void;
  onClearAllMappings: () => void;
  onApplyAllLearnedMappings: () => void;
  onClearAllLearnedMappings: () => void;
}

/**
 * Header component for VariableMapping - handles tabs and action buttons
 * Matches the SpecialtyMappingHeader pattern exactly
 */
export const VariableMappingHeader: React.FC<VariableMappingHeaderProps> = ({
  activeTab,
  onTabChange,
  unmappedCount,
  mappedCount,
  learnedCount,
  selectedCount,
  allUnmappedCount,
  onShowHelp,
  onCreateMapping,
  onCreateIndividualMappings,
  onClearAllMappings,
  onApplyAllLearnedMappings,
  onClearAllLearnedMappings
}) => {
  return (
    <div className="border-b border-gray-200 mb-4 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={onShowHelp}
          className="p-2 mr-3 hover:bg-gray-100 rounded-lg transition-all duration-200"
          aria-label="Show help"
        >
          <LightBulbIcon className="h-5 w-5 text-indigo-600" />
        </button>
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'unmapped', label: `Unmapped Fields (${unmappedCount})` },
            { key: 'mapped', label: `Mapped Fields (${mappedCount})` },
            { key: 'learned', label: `Learned Mappings (${learnedCount})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as 'unmapped' | 'mapped' | 'learned')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 mb-4">
        {activeTab === 'unmapped' && selectedCount > 0 && (
          <>
            <button
              onClick={onCreateMapping}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600"
              title="Map selected variables as a group"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Map as Group ({selectedCount})
            </button>
            <button
              onClick={onCreateIndividualMappings}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 border border-purple-600"
              title="Map each selected variable individually"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Map Individually ({selectedCount})
            </button>
          </>
        )}
        
        {activeTab === 'mapped' && (
          <button
            onClick={onClearAllMappings}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
            title="Delete all variable mappings (this action cannot be undone)"
          >
            <DeleteSweepIcon className="h-4 w-4 mr-2" />
            Clear All
          </button>
        )}
        
        {activeTab === 'learned' && (
          <>
            <button
              onClick={onApplyAllLearnedMappings}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600"
              title="Convert all learned mappings to permanent mappings"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Apply All ({learnedCount})
            </button>
            <button
              onClick={onClearAllLearnedMappings}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
              title="Delete all learned mappings (this action cannot be undone)"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Clear All
            </button>
          </>
        )}
      </div>
    </div>
  );
};

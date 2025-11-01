import React from 'react';
import { 
  LightBulbIcon,
  UserGroupIcon,
  UserIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface BaseMappingHeaderProps {
  // Screen identification
  entityName: string; // "Specialty", "Provider Type", "Region", "Variable", "Column"
  
  // Tab state
  activeTab: 'unmapped' | 'mapped' | 'learned';
  onTabChange: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  
  // Counts
  unmappedCount: number;
  mappedCount: number;
  learnedCount: number;
  
  // Selection state (for unmapped tab)
  selectedCount: number;
  isBulkSelected: boolean;
  allUnmappedCount: number;
  
  // Cross-category mapping toggle (for Specialty, Provider Type, Region)
  showAllCategories?: boolean;
  onToggleCategoryFilter?: () => void;
  
  // Actions
  onShowHelp: () => void;
  onToggleSelectAll: () => void;
  
  // Unmapped tab actions
  onCreateMapping?: () => void;
  onCreateIndividualMappings?: () => void;
  onCreateGroupedMapping?: () => void;
  
  // Learned tab actions
  onApplyAllLearnedMappings?: () => void;
  onClearAllLearnedMappings?: () => void;
  
  // Mapped tab actions (shown via children slot)
  children?: React.ReactNode;
}

/**
 * BaseMappingHeader component - Unified header for all mapping screens
 * Provides consistent tab layout, action buttons, and styling across all mapping screens
 * 
 * @param entityName - The entity being mapped (e.g., "Specialty", "Provider Type")
 * @param activeTab - Currently active tab
 * @param onTabChange - Callback when tab changes
 * @param unmappedCount - Number of unmapped items
 * @param mappedCount - Number of mapped items
 * @param learnedCount - Number of learned mappings
 * @param selectedCount - Number of currently selected items
 * @param isBulkSelected - Whether all items are selected
 * @param allUnmappedCount - Total number of unmapped items
 * @param onShowHelp - Callback to show help modal
 * @param onToggleSelectAll - Callback to toggle select all
 * @param onCreateMapping - Callback to create single mapping
 * @param onCreateIndividualMappings - Callback to create individual mappings
 * @param onCreateGroupedMapping - Callback to create grouped mapping
 * @param onApplyAllLearnedMappings - Callback to apply all learned mappings
 * @param onClearAllLearnedMappings - Callback to clear all learned mappings
 * @param children - Additional action buttons for mapped tab
 */
export const BaseMappingHeader: React.FC<BaseMappingHeaderProps> = ({
  entityName,
  activeTab,
  onTabChange,
  unmappedCount,
  mappedCount,
  learnedCount,
  selectedCount,
  isBulkSelected,
  allUnmappedCount,
  showAllCategories,
  onToggleCategoryFilter,
  onShowHelp,
  onToggleSelectAll,
  onCreateMapping,
  onCreateIndividualMappings,
  onCreateGroupedMapping,
  onApplyAllLearnedMappings,
  onClearAllLearnedMappings,
  children
}) => {
  // Generate tab labels with counts
  const tabs = [
    { key: 'unmapped', label: `Unmapped ${entityName}s (${unmappedCount})` },
    { key: 'mapped', label: `Mapped ${entityName}s (${mappedCount})` },
    { key: 'learned', label: `Learned Mappings (${learnedCount})` }
  ];

  return (
    <div className="border-b border-gray-200 mb-4">
      {/* Top row: Tabs on left, Action Buttons on right */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <button
            onClick={onShowHelp}
            className="p-2 mr-3 hover:bg-gray-100 rounded-lg transition-all duration-200"
            aria-label="Show help"
          >
            <LightBulbIcon className="h-5 w-5 text-indigo-600" />
          </button>
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
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
        
        {/* Action Buttons - Right side */}
        <div className="flex items-center space-x-3">
        {activeTab === 'unmapped' && (
          <>
            {selectedCount === 1 ? (
              <button
                onClick={onCreateMapping}
                disabled={false}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Map this ${entityName.toLowerCase()} individually`}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Map {entityName} (1)
              </button>
            ) : selectedCount > 1 ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onCreateGroupedMapping}
                  disabled={selectedCount === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Map ${selectedCount} ${entityName.toLowerCase()}s together as one group`}
                >
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Map as Group ({selectedCount})
                </button>
                <button
                  onClick={onCreateIndividualMappings}
                  disabled={selectedCount === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 border border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Map ${selectedCount} ${entityName.toLowerCase()}s individually`}
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Map Individually ({selectedCount})
                </button>
              </div>
            ) : (
              <button
                disabled={true}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-400 bg-gray-100 cursor-not-allowed"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Map {entityName}s (0)
              </button>
            )}
            <button
              onClick={onToggleSelectAll}
              disabled={allUnmappedCount === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isBulkSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500'
              }`}
            >
              {isBulkSelected && <CheckIcon className="w-4 h-4" />}
              {isBulkSelected ? `Selected (${allUnmappedCount})` : `Select (${allUnmappedCount})`}
            </button>
          </>
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
        {activeTab === 'mapped' && children}
      </div>
      </div>

      {/* Cross-Category Mapping Toggle (Call Pay, Physician, APP) - Only show if toggle provided */}
      {onToggleCategoryFilter !== undefined && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllCategories ?? false}
                onChange={onToggleCategoryFilter}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Show All Survey Types
              </span>
            </label>
            <span className="text-xs text-gray-500">
              {showAllCategories 
                ? `Showing ${entityName.toLowerCase()}s from all survey types (Call Pay, Physician, APP)`
                : 'Filtered by current Data View selection'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

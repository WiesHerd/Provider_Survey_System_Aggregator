import React, { useEffect, useState } from 'react';
import { 
  LightBulbIcon,
  UserGroupIcon,
  UserIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface SpecialtyMappingHeaderProps {
  // Tab state
  activeTab: 'unmapped' | 'mapped' | 'learned';
  onTabChange: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  
  // Counts
  unmappedCount: number;
  mappedCount: number;
  learnedCount: number;
  
  // Selection state
  selectedCount: number;
  isBulkSelected: boolean;
  allUnmappedCount: number;
  
  // Cross-provider mapping toggle
  showAllProviderTypes: boolean;
  onToggleProviderTypeFilter: () => void;
  
  // Actions
  onShowHelp: () => void;
  onToggleSelectAll: () => void;
  onCreateMapping: () => void;
  onCreateIndividualMappings: () => void;
  onCreateGroupedMapping: () => void;
  onClearAllMappings: () => void;
  onApplyAllLearnedMappings: () => void;
  onClearAllLearnedMappings: () => void;
  isAutoMapping?: boolean;
}

/**
 * Header component for SpecialtyMapping - handles tabs and action buttons
 * Extracted for better maintainability and single responsibility
 */
export const SpecialtyMappingHeader: React.FC<SpecialtyMappingHeaderProps> = ({
  activeTab,
  onTabChange,
  unmappedCount,
  mappedCount,
  learnedCount,
  selectedCount,
  isBulkSelected,
  allUnmappedCount,
  showAllProviderTypes,
  onToggleProviderTypeFilter,
  onShowHelp,
  onToggleSelectAll,
  onCreateMapping,
  onCreateIndividualMappings,
  onCreateGroupedMapping,
  onClearAllMappings,
  onApplyAllLearnedMappings,
  onClearAllLearnedMappings
}) => {
  const LEARNED_INFO_DISMISSED_KEY = 'mapping.learnedInfoDismissed.v1';
  const [showLearnedInfo, setShowLearnedInfo] = useState(false);

  // Enterprise behavior: show helper only once (first time user opens Learned tab)
  useEffect(() => {
    if (activeTab !== 'learned') {
      setShowLearnedInfo(false);
      return;
    }

    try {
      const dismissed = window.localStorage.getItem(LEARNED_INFO_DISMISSED_KEY) === '1';
      if (!dismissed) {
        setShowLearnedInfo(true);
      }
    } catch {
      // If storage is unavailable, fail safe: don't spam the banner
      setShowLearnedInfo(false);
    }
  }, [activeTab]);

  const dismissLearnedInfo = () => {
    setShowLearnedInfo(false);
    try {
      window.localStorage.setItem(LEARNED_INFO_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  };

  const renderTab = (
    tab: 'unmapped' | 'mapped' | 'learned',
    label: string,
    count: number,
    countTitle: string,
    options?: { infoTooltip?: string }
  ) => {
    const isActive = activeTab === tab;
    const badgeClass = isActive
      ? 'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200'
      : 'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200';

    return (
      <button
        key={tab}
        onClick={() => onTabChange(tab)}
        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
          isActive
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        <span className="inline-flex items-center">
          {label}
          {options?.infoTooltip ? (
            <span
              className="ml-1 inline-flex items-center text-gray-400 hover:text-gray-600"
              title={options.infoTooltip}
              aria-label={options.infoTooltip}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <InformationCircleIcon className="h-4 w-4" />
            </span>
          ) : null}
          <span className={badgeClass} title={countTitle} aria-label={countTitle}>
            {count}
          </span>
        </span>
      </button>
    );
  };

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
            {renderTab('unmapped', 'Unmapped specialties', unmappedCount, 'Unmapped specialties in this dataset')}
            {renderTab('mapped', 'Mapped specialties', mappedCount, 'Saved mappings (permanent)')}
            {renderTab(
              'learned',
              'Learned mappings',
              learnedCount,
              'Saved from previous corrections',
              { infoTooltip: 'Saved from previous corrections and reused for future uploads.' }
            )}
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
                  title="Map this specialty individually"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Map Specialty (1)
                </button>
              ) : selectedCount > 1 ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onCreateGroupedMapping}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Map ${selectedCount} specialties together as one group`}
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Map as Group ({selectedCount})
                  </button>
                  <button
                    onClick={onCreateIndividualMappings}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 border border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Map ${selectedCount} specialties separately`}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Map Separately ({selectedCount})
                  </button>
                </div>
              ) : (
                <button
                  disabled={true}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Map Specialties (0)
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
          {activeTab === 'mapped' && (
            <>
              <button
                onClick={onClearAllMappings}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                title="Delete all mapped specialties (this action cannot be undone)"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Clear All Mappings ({mappedCount})
              </button>
            </>
          )}
          {activeTab === 'learned' && (
            <>
              <button
                onClick={onApplyAllLearnedMappings}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600"
                title="Apply learned mappings (creates permanent mappings)"
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
                Delete Learned ({learnedCount})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Learned tab helper: show once, dismissible, persisted */}
      {activeTab === 'learned' && learnedCount > 0 && showLearnedInfo && (
        <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div className="text-sm text-indigo-900">
              <span className="font-semibold">Learned mappings</span> are saved from your previous corrections. Use <span className="font-semibold">Apply All</span> to convert them into permanent mappings, or delete them if they’re no longer valid.
            </div>
            </div>
            <button
              onClick={dismissLearnedInfo}
              className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-100 transition-colors duration-200"
              aria-label="Dismiss"
              title="Dismiss"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

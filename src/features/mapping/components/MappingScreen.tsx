import React, { useState } from 'react';
import { 
  PlusIcon as AddIcon,
  BoltIcon,
  LightBulbIcon,
  XMarkIcon,
  ExclamationTriangleIcon as WarningIcon
} from '@heroicons/react/24/outline';

interface MappingScreenProps {
  // Screen identification
  screenType: 'specialty' | 'providerType' | 'region' | 'variable' | 'compensation';
  
  // Data counts
  selectedCount: number;
  unmappedCount: number;
  mappedCount: number;
  learnedCount?: number;
  
  // Tab content components
  unmappedComponent: React.ReactNode;
  mappedComponent: React.ReactNode;
  learnedComponent?: React.ReactNode;
  
  // Action handlers (only needed for specialty mapping)
  onAutoMap?: () => void;
  onMapAsSingles?: () => void;
  onMapSelected?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  
  // Simple mapping handler (for non-specialty screens)
  onCreateMapping?: () => void;
  
  // State
  loading?: boolean;
  error?: string | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

/**
 * Reusable MappingScreen container component
 * Provides consistent layout, tabs, buttons, and behavior across all mapping screens
 * Eliminates code duplication and ensures perfect UI consistency
 */
export const MappingScreen: React.FC<MappingScreenProps> = ({
  screenType,
  selectedCount,
  unmappedCount,
  mappedCount,
  learnedCount = 0,
  unmappedComponent,
  mappedComponent,
  learnedComponent,
  onAutoMap,
  onMapAsSingles,
  onMapSelected,
  onSelectAll,
  onDeselectAll,
  onCreateMapping,
  loading = false,
  error = null,
  activeTab = 'unmapped',
  onTabChange
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Screen-specific configuration
  const getScreenConfig = () => {
    switch (screenType) {
      case 'specialty':
        return {
          entityName: 'specialties',
          entityNameSingular: 'specialty',
          helpTitle: 'Specialty Mapping Help',
          helpContent: 'Map specialty names across different survey sources to standardized names.'
        };
      case 'providerType':
        return {
          entityName: 'provider types',
          entityNameSingular: 'provider type',
          helpTitle: 'Provider Type Mapping Help',
          helpContent: 'Map provider types (MD, NP, PA) across different survey sources.'
        };
      case 'region':
        return {
          entityName: 'regions',
          entityNameSingular: 'region',
          helpTitle: 'Region Mapping Help',
          helpContent: 'Map geographic region names across different survey sources.'
        };
      case 'variable':
        return {
          entityName: 'survey fields',
          entityNameSingular: 'field',
          helpTitle: 'Survey Field Mapping Help',
          helpContent: 'Map compensation variables (TCC, wRVU, CF) across different survey sources.'
        };
      case 'compensation':
        return {
          entityName: 'compensation fields',
          entityNameSingular: 'field',
          helpTitle: 'Compensation Field Mapping Help',
          helpContent: 'Map compensation percentile columns and technical fields.'
        };
      default:
        return {
          entityName: 'items',
          entityNameSingular: 'item',
          helpTitle: 'Mapping Help',
          helpContent: 'Map data across different survey sources.'
        };
    }
  };

  const config = getScreenConfig();

  // Tab configuration
  const tabs = [
    { key: 'unmapped', label: `Unmapped ${config.entityName}`, count: unmappedCount },
    { key: 'mapped', label: `Mapped ${config.entityName}`, count: mappedCount },
    ...(learnedComponent && learnedCount > 0 ? [{ key: 'learned', label: 'Learned Mappings', count: learnedCount }] : [])
  ];

  const handleTabChange = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="w-full min-h-screen">
      <div className="w-full flex flex-col gap-4">
        {/* Main Mapping Section */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          
          {/* Action Bar - Only show help button, no duplicate title */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Help Button Only - Title comes from banner */}
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 transform hover:scale-110"
                aria-label="Show help"
              >
                <LightBulbIcon className="h-5 w-5 text-indigo-600" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {activeTab === 'unmapped' && (
                <>
                  {/* Common buttons for ALL mapping screens */}
                  {/* Auto Map Button */}
                  {onAutoMap && (
                    <button
                      onClick={onAutoMap}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                      <BoltIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                      Auto Map
                    </button>
                  )}

                  {/* SPECIALTY-ONLY BUTTONS */}
                  {screenType === 'specialty' && (
                    <>
                      {/* Map as Singles Button - ONLY for Specialty */}
                      {onMapAsSingles && (
                        <button
                          onClick={onMapAsSingles}
                          disabled={selectedCount === 0 || loading}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                          title={selectedCount === 1 ? `Map selected ${config.entityNameSingular} individually` : `Map ${selectedCount} selected ${config.entityName} as individual mappings`}
                        >
                          <AddIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                          Map as Singles ({selectedCount})
                        </button>
                      )}

                      {/* Map Selected Button - ONLY for Specialty */}
                      {onMapSelected && (
                        <button
                          onClick={onMapSelected}
                          disabled={selectedCount === 0 || loading}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                          title={selectedCount === 1 ? `Map selected ${config.entityNameSingular}` : `Map ${selectedCount} selected ${config.entityName} together as one group`}
                        >
                          <AddIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                          Map Selected ({selectedCount})
                        </button>
                      )}
                    </>
                  )}

                  {/* SIMPLE CREATE MAPPING for non-specialty screens */}
                  {screenType !== 'specialty' && selectedCount > 0 && onCreateMapping && (
                    <button
                      onClick={onCreateMapping}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                      <AddIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                      Create Mapping ({selectedCount})
                    </button>
                  )}

                  {/* Common selection buttons for ALL screens */}
                  {/* Select All Button */}
                  {onSelectAll && (
                    <button
                      onClick={onSelectAll}
                      disabled={unmappedCount === 0 || loading}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-600 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border border-gray-200 hover:border-gray-300 hover:shadow-gray-100"
                    >
                      Select All
                    </button>
                  )}

                  {/* Deselect All Button */}
                  {onDeselectAll && (
                    <button
                      onClick={onDeselectAll}
                      disabled={selectedCount === 0 || loading}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-600 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border border-gray-200 hover:border-gray-300 hover:shadow-gray-100"
                    >
                      Deselect All
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <WarningIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.key
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'unmapped' && unmappedComponent}
            {activeTab === 'mapped' && mappedComponent}
            {activeTab === 'learned' && learnedComponent}
          </div>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{config.helpTitle}</h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">{config.helpContent}</p>
              <button
                onClick={() => setShowHelp(false)}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

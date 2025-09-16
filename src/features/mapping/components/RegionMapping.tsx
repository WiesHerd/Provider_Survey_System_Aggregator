import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { RegionMappingProps } from '../types/mapping';
import { useRegionMappingData } from '../hooks/useRegionMappingData';
import { UnmappedRegions } from './UnmappedRegions';
import { MappedRegions } from './MappedRegions';
import { LearnedRegionMappings } from './LearnedRegionMappings';
import LoadingSpinner from '../../../components/ui/loading-spinner';

/**
 * RegionMapping component - Main orchestrator for region mapping functionality
 * 
 * @param onMappingChange - Optional callback when mappings change
 * @param onUnmappedChange - Optional callback when unmapped regions change
 */
export const RegionMapping: React.FC<RegionMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Custom hook for data management
  const {
    // State
    mappings,
    unmappedRegions,
    selectedRegions,
    learnedMappings,
    loading,
    error,
    activeTab,
    
    // Search state
    searchTerm,
    mappedSearchTerm,
    
    // Computed values
    filteredUnmapped,
    filteredMappings,
    filteredLearned,
    
    // Actions
    setActiveTab,
    selectRegion,
    clearSelectedRegions,
    selectAllRegions,
    deselectAllRegions,
    
    // Data operations
    loadData,
    createMapping,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
    
    
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm,
    clearError
  } = useRegionMappingData();


  // Handle clear all mappings
  const handleClearAllMappings = () => {
    if (window.confirm('Are you sure you want to clear all region mappings? This cannot be undone.')) {
      clearAllMappings();
    }
  };

  // Handle remove learned mapping
  const handleRemoveLearnedMapping = (original: string) => {
    if (window.confirm('Remove this learned region mapping?')) {
      removeLearnedMapping(original);
    }
  };

  // Handle create mapping (auto-join like Variable Mapping - no modal)
  const handleCreateMapping = async () => {
    if (selectedRegions.length === 0) return;

    try {
      // Auto-generate standardized name from first region (like Variable Mapping)
      const standardizedName = selectedRegions[0].name;
      
      await createGroupedMapping(standardizedName, selectedRegions);
      
      // Clear selections and switch to mapped tab
      clearSelectedRegions();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create region mapping:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Notify parent of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedRegions);
  }, [unmappedRegions, onUnmappedChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">

          {/* Main Mapping Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Tabs with Action Buttons */}
            <div className="border-b border-gray-200 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setShowHelp(true)}
                  className="p-2 mr-3 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  aria-label="Show help"
                >
                  <LightBulbIcon className="h-5 w-5 text-indigo-600" />
                </button>
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'unmapped', label: `Unmapped Regions (${unmappedRegions.length})` },
                    { key: 'mapped', label: `Mapped Regions (${mappings.length})` },
                    { key: 'learned', label: `Learned Mappings (${Object.keys(learnedMappings).length})` }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as 'unmapped' | 'mapped' | 'learned')}
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
                {activeTab === 'unmapped' && (
                  <>
                    <button
                      onClick={selectAllRegions}
                      disabled={unmappedRegions.length === 0}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllRegions}
                      disabled={selectedRegions.length === 0}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Deselect All
                    </button>
                    {selectedRegions.length > 0 && (
                      <button
                        onClick={handleCreateMapping}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600"
                        title="Create Manual Mapping"
                      >
                        <AddIcon className="h-4 w-4 mr-2" />
                        Create Mapping ({selectedRegions.length})
                      </button>
                    )}
                  </>
                )}
                {activeTab === 'mapped' && (
                  <button
                    onClick={handleClearAllMappings}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                  >
                    <DeleteSweepIcon className="h-4 w-4 mr-2" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="min-h-[400px]">

              {activeTab === 'unmapped' && (
                <UnmappedRegions
                  unmappedRegions={filteredUnmapped}
                  selectedRegions={selectedRegions}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onRegionSelect={selectRegion}
                  onRefresh={loadData}
                />
              )}

              {activeTab === 'mapped' && (
                <MappedRegions
                  mappings={filteredMappings}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onDeleteMapping={deleteMapping}
                  onEditMapping={undefined}
                />
              )}

              {activeTab === 'learned' && (
                <LearnedRegionMappings
                  learnedMappings={filteredLearned}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onRemoveMapping={handleRemoveLearnedMapping}
                />
              )}
            </div>
          </div>




          {/* Help Modal */}
          {showHelp && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              {/* Backdrop */}
              <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowHelp(false)} />
              
              {/* Modal */}
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                        <LightBulbIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Region Mapping Help</h2>
                        <p className="text-sm text-gray-500">Learn how to use region mapping effectively</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-semibold text-indigo-900 mb-3">How Region Mapping Works</h4>
                      <ul className="text-sm text-indigo-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-medium">•</span>
                          <span>Map region names from different surveys to standardized names</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-medium">•</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-medium">•</span>
                          <span>Review and edit mappings in the "Mapped Regions" tab</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-medium">•</span>
                          <span>Learned mappings are automatically created based on your patterns</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Key Features</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">Manual Mapping</h5>
                          <p className="text-sm text-gray-600">Create precise mappings with full control over region matching</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">Manual Mapping</h5>
                          <p className="text-sm text-gray-600">Select and map individual regions with full control</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">Learned Mappings</h5>
                          <p className="text-sm text-gray-600">System learns from your mapping patterns for future suggestions</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">Search & Filter</h5>
                          <p className="text-sm text-gray-600">Quickly find specific regions across all surveys</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Examples</h4>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p><strong>West:</strong> "West Region" (MGMA) → "Western Territory" (SullivanCotter) → "West"</p>
                        <p><strong>Northeast:</strong> "Northeast" (MGMA) → "Northeast Region" (SullivanCotter) → "Northeast"</p>
                        <p><strong>Midwest:</strong> "Midwest" (MGMA) → "Central" (SullivanCotter) → "Midwest"</p>
                        <p><strong>South:</strong> "South" (MGMA) → "Southern" (SullivanCotter) → "South"</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end p-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowHelp(false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

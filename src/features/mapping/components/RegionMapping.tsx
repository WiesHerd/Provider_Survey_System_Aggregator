import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { RegionMappingProps } from '../types/mapping';
import { useRegionMappingData } from '../hooks/useRegionMappingData';
import { UnmappedRegions } from './UnmappedRegions';
import { MappedRegions } from './MappedRegions';
import { LearnedRegionMappings } from './LearnedRegionMappings';
import { BaseMappingHeader, BaseMappingContent, HelpModal } from './shared';
import { AnalysisProgressBar } from '../../../shared/components';

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
      <AnalysisProgressBar
        message="Loading region mappings..."
        progress={100}
        recordCount={0}
      />
    );
  }

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">

          {/* Main Mapping Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header Component - Tabs and Actions */}
            <BaseMappingHeader
              entityName="Region"
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unmappedCount={unmappedRegions.length}
              mappedCount={mappings.length}
              learnedCount={Object.keys(learnedMappings).length}
              selectedCount={selectedRegions.length}
              isBulkSelected={selectedRegions.length === unmappedRegions.length && unmappedRegions.length > 0}
              allUnmappedCount={unmappedRegions.length}
              onShowHelp={() => setShowHelp(true)}
              onToggleSelectAll={selectedRegions.length === 0 ? selectAllRegions : deselectAllRegions}
              onCreateMapping={handleCreateMapping}
              onCreateIndividualMappings={handleCreateMapping}
              onCreateGroupedMapping={handleCreateMapping}
              onApplyAllLearnedMappings={() => {
                console.log('Apply all learned region mappings');
              }}
              onClearAllLearnedMappings={() => {
                if (window.confirm('Are you sure you want to clear all learned mappings?')) {
                  console.log('Clear all learned region mappings');
                }
              }}
            >
              {/* Mapped tab actions */}
              {activeTab === 'mapped' && (
                <button
                  onClick={handleClearAllMappings}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                  title="Delete all region mappings (this action cannot be undone)"
                >
                  <DeleteSweepIcon className="h-4 w-4 mr-2" />
                  Clear All
                </button>
              )}
            </BaseMappingHeader>

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

            {/* Content Component - Tab Content */}
            <BaseMappingContent activeTab={activeTab}>
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
                  onApplyAllMappings={() => {
                    // Apply all learned mappings
                    console.log('Apply all learned region mappings');
                  }}
                />
              )}
            </BaseMappingContent>
          </div>




          {/* Help Modal Component */}
          <HelpModal
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
            title="Region Mapping Help"
            subtitle="Learn how to use region mapping effectively"
          >
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-900 mb-3">How Region Mapping Works</h4>
                <ul className="text-sm text-indigo-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-medium">•</span>
                    <span>Map region names from different surveys to standardized names</span>
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
          </HelpModal>
        </div>
      </div>
    </>
  );
};

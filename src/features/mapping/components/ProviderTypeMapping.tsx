import React, { useState, useEffect } from 'react';
import { 
  BoltIcon,
  TrashIcon as DeleteSweepIcon
} from '@heroicons/react/24/outline';
import { ProviderTypeMappingProps } from '../types/mapping';
import { useProviderTypeMappingData } from '../hooks/useProviderTypeMappingData';
import { UnmappedProviderTypes } from './UnmappedProviderTypes';
import { MappedProviderTypes } from './MappedProviderTypes';
import { LearnedProviderTypeMappings } from './LearnedProviderTypeMappings';
import { BaseMappingHeader, BaseMappingContent, HelpModal, MappingLoadingSpinner } from './shared';

/**
 * ProviderTypeMapping component - Main orchestrator for provider type mapping functionality
 * 
 * @param onMappingChange - Optional callback when mappings change
 * @param onUnmappedChange - Optional callback when unmapped provider types change
 */
export const ProviderTypeMapping: React.FC<ProviderTypeMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Custom hook for data management
  const {
    // State
    // Cross-category mapping toggle
    showAllCategories,
    setShowAllCategories,
    
    mappings,
    unmappedProviderTypes,
    selectedProviderTypes,
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
    selectProviderType,
    clearSelectedProviderTypes,
    selectAllProviderTypes,
    deselectAllProviderTypes,
   
    // Data operations
    loadData,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
   
   
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm
  } = useProviderTypeMappingData();


  // Handle clear all mappings
  const handleClearAllMappings = () => {
    if (window.confirm('Are you sure you want to clear all mappings? This cannot be undone.')) {
      clearAllMappings();
    }
  };

  // Handle remove learned mapping
  const handleRemoveLearnedMapping = async (original: string) => {
    if (window.confirm('Remove this learned mapping?')) {
      await removeLearnedMapping(original);
    }
  };

  // Handle create mapping (auto-join - no modal)
  const handleCreateMapping = async () => {
    if (selectedProviderTypes.length === 0) return;

    try {
      // Auto-generate standardized name from first provider type
      const standardizedName = selectedProviderTypes[0].name;
      
      await createGroupedMapping(standardizedName, selectedProviderTypes);
      
      // Clear selections and switch to mapped tab
      clearSelectedProviderTypes();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create provider type mapping:', error);
    }
  };

  // Handle map individually (create separate mappings for each)
  const handleMapIndividually = async () => {
    if (selectedProviderTypes.length === 0) return;

    try {
      // Create individual mappings for each selected provider type
      for (const providerType of selectedProviderTypes) {
        await createGroupedMapping(providerType.name, [providerType]);
      }
      
      // Clear selections and switch to mapped tab
      clearSelectedProviderTypes();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create individual provider type mappings:', error);
    }
  };

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedProviderTypes);
  }, [unmappedProviderTypes, onUnmappedChange]);

  if (loading) {
    return <MappingLoadingSpinner entityName="Provider Type" />;
  }

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">

          {/* Main Mapping Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header Component - Tabs and Actions */}
            <BaseMappingHeader
              entityName="Provider Type"
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unmappedCount={unmappedProviderTypes.length}
              mappedCount={mappings.length}
              learnedCount={Object.keys(learnedMappings).length}
              selectedCount={selectedProviderTypes.length}
              isBulkSelected={selectedProviderTypes.length === unmappedProviderTypes.length && unmappedProviderTypes.length > 0}
              allUnmappedCount={unmappedProviderTypes.length}
              showAllCategories={showAllCategories}
              onToggleCategoryFilter={() => setShowAllCategories(!showAllCategories)}
              onShowHelp={() => setShowHelp(true)}
              onToggleSelectAll={selectedProviderTypes.length === 0 ? selectAllProviderTypes : deselectAllProviderTypes}
              onCreateMapping={handleCreateMapping}
              onCreateIndividualMappings={handleMapIndividually}
              onCreateGroupedMapping={handleCreateMapping}
              onApplyAllLearnedMappings={() => {
                console.log('Apply all learned provider type mappings');
              }}
              onClearAllLearnedMappings={() => {
                if (window.confirm('Are you sure you want to clear all learned mappings?')) {
                  console.log('Clear all learned provider type mappings');
                }
              }}
            >
              {/* Mapped tab actions */}
              {activeTab === 'mapped' && (
                <button
                  onClick={handleClearAllMappings}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                  title="Delete all provider type mappings (this action cannot be undone)"
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
                filteredUnmapped.length > 0 ? (
                  <UnmappedProviderTypes
                    unmappedProviderTypes={filteredUnmapped}
                    selectedProviderTypes={selectedProviderTypes}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onProviderTypeSelect={selectProviderType}
                    onRefresh={loadData}
                  />
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <BoltIcon className="h-6 w-6 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Provider Types Found</h3>
                      <p className="text-gray-600 mb-4">All provider types are mapped, or no survey data is available.</p>
                      <button
                        onClick={loadData}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <BoltIcon className="h-4 w-4 mr-2" />
                        Refresh Data
                      </button>
                    </div>
                  </div>
                )
              )}
              {activeTab === 'mapped' && (
                <MappedProviderTypes
                  mappings={filteredMappings}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onDeleteMapping={deleteMapping}
                  onEditMapping={undefined}
                />
              )}
              {activeTab === 'learned' && (
                <LearnedProviderTypeMappings
                  learnedMappings={filteredLearned}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onRemoveMapping={handleRemoveLearnedMapping}
                  onApplyAllMappings={() => {
                    // Apply all learned mappings
                    console.log('Apply all learned provider type mappings');
                  }}
                />
              )}
            </BaseMappingContent>
          </div>


          {/* Help Modal Component */}
          <HelpModal
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
            title="Provider Type Mapping Help"
            subtitle="Learn how to use provider type mapping effectively"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">What is Provider Type Mapping?</h3>
                <p className="text-gray-600">
                  Provider Type Mapping helps you standardize provider type names across different survey sources. 
                  This ensures that data for MDs, NPs, PAs, and other provider types are properly aligned for accurate analytics.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">How to Use</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li><strong>Map as Singles:</strong> Create individual mappings for selected provider types</li>
                  <li><strong>Map Selected:</strong> Group selected provider types into a single standardized mapping</li>
                  <li><strong>Manual Mapping:</strong> Click on individual provider types to create custom mappings</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Examples</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-600"><strong>MD:</strong> "Physician", "Doctor", "MD", "Medical Doctor"</p>
                  <p className="text-sm text-gray-600"><strong>NP:</strong> "Nurse Practitioner", "NP", "APRN"</p>
                  <p className="text-sm text-gray-600"><strong>PA:</strong> "Physician Assistant", "PA", "PA-C"</p>
                  <p className="text-sm text-gray-600"><strong>CNM:</strong> "Certified Nurse Midwife", "CNM", "Midwife"</p>
                </div>
              </div>
            </div>
          </HelpModal>
        </div>
      </div>
    </>
  );
};


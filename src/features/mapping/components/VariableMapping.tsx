import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { VariableMappingProps, IVariableMapping } from '../types/mapping';
import { useVariableMappingData } from '../hooks/useVariableMappingData';
import { UnmappedVariables } from './UnmappedVariables';
import { MappedVariables } from './MappedVariables';
import { LearnedVariableMappings } from './LearnedVariableMappings';
import { BaseMappingHeader, BaseMappingContent, HelpModal, MappingLoadingSpinner } from './shared';

/**
 * VariableMapping component - Main orchestrator for variable mapping functionality
 * Shows how variables are being joined across surveys and allows manual overrides
 * 
 * @param onVariableMappingChange - Optional callback when variable mappings change
 * @param onUnmappedVariableChange - Optional callback when unmapped variables change
 */
export const VariableMapping: React.FC<VariableMappingProps> = ({
  onVariableMappingChange,
  onUnmappedVariableChange
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Custom hook for data management
  const {
    // State
    variableMappings,
    unmappedVariables,
    selectedVariables,
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
    selectVariable,
    clearSelectedVariables,
    selectAllVariables,
    deselectAllVariables,
    
    // Data operations
    loadData,
    createGroupedVariableMapping,
    deleteVariableMapping,
    clearAllVariableMappings,
    removeLearnedMapping,
    
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm
  } = useVariableMappingData();


  // Handle clear all mappings
  const handleClearAllMappings = () => {
    if (window.confirm('Are you sure you want to clear all variable mappings? This cannot be undone.')) {
      clearAllVariableMappings();
    }
  };

  // Handle remove learned mapping
  const handleRemoveLearnedMapping = async (original: string) => {
    if (window.confirm('Remove this learned mapping?')) {
      await removeLearnedMapping(original);
    }
  };

  // Handle create new mapping (auto-join like auto-mapping)
  const handleCreateMapping = async () => {
    if (selectedVariables.length === 0) return;

    try {
      // Auto-generate standardized name from first variable (like auto-mapping)
      const standardizedName = selectedVariables[0].name.toLowerCase().replace(/\s+/g, '_');
      
      await createGroupedVariableMapping(
        standardizedName,
        'compensation', // Default to compensation for consistency
        'general', // Default subtype
        selectedVariables
      );
      
      // Clear selections and switch to mapped tab
      clearSelectedVariables();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create variable mapping:', error);
    }
  };

  // Handle map individually (create separate mappings for each)
  const handleMapIndividually = async () => {
    if (selectedVariables.length === 0) return;

    try {
      // Create separate mappings for each selected variable
      for (const variable of selectedVariables) {
        await createGroupedVariableMapping(
          variable.name.toLowerCase().replace(/\s+/g, '_'),
          'compensation', // Default to compensation for consistency
          'general', // Default subtype
          [variable]
        );
      }
      
      // Clear selections and switch to mapped tab
      clearSelectedVariables();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create individual variable mappings:', error);
    }
  };

  // Handle delete mapping
  const handleDeleteMapping = (mappingId: string) => {
    if (window.confirm('Are you sure you want to delete this variable mapping?')) {
      deleteVariableMapping(mappingId);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Notify parent of changes
  useEffect(() => {
    onVariableMappingChange?.(variableMappings);
  }, [variableMappings, onVariableMappingChange]);

  useEffect(() => {
    onUnmappedVariableChange?.(unmappedVariables);
  }, [unmappedVariables, onUnmappedVariableChange]);

  if (loading) {
    return <MappingLoadingSpinner entityName="Variable" />;
  }

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">

          {/* Main Mapping Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header Component - Tabs and Actions */}
            <BaseMappingHeader
              entityName="Variable"
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unmappedCount={unmappedVariables.length}
              mappedCount={variableMappings.length}
              learnedCount={Object.keys(learnedMappings).length}
              selectedCount={selectedVariables.length}
              isBulkSelected={selectedVariables.length === unmappedVariables.length && unmappedVariables.length > 0}
              allUnmappedCount={unmappedVariables.length}
              onShowHelp={() => setShowHelp(true)}
              onToggleSelectAll={selectedVariables.length === 0 ? selectAllVariables : deselectAllVariables}
              onCreateMapping={handleCreateMapping}
              onCreateIndividualMappings={handleMapIndividually}
              onCreateGroupedMapping={handleCreateMapping}
              onApplyAllLearnedMappings={() => {
                console.log('Apply all learned variable mappings');
              }}
              onClearAllLearnedMappings={() => {
                if (window.confirm('Are you sure you want to clear all learned mappings?')) {
                  console.log('Clear all learned variable mappings');
                }
              }}
            >
              {/* Mapped tab actions */}
              {activeTab === 'mapped' && (
                <button
                  onClick={handleClearAllMappings}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                  title="Delete all variable mappings (this action cannot be undone)"
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
                  <UnmappedVariables
                    unmappedVariables={filteredUnmapped}
                    selectedVariables={selectedVariables}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onVariableSelect={selectVariable}
                    onRefresh={loadData}
                  />
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <BoltIcon className="h-6 w-6 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Fields Found</h3>
                      <p className="text-gray-600 mb-4">All fields are mapped, or no survey data is available.</p>
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
                <MappedVariables
                  mappings={filteredMappings}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onDeleteMapping={handleDeleteMapping}
                  onEditMapping={undefined}
                />
              )}
              {activeTab === 'learned' && (
                <LearnedVariableMappings
                  learnedMappings={filteredLearned}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onRemoveMapping={handleRemoveLearnedMapping}
                  onApplyAllMappings={() => {
                    // Apply all learned mappings
                    console.log('Apply all learned variable mappings');
                  }}
                />
              )}
            </BaseMappingContent>
          </div>




          {/* Help Modal Component */}
          <HelpModal
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
            title="Survey Field Mapping Help"
            subtitle="Learn how to use survey field mapping effectively"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">What is Survey Field Mapping?</h3>
                <p className="text-gray-600">
                  Survey Field Mapping standardizes field names across different survey sources. 
                  This ensures that similar data (like TCC, wRVUs, CFs, base pay) from different surveys 
                  are properly combined for analysis.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">How it Works</h3>
                <div className="space-y-2 text-gray-600">
                  <p><strong>Example:</strong> "Total Cash Compensation" from MGMA maps to "TCC" from SullivanCotter, 
                  both creating the standardized field "tcc".</p>
                  <p><strong>Manual Mapping:</strong> Create precise mappings with full control over field matching.</p>
                  <p><strong>Manual Override:</strong> You can edit any mapping to change how fields are joined.</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Common Field Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Compensation Fields</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Total Cash Compensation (TCC)</li>
                      <li>• Work RVUs (wRVUs)</li>
                      <li>• Conversion Factors (CF)</li>
                      <li>• Base Pay</li>
                      <li>• Bonuses & Incentives</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Categorical Fields</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Geographic Regions</li>
                      <li>• Provider Types</li>
                      <li>• Practice Settings</li>
                      <li>• Years of Experience</li>
                      <li>• Specialty Categories</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </HelpModal>
        </div>
      </div>
    </>
  );
};


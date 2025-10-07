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
import { ProviderTypeMappingProps } from '../types/mapping';
import { useProviderTypeMappingData } from '../hooks/useProviderTypeMappingData';
import { UnmappedProviderTypes } from './UnmappedProviderTypes';
import { MappedProviderTypes } from './MappedProviderTypes';
import { LearnedProviderTypeMappings } from './LearnedProviderTypeMappings';
import LoadingSpinner from '../../../components/ui/loading-spinner';

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
    createMapping,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
   
   
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm,
    clearError
  } = useProviderTypeMappingData();


  // Handle clear all mappings
  const handleClearAllMappings = () => {
    if (window.confirm('Are you sure you want to clear all mappings? This cannot be undone.')) {
      clearAllMappings();
    }
  };

  // Handle remove learned mapping
  const handleRemoveLearnedMapping = (original: string) => {
    if (window.confirm('Remove this learned mapping?')) {
      removeLearnedMapping(original);
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
    return (
      <LoadingSpinner 
        message="Loading provider type mappings..." 
        fullScreen={true}
        size="lg"
      />
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
                    { key: 'unmapped', label: `Unmapped Provider Types (${unmappedProviderTypes.length})` },
                    { key: 'mapped', label: `Mapped Provider Types (${mappings.length})` },
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {activeTab === 'unmapped' && selectedProviderTypes.length > 0 && (
                    <>
                      <button
                        onClick={handleCreateMapping}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600"
                        title="Map selected provider types as a group"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Map as Group ({selectedProviderTypes.length})
                      </button>
                      <button
                        onClick={handleMapIndividually}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 border border-purple-600"
                        title="Map each selected provider type individually"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Map Individually ({selectedProviderTypes.length})
                      </button>
                    </>
                  )}
                </div>
                
                {/* Select All button - positioned on the right for stable layout */}
                {activeTab === 'unmapped' && (
                  <button
                    onClick={selectedProviderTypes.length === 0 ? selectAllProviderTypes : deselectAllProviderTypes}
                    disabled={unmappedProviderTypes.length === 0}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedProviderTypes.length === 0 ? 'Select All' : 'Deselect All'}
                  </button>
                )}
              </div>
              
              {/* Mapped tab actions */}
              {activeTab === 'mapped' && (
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={handleClearAllMappings}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                  >
                    <DeleteSweepIcon className="h-4 w-4 mr-2" />
                    Clear All
                  </button>
                </div>
              )}
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



            {/* Tab Content - Simple and instant */}
            <div className="min-h-[400px]">
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
                        <h2 className="text-xl font-semibold text-gray-900">Provider Type Mapping Help</h2>
                        <p className="text-sm text-gray-500">Learn how to use provider type mapping effectively</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                      title="Close help"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 space-y-4">
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};


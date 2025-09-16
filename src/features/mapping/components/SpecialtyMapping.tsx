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
import { CheckIcon } from '@heroicons/react/24/solid';
import { SpecialtyMappingProps } from '../types/mapping';
import { useMappingData } from '../hooks';
import { UnmappedSpecialties } from './UnmappedSpecialties';
import { MappedSpecialties } from './MappedSpecialties';
import { LearnedMappings } from './LearnedMappings';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import LoadingSpinner from '../../../components/ui/loading-spinner';

/**
 * SpecialtyMapping component - Main orchestrator for specialty mapping functionality
 * 
 * @param onMappingChange - Optional callback when mappings change
 * @param onUnmappedChange - Optional callback when unmapped specialties change
 */
export const SpecialtyMapping: React.FC<SpecialtyMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isBulkSelected, setIsBulkSelected] = useState(false);

  // Custom hook for data management
  const {
    // State
    mappings,
    unmappedSpecialties,
    selectedSpecialties,
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
     selectSpecialty,
     clearSelectedSpecialties,
     selectAllSpecialties,
     deselectAllSpecialties,
    
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
  } = useMappingData();


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

  // Dynamic select/deselect all toggle
  const allUnmappedCount = filteredUnmapped.length;
  
  const handleToggleSelectAll = () => {
    if (isBulkSelected) {
      clearSelectedSpecialties();
      setIsBulkSelected(false);
    } else {
      selectAllSpecialties();
      setIsBulkSelected(true);
    }
  };

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedSpecialties);
  }, [unmappedSpecialties, onUnmappedChange]);

  // Emergency fallback: if loading takes too long, show error
  const [emergencyTimeout, setEmergencyTimeout] = useState(false);
  
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('🚨 Emergency timeout triggered - loading taking too long');
        setEmergencyTimeout(true);
      }, 20000); // 20 second emergency timeout
      
      return () => clearTimeout(timeout);
    } else {
      setEmergencyTimeout(false);
    }
  }, [loading]);
  
  if (loading && !emergencyTimeout) {
    return (
      <LoadingSpinner 
        message="Loading specialty mappings..." 
        fullScreen={true}
        size="lg"
      />
    );
  }
  
  if (emergencyTimeout) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Timeout</h3>
          <p className="text-gray-600 mb-4">The specialty mapping data is taking too long to load. This might be due to a data service issue.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdvancedErrorBoundary 
      componentName="SpecialtyMapping"
      enableAutoRecovery={true}
      maxRetries={3}
      circuitBreakerThreshold={5}
      circuitBreakerTimeout={30000}
    >
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
                    { key: 'unmapped', label: `Unmapped Specialties (${unmappedSpecialties.length})` },
                    { key: 'mapped', label: `Mapped Specialties (${mappings.length})` },
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
                      onClick={selectedSpecialties.length === 1 ? createMapping : createGroupedMapping}
                      disabled={selectedSpecialties.length === 0}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        selectedSpecialties.length === 1 
                          ? "Map this specialty individually" 
                          : `Map ${selectedSpecialties.length} specialties together as one group`
                      }
                    >
                      <AddIcon className="h-4 w-4 mr-2" />
                      {selectedSpecialties.length === 1 
                        ? `Map Specialty (${selectedSpecialties.length})`
                        : `Map Specialties (${selectedSpecialties.length})`
                      }
                    </button>
                    <button
                      onClick={handleToggleSelectAll}
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



            {/* Tab Content - Simple and instant */}
            <div className="min-h-[400px]">
              {activeTab === 'unmapped' && (
                <UnmappedSpecialties
                  unmappedSpecialties={filteredUnmapped}
                  selectedSpecialties={selectedSpecialties}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onSpecialtySelect={selectSpecialty}
                  onClearSelection={clearSelectedSpecialties}
                  onRefresh={loadData}
                />
              )}
              {activeTab === 'mapped' && (
                <MappedSpecialties
                  mappings={filteredMappings}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onDeleteMapping={deleteMapping}
                />
              )}
              {activeTab === 'learned' && (
                <LearnedMappings
                  learnedMappings={filteredLearned}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onRemoveMapping={handleRemoveLearnedMapping}
                />
              )}
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
                         <h2 className="text-xl font-semibold text-gray-900">Specialty Mapping Help</h2>
                         <p className="text-sm text-gray-500">Learn how to use specialty mapping effectively</p>
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
                   <div className="p-6 space-y-6">
                     <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                       <h4 className="font-semibold text-indigo-900 mb-3">How Specialty Mapping Works</h4>
                       <ul className="text-sm text-indigo-800 space-y-2">
                         <li className="flex items-start gap-2">
                           <span className="text-indigo-600 font-medium">•</span>
                           <span>Map specialty names from different surveys to standardized names</span>
                         </li>
                         <li className="flex items-start gap-2">
                           <span className="text-indigo-600 font-medium">•</span>
                         </li>
                         <li className="flex items-start gap-2">
                           <span className="text-indigo-600 font-medium">•</span>
                           <span>Review and edit mappings in the "Mapped Specialties" tab</span>
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
                           <p className="text-sm text-gray-600">Create precise mappings with full control over specialty matching</p>
                         </div>
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                           <h5 className="font-medium text-gray-900 mb-2">Manual Mapping</h5>
                           <p className="text-sm text-gray-600">Select and map individual specialties with full control</p>
                         </div>
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                           <h5 className="font-medium text-gray-900 mb-2">Learned Mappings</h5>
                           <p className="text-sm text-gray-600">System learns from your mapping patterns for future suggestions</p>
                         </div>
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                           <h5 className="font-medium text-gray-900 mb-2">Search & Filter</h5>
                           <p className="text-sm text-gray-600">Quickly find specific specialties across all surveys</p>
                         </div>
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
      </div>
    </AdvancedErrorBoundary>
   );
 };

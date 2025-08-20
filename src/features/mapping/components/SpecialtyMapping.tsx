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
import { SpecialtyMappingProps } from '../types/mapping';
import { useMappingData } from '../hooks/useMappingData';
import { UnmappedSpecialties } from './UnmappedSpecialties';
import { MappedSpecialties } from './MappedSpecialties';
import { LearnedMappings } from './LearnedMappings';
import { AutoMapping } from './AutoMapping';
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
  // Auto-mapping dialog state
  const [isAutoMapOpen, setIsAutoMapOpen] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
    
    // Auto-mapping
    autoMap,
    
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm,
    clearError
  } = useMappingData();

  // Handle auto-mapping
  const handleAutoMap = async (config: any) => {
    setIsAutoMapping(true);
    try {
      await autoMap(config);
      setActiveTab('mapped');
    } finally {
      setIsAutoMapping(false);
    }
  };

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

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedSpecialties);
  }, [unmappedSpecialties, onUnmappedChange]);

  if (loading) {
    return (
      <LoadingSpinner 
        message="Loading specialty mappings..." 
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Specialty Mapping</h3>
                <button
                  onClick={() => setShowHelp(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 transform hover:scale-110"
                  aria-label="Show help"
                >
                  <LightBulbIcon className="h-5 w-5 text-indigo-600" />
                </button>
              </div>
              <div className="flex space-x-2">
                {activeTab === 'unmapped' && (
                  <>
                                                              <button
                       onClick={() => setIsAutoMapOpen(true)}
                       className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                     >
                       <BoltIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                       Auto Map
                     </button>
                                           <button
                        onClick={createMapping}
                        disabled={selectedSpecialties.length === 0}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        title={selectedSpecialties.length === 1 ? "Map selected specialty individually" : `Map ${selectedSpecialties.length} selected specialties as individual mappings`}
                      >
                        <AddIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                        Map as Singles ({selectedSpecialties.length})
                      </button>
                      <button
                        onClick={createGroupedMapping}
                        disabled={selectedSpecialties.length === 0}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        title={selectedSpecialties.length === 1 ? "Map selected specialty" : `Map ${selectedSpecialties.length} selected specialties together as one group`}
                      >
                        <AddIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                        Map Selected ({selectedSpecialties.length})
                      </button>
                     
                     <button
                       onClick={selectAllSpecialties}
                       disabled={unmappedSpecialties.length === 0}
                       className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-600 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border border-gray-200 hover:border-gray-300 hover:shadow-gray-100"
                     >
                       Select All
                     </button>
                     <button
                       onClick={deselectAllSpecialties}
                       disabled={selectedSpecialties.length === 0}
                       className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-600 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border border-gray-200 hover:border-gray-300 hover:shadow-gray-100"
                     >
                       Deselect All
                     </button>
                     
                  </>
                )}
                                 {activeTab === 'mapped' && (
                   <button
                     onClick={handleClearAllMappings}
                     className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md border border-red-200 hover:border-red-300 hover:shadow-red-100"
                   >
                     <DeleteSweepIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
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

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'unmapped', label: 'Unmapped Specialties' },
                  { key: 'mapped', label: 'Mapped Specialties' },
                  { key: 'learned', label: 'Learned Mappings' }
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

            {/* Tab Content - Simple and instant */}
            <div className="min-h-[400px]">
              {activeTab === 'unmapped' && (
                <UnmappedSpecialties
                  unmappedSpecialties={filteredUnmapped}
                  selectedSpecialties={selectedSpecialties}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onSpecialtySelect={selectSpecialty}
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
          </div>

                     {/* Auto-Mapping Dialog */}
           <AutoMapping
             isOpen={isAutoMapOpen}
             onClose={() => setIsAutoMapOpen(false)}
             onAutoMap={handleAutoMap}
             loading={isAutoMapping}
           />

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
                           <span>Use auto-mapping for bulk processing with configurable confidence levels</span>
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
                           <h5 className="font-medium text-gray-900 mb-2">Auto-Mapping</h5>
                           <p className="text-sm text-gray-600">Bulk process unmapped specialties with AI-powered suggestions</p>
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
     </>
   );
 };

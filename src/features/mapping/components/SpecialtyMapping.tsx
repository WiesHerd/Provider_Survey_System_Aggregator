import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon
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
    
    // Computed values
    filteredUnmapped,
    filteredMappings,
    filteredLearned,
    
    // Actions
    setActiveTab,
    selectSpecialty,
    clearSelectedSpecialties,
    
    // Data operations
    loadData,
    createMapping,
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

          {/* Help Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  aria-label={showHelp ? "Collapse help section" : "Expand help section"}
                >
                  {showHelp ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <h3 className="text-lg font-semibold text-gray-900">Specialty Mapping Help</h3>
              </div>
              <div className="flex items-center gap-2">
                <LightBulbIcon className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            
            {showHelp && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">How Specialty Mapping Works</h4>
                  <ul className="text-sm text-indigo-800 space-y-1">
                    <li>• Map specialty names from different surveys to standardized names</li>
                    <li>• Use auto-mapping for bulk processing with configurable confidence levels</li>
                    <li>• Review and edit mappings in the "Mapped Specialties" tab</li>
                    <li>• Learned mappings are automatically created based on your patterns</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Main Mapping Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Specialty Mapping</h3>
              <div className="flex space-x-2">
                {activeTab !== 'learned' && (
                  <>
                    <button
                      onClick={() => setIsAutoMapOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                      <BoltIcon className="h-4 w-4 mr-2" />
                      Auto-Map Specialties
                    </button>
                    <button
                      onClick={createMapping}
                      disabled={selectedSpecialties.length === 0}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <AddIcon className="h-4 w-4 mr-2" />
                      Create Mapping
                    </button>
                  </>
                )}
                {activeTab === 'mapped' && (
                  <button
                    onClick={handleClearAllMappings}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
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
                  searchTerm=""
                  onSearchChange={setSearchTerm}
                  onSpecialtySelect={selectSpecialty}
                  onRefresh={loadData}
                />
              )}
              {activeTab === 'mapped' && (
                <MappedSpecialties
                  mappings={filteredMappings}
                  searchTerm=""
                  onSearchChange={setMappedSearchTerm}
                  onDeleteMapping={deleteMapping}
                />
              )}
              {activeTab === 'learned' && (
                <LearnedMappings
                  learnedMappings={filteredLearned}
                  searchTerm=""
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
        </div>
      </div>
    </>
  );
};

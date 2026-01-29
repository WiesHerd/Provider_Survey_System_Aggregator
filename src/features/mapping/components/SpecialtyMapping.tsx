import React, { useState, useEffect } from 'react';
import { SpecialtyMappingProps } from '../types/mapping';
import { useSpecialtyMappingLogic } from '../hooks/useSpecialtyMappingLogic';
import { SpecialtyMappingContent } from './SpecialtyMappingContent';
import { SpecialtyMappingHelp } from './SpecialtyMappingHelp';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import { EnterpriseLoadingSpinner } from '../../../shared/components/EnterpriseLoadingSpinner';
import { ConfirmationDialog } from '../../../shared';
import { BaseMappingHeader } from './shared';
import { TrashIcon } from '@heroicons/react/24/outline';

/**
 * SpecialtyMapping component - Main orchestrator for specialty mapping functionality
 * 
 * @param onMappingChange - Optional callback when mappings change
 * @param onUnmappedChange - Optional callback when unmapped specialties change
 */
export const SpecialtyMapping: React.FC<SpecialtyMappingProps> = (props) => {
  // Business logic hook - handles all state and business logic
  const {
    // UI state
    showHelp,
    isBulkSelected,
    allUnmappedCount,
    
    // Cross-category mapping toggle (Call Pay, Physician, APP)
    showAllProviderTypes,
    setShowAllProviderTypes,
    
    // Data state
    mappings,
    unmappedSpecialties,
    selectedSpecialties,
    learnedMappings,
    learnedMappingsWithSource,
    loading,
    error,
    activeTab,
    searchTerm,
    mappedSearchTerm,
    filteredUnmapped,
    filteredMappings,
    filteredLearned,
    
    // Actions
    setActiveTab,
    selectSpecialty,
    deselectSpecialty,
    clearSelectedSpecialties,
    selectAllSpecialties,
    deselectAllSpecialties,
    loadData,
    createMapping,
    createIndividualMappings,
    createGroupedMapping,
    deleteMapping,
    applyAllLearnedMappings,
    setSearchTerm,
    setMappedSearchTerm,
    clearError,
    
    // UI handlers
    handleShowHelp,
    handleCloseHelp,
    handleToggleSelectAll,
    handleClearAllMappings,
    handleRemoveLearnedMapping,
    handleClearAllLearnedMappings,
    
    // Confirmation dialog
    dialogState,
    handleConfirm,
    handleCancel
  } = useSpecialtyMappingLogic(props);

  // Emergency fallback: if loading takes too long, show error
  const [emergencyTimeout, setEmergencyTimeout] = useState(false);
  
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setEmergencyTimeout(true);
      }, 20000); // 20 second emergency timeout
      
      return () => clearTimeout(timeout);
    } else {
      setEmergencyTimeout(false);
    }
  }, [loading]);
  
  if (loading && !emergencyTimeout) {
    return (
      <EnterpriseLoadingSpinner
        message="Loading specialty mappings..."
        recordCount="auto"
        data={mappings}
        variant="overlay"
        loading={loading}
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
            {/* Header Component - Tabs and Actions */}
            <BaseMappingHeader
              entityName="Specialty"
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unmappedCount={unmappedSpecialties.length}
              mappedCount={mappings.length}
              learnedCount={Object.keys(learnedMappings).length}
              selectedCount={selectedSpecialties.length}
              isBulkSelected={isBulkSelected}
              allUnmappedCount={allUnmappedCount}
              onShowHelp={handleShowHelp}
              onToggleSelectAll={handleToggleSelectAll}
              onCreateMapping={createMapping}
              onCreateIndividualMappings={createIndividualMappings}
              onCreateGroupedMapping={createGroupedMapping}
              onApplyAllLearnedMappings={applyAllLearnedMappings}
              onClearAllLearnedMappings={handleClearAllLearnedMappings}
            >
              <button
                onClick={handleClearAllMappings}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                title="Delete all mapped specialties (this action cannot be undone)"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Clear all mappings ({mappings.length})
              </button>
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
            <SpecialtyMappingContent
              activeTab={activeTab}
              // Unmapped props
              unmappedSpecialties={filteredUnmapped}
              selectedSpecialties={selectedSpecialties}
              unmappedSearchTerm={searchTerm}
              onUnmappedSearchChange={setSearchTerm}
              onSpecialtySelect={selectSpecialty}
              onSpecialtyDeselect={deselectSpecialty}
              onClearSelection={clearSelectedSpecialties}
              onRefresh={loadData}
              showAllProviderTypes={showAllProviderTypes}
              onToggleProviderTypeFilter={() => setShowAllProviderTypes(!showAllProviderTypes)}
              // Mapped props
              mappings={filteredMappings}
              mappedSearchTerm={mappedSearchTerm}
              onMappedSearchChange={setMappedSearchTerm}
              onDeleteMapping={deleteMapping}
              // Learned props
              learnedMappings={filteredLearned}
              learnedMappingsWithSource={learnedMappingsWithSource}
              learnedSearchTerm={mappedSearchTerm}
              onLearnedSearchChange={setMappedSearchTerm}
              onRemoveLearnedMapping={handleRemoveLearnedMapping}
              onApplyAllLearnedMappings={applyAllLearnedMappings}
            />
          </div>
        </div>
      </div>
      
      {/* Help Modal Component */}
      <SpecialtyMappingHelp
        isOpen={showHelp}
        onClose={handleCloseHelp}
      />
      
      {/* Enterprise-grade Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        type={dialogState.type}
      />
    </AdvancedErrorBoundary>
  );
};


import React, { useState, Suspense, lazy } from 'react';
import { useColumnMappingData } from '../features/mapping/hooks/useColumnMappingData';
import { BaseMappingHeader, BaseMappingContent, HelpModal, MappingLoadingSpinner } from '../features/mapping/components/shared';
import { UnmappedColumns } from '../features/mapping/components/UnmappedColumns';

// Lazy load components for better performance
const MappedColumns = lazy(() => import('./MappedColumns').then(module => ({ default: module.default })));
const LearnedColumnMappings = lazy(() => import('./LearnedColumnMappings').then(module => ({ default: module.default })));

/**
 * ColumnMapping component - Main orchestrator for column mapping functionality
 * Refactored to use shared components and match Specialty Mapping structure
 * 
 * Maps raw CSV column headers to standardized fields across surveys
 */
const ColumnMapping: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);

  // Custom hook for data management
  const {
    // Data
    mappings,
    unmappedColumns,
    selectedColumns,
    learnedMappings,
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
    selectColumn,
    clearSelectedColumns,
    selectAllColumns,
    deselectAllColumns,
    setSearchTerm,
    setMappedSearchTerm,
    createMapping,
    createGroupedMapping,
    deleteMapping,
    removeLearnedMapping,
    loadData,
    clearError
  } = useColumnMappingData();

  // Handle create mapping (auto-join - no modal)
  const handleCreateMapping = async () => {
    if (selectedColumns.length === 0) return;

    try {
      // Auto-generate standardized name from first column
      const standardizedName = selectedColumns[0].name.toLowerCase().replace(/\s+/g, '_');
      
      await createGroupedMapping(standardizedName, selectedColumns);
      
      // Clear selections and switch to mapped tab
      clearSelectedColumns();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create column mapping:', error);
    }
  };

  // Handle map individually (create separate mappings for each)
  const handleMapIndividually = async () => {
    if (selectedColumns.length === 0) return;

    try {
      // Create individual mappings for each selected column
      for (const column of selectedColumns) {
        await createGroupedMapping(
          column.name.toLowerCase().replace(/\s+/g, '_'),
          [column]
        );
      }
      
      // Clear selections and switch to mapped tab
      clearSelectedColumns();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create individual column mappings:', error);
    }
  };

  // Handle clear all mappings
  const handleClearAllMappings = async () => {
    if (window.confirm('Are you sure you want to clear all column mappings? This cannot be undone.')) {
      try {
        // Clear all column mappings
        const { getDataService } = await import('../services/DataService');
        const dataService = getDataService();
        await dataService.clearAllColumnMappings();
        
        // Reload data to refresh the display
        await loadData();
        
        console.log('✅ All column mappings cleared successfully');
      } catch (error) {
        console.error('❌ Failed to clear column mappings:', error);
      }
    }
  };

  // Handle remove learned mapping
  const handleRemoveLearnedMapping = async (original: string) => {
    if (window.confirm('Remove this learned mapping?')) {
      await removeLearnedMapping(original);
    }
  };

  // Handle apply all learned mappings
  const handleApplyAllLearnedMappings = () => {
    if (window.confirm('Apply all learned mappings to create permanent mappings?')) {
      // TODO: Implement apply all learned mappings
      console.log('Apply all learned column mappings');
    }
  };

  // Handle clear all learned mappings
  const handleClearAllLearnedMappings = () => {
    if (window.confirm('Are you sure you want to clear all learned mappings?')) {
      // TODO: Implement clear all learned mappings
      console.log('Clear all learned column mappings');
    }
  };

  if (loading) {
    return <MappingLoadingSpinner entityName="Column" />;
  }

  return (
    <div className="w-full min-h-screen">
      <div className="w-full flex flex-col gap-4">
        {/* Main Mapping Section */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Header Component - Tabs and Actions */}
          <BaseMappingHeader
            entityName="Column"
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unmappedCount={unmappedColumns.length}
            mappedCount={mappings.length}
            learnedCount={Object.keys(learnedMappings).length}
            selectedCount={selectedColumns.length}
            isBulkSelected={selectedColumns.length === filteredUnmapped.length && filteredUnmapped.length > 0}
            allUnmappedCount={filteredUnmapped.length}
            onShowHelp={() => setShowHelp(true)}
            onToggleSelectAll={selectedColumns.length === 0 ? selectAllColumns : deselectAllColumns}
            onCreateMapping={handleCreateMapping}
            onCreateIndividualMappings={handleMapIndividually}
            onCreateGroupedMapping={handleCreateMapping}
            onApplyAllLearnedMappings={handleApplyAllLearnedMappings}
            onClearAllLearnedMappings={handleClearAllLearnedMappings}
          >
            {/* Mapped tab actions */}
            {activeTab === 'mapped' && (
              <button
                onClick={handleClearAllMappings}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                title="Delete all column mappings (this action cannot be undone)"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
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
              <UnmappedColumns
                unmappedColumns={filteredUnmapped}
                selectedColumns={selectedColumns}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onColumnSelect={selectColumn}
                onClearSelection={clearSelectedColumns}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'mapped' && (
              <Suspense fallback={<div>Loading mapped columns...</div>}>
                <div className="space-y-4">
                  {filteredMappings.map((mapping) => (
                    <MappedColumns
                      key={mapping.id}
                      mapping={mapping}
                      onDelete={() => deleteMapping(mapping.id)}
                    />
                  ))}
                </div>
              </Suspense>
            )}
            {activeTab === 'learned' && (
              <Suspense fallback={<div>Loading learned mappings...</div>}>
                <LearnedColumnMappings
                  learnedMappings={filteredLearned}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onRemoveMapping={handleRemoveLearnedMapping}
                />
              </Suspense>
            )}
          </BaseMappingContent>
        </div>
      </div>
      
      {/* Help Modal Component */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Column Mapping Help"
        subtitle="Learn how to use column mapping effectively"
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">What is Column Mapping?</h3>
            <p className="text-gray-600">
              Column Mapping standardizes field names across different survey sources. 
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
  );
};

export default ColumnMapping;
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { useOptimizedColumnMappingData } from '../features/mapping/hooks/useOptimizedColumnMappingData';
import { BaseMappingHeader, BaseMappingContent, HelpModal } from '../features/mapping/components/shared';
import { UnmappedColumns } from '../features/mapping/components/UnmappedColumns';
import { useProviderContext } from '../contexts/ProviderContext';
import { useToast } from './ui/use-toast'; // Added toast import
import { AdvancedErrorBoundary } from '../features/mapping/components/AdvancedErrorBoundary';
import { EnterpriseLoadingSpinner } from '../shared/components/EnterpriseLoadingSpinner';
import { ConfirmationDialog } from '../shared';

// Lazy load components for better performance
const MappedColumns = lazy(() => import('./MappedColumns').then(module => ({ default: module.default })));
const LearnedColumnMappings = lazy(() => import('./LearnedColumnMappings').then(module => ({ default: module.default })));

interface ColumnMappingProps {
  onMappingChange?: (mappings: any[]) => void;
  onUnmappedChange?: (unmappedColumns: any[]) => void;
}

/**
 * ColumnMapping component - Main orchestrator for column mapping functionality
 * Refactored to use shared components and match Specialty Mapping structure
 * 
 * Maps raw CSV column headers to standardized fields across surveys
 */
const ColumnMapping: React.FC<ColumnMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast(); // Added toast hook
  
  // Emergency timeout state
  const [emergencyTimeout, setEmergencyTimeout] = useState(false);
  
  // Confirmation dialog state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Custom hook for data management
  const {
    // Data
    mappings,
    unmappedColumns,
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
    setSearchTerm,
    setMappedSearchTerm,
    loadData,
    
    // Cross-category toggle
    showAllCategories,
    setShowAllCategories
  } = useOptimizedColumnMappingData();

  // Get provider type from context
  const { selectedProviderType } = useProviderContext();

  // Local state for selection (since optimized hook doesn't have this yet)
  const [selectedColumns, setSelectedColumns] = useState<any[]>([]);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);

  // Emergency timeout effect
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

  // Parent callback effects
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedColumns);
  }, [unmappedColumns, onUnmappedChange]);

  // Selection handlers
  const selectColumn = (column: any) => {
    setSelectedColumns(prev => {
      if (prev.some(c => c.id === column.id)) {
        return prev.filter(c => c.id !== column.id);
      }
      return [...prev, column];
    });
  };

  const clearSelectedColumns = () => {
    setSelectedColumns([]);
  };

  const toggleSelectAll = () => {
    if (selectedColumns.length === 0 || selectedColumns.length < filteredUnmapped.length) {
      // Select all filtered columns
      setSelectedColumns([...filteredUnmapped]);
    } else {
      // Deselect all
      setSelectedColumns([]);
    }
  };

  // Confirmation dialog handlers
  const showConfirmationDialog = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    type: 'danger' | 'warning' | 'info' = 'warning'
  ) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm: () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleConfirm = () => {
    dialogState.onConfirm();
  };

  const handleCancel = () => {
    dialogState.onCancel();
  };

  // Handle create mapping (auto-join - no modal)
  const handleCreateMapping = async () => {
    if (selectedColumns.length === 0 || isCreatingMapping) return;

    try {
      setIsCreatingMapping(true);
      console.log('🔄 Creating group mapping...');
      
      // Auto-generate standardized name from first column
      const standardizedName = selectedColumns[0].name.toLowerCase().replace(/\s+/g, '_');
      
      // Create the mapping using DataService directly
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      
      const mapping = {
        id: `mapping_${Date.now()}`,
        standardizedName,
        sourceColumns: selectedColumns,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await dataService.createColumnMapping(mapping);
      console.log('✅ Mapping created successfully');
      
      // Create learned mappings for each source column
      for (const column of selectedColumns) {
        await dataService.saveLearnedMapping(
          'column',
          column.name,
          standardizedName,
          selectedProviderType,
          column.surveySource
        );
      }
      console.log('✅ Learned mappings created successfully');
      
      // Clear selections and force data reload
      setSelectedColumns([]);
      
      // Force clear cache and reload data
      const { getPerformanceOptimizedDataService } = await import('../services/PerformanceOptimizedDataService');
      const performanceService = getPerformanceOptimizedDataService();
      performanceService.clearCache('column_mapping');
      
      await loadData();
      console.log('✅ Data reloaded, switching to learned tab');
      
      setActiveTab('learned'); // Switch to learned tab to show the new learned mappings
      
      // Show success toast
      toast({
        title: 'Mapping Created Successfully',
        description: `Group mapping "${standardizedName}" has been created with ${selectedColumns.length} columns.`,
      });
      
    } catch (error) {
      console.error('❌ Error creating mapping:', error);
      
      // Show error toast
      toast({
        title: 'Failed to Create Mapping',
        description: 'An error occurred while creating the mapping. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingMapping(false);
    }
  };

  // Handle map individually (create separate mappings for each)
  const handleMapIndividually = async () => {
    if (selectedColumns.length === 0 || isCreatingMapping) return;

    try {
      setIsCreatingMapping(true);
      console.log('🔄 Creating individual mappings...');
      
      // Create individual mappings for each selected column
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      
      for (const column of selectedColumns) {
        const standardizedName = column.name.toLowerCase().replace(/\s+/g, '_');
        
        const mapping = {
          id: `mapping_${Date.now()}_${Math.random()}`,
          standardizedName,
          sourceColumns: [column],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await dataService.createColumnMapping(mapping);
        
        // Create learned mapping for this column
        await dataService.saveLearnedMapping(
          'column',
          column.name,
          standardizedName,
          selectedProviderType,
          column.surveySource
        );
      }
      
      console.log('✅ Individual mappings created successfully');
      
      // Clear selections and force data reload
      setSelectedColumns([]);
      
      // Force clear cache and reload data
      const { getPerformanceOptimizedDataService } = await import('../services/PerformanceOptimizedDataService');
      const performanceService = getPerformanceOptimizedDataService();
      performanceService.clearCache('column_mapping');
      
      await loadData();
      console.log('✅ Data reloaded, switching to learned tab');
      
      setActiveTab('learned'); // Switch to learned tab to show the new learned mappings
      
      // Show success toast
      toast({
        title: 'Individual Mappings Created',
        description: `${selectedColumns.length} individual mappings have been created successfully.`,
      });
      
    } catch (error) {
      console.error('❌ Error creating individual mappings:', error);
      
      // Show error toast
      toast({
        title: 'Failed to Create Individual Mappings',
        description: 'An error occurred while creating the individual mappings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingMapping(false);
    }
  };

  // Handle clear all mappings
  const handleClearAllMappings = async () => {
    showConfirmationDialog(
      'Clear All Mappings',
      'Are you sure you want to clear all column mappings? This action cannot be undone.',
      async () => {
        try {
          // Clear all column mappings
          const { getDataService } = await import('../services/DataService');
          const dataService = getDataService();
          await dataService.clearAllColumnMappings();
          
          // Reload data to refresh the display
          await loadData();
          
          // Show success toast
          toast({
            title: 'All Mappings Cleared',
            description: 'All column mappings have been successfully removed.',
          });
          
        } catch (error) {
          console.error('Error clearing mappings:', error);
          
          // Show error toast
          toast({
            title: 'Failed to Clear Mappings',
            description: 'An error occurred while clearing the mappings. Please try again.',
            variant: 'destructive'
          });
        }
      },
      'Clear All',
      'Cancel',
      'danger'
    );
  };

  // Handle remove learned mapping
  const handleRemoveLearnedMapping = async (original: string) => {
    if (!original) return;
    showConfirmationDialog(
      'Remove Learned Mapping',
      'Are you sure you want to remove this learned mapping?',
      async () => {
        await removeLearnedMapping(original);
      },
      'Remove',
      'Cancel'
    );
  };

  // Mapping operations using DataService directly
  const createMapping = async (standardizedName: string, columns: any[]) => {
    const { getDataService } = await import('../services/DataService');
    const dataService = getDataService();
    
    const mapping = {
      id: `mapping_${Date.now()}`,
      standardizedName,
      sourceColumns: columns,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await dataService.createColumnMapping(mapping);
    await loadData();
  };


  const deleteMapping = async (mappingId: string) => {
    showConfirmationDialog(
      'Delete Column Mapping',
      'Are you sure you want to delete this column mapping? This action cannot be undone.',
      async () => {
        try {
          console.log('🗑️ Deleting mapping with ID:', mappingId);
          
          const { getDataService } = await import('../services/DataService');
          const dataService = getDataService();
          
          await dataService.deleteColumnMapping(mappingId);
          console.log('✅ Mapping deleted successfully');
          
          // Clear performance cache to ensure immediate UI update
          const { getPerformanceOptimizedDataService } = await import('../services/PerformanceOptimizedDataService');
          const performanceService = getPerformanceOptimizedDataService();
          performanceService.clearCache('column_mapping');
          
          await loadData();
          console.log('✅ Data reloaded after deletion');
          
          // Show success toast
          toast({
            title: 'Mapping Deleted',
            description: 'Column mapping has been successfully removed.',
          });
          
        } catch (error) {
          console.error('❌ Error deleting mapping:', error);
          
          // Show error toast
          toast({
            title: 'Failed to Delete Mapping',
            description: 'An error occurred while deleting the mapping. Please try again.',
            variant: 'destructive'
          });
        }
      },
      'Delete',
      'Cancel',
      'danger'
    );
  };

  const removeLearnedMapping = async (original: string) => {
    try {
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      
      await dataService.removeLearnedMapping('column', original);
      // Clear optimized cache to reflect immediately
      const { getPerformanceOptimizedDataService } = await import('../services/PerformanceOptimizedDataService');
      const performanceService = getPerformanceOptimizedDataService();
      performanceService.clearCache('column_mapping');
      await loadData();
      
      // Show success toast
      toast({
        title: 'Learned Mapping Removed',
        description: 'The learned mapping has been successfully removed.',
      });
      
    } catch (error) {
      console.error('❌ Error removing learned mapping:', error);
      
      // Show error toast
      toast({
        title: 'Failed to Remove Learned Mapping',
        description: 'An error occurred while removing the learned mapping. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle apply all learned mappings
  const handleApplyAllLearnedMappings = () => {
    if (window.confirm('Apply all learned mappings to create permanent mappings?')) {
      // TODO: Implement apply all learned mappings
    }
  };

  // Handle clear all learned mappings
  const handleClearAllLearnedMappings = () => {
    if (window.confirm('Are you sure you want to clear all learned mappings?')) {
      // TODO: Implement clear all learned mappings
    }
  };

  // Emergency timeout handling
  if (loading && !emergencyTimeout) {
    return (
      <EnterpriseLoadingSpinner
        message="Loading column mappings..."
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
          <p className="text-gray-600 mb-4">The column mapping data is taking too long to load. This might be due to a data service issue.</p>
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
      componentName="ColumnMapping"
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
            onToggleSelectAll={toggleSelectAll}
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
                showAllCategories={showAllCategories}
                onToggleCategoryFilter={() => setShowAllCategories(!showAllCategories)}
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
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        onConfirm={handleConfirm}
        onClose={handleCancel}
        type={dialogState.type}
      />
    </div>
    </AdvancedErrorBoundary>
  );
};

export default ColumnMapping;
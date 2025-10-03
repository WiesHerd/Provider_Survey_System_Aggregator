import { useState, useEffect, useCallback } from 'react';
import { useMappingData } from './useMappingData';
import { useConfirmationDialog } from '../../../shared';
import { SpecialtyMappingProps } from '../types/mapping';

/**
 * Business logic hook for SpecialtyMapping component
 * Handles all business logic, state management, and user interactions
 * Separated from UI concerns for better maintainability
 */
export const useSpecialtyMappingLogic = (props: SpecialtyMappingProps) => {
  const { onMappingChange, onUnmappedChange } = props;
  
  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [isBulkSelected, setIsBulkSelected] = useState(false);
  
  // Enterprise-grade confirmation dialog system
  const { dialogState, showConfirmation, handleConfirm, handleCancel } = useConfirmationDialog();

  // Data management hook
  const {
    // State
    mappings,
    unmappedSpecialties,
    selectedSpecialties,
    learnedMappings,
    learnedMappingsWithSource,
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
    deselectSpecialty,
    clearSelectedSpecialties,
    selectAllSpecialties,
    deselectAllSpecialties,
    
    // Data operations
    loadData,
    createMapping,
    createIndividualMappings,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
    clearAllLearnedMappings,
    applyAllLearnedMappings,
    
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm,
    clearError
  } = useMappingData();

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedSpecialties);
  }, [unmappedSpecialties, onUnmappedChange]);

  // Dynamic select/deselect all toggle
  const allUnmappedCount = filteredUnmapped.length;
  
  const handleToggleSelectAll = useCallback(() => {
    if (isBulkSelected) {
      clearSelectedSpecialties();
      setIsBulkSelected(false);
    } else {
      selectAllSpecialties();
      setIsBulkSelected(true);
    }
  }, [isBulkSelected, clearSelectedSpecialties, selectAllSpecialties]);

  // Confirmation handlers
  const handleClearAllMappings = useCallback(() => {
    showConfirmation(
      'Clear All Mappings',
      'Are you sure you want to clear all mappings? This cannot be undone.',
      clearAllMappings,
      { type: 'danger', confirmText: 'Clear All' }
    );
  }, [showConfirmation, clearAllMappings]);

  const handleRemoveLearnedMapping = useCallback((original: string) => {
    console.log('🔍 handleRemoveLearnedMapping called with:', original);
    console.log('🔍 removeLearnedMapping function exists:', !!removeLearnedMapping);
    console.log('🔍 removeLearnedMapping function type:', typeof removeLearnedMapping);
    
    if (!removeLearnedMapping) {
      console.error('❌ removeLearnedMapping function is undefined!');
      return;
    }
    
    console.log('🔍 Calling removeLearnedMapping directly with:', original);
    removeLearnedMapping(original);
    console.log('🔍 removeLearnedMapping call completed');
  }, [removeLearnedMapping]);

  const handleClearAllLearnedMappings = useCallback(async () => {
    showConfirmation(
      'Clear All Learned Mappings',
      'Are you sure you want to clear all learned mappings? This cannot be undone.',
      async () => {
        try {
          // Get data service instance
          const { getDataService } = await import('../../../services/DataService');
          const dataService = getDataService();
          
          // Clear all learned mappings
          await dataService.clearLearnedMappings('specialty');
          
          // Reload data to refresh the UI
          await loadData();
          
          console.log('✅ Successfully cleared all learned mappings');
        } catch (err) {
          console.error('Error clearing learned mappings:', err);
        }
      },
      { type: 'danger', confirmText: 'Clear All' }
    );
  }, [showConfirmation, loadData]);

  // UI handlers
  const handleShowHelp = useCallback(() => setShowHelp(true), []);
  const handleCloseHelp = useCallback(() => setShowHelp(false), []);

  return {
    // UI state
    showHelp,
    isBulkSelected,
    allUnmappedCount,
    
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
  };
};

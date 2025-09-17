import { useEffect } from 'react';
import { useMappingState } from './useMappingState';
import { useMappingSearch } from './useMappingSearch';
import { useMappingOperations } from './useMappingOperations';
import { useMappingSelection } from './useMappingSelection';

/**
 * Unified hook that combines all focused mapping hooks
 * This replaces the massive 509-line useMappingData hook
 * 
 * Architecture:
 * - useMappingState: Core state management
 * - useMappingSearch: Search and filtering
 * - useMappingOperations: CRUD operations
 * - useAutoMapping: Auto-mapping logic
 * - useMappingSelection: Selection management
 */
export const useMappingDataUnified = () => {
  // Core state management
  const {
    mappings,
    unmappedSpecialties,
    selectedSpecialties,
    learnedMappings,
    loading,
    error,
    activeTab,
    updateMappings,
    updateUnmappedSpecialties,
    updateSelectedSpecialties,
    updateLearnedMappings,
    setLoadingState,
    setErrorState,
    setActiveTabState
  } = useMappingState();

  // Search and filtering
  const {
    searchTerm,
    mappedSearchTerm,
    filteredUnmapped,
    specialtiesBySurvey,
    filteredMappings,
    filteredLearned,
    handleSearchChange,
    handleMappedSearchChange,
    clearSearch
  } = useMappingSearch(unmappedSpecialties, mappings, learnedMappings);

  // CRUD operations
  const {
    loadData,
    createMapping,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
    applyAllLearnedMappings
  } = useMappingOperations(
    mappings,
    unmappedSpecialties,
    selectedSpecialties,
    learnedMappings,
    updateMappings,
    updateUnmappedSpecialties,
    updateSelectedSpecialties,
    updateLearnedMappings,
    setLoadingState,
    setErrorState
  );


  // Selection management
  const {
    selectSpecialty,
    deselectSpecialty,
    clearSelectedSpecialties,
    selectAllSpecialties,
    deselectAllSpecialties
  } = useMappingSelection(
    selectedSpecialties,
    filteredUnmapped,
    updateSelectedSpecialties
  );

  // Load data on mount with safety timeout
  useEffect(() => {
    console.log('🔄 useMappingDataUnified: Starting data load...');
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.log('⚠️ Safety timeout: Force stopping loading state');
      setLoadingState(false);
      setErrorState('Data loading timed out - please refresh the page');
    }, 15000); // 15 second safety timeout
    
    loadData().finally(() => {
      clearTimeout(safetyTimeout);
    });
  }, [loadData, setLoadingState, setErrorState]);

  // Smart tab selection based on data availability (only on initial load)
  useEffect(() => {
    if (!loading) {
      // Only set initial tab if no tab is currently selected
      if (activeTab === 'unmapped' && mappings.length === 0 && unmappedSpecialties.length === 0 && Object.keys(learnedMappings).length === 0) {
        // Default to unmapped tab for new users
        setActiveTabState('unmapped');
      }
      // If there are unmapped specialties and no mappings, default to unmapped tab
      else if (unmappedSpecialties.length > 0 && mappings.length === 0) {
        setActiveTabState('unmapped');
      }
      // If there are learned mappings and no other data, default to learned tab
      else if (Object.keys(learnedMappings).length > 0 && mappings.length === 0 && unmappedSpecialties.length === 0) {
        setActiveTabState('learned');
      }
      // Otherwise, keep current tab - don't force switch to mapped tab
    }
  }, [loading, mappings.length, unmappedSpecialties.length, learnedMappings, activeTab, setActiveTabState]);

  // Clear error utility
  const clearError = () => setErrorState(null);

  return {
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
    specialtiesBySurvey,
    filteredMappings,
    filteredLearned,
    
    // Actions
    setActiveTab: setActiveTabState,
    selectSpecialty,
    deselectSpecialty,
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
    applyAllLearnedMappings,
    
    
    // Search and filters
    setSearchTerm: handleSearchChange,
    setMappedSearchTerm: handleMappedSearchChange,
    clearError,
    clearSearch
  };
};

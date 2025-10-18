import { useCallback, useEffect } from 'react';
import { IUnmappedSpecialty } from '../types/mapping';

/**
 * Hook for managing specialty selection functionality
 * Single responsibility: Selection logic only
 */
export const useMappingSelection = (
  selectedSpecialties: IUnmappedSpecialty[],
  filteredUnmapped: IUnmappedSpecialty[],
  updateSelectedSpecialties: (selected: IUnmappedSpecialty[]) => void
) => {
  // Select a single specialty
  const selectSpecialty = useCallback((specialty: IUnmappedSpecialty) => {
    if (!selectedSpecialties.find(s => s.id === specialty.id)) {
      updateSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  }, [selectedSpecialties, updateSelectedSpecialties]);

  // Deselect a single specialty
  const deselectSpecialty = useCallback((specialty: IUnmappedSpecialty) => {
    updateSelectedSpecialties(selectedSpecialties.filter(s => s.id !== specialty.id));
  }, [selectedSpecialties, updateSelectedSpecialties]);

  // Clear all selections
  const clearSelectedSpecialties = useCallback(() => {
    updateSelectedSpecialties([]);
  }, [updateSelectedSpecialties]);

  // Select all specialties in filtered view
  const selectAllSpecialties = useCallback(() => {
    updateSelectedSpecialties(filteredUnmapped);
  }, [filteredUnmapped, updateSelectedSpecialties]);

  // Deselect all specialties
  const deselectAllSpecialties = useCallback(() => {
    updateSelectedSpecialties([]);
  }, [updateSelectedSpecialties]);

  // Clean up selected specialties that are no longer in the filtered view
  useEffect(() => {
    if (selectedSpecialties.length > 0) {
      const filteredIds = new Set(filteredUnmapped.map(s => s.id));
      const validSelected = selectedSpecialties.filter(s => filteredIds.has(s.id));
      
      if (validSelected.length !== selectedSpecialties.length) {
        console.log('🔍 Cleaning up invalid selections:', {
          original: selectedSpecialties.length,
          valid: validSelected.length,
          removed: selectedSpecialties.length - validSelected.length
        });
        updateSelectedSpecialties(validSelected);
      }
    }
  }, [filteredUnmapped, selectedSpecialties, updateSelectedSpecialties]);

  return {
    selectSpecialty,
    deselectSpecialty,
    clearSelectedSpecialties,
    selectAllSpecialties,
    deselectAllSpecialties
  };
};


























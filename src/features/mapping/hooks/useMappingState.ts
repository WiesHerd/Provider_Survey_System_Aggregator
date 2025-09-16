import { useState, useCallback } from 'react';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/mapping';

/**
 * Hook for managing core mapping state
 * Single responsibility: State management only
 */
export const useMappingState = () => {
  // Core state
  const [mappings, setMappings] = useState<ISpecialtyMapping[]>([]);
  const [unmappedSpecialties, setUnmappedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');

  // State setters
  const updateMappings = useCallback((newMappings: ISpecialtyMapping[]) => {
    setMappings(newMappings);
  }, []);

  const updateUnmappedSpecialties = useCallback((newUnmapped: IUnmappedSpecialty[]) => {
    setUnmappedSpecialties(newUnmapped);
  }, []);

  const updateSelectedSpecialties = useCallback((newSelected: IUnmappedSpecialty[]) => {
    setSelectedSpecialties(newSelected);
  }, []);

  const updateLearnedMappings = useCallback((newLearned: Record<string, string>) => {
    setLearnedMappings(newLearned);
  }, []);

  const setLoadingState = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const setActiveTabState = useCallback((tab: 'unmapped' | 'mapped' | 'learned') => {
    setActiveTab(tab);
  }, []);

  return {
    // State
    mappings,
    unmappedSpecialties,
    selectedSpecialties,
    learnedMappings,
    loading,
    error,
    activeTab,
    
    // State setters
    updateMappings,
    updateUnmappedSpecialties,
    updateSelectedSpecialties,
    updateLearnedMappings,
    setLoadingState,
    setErrorState,
    setActiveTabState
  };
};




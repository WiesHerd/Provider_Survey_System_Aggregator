import { useState, useMemo, useCallback } from 'react';
import { ISpecialtyMapping, IUnmappedSpecialty, MappingFilters } from '../types/mapping';
import { 
  filterUnmappedSpecialties,
  groupSpecialtiesBySurvey,
  filterMappedSpecialties,
  filterLearnedMappings
} from '../utils/mappingCalculations';

/**
 * Hook for managing search and filtering functionality
 * Single responsibility: Search and filtering only
 */
export const useMappingSearch = (
  unmappedSpecialties: IUnmappedSpecialty[],
  mappings: ISpecialtyMapping[],
  learnedMappings: Record<string, string>
) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');

  // Computed filtered values
  const filteredUnmapped = useMemo(() => {
    const filters: MappingFilters = { searchTerm };
    return filterUnmappedSpecialties(unmappedSpecialties, filters);
  }, [unmappedSpecialties, searchTerm]);

  const specialtiesBySurvey = useMemo(() => {
    return groupSpecialtiesBySurvey(filteredUnmapped);
  }, [filteredUnmapped]);

  const filteredMappings = useMemo(() => {
    return filterMappedSpecialties(mappings, mappedSearchTerm);
  }, [mappings, mappedSearchTerm]);

  const filteredLearned = useMemo(() => {
    return filterLearnedMappings(learnedMappings, mappedSearchTerm);
  }, [learnedMappings, mappedSearchTerm]);

  // Search handlers
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleMappedSearchChange = useCallback((term: string) => {
    setMappedSearchTerm(term);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setMappedSearchTerm('');
  }, []);

  return {
    // Search state
    searchTerm,
    mappedSearchTerm,
    
    // Computed values
    filteredUnmapped,
    specialtiesBySurvey,
    filteredMappings,
    filteredLearned,
    
    // Search handlers
    handleSearchChange,
    handleMappedSearchChange,
    clearSearch
  };
};






























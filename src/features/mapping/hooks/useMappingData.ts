import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ISpecialtyMapping, 
  IUnmappedSpecialty, 
  MappingState,
  MappingFilters
} from '../types/mapping';
import { getDataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { 
  filterUnmappedSpecialties,
  groupSpecialtiesBySurvey,
  filterMappedSpecialties,
  filterLearnedMappings
} from '../utils/mappingCalculations';

interface UseMappingDataReturn {
  // State
  mappings: ISpecialtyMapping[];
  unmappedSpecialties: IUnmappedSpecialty[];
  selectedSpecialties: IUnmappedSpecialty[];
  learnedMappings: Record<string, string>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
  
  // Search state
  searchTerm: string;
  mappedSearchTerm: string;
  
  // Computed values
  filteredUnmapped: IUnmappedSpecialty[];
  specialtiesBySurvey: Map<string, IUnmappedSpecialty[]>;
  filteredMappings: ISpecialtyMapping[];
  filteredLearned: Record<string, string>;
  
  // Actions
  setActiveTab: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  setSelectedSpecialties: (specialties: IUnmappedSpecialty[]) => void;
  selectSpecialty: (specialty: IUnmappedSpecialty) => void;
  deselectSpecialty: (specialty: IUnmappedSpecialty) => void;
  clearSelectedSpecialties: () => void;
  selectAllSpecialties: () => void;
  deselectAllSpecialties: () => void;
  
  // Data operations
  loadData: () => Promise<void>;
  createMapping: () => Promise<void>;
  createGroupedMapping: () => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  clearAllMappings: () => Promise<void>;
  removeLearnedMapping: (original: string) => Promise<void>;
  
  
  // Search and filters
  setSearchTerm: (term: string) => void;
  setMappedSearchTerm: (term: string) => void;
  clearError: () => void;
  
}

/**
 * Custom hook for managing specialty mapping data
 */
export const useMappingData = (): UseMappingDataReturn => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // Core state (using old types internally)
  const [mappings, setMappings] = useState<ISpecialtyMapping[]>([]);
  const [unmappedSpecialties, setUnmappedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  
  // Service instance
  const dataService = useMemo(() => getDataService(), []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Smart tab selection based on data availability (only on initial load)
  useEffect(() => {
    if (!loading) {
      // Only set initial tab if no tab is currently selected
      if (activeTab === 'unmapped' && mappings.length === 0 && unmappedSpecialties.length === 0 && Object.keys(learnedMappings).length === 0) {
        // Default to unmapped tab for new users
        setActiveTab('unmapped');
      }
      // If there are unmapped specialties and no mappings, default to unmapped tab
      else if (unmappedSpecialties.length > 0 && mappings.length === 0) {
        setActiveTab('unmapped');
      }
      // If there are learned mappings and no other data, default to learned tab
      else if (Object.keys(learnedMappings).length > 0 && mappings.length === 0 && unmappedSpecialties.length === 0) {
        setActiveTab('learned');
      }
      // Otherwise, keep current tab - don't force switch to mapped tab
    }
  }, [loading, mappings.length, unmappedSpecialties.length, learnedMappings, activeTab]);

  // No type conversion needed - using unified types

  // Computed values
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

  // Clean up selected specialties that are no longer in the filtered view
  useEffect(() => {
    if (selectedSpecialties.length > 0) {
      const filteredIds = new Set(filteredUnmapped.map(s => s.id));
      const validSelected = selectedSpecialties.filter(s => filteredIds.has(s.id));
      
      if (validSelected.length !== selectedSpecialties.length) {
        console.log('Cleaning up selected specialties:', {
          original: selectedSpecialties.length,
          valid: validSelected.length,
          removed: selectedSpecialties.length - validSelected.length
        });
        setSelectedSpecialties(validSelected);
      }
    }
  }, [filteredUnmapped, selectedSpecialties]);

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert UI provider type to data service provider type
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
      console.log('🔍 useMappingData: Loading specialty mapping data...', { 
        selectedProviderType, 
        dataProviderType,
        contextWorking: !!selectedProviderType
      });
      const [mappingsData, unmappedData, learnedData] = await Promise.all([
        dataService.getAllSpecialtyMappings(dataProviderType),
        dataService.getUnmappedSpecialties(dataProviderType),
        dataService.getLearnedMappings('specialty', dataProviderType)
      ]);
      
      console.log('Loaded data:', { 
        mappings: mappingsData.length, 
        unmapped: unmappedData.length, 
        learned: Object.keys(learnedData || {}).length 
      });
      
      setMappings(mappingsData);
      setUnmappedSpecialties(unmappedData);
      setLearnedMappings(learnedData || {});
      
      // Clear selected specialties when data loads to ensure clean state
      setSelectedSpecialties([]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load specialty data');
    } finally {
      setLoading(false);
    }
  }, [dataService, selectedProviderType]);

  // Specialty selection
  const selectSpecialty = useCallback((specialty: IUnmappedSpecialty) => {
    setSelectedSpecialties(prev => {
      if (prev.some(s => s.id === specialty.id)) {
        return prev.filter(s => s.id !== specialty.id);
      } else {
        return [...prev, specialty];
      }
    });
  }, []);

  const deselectSpecialty = useCallback((specialty: IUnmappedSpecialty) => {
    setSelectedSpecialties(prev => prev.filter(s => s.id !== specialty.id));
  }, []);

  const clearSelectedSpecialties = useCallback(() => {
    setSelectedSpecialties([]);
  }, []);

  // Mapping operations
  const createMapping = useCallback(async () => {
    if (selectedSpecialties.length === 0) return;

    try {
      setError(null);
      
      // Create individual mappings for each selected specialty
      const newMappings: ISpecialtyMapping[] = [];
      
      for (const specialty of selectedSpecialties) {
        // Each specialty gets its own mapping with its own name as standardized name
        const sourceSpecialty = {
          id: crypto.randomUUID(),
          specialty: specialty.name,
          originalName: specialty.name,
          surveySource: specialty.surveySource,
          mappingId: ''
        };

        const mapping = await dataService.createSpecialtyMapping({
          id: crypto.randomUUID(),
          standardizedName: specialty.name, // Each specialty maps to itself
          sourceSpecialties: [sourceSpecialty], // Only one source specialty per mapping
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Create learned mapping for future automap runs
        await dataService.saveLearnedMapping('specialty', specialty.name, specialty.name, selectedProviderType);
        
        newMappings.push(mapping);
      }
      
      // Update state
      setMappings(prev => [...prev, ...newMappings]);
      setUnmappedSpecialties(prev => 
        prev.filter(s => !selectedSpecialties.some(selected => selected.id === s.id))
      );
      setSelectedSpecialties([]);
      
      // Refresh learned mappings to show the new ones (provider-type specific)
      const learnedData = await dataService.getLearnedMappings('specialty', selectedProviderType);
      setLearnedMappings(learnedData);
      // Keep user on unmapped tab to continue mapping more specialties
    } catch (err) {
      setError('Failed to create mappings');
      console.error('Error creating mappings:', err);
    }
  }, [selectedSpecialties, dataService]);

  // Create grouped mapping - all selected specialties in one mapping
  const createGroupedMapping = useCallback(async () => {
    if (selectedSpecialties.length === 0) return;

    try {
      setError(null);
      
      // Use the first specialty name as the standardized name for the group
      const standardizedName = selectedSpecialties[0].name;
      
      const sourceSpecialties = selectedSpecialties.map(specialty => ({
        id: crypto.randomUUID(),
        specialty: specialty.name,
        originalName: specialty.name,
        surveySource: specialty.surveySource,
        mappingId: ''
      }));

      const mapping = await dataService.createSpecialtyMapping({
        id: crypto.randomUUID(),
        standardizedName,
        sourceSpecialties, // All specialties in one mapping
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create learned mappings for all specialties in the group
      for (const specialty of selectedSpecialties) {
        await dataService.saveLearnedMapping('specialty', specialty.name, standardizedName, selectedProviderType);
      }
      
      // Update state
      setMappings(prev => [...prev, mapping]);
      setUnmappedSpecialties(prev => 
        prev.filter(s => !selectedSpecialties.some(selected => selected.id === s.id))
      );
      setSelectedSpecialties([]);
      
      // Refresh learned mappings to show the new ones (provider-type specific)
      const learnedData = await dataService.getLearnedMappings('specialty', selectedProviderType);
      setLearnedMappings(learnedData);
      // Keep user on unmapped tab to continue mapping more specialties
    } catch (err) {
      setError('Failed to create grouped mapping');
      console.error('Error creating grouped mapping:', err);
    }
  }, [selectedSpecialties, dataService]);

  const deleteMapping = useCallback(async (mappingId: string) => {
    try {
      setError(null);
      await dataService.deleteSpecialtyMapping(mappingId);
      
      // Update state
      setMappings(prev => prev.filter(m => m.id !== mappingId));
      
      // Refresh unmapped specialties to show the deleted ones
      const unmappedData = await dataService.getUnmappedSpecialties();
      setUnmappedSpecialties(unmappedData);
      
      // Switch to unmapped tab
      setActiveTab('unmapped');
    } catch (err) {
      setError('Failed to delete mapping');
      console.error('Error deleting mapping:', err);
    }
  }, [dataService]);

  const clearAllMappings = useCallback(async () => {
    try {
      setError(null);
      await dataService.clearAllSpecialtyMappings();
      
      // Reset state
      setMappings([]);
      setLearnedMappings({});
      setActiveTab('unmapped');
      
      // Reload data
      await loadData();
    } catch (err) {
      setError('Failed to clear all mappings');
      console.error('Error clearing mappings:', err);
    }
  }, [dataService, loadData]);

  const removeLearnedMapping = useCallback(async (original: string) => {
    try {
      setError(null);
      await dataService.removeLearnedMapping('specialty', original);
      // Refresh learned mappings
      const learnedData = await dataService.getLearnedMappings('specialty');
      setLearnedMappings(learnedData);
    } catch (err) {
      setError('Failed to remove learned mapping');
      console.error('Error removing learned mapping:', err);
    }
  }, [dataService]);


  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);


  // Select all specialties (filtered by current search)
  const selectAllSpecialties = useCallback(() => {
    setSelectedSpecialties(filteredUnmapped);
  }, [filteredUnmapped]);

  // Deselect all specialties
  const deselectAllSpecialties = useCallback(() => {
    setSelectedSpecialties([]);
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
    
    // Search state
    searchTerm,
    mappedSearchTerm,
    
    // Computed values
    filteredUnmapped,
    specialtiesBySurvey,
    filteredMappings,
    filteredLearned,
    
    // Actions
    setActiveTab,
    setSelectedSpecialties,
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
    
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm,
    clearError
  };
};

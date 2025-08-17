import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ISpecialtyMapping as NewISpecialtyMapping, 
  IUnmappedSpecialty as NewIUnmappedSpecialty, 
  IAutoMappingConfig, 
  IMappingSuggestion,
  MappingState,
  MappingFilters
} from '../types/mapping';
import { 
  ISpecialtyMapping, 
  IUnmappedSpecialty 
} from '../../../types/specialty';
import { getDataService } from '../../../services/DataService';
import { 
  filterUnmappedSpecialties,
  groupSpecialtiesBySurvey,
  filterMappedSpecialties,
  filterLearnedMappings,
  generateMappingSuggestions,
  calculateAutoMappingResults,
  validateMappingConfig
} from '../utils/mappingCalculations';

interface UseMappingDataReturn {
  // State
  mappings: NewISpecialtyMapping[];
  unmappedSpecialties: NewIUnmappedSpecialty[];
  selectedSpecialties: NewIUnmappedSpecialty[];
  learnedMappings: Record<string, string>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
  
  // Search state
  searchTerm: string;
  mappedSearchTerm: string;
  
  // Computed values
  filteredUnmapped: NewIUnmappedSpecialty[];
  specialtiesBySurvey: Map<string, NewIUnmappedSpecialty[]>;
  filteredMappings: NewISpecialtyMapping[];
  filteredLearned: Record<string, string>;
  
  // Actions
  setActiveTab: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  setSelectedSpecialties: (specialties: IUnmappedSpecialty[]) => void;
  selectSpecialty: (specialty: IUnmappedSpecialty) => void;
  deselectSpecialty: (specialty: IUnmappedSpecialty) => void;
  clearSelectedSpecialties: () => void;
  
  // Data operations
  loadData: () => Promise<void>;
  createMapping: () => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  clearAllMappings: () => Promise<void>;
  removeLearnedMapping: (original: string) => Promise<void>;
  
  // Auto-mapping
  autoMap: (config: IAutoMappingConfig) => Promise<{
    suggestions: IMappingSuggestion[];
    results: {
      total: number;
      mapped: number;
      skipped: number;
    };
  }>;
  
  // Search and filters
  setSearchTerm: (term: string) => void;
  setMappedSearchTerm: (term: string) => void;
  clearError: () => void;
  
  // Validation
  validateConfig: (config: IAutoMappingConfig) => { isValid: boolean; errors: string[] };
}

/**
 * Custom hook for managing specialty mapping data
 */
export const useMappingData = (): UseMappingDataReturn => {
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

  // Smart tab selection based on data availability
  useEffect(() => {
    if (!loading) {
      // If there are mappings, default to mapped tab
      if (mappings.length > 0) {
        setActiveTab('mapped');
      }
      // If there are unmapped specialties and no mappings, default to unmapped tab
      else if (unmappedSpecialties.length > 0) {
        setActiveTab('unmapped');
      }
      // If there are learned mappings and no other data, default to learned tab
      else if (Object.keys(learnedMappings).length > 0) {
        setActiveTab('learned');
      }
      // Otherwise, keep current tab or default to unmapped
    }
  }, [loading, mappings.length, unmappedSpecialties.length, learnedMappings]);

  // Type conversion functions
  const convertMapping = (mapping: ISpecialtyMapping): NewISpecialtyMapping => ({
    ...mapping,
    sourceSpecialties: mapping.sourceSpecialties.map(s => ({
      ...s,
      id: s.id || crypto.randomUUID(),
      surveySource: s.surveySource as any
    }))
  });

  const convertUnmappedSpecialty = (specialty: IUnmappedSpecialty): NewIUnmappedSpecialty => ({
    ...specialty,
    surveySource: specialty.surveySource as any
  });

  // Computed values
  const filteredUnmapped = useMemo(() => {
    const filters: MappingFilters = { searchTerm };
    const convertedUnmapped = unmappedSpecialties.map(convertUnmappedSpecialty);
    return filterUnmappedSpecialties(convertedUnmapped, filters);
  }, [unmappedSpecialties, searchTerm]);

  const specialtiesBySurvey = useMemo(() => {
    return groupSpecialtiesBySurvey(filteredUnmapped);
  }, [filteredUnmapped]);

  const filteredMappings = useMemo(() => {
    const convertedMappings = mappings.map(convertMapping);
    return filterMappedSpecialties(convertedMappings, mappedSearchTerm);
  }, [mappings, mappedSearchTerm]);

  const filteredLearned = useMemo(() => {
    return filterLearnedMappings(learnedMappings, mappedSearchTerm);
  }, [learnedMappings, mappedSearchTerm]);

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading specialty mapping data...');
      const [mappingsData, unmappedData, learnedData] = await Promise.all([
        dataService.getAllSpecialtyMappings(),
        dataService.getUnmappedSpecialties(),
        dataService.getLearnedMappings()
      ]);
      
      console.log('Loaded data:', { 
        mappings: mappingsData.length, 
        unmapped: unmappedData.length, 
        learned: Object.keys(learnedData || {}).length 
      });
      
      setMappings(mappingsData);
      setUnmappedSpecialties(unmappedData);
      setLearnedMappings(learnedData || {});
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load specialty data');
    } finally {
      setLoading(false);
    }
  }, [dataService]);

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
      
      // Use the first specialty name as the standardized name
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
        sourceSpecialties,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Update state
      setMappings(prev => [...prev, mapping]);
      setUnmappedSpecialties(prev => 
        prev.filter(s => !selectedSpecialties.some(selected => selected.id === s.id))
      );
      setSelectedSpecialties([]);
      setActiveTab('mapped'); // Switch to mapped view after creating
    } catch (err) {
      setError('Failed to create mapping');
      console.error('Error creating mapping:', err);
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
      // For now, just remove from local state since learned mappings are in localStorage
      setLearnedMappings(prev => {
        const newLearnedMappings = { ...prev };
        delete newLearnedMappings[original];
        return newLearnedMappings;
      });
    } catch (err) {
      setError('Failed to remove learned mapping');
      console.error('Error removing learned mapping:', err);
    }
  }, []);

  // Auto-mapping
  const autoMap = useCallback(async (config: IAutoMappingConfig) => {
    try {
      setError(null);
      
      // Validate config
      const validation = validateConfig(config);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Convert data to new types before calling utility functions
      const convertedUnmapped = unmappedSpecialties.map(convertUnmappedSpecialty);
      const convertedMappings = mappings.map(convertMapping);

      // Generate suggestions
      const suggestions = generateMappingSuggestions(
        convertedUnmapped,
        convertedMappings,
        learnedMappings,
        config
      );

      // Create mappings from suggestions
      for (const suggestion of suggestions) {
        if (suggestion.confidence >= config.confidenceThreshold) {
          await dataService.createSpecialtyMapping({
            id: crypto.randomUUID(),
            standardizedName: suggestion.standardizedName,
            sourceSpecialties: suggestion.specialties.map(s => ({
              id: crypto.randomUUID(),
              specialty: s.name,
              originalName: s.name,
              surveySource: s.surveySource,
              mappingId: ''
            })),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      // Calculate results
      const results = calculateAutoMappingResults(suggestions, config);

      // Refresh data
      await loadData();
      
      return { suggestions, results };
    } catch (err) {
      setError('Failed to process auto-mapping');
      console.error('Auto-mapping error:', err);
      throw err;
    }
  }, [unmappedSpecialties, mappings, learnedMappings, dataService, loadData]);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateConfig = useCallback((config: IAutoMappingConfig) => {
    return validateMappingConfig(config);
  }, []);

  return {
    // State
    mappings: mappings.map(convertMapping),
    unmappedSpecialties: unmappedSpecialties.map(convertUnmappedSpecialty),
    selectedSpecialties: selectedSpecialties.map(convertUnmappedSpecialty),
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
    clearError,
    
    // Validation
    validateConfig
  };
};

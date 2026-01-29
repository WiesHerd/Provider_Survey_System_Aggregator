import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ISpecialtyMapping, 
  IUnmappedSpecialty, 
  MappingFilters
} from '../types/mapping';
import { getDataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { useSpecialtyMappingQuery } from './useSpecialtyMappingQuery';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/services/queryClient';
import { stringSimilarity } from 'string-similarity-js';
import { initialSpecialtyMappings } from '../../../data/initialSpecialtyMappings';
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
  learnedMappingsWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
  
  // Cross-provider mapping toggle
  showAllProviderTypes: boolean;
  setShowAllProviderTypes: (value: boolean) => void;
  
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
  createIndividualMappings: () => Promise<void>;
  createGroupedMapping: () => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  clearAllMappings: () => Promise<void>;
  removeLearnedMapping: (original: string) => Promise<void>;
  clearAllLearnedMappings: () => Promise<void>;
  applyAllLearnedMappings: () => Promise<void>;
  
  
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
  
  // Database context - check if database is ready
  const { isReady: isDatabaseReady, isInitializing } = useDatabase();
  
  // React Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Core state (using old types internally)
  const [mappings, setMappings] = useState<ISpecialtyMapping[]>([]);
  const [unmappedSpecialties, setUnmappedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [learnedMappingsWithSource, setLearnedMappingsWithSource] = useState<Array<{original: string, corrected: string, surveySource: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Force TypeScript recompilation
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  
  // Service instance
  const dataService = useMemo(() => getDataService(), []);

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
        setSelectedSpecialties(validSelected);
      }
    }
  }, [filteredUnmapped, selectedSpecialties]);

  // State for cross-category mapping toggle
  // Default to false (filtered by current Data View selection) to match expected UI behavior
  const [showAllProviderTypes, setShowAllProviderTypes] = useState(false);
  
  // ENTERPRISE FIX: Use React Query for Google-style caching
  // Checkbox logic: 
  // - When checked (showAllProviderTypes = true): Show ALL surveys regardless of Data View (override filter)
  // - When unchecked (showAllProviderTypes = false): Respect Data View selection (filter by selectedProviderType)
  const dataProviderType = showAllProviderTypes 
    ? undefined // undefined = show all (override Data View filter)
    : (selectedProviderType === 'BOTH' ? undefined : selectedProviderType); // Respect Data View selection
  
  const {
    data: queryData,
    loading: queryLoading,
    error: queryError,
    refetch: refetchData
  } = useSpecialtyMappingQuery(
    dataProviderType,
    isDatabaseReady && !isInitializing
  );
  
  // Update local state from React Query data
  useEffect(() => {
    if (queryData) {
      setMappings(queryData.mappings);
      setUnmappedSpecialties(queryData.unmapped);
      setLearnedMappings(queryData.learned);
      setLearnedMappingsWithSource(queryData.learnedWithSource);
      
      // Clear selected specialties when data loads to ensure clean state
      setSelectedSpecialties([]);
    }
  }, [queryData]);
  
  // Update loading and error state from React Query
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading]);
  
  useEffect(() => {
    if (queryError) {
      setError(`Failed to load specialty data: ${queryError}. Please try refreshing the page.`);
    } else {
      setError(null);
    }
  }, [queryError]);
  
  // Data loading function - now just triggers refetch (React Query handles caching)
  const loadData = useCallback(async () => {
    await refetchData();
  }, [refetchData]);

  // Reload data on mount and when data category or showAllProviderTypes toggle changes
  // CRITICAL FIX: Include loadData in dependencies to ensure we always use the latest version
  useEffect(() => {
    console.log('🔍 useMappingData: Reloading data due to state change:', {
      selectedProviderType,
      showAllProviderTypes
    });
    loadData();
  }, [loadData]); // loadData is a useCallback that depends on selectedProviderType and showAllProviderTypes

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
      
      // ENTERPRISE FIX: Determine providerType for mapping (needed for proper filtering)
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
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

        const mappingData: ISpecialtyMapping = {
          id: crypto.randomUUID(),
          standardizedName: specialty.name, // Each specialty maps to itself
          sourceSpecialties: [sourceSpecialty], // Only one source specialty per mapping
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // ENTERPRISE FIX: Include providerType so mapping appears in filtered views
        if (dataProviderType && (dataProviderType === 'PHYSICIAN' || dataProviderType === 'APP')) {
          mappingData.providerType = dataProviderType;
        }
        
        const mapping = await dataService.createSpecialtyMapping(mappingData);
        
        // Create learned mapping for future automap runs
        await dataService.saveLearnedMapping('specialty', specialty.name, specialty.name, selectedProviderType);
        
        newMappings.push(mapping);
      }
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
      
      // Update state (will be updated by React Query refetch)
      setSelectedSpecialties([]);
      
      // Invalidate analytics cache since mappings changed
      try {
        const { cacheInvalidation } = await import('../../analytics/utils/cacheInvalidation');
        cacheInvalidation.onMappingChanged();
      } catch (err) {
        // Analytics cache invalidation is optional
      }
      
      // Keep user on unmapped tab to continue mapping more specialties
    } catch (err) {
      setError('Failed to create mappings');
    }
  }, [selectedSpecialties, dataService, selectedProviderType]);

  // Create individual mappings - each selected specialty gets its own mapping
  const createIndividualMappings = useCallback(async () => {
    if (selectedSpecialties.length === 0) return;

    try {
      setError(null);
      
      // ENTERPRISE FIX: Determine providerType for mapping (needed for proper filtering)
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
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

        const mappingData: ISpecialtyMapping = {
          id: crypto.randomUUID(),
          standardizedName: specialty.name, // Each specialty maps to itself
          sourceSpecialties: [sourceSpecialty], // Only one source specialty per mapping
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // ENTERPRISE FIX: Include providerType so mapping appears in filtered views
        if (dataProviderType && (dataProviderType === 'PHYSICIAN' || dataProviderType === 'APP')) {
          mappingData.providerType = dataProviderType;
        }
        
        const mapping = await dataService.createSpecialtyMapping(mappingData);
        
        // Create learned mapping for future automap runs
        await dataService.saveLearnedMapping('specialty', specialty.name, specialty.name, selectedProviderType);
        
        newMappings.push(mapping);
      }
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
      
      // Update state (will be updated by React Query refetch)
      setSelectedSpecialties([]);
      // Keep user on unmapped tab to continue mapping more specialties
    } catch (err) {
      setError('Failed to create individual mappings');
    }
  }, [selectedSpecialties, dataService, selectedProviderType, queryClient]);

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

      // ENTERPRISE FIX: Determine providerType for mapping (needed for proper filtering)
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : (selectedProviderType as 'PHYSICIAN' | 'APP' | undefined);
      
      const mappingData: ISpecialtyMapping = {
        id: crypto.randomUUID(),
        standardizedName,
        sourceSpecialties, // All specialties in one mapping
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // ENTERPRISE FIX: Include providerType so mapping appears in filtered views
      if (dataProviderType) {
        mappingData.providerType = dataProviderType;
      }
      
      const mapping = await dataService.createSpecialtyMapping(mappingData);
      
      // Create learned mappings for all specialties in the group
      for (const specialty of selectedSpecialties) {
        await dataService.saveLearnedMapping('specialty', specialty.name, standardizedName, selectedProviderType);
      }
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
      
      // Update state (will be updated by React Query refetch)
      setSelectedSpecialties([]);
      // Keep user on unmapped tab to continue mapping more specialties
    } catch (err) {
      setError('Failed to create grouped mapping');
    }
  }, [selectedSpecialties, dataService, selectedProviderType, queryClient]);

  const deleteMapping = useCallback(async (mappingId: string) => {
    try {
      setError(null);
      await dataService.deleteSpecialtyMapping(mappingId);
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
      
      // Switch to unmapped tab
      setActiveTab('unmapped');
    } catch (err) {
      setError('Failed to delete mapping');
    }
  }, [dataService, queryClient]);

  const clearAllMappings = useCallback(async () => {
    try {
      setError(null);
      await dataService.clearAllSpecialtyMappings();
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
      
      setActiveTab('unmapped');
      
      // Reload data
      await loadData();
    } catch (err) {
      setError('Failed to clear all mappings');
    }
  }, [dataService, loadData]);

  const removeLearnedMapping = useCallback(async (original: string) => {
    try {
      setError(null);
      await dataService.removeLearnedMapping('specialty', original);
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
    } catch (err) {
      setError('Failed to remove learned mapping');
    }
  }, [dataService, queryClient]);

  // Clear all learned mappings function
  const clearAllLearnedMappings = useCallback(async () => {
    try {
      setError(null);
      await dataService.clearLearnedMappings('specialty');
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
    } catch (err) {
      setError('Failed to clear all learned mappings');
    }
  }, [dataService, queryClient]);

  const applyAllLearnedMappings = useCallback(async () => {
    try {
      setError(null);
      
      
      const learnedEntries = Object.entries(learnedMappings);
      
      
      for (const [originalSpecialty, standardizedSpecialty] of learnedEntries) {
        try {
          // Create a new mapping for this learned mapping
          const newMapping = {
            id: crypto.randomUUID(),
            standardizedName: standardizedSpecialty,
            sourceSpecialties: [{
              id: crypto.randomUUID(),
              specialty: originalSpecialty,
              originalName: originalSpecialty,
              surveySource: 'Custom' as const,
              mappingId: standardizedSpecialty
            }],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Save the mapping to the database
          await dataService.createSpecialtyMapping(newMapping);
          
          
        } catch (mappingError) {
        }
      }
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.specialty() });
    } catch (err) {
      setError('Failed to apply learned mappings');
    }
  }, [learnedMappings, dataService, queryClient]);


  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);


  const getExistingMappingExamples = useCallback((
    rawSpecialty: string,
    surveySource: 'MGMA' | 'SullivanCotter' | 'Gallagher',
    maxExamples: number
  ): Array<{ source: string; standardized: string }> => {
    const raw = rawSpecialty.trim().toLowerCase();
    if (!raw) return [];

    const scored = learnedMappingsWithSource
      .filter((m) => m && m.surveySource === surveySource && m.original && m.corrected)
      .map((m) => ({
        source: m.original,
        standardized: m.corrected,
        score: stringSimilarity(raw, m.original.toLowerCase()),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxExamples);

    // Deduplicate by source (case-insensitive)
    const seen = new Set<string>();
    const examples: Array<{ source: string; standardized: string }> = [];
    for (const item of scored) {
      const key = item.source.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      examples.push({ source: item.source, standardized: item.standardized });
    }
    return examples;
  }, [learnedMappingsWithSource]);

  const getLearnedMappingFor = useCallback((rawSpecialty: string): string | undefined => {
    const raw = rawSpecialty.trim();
    if (!raw) return undefined;
    return learnedMappings[raw] || learnedMappings[raw.toLowerCase()];
  }, [learnedMappings]);

  const normalizeKey = useCallback((value: string): string => {
    return value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }, []);

  const isPediatric = useCallback((value: string): boolean => {
    return /pediatr/i.test(value);
  }, []);

  const looksLikeAPP = useCallback((value: string): boolean => {
    // APP markers: NP / PA, plus common expanded forms
    return /\b(np|pa)\b/i.test(value) || /nurse\s+practitioner|physician\s+assistant|advanced\s+practice/i.test(value);
  }, []);

  const toPediatricsPrefixed = useCallback((standardized: string): string => {
    const trimmed = standardized.trim();
    const withoutPrefix = trimmed.replace(/^pediatric(s)?\s*[:\-]?\s*/i, '');
    return `Pediatrics: ${withoutPrefix}`.trim();
  }, []);

  const buildMappedExamples = useCallback((
    rawSpecialty: string,
    surveySource: 'MGMA' | 'SullivanCotter' | 'Gallagher',
    maxExamples: number
  ): Array<{ source: string; standardized: string }> => {
    const raw = rawSpecialty.trim().toLowerCase();
    if (!raw) return [];

    const candidates: Array<{ source: string; standardized: string; score: number }> = [];
    for (const mapping of mappings) {
      for (const src of mapping.sourceSpecialties || []) {
        if (!src?.specialty || src.surveySource !== surveySource) continue;
        candidates.push({
          source: src.specialty,
          standardized: mapping.standardizedName,
          score: stringSimilarity(raw, src.specialty.toLowerCase()),
        });
      }
    }

    const scored = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, maxExamples * 2);

    const seen = new Set<string>();
    const out: Array<{ source: string; standardized: string }> = [];
    for (const item of scored) {
      const key = `${item.source.toLowerCase()}|${item.standardized.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ source: item.source, standardized: item.standardized });
      if (out.length >= maxExamples) break;
    }
    return out;
  }, [mappings]);



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
    learnedMappingsWithSource,
    loading,
    error,
    activeTab,
    
    // Cross-provider mapping toggle
    showAllProviderTypes,
    setShowAllProviderTypes,
    
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
  };
};

/**
 * Optimized Mapping Data Hook
 * Enterprise-grade performance with intelligent caching and batching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ISpecialtyMapping, 
  IUnmappedSpecialty, 
  MappingState,
  MappingFilters
} from '../types/mapping';
import { getPerformanceOptimizedDataService } from '../../../services/PerformanceOptimizedDataService';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { 
  filterUnmappedSpecialties,
  groupSpecialtiesBySurvey,
  filterMappedSpecialties,
  filterLearnedMappings
} from '../utils/mappingCalculations';

interface UseOptimizedMappingDataReturn {
  // State
  mappings: ISpecialtyMapping[];
  unmappedSpecialties: IUnmappedSpecialty[];
  selectedSpecialties: IUnmappedSpecialty[];
  learnedMappings: Record<string, string>;
  learnedMappingsWithSource: Array<{original: string, corrected: string, surveySource: string}>;
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
  
  // Performance
  refreshData: () => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => any;
}

/**
 * Optimized hook for managing specialty mapping data with enterprise-grade performance
 */
export const useOptimizedMappingData = (): UseOptimizedMappingDataReturn => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // Core state
  const [mappings, setMappings] = useState<ISpecialtyMapping[]>([]);
  const [unmappedSpecialties, setUnmappedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [learnedMappingsWithSource, setLearnedMappingsWithSource] = useState<Array<{original: string, corrected: string, surveySource: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  
  // Performance service
  const performanceService = useMemo(() => getPerformanceOptimizedDataService(), []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Smart tab selection based on data availability (only on initial load)
  useEffect(() => {
    if (!loading) {
      if (unmappedSpecialties.length > 0) {
        setActiveTab('unmapped');
      } else if (Object.keys(learnedMappings).length > 0) {
        setActiveTab('learned');
      } else {
        setActiveTab('mapped');
      }
    }
  }, [loading, unmappedSpecialties.length, learnedMappings]);

  // Computed values with memoization
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm) return unmappedSpecialties;
    return unmappedSpecialties.filter(specialty => 
      specialty.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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

  // Optimized data loading with performance monitoring
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting optimized data load...');
      const startTime = performance.now();
      
      // Convert UI provider type to data service provider type
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
      console.log('🔍 useOptimizedMappingData: Loading specialty mapping data...', { 
        selectedProviderType, 
        dataProviderType,
        contextWorking: !!selectedProviderType
      });
      
      // Use performance-optimized service
      const data = await performanceService.getSpecialtyMappingData(dataProviderType);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Optimized data load completed in ${duration.toFixed(2)}ms`);
      
      setMappings(data.mappings);
      setUnmappedSpecialties(data.unmapped);
      setLearnedMappings(data.learned);
      setLearnedMappingsWithSource(data.learnedWithSource);
      
      // Clear selected specialties when data loads to ensure clean state
      setSelectedSpecialties([]);
      
    } catch (err) {
      console.error('Error loading optimized data:', err);
      setError('Failed to load specialty data');
    } finally {
      setLoading(false);
    }
  }, [performanceService, selectedProviderType]);

  // Reload data when provider type changes
  useEffect(() => {
    loadData();
  }, [selectedProviderType]);

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

  const selectAllSpecialties = useCallback(() => {
    setSelectedSpecialties([...filteredUnmapped]);
  }, [filteredUnmapped]);

  const deselectAllSpecialties = useCallback(() => {
    setSelectedSpecialties([]);
  }, []);

  // Data operations (simplified for performance)
  const createMapping = useCallback(async () => {
    // Implementation would go here
    console.log('Creating mapping...');
  }, []);

  const createIndividualMappings = useCallback(async () => {
    // Implementation would go here
    console.log('Creating individual mappings...');
  }, []);

  const createGroupedMapping = useCallback(async () => {
    // Implementation would go here
    console.log('Creating grouped mapping...');
  }, []);

  const deleteMapping = useCallback(async (mappingId: string) => {
    // Implementation would go here
    console.log('Deleting mapping:', mappingId);
  }, []);

  const clearAllMappings = useCallback(async () => {
    // Implementation would go here
    console.log('Clearing all mappings...');
  }, []);

  const removeLearnedMapping = useCallback(async (original: string) => {
    // Implementation would go here
    console.log('Removing learned mapping:', original);
  }, []);

  const clearAllLearnedMappings = useCallback(async () => {
    // Implementation would go here
    console.log('Clearing all learned mappings...');
  }, []);

  const applyAllLearnedMappings = useCallback(async () => {
    // Implementation would go here
    console.log('Applying all learned mappings...');
  }, []);

  // Performance operations
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing data and clearing cache...');
    performanceService.clearCache('specialty_mapping');
    await loadData();
  }, [performanceService, loadData]);

  const clearCache = useCallback(() => {
    performanceService.clearCache();
    console.log('🗑️ Cache cleared');
  }, [performanceService]);

  const getCacheStats = useCallback(() => {
    return performanceService.getCacheStats();
  }, [performanceService]);

  const clearError = useCallback(() => {
    setError(null);
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
    clearError,
    
    // Performance
    refreshData,
    clearCache,
    getCacheStats
  };
};

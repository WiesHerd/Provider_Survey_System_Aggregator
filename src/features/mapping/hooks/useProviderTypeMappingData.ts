import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { IProviderTypeMapping, IUnmappedProviderType } from '../types/mapping';
import { getDataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { getPerformanceOptimizedDataService } from '../../../services/PerformanceOptimizedDataService';

const dataService = getDataService();

interface UseProviderTypeMappingDataReturn {
  // State
  // Cross-category mapping state
  showAllCategories: boolean;
  setShowAllCategories: (value: boolean) => void;
  
  mappings: IProviderTypeMapping[];
  unmappedProviderTypes: IUnmappedProviderType[];
  selectedProviderTypes: IUnmappedProviderType[];
  learnedMappings: Record<string, string>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
  
  // Search state
  searchTerm: string;
  mappedSearchTerm: string;
  
  // Computed values
  filteredUnmapped: IUnmappedProviderType[];
  filteredMappings: IProviderTypeMapping[];
  filteredLearned: Record<string, string>;
  
  // Actions
  setActiveTab: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  selectProviderType: (providerType: IUnmappedProviderType) => void;
  clearSelectedProviderTypes: () => void;
  selectAllProviderTypes: () => void;
  deselectAllProviderTypes: () => void;
  
  // Data operations
  loadData: () => Promise<void>;
  createMapping: () => Promise<void>;
  createGroupedMapping: (standardizedName: string, providerTypes: IUnmappedProviderType[]) => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  clearAllMappings: () => Promise<void>;
  removeLearnedMapping: (original: string) => void;
  
  
  // Search and filters
  setSearchTerm: (term: string) => void;
  setMappedSearchTerm: (term: string) => void;
  clearError: () => void;
}

/**
 * Custom hook for managing provider type mapping data and operations
 * Follows the exact same pattern as useMappingData
 */
export const useProviderTypeMappingData = (): UseProviderTypeMappingDataReturn => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // State
  const [mappings, setMappings] = useState<IProviderTypeMapping[]>([]);
  const [unmappedProviderTypes, setUnmappedProviderTypes] = useState<IUnmappedProviderType[]>([]);
  const [selectedProviderTypes, setSelectedProviderTypes] = useState<IUnmappedProviderType[]>([]);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');

  // State for cross-category mapping toggle (Call Pay, Physician, APP)
  // Default to false (filtered by current Data View selection) to match expected UI behavior
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  // Computed values
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm) return unmappedProviderTypes;
    return unmappedProviderTypes.filter(providerType =>
      providerType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      providerType.surveySource.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unmappedProviderTypes, searchTerm]);
  
  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return mappings;
    return mappings.filter(mapping =>
      mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
      mapping.sourceProviderTypes.some(source =>
        source.providerType.toLowerCase().includes(mappedSearchTerm.toLowerCase())
      )
    );
  }, [mappings, mappedSearchTerm]);
  
  const filteredLearned = useMemo(() => {
    if (!mappedSearchTerm) return learnedMappings;
    const filtered: Record<string, string> = {};
    Object.entries(learnedMappings).forEach(([key, value]) => {
      if (
        key.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
        value.toLowerCase().includes(mappedSearchTerm.toLowerCase())
      ) {
        filtered[key] = value;
      }
    });
    return filtered;
  }, [learnedMappings, mappedSearchTerm]);

  // Performance service for caching (5-minute TTL)
  const performanceService = useMemo(() => getPerformanceOptimizedDataService(), []);
  
  // Track last loaded provider type to prevent unnecessary reloads
  const lastLoadedProviderType = useRef<string | undefined>(undefined);
  const lastLoadedShowAll = useRef<boolean>(false);
  const isInitialLoad = useRef(true);

  // Load data with intelligent caching
  const loadData = useCallback(async () => {
    try {
      // Calculate current provider type filter
      const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
        ? undefined 
        : selectedProviderType;
      
      // Skip reload if same parameters and not initial load
      if (!isInitialLoad.current && 
          lastLoadedProviderType.current === dataProviderType && 
          lastLoadedShowAll.current === showAllCategories) {
        console.log('🎯 Skipping reload - data already loaded with same parameters');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      console.log('🚀 Loading provider type mapping data...', {
        dataProviderType,
        showAllCategories
      });
      const startTime = performance.now();
      
      // Use performance service for caching (5-minute TTL)
      const data = await performanceService.getProviderTypeMappingData(dataProviderType);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Provider type mapping data loaded in ${duration.toFixed(2)}ms`);
      
      setMappings(data.mappings);
      setUnmappedProviderTypes(data.unmapped);
      setLearnedMappings(data.learned || {});
      
      // Update tracking refs
      lastLoadedProviderType.current = dataProviderType;
      lastLoadedShowAll.current = showAllCategories;
      isInitialLoad.current = false;
      
    } catch (err) {
      console.error('Error loading provider type mapping data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load provider type mapping data. Please ensure you have uploaded survey data first.');
    } finally {
      setLoading(false);
    }
  }, [selectedProviderType, showAllCategories, performanceService]);

  // Selection management
  const selectProviderType = useCallback((providerType: IUnmappedProviderType) => {
    setSelectedProviderTypes(prev => {
      const isSelected = prev.some(s => s.id === providerType.id);
      if (isSelected) {
        return prev.filter(s => s.id !== providerType.id);
      } else {
        return [...prev, providerType];
      }
    });
  }, []);

  const clearSelectedProviderTypes = useCallback(() => {
    setSelectedProviderTypes([]);
  }, []);

  const selectAllProviderTypes = useCallback(() => {
    setSelectedProviderTypes([...filteredUnmapped]);
  }, [filteredUnmapped]);

  const deselectAllProviderTypes = useCallback(() => {
    setSelectedProviderTypes([]);
  }, []);

  // Mapping operations
  const createMapping = useCallback(async () => {
    if (selectedProviderTypes.length === 0) return;
    
    try {
      const mapping: IProviderTypeMapping = {
        id: `providerType_${Date.now()}`,
        standardizedName: selectedProviderTypes[0].name,
        sourceProviderTypes: selectedProviderTypes.map(p => ({
          providerType: p.name,
          surveySource: p.surveySource,
          frequency: p.frequency
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      await dataService.createProviderTypeMapping(mapping);
      setSelectedProviderTypes([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create provider type mapping');
    }
  }, [selectedProviderTypes, loadData]);

  const createGroupedMapping = useCallback(async (standardizedName: string, providerTypes: IUnmappedProviderType[]) => {
    try {
      const mapping: IProviderTypeMapping = {
        id: `providerType_group_${Date.now()}`,
        standardizedName,
        sourceProviderTypes: providerTypes.map(p => ({
          providerType: p.name,
          surveySource: p.surveySource,
          frequency: p.frequency
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      await dataService.createProviderTypeMapping(mapping);
      
      // Save learned mappings for each provider type
      for (const providerType of providerTypes) {
        try {
          await dataService.saveLearnedMapping(
            'providerType', 
            providerType.name, 
            standardizedName, 
            selectedProviderType, // Pass current provider type filter
            providerType.surveySource // Pass survey source
          );
        } catch (learnedError) {
        }
      }
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grouped provider type mapping');
    }
  }, [loadData, selectedProviderType]);

  const deleteMapping = useCallback(async (mappingId: string) => {
    try {
      await dataService.deleteProviderTypeMapping(mappingId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider type mapping');
    }
  }, [loadData]);

  const clearAllMappings = useCallback(async () => {
    try {
      await dataService.clearAllProviderTypeMappings();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear provider type mappings');
    }
  }, [loadData]);

  const removeLearnedMapping = useCallback(async (original: string) => {
    try {
      await dataService.removeLearnedMapping('providerType', original);
      await loadData(); // Reload to get updated learned mappings
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove learned mapping');
    }
  }, [loadData]);


  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on mount and when provider type or toggle changes
  // Only reload if parameters actually changed (prevent infinite loops)
  useEffect(() => {
    const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
      ? undefined 
      : selectedProviderType;
    
    // Only reload if parameters changed
    if (isInitialLoad.current || 
        lastLoadedProviderType.current !== dataProviderType || 
        lastLoadedShowAll.current !== showAllCategories) {
      console.log('🔍 useProviderTypeMappingData: Reloading data due to state change:', {
        selectedProviderType,
        showAllCategories,
        dataProviderType,
        wasInitialLoad: isInitialLoad.current
      });
      loadData();
    } else {
      console.log('🎯 useProviderTypeMappingData: Skipping reload - no parameter change');
    }
  }, [selectedProviderType, showAllCategories, loadData]);

  return {
    // State
    // Cross-category mapping state
    showAllCategories,
    setShowAllCategories,
    
    mappings,
    unmappedProviderTypes,
    selectedProviderTypes,
    learnedMappings,
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
    selectProviderType,
    clearSelectedProviderTypes,
    selectAllProviderTypes,
    deselectAllProviderTypes,
    
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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { IProviderTypeMapping, IUnmappedProviderType } from '../types/mapping';
import { getDataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';

const dataService = getDataService();

interface UseProviderTypeMappingDataReturn {
  // State
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

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load actual data from services with provider type filtering
      const [mappingsData, unmappedData] = await Promise.all([
        dataService.getProviderTypeMappings(selectedProviderType),
        dataService.getUnmappedProviderTypes(selectedProviderType)
      ]);
      
      setMappings(mappingsData);
      setUnmappedProviderTypes(unmappedData);
      setLearnedMappings({}); // TODO: Implement learned mappings if needed
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider type mapping data. Please ensure you have uploaded survey data first.');
      console.error('Error loading provider type mapping data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProviderType]);

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
          await dataService.saveLearnedMapping('providerType', providerType.name, standardizedName);
        } catch (learnedError) {
          console.warn('Failed to save learned mapping for', providerType.name, learnedError);
        }
      }
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grouped provider type mapping');
    }
  }, [loadData]);

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

  const removeLearnedMapping = useCallback((original: string) => {
    setLearnedMappings(prev => {
      const updated = { ...prev };
      delete updated[original];
      return updated;
    });
  }, []);


  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on mount and when provider type changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // State
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

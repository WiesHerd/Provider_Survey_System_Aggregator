import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  IRegionMapping, 
  IUnmappedRegion
} from '../types/mapping';
import { DataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';

/**
 * Custom hook for managing region mapping data
 */
export const useRegionMappingData = () => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // State
  const [mappings, setMappings] = useState<IRegionMapping[]>([]);
  const [unmappedRegions, setUnmappedRegions] = useState<IUnmappedRegion[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<IUnmappedRegion[]>([]);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');

  // State for cross-category mapping toggle (Call Pay, Physician, APP)
  const [showAllCategories, setShowAllCategories] = useState(true); // Default to showing all

  // Data service
  const dataService = useMemo(() => new DataService(), []);

  // Computed values
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm) return unmappedRegions;
    return unmappedRegions.filter(region =>
      region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.surveySource.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unmappedRegions, searchTerm]);

  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return mappings;
    return mappings.filter(mapping =>
      mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
      mapping.sourceRegions.some(source =>
        source.region.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
        source.surveySource.toLowerCase().includes(mappedSearchTerm.toLowerCase())
      )
    );
  }, [mappings, mappedSearchTerm]);

  const filteredLearned = useMemo(() => {
    if (!searchTerm) return learnedMappings;
    const filtered: Record<string, string> = {};
    Object.entries(learnedMappings).forEach(([original, standardized]) => {
      if (original.toLowerCase().includes(searchTerm.toLowerCase()) ||
          standardized.toLowerCase().includes(searchTerm.toLowerCase())) {
        filtered[original] = standardized;
      }
    });
    return filtered;
  }, [learnedMappings, searchTerm]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Toggle logic: Match specialty mapping behavior
      // - When showAllCategories is true: Show ALL surveys regardless of Data View (override filter)
      // - When showAllCategories is false: Respect Data View selection (filter by selectedProviderType)
      const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
        ? undefined // undefined = show all (override Data View filter)
        : selectedProviderType; // Respect Data View selection - PHYSICIAN excludes Call Pay, APP excludes Call Pay
      
      // Load region mappings and data with provider type filtering
      const [regionMappings, unmapped, learnedData] = await Promise.all([
        dataService.getRegionMappings(dataProviderType),
        dataService.getUnmappedRegions(dataProviderType),
        dataService.getLearnedMappings('region', dataProviderType)
      ]);
      
      setMappings(regionMappings || []);
      setUnmappedRegions(unmapped);
      setLearnedMappings(learnedData);
      
    } catch (err) {
      setError('Failed to load region mapping data');
    } finally {
      setLoading(false);
    }
  }, [dataService, selectedProviderType, showAllCategories]);



  // Create region mapping
  const createMapping = useCallback(async (mapping: Partial<IRegionMapping>) => {
    try {
      const newMapping: IRegionMapping = {
        id: `region_${Date.now()}`,
        standardizedName: mapping.standardizedName!,
        sourceRegions: mapping.sourceRegions!,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dataService.createRegionMapping(newMapping);
      setMappings(prev => [...prev, newMapping]);
      
      // Remove mapped regions from unmapped list
      setUnmappedRegions(prev => 
        prev.filter(region => 
          !mapping.sourceRegions!.some(source => 
            source.surveySource === region.surveySource && 
            source.region === region.name
          )
        )
      );
      
    } catch (err) {
      console.error('Failed to create region mapping:', err);
      setError('Failed to create region mapping');
    }
  }, [dataService]);

  // Create grouped region mapping
  const createGroupedMapping = useCallback(async (standardizedName: string, regions: IUnmappedRegion[]) => {
    try {
      const mapping: IRegionMapping = {
        id: `group_${Date.now()}`,
        standardizedName,
        sourceRegions: regions.map(region => ({
          region: region.name,
          surveySource: region.surveySource,
          frequency: region.frequency
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dataService.createRegionMapping(mapping);
      setMappings(prev => [...prev, mapping]);
      
      // Create learned mappings for all regions in the group
      const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
        ? undefined 
        : selectedProviderType;
      for (const region of regions) {
        await dataService.saveLearnedMapping('region', region.name, standardizedName, dataProviderType, region.surveySource);
      }
      
      // Update learned mappings state to show the new ones
      const learnedData = await dataService.getLearnedMappings('region', dataProviderType);
      setLearnedMappings(learnedData);
      
      // Remove mapped regions from unmapped list
      setUnmappedRegions(prev => 
        prev.filter(region => 
          !regions.some(r => r.id === region.id)
        )
      );
      
    } catch (err) {
      console.error('Failed to create grouped region mapping:', err);
      setError('Failed to create grouped region mapping');
    }
  }, [dataService, selectedProviderType, showAllCategories]);

  // Delete region mapping
  const deleteMapping = useCallback(async (mappingId: string) => {
    try {
      await dataService.deleteRegionMapping(mappingId);
      setMappings(prev => prev.filter(mapping => mapping.id !== mappingId));
      
      // Reload unmapped regions to include any that were in this mapping - WITH provider type filtering
      const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
        ? undefined 
        : selectedProviderType;
      const unmapped = await dataService.getUnmappedRegions(dataProviderType);
      setUnmappedRegions(unmapped);
      
    } catch (err) {
      console.error('Failed to delete region mapping:', err);
      setError('Failed to delete region mapping');
    }
  }, [dataService, selectedProviderType, showAllCategories]);

  // Clear all region mappings
  const clearAllMappings = useCallback(async () => {
    try {
      await dataService.clearAllRegionMappings();
      setMappings([]);
      
      // Reload unmapped regions - WITH provider type filtering
      const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
        ? undefined 
        : selectedProviderType;
      const unmapped = await dataService.getUnmappedRegions(dataProviderType);
      setUnmappedRegions(unmapped);
      
    } catch (err) {
      console.error('Failed to clear region mappings:', err);
      setError('Failed to clear region mappings');
    }
  }, [dataService, selectedProviderType, showAllCategories]);

  // Region selection
  const selectRegion = useCallback((region: IUnmappedRegion) => {
    setSelectedRegions(prev => {
      const isSelected = prev.some(r => r.id === region.id);
      if (isSelected) {
        return prev.filter(r => r.id !== region.id);
      } else {
        return [...prev, region];
      }
    });
  }, []);

  const clearSelectedRegions = useCallback(() => {
    setSelectedRegions([]);
  }, []);

  const selectAllRegions = useCallback(() => {
    setSelectedRegions([...filteredUnmapped]);
  }, [filteredUnmapped]);

  const deselectAllRegions = useCallback(() => {
    setSelectedRegions([]);
  }, []);

  // Remove learned mapping
  const removeLearnedMapping = useCallback((original: string) => {
    setLearnedMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[original];
      return newMappings;
    });
  }, []);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on mount and when provider type or toggle changes
  // CRITICAL FIX: Watch for changes in showAllCategories directly, not just loadData
  useEffect(() => {
    console.log('🔍 useRegionMappingData: Reloading data due to state change:', {
      selectedProviderType: selectedProviderType || 'BOTH',
      showAllCategories
    });
    loadData();
  }, [selectedProviderType, showAllCategories, loadData]); // loadData is a useCallback that depends on selectedProviderType and showAllCategories

  return {
    // State
    // Cross-category mapping state
    showAllCategories,
    setShowAllCategories,
    
    mappings,
    unmappedRegions,
    selectedRegions,
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
    selectRegion,
    clearSelectedRegions,
    selectAllRegions,
    deselectAllRegions,
    
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


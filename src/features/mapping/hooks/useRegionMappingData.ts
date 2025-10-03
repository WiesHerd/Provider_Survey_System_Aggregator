import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  IRegionMapping, 
  IUnmappedRegion, 
  RegionMappingState 
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
      // Convert UI provider type to data service provider type
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
      console.log('🔍 useRegionMappingData: Loading data with provider type:', { 
        selectedProviderType, 
        dataProviderType 
      });
      
      // Load region mappings (persisted) with provider type filtering
      const regionMappings = await dataService.getRegionMappings(dataProviderType);
      setMappings(regionMappings || []);

      // Load unmapped regions with provider type filtering
      const unmapped = await dataService.getUnmappedRegions(dataProviderType);
      setUnmappedRegions(unmapped);
      
    } catch (err) {
      console.error('Failed to load region mapping data:', err);
      setError('Failed to load region mapping data');
    } finally {
      setLoading(false);
    }
  }, [dataService, selectedProviderType]);

  // Detect unmapped regions from survey data
  const detectUnmappedRegions = useCallback(async (): Promise<IUnmappedRegion[]> => {
    try {
      console.log('🔍 Starting detectUnmappedRegions...');
      const surveys = await dataService.getAllSurveys();
      console.log('📊 Found surveys:', surveys.length, surveys);
      
      const unmappedRegions: IUnmappedRegion[] = [];
      const regionMap = new Map<string, IUnmappedRegion>();

      for (const survey of surveys) {
        console.log('🔍 Processing survey:', survey);
        const surveyDataResult = await dataService.getSurveyData(survey.id);
        console.log('📊 Survey data result:', surveyDataResult);
        
        if (!surveyDataResult || !surveyDataResult.rows || !Array.isArray(surveyDataResult.rows)) {
          console.log('⚠️ No survey data found for survey:', survey.id);
          continue;
        }

        const surveyData = surveyDataResult.rows;
        console.log('📊 Survey data rows:', surveyData.length, 'rows');

        // Look for geographic region data
        const regionCounts = new Map<string, number>();
        
        surveyData.forEach(row => {
          const region = row.geographicRegion || row.geographic_region || row.region;
          if (region) {
            const regionName = String(region).trim();
            if (regionName) {
              regionCounts.set(regionName, (regionCounts.get(regionName) || 0) + 1);
            }
          }
        });

        console.log('📊 Region counts:', Array.from(regionCounts.entries()));

        // Create unmapped regions for each unique region
        regionCounts.forEach((frequency, regionName) => {
          const surveySource = (survey as any).type || (survey as any).surveySource || 'unknown';
          const key = `${surveySource}-${regionName}`;
          if (!regionMap.has(key)) {
            const unmappedRegion: IUnmappedRegion = {
              id: key,
              name: regionName,
              surveySource: surveySource,
              frequency
            };
            regionMap.set(key, unmappedRegion);
            console.log('✅ Created unmapped region:', unmappedRegion);
          }
        });
      }

      const result = Array.from(regionMap.values());
      console.log('🎯 Final unmapped regions:', result);
      return result;
    } catch (error) {
      console.error('❌ Error detecting unmapped regions:', error);
      return [];
    }
  }, [dataService]);


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
  }, [dataService]);

  // Delete region mapping
  const deleteMapping = useCallback(async (mappingId: string) => {
    try {
      await dataService.deleteRegionMapping(mappingId);
      setMappings(prev => prev.filter(mapping => mapping.id !== mappingId));
      
      // Reload unmapped regions to include any that were in this mapping - WITH provider type filtering
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      const unmapped = await dataService.getUnmappedRegions(dataProviderType);
      setUnmappedRegions(unmapped);
      
    } catch (err) {
      console.error('Failed to delete region mapping:', err);
      setError('Failed to delete region mapping');
    }
  }, [dataService, selectedProviderType]);

  // Clear all region mappings
  const clearAllMappings = useCallback(async () => {
    try {
      await dataService.clearAllRegionMappings();
      setMappings([]);
      
      // Reload unmapped regions - WITH provider type filtering
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      const unmapped = await dataService.getUnmappedRegions(dataProviderType);
      setUnmappedRegions(unmapped);
      
    } catch (err) {
      console.error('Failed to clear region mappings:', err);
      setError('Failed to clear region mappings');
    }
  }, [dataService, selectedProviderType]);

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

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // State
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


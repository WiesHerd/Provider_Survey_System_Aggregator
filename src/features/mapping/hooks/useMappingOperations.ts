import { useCallback } from 'react';
import { useMemo } from 'react';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/mapping';
import { getDataService } from '../../../services/DataService';
import { useMappingCache } from './useMappingCache';
import { useProviderContext } from '../../../contexts/ProviderContext';

/**
 * Hook for managing CRUD operations
 * Single responsibility: Data operations only
 */
export const useMappingOperations = (
  mappings: ISpecialtyMapping[],
  unmappedSpecialties: IUnmappedSpecialty[],
  selectedSpecialties: IUnmappedSpecialty[],
  learnedMappings: Record<string, string>,
  updateMappings: (mappings: ISpecialtyMapping[]) => void,
  updateUnmappedSpecialties: (unmapped: IUnmappedSpecialty[]) => void,
  updateSelectedSpecialties: (selected: IUnmappedSpecialty[]) => void,
  updateLearnedMappings: (learned: Record<string, string>) => void,
  setLoadingState: (loading: boolean) => void,
  setErrorState: (error: string | null) => void
) => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // Service instance
  const dataService = useMemo(() => getDataService(), []);
  
  // Intelligent caching
  const cache = useMappingCache();

  // Load all data with intelligent caching
  const loadData = useCallback(async () => {
    try {
      setLoadingState(true);
      setErrorState(null);
      
      console.log('🚀 Starting data load...');
      
      // Add aggressive timeout and individual service testing
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Data loading timeout after 5 seconds')), 5000)
      );
      
      console.log('🔄 Testing individual data services...');
      
      // Test each service individually with timeout
      const testService = async (serviceName: string, serviceCall: () => Promise<any>) => {
        console.log(`Testing ${serviceName}...`);
        const result = await Promise.race([serviceCall(), timeoutPromise]);
        console.log(`✅ ${serviceName} loaded:`, Array.isArray(result) ? result.length : Object.keys(result || {}).length);
        return result;
      };
      
      // Convert UI provider type to data service provider type
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
      console.log('🔍 useMappingOperations: Loading data with provider type:', { 
        selectedProviderType, 
        dataProviderType 
      });
      
      const [mappingsData, unmappedData, learnedData] = await Promise.all([
        testService('mappings', () => dataService.getAllSpecialtyMappings(dataProviderType)),
        testService('unmapped', () => dataService.getUnmappedSpecialties(dataProviderType)),
        testService('learned', () => dataService.getLearnedMappings('specialty'))
      ]);
      
      console.log('✅ All data loaded successfully:', { 
        mappings: mappingsData.length, 
        unmapped: unmappedData.length, 
        learned: Object.keys(learnedData || {}).length
      });
      
      updateMappings(mappingsData);
      updateUnmappedSpecialties(unmappedData);
      updateLearnedMappings(learnedData || {});
      
    } catch (err) {
      console.error('❌ Error loading data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorState(`Failed to load mapping data: ${errorMessage}`);
      
      // Emergency fallback: set empty data to stop loading
      console.log('🆘 Emergency fallback: setting empty data');
      updateMappings([]);
      updateUnmappedSpecialties([]);
      updateLearnedMappings({});
    } finally {
      console.log('🏁 Setting loading to false');
      setLoadingState(false);
    }
  }, [updateMappings, updateUnmappedSpecialties, updateLearnedMappings, setLoadingState, setErrorState, dataService, selectedProviderType]);

  // Create single mapping
  const createMapping = useCallback(async () => {
    if (selectedSpecialties.length === 0) return;
    
    try {
      setErrorState(null);
      
      const specialty = selectedSpecialties[0];
      const standardizedName = specialty.name;
      
      const newMapping: ISpecialtyMapping = {
        id: crypto.randomUUID(),
        standardizedName,
        sourceSpecialties: [{
          id: crypto.randomUUID(),
          specialty: specialty.name,
          originalName: specialty.name,
          surveySource: specialty.surveySource,
          mappingId: ''
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dataService.createSpecialtyMapping(newMapping);
      
      // Save as learned mapping
      await dataService.saveLearnedMapping('specialty', specialty.name, standardizedName, selectedProviderType);
      
      // Invalidate relevant cache entries
      cache.invalidateCache('mappings');
      cache.invalidateCache('unmappedSpecialties');
      cache.invalidateCache('learnedMappings');
      
      // Refresh data
      await loadData();
      updateSelectedSpecialties([]);
    } catch (err) {
      setErrorState('Failed to create mapping');
      console.error('Error creating mapping:', err);
    }
  }, [selectedSpecialties, dataService, cache, loadData, updateSelectedSpecialties, setErrorState]);

  // Create grouped mapping
  const createGroupedMapping = useCallback(async () => {
    if (selectedSpecialties.length === 0) return;
    
    try {
      setErrorState(null);
      
      const standardizedName = selectedSpecialties[0].name; // Use first specialty as base name
      
      const newMapping: ISpecialtyMapping = {
        id: crypto.randomUUID(),
        standardizedName,
        sourceSpecialties: selectedSpecialties.map(specialty => ({
          id: crypto.randomUUID(),
          specialty: specialty.name,
          originalName: specialty.name,
          surveySource: specialty.surveySource,
          mappingId: ''
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dataService.createSpecialtyMapping(newMapping);
      
      // Save each specialty as learned mapping
      for (const specialty of selectedSpecialties) {
        await dataService.saveLearnedMapping('specialty', specialty.name, standardizedName, selectedProviderType);
      }
      
      // Invalidate relevant cache entries
      cache.invalidateCache('mappings');
      cache.invalidateCache('unmappedSpecialties');
      cache.invalidateCache('learnedMappings');
      
      // Refresh data
      await loadData();
      updateSelectedSpecialties([]);
    } catch (err) {
      setErrorState('Failed to create grouped mapping');
      console.error('Error creating grouped mapping:', err);
    }
  }, [selectedSpecialties, dataService, cache, loadData, updateSelectedSpecialties, setErrorState]);

  // Delete mapping
  const deleteMapping = useCallback(async (mappingId: string) => {
    try {
      setErrorState(null);
      await dataService.deleteSpecialtyMapping(mappingId);
      
      // Invalidate relevant cache entries
      cache.invalidateCache('mappings');
      cache.invalidateCache('unmappedSpecialties');
      
      await loadData();
    } catch (err) {
      setErrorState('Failed to delete mapping');
      console.error('Error deleting mapping:', err);
    }
  }, [dataService, cache, loadData, setErrorState]);

  // Clear all mappings
  const clearAllMappings = useCallback(async () => {
    try {
      setErrorState(null);
      await dataService.clearAllSpecialtyMappings();
      
      // Invalidate all cache entries
      cache.invalidateAllCache();
      
      await loadData();
    } catch (err) {
      setErrorState('Failed to clear all mappings');
      console.error('Error clearing mappings:', err);
    }
  }, [dataService, cache, loadData, setErrorState]);

  // Remove learned mapping
  const removeLearnedMapping = useCallback(async (original: string) => {
    try {
      setErrorState(null);
      await dataService.removeLearnedMapping('specialty', original);
      
      // Invalidate learned mappings cache
      cache.invalidateCache('learnedMappings');
      
      // Refresh learned mappings (provider-type specific)
      const learnedData = await dataService.getLearnedMappings('specialty', selectedProviderType);
      updateLearnedMappings(learnedData || {});
    } catch (err) {
      setErrorState('Failed to remove learned mapping');
      console.error('Error removing learned mapping:', err);
    }
  }, [dataService, cache, updateLearnedMappings, setErrorState]);

  // Apply all learned mappings to create actual mappings (provider-type specific)
  const applyAllLearnedMappings = useCallback(async () => {
    try {
      setLoadingState(true);
      setErrorState(null);
      
      console.log('🚀 Applying learned mappings for provider type:', selectedProviderType);
      
      const learnedEntries = Object.entries(learnedMappings);
      console.log(`Found ${learnedEntries.length} learned mappings to apply for ${selectedProviderType}`);
      
      let appliedCount = 0;
      
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
          appliedCount++;
          
          console.log(`✅ Applied learned mapping for ${selectedProviderType}: ${originalSpecialty} -> ${standardizedSpecialty}`);
          
        } catch (mappingError) {
          console.error(`❌ Failed to apply learned mapping ${originalSpecialty}:`, mappingError);
        }
      }
      
      // DO NOT clear learned mappings - they should remain for future use
      // await dataService.clearLearnedMappings('specialty'); // REMOVED THIS LINE
      
      // Refresh all data
      await loadData();
      
      console.log(`🎉 Successfully applied ${appliedCount} learned mappings for ${selectedProviderType}! Learned mappings remain available for future use.`);
      
    } catch (error) {
      console.error('Error applying learned mappings:', error);
      setErrorState(error instanceof Error ? error.message : 'Failed to apply learned mappings');
    } finally {
      setLoadingState(false);
    }
  }, [learnedMappings, dataService, loadData, setLoadingState, setErrorState, selectedProviderType]);

  return {
    loadData,
    createMapping,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
    applyAllLearnedMappings
  };
};

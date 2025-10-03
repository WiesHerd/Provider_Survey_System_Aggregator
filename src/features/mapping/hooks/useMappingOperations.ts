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
  updateLearnedMappingsWithSource: (learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>) => void,
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
      
      const [mappingsData, unmappedData, learnedData, learnedDataWithSource] = await Promise.all([
        testService('mappings', () => dataService.getAllSpecialtyMappings(dataProviderType)),
        testService('unmapped', () => dataService.getUnmappedSpecialties(dataProviderType)),
        testService('learned', () => dataService.getLearnedMappings('specialty')),
        testService('learnedWithSource', () => dataService.getLearnedMappingsWithSource('specialty'))
      ]);
      
      console.log('✅ All data loaded successfully:', { 
        mappings: mappingsData.length, 
        unmapped: unmappedData.length, 
        learned: Object.keys(learnedData || {}).length,
        learnedWithSource: learnedDataWithSource?.length || 0
      });
      
      updateMappings(mappingsData);
      updateUnmappedSpecialties(unmappedData);
      updateLearnedMappings(learnedData || {});
      updateLearnedMappingsWithSource(learnedDataWithSource || []);
      
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
      
      // Save as learned mapping with survey source
      await dataService.saveLearnedMapping('specialty', specialty.name, standardizedName, selectedProviderType, specialty.surveySource);
      
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
      
      // Save each specialty as learned mapping with survey source
      for (const specialty of selectedSpecialties) {
        await dataService.saveLearnedMapping('specialty', specialty.name, standardizedName, selectedProviderType, specialty.surveySource);
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
  const removeLearnedMapping = useCallback(async (standardizedName: string) => {
    try {
      console.log('🗑️ removeLearnedMapping EXECUTING for standardized name:', standardizedName);
      setErrorState(null);
      
      // Get all learned mappings to find all source specialties for this standardized name
      const currentLearnedMappings = await dataService.getLearnedMappings('specialty', selectedProviderType);
      const currentLearnedMappingsWithSource = await dataService.getLearnedMappingsWithSource('specialty', selectedProviderType);
      
      // Find all original names that map to this standardized name
      const originalNamesToDelete = Object.entries(currentLearnedMappings)
        .filter(([original, corrected]) => corrected === standardizedName)
        .map(([original]) => original);
      
      console.log('🗑️ Found original names to delete:', originalNamesToDelete);
      
      // Delete all learned mappings for this standardized name
      for (const originalName of originalNamesToDelete) {
        await dataService.removeLearnedMapping('specialty', originalName);
        console.log('🗑️ Deleted learned mapping:', originalName);
      }
      
      // Invalidate learned mappings cache
      cache.invalidateCache('learnedMappings');
      
      // Refresh both basic and source learned mappings
      const [learnedData, learnedDataWithSource] = await Promise.all([
        dataService.getLearnedMappings('specialty', selectedProviderType),
        dataService.getLearnedMappingsWithSource('specialty', selectedProviderType)
      ]);
      
      updateLearnedMappings(learnedData || {});
      updateLearnedMappingsWithSource(learnedDataWithSource || []);
      
      console.log('✅ DELETE COMPLETED - All learned mappings removed for:', standardizedName);
    } catch (err) {
      setErrorState('Failed to remove learned mapping');
      console.error('❌ Error removing learned mapping:', err);
    }
  }, [dataService, cache, selectedProviderType, updateLearnedMappings, updateLearnedMappingsWithSource, setErrorState]);

  // Clear all learned mappings
  const clearAllLearnedMappings = useCallback(async () => {
    try {
      setLoadingState(true);
      setErrorState(null);
      
      console.log('🗑️ Clearing all learned mappings for provider type:', selectedProviderType);
      
      // Clear all learned mappings
      await dataService.clearLearnedMappings('specialty');
      
      // Invalidate learned mappings cache
      cache.invalidateCache('learnedMappings');
      
      // Clear learned mappings from state
      updateLearnedMappings({});
      
      console.log('✅ Successfully cleared all learned mappings');
      
    } catch (err) {
      setErrorState('Failed to clear all learned mappings');
      console.error('Error clearing learned mappings:', err);
    } finally {
      setLoadingState(false);
    }
  }, [dataService, cache, updateLearnedMappings, setErrorState, setLoadingState]);

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

  // Create individual mappings - each selected specialty gets its own mapping
  const createIndividualMappings = useCallback(async () => {
    if (selectedSpecialties.length === 0) return;

    try {
      setLoadingState(true);
      setErrorState(null);
      
      console.log('🚀 Creating individual mappings for', selectedSpecialties.length, 'specialties');
      
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
        
        // Create learned mapping for future automap runs with survey source
        await dataService.saveLearnedMapping('specialty', specialty.name, specialty.name, selectedProviderType, specialty.surveySource);
        
        newMappings.push(mapping);
      }
      
      // Update state
      updateMappings([...mappings, ...newMappings]);
      updateUnmappedSpecialties(unmappedSpecialties.filter(s => !selectedSpecialties.some(selected => selected.id === s.id)));
      updateSelectedSpecialties([]);
      
      // Refresh learned mappings to show the new ones (provider-type specific)
      const learnedData = await dataService.getLearnedMappings('specialty', selectedProviderType);
      updateLearnedMappings(learnedData);
      
      console.log(`🎉 Successfully created ${newMappings.length} individual mappings!`);
      
    } catch (error) {
      console.error('Error creating individual mappings:', error);
      setErrorState(error instanceof Error ? error.message : 'Failed to create individual mappings');
    } finally {
      setLoadingState(false);
    }
  }, [selectedSpecialties, dataService, selectedProviderType, updateMappings, updateUnmappedSpecialties, updateSelectedSpecialties, updateLearnedMappings, setLoadingState, setErrorState]);

  return {
    loadData,
    createMapping,
    createIndividualMappings,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
    clearAllLearnedMappings,
    applyAllLearnedMappings
  };
};

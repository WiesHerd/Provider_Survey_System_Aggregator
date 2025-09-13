import { useCallback } from 'react';
import { useMemo } from 'react';
import { ISpecialtyMapping, IUnmappedSpecialty, IAutoMappingConfig, IMappingSuggestion } from '../types/mapping';
import { getDataService } from '../../../services/DataService';
import { 
  generateMappingSuggestions,
  calculateAutoMappingResults,
  validateMappingConfig
} from '../utils/mappingCalculations';

/**
 * Hook for managing auto-mapping functionality
 * Single responsibility: Auto-mapping logic only
 */
export const useAutoMapping = (
  unmappedSpecialties: IUnmappedSpecialty[],
  mappings: ISpecialtyMapping[],
  learnedMappings: Record<string, string>,
  loadData: () => Promise<void>,
  setErrorState: (error: string | null) => void
) => {
  // Service instance
  const dataService = useMemo(() => getDataService(), []);

  // Validate auto-mapping configuration
  const validateConfig = useCallback((config: IAutoMappingConfig) => {
    return validateMappingConfig(config);
  }, []);

  // Execute auto-mapping
  const autoMap = useCallback(async (config: IAutoMappingConfig) => {
    try {
      setErrorState(null);
      
      // Validate config
      const validation = validateConfig(config);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate suggestions using unified types
      const suggestions = await generateMappingSuggestions(
        unmappedSpecialties,
        mappings,
        learnedMappings,
        config
      );

      // Create mappings from ALL suggestions (no confidence threshold)
      for (const suggestion of suggestions) {
        await dataService.createSpecialtyMapping({
          id: crypto.randomUUID(),
          standardizedName: suggestion.standardizedName,
          sourceSpecialties: suggestion.specialties.map((s: any) => ({
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

      // Calculate results
      const results = calculateAutoMappingResults(suggestions, config);

      // Refresh data
      await loadData();
      
      return { 
        suggestions, 
        results: {
          total: results.total,
          mapped: results.mapped,
          skipped: results.skipped
        }
      };
    } catch (err) {
      setErrorState('Failed to process auto-mapping');
      console.error('Auto-mapping error:', err);
      throw err;
    }
  }, [unmappedSpecialties, mappings, learnedMappings, dataService, loadData, validateConfig, setErrorState]);

  return {
    autoMap,
    validateConfig
  };
};



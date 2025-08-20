import { 
  IUnmappedSpecialty, 
  ISpecialtyMapping, 
  IMappingSuggestion, 
  IAutoMappingConfig,
  AutoMappingResults,
  MappingFilters
} from '../types/mapping';
import { normalizeSpecialty, calculateSimilarity } from '../../../shared/utils/specialtyMatching';
import { LLMSpecialtyMatchingService } from '../../../shared/utils/llmSpecialtyMatching';
import { SurveySource } from '../../../shared/types';

/**
 * Survey source color mapping
 */
export const SURVEY_SOURCE_COLORS: Record<string, string> = {
  'SullivanCotter': '#818CF8',
  'MGMA': '#34D399',
  'Gallagher': '#F472B6',
  'ECG': '#FBBF24',
  'AMGA': '#60A5FA',
  'Learned': '#9CA3AF'
};

/**
 * Filter unmapped specialties based on search criteria
 */
export const filterUnmappedSpecialties = (
  specialties: IUnmappedSpecialty[],
  filters: MappingFilters
): IUnmappedSpecialty[] => {
  return specialties.filter(specialty => {
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch = 
        specialty.name.toLowerCase().includes(searchLower) ||
        specialty.surveySource.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Survey source filter
    if (filters.surveySource && specialty.surveySource !== filters.surveySource) {
      return false;
    }

    // Frequency filter
    if (filters.frequency && specialty.frequency < filters.frequency) {
      return false;
    }

    return true;
  });
};

/**
 * Group specialties by survey source
 * Each specialty will appear once per survey source it belongs to
 */
export const groupSpecialtiesBySurvey = (
  specialties: IUnmappedSpecialty[]
): Map<string, IUnmappedSpecialty[]> => {
  const grouped = new Map<string, IUnmappedSpecialty[]>();
  
  specialties.forEach(specialty => {
    // Each specialty.surveySource is now a single survey name (not comma-separated)
    const surveySource = specialty.surveySource;
    const current = grouped.get(surveySource) || [];
    grouped.set(surveySource, [...current, specialty]);
  });
  
  return grouped;
};

/**
 * Filter mapped specialties based on search criteria
 */
export const filterMappedSpecialties = (
  mappings: ISpecialtyMapping[],
  searchTerm: string
): ISpecialtyMapping[] => {
  if (!searchTerm) return mappings;
  
  const searchLower = searchTerm.toLowerCase();
  return mappings.filter(mapping => 
    mapping.standardizedName.toLowerCase().includes(searchLower) ||
    mapping.sourceSpecialties.some(specialty => 
      specialty.specialty.toLowerCase().includes(searchLower)
    )
  );
};

/**
 * Filter learned mappings based on search criteria
 */
export const filterLearnedMappings = (
  learnedMappings: Record<string, string>,
  searchTerm: string
): Record<string, string> => {
  if (!searchTerm) return learnedMappings;
  
  const searchLower = searchTerm.toLowerCase();
  const filtered: Record<string, string> = {};
  
  Object.entries(learnedMappings).forEach(([original, corrected]) => {
    if (
      original.toLowerCase().includes(searchLower) ||
      corrected.toLowerCase().includes(searchLower)
    ) {
      filtered[original] = corrected;
    }
  });
  
  return filtered;
};

/**
 * Generate mapping suggestions using local AI-powered matching
 */
export const generateMappingSuggestions = async (
  unmappedSpecialties: any[], // Accept any type to handle conversion
  existingMappings: ISpecialtyMapping[],
  learnedMappings: Record<string, string>,
  config: IAutoMappingConfig
): Promise<IMappingSuggestion[]> => {
  const suggestions: IMappingSuggestion[] = [];
  const processedSpecialties = new Set<string>();

  // Convert unmapped specialties to the correct type
  const convertedUnmappedSpecialties: IUnmappedSpecialty[] = unmappedSpecialties.map(specialty => ({
    id: specialty.id,
    name: specialty.name,
    surveySource: specialty.surveySource as SurveySource,
    frequency: specialty.frequency
  }));

  // Initialize local AI matching service
  const llmService = new LLMSpecialtyMatchingService({
    similarityThreshold: config.confidenceThreshold,
    maxRetries: 3
  });

  try {
    // Extract specialty names for LLM processing
    const specialtyNames = convertedUnmappedSpecialties.map(s => s.name);
    const existingMappingNames = existingMappings.map(m => m.standardizedName);

    // Use local AI to group similar specialties
    const { groups } = await llmService.matchAndGroupSpecialties(
      specialtyNames,
      existingMappingNames
    );

    console.log('🔍 Local AI identified groups:', groups);

    // Process each group
    groups.forEach(group => {
      if (group.specialties.length === 0) return;

      // Find the corresponding unmapped specialties for this group
      const groupSpecialties = convertedUnmappedSpecialties.filter(s => 
        group.specialties.includes(s.name)
      );

      // Check if any specialties in this group are already processed
      const unprocessedSpecialties = groupSpecialties.filter(s => 
        !processedSpecialties.has(s.id)
      );

      if (unprocessedSpecialties.length === 0) return;

      // Determine the best standardized name for this group
      let standardizedName = group.groupName;
      let confidence = group.confidence;

      // Check if we should use existing mappings
      if (config.useExistingMappings) {
        const existingMatch = existingMappings.find(mapping => {
          const mappingNormalized = normalizeSpecialty(mapping.standardizedName);
          const groupNormalized = normalizeSpecialty(group.groupName);
          return calculateSimilarity(mappingNormalized, groupNormalized) > 0.8;
        });

        if (existingMatch) {
          standardizedName = existingMatch.standardizedName;
          confidence = Math.max(confidence, 0.9);
        }
      }

      // Check learned mappings
      const groupNormalized = normalizeSpecialty(group.groupName);
      if (learnedMappings[groupNormalized]) {
        standardizedName = learnedMappings[groupNormalized];
        confidence = Math.max(confidence, 0.85);
      }

      // Apply fuzzy matching if enabled and no good match found
      if (config.useFuzzyMatching && confidence < config.confidenceThreshold) {
        const similarMappings = existingMappings.filter(mapping => {
          const similarity = calculateSimilarity(
            normalizeSpecialty(mapping.standardizedName),
            groupNormalized
          );
          return similarity > 0.7;
        });

        if (similarMappings.length > 0) {
          const bestMatch = similarMappings.reduce((best, current) => {
            const bestSimilarity = calculateSimilarity(
              normalizeSpecialty(best.standardizedName),
              groupNormalized
            );
            const currentSimilarity = calculateSimilarity(
              normalizeSpecialty(current.standardizedName),
              groupNormalized
            );
            return currentSimilarity > bestSimilarity ? current : best;
          });

          standardizedName = bestMatch.standardizedName;
          confidence = Math.max(confidence, 0.75);
        }
      }

      // Only add suggestion if confidence meets threshold
      if (confidence >= config.confidenceThreshold) {
        suggestions.push({
          standardizedName,
          confidence,
          specialties: unprocessedSpecialties.map(s => ({
            name: s.name,
            surveySource: s.surveySource
          }))
        });

        // Mark specialties as processed
        unprocessedSpecialties.forEach(s => processedSpecialties.add(s.id));
      }
    });

    // Handle remaining unprocessed specialties individually
    const remainingSpecialties = convertedUnmappedSpecialties.filter(s => 
      !processedSpecialties.has(s.id)
    );

    if (remainingSpecialties.length > 0) {
      console.log('🔍 Processing remaining specialties individually:', remainingSpecialties.length);
      
      const remainingNames = remainingSpecialties.map(s => s.name);
      const { matches } = await llmService.matchAndGroupSpecialties(
        remainingNames,
        existingMappingNames
      );

      matches.forEach((match, index) => {
        const specialty = remainingSpecialties[index];
        let standardizedName = match.standardizedName;
        let confidence = match.confidence;

        // Apply the same logic as above for individual specialties
        if (config.useExistingMappings) {
          const existingMatch = existingMappings.find(mapping => {
            const mappingNormalized = normalizeSpecialty(mapping.standardizedName);
            const specialtyNormalized = normalizeSpecialty(specialty.name);
            return calculateSimilarity(mappingNormalized, specialtyNormalized) > 0.8;
          });

          if (existingMatch) {
            standardizedName = existingMatch.standardizedName;
            confidence = Math.max(confidence, 0.9);
          }
        }

        // Check learned mappings
        const specialtyNormalized = normalizeSpecialty(specialty.name);
        if (learnedMappings[specialtyNormalized]) {
          standardizedName = learnedMappings[specialtyNormalized];
          confidence = Math.max(confidence, 0.85);
        }

        if (confidence >= config.confidenceThreshold) {
          suggestions.push({
            standardizedName,
            confidence,
            specialties: [{
              name: specialty.name,
              surveySource: specialty.surveySource
            }]
          });
        }
      });
    }

    console.log('✅ LLM-based suggestions generated:', suggestions.length);
    return suggestions;

  } catch (error) {
    console.error('❌ Local AI matching failed, falling back to original method:', error);
    return generateMappingSuggestionsFallback(
      convertedUnmappedSpecialties,
      existingMappings,
      learnedMappings,
      config
    );
  }
};

/**
 * Fallback method using original logic
 */
export const generateMappingSuggestionsFallback = (
  unmappedSpecialties: IUnmappedSpecialty[],
  existingMappings: ISpecialtyMapping[],
  learnedMappings: Record<string, string>,
  config: IAutoMappingConfig
): IMappingSuggestion[] => {
  const suggestions: IMappingSuggestion[] = [];
  const processedSpecialties = new Set<string>();

  // Group specialties by normalized name
  const specialtyGroups = new Map<string, IUnmappedSpecialty[]>();
  
  unmappedSpecialties.forEach(specialty => {
    const normalizedName = normalizeSpecialty(specialty.name);
    const current = specialtyGroups.get(normalizedName) || [];
    specialtyGroups.set(normalizedName, [...current, specialty]);
  });

  // Generate suggestions for each group
  specialtyGroups.forEach((specialties, normalizedName) => {
    if (specialties.length === 0) return;

    // Check if we should use existing mappings
    let standardizedName = normalizedName;
    let confidence = 0.8;

    if (config.useExistingMappings) {
      // Look for existing mappings with similar names
      const existingMatch = existingMappings.find(mapping => {
        const mappingNormalized = normalizeSpecialty(mapping.standardizedName);
        return calculateSimilarity(mappingNormalized, normalizedName) > 0.8;
      });

      if (existingMatch) {
        standardizedName = existingMatch.standardizedName;
        confidence = 0.9;
      }
    }

    // Check learned mappings
    if (learnedMappings[normalizedName]) {
      standardizedName = learnedMappings[normalizedName];
      confidence = Math.max(confidence, 0.85);
    }

    // Apply fuzzy matching if enabled
    if (config.useFuzzyMatching) {
      // Find similar existing mappings
      const similarMappings = existingMappings.filter(mapping => {
        const similarity = calculateSimilarity(
          normalizeSpecialty(mapping.standardizedName),
          normalizedName
        );
        return similarity > 0.7;
      });

      if (similarMappings.length > 0) {
        const bestMatch = similarMappings.reduce((best, current) => {
          const bestSimilarity = calculateSimilarity(
            normalizeSpecialty(best.standardizedName),
            normalizedName
          );
          const currentSimilarity = calculateSimilarity(
            normalizeSpecialty(current.standardizedName),
            normalizedName
          );
          return currentSimilarity > bestSimilarity ? current : best;
        });

        standardizedName = bestMatch.standardizedName;
        confidence = Math.max(confidence, 0.75);
      }
    }

    // Only add suggestion if confidence meets threshold
    if (confidence >= config.confidenceThreshold) {
      suggestions.push({
        standardizedName,
        confidence,
        specialties: specialties.map(s => ({
          name: s.name,
          surveySource: s.surveySource
        }))
      });

      // Mark specialties as processed
      specialties.forEach(s => processedSpecialties.add(s.id));
    }
  });

  return suggestions;
};

/**
 * Calculate auto-mapping results
 */
export const calculateAutoMappingResults = (
  suggestions: IMappingSuggestion[],
  config: IAutoMappingConfig
): AutoMappingResults => {
  const total = suggestions.length;
  const mapped = suggestions.filter(s => s.confidence >= config.confidenceThreshold).length;
  const skipped = total - mapped;

  return {
    total,
    mapped,
    skipped,
    suggestions
  };
};

/**
 * Validate mapping configuration
 */
export const validateMappingConfig = (
  config: IAutoMappingConfig
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    errors.push('Confidence threshold must be between 0 and 1');
  }

  if (typeof config.useExistingMappings !== 'boolean') {
    errors.push('Use existing mappings must be a boolean value');
  }

  if (typeof config.useFuzzyMatching !== 'boolean') {
    errors.push('Use fuzzy matching must be a boolean value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format date for display
 */
export const formatMappingDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Get survey source color
 */
export const getSurveySourceColor = (source: string): string => {
  return SURVEY_SOURCE_COLORS[source] || '#9CA3AF';
};

/**
 * Calculate mapping statistics
 */
export const calculateMappingStats = (
  mappings: ISpecialtyMapping[],
  unmappedSpecialties: IUnmappedSpecialty[]
): {
  totalMappings: number;
  totalUnmapped: number;
  totalSourceSpecialties: number;
  averageSpecialtiesPerMapping: number;
  mostCommonSurveySource: string;
} => {
  const totalMappings = mappings.length;
  const totalUnmapped = unmappedSpecialties.length;
  const totalSourceSpecialties = mappings.reduce(
    (sum, mapping) => sum + mapping.sourceSpecialties.length,
    0
  );
  const averageSpecialtiesPerMapping = totalMappings > 0 
    ? totalSourceSpecialties / totalMappings 
    : 0;

  // Find most common survey source
  const sourceCounts = new Map<string, number>();
  unmappedSpecialties.forEach(specialty => {
    const count = sourceCounts.get(specialty.surveySource) || 0;
    sourceCounts.set(specialty.surveySource, count + 1);
  });

  let mostCommonSurveySource = '';
  let maxCount = 0;
  sourceCounts.forEach((count, source) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonSurveySource = source;
    }
  });

  return {
    totalMappings,
    totalUnmapped,
    totalSourceSpecialties,
    averageSpecialtiesPerMapping,
    mostCommonSurveySource
  };
};

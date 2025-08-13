import { 
  ISpecialtyMapping, 
  IUnmappedSpecialty, 
  IAutoMappingConfig, 
  IMappingSuggestion,
  MappingFilters,
  AutoMappingResults 
} from '../types/mapping';
import { calculateSimilarity, normalizeSpecialty } from '../../../shared/utils/specialtyMatching';

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
 */
export const groupSpecialtiesBySurvey = (
  specialties: IUnmappedSpecialty[]
): Map<string, IUnmappedSpecialty[]> => {
  const grouped = new Map<string, IUnmappedSpecialty[]>();
  
  specialties.forEach(specialty => {
    const current = grouped.get(specialty.surveySource) || [];
    grouped.set(specialty.surveySource, [...current, specialty]);
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
 * Generate mapping suggestions based on configuration
 */
export const generateMappingSuggestions = (
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

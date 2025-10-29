import { 
  IUnmappedSpecialty, 
  ISpecialtyMapping, 
  MappingFilters
} from '../types/mapping';
import { flexibleWordMatch } from '../../../shared/utils/specialtyMatching';

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
 * Filter unmapped specialties based on search criteria with flexible word matching
 */
export const filterUnmappedSpecialties = (
  specialties: IUnmappedSpecialty[],
  filters: MappingFilters
): IUnmappedSpecialty[] => {
  return specialties.filter(specialty => {
    // Search term filter with flexible word order matching
    if (filters.searchTerm) {
      const matchesSearch = 
        flexibleWordMatch(specialty.name, filters.searchTerm) ||
        flexibleWordMatch(specialty.surveySource, filters.searchTerm);
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
 * Filter mapped specialties based on search criteria with flexible word matching
 */
export const filterMappedSpecialties = (
  mappings: ISpecialtyMapping[],
  searchTerm: string
): ISpecialtyMapping[] => {
  if (!searchTerm) return mappings;
  
  return mappings.filter(mapping => 
    flexibleWordMatch(mapping.standardizedName, searchTerm) ||
    mapping.sourceSpecialties.some(specialty => 
      flexibleWordMatch(specialty.specialty, searchTerm)
    )
  );
};

/**
 * Filter learned mappings based on search criteria with flexible word matching
 */
export const filterLearnedMappings = (
  learnedMappings: Record<string, string>,
  searchTerm: string
): Record<string, string> => {
  if (!searchTerm) return learnedMappings;
  
  const filtered: Record<string, string> = {};
  
  Object.entries(learnedMappings).forEach(([original, corrected]) => {
    if (
      flexibleWordMatch(original, searchTerm) ||
      flexibleWordMatch(corrected, searchTerm)
    ) {
      filtered[original] = corrected;
    }
  });
  
  return filtered;
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
  // Handle variations in survey source names
  const normalizedSource = source.toLowerCase();
  
  if (normalizedSource.includes('sullivancotter')) {
    return SURVEY_SOURCE_COLORS['SullivanCotter'];
  }
  if (normalizedSource.includes('gallagher')) {
    return SURVEY_SOURCE_COLORS['Gallagher'];
  }
  if (normalizedSource.includes('mgma')) {
    return SURVEY_SOURCE_COLORS['MGMA'];
  }
  if (normalizedSource.includes('ecg')) {
    return SURVEY_SOURCE_COLORS['ECG'];
  }
  if (normalizedSource.includes('amga')) {
    return SURVEY_SOURCE_COLORS['AMGA'];
  }
  if (normalizedSource.includes('learned')) {
    return SURVEY_SOURCE_COLORS['Learned'];
  }
  
  // Fallback to exact match
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

/**
 * Mapping Application Utility
 * 
 * Automatically applies learned mappings after upload and calculates coverage statistics
 */

import { getDataService } from '../../../services/DataService';
import { ISpecialtyMapping } from '../../../types/specialty';

export interface MappingCoverage {
  specialties: {
    mapped: number;
    unmapped: number;
    coverage: number; // 0-1
  };
  providerTypes: {
    mapped: number;
    unmapped: number;
    coverage: number;
  };
  regions: {
    mapped: number;
    unmapped: number;
    coverage: number;
  };
  variables: {
    mapped: number;
    unmapped: number;
    coverage: number;
  };
}

export interface MappingApplicationResult {
  coverage: MappingCoverage;
  appliedCounts: {
    specialties: number;
    providerTypes: number;
    regions: number;
    variables: number;
  };
  errors: string[];
}

/**
 * Apply learned mappings to a survey and calculate coverage
 */
export const applyLearnedMappingsToSurvey = async (
  surveyId: string,
  providerType?: string,
  surveySource?: string
): Promise<MappingApplicationResult> => {
  const dataService = getDataService();
  const result: MappingApplicationResult = {
    coverage: {
      specialties: { mapped: 0, unmapped: 0, coverage: 0 },
      providerTypes: { mapped: 0, unmapped: 0, coverage: 0 },
      regions: { mapped: 0, unmapped: 0, coverage: 0 },
      variables: { mapped: 0, unmapped: 0, coverage: 0 }
    },
    appliedCounts: {
      specialties: 0,
      providerTypes: 0,
      regions: 0,
      variables: 0
    },
    errors: []
  };

  try {
    // Get survey data (returns { rows: ISurveyRow[] })
    const surveyDataResult = await dataService.getSurveyData(surveyId, {}, { limit: 1000 }); // Sample first 1000 rows for coverage calculation
    const surveyData = surveyDataResult?.rows || [];
    if (surveyData.length === 0) {
      return result;
    }

    // Get all learned mappings
    const [
      learnedSpecialtyMappings,
      learnedProviderTypeMappings,
      learnedRegionMappings,
      learnedVariableMappings
    ] = await Promise.all([
      dataService.getLearnedMappings('specialty', providerType),
      dataService.getLearnedMappings('providerType', providerType),
      dataService.getLearnedMappings('region', providerType),
      dataService.getLearnedMappings('variable', providerType)
    ]);

    // Apply specialty mappings
    const specialtyStats = await applySpecialtyMappings(
      surveyData,
      learnedSpecialtyMappings,
      providerType,
      surveySource
    );
    result.coverage.specialties = specialtyStats.coverage;
    result.appliedCounts.specialties = specialtyStats.applied;

    // Apply provider type mappings
    const providerTypeStats = await applyProviderTypeMappings(
      surveyData,
      learnedProviderTypeMappings,
      providerType
    );
    result.coverage.providerTypes = providerTypeStats.coverage;
    result.appliedCounts.providerTypes = providerTypeStats.applied;

    // Apply region mappings
    const regionStats = await applyRegionMappings(
      surveyData,
      learnedRegionMappings,
      providerType
    );
    result.coverage.regions = regionStats.coverage;
    result.appliedCounts.regions = regionStats.applied;

    // Apply variable mappings
    const variableStats = await applyVariableMappings(
      surveyData,
      learnedVariableMappings,
      providerType
    );
    result.coverage.variables = variableStats.coverage;
    result.appliedCounts.variables = variableStats.applied;

    console.log('✅ Learned mappings applied:', result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Failed to apply learned mappings: ${errorMessage}`);
    console.error('❌ Error applying learned mappings:', error);
  }

  return result;
};

/**
 * Calculate specialty mapping coverage (don't create mappings - just calculate coverage)
 * Learned mappings are already applied during normalization, so we just need to see what's covered
 */
async function applySpecialtyMappings(
  surveyData: any[],
  learnedMappings: Record<string, string>,
  providerType?: string,
  surveySource?: string
): Promise<{ coverage: MappingCoverage['specialties']; applied: number }> {
  const specialtySet = new Set<string>();
  const mappedSpecialties = new Set<string>();

  // Collect all unique specialties from survey data
  surveyData.forEach((row: any) => {
    // Handle both direct row data and row.data structure
    const rowData = row.data || row;
    const specialty = rowData.specialty || rowData.Specialty || rowData.specialty_name || row.specialty;
    if (specialty) {
      specialtySet.add(String(specialty).trim());
    }
  });

  // Check which specialties have learned mappings
  for (const surveySpecialty of specialtySet) {
    const surveyLower = surveySpecialty.toLowerCase().trim();
    
    // Check if there's a learned mapping for this specialty
    for (const [originalSpecialty, standardizedSpecialty] of Object.entries(learnedMappings)) {
      const originalLower = originalSpecialty.toLowerCase().trim();
      
      // Exact match or contains match
      if (surveyLower === originalLower || 
          surveyLower.includes(originalLower) || 
          originalLower.includes(surveyLower)) {
        mappedSpecialties.add(surveySpecialty);
        break; // Found a match, no need to check other mappings
      }
    }
    
    // Also check if there's an existing mapping (not just learned mapping)
    try {
      const dataService = getDataService();
      const existingMappings = await dataService.getAllSpecialtyMappings(providerType);
      const hasExistingMapping = existingMappings.some(m => 
        m.sourceSpecialties.some(s => 
          s.specialty.toLowerCase() === surveySpecialty.toLowerCase()
        )
      );
      
      if (hasExistingMapping) {
        mappedSpecialties.add(surveySpecialty);
      }
    } catch (error) {
      // Ignore errors checking existing mappings
    }
  }

  const total = specialtySet.size;
  const mapped = mappedSpecialties.size;
  const unmapped = total - mapped;

  return {
    coverage: {
      mapped,
      unmapped,
      coverage: total > 0 ? mapped / total : 0
    },
    applied: 0 // Don't create mappings here - learned mappings are applied during normalization
  };
}

/**
 * Apply provider type learned mappings
 */
async function applyProviderTypeMappings(
  surveyData: any[],
  learnedMappings: Record<string, string>,
  providerType?: string
): Promise<{ coverage: MappingCoverage['providerTypes']; applied: number }> {
  const providerTypeSet = new Set<string>();
  const mappedProviderTypes = new Set<string>();
  let appliedCount = 0;

  // Collect all unique provider types from survey data
  surveyData.forEach((row: any) => {
    const rowData = row.data || row;
    const pt = rowData.provider_type || rowData.providerType || rowData['Provider Type'] || row.providerType;
    if (pt) {
      providerTypeSet.add(String(pt).trim());
    }
  });

  // Apply learned mappings (similar logic to specialties)
  for (const [original, standardized] of Object.entries(learnedMappings)) {
    const originalLower = original.toLowerCase().trim();
    
    for (const surveyPT of providerTypeSet) {
      const surveyLower = surveyPT.toLowerCase().trim();
      
      if (surveyLower === originalLower || 
          surveyLower.includes(originalLower) || 
          originalLower.includes(surveyLower)) {
        mappedProviderTypes.add(surveyPT);
        // Provider type mappings are typically simpler, so we just track coverage
      }
    }
  }

  const total = providerTypeSet.size;
  const mapped = mappedProviderTypes.size;
  const unmapped = total - mapped;

  return {
    coverage: {
      mapped,
      unmapped,
      coverage: total > 0 ? mapped / total : 0
    },
    applied: appliedCount
  };
}

/**
 * Apply region learned mappings
 */
async function applyRegionMappings(
  surveyData: any[],
  learnedMappings: Record<string, string>,
  providerType?: string
): Promise<{ coverage: MappingCoverage['regions']; applied: number }> {
  const regionSet = new Set<string>();
  const mappedRegions = new Set<string>();

  // Collect all unique regions from survey data
  surveyData.forEach((row: any) => {
    const rowData = row.data || row;
    const region = rowData.region || rowData.Region || rowData.geographic_region || rowData.geographicRegion || row.region;
    if (region) {
      regionSet.add(String(region).trim());
    }
  });

  // Apply learned mappings
  for (const [original, standardized] of Object.entries(learnedMappings)) {
    const originalLower = original.toLowerCase().trim();
    
    for (const surveyRegion of regionSet) {
      const surveyLower = surveyRegion.toLowerCase().trim();
      
      if (surveyLower === originalLower || 
          surveyLower.includes(originalLower) || 
          originalLower.includes(surveyLower)) {
        mappedRegions.add(surveyRegion);
      }
    }
  }

  const total = regionSet.size;
  const mapped = mappedRegions.size;
  const unmapped = total - mapped;

  return {
    coverage: {
      mapped,
      unmapped,
      coverage: total > 0 ? mapped / total : 0
    },
    applied: 0 // Region mappings are typically applied during normalization
  };
}

/**
 * Apply variable learned mappings
 */
async function applyVariableMappings(
  surveyData: any[],
  learnedMappings: Record<string, string>,
  providerType?: string
): Promise<{ coverage: MappingCoverage['variables']; applied: number }> {
  // Variables are typically detected from column headers, not row data
  // This is a placeholder - variable mapping is usually handled during column mapping
  return {
    coverage: {
      mapped: 0,
      unmapped: 0,
      coverage: 0
    },
    applied: 0
  };
}

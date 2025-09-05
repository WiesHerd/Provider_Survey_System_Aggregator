/**
 * Data transformation utilities for analytics
 * Extracted from SurveyAnalytics.tsx for better organization
 */

import { AggregatedData, VariableMapping } from '../types/analytics';
import { ISurveyRow } from '../../../types/survey';
import { ISpecialtyMapping } from '../../../types/specialty';

/**
 * Transform survey data for analytics display
 * 
 * @param rawData - Raw survey data
 * @param columnMappings - Column mapping configurations
 * @param specialtyMappings - Specialty mapping configurations
 * @param surveySource - Source survey identifier
 * @param variableMappings - Variable mapping configurations
 * @param regionMappings - Region mapping configurations
 * @returns Transformed aggregated data
 */
export const transformSurveyData = (
  rawData: ISurveyRow[], 
  columnMappings: any[], 
  specialtyMappings: ISpecialtyMapping[], 
  surveySource: string, 
  variableMappings: VariableMapping[] = [], 
  regionMappings: any[] = []
): AggregatedData[] => {
  if (rawData.length === 0) return [];

  // PERFORMANCE OPTIMIZATION: Pre-compute lookups once
  const columnMappingLookup = new Map();
  const specialtyMappingLookup = new Map();
  const regionMappingLookup = new Map();
  
  // Build column mapping lookup for this survey source
  columnMappings.forEach(mapping => {
    mapping.sourceColumns.forEach((column: any) => {
      if (column.surveySource === surveySource) {
        columnMappingLookup.set(column.name, mapping.standardizedName);
      }
    });
  });

  // Build specialty mapping lookup for this survey source
  specialtyMappings.forEach(mapping => {
    mapping.sourceSpecialties.forEach((specialty: any) => {
      if (specialty.surveySource === surveySource) {
        specialtyMappingLookup.set(specialty.specialty.toLowerCase(), mapping.standardizedName);
      }
    });
  });

  // Build region mapping lookup for this survey source
  regionMappings.forEach(mapping => {
    mapping.sourceRegions.forEach((region: any) => {
      if (region.surveySource === surveySource) {
        regionMappingLookup.set(region.region.toLowerCase(), mapping.standardizedName);
      }
    });
  });

  // PERFORMANCE OPTIMIZATION: Use map instead of forEach for better performance
  return rawData.map(row => {
    const transformedRow: AggregatedData = {
      standardizedName: (row as any)._surveyName || surveySource,
      surveySource: (row as any)._surveyName || surveySource,
      surveySpecialty: String(row.specialty || row.normalizedSpecialty || ''),
      geographicRegion: (row as any).geographicRegion || (row as any).geographic_region || '',
      n_orgs: 0,
      n_incumbents: 0,
      tcc_p25: 0,
      tcc_p50: 0,
      tcc_p75: 0,
      tcc_p90: 0,
      wrvu_p25: 0,
      wrvu_p50: 0,
      wrvu_p75: 0,
      wrvu_p90: 0,
      cf_p25: 0,
      cf_p50: 0,
      cf_p75: 0,
      cf_p90: 0,
    };

    // Apply specialty mapping
    const originalSpecialty = String(row.specialty || '').toLowerCase();
    let standardizedSpecialty = specialtyMappingLookup.get(originalSpecialty);
    
    // Only do fuzzy matching if no direct match found
    if (!standardizedSpecialty) {
      // Fuzzy matching logic would go here
      standardizedSpecialty = originalSpecialty;
    }
    
    transformedRow.surveySpecialty = standardizedSpecialty;

    // Apply region mapping
    const originalRegion = String((row as any).geographicRegion || (row as any).geographic_region || '').toLowerCase();
    let standardizedRegion = regionMappingLookup.get(originalRegion);
    
    if (!standardizedRegion) {
      standardizedRegion = originalRegion;
    }
    
    transformedRow.geographicRegion = standardizedRegion;

    // Map compensation data
    transformedRow.n_orgs = Number(row.n_orgs) || 0;
    transformedRow.n_incumbents = Number(row.n_incumbents) || 0;
    
    // TCC data
    transformedRow.tcc_p25 = Number(row.tcc_p25) || 0;
    transformedRow.tcc_p50 = Number(row.tcc_p50) || 0;
    transformedRow.tcc_p75 = Number(row.tcc_p75) || 0;
    transformedRow.tcc_p90 = Number(row.tcc_p90) || 0;
    
    // wRVU data
    transformedRow.wrvu_p25 = Number(row.wrvu_p25) || 0;
    transformedRow.wrvu_p50 = Number(row.wrvu_p50) || 0;
    transformedRow.wrvu_p75 = Number(row.wrvu_p75) || 0;
    transformedRow.wrvu_p90 = Number(row.wrvu_p90) || 0;
    
    // CF data
    transformedRow.cf_p25 = Number(row.cf_p25) || 0;
    transformedRow.cf_p50 = Number(row.cf_p50) || 0;
    transformedRow.cf_p75 = Number(row.cf_p75) || 0;
    transformedRow.cf_p90 = Number(row.cf_p90) || 0;

    return transformedRow;
  });
};

/**
 * Get variable mappings from the data service
 * 
 * @returns Promise resolving to variable mappings array
 */
export const getVariableMappings = async (): Promise<VariableMapping[]> => {
  // This would typically call a service to get variable mappings
  // For now, return empty array - will be implemented when we extract the service
  return [];
};

/**
 * Extract unique values from analytics data for filter options
 * 
 * @param data - Array of aggregated data
 * @returns Object containing arrays of unique values
 */
export const extractUniqueValues = (data: AggregatedData[]) => {
  const specialties = [...new Set(data.map(row => row.surveySpecialty))].filter(Boolean).sort();
  const regions = [...new Set(data.map(row => row.geographicRegion))].filter(Boolean).sort();
  const surveySources = [...new Set(data.map(row => row.surveySource))].filter(Boolean).sort();
  
  return {
    specialties,
    regions,
    surveySources,
    providerTypes: ['Staff Physician', 'Advanced Practice Provider'], // Static for now
    variables: ['TCC', 'wRVU', 'CF'] // Static for now
  };
};

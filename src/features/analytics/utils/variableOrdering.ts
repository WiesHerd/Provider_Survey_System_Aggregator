/**
 * Variable Ordering Utility
 * 
 * Preserves original file column order when displaying variables in analytics.
 * This ensures physician surveys display columns in the same sequence as the upload file,
 * matching the APP upload process behavior.
 */

import { getDataService } from '../../../services/DataService';
import { normalizeVariableName, mapVariableNameToStandard } from './variableFormatters';

/**
 * Sort variables based on original file column order
 * 
 * @param selectedVariables - Array of normalized variable names to sort
 * @param providerType - Provider type filter (PHYSICIAN, APP, etc.)
 * @returns Sorted array of variables in original file order
 */
export async function sortVariablesByOriginalOrder(
  selectedVariables: string[],
  providerType?: string
): Promise<string[]> {
  try {
    const dataService = getDataService();
    const surveys = await dataService.getAllSurveys();
    
    // Filter surveys by provider type if specified
    let relevantSurveys = surveys;
    if (providerType && providerType !== 'BOTH') {
      relevantSurveys = surveys.filter(survey => {
        const surveyProviderType = (survey as any).providerType;
        if (providerType === 'PHYSICIAN') {
          const normalized = (surveyProviderType || '').toUpperCase().trim();
          return normalized === 'PHYSICIAN' || normalized === 'STAFF PHYSICIAN' || normalized === 'STAFFPHYSICIAN';
        }
        return surveyProviderType === providerType;
      });
    }
    
    if (relevantSurveys.length === 0) {
      console.log('⚠️ No surveys found for variable ordering, returning original order');
      return selectedVariables;
    }
    
    // Build a map of original column order from all relevant surveys
    // Use the first survey with originalHeaders as the primary reference
    let primaryOriginalHeaders: string[] = [];
    const allOriginalHeaders: string[] = [];
    
    for (const survey of relevantSurveys) {
      const metadata = (survey as any).metadata;
      if (metadata?.originalHeaders && Array.isArray(metadata.originalHeaders)) {
        const headers = metadata.originalHeaders.filter((h: string) => h && h.trim());
        if (headers.length > 0) {
          if (primaryOriginalHeaders.length === 0) {
            primaryOriginalHeaders = headers;
          }
          // Collect all unique headers from all surveys
          headers.forEach((h: string) => {
            if (!allOriginalHeaders.includes(h)) {
              allOriginalHeaders.push(h);
            }
          });
        }
      }
    }
    
    // If no originalHeaders found, return original order
    if (primaryOriginalHeaders.length === 0) {
      console.log('⚠️ No originalHeaders found in survey metadata, returning original order');
      return selectedVariables;
    }
    
    console.log('✅ Found originalHeaders for variable ordering:', {
      primarySurveyHeaders: primaryOriginalHeaders.length,
      allUniqueHeaders: allOriginalHeaders.length,
      selectedVariables: selectedVariables.length
    });
    
    // Create a mapping from normalized variable names to original column names
    // This uses column mappings and variable name normalization
    const variableToOriginalColumn = new Map<string, string>();
    
    // For each selected variable, try to find its original column name
    for (const normalizedVar of selectedVariables) {
      // Try to find the original column name by:
      // 1. Checking if the normalized name matches an original header (case-insensitive)
      // 2. Using reverse normalization to find potential matches
      
      // First, try direct match (case-insensitive)
      const directMatch = primaryOriginalHeaders.find(h => 
        normalizeVariableName(h.toLowerCase()) === normalizedVar ||
        mapVariableNameToStandard(normalizeVariableName(h.toLowerCase())) === normalizedVar
      );
      
      if (directMatch) {
        variableToOriginalColumn.set(normalizedVar, directMatch);
        continue;
      }
      
      // Try partial match - check if normalized variable name appears in original header
      const partialMatch = primaryOriginalHeaders.find(h => {
        const normalizedHeader = normalizeVariableName(h.toLowerCase());
        const mappedHeader = mapVariableNameToStandard(normalizedHeader);
        return normalizedHeader.includes(normalizedVar) || 
               normalizedVar.includes(normalizedHeader) ||
               mappedHeader === normalizedVar;
      });
      
      if (partialMatch) {
        variableToOriginalColumn.set(normalizedVar, partialMatch);
        continue;
      }
      
      // If no match found, use the normalized variable name itself
      // This handles cases where the variable was created through aggregation
      variableToOriginalColumn.set(normalizedVar, normalizedVar);
    }
    
    // Sort selectedVariables based on originalHeaders order
    const sortedVariables = [...selectedVariables].sort((a, b) => {
      const columnA = variableToOriginalColumn.get(a) || a;
      const columnB = variableToOriginalColumn.get(b) || b;
      
      // Find positions in originalHeaders
      const indexA = primaryOriginalHeaders.findIndex(h => 
        h.toLowerCase() === columnA.toLowerCase() ||
        normalizeVariableName(h.toLowerCase()) === a ||
        mapVariableNameToStandard(normalizeVariableName(h.toLowerCase())) === a
      );
      const indexB = primaryOriginalHeaders.findIndex(h => 
        h.toLowerCase() === columnB.toLowerCase() ||
        normalizeVariableName(h.toLowerCase()) === b ||
        mapVariableNameToStandard(normalizeVariableName(h.toLowerCase())) === b
      );
      
      // If both found, sort by position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one found, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither found, maintain original order
      return selectedVariables.indexOf(a) - selectedVariables.indexOf(b);
    });
    
    console.log('✅ Sorted variables by original file order:', {
      originalOrder: selectedVariables,
      sortedOrder: sortedVariables,
      changed: JSON.stringify(selectedVariables) !== JSON.stringify(sortedVariables)
    });
    
    return sortedVariables;
    
  } catch (error) {
    console.error('❌ Error sorting variables by original order:', error);
    // Return original order on error
    return selectedVariables;
  }
}

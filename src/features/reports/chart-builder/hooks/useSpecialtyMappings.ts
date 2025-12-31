/**
 * Hook for loading and managing specialty mappings
 * 
 * Extracted from CustomReports for reusability and maintainability
 */

import { useState, useEffect, useMemo } from 'react';
import { getDataService } from '../../../../services/DataService';

/**
 * Returns a Map of standardized specialty names to Sets of related specialty names
 * Used for filtering and matching specialties across surveys
 */
export const useSpecialtyMappings = (): Map<string, Set<string>> => {
  const [specialtyMappings, setSpecialtyMappings] = useState<Map<string, Set<string>>>(new Map());
  const dataService = useMemo(() => getDataService(), []);

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappings = await dataService.getAllSpecialtyMappings();
        const mappingMap = new Map<string, Set<string>>();
        
        mappings.forEach(mapping => {
          const standardizedName = mapping.standardizedName.toLowerCase();
          if (!mappingMap.has(standardizedName)) {
            mappingMap.set(standardizedName, new Set());
          }
          mappingMap.get(standardizedName)!.add(standardizedName);
          mapping.sourceSpecialties?.forEach(source => {
            mappingMap.get(standardizedName)!.add(source.specialty.toLowerCase());
          });
        });
        
        setSpecialtyMappings(mappingMap);
      } catch (error) {
        console.error('Error loading specialty mappings:', error);
      }
    };
    
    loadMappings();
  }, [dataService]);

  return specialtyMappings;
};








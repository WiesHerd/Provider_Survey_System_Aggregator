/**
 * Specialty Blending Hook
 * 
 * This hook manages the state and actions for specialty blending,
 * including drag & drop, weight management, and template operations.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { SpecialtyItem, SpecialtyBlend, SpecialtyBlendTemplate, BlendedResult, BlendingState, BlendingActions } from '../types/blending';
import { validateBlend, normalizeWeights, calculateBlendedMetrics, calculateConfidence, generateBlendId } from '../utils/blendingCalculations';

interface UseSpecialtyBlendingProps {
  initialSpecialties?: SpecialtyItem[];
  maxSpecialties?: number;
  allowTemplates?: boolean;
}

export const useSpecialtyBlending = ({
  initialSpecialties = [],
  maxSpecialties = 10,
  allowTemplates = true
}: UseSpecialtyBlendingProps = {}): BlendingState & BlendingActions => {
  
  // State
  const [selectedSpecialties, setSelectedSpecialties] = useState<SpecialtyItem[]>(initialSpecialties);
  const [availableSpecialties, setAvailableSpecialties] = useState<SpecialtyItem[]>([]);
  const [currentBlend, setCurrentBlend] = useState<SpecialtyBlend | null>(null);
  const [templates, setTemplates] = useState<SpecialtyBlendTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Populate available specialties from real survey data
  useEffect(() => {
    const fetchRealSurveyData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Import the data service to get real survey data
        const { getDataService } = await import('../../../services/DataService');
        const dataService = getDataService();
        
        // Get all survey data
        const allSurveyData = await dataService.getAllSurveyData();
        
        if (allSurveyData && allSurveyData.length > 0) {
          // Process real survey data into specialty items
          const specialtyMap = new Map<string, SpecialtyItem>();
          
          allSurveyData.forEach((survey: any) => {
            if (survey.surveySpecialty && survey.surveySource && survey.surveyYear) {
              const key = `${survey.surveySpecialty}-${survey.surveySource}-${survey.surveyYear}-${survey.geographicRegion || 'National'}-${survey.providerType || 'Physician'}`;
              
              if (!specialtyMap.has(key)) {
                specialtyMap.set(key, {
                  id: key,
                  name: survey.surveySpecialty,
                  records: survey.tcc_n_orgs || 0,
                  weight: 0,
                  surveySource: survey.surveySource,
                  surveyYear: survey.surveyYear,
                  geographicRegion: survey.geographicRegion || 'National',
                  providerType: survey.providerType || 'Physician'
                });
              } else {
                // Update record count
                const existing = specialtyMap.get(key)!;
                existing.records += (survey.tcc_n_orgs || 0);
              }
            }
          });
          
          setAvailableSpecialties(Array.from(specialtyMap.values()));
        } else {
          // Fallback to empty array if no data
          setAvailableSpecialties([]);
        }
      } catch (err) {
        console.error('Failed to fetch survey data:', err);
        setError('Failed to load survey data. Please try again.');
        setAvailableSpecialties([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRealSurveyData();
  }, []);

  // Validation
  const validation = useMemo(() => {
    return validateBlend(selectedSpecialties);
  }, [selectedSpecialties]);
  
  // Actions
  const addSpecialty = useCallback((specialty: SpecialtyItem) => {
    if (selectedSpecialties.length >= maxSpecialties) {
      setError(`Maximum ${maxSpecialties} specialties allowed`);
      return;
    }
    
    if (selectedSpecialties.some(s => s.id === specialty.id)) {
      setError('Specialty already added to blend');
      return;
    }
    
    setSelectedSpecialties(prev => [...prev, { ...specialty, weight: 0 }]);
    setError(null);
  }, [selectedSpecialties, maxSpecialties]);
  
  const removeSpecialty = useCallback((specialtyId: string) => {
    setSelectedSpecialties(prev => prev.filter(s => s.id !== specialtyId));
    setError(null);
  }, []);
  
  const updateWeight = useCallback((specialtyId: string, weight: number) => {
    // Ensure weight is between 0 and 100
    const clampedWeight = Math.max(0, Math.min(100, weight));
    
    setSelectedSpecialties(prev => 
      prev.map(specialty => 
        specialty.id === specialtyId 
          ? { ...specialty, weight: Math.round(clampedWeight * 100) / 100 }
          : specialty
      )
    );
    setError(null);
  }, []);
  
  const reorderSpecialties = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedSpecialties(prev => {
      const newSpecialties = [...prev];
      const [removed] = newSpecialties.splice(fromIndex, 1);
      newSpecialties.splice(toIndex, 0, removed);
      return newSpecialties;
    });
  }, []);
  
  const createBlend = useCallback(async (name: string, description: string): Promise<BlendedResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate blend
      const validationResult = validateBlend(selectedSpecialties);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }
      
      // Normalize weights
      const normalizedSpecialties = normalizeWeights(selectedSpecialties);
      
      // Create blend
      const blend: SpecialtyBlend = {
        id: generateBlendId(),
        name,
        description,
        specialties: normalizedSpecialties,
        totalWeight: 100,
        createdAt: new Date(),
        createdBy: 'current_user' // TODO: Get from auth context
      };
      
      setCurrentBlend(blend);
      
      // Calculate blended metrics (this would integrate with your data service)
      const specialtyData = await fetchSpecialtyData(normalizedSpecialties);
      const blendedData = calculateBlendedMetrics(normalizedSpecialties, specialtyData);
      const confidence = calculateConfidence(normalizedSpecialties, specialtyData);
      const sampleSize = blendedData.n_incumbents;
      
      const result: BlendedResult = {
        id: generateBlendId(),
        blendName: name,
        specialties: normalizedSpecialties,
        blendedData,
        confidence,
        sampleSize,
        createdAt: new Date()
      };
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create blend';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedSpecialties]);
  
  const saveTemplate = useCallback(async (template: Omit<SpecialtyBlendTemplate, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newTemplate: SpecialtyBlendTemplate = {
        ...template,
        id: generateBlendId(),
        createdAt: new Date()
      };
      
      setTemplates(prev => [...prev, newTemplate]);
      
      // TODO: Save to IndexedDB or API
      await saveTemplateToStorage(newTemplate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const loadTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedSpecialties(template.specialties);
      setError(null);
    } else {
      setError('Template not found');
    }
  }, [templates]);
  
  const validateBlendAction = useCallback(() => {
    return validateBlend(selectedSpecialties);
  }, [selectedSpecialties]);
  
  const resetBlend = useCallback(() => {
    setSelectedSpecialties([]);
    setCurrentBlend(null);
    setError(null);
  }, []);
  
  return {
    // State
    selectedSpecialties,
    availableSpecialties,
    allData: [], // This will be populated from the data service
    currentBlend,
    templates,
    isLoading,
    error,
    validation,
    
    // Actions
    addSpecialty,
    removeSpecialty,
    updateWeight,
    reorderSpecialties,
    createBlend,
    saveTemplate,
    loadTemplate,
    validateBlend: validateBlendAction,
    resetBlend
  };
};

// Helper functions (these would integrate with your data service)
const fetchSpecialtyData = async (specialties: SpecialtyItem[]): Promise<any[]> => {
  // TODO: Integrate with your existing data service
  // This would fetch the actual survey data for each specialty
  return specialties.map(() => ({
    tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
    wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
    cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0,
    n_orgs: 0, n_incumbents: 0
  }));
};

const saveTemplateToStorage = async (template: SpecialtyBlendTemplate): Promise<void> => {
  // TODO: Integrate with IndexedDB or API
  console.log('Saving template:', template);
};

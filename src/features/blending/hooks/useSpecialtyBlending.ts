/**
 * Specialty Blending Hook
 * 
 * This hook manages the state and actions for specialty blending,
 * including drag & drop, weight management, and template operations.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { SpecialtyItem, SpecialtyBlend, SpecialtyBlendTemplate, BlendedResult, BlendingState, BlendingActions } from '../types/blending';
import { validateBlend, normalizeWeights, normalizeSpecialtyWeights, calculateBlendedMetrics, calculateConfidence, generateBlendId } from '../utils/blendingCalculations';

const BLENDING_STORAGE_KEY = 'blending_cache_v1';

interface StoredBlendingCache {
  allData: any[];
  availableSpecialties: SpecialtyItem[];
  timestamp: number;
}

// Global cache that persists across component mounts and reloads (sessionStorage)
class GlobalBlendingCache {
  private static instance: GlobalBlendingCache;
  private allDataCache: any[] | null = null;
  private availableSpecialtiesCache: SpecialtyItem[] | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  static getInstance(): GlobalBlendingCache {
    if (!GlobalBlendingCache.instance) {
      GlobalBlendingCache.instance = new GlobalBlendingCache();
    }
    return GlobalBlendingCache.instance;
  }

  hasFreshData(): boolean {
    const now = Date.now();
    return this.allDataCache !== null &&
           this.availableSpecialtiesCache !== null &&
           (now - this.lastFetch) < this.CACHE_DURATION;
  }

  private loadFromStorage(): StoredBlendingCache | null {
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(BLENDING_STORAGE_KEY) : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredBlendingCache;
      if (!parsed?.allData || !parsed?.availableSpecialties || typeof parsed.timestamp !== 'number') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private persistToStorage(): void {
    if (this.allDataCache === null || this.availableSpecialtiesCache === null) return;
    try {
      const payload: StoredBlendingCache = {
        allData: this.allDataCache,
        availableSpecialties: this.availableSpecialtiesCache,
        timestamp: this.lastFetch
      };
      sessionStorage.setItem(BLENDING_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn('🔍 GlobalBlendingCache: sessionStorage quota exceeded, skipping persist');
      }
    }
  }

  getCachedData(): { allData: any[]; availableSpecialties: SpecialtyItem[] } | null {
    if (this.hasFreshData()) {
      return {
        allData: this.allDataCache!,
        availableSpecialties: this.availableSpecialtiesCache!
      };
    }
    const stored = this.loadFromStorage();
    if (stored && (Date.now() - stored.timestamp) < this.CACHE_DURATION) {
      this.allDataCache = stored.allData;
      this.availableSpecialtiesCache = stored.availableSpecialties;
      this.lastFetch = stored.timestamp;
      console.log('🔍 GlobalBlendingCache: Restored from sessionStorage');
      return { allData: stored.allData, availableSpecialties: stored.availableSpecialties };
    }
    return null;
  }

  /** Returns cached data even if expired (for stale-while-revalidate). */
  getStaleCachedData(): { allData: any[]; availableSpecialties: SpecialtyItem[] } | null {
    if (this.allDataCache !== null && this.availableSpecialtiesCache !== null) {
      return { allData: this.allDataCache, availableSpecialties: this.availableSpecialtiesCache };
    }
    const stored = this.loadFromStorage();
    if (stored) {
      return { allData: stored.allData, availableSpecialties: stored.availableSpecialties };
    }
    return null;
  }

  setCachedData(allData: any[], availableSpecialties: SpecialtyItem[]): void {
    this.allDataCache = allData;
    this.availableSpecialtiesCache = availableSpecialties;
    this.lastFetch = Date.now();
    this.persistToStorage();
    console.log('🔍 GlobalBlendingCache: Data cached for 30 minutes');
  }

  clearCache(): void {
    this.allDataCache = null;
    this.availableSpecialtiesCache = null;
    this.lastFetch = 0;
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(BLENDING_STORAGE_KEY);
    } catch {}
    console.log('🔍 GlobalBlendingCache: Cache cleared');
  }

  /**
   * Prefetch blending data and fill cache (e.g. from sidebar hover).
   * No-op if cache already has fresh data.
   */
  async prefetch(): Promise<void> {
    if (this.hasFreshData()) {
      return;
    }
    try {
      const { getAnalysisToolsPerformanceService } = await import('../../../services/AnalysisToolsPerformanceService');
      const performanceService = getAnalysisToolsPerformanceService();
      const { allData: allSurveyData } = await performanceService.getCustomBlendingData({});
      if (allSurveyData && allSurveyData.length > 0) {
        const specialtyMap = new Map<string, SpecialtyItem>();
        for (let i = 0; i < allSurveyData.length; i++) {
          const survey = allSurveyData[i];
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
              const existing = specialtyMap.get(key)!;
              existing.records += (survey.tcc_n_orgs || 0);
            }
          }
        }
        const availableSpecialties = Array.from(specialtyMap.values());
        this.setCachedData(allSurveyData, availableSpecialties);
        console.log('🔍 GlobalBlendingCache: Prefetch complete');
      }
    } catch (err) {
      console.warn('Blending prefetch failed:', err);
    }
  }
}

/**
 * Prefetch blending data for sidebar hover / preload. Warms GlobalBlendingCache
 * so the specialty-blending screen can show data immediately on navigation.
 */
export async function prefetchBlendingData(): Promise<void> {
  await GlobalBlendingCache.getInstance().prefetch();
}

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
  const [allData, setAllData] = useState<any[]>([]);
  const [currentBlend, setCurrentBlend] = useState<SpecialtyBlend | null>(null);
  const [templates, setTemplates] = useState<SpecialtyBlendTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Load saved templates from Firebase or IndexedDB
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { getDataService } = await import('../../../services/DataService');
        const dataService = getDataService();
        const savedTemplates = await dataService.getAllBlendTemplates();
        setTemplates(savedTemplates);
        console.log('🔍 useSpecialtyBlending: Loaded', savedTemplates.length, 'templates');
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    
    loadTemplates();
  }, []);

  // Populate available specialties: cache (memory + sessionStorage), stale-while-revalidate, then fetch
  useEffect(() => {
    const globalCache = GlobalBlendingCache.getInstance();

    const processFetchedData = (allSurveyData: any[]) => {
      const specialtyMap = new Map<string, SpecialtyItem>();
      for (let i = 0; i < allSurveyData.length; i++) {
        const survey = allSurveyData[i];
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
            const existing = specialtyMap.get(key)!;
            existing.records += (survey.tcc_n_orgs || 0);
          }
        }
      }
      return Array.from(specialtyMap.values());
    };

    const fetchRealSurveyData = async (isBackgroundRevalidate = false) => {
      try {
        if (!isBackgroundRevalidate) {
          setError(null);
        }
        const { getAnalysisToolsPerformanceService } = await import('../../../services/AnalysisToolsPerformanceService');
        const performanceService = getAnalysisToolsPerformanceService();
        const { allData: allSurveyData } = await performanceService.getCustomBlendingData({});
        if (allSurveyData && allSurveyData.length > 0) {
          const availableSpecialties = processFetchedData(allSurveyData);
          setAllData(allSurveyData);
          setAvailableSpecialties(availableSpecialties);
          globalCache.setCachedData(allSurveyData, availableSpecialties);
          if (isBackgroundRevalidate) {
            console.log('🔍 useSpecialtyBlending: Revalidated in background');
            setIsRevalidating(false);
          }
        } else if (!isBackgroundRevalidate) {
          setAllData([]);
          setAvailableSpecialties([]);
        }
      } catch (err) {
        if (!isBackgroundRevalidate) {
          console.error('Failed to fetch survey data:', err);
          setError('Failed to load survey data. Please try again.');
          setAvailableSpecialties([]);
        }
      } finally {
        if (!isBackgroundRevalidate) {
          setIsLoading(false);
        } else {
          setIsRevalidating(false);
        }
      }
    };

    (async () => {
      if (refreshTrigger > 0) {
        await fetchRealSurveyData(false);
        return;
      }

      const cachedData = globalCache.getCachedData();
      if (cachedData) {
        console.log('🔍 useSpecialtyBlending: Using cached data (instant load)');
        setAllData(cachedData.allData);
        setAvailableSpecialties(cachedData.availableSpecialties);
        return;
      }

      const staleData = globalCache.getStaleCachedData();
      if (staleData) {
        console.log('🔍 useSpecialtyBlending: Showing stale data, revalidating in background');
        setAllData(staleData.allData);
        setAvailableSpecialties(staleData.availableSpecialties);
        setIsLoading(false);
        setIsRevalidating(true);
        fetchRealSurveyData(true);
        return;
      }

      setIsLoading(true);
      await fetchRealSurveyData(false);
    })();
  }, [refreshTrigger]);

  const refreshData = useCallback(async () => {
    const globalCache = GlobalBlendingCache.getInstance();
    globalCache.clearCache();
    const { getAnalysisToolsPerformanceService } = await import('../../../services/AnalysisToolsPerformanceService');
    getAnalysisToolsPerformanceService().clearCache('customBlending');
    setAllData([]);
    setAvailableSpecialties([]);
    setError(null);
    setRefreshTrigger(prev => prev + 1);
    console.log('🔍 useSpecialtyBlending: Manual refresh triggered');
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
      const normalizedSpecialties = normalizeSpecialtyWeights(selectedSpecialties);
      
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
      const sampleSize = blendedData?.totalRecords || 0;
      
      if (!blendedData) {
        throw new Error('Failed to calculate blended metrics');
      }

      const result: BlendedResult = {
        id: generateBlendId(),
        blendName: name,
        specialties: normalizedSpecialties,
        blendedData: {
          tcc_p25: blendedData.tcc_p25,
          tcc_p50: blendedData.tcc_p50,
          tcc_p75: blendedData.tcc_p75,
          tcc_p90: blendedData.tcc_p90,
          wrvu_p25: blendedData.wrvu_p25,
          wrvu_p50: blendedData.wrvu_p50,
          wrvu_p75: blendedData.wrvu_p75,
          wrvu_p90: blendedData.wrvu_p90,
          cf_p25: blendedData.cf_p25,
          cf_p50: blendedData.cf_p50,
          cf_p75: blendedData.cf_p75,
          cf_p90: blendedData.cf_p90,
          n_orgs: blendedData.totalRecords,
          n_incumbents: blendedData.totalRecords
        },
        blendingMethod: 'simple', // Default to simple for now
        selectedData: [], // Will be populated by the calling component
        customWeights: {}, // Will be populated by the calling component
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
      
      // Save to IndexedDB first
      await saveTemplateToStorage(newTemplate);
      
      // Then update local state
      setTemplates(prev => [...prev, newTemplate]);
      
      console.log('🔍 useSpecialtyBlending: Template saved successfully:', newTemplate.name);
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

  const clearCache = useCallback(() => {
    const globalCache = GlobalBlendingCache.getInstance();
    globalCache.clearCache();
    console.log('🔍 useSpecialtyBlending: Cache cleared manually');
  }, []);

  const refreshTemplates = useCallback(async () => {
    try {
      const { getDataService } = await import('../../../services/DataService');
      const dataService = getDataService();
      const updatedTemplates = await dataService.getAllBlendTemplates();
      setTemplates(updatedTemplates);
      console.log('🔍 useSpecialtyBlending: Templates refreshed');
    } catch (error) {
      console.error('Failed to refresh templates:', error);
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { getDataService } = await import('../../../services/DataService');
      const dataService = getDataService();
      await dataService.deleteBlendTemplate(templateId);
      
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      console.log('🔍 useSpecialtyBlending: Template deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    // State
    selectedSpecialties,
    availableSpecialties,
    allData,
    currentBlend,
    templates,
    isLoading,
    isRevalidating,
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
    deleteTemplate,
    validateBlend: validateBlendAction,
    resetBlend,
    clearCache,
    refreshTemplates,
    refreshData
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
  try {
    console.log('🔍 Attempting to save template:', template);
    
    // Import the DataService (works with both IndexedDB and Firebase)
    const { getDataService } = await import('../../../services/DataService');
    const dataService = getDataService();
    
    console.log('🔍 DataService imported successfully');
    
    // Save the template (to Firebase or IndexedDB based on mode)
    await dataService.saveBlendTemplate(template);
    console.log('✅ Template saved:', template.name);
  } catch (error) {
    console.error('❌ Error saving template:', error);
    console.error('❌ Error details:', error);
    throw error;
  }
};

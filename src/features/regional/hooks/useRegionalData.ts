import { useState, useEffect, useMemo, useCallback } from 'react';
import { RegionalData, RegionalFilters, RegionalSummary, RegionalCalculationParams } from '../types/regional';
import { calculateRegionalAnalytics, REGION_NAMES } from '../utils/regionalCalculations';
import { LocalStorageService } from '../../../services/StorageService';
import { SpecialtyMappingService } from '../../../services/SpecialtyMappingService';
import BackendService from '../../../services/BackendService';
import { ProviderType, GeographicRegion, SurveySource } from '../../../shared/types';

interface UseRegionalDataReturn {
  // Data
  data: RegionalData[];
  summary: RegionalSummary | null;
  rawData: any[];
  mappings: any[];
  
  // State
  loading: boolean;
  error: string | null;
  selectedSpecialty: string;
  
  // Filters
  filters: RegionalFilters;
  availableOptions: {
    specialties: string[];
    providerTypes: ProviderType[];
    regions: GeographicRegion[];
    surveySources: SurveySource[];
    years: string[];
  };
  
  // Actions
  setSelectedSpecialty: (specialty: string) => void;
  setFilters: (filters: RegionalFilters) => void;
  clearFilters: () => void;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing regional analytics data
 * 
 * @param initialFilters - Initial filters to apply
 * @returns Object containing data, state, and actions
 */
export const useRegionalData = (
  initialFilters: RegionalFilters = {}
): UseRegionalDataReturn => {
  // State declarations
  const [rawData, setRawData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [filters, setFilters] = useState<RegionalFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from backend and storage
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const storageService = new LocalStorageService();
      const mappingService = new SpecialtyMappingService(storageService);
      const backendService = BackendService.getInstance();

      // Get specialty mappings
      const allMappings = await mappingService.getAllMappings();
      console.log(`📋 Loaded ${allMappings.length} specialty mappings`);
      setMappings(allMappings);

      // Get surveys from backend
      const surveys = await backendService.getAllSurveys();
      console.log(`📊 Found ${surveys.length} surveys`);
      let allRows: any[] = [];

      // Load data from each survey
      for (const survey of surveys) {
        console.log(`🔍 Loading data for survey: ${survey.id}`);
        const data = await backendService.getSurveyData(survey.id, undefined, { limit: 10000 });
        
        if (data && data.rows) {
          console.log(`✅ Loaded ${data.rows.length} rows from survey ${survey.id}`);
          
          const surveySource = (survey as any).type || 'Survey';
          const transformedRows = data.rows.map((row: any) => ({
            ...row,
            surveySource: surveySource,
            specialty: row.specialty || row.normalizedSpecialty || '',
            geographicRegion: row.geographic_region || row.region,
            tcc_p25: row.tcc_p25,
            tcc_p50: row.tcc_p50,
            tcc_p75: row.tcc_p75,
            tcc_p90: row.tcc_p90,
            cf_p25: row.cf_p25,
            cf_p50: row.cf_p50,
            cf_p75: row.cf_p75,
            cf_p90: row.cf_p90,
            wrvu_p25: row.wrvu_p25,
            wrvu_p50: row.wrvu_p50,
            wrvu_p75: row.wrvu_p75,
            wrvu_p90: row.wrvu_p90,
          }));
          
          allRows = allRows.concat(transformedRows);
        }
      }

      console.log(`🎯 Total rows loaded: ${allRows.length}`);
      setRawData(allRows);
    } catch (err) {
      console.error('Error loading regional data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load regional data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate available options from raw data
  const availableOptions = useMemo(() => {
    const specialties = [...new Set(mappings.map(m => m.standardizedName))].sort();
    const providerTypes = [...new Set(rawData.map(row => row.providerType))].sort() as ProviderType[];
    const regions = [...new Set(rawData.map(row => row.geographicRegion))].sort() as GeographicRegion[];
    const surveySources = [...new Set(rawData.map(row => row.surveySource))].sort() as SurveySource[];
    const years = [...new Set(rawData.map(row => row.surveyYear))].sort();

    return {
      specialties,
      providerTypes,
      regions,
      surveySources,
      years,
    };
  }, [rawData, mappings]);

  // Calculate regional data based on selected specialty and filters
  const { data, summary } = useMemo(() => {
    if (!selectedSpecialty || rawData.length === 0) {
      return { data: [], summary: null };
    }

    try {
      // Update filters with selected specialty
      const updatedFilters = { ...filters, specialty: selectedSpecialty };

      const calculationParams: RegionalCalculationParams = {
        data: rawData,
        filters: updatedFilters,
        regions: REGION_NAMES,
        metrics: ['tcc', 'cf', 'wrvus'],
      };

      const result = calculateRegionalAnalytics(calculationParams, mappings);
      return {
        data: result.regionalData,
        summary: result.summary,
      };
    } catch (err) {
      console.error('Error calculating regional data:', err);
      return { data: [], summary: null };
    }
  }, [selectedSpecialty, filters, rawData, mappings]);

  // Actions
  const handleSetFilters = useCallback((newFilters: RegionalFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleRefreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    data,
    summary,
    rawData,
    mappings,
    
    // State
    loading,
    error,
    selectedSpecialty,
    
    // Filters
    filters,
    availableOptions,
    
    // Actions
    setSelectedSpecialty,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,
    refreshData: handleRefreshData,
    clearError: handleClearError,
  };
};

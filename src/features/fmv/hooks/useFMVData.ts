import { useState, useEffect, useCallback, useMemo } from 'react';
import { LocalStorageService } from '../../../services/StorageService';
import { SpecialtyMappingService } from '../../../services/SpecialtyMappingService';
import { 
  FMVFilters, 
  CompensationComponent, 
  CompareType, 
  MarketData, 
  UserPercentiles, 
  UniqueFilterValues,
  NormalizedSurveyRow,
  FMVCalculationState
} from '../types/fmv';
import { 
  normalizeSurveyRow, 
  applyFMVFilters, 
  calculateMarketData, 
  calculateUserPercentiles,
  calculateTotalTCC,
  applyFTEAdjustment,
  extractUniqueFilterValues,
  normalizeString
} from '../utils/fmvCalculations';

/**
 * Custom hook for managing FMV calculator data and state
 * 
 * @returns Object containing FMV state and actions
 */
export const useFMVData = () => {
  // Core state
  const [filters, setFilters] = useState<FMVFilters>({
    specialty: '',
    providerType: '',
    region: '',
    surveySource: '',
    year: '',
    fte: 1.0,
  });

  const [compComponents, setCompComponents] = useState<CompensationComponent[]>([
    { type: 'Base Salary', amount: '', notes: '' }
  ]);

  const [wrvus, setWRVUs] = useState<string>('');
  const [cf, setCF] = useState<string>('');
  const [compareType, setCompareType] = useState<CompareType>('TCC');

  // Market data and calculations
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [percentiles, setPercentiles] = useState<UserPercentiles>({ 
    tcc: null, 
    wrvu: null, 
    cf: null 
  });

  // UI state
  const [uniqueValues, setUniqueValues] = useState<UniqueFilterValues>({
    specialties: [],
    providerTypes: [],
    regions: [],
    surveySources: [],
    years: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized calculations
  const tcc = useMemo(() => calculateTotalTCC(compComponents), [compComponents]);
  const tccFTEAdjusted = useMemo(() => applyFTEAdjustment(tcc, filters.fte), [tcc, filters.fte]);
  const wrvusFTEAdjusted = useMemo(() => applyFTEAdjustment(Number(wrvus), filters.fte), [wrvus, filters.fte]);

  /**
   * Fetches unique filter values from survey data and mappings
   */
  const fetchUniqueValues = useCallback(async () => {
    try {
      const storageService = new LocalStorageService();
      const mappingService = new SpecialtyMappingService(storageService);
      const allMappings = await mappingService.getAllMappings();
      const uploadedSurveys = await storageService.listSurveys();
      
      const yearsSet = new Set<string>();
      const values = {
        specialties: new Set<string>(),
        providerTypes: new Set<string>(),
        regions: new Set<string>(),
        surveySources: new Set<string>()
      };

      // Add mapped specialties
      allMappings.forEach(mapping => {
        if (mapping.standardizedName) {
          values.specialties.add(mapping.standardizedName);
        }
      });

      let allRows: NormalizedSurveyRow[] = [];

      // Process uploaded surveys
      for (const survey of uploadedSurveys) {
        let year = '';
        if (survey.metadata?.columnMappings?.surveyYear) {
          year = String(survey.metadata.columnMappings.surveyYear);
        } else if (survey.metadata?.surveyYear) {
          year = String(survey.metadata.surveyYear);
        }
        if (year) yearsSet.add(year);

        // Add metadata values
        if (survey.metadata.uniqueProviderTypes) {
          survey.metadata.uniqueProviderTypes.forEach((pt: string) => values.providerTypes.add(pt));
        }
        if (survey.metadata.uniqueRegions) {
          survey.metadata.uniqueRegions.forEach((r: string) => values.regions.add(r));
        }
        if (survey.metadata.surveyType) values.surveySources.add(survey.metadata.surveyType);

        // Process survey data
        const data = await storageService.getSurveyData(survey.id);
        if (data?.rows) {
          const cm = survey.metadata?.columnMappings || {};
          const normalizedRows = data.rows.map(row => normalizeSurveyRow(row, survey.metadata, cm));
          
          normalizedRows.forEach((row: NormalizedSurveyRow) => {
            if (row.providerType) values.providerTypes.add(row.providerType);
            if (row.geographicRegion) values.regions.add(row.geographicRegion);
            if (row.specialty) values.specialties.add(row.specialty);
            if (row.year) yearsSet.add(String(row.year));
          });
          
          allRows = allRows.concat(normalizedRows);
        }
      }

      setUniqueValues({
        specialties: Array.from(values.specialties).sort(),
        providerTypes: Array.from(values.providerTypes).sort(),
        regions: Array.from(values.regions).sort(),
        surveySources: Array.from(values.surveySources).sort(),
        years: Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))
      });
    } catch (err) {
      console.error('Error fetching unique values:', err);
      setError('Failed to load filter options');
    }
  }, []);

  /**
   * Fetches and calculates market data based on current filters
   */
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const storageService = new LocalStorageService();
      const mappingService = new SpecialtyMappingService(storageService);
      const allMappings = await mappingService.getAllMappings();
      const uploadedSurveys = await storageService.listSurveys();
      
      let allRows: NormalizedSurveyRow[] = [];

      // Collect all survey data
      for (const survey of uploadedSurveys) {
        const data = await storageService.getSurveyData(survey.id);
        if (data?.rows) {
          const cm = survey.metadata?.columnMappings || {};
          const normalizedRows = data.rows.map(row => normalizeSurveyRow(row, survey.metadata, cm));
          allRows = allRows.concat(normalizedRows);
        }
      }

      // Find mapped specialties for filtering
      let mappedSpecialties: string[] = [];
      if (filters.specialty) {
        const mapping = allMappings.find(m => 
          normalizeString(m.standardizedName) === normalizeString(filters.specialty)
        );
        if (mapping) {
          mappedSpecialties = mapping.sourceSpecialties.map(s => normalizeString(s.specialty));
        } else {
          mappedSpecialties = [normalizeString(filters.specialty)];
        }
      }

      // Apply filters
      const filteredRows = applyFMVFilters(allRows, filters, mappedSpecialties);

      // Calculate market data
      const calculatedMarketData = calculateMarketData(filteredRows);

      // Calculate user percentiles
      const calculatedPercentiles = calculateUserPercentiles(
        calculatedMarketData,
        tccFTEAdjusted,
        wrvusFTEAdjusted,
        Number(cf)
      );

      setMarketData(calculatedMarketData);
      setPercentiles(calculatedPercentiles);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, [filters, tccFTEAdjusted, wrvusFTEAdjusted, cf]);

  /**
   * Updates filters and triggers market data recalculation
   */
  const updateFilters = useCallback((newFilters: Partial<FMVFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Adds a new compensation component
   */
  const addCompComponent = useCallback(() => {
    setCompComponents(prev => [...prev, { type: '', amount: '', notes: '' }]);
  }, []);

  /**
   * Removes a compensation component by index
   */
  const removeCompComponent = useCallback((index: number) => {
    setCompComponents(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Updates a compensation component by index and field
   */
  const updateCompComponent = useCallback((
    index: number, 
    field: keyof CompensationComponent, 
    value: string
  ) => {
    setCompComponents(prev => {
      const newComponents = [...prev];
      newComponents[index] = { ...newComponents[index], [field]: value };
      return newComponents;
    });
  }, []);

  /**
   * Resets all filters to default values
   */
  const resetFilters = useCallback(() => {
    setFilters({
      specialty: '',
      providerType: '',
      region: '',
      surveySource: '',
      year: '',
      fte: 1.0,
    });
  }, []);

  /**
   * Clears all compensation components
   */
  const clearCompComponents = useCallback(() => {
    setCompComponents([{ type: 'Base Salary', amount: '', notes: '' }]);
  }, []);

  /**
   * Resets all input values
   */
  const resetAll = useCallback(() => {
    resetFilters();
    clearCompComponents();
    setWRVUs('');
    setCF('');
    setCompareType('TCC');
  }, [resetFilters, clearCompComponents]);

  // Load unique values on mount
  useEffect(() => {
    fetchUniqueValues();
  }, [fetchUniqueValues]);

  // Recalculate market data when dependencies change
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return {
    // State
    filters,
    compComponents,
    wrvus,
    cf,
    compareType,
    marketData,
    percentiles,
    uniqueValues,
    loading,
    error,
    
    // Calculated values
    tcc,
    tccFTEAdjusted,
    wrvusFTEAdjusted,
    
    // Actions
    updateFilters,
    setCompComponents,
    setWRVUs,
    setCF,
    setCompareType,
    addCompComponent,
    removeCompComponent,
    updateCompComponent,
    resetFilters,
    clearCompComponents,
    resetAll,
    fetchMarketData,
  };
};

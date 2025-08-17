import { useState, useEffect, useCallback, useMemo } from 'react';
import { LocalStorageService } from '../../../services/StorageService';
import { SpecialtyMappingService } from '../../../services/SpecialtyMappingService';
import BackendService from '../../../services/BackendService';
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
  const [allSurveyRows, setAllSurveyRows] = useState<any[]>([]);

  // Memoized calculations
  const tcc = useMemo(() => calculateTotalTCC(compComponents), [compComponents]);
  const tccFTEAdjusted = useMemo(() => applyFTEAdjustment(tcc, filters.fte), [tcc, filters.fte]);
  const wrvusFTEAdjusted = useMemo(() => applyFTEAdjustment(Number(wrvus), filters.fte), [wrvus, filters.fte]);

  /**
   * Fetches unique filter values from survey data and mappings
   */
  const fetchUniqueValues = useCallback(async () => {
    try {
      const backendService = BackendService.getInstance();
      const mappingService = new SpecialtyMappingService(new LocalStorageService());
      const allMappings = await mappingService.getAllMappings();
      const uploadedSurveys = await backendService.getAllSurveys();
      
      let allRows: any[] = [];

      // Collect all survey data first
      for (const survey of uploadedSurveys) {
        const surveyType = (survey as any).type;
        const data = await backendService.getSurveyData(survey.id, undefined, { limit: 10000 });
        if (data?.rows) {
          // Debug: Check what fields are available in the first row
          if (data.rows.length > 0) {
            console.log('FMV Debug - First row keys:', Object.keys(data.rows[0]));
            console.log('FMV Debug - First row sample:', data.rows[0]);
          }
          
          const transformedRows = data.rows.map((row: any) => ({
            id: row.id || '',
            providerType: row.providerType || row.provider_type || '',
            geographicRegion: row.geographicRegion || row.geographic_region || '',
            specialty: row.specialty || row.normalizedSpecialty || '',
            normalizedSpecialty: row.normalizedSpecialty || '',
            surveySource: surveyType || '',
            year: String(row.year || row.surveyYear || (survey as any).year || ''),
            tcc_p25: Number(row.tcc_p25) || 0,
            tcc_p50: Number(row.tcc_p50) || 0,
            tcc_p75: Number(row.tcc_p75) || 0,
            tcc_p90: Number(row.tcc_p90) || 0,
            wrvu_p25: Number(row.wrvu_p25) || 0,
            wrvu_p50: Number(row.wrvu_p50) || 0,
            wrvu_p75: Number(row.wrvu_p75) || 0,
            wrvu_p90: Number(row.wrvu_p90) || 0,
            cf_p25: Number(row.cf_p25) || 0,
            cf_p50: Number(row.cf_p50) || 0,
            cf_p75: Number(row.cf_p75) || 0,
            cf_p90: Number(row.cf_p90) || 0,
          }));
          allRows = allRows.concat(transformedRows);
        }
      }

      // Store all rows for cascading filter calculations
      setAllSurveyRows(allRows);

      // Calculate initial unique values from all data
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

      // Add values from actual data
      allRows.forEach((row: any) => {
        if (row.providerType) values.providerTypes.add(row.providerType);
        if (row.geographicRegion) values.regions.add(row.geographicRegion);
        if (row.specialty) values.specialties.add(row.specialty);
        if (row.surveySource) values.surveySources.add(row.surveySource);
        if (row.year) {
          yearsSet.add(String(row.year));
          console.log('FMV Debug - Found year:', row.year);
        }
      });
      
      console.log('FMV Debug - All years found:', Array.from(yearsSet));

      // Add default values if no data found
      if (values.specialties.size === 0) {
        values.specialties.add('Pediatrics - Endocrinology');
        values.specialties.add('Allergy/Immunology');
        values.specialties.add('Anesthesiology');
      }
      if (values.providerTypes.size === 0) {
        values.providerTypes.add('Staff Physician');
        values.providerTypes.add('Division Chief');
        values.providerTypes.add('Department Chair');
      }
      if (values.regions.size === 0) {
        values.regions.add('National');
        values.regions.add('Northeast');
        values.regions.add('North Central');
        values.regions.add('South');
        values.regions.add('West');
      }
      if (values.surveySources.size === 0) {
        values.surveySources.add('MGMA');
        values.surveySources.add('SullivanCotter');
        values.surveySources.add('Gallagher');
      }
      if (yearsSet.size === 0) {
        yearsSet.add('2023');
        yearsSet.add('2022');
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
      const mappingService = new SpecialtyMappingService(new LocalStorageService());
      const allMappings = await mappingService.getAllMappings();
      
      // Use stored survey rows instead of fetching again
      const allRows = allSurveyRows;

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
  }, [filters, tccFTEAdjusted, wrvusFTEAdjusted, cf, allSurveyRows]);

  /**
   * Calculates cascading filter values based on current filters
   */
  const calculateCascadingValues = useCallback((currentFilters: FMVFilters, allRows: any[]) => {
    // For specialties, always show all available specialties
    const allSpecialties = [...new Set(allRows.map(row => row.specialty).filter(Boolean))].sort();
    
    // For other filters, apply cascading logic
    let filteredRows = allRows;

    // Apply filters progressively to calculate available options for OTHER dropdowns
    if (currentFilters.specialty) {
      filteredRows = filteredRows.filter(row => 
        normalizeString(row.specialty) === normalizeString(currentFilters.specialty)
      );
    }

    if (currentFilters.providerType) {
      filteredRows = filteredRows.filter(row => 
        normalizeString(row.providerType) === normalizeString(currentFilters.providerType)
      );
    }

    if (currentFilters.region) {
      filteredRows = filteredRows.filter(row => 
        normalizeString(row.geographicRegion) === normalizeString(currentFilters.region)
      );
    }

    if (currentFilters.surveySource) {
      filteredRows = filteredRows.filter(row => 
        normalizeString(row.surveySource) === normalizeString(currentFilters.surveySource)
      );
    }

    if (currentFilters.year) {
      filteredRows = filteredRows.filter(row => 
        String(row.year) === String(currentFilters.year)
      );
    }

    // Calculate available values for each filter (except specialties)
    const availableValues = {
      providerTypes: new Set<string>(),
      regions: new Set<string>(),
      surveySources: new Set<string>(),
      years: new Set<string>()
    };

    filteredRows.forEach(row => {
      if (row.providerType) availableValues.providerTypes.add(row.providerType);
      if (row.geographicRegion) availableValues.regions.add(row.geographicRegion);
      if (row.surveySource) availableValues.surveySources.add(row.surveySource);
      if (row.year) availableValues.years.add(String(row.year));
    });

    return {
      specialties: allSpecialties, // Always show all specialties
      providerTypes: Array.from(availableValues.providerTypes).sort(),
      regions: Array.from(availableValues.regions).sort(),
      surveySources: Array.from(availableValues.surveySources).sort(),
      years: Array.from(availableValues.years).sort((a, b) => Number(b) - Number(a))
    };
  }, []);

  /**
   * Updates filters and triggers market data recalculation
   */
  const updateFilters = useCallback((newFilters: Partial<FMVFilters>) => {
    setFilters(prev => {
      const updatedFilters = { ...prev, ...newFilters };
      
      // Update cascading filter values
      const cascadingValues = calculateCascadingValues(updatedFilters, allSurveyRows);
      setUniqueValues(cascadingValues);
      
      return updatedFilters;
    });
  }, [calculateCascadingValues, allSurveyRows]);

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
    allSurveyRows,
    
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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDataService } from '../../../services/DataService';
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
      const dataService = getDataService();
      const allMappings = await dataService.getAllSpecialtyMappings();
      const uploadedSurveys = await dataService.getAllSurveys();
      
      let allRows: any[] = [];

      // Collect all survey data first
      for (const survey of uploadedSurveys) {
        const surveyType = (survey as any).type || (survey as any).name || 'Unknown';
        console.log('FMV Debug - Processing survey:', surveyType, survey.id);
        const data = await dataService.getSurveyData(survey.id);
        if (data && data.rows && Array.isArray(data.rows)) {
          console.log('FMV Debug - Survey data rows:', data.rows.length);
          // Debug: Check what fields are available in the first row
          if (data.rows.length > 0) {
            console.log('FMV Debug - First row keys:', Object.keys(data.rows[0]));
            console.log('FMV Debug - First row sample:', data.rows[0]);
          }
          
          const transformedRows = data.rows.map((row: any) => {
            // Initialize transformed row with base fields
            const transformedRow: any = {
              ...row,
              id: row.id || '',
              providerType: (row as any).providerType || (row as any).provider_type || 
                           (row as any).ProviderType || (row as any).Provider_Type || 
                           (row as any)['Provider Type'] || (row as any).Type || '',
              geographicRegion: (row as any).geographicRegion || (row as any).geographic_region || 
                               (row as any).Geographic_Region || (row as any).Region || 
                               (row as any)['Geographic Region'] || '',
              specialty: row.specialty || row.normalizedSpecialty || '',
              normalizedSpecialty: row.normalizedSpecialty || '',
              surveySource: surveyType || '',
              year: String(row.year || row.surveyYear || (survey as any).year || ''),
              // Initialize compensation fields
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

            // Handle variable-based data structure (same as RegionalAnalytics)
            if (row.variable) {
              const variable = String(row.variable).toLowerCase();
              const p25 = Number(row.p25) || 0;
              const p50 = Number(row.p50) || 0;
              const p75 = Number(row.p75) || 0;
              const p90 = Number(row.p90) || 0;
              
              if (variable.includes('tcc') || variable.includes('total') || variable.includes('cash')) {
                transformedRow.tcc_p25 = p25;
                transformedRow.tcc_p50 = p50;
                transformedRow.tcc_p75 = p75;
                transformedRow.tcc_p90 = p90;
              } else if (variable.includes('cf') || variable.includes('conversion')) {
                transformedRow.cf_p25 = p25;
                transformedRow.cf_p50 = p50;
                transformedRow.cf_p75 = p75;
                transformedRow.cf_p90 = p90;
              } else if (variable.includes('wrvu') || variable.includes('rvu') || variable.includes('work')) {
                transformedRow.wrvu_p25 = p25;
                transformedRow.wrvu_p50 = p50;
                transformedRow.wrvu_p75 = p75;
                transformedRow.wrvu_p90 = p90;
              }
            } else {
              // Fallback to direct field access for legacy data
              transformedRow.tcc_p25 = Number(row.tcc_p25) || 0;
              transformedRow.tcc_p50 = Number(row.tcc_p50) || 0;
              transformedRow.tcc_p75 = Number(row.tcc_p75) || 0;
              transformedRow.tcc_p90 = Number(row.tcc_p90) || 0;
              transformedRow.wrvu_p25 = Number(row.wrvu_p25) || 0;
              transformedRow.wrvu_p50 = Number(row.wrvu_p50) || 0;
              transformedRow.wrvu_p75 = Number(row.wrvu_p75) || 0;
              transformedRow.wrvu_p90 = Number(row.wrvu_p90) || 0;
              transformedRow.cf_p25 = Number(row.cf_p25) || 0;
              transformedRow.cf_p50 = Number(row.cf_p50) || 0;
              transformedRow.cf_p75 = Number(row.cf_p75) || 0;
              transformedRow.cf_p90 = Number(row.cf_p90) || 0;
            }

            return transformedRow;
          });
          
          // Debug the transformation results
          if (transformedRows.length > 0) {
            console.log('🔍 FMV DEBUG - Transformed row sample:', {
              original_variable: data.rows[0].variable,
              original_p50: data.rows[0].p50,
              transformed_tcc_p50: transformedRows[0].tcc_p50,
              transformed_wrvu_p50: transformedRows[0].wrvu_p50,
              transformed_cf_p50: transformedRows[0].cf_p50
            });
          }
          
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

      // Get all standardized names from actual mappings ONLY (like Survey Analytics)
      console.log('FMV Debug - All mappings received:', allMappings.length);
      allMappings.forEach(mapping => {
        if (mapping.standardizedName) {
          console.log('FMV Debug - Adding standardized name:', mapping.standardizedName);
          values.specialties.add(mapping.standardizedName);
        }
      });

      console.log('FMV Debug - Standardized specialties from mappings ONLY:', Array.from(values.specialties));

      // Build cascading sets based on current selections (like Survey Analytics)
      // Only populate other filters from data, NOT specialties
      allRows.forEach(row => {
        const surveySource = String(row.surveySource || '');
        const providerType = String(row.providerType || '');
        const region = String(row.geographicRegion || '');
        const year = String(row.year || '');

        // Add values to sets (excluding specialties - those come from mappings only)
        if (providerType && providerType.trim()) {
          values.providerTypes.add(providerType.trim());
        }
        if (region && region.trim()) {
          values.regions.add(region.trim());
        }
        if (surveySource && surveySource.trim()) {
          values.surveySources.add(surveySource.trim());
        }
        if (year && year.trim()) {
          yearsSet.add(year.trim());
        }
      });
      
      console.log('FMV Debug - All years found:', Array.from(yearsSet));
      console.log('FMV Debug - Total rows loaded:', allRows.length);
      console.log('FMV Debug - Unique specialties found:', values.specialties.size);
      console.log('FMV Debug - Unique provider types found:', values.providerTypes.size);
      console.log('FMV Debug - Unique regions found:', values.regions.size);
      console.log('FMV Debug - Unique survey sources found:', values.surveySources.size);

      // Add default values if no data found (only if no mappings exist)
      if (values.specialties.size === 0) {
        console.log('FMV Debug - No specialties found in mappings, adding defaults');
        values.specialties.add('Allergy & Immunology');
        values.specialties.add('Anesthesiology');
        values.specialties.add('Cardiology');
      }
      if (values.providerTypes.size === 0) {
        console.log('FMV Debug - No provider types found, adding defaults');
        values.providerTypes.add('Staff Physician');
        values.providerTypes.add('Division Chief');
        values.providerTypes.add('Department Chair');
      }
      if (values.regions.size === 0) {
        console.log('FMV Debug - No regions found, adding defaults');
        values.regions.add('National');
        values.regions.add('Northeast');
        values.regions.add('North Central');
        values.regions.add('South');
        values.regions.add('West');
      }
      if (values.surveySources.size === 0) {
        console.log('FMV Debug - No survey sources found, adding defaults');
        values.surveySources.add('MGMA');
        values.surveySources.add('SullivanCotter');
        values.surveySources.add('Gallagher');
      }
      if (yearsSet.size === 0) {
        console.log('FMV Debug - No years found, adding defaults');
        yearsSet.add('2023');
        yearsSet.add('2022');
      }

      // Final deduplication and sorting (like Survey Analytics)
      const finalSpecialties = [...new Set(Array.from(values.specialties))].sort();
      console.log('FMV Debug - Final specialties after deduplication:', finalSpecialties);
      
      setUniqueValues({
        specialties: finalSpecialties,
        providerTypes: [...new Set(Array.from(values.providerTypes))].sort(),
        regions: [...new Set(Array.from(values.regions))].sort(),
        surveySources: [...new Set(Array.from(values.surveySources))].sort(),
        years: [...new Set(Array.from(yearsSet))].sort((a, b) => Number(b) - Number(a))
      });

      console.log('FMV Debug - Final unique specialties set:', finalSpecialties);
      console.log('FMV Debug - Final provider types:', [...new Set(Array.from(values.providerTypes))].sort());
      console.log('FMV Debug - Final regions:', [...new Set(Array.from(values.regions))].sort());
      console.log('FMV Debug - Final survey sources:', [...new Set(Array.from(values.surveySources))].sort());
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
      const dataService = getDataService();
      const allMappings = await dataService.getAllSpecialtyMappings();
      
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

    // If no filters are applied, show all available values from all data
    if (!currentFilters.specialty && !currentFilters.providerType && 
        !currentFilters.region && !currentFilters.surveySource && !currentFilters.year) {
      allRows.forEach(row => {
        if (row.providerType) availableValues.providerTypes.add(row.providerType);
        if (row.geographicRegion) availableValues.regions.add(row.geographicRegion);
        if (row.surveySource) availableValues.surveySources.add(row.surveySource);
        if (row.year) availableValues.years.add(String(row.year));
      });
    } else {
      // Apply cascading logic only when filters are active
      filteredRows.forEach(row => {
        if (row.providerType) availableValues.providerTypes.add(row.providerType);
        if (row.geographicRegion) availableValues.regions.add(row.geographicRegion);
        if (row.surveySource) availableValues.surveySources.add(row.surveySource);
        if (row.year) availableValues.years.add(String(row.year));
      });
    }

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
      
      console.log('FMV Debug - Updating filters:', updatedFilters);
      console.log('FMV Debug - All survey rows available:', allSurveyRows.length);
      
      // Update cascading filter values
      const cascadingValues = calculateCascadingValues(updatedFilters, allSurveyRows);
      console.log('FMV Debug - Cascading values calculated:', cascadingValues);
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

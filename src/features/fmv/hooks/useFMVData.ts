import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDataService } from '../../../services/DataService';
import { AnalyticsDataService } from '../../analytics/services/analyticsDataService';
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
    providerType: 'All Types',
    region: 'All Regions',
    surveySource: 'All Sources',
    year: 'All Years',
    fte: 1.0,
    aggregationMethod: 'simple',
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
  const [surveyCount, setSurveyCount] = useState(0);

  // Memoized calculations
  const tcc = useMemo(() => calculateTotalTCC(compComponents), [compComponents]);
  const tccFTEAdjusted = useMemo(() => applyFTEAdjustment(tcc, filters.fte), [tcc, filters.fte]);
  const wrvusFTEAdjusted = useMemo(() => applyFTEAdjustment(Number(wrvus), filters.fte), [wrvus, filters.fte]);

  /**
   * Calculates filter values - Enterprise-grade UX: Always show ALL available options
   * This allows users to easily change any filter at any time without being locked into cascading behavior
   */
  const calculateFilterValues = useCallback(async () => {
    console.log('🔍 FMV: Generating all available options for enterprise-grade UX');
    
    try {
      // Use the same AnalyticsDataService as the Analytics screen
      const analyticsDataService = new AnalyticsDataService();
      const allData = await analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });

      console.log('🔍 FMV: Fetched', allData.length, 'records for filter options');
      
      const specialtySet = new Set<string>();
      const providerTypeSet = new Set<string>();
      const regionSet = new Set<string>();
      const surveySourceSet = new Set<string>();
      const yearSet = new Set<string>();
      
      // Extract unique values from all data
      allData.forEach(row => {
        if (row.standardizedName) specialtySet.add(row.standardizedName);
        if (row.providerType) providerTypeSet.add(row.providerType);
        if (row.geographicRegion) regionSet.add(row.geographicRegion);
        if (row.surveySource) surveySourceSet.add(row.surveySource);
        if (row.surveyYear) yearSet.add(row.surveyYear);
      });
      
      // Convert Sets to Arrays and sort
      const result: UniqueFilterValues = {
        specialties: Array.from(specialtySet).sort(),
        providerTypes: Array.from(providerTypeSet).sort(),
        regions: Array.from(regionSet).sort(),
        surveySources: Array.from(surveySourceSet).sort(),
        years: Array.from(yearSet).sort()
      };
      
      console.log('🔍 FMV: Generated filter options:', {
        specialties: result.specialties.length,
        providerTypes: result.providerTypes.length,
        regions: result.regions.length,
        surveySources: result.surveySources.length,
        years: result.years.length
      });
      
      return result;
    } catch (error) {
      console.error('Error calculating filter values:', error);
      // Return empty values on error
      return {
        specialties: [],
        providerTypes: [],
        regions: [],
        surveySources: [],
        years: []
      };
    }
  }, []);

  /**
   * Fetches unique filter values from survey data and mappings
   */
  const fetchUniqueValues = useCallback(async () => {
    try {
      console.log('🔍 FMV: Fetching unique values using AnalyticsDataService');
      
      // Generate filter options from the normalized data
      const filterValues = await calculateFilterValues();
      setUniqueValues(filterValues);

      console.log('🔍 FMV: Set unique values:', filterValues);
    } catch (err) {
      console.error('Error fetching unique values:', err);
      setError('Failed to load filter options');
    }
  }, [calculateFilterValues]);

  /**
   * Fetches and calculates market data based on current filters
   */
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 FMV: Fetching market data with filters:', filters);
      
      // Use the same approach as Analytics screen: fetch ALL data first, then filter client-side
      const analyticsDataService = new AnalyticsDataService();
      const allData = await analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });

      console.log('🔍 FMV: Fetched', allData.length, 'total records from AnalyticsDataService');
      
      if (allData.length === 0) {
        console.log('🔍 FMV: No data found');
        setMarketData(null);
        setPercentiles({ tcc: null, wrvu: null, cf: null });
        return;
      }

      // Apply client-side filtering using the same logic as Analytics screen
      const filteredData = allData.filter(row => {
        // CRITICAL: Exclude summary rows that are created by AnalyticsTable
        // These rows have surveySource like "Family Medicine - Simple Average" or "Family Medicine - Weighted Average"
        if (row.surveySource && (
          row.surveySource.includes(' - Simple Average') || 
          row.surveySource.includes(' - Weighted Average')
        )) {
          console.log('🔍 FMV: Excluding summary row:', row.surveySource);
          return false;
        }
        
        // Specialty filter - use exact matching like Analytics
        if (filters.specialty && filters.specialty !== '') {
          if (row.standardizedName !== filters.specialty) {
            return false;
          }
        }
        
        // Survey source filter (exclude "All Sources")
        if (filters.surveySource && filters.surveySource !== '' && filters.surveySource !== 'All Sources' && row.surveySource !== filters.surveySource) {
          return false;
        }
        
        // Geographic region filter
        if (filters.region && filters.region !== '' && filters.region !== 'All Regions' && row.geographicRegion !== filters.region) {
          return false;
        }
        
        // Provider type filter (exclude "All Types")
        if (filters.providerType && filters.providerType !== '' && filters.providerType !== 'All Types' && row.providerType !== filters.providerType) {
          return false;
        }
        
        // Year filter (exclude "All Years")
        if (filters.year && filters.year !== '' && filters.year !== 'All Years' && row.surveyYear !== filters.year) {
          return false;
        }
        
        return true;
      });

      console.log('🔍 FMV: All data before filtering:', allData.length, 'records');
      console.log('🔍 FMV: Sample all data:', allData[0]);
      console.log('🔍 FMV: Applied filters:', filters);

      console.log('🔍 FMV: Filtered to', filteredData.length, 'records matching filters');
      setSurveyCount(filteredData.length);

      if (filteredData.length === 0) {
        console.log('🔍 FMV: No data matches the current filters');
        setMarketData(null);
        setPercentiles({ tcc: null, wrvu: null, cf: null });
        setSurveyCount(0);
        return;
      }

      // Convert AnalyticsDataService format to FMV format
      const normalizedRows: NormalizedSurveyRow[] = filteredData.map((row, index) => ({
        id: `fmv-${index}`, // Generate a unique ID
        providerType: row.providerType || '',
        geographicRegion: row.geographicRegion || '',
        specialty: row.surveySpecialty || '',
        normalizedSpecialty: row.standardizedName || '',
        surveySource: (row.surveySource as any) || 'Custom',
        year: row.surveyYear || '',
        // TCC metrics with organizational data
        tcc_n_orgs: row.tcc_n_orgs || 0,
        tcc_n_incumbents: row.tcc_n_incumbents || 0,
        tcc_p25: row.tcc_p25 || 0,
        tcc_p50: row.tcc_p50 || 0,
        tcc_p75: row.tcc_p75 || 0,
        tcc_p90: row.tcc_p90 || 0,
        // wRVU metrics with organizational data
        wrvu_n_orgs: row.wrvu_n_orgs || 0,
        wrvu_n_incumbents: row.wrvu_n_incumbents || 0,
        wrvu_p25: row.wrvu_p25 || 0,
        wrvu_p50: row.wrvu_p50 || 0,
        wrvu_p75: row.wrvu_p75 || 0,
        wrvu_p90: row.wrvu_p90 || 0,
        // CF metrics with organizational data
        cf_n_orgs: row.cf_n_orgs || 0,
        cf_n_incumbents: row.cf_n_incumbents || 0,
        cf_p25: row.cf_p25 || 0,
        cf_p50: row.cf_p50 || 0,
        cf_p75: row.cf_p75 || 0,
        cf_p90: row.cf_p90 || 0,
      }));

      console.log('🔍 FMV: Converted to', normalizedRows.length, 'normalized rows');
      console.log('🔍 FMV: Sample normalized row:', normalizedRows[0]);

      // Calculate market data using the normalized rows with the selected aggregation method
      console.log('🔍 FMV: Using aggregation method:', filters.aggregationMethod);
      const calculatedMarketData = calculateMarketData(normalizedRows, filters.aggregationMethod);

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
    setFilters(prev => {
      const updatedFilters = { ...prev, ...newFilters };
      
      console.log('FMV Debug - Updating filters:', updatedFilters);
      
      return updatedFilters;
    });
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
      providerType: 'All Types',
      region: 'All Regions',
      surveySource: 'All Sources',
      year: 'All Years',
      fte: 1.0,
      aggregationMethod: 'simple',
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
    surveyCount,
    
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
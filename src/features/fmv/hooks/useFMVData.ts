import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnalyticsDataService } from '../../analytics/services/analyticsDataService';
import { 
  FMVFilters, 
  CompensationComponent, 
  CompareType, 
  MarketData, 
  UserPercentiles, 
  UniqueFilterValues,
  NormalizedSurveyRow
} from '../types/fmv';
import { 
  calculateMarketData, 
  calculateUserPercentiles,
  calculateTotalTCC,
  applyFTEAdjustment
} from '../utils/fmvCalculations';

// Enterprise-grade FMV cache
class FMVCache {
  private static instance: FMVCache;
  private dataCache: {
    data: any[] | null;
    lastFetch: number;
    isStale: boolean;
    version: string;
  } = {
    data: null,
    lastFetch: 0,
    isStale: false,
    version: ''
  };
  
  private uniqueValuesCache: {
    data: UniqueFilterValues | null;
    lastFetch: number;
    version: string;
  } = {
    data: null,
    lastFetch: 0,
    version: ''
  };
  
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  
  static getInstance(): FMVCache {
    if (!FMVCache.instance) {
      FMVCache.instance = new FMVCache();
    }
    return FMVCache.instance;
  }
  
  hasFreshData(): boolean {
    const now = Date.now();
    return this.dataCache.data !== null && 
           (now - this.dataCache.lastFetch) < this.CACHE_DURATION;
  }
  
  hasStaleData(): boolean {
    const now = Date.now();
    return this.dataCache.data !== null && 
           (now - this.dataCache.lastFetch) < this.STALE_THRESHOLD;
  }
  
  getCachedData(): any[] | null {
    return this.dataCache.data;
  }
  
  setCachedData(data: any[]): void {
    this.dataCache = {
      data,
      lastFetch: Date.now(),
      isStale: false,
      version: this.generateCacheVersion()
    };
  }
  
  hasFreshUniqueValues(): boolean {
    const now = Date.now();
    return this.uniqueValuesCache.data !== null && 
           (now - this.uniqueValuesCache.lastFetch) < this.CACHE_DURATION;
  }
  
  getCachedUniqueValues(): UniqueFilterValues | null {
    return this.uniqueValuesCache.data;
  }
  
  setCachedUniqueValues(data: UniqueFilterValues): void {
    this.uniqueValuesCache = {
      data,
      lastFetch: Date.now(),
      version: this.generateCacheVersion()
    };
  }
  
  clearCache(): void {
    this.dataCache = {
      data: null,
      lastFetch: 0,
      isStale: false,
      version: ''
    };
    this.uniqueValuesCache = {
      data: null,
      lastFetch: 0,
      version: ''
    };
  }
  
  private generateCacheVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * Custom hook for managing FMV calculator data and state
 * 
 * @returns Object containing FMV state and actions
 */
export const useFMVData = () => {
  // Get cache instance
  const fmvCache = FMVCache.getInstance();
  
  // Core state
  const [filters, setFilters] = useState<FMVFilters>({
    specialty: '',
    providerType: 'All Types',
    region: 'All Regions',
    surveySource: 'All Sources',
    year: 'All Years',
    fte: 1.0,
    aggregationMethod: 'simple',
    useSpecialtyBlending: false,
    specialtyBlending: undefined,
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
  const [surveyCount, setSurveyCount] = useState(0);
  const [blendedData, setBlendedData] = useState<any>(null);

  // Memoized calculations
  const tcc = useMemo(() => calculateTotalTCC(compComponents), [compComponents]);
  const tccFTEAdjusted = useMemo(() => applyFTEAdjustment(tcc, filters.fte), [tcc, filters.fte]);
  const wrvusFTEAdjusted = useMemo(() => applyFTEAdjustment(Number(wrvus), filters.fte), [wrvus, filters.fte]);

  /**
   * Calculates filter values - Enterprise-grade UX: Always show ALL available options
   * This allows users to easily change any filter at any time without being locked into cascading behavior
   */
  const calculateFilterValues = useCallback(async () => {
    try {
      // Check cache first
      if (fmvCache.hasFreshUniqueValues()) {
        const cachedValues = fmvCache.getCachedUniqueValues();
        if (cachedValues) {
          console.log('🚀 Using cached FMV filter values (fast!)');
          return cachedValues;
        }
      }
      
      // Use the same AnalyticsDataService as the Analytics screen
      // This benefits from TanStack Query cache if benchmarking route is also loaded
      const analyticsDataService = new AnalyticsDataService();
      const allData = await analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });

      
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
      
      // Filter to parent specialties only (not sub-specialties)
      const parentSpecialties = Array.from(specialtySet).filter(specialty => {
        // Parent specialties are typically broader categories
        // Filter out sub-specialties that contain specific procedures or subspecialties
        const lowerSpecialty = specialty.toLowerCase();
        
        // Exclude sub-specialties that contain these keywords
        const subSpecialtyKeywords = [
          'interventional', 'pediatric', 'geriatric', 'sports', 'trauma', 
          'critical care', 'emergency', 'urgent care', 'outpatient', 'inpatient',
          'surgical', 'medical', 'diagnostic', 'therapeutic', 'minimally invasive',
          'robotic', 'laparoscopic', 'endoscopic', 'cardiac', 'vascular',
          'neuro', 'orthopedic', 'plastic', 'reconstructive', 'cosmetic',
          'dermatology', 'dermatologic', 'oncology', 'oncologic', 'hematology',
          'rheumatology', 'endocrinology', 'gastroenterology', 'nephrology',
          'pulmonology', 'allergy', 'immunology', 'infectious disease',
          'psychiatry', 'psychiatric', 'neurology', 'neurologic', 'radiology',
          'pathology', 'anesthesiology', 'anesthesia', 'obstetrics', 'gynecology',
          'urology', 'urologic', 'ophthalmology', 'otolaryngology', 'ent'
        ];
        
        // Check if specialty contains sub-specialty keywords
        const isSubSpecialty = subSpecialtyKeywords.some(keyword => 
          lowerSpecialty.includes(keyword)
        );
        
        // Also exclude very specific procedure names
        const isSpecificProcedure = lowerSpecialty.includes('procedure') || 
                                  lowerSpecialty.includes('surgery') ||
                                  lowerSpecialty.includes('treatment') ||
                                  lowerSpecialty.includes('therapy');
        
        // Return true for parent specialties (not sub-specialties)
        return !isSubSpecialty && !isSpecificProcedure;
      }).sort();
      
      // Convert Sets to Arrays and sort
      const result: UniqueFilterValues = {
        specialties: parentSpecialties,
        providerTypes: Array.from(providerTypeSet).sort(),
        regions: Array.from(regionSet).sort(),
        surveySources: Array.from(surveySourceSet).sort(),
        years: Array.from(yearSet).sort()
      };
      
      // Cache the result
      fmvCache.setCachedUniqueValues(result);
      console.log('💾 Cached FMV filter values for future use');
      
      return result;
    } catch (error) {
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
      // Generate filter options from the normalized data
      const filterValues = await calculateFilterValues();
      setUniqueValues(filterValues);
    } catch (err) {
      setError('Failed to load filter options');
    }
  }, [calculateFilterValues]);

  /**
   * Process market data with current filters (extracted for reuse)
   */
  const processMarketData = useCallback(async (allData: any[]) => {
    if (allData.length === 0) {
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

    setSurveyCount(filteredData.length);

    if (filteredData.length === 0) {
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

    // Handle specialty blending if enabled
    if (filters.useSpecialtyBlending && filters.specialtyBlending) {
      // Import blending calculation utilities
      const { calculateBlendedMarketData } = await import('../utils/specialtyBlendingCalculations');
      
      // Group data by specialty for blending
      const specialtyDataMap = new Map<string, NormalizedSurveyRow[]>();
      normalizedRows.forEach(row => {
        const specialty = row.normalizedSpecialty || row.specialty;
        if (!specialtyDataMap.has(specialty)) {
          specialtyDataMap.set(specialty, []);
        }
        specialtyDataMap.get(specialty)!.push(row);
      });
      
      // Prepare specialty data for blending
      const specialtyData = filters.specialtyBlending.specialties.map(blendItem => {
        const specialtyRows = specialtyDataMap.get(blendItem.specialty) || [];
        const specialtyMarketData = calculateMarketData(specialtyRows, filters.aggregationMethod);
        
        return {
          specialty: blendItem.specialty,
          data: specialtyMarketData,
          percentage: blendItem.percentage,
          weight: blendItem.weight,
          sampleSize: specialtyRows.reduce((sum, row) => sum + (row.tcc_n_incumbents || 0), 0)
        };
      });
      
      // Calculate blended market data
      const blendedMarketData = calculateBlendedMarketData(specialtyData, filters.specialtyBlending);
      
      // Store blended data for display
      setBlendedData(blendedMarketData);
      
      // Use blended percentiles for user calculations
      const calculatedMarketData = {
        tcc: blendedMarketData.blendedPercentiles.tcc,
        wrvu: blendedMarketData.blendedPercentiles.wrvu,
        cf: blendedMarketData.blendedPercentiles.cf
      };
      
      // Calculate user percentiles using blended data
      const calculatedPercentiles = calculateUserPercentiles(
        calculatedMarketData,
        tccFTEAdjusted,
        wrvusFTEAdjusted,
        Number(cf)
      );

      setMarketData(calculatedMarketData);
      setPercentiles(calculatedPercentiles);
    } else {
      // Clear blended data when not using blending
      setBlendedData(null);
      
      // Calculate market data using the normalized rows with the selected aggregation method
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
    }
  }, [filters, tccFTEAdjusted, wrvusFTEAdjusted, cf]);

  /**
   * Background refresh for stale data (Google-style)
   */
  const fetchMarketDataInBackground = useCallback(async () => {
    try {
      console.log('🔄 Background refreshing FMV data...');
      const analyticsDataService = new AnalyticsDataService();
      const allData = await analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });
      
      // Update cache with fresh data
      fmvCache.setCachedData(allData);
      console.log('✅ Background refresh completed');
    } catch (error) {
      console.warn('⚠️ Background refresh failed:', error);
    }
  }, []);

  /**
   * Fetches and calculates market data based on current filters
   */
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first for all data
      if (fmvCache.hasFreshData()) {
        const cachedData = fmvCache.getCachedData();
        if (cachedData) {
          console.log('🚀 Using cached FMV market data (fast!)');
          // Trigger background refresh if data is getting stale
          if (fmvCache.hasStaleData()) {
            // Background refresh without blocking UI
            setTimeout(() => {
              fetchMarketDataInBackground();
            }, 0);
          }
          // Process cached data with current filters
          await processMarketData(cachedData);
          return;
        }
      }
      
      // Use the same AnalyticsDataService as Analytics screen
      // This benefits from shared IndexedDB cache and will benefit from TanStack Query
      // if benchmarking route is also open (data will be in memory cache)
      const analyticsDataService = new AnalyticsDataService();
      const allData = await analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });
      
      // Cache the raw data
      fmvCache.setCachedData(allData);
      console.log('💾 Cached FMV market data for future use');
      
      // Process the data with current filters
      await processMarketData(allData);
    } catch (err) {
      setError('Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, [processMarketData]);

  /**
   * Updates filters and triggers market data recalculation
   */
  const updateFilters = useCallback((newFilters: Partial<FMVFilters>) => {
    setFilters(prev => {
      const updatedFilters = { ...prev, ...newFilters };
      
      
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
      useSpecialtyBlending: false,
      specialtyBlending: undefined,
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

  /**
   * Clear FMV cache (call when data changes)
   */
  const clearFMVCache = useCallback(() => {
    fmvCache.clearCache();
    console.log('🗑️ Cleared FMV cache');
  }, []);

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
    surveyCount,
    blendedData,
    
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
    clearFMVCache,
  };
};
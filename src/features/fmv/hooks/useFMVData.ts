import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnalyticsDataService } from '../../analytics/services/analyticsDataService';
import { 
  FMVFilters, 
  CompensationComponent, 
  CompareType, 
  MarketData, 
  UserPercentiles, 
  UniqueFilterValues,
  NormalizedSurveyRow,
  CallPayAdjustments
} from '../types/fmv';
import { 
  calculateMarketData, 
  calculateUserPercentiles,
  calculateTotalTCC,
  applyFTEAdjustment,
  applyCallPayAdjustments,
  applyCallPayAdjustmentsToValue
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
  
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (offline-first)
  private readonly STALE_THRESHOLD = 0; // Manual refresh only
  
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

export const clearGlobalFMVCache = (): void => {
  FMVCache.getInstance().clearCache();
};

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
  const [callPay, setCallPay] = useState<string>('');
  const [compareType, setCompareType] = useState<CompareType>('TCC');

  // Default Call Pay adjustments
  const defaultAdjustments: CallPayAdjustments = {
    weekendPremium: 0,
    majorHolidayPremium: 0,
    highValueHolidayPremium: 0,
    frequencyMultiplier: 0,
    acuityMultiplier: 0,
    applyToMarketData: false
  };

  const [callPayAdjustments, setCallPayAdjustments] = useState<CallPayAdjustments>(defaultAdjustments);

  // Market data and calculations
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [percentiles, setPercentiles] = useState<UserPercentiles>({ 
    tcc: null, 
    wrvu: null, 
    cf: null,
    callPay: null
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
  const [availableCallPaySpecialties, setAvailableCallPaySpecialties] = useState<string[]>([]);
  const [availableCallPaySurveySources, setAvailableCallPaySurveySources] = useState<string[]>([]);

  // Memoized calculations
  const tcc = useMemo(() => calculateTotalTCC(compComponents), [compComponents]);
  const tccFTEAdjusted = useMemo(() => applyFTEAdjustment(tcc, filters.fte), [tcc, filters.fte]);
  const wrvusFTEAdjusted = useMemo(() => applyFTEAdjustment(Number(wrvus), filters.fte), [wrvus, filters.fte]);
  
  // Calculate adjusted Call Pay value based on adjustment settings
  const callPayBaseValue = useMemo(() => Number(callPay) || 0, [callPay]);
  const callPayAdjustedValue = useMemo(() => {
    if (callPayBaseValue === 0) return 0;
    return callPayAdjustments.applyToMarketData 
      ? callPayBaseValue 
      : applyCallPayAdjustmentsToValue(callPayBaseValue, callPayAdjustments);
  }, [callPayBaseValue, callPayAdjustments]);
  const callPayFTEAdjusted = useMemo(() => applyFTEAdjustment(callPayAdjustedValue, filters.fte), [callPayAdjustedValue, filters.fte]);

  /**
   * Calculates filter values with cascading logic
   * Options are filtered based on currently selected filters to show only valid combinations
   */
  const calculateFilterValues = useCallback(async (currentFilters?: FMVFilters) => {
    try {
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

      // CRITICAL: Apply cascading filters to show only valid options
      // Start with all data, then filter progressively based on selected filters
      let cascadingData = allData;
      
      // If survey source is selected, filter by it first (most restrictive)
      if (currentFilters?.surveySource && currentFilters.surveySource !== 'All Sources') {
        cascadingData = cascadingData.filter(row => row.surveySource === currentFilters.surveySource);
        console.log('🔍 FMV Cascading: Filtered by survey source', {
          surveySource: currentFilters.surveySource,
          rowsAfterFilter: cascadingData.length
        });
      }
      
      // If year is selected, filter by year
      if (currentFilters?.year && currentFilters.year !== 'All Years') {
        cascadingData = cascadingData.filter(row => row.surveyYear === currentFilters.year);
        console.log('🔍 FMV Cascading: Filtered by year', {
          year: currentFilters.year,
          rowsAfterFilter: cascadingData.length
        });
      }
      
      // If specialty is selected, filter by specialty
      if (currentFilters?.specialty && currentFilters.specialty !== '') {
        const normalizeForSpecialtyMatch = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
        const normalizedFilter = normalizeForSpecialtyMatch(currentFilters.specialty);
        cascadingData = cascadingData.filter(row => {
          const rowSpecialty = row.standardizedName || row.surveySpecialty || '';
          const normalizedRow = normalizeForSpecialtyMatch(rowSpecialty);
          return normalizedRow === normalizedFilter;
        });
        console.log('🔍 FMV Cascading: Filtered by specialty', {
          specialty: currentFilters.specialty,
          rowsAfterFilter: cascadingData.length
        });
      }
      
      // If provider type is selected, filter by provider type
      if (currentFilters?.providerType && currentFilters.providerType !== 'All Types') {
        const normalizeForComparison = (str: string) => str
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        cascadingData = cascadingData.filter(row => {
          const rowProviderType = row.providerType || '';
          return normalizeForComparison(rowProviderType) === normalizeForComparison(currentFilters.providerType);
        });
        console.log('🔍 FMV Cascading: Filtered by provider type', {
          providerType: currentFilters.providerType,
          rowsAfterFilter: cascadingData.length
        });
      }
      
      // If region is selected, filter by region
      if (currentFilters?.region && currentFilters.region !== 'All Regions') {
        const normalizeForComparison = (str: string) => str
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        cascadingData = cascadingData.filter(row => {
          const rowRegion = row.geographicRegion || '';
          return normalizeForComparison(rowRegion) === normalizeForComparison(currentFilters.region);
        });
        console.log('🔍 FMV Cascading: Filtered by region', {
          region: currentFilters.region,
          rowsAfterFilter: cascadingData.length
        });
      }
      
      // Extract unique values from cascading-filtered data
      const specialtySet = new Set<string>();
      const providerTypeSet = new Set<string>();
      const regionSet = new Set<string>();
      const surveySourceSet = new Set<string>();
      const yearSet = new Set<string>();
      
      // Extract unique values from cascading data
      cascadingData.forEach(row => {
        if (row.standardizedName) specialtySet.add(row.standardizedName);
        if (row.providerType) providerTypeSet.add(row.providerType);
        if (row.geographicRegion) regionSet.add(row.geographicRegion);
        if (row.surveySource) surveySourceSet.add(row.surveySource);
        if (row.surveyYear) yearSet.add(row.surveyYear);
      });
      
      // CRITICAL: Survey sources should always show ALL options (not cascading)
      // This allows users to switch survey sources easily
      const allSurveySources = new Set<string>();
      allData.forEach(row => {
        if (row.surveySource) allSurveySources.add(row.surveySource);
      });
      
      // Use all specialties - don't filter out valid specialties like "General Pediatrics"
      // Only filter out very specific procedure names that are clearly not specialties
      const allSpecialties = Array.from(specialtySet).filter(specialty => {
        const lowerSpecialty = specialty.toLowerCase();
        
        // Only exclude very specific procedure names that are clearly not specialties
        const isSpecificProcedure = (
          (lowerSpecialty.includes('procedure') && !lowerSpecialty.includes('specialty')) ||
          (lowerSpecialty.includes('surgery') && !lowerSpecialty.includes('general') && !lowerSpecialty.includes('specialty')) ||
          (lowerSpecialty.includes('treatment') && !lowerSpecialty.includes('specialty')) ||
          (lowerSpecialty.includes('therapy') && !lowerSpecialty.includes('specialty'))
        );
        
        // Return true for valid specialties (keep all specialties, even pediatric ones)
        return !isSpecificProcedure;
      }).sort();
      
      // Normalize and deduplicate provider types (case-insensitive, title case)
      const providerTypeMap = new Map<string, string>(); // Maps lowercase to properly formatted
      providerTypeSet.forEach(providerType => {
        if (providerType && providerType.trim()) {
          const lower = providerType.toLowerCase().trim();
          if (!providerTypeMap.has(lower)) {
            // Format to title case: "staff physician" -> "Staff Physician"
            const formatted = providerType
              .split(/\s+/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            providerTypeMap.set(lower, formatted);
          }
        }
      });
      const normalizedProviderTypes = Array.from(providerTypeMap.values()).sort();

      // Normalize and deduplicate regions (case-insensitive, title case)
      const regionMap = new Map<string, string>(); // Maps lowercase to properly formatted
      regionSet.forEach(region => {
        if (region && region.trim()) {
          const lower = region.toLowerCase().trim();
          if (!regionMap.has(lower)) {
            // Format to title case: "northeast" -> "Northeast", "national" -> "National"
            const formatted = region
              .split(/\s+/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            regionMap.set(lower, formatted);
          }
        }
      });
      const normalizedRegions = Array.from(regionMap.values()).sort();

      // Convert Sets to Arrays and sort
      const result: UniqueFilterValues = {
        specialties: allSpecialties,
        providerTypes: normalizedProviderTypes,
        regions: normalizedRegions,
        surveySources: Array.from(allSurveySources).sort(), // Always show all survey sources
        years: Array.from(yearSet).sort()
      };
      
      console.log('🔍 FMV Cascading Filter Results:', {
        surveySource: currentFilters?.surveySource || 'All Sources',
        specialties: allSpecialties.length,
        providerTypes: normalizedProviderTypes.length,
        regions: normalizedRegions.length,
        years: Array.from(yearSet).length,
        sampleRegions: normalizedRegions.slice(0, 5)
      });
      
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
   * Now uses cascading logic - options update based on current filter selections
   */
  const fetchUniqueValues = useCallback(async () => {
    try {
      // Generate filter options with cascading logic based on current filters
      const filterValues = await calculateFilterValues(filters);
      setUniqueValues(filterValues);
    } catch (err) {
      setError('Failed to load filter options');
    }
  }, [calculateFilterValues, filters]);

  /**
   * Process market data with current filters (extracted for reuse)
   */
  const processMarketData = useCallback(async (allData: any[]) => {
    console.log('🔍 FMV processMarketData: Starting with', allData.length, 'total rows');
    
    if (allData.length === 0) {
      setMarketData(null);
      setPercentiles({ tcc: null, wrvu: null, cf: null, callPay: null });
      return;
    }

    // Track filtering stages for comprehensive logging
    let afterSummaryFilter = 0;
    let afterCallPayFilter = 0;
    let afterSpecialtyFilter = 0;
    let afterSurveySourceFilter = 0;
    let afterProviderTypeFilter = 0;
    let afterRegionFilter = 0;
    let afterYearFilter = 0;
    
    // Sample rows for debugging
    const sampleRows: any[] = [];
    const callPayDetectionResults: Array<{method: string, count: number, sample: any}> = [];

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
      
      afterSummaryFilter++;

      // Call Pay filter: When comparing Call Pay, only include Call Pay surveys
      if (compareType === 'CallPay') {
        const rowDataCategory = (row as any).dataCategory;
        const surveySource = row.surveySource || '';
        const surveySourceLower = surveySource.toLowerCase();
        const variables = (row as any).variables || {};
        
        // CRITICAL FIX: Check for Call Pay data in multiple ways:
        // 1. dataCategory flag
        // 2. Survey source name contains "call pay"
        // 3. Row has Call Pay variables (on_call_compensation, etc.) - MOST IMPORTANT
        // Check for all possible Call Pay variable names for robustness
        const hasCallPayVariables = !!(
          variables.on_call_compensation ||
          variables.oncall_compensation ||
          variables.daily_rate_on_call ||
          variables.daily_rate_oncall ||
          variables.call_pay ||
          variables.callpay
        );
        
        // Determine which detection method matched
        let detectionMethod = 'none';
        if (rowDataCategory === 'CALL_PAY') {
          detectionMethod = 'dataCategory';
        } else if (surveySourceLower.includes('call pay') || surveySourceLower.includes('callpay')) {
          detectionMethod = 'surveySource';
        } else if (hasCallPayVariables) {
          detectionMethod = 'variables';
        }
        
        const isCallPayRow = 
          rowDataCategory === 'CALL_PAY' || 
          surveySourceLower.includes('call pay') ||
          surveySourceLower.includes('callpay') ||
          hasCallPayVariables; // KEY FIX: Include rows with Call Pay variables even if survey name doesn't say "Call Pay"
        
        if (!isCallPayRow) {
          return false;
        }
        
        afterCallPayFilter++;
        
        // Track detection methods for logging
        if (!callPayDetectionResults.find(r => r.method === detectionMethod)) {
          callPayDetectionResults.push({ method: detectionMethod, count: 0, sample: null });
        }
        const methodResult = callPayDetectionResults.find(r => r.method === detectionMethod);
        if (methodResult) {
          methodResult.count++;
          if (!methodResult.sample && sampleRows.length < 3) {
            methodResult.sample = {
              surveySource,
              dataCategory: rowDataCategory,
              specialty: row.standardizedName || row.surveySpecialty,
              hasVariables: !!variables,
              variablesKeys: Object.keys(variables),
              hasCallPayVars: hasCallPayVariables
            };
          }
        }
      } else {
        // Not Call Pay comparison, skip Call Pay filter
        afterCallPayFilter++;
      }
      
      // Specialty filter - use fuzzy matching to handle word order variations
      // e.g., "General Pediatrics" should match "Pediatrics: General" or "Pediatrics General"
      if (filters.specialty && filters.specialty !== '') {
        const rowSpecialty = row.standardizedName || row.surveySpecialty || '';
        // Use flexible word matching for specialty (order-independent)
        const normalizeForSpecialtyMatch = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
        const normalizedFilter = normalizeForSpecialtyMatch(filters.specialty);
        const normalizedRow = normalizeForSpecialtyMatch(rowSpecialty);
        
        // Split into words and check if all filter words exist in row specialty
        const filterWords = normalizedFilter.split(/\s+/).filter(w => w.length >= 2);
        const rowWords = normalizedRow.split(/\s+/).filter(w => w.length >= 2);
        
        let matches = false;
        
        // Exact match
        if (normalizedFilter === normalizedRow) {
          matches = true;
        } else if (filterWords.length > 0) {
          // Check if all filter words are present in row (order-independent)
          const allWordsMatch = filterWords.every(filterWord => 
            rowWords.some(rowWord => 
              rowWord.includes(filterWord) || filterWord.includes(rowWord)
            )
          );
          matches = allWordsMatch;
        } else {
          // Fallback: exact normalized match
          matches = normalizedFilter === normalizedRow;
        }
        
        if (!matches) {
          // Store sample of filtered rows for logging (limit to avoid spam)
          if (compareType === 'CallPay' && filters.specialty.toLowerCase().includes('pediatric') && sampleRows.length < 5) {
            sampleRows.push({
              filterSpecialty: filters.specialty,
              rowStandardizedName: row.standardizedName,
              rowSurveySpecialty: row.surveySpecialty,
              normalizedFilter,
              normalizedRow,
              filterWords,
              rowWords,
              surveySource: row.surveySource,
              dataCategory: (row as any).dataCategory
            });
          }
          return false;
        }
      }
      
      afterSpecialtyFilter++;
      
      // Survey source filter (exclude "All Sources")
      if (filters.surveySource && filters.surveySource !== '' && filters.surveySource !== 'All Sources' && row.surveySource !== filters.surveySource) {
        return false;
      }
      
      afterSurveySourceFilter++;
      
      // Helper function to normalize strings for comparison
      const normalizeForComparison = (str: string) => str
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Provider type filter (exclude "All Types") - use case-insensitive matching
      if (filters.providerType && filters.providerType !== '' && filters.providerType !== 'All Types') {
        const rowProviderType = row.providerType || '';
        if (normalizeForComparison(rowProviderType) !== normalizeForComparison(filters.providerType)) {
          return false;
        }
      }
      
      afterProviderTypeFilter++;
      
      // Geographic region filter - use case-insensitive matching
      if (filters.region && filters.region !== '' && filters.region !== 'All Regions') {
        const rowRegion = row.geographicRegion || '';
        if (normalizeForComparison(rowRegion) !== normalizeForComparison(filters.region)) {
          return false;
        }
      }
      
      afterRegionFilter++;
      
      // Year filter (exclude "All Years")
      if (filters.year && filters.year !== '' && filters.year !== 'All Years' && row.surveyYear !== filters.year) {
        return false;
      }
      
      afterYearFilter++;
      
      return true;
    });

    setSurveyCount(filteredData.length);

    // Comprehensive debug logging
    console.log('🔍 FMV Filtering Results:', {
      totalRowsLoaded: allData.length,
      afterSummaryFilter: afterSummaryFilter,
      afterCallPayFilter: compareType === 'CallPay' ? afterCallPayFilter : 'N/A (not Call Pay)',
      afterSpecialtyFilter: filters.specialty ? afterSpecialtyFilter : 'N/A (no specialty filter)',
      afterSurveySourceFilter: filters.surveySource && filters.surveySource !== 'All Sources' ? afterSurveySourceFilter : 'N/A',
      afterProviderTypeFilter: filters.providerType && filters.providerType !== 'All Types' ? afterProviderTypeFilter : 'N/A',
      afterRegionFilter: filters.region && filters.region !== 'All Regions' ? afterRegionFilter : 'N/A',
      afterYearFilter: filters.year && filters.year !== 'All Years' ? afterYearFilter : 'N/A',
      finalFilteredRows: filteredData.length,
      activeFilters: {
        specialty: filters.specialty || 'None',
        providerType: filters.providerType || 'None',
        region: filters.region || 'None',
        surveySource: filters.surveySource || 'None',
        year: filters.year || 'None',
        compareType
      }
    });

    // Call Pay specific debug logging and store available data for error messages
    if (compareType === 'CallPay') {
      const availableSpecialties = [...new Set(allData
        .filter((r: any) => {
          const cat = (r as any).dataCategory;
          const src = r.surveySource || '';
          const vars = (r as any).variables || {};
          return cat === 'CALL_PAY' || 
                 src.toLowerCase().includes('call pay') ||
                 !!(vars.on_call_compensation || vars.oncall_compensation || vars.daily_rate_on_call || vars.daily_rate_oncall);
        })
        .map((r: any) => r.standardizedName || r.surveySpecialty || 'Unknown')
        .filter((s: string) => s && s !== 'Unknown')
      )].sort();
      
      const availableSources = [...new Set(allData
        .filter((r: any) => {
          const cat = (r as any).dataCategory;
          const src = r.surveySource || '';
          const vars = (r as any).variables || {};
          return cat === 'CALL_PAY' || 
                 src.toLowerCase().includes('call pay') ||
                 !!(vars.on_call_compensation || vars.oncall_compensation || vars.daily_rate_on_call || vars.daily_rate_oncall);
        })
        .map((r: any) => r.surveySource)
        .filter((s: string) => s)
      )].sort();
      
      // Store for use in error messages
      setAvailableCallPaySpecialties(availableSpecialties);
      setAvailableCallPaySurveySources(availableSources);
      
      console.log('🔍 FMV Call Pay Filtering Details:', {
        callPayDetectionMethods: callPayDetectionResults,
        sampleRowsFilteredBySpecialty: sampleRows.length > 0 ? sampleRows : 'None (all passed specialty filter)',
        availableCallPaySpecialties: availableSpecialties,
        availableCallPaySurveySources: availableSources,
        sampleFilteredRows: filteredData.slice(0, 3).map((r: any) => ({
          surveySource: r.surveySource,
          standardizedName: r.standardizedName,
          surveySpecialty: r.surveySpecialty,
          dataCategory: (r as any).dataCategory,
          hasVariables: !!(r as any).variables,
          variablesKeys: (r as any).variables ? Object.keys((r as any).variables) : []
        }))
      });
      
      if (sampleRows.length > 0) {
        console.log('⚠️ FMV Specialty Filter: Sample rows that failed specialty match:', sampleRows);
      }
    } else {
      // Clear available Call Pay data when not in Call Pay mode
      setAvailableCallPaySpecialties([]);
      setAvailableCallPaySurveySources([]);
    }

    if (filteredData.length === 0) {
      setMarketData(null);
      setPercentiles({ tcc: null, wrvu: null, cf: null, callPay: null });
      setSurveyCount(0);
      if (compareType === 'CallPay') {
        console.warn('⚠️ FMV Call Pay: No Call Pay survey data found. Make sure you have Call Pay surveys uploaded with dataCategory="CALL_PAY"');
      }
      return;
    }

    // Convert AnalyticsDataService format to FMV format
    // Check if this is Call Pay data to extract call pay percentiles
    const isCallPayData = compareType === 'CallPay';
    
    const normalizedRows: NormalizedSurveyRow[] = filteredData.map((row, index) => {
      // For Call Pay surveys, check if call pay specific columns exist or use TCC structure
      const rowDataCategory = (row as any).dataCategory;
      const isCallPayRow = rowDataCategory === 'CALL_PAY' || 
                          (!rowDataCategory && row.surveySource && 
                           row.surveySource.toLowerCase().includes('call pay'));
      
      // CRITICAL FIX: Extract Call Pay data from variable-based structure
      // Call Pay surveys use "Daily Rate On-Call Compensation" variable stored in variables.on_call_compensation
      // When using getAnalyticsDataByVariables(), data comes as DynamicAggregatedData[] with variables structure
      let callPayMetrics = {
        n_orgs: (row as any).callPay_n_orgs || 0,
        n_incumbents: (row as any).callPay_n_incumbents || 0,
        p25: (row as any).callPay_p25 || 0,
        p50: (row as any).callPay_p50 || 0,
        p75: (row as any).callPay_p75 || 0,
        p90: (row as any).callPay_p90 || 0,
      };
      
      let extractionMethod = 'direct_callPay_fields';
      
      // CRITICAL FIX: For Call Pay data, prioritize extracting from variables structure
      // This handles DynamicAggregatedData[] from getAnalyticsDataByVariables()
      if (isCallPayData && (row as any).variables) {
        const variables = (row as any).variables;
        // Check for on_call_compensation variable (normalized from "Daily Rate On-Call Compensation")
        // Try multiple possible variable names for robustness
        const onCallVar = variables.on_call_compensation || 
                        variables.oncall_compensation || 
                        variables.daily_rate_on_call ||
                        variables.daily_rate_oncall ||
                        variables.call_pay ||
                        variables.callpay;
        
        if (onCallVar && onCallVar.p50 > 0) {
          // Use variables structure if it has valid data
          callPayMetrics = {
            n_orgs: onCallVar.n_orgs || 0,
            n_incumbents: onCallVar.n_incumbents || 0,
            p25: onCallVar.p25 || 0,
            p50: onCallVar.p50 || 0,
            p75: onCallVar.p75 || 0,
            p90: onCallVar.p90 || 0,
          };
          extractionMethod = 'variables_structure';
          
          // Debug logging for Call Pay extraction (limit to avoid spam)
          if (index < 3 || callPayMetrics.p50 > 0) {
            console.log('✅ FMV: Extracted Call Pay from variables:', {
              surveySource: row.surveySource,
              specialty: row.standardizedName,
              variableKey: onCallVar.variableName || Object.keys(variables).find(k => 
                k.toLowerCase().includes('call') || k.toLowerCase().includes('oncall')
              ) || 'on_call_compensation',
              metrics: callPayMetrics,
              extractionMethod,
              allVariableKeys: Object.keys(variables)
            });
          }
        } else if (isCallPayRow && callPayMetrics.p50 === 0) {
          // If variables exist but no Call Pay variable found, try fallback to TCC
          callPayMetrics = {
            n_orgs: row.tcc_n_orgs || 0,
            n_incumbents: row.tcc_n_incumbents || 0,
            p25: row.tcc_p25 || 0,
            p50: row.tcc_p50 || 0,
            p75: row.tcc_p75 || 0,
            p90: row.tcc_p90 || 0,
          };
          extractionMethod = 'tcc_fallback_no_callpay_variable';
          
          if (index < 3) {
            console.log('⚠️ FMV: Call Pay row has variables but no Call Pay variable, using TCC fallback:', {
              surveySource: row.surveySource,
              specialty: row.standardizedName,
              availableVariables: Object.keys(variables),
              tccMetrics: {
                p25: row.tcc_p25,
                p50: row.tcc_p50,
                p75: row.tcc_p75,
                p90: row.tcc_p90
              },
              extractionMethod
            });
          }
        }
      } else if (isCallPayRow && callPayMetrics.p50 === 0 && (row as any).variables) {
        // Legacy path: If direct fields are zero but variables exist, try extracting from variables
        const variables = (row as any).variables;
        const onCallVar = variables.on_call_compensation || 
                        variables.oncall_compensation || 
                        variables.daily_rate_on_call ||
                        variables.daily_rate_oncall;
        
        if (onCallVar) {
          callPayMetrics = {
            n_orgs: onCallVar.n_orgs || 0,
            n_incumbents: onCallVar.n_incumbents || 0,
            p25: onCallVar.p25 || 0,
            p50: onCallVar.p50 || 0,
            p75: onCallVar.p75 || 0,
            p90: onCallVar.p90 || 0,
          };
          extractionMethod = 'variables_structure_legacy';
        } else {
          // Fallback to TCC structure if no variable found
          callPayMetrics = {
            n_orgs: row.tcc_n_orgs || 0,
            n_incumbents: row.tcc_n_incumbents || 0,
            p25: row.tcc_p25 || 0,
            p50: row.tcc_p50 || 0,
            p75: row.tcc_p75 || 0,
            p90: row.tcc_p90 || 0,
          };
          extractionMethod = 'tcc_fallback_no_variables';
        }
      } else if (isCallPayRow && callPayMetrics.p50 === 0) {
        // Fallback to TCC structure for Call Pay surveys without variables structure
        callPayMetrics = {
          n_orgs: row.tcc_n_orgs || 0,
          n_incumbents: row.tcc_n_incumbents || 0,
          p25: row.tcc_p25 || 0,
          p50: row.tcc_p50 || 0,
          p75: row.tcc_p75 || 0,
          p90: row.tcc_p90 || 0,
        };
        extractionMethod = 'tcc_fallback_no_structure';
        
        if (isCallPayData && index < 3) {
          console.log('⚠️ FMV: Call Pay row has no direct fields or variables, using TCC fallback:', {
            surveySource: row.surveySource,
            specialty: row.standardizedName,
            hasVariables: !!(row as any).variables,
            tccMetrics: {
              p25: row.tcc_p25,
              p50: row.tcc_p50,
              p75: row.tcc_p75,
              p90: row.tcc_p90
            },
            extractionMethod
          });
        }
      }
      
      // Log extraction summary for first few rows
      if (isCallPayData && index < 3) {
        console.log('🔍 FMV Call Pay Extraction Summary:', {
          rowIndex: index,
          surveySource: row.surveySource,
          specialty: row.standardizedName,
          extractionMethod,
          callPayMetrics: {
            n_orgs: callPayMetrics.n_orgs,
            n_incumbents: callPayMetrics.n_incumbents,
            p50: callPayMetrics.p50,
            p75: callPayMetrics.p75
          }
        });
      }
      
      return {
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
        // Call Pay metrics - extracted from variables or TCC structure
        callPay_n_orgs: callPayMetrics.n_orgs,
        callPay_n_incumbents: callPayMetrics.n_incumbents,
        callPay_p25: callPayMetrics.p25,
        callPay_p50: callPayMetrics.p50,
        callPay_p75: callPayMetrics.p75,
        callPay_p90: callPayMetrics.p90,
      };
    });

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
        cf: blendedMarketData.blendedPercentiles.cf,
        callPay: blendedMarketData.blendedPercentiles.callPay
      };
      
      // Apply Call Pay adjustments to blended market data if configured
      if (compareType === 'CallPay' && calculatedMarketData.callPay && callPayAdjustments.applyToMarketData) {
        calculatedMarketData.callPay = applyCallPayAdjustments(calculatedMarketData.callPay, callPayAdjustments);
      }
      
      // Calculate user percentiles using blended data
      const calculatedPercentiles = calculateUserPercentiles(
        calculatedMarketData,
        tccFTEAdjusted,
        wrvusFTEAdjusted,
        Number(cf),
        compareType === 'CallPay' ? callPayFTEAdjusted : undefined
      );

      setMarketData(calculatedMarketData);
      setPercentiles(calculatedPercentiles);
    } else {
      // Clear blended data when not using blending
      setBlendedData(null);
      
      // Calculate market data using the normalized rows with the selected aggregation method
      let calculatedMarketData = calculateMarketData(normalizedRows, filters.aggregationMethod);

      // Apply Call Pay adjustments to market data if configured
      if (compareType === 'CallPay' && calculatedMarketData.callPay && callPayAdjustments.applyToMarketData) {
        calculatedMarketData = {
          ...calculatedMarketData,
          callPay: applyCallPayAdjustments(calculatedMarketData.callPay, callPayAdjustments)
        };
      }

      // Calculate user percentiles
      const calculatedPercentiles = calculateUserPercentiles(
        calculatedMarketData,
        tccFTEAdjusted,
        wrvusFTEAdjusted,
        Number(cf),
        compareType === 'CallPay' ? callPayFTEAdjusted : undefined
      );

      setMarketData(calculatedMarketData);
      setPercentiles(calculatedPercentiles);
    }
  }, [filters, tccFTEAdjusted, wrvusFTEAdjusted, cf, compareType, callPayFTEAdjusted, callPayAdjustments]);

  /**
   * Fetches and calculates market data based on current filters
   */
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first for all data
      // CRITICAL FIX: For Call Pay, we need DynamicAggregatedData[] with variables structure
      // Don't use cache if it might have the wrong data type (AggregatedData[] vs DynamicAggregatedData[])
      // We can detect this by checking if the first row has a 'variables' property
      if (fmvCache.hasFreshData()) {
        const cachedData = fmvCache.getCachedData();
        if (cachedData && cachedData.length > 0) {
          const hasVariablesStructure = !!(cachedData[0] as any).variables;
          const needsVariablesStructure = compareType === 'CallPay';
          
          // Only use cache if data structure matches what we need
          if (hasVariablesStructure === needsVariablesStructure) {
            console.log('🚀 Using cached FMV market data (fast!)');
            // Process cached data with current filters
            await processMarketData(cachedData);
            return;
          } else {
            console.log('🔄 Cache has wrong data structure, fetching fresh data');
            // Clear cache to force fresh fetch
            fmvCache.clearCache();
          }
        }
      }
      
      // Use the same AnalyticsDataService as Analytics screen
      // This benefits from shared IndexedDB cache and will benefit from TanStack Query
      // if benchmarking route is also open (data will be in memory cache)
      const analyticsDataService = new AnalyticsDataService();
      
      // CRITICAL FIX: For Call Pay, use getAnalyticsDataByVariables() to get data with variables structure
      // Call Pay data is stored in the variables object, which is only available in DynamicAggregatedData[]
      let allData: any[];
      if (compareType === 'CallPay') {
        console.log('🔍 FMV: Loading Call Pay data using getAnalyticsDataByVariables()');
        // Pass empty array to get all variables (including Call Pay)
        allData = await analyticsDataService.getAnalyticsDataByVariables({
          specialty: '',
          surveySource: '',
          geographicRegion: '',
          providerType: '',
          year: ''
        }, []); // Empty array means get all variables
      } else {
        // For TCC, wRVUs, CF, use the standard getAnalyticsData() method
        allData = await analyticsDataService.getAnalyticsData({
          specialty: '',
          surveySource: '',
          geographicRegion: '',
          providerType: '',
          year: ''
        });
      }
      
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
  }, [processMarketData, compareType]);

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
    setCallPay('');
    setCallPayAdjustments(defaultAdjustments);
    setCompareType('TCC');
  }, [resetFilters, clearCompComponents]);

  // Load unique values on mount and when filters change (cascading behavior)
  useEffect(() => {
    fetchUniqueValues();
  }, [fetchUniqueValues, filters.surveySource, filters.year, filters.specialty, filters.providerType, filters.region]);

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
    callPay,
    callPayAdjustments,
    compareType,
    marketData,
    percentiles,
    uniqueValues,
    loading,
    error,
    surveyCount,
    blendedData,
    availableCallPaySpecialties,
    availableCallPaySurveySources,
    
    // Calculated values
    tcc,
    tccFTEAdjusted,
    wrvusFTEAdjusted,
    callPayFTEAdjusted,
    
    // Actions
    updateFilters,
    setCompComponents,
    setWRVUs,
    setCF,
    setCallPay,
    setCallPayAdjustments,
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
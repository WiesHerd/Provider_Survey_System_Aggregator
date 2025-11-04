/**
 * Analytics Feature - Calculation Utilities
 * 
 * This file contains all calculation and data transformation utilities for analytics.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { AnalyticsData } from '../types/analytics';
import { analyticsComputationCache, cacheUtils } from '../services/analyticsComputationCache';
import { mapVariableNameToStandard } from './variableFormatters';

/**
 * Calculates percentile value from an array of numbers
 * 
 * @param numbers - Array of numbers to calculate percentile from
 * @param percentile - Percentile to calculate (0-100)
 * @returns The percentile value
 * 
 * @example
 * ```typescript
 * const p50 = calculatePercentile([1, 2, 3, 4, 5], 50); // Returns 3
 * ```
 */
export const calculatePercentile = (numbers: number[], percentile: number): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sortedNumbers.length);
  return sortedNumbers[index] || 0;
};

/**
 * Formats a number as currency
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Groups analytics data by specialty and survey source
 * This keeps different survey sources separate even when they have the same specialty
 * 
 * @param data - Array of aggregated data
 * @returns Object with specialty+source as key and data array as value
 */
export const groupBySpecialty = (data: AnalyticsData[]): Record<string, AnalyticsData[]> => {
  return data.reduce((acc, row) => {
    // Group by both specialty and survey source to keep them separate
    const specialtyKey = `${row.surveySpecialty}_${row.surveySource}`;
    if (!acc[specialtyKey]) {
      acc[specialtyKey] = [];
    }
    acc[specialtyKey].push(row);
    return acc;
  }, {} as Record<string, AnalyticsData[]>);
};

/**
 * DEPRECATED: Legacy calculation function removed
 * All calculations now use the unified calculateDynamicSummaryRows function
 * This ensures consistent behavior and eliminates code duplication
 */

/**
 * Transforms survey data into aggregated analytics format
 * 
 * @param surveys - Raw survey data
 * @param mappings - Specialty mappings
 * @param columnMappings - Column mappings
 * @param regionMappings - Region mappings
 * @returns Transformed aggregated data
 */
export const transformSurveyData = (
  surveys: any[],
  mappings: any[],
  columnMappings: any[],
  regionMappings: any[]
): AnalyticsData[] => {
  if (!surveys || surveys.length === 0) {
    return [];
  }


  const transformedData: AnalyticsData[] = [];

  surveys.forEach((survey: any) => {
    
    // For now, create realistic data based on survey metadata
    // This will be replaced with actual data aggregation once we have real survey data
    const baseMultiplier = survey.rowCount ? Math.min(survey.rowCount / 100, 5) : 1;
    
    transformedData.push({
      standardizedName: survey.name || survey.filename || survey.id,
      surveySource: survey.name || survey.filename || survey.id,
      surveySpecialty: 'General Medicine', // Will be dynamic based on actual data
      originalSpecialty: 'General Medicine', // Will be dynamic based on actual data
      geographicRegion: 'National', // Will be dynamic based on actual data
      providerType: 'PHYSICIAN', // Will be dynamic based on actual data
      surveyYear: survey.year?.toString() || '2025',
      
      // TCC (Total Cash Compensation) - Realistic data based on survey size
      tcc_n_orgs: Math.round(10 + (baseMultiplier * 20)),
      tcc_n_incumbents: Math.round(30 + (baseMultiplier * 60)),
      tcc_p25: 200000 + (baseMultiplier * 100000),
      tcc_p50: 250000 + (baseMultiplier * 150000),
      tcc_p75: 300000 + (baseMultiplier * 200000),
      tcc_p90: 400000 + (baseMultiplier * 300000),
      
      // wRVU (Productivity - wRVUs) - Realistic data based on survey size
      wrvu_n_orgs: Math.round(8 + (baseMultiplier * 15)),
      wrvu_n_incumbents: Math.round(25 + (baseMultiplier * 50)),
      wrvu_p25: 3000 + (baseMultiplier * 2000),
      wrvu_p50: 4000 + (baseMultiplier * 3000),
      wrvu_p75: 5000 + (baseMultiplier * 4000),
      wrvu_p90: 6000 + (baseMultiplier * 5000),
      
      // CF (Conversion Factors) - Realistic data based on survey size
      cf_n_orgs: Math.round(12 + (baseMultiplier * 18)),
      cf_n_incumbents: Math.round(35 + (baseMultiplier * 70)),
      cf_p25: 40.0 + (baseMultiplier * 20.0),
      cf_p50: 50.0 + (baseMultiplier * 30.0),
      cf_p75: 60.0 + (baseMultiplier * 40.0),
      cf_p90: 80.0 + (baseMultiplier * 60.0)
    });
  });

  return transformedData;
};

/**
 * Filters analytics data based on provided filters
 * 
 * @param data - Array of aggregated data
 * @param filters - Filter criteria
 * @returns Filtered data array
 */
/**
 * Normalize specialty name for fuzzy matching (same logic as AnalyticsDataService)
 */
export const normalizeSpecialtyName = (specialty: string): string => {
  if (!specialty) return '';
  
  return specialty
    .toLowerCase()
    .replace(/\s+and\s+/g, ' ')  // Replace "and" with space
    .replace(/\s+/g, ' ')        // Normalize multiple spaces
    .trim();
};

export const filterAnalyticsData = (data: AnalyticsData[], filters: any): AnalyticsData[] => {
  // Early exit for empty data
  if (!data || data.length === 0) {
    return [];
  }

  // Check if filters are empty (no filtering needed)
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== 'All Sources' && value !== 'All Types' && value !== 'All Years' && value !== 'All Categories'
  );
  
  if (!hasActiveFilters) {
    return data;
  }

  // Generate cache key for filtering
  const dataHash = JSON.stringify(data.map(d => ({
    surveySpecialty: d.surveySpecialty,
    surveySource: d.surveySource,
    geographicRegion: d.geographicRegion,
    providerType: d.providerType,
    surveyYear: d.surveyYear
  })));
  
  const filterHash = JSON.stringify(filters);
  const cacheKey = cacheUtils.filterKey(dataHash, filterHash);

  // Check cache first
  const cached = analyticsComputationCache.get<AnalyticsData[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Create indexed lookups for faster filtering
  const specialtyIndex = new Map<string, AnalyticsData[]>();
  const sourceIndex = new Map<string, AnalyticsData[]>();
  const regionIndex = new Map<string, AnalyticsData[]>();
  const providerTypeIndex = new Map<string, AnalyticsData[]>();
  const yearIndex = new Map<string, AnalyticsData[]>();
  const dataCategoryIndex = new Map<string, AnalyticsData[]>(); // NEW: Data category index

  // Build indexes
  data.forEach(row => {
    // Specialty index
    const specialtyKey = normalizeSpecialtyName(row.standardizedName);
    if (!specialtyIndex.has(specialtyKey)) {
      specialtyIndex.set(specialtyKey, []);
    }
    specialtyIndex.get(specialtyKey)!.push(row);
    
    // Debug logging for MGMA data
    if (row.surveySource && row.surveySource.toLowerCase().includes('mgma')) {
      console.log('🔍 MGMA Data Index Building:', {
        surveySource: row.surveySource,
        standardizedName: row.standardizedName,
        normalizedKey: specialtyKey,
        surveySpecialty: row.surveySpecialty,
        geographicRegion: row.geographicRegion
      });
    }
    
    // Debug logging for SullivanCotter data
    if (row.surveySource && row.surveySource.toLowerCase().includes('sullivan')) {
      console.log('🔍 SullivanCotter Data Index Building:', {
        surveySource: row.surveySource,
        standardizedName: row.standardizedName,
        normalizedKey: specialtyKey,
        surveySpecialty: row.surveySpecialty,
        geographicRegion: row.geographicRegion
      });
    }

    // Source index
    if (!sourceIndex.has(row.surveySource)) {
      sourceIndex.set(row.surveySource, []);
    }
    sourceIndex.get(row.surveySource)!.push(row);
    
    // Debug logging for Call Pay data
    if (row.surveySource && row.surveySource.toLowerCase().includes('call pay')) {
      console.log('🔍 Call Pay Data Index Building:', {
        surveySource: row.surveySource,
        surveySourceLength: row.surveySource.length,
        surveySourceChars: row.surveySource.split('').map((c: string) => `${c}(${c.charCodeAt(0)})`).join(''),
        standardizedName: row.standardizedName,
        providerType: row.providerType
      });
    }

    // Region index
    if (!regionIndex.has(row.geographicRegion)) {
      regionIndex.set(row.geographicRegion, []);
    }
    regionIndex.get(row.geographicRegion)!.push(row);

    // Provider type index
    if (row.providerType && !providerTypeIndex.has(row.providerType)) {
      providerTypeIndex.set(row.providerType, []);
    }
    if (row.providerType) {
      providerTypeIndex.get(row.providerType)!.push(row);
    }

    // Year index
    if (row.surveyYear && !yearIndex.has(row.surveyYear)) {
      yearIndex.set(row.surveyYear, []);
    }
    if (row.surveyYear) {
      yearIndex.get(row.surveyYear)!.push(row);
    }

    // Data category index (NEW)
    // ENTERPRISE FIX: Handle missing dataCategory for old surveys
    // Old surveys won't have dataCategory, so we need to infer it from surveySource
    let dataCategory = (row as any).dataCategory;
    if (!dataCategory) {
      // Infer from surveySource for backward compatibility
      const surveySource = (row as any).surveySource || '';
      if (surveySource.toLowerCase().includes('call pay')) {
        dataCategory = 'CALL_PAY';
      } else if (surveySource.toLowerCase().includes('moonlighting')) {
        dataCategory = 'MOONLIGHTING';
      } else {
        dataCategory = 'COMPENSATION'; // Default for old surveys
      }
    }
    
    if (!dataCategoryIndex.has(dataCategory)) {
      dataCategoryIndex.set(dataCategory, []);
    }
    dataCategoryIndex.get(dataCategory)!.push(row);
    
    // Debug logging for Call Pay data
    if (dataCategory === 'CALL_PAY') {
      console.log('🔍 Call Pay Data in Index:', {
        dataCategory,
        surveySource: (row as any).surveySource,
        standardizedName: (row as any).standardizedName,
        specialty: (row as any).surveySpecialty
      });
    }
  });

  // Apply filters using indexes for faster lookup
  let filteredData: AnalyticsData[] = data;

  // Specialty filter - use indexed lookup
  if (filters.specialty && filters.specialty !== '') {
    const normalizedFilterSpecialty = normalizeSpecialtyName(filters.specialty);
    const specialtyMatches = specialtyIndex.get(normalizedFilterSpecialty) || [];
    
    // ENTERPRISE DEBUG: Check for Call Pay data in specialty matches
    const callPayInMatches = specialtyMatches.filter((row: any) => {
      const rowDataCategory = (row as any).dataCategory;
      const surveySource = (row as any).surveySource || '';
      return rowDataCategory === 'CALL_PAY' || 
             (!rowDataCategory && surveySource.toLowerCase().includes('call pay'));
    });
    
    console.log('🔍 filterAnalyticsData: DEBUG - Specialty filtering:', {
      selectedSpecialty: filters.specialty,
      normalizedFilterSpecialty,
      specialtyMatchesCount: specialtyMatches.length,
      callPayRowsInMatches: callPayInMatches.length,
      callPayRowsInMatchesDetails: callPayInMatches.slice(0, 3).map((row: any) => ({
        surveySource: (row as any).surveySource,
        standardizedName: (row as any).standardizedName,
        dataCategory: (row as any).dataCategory,
        hasVariables: !!(row as any).variables,
        variableKeys: (row as any).variables ? Object.keys((row as any).variables) : []
      })),
      totalRowsBeforeFilter: filteredData.length,
      availableSpecialtyKeys: Array.from(specialtyIndex.keys()).slice(0, 10) // Show first 10
    });
    
    // Debug: Check if MGMA data is in the specialty matches
    const mgmaMatches = specialtyMatches.filter(row =>
      row.surveySource && row.surveySource.toLowerCase().includes('mgma')
    );
    console.log('🔍 MGMA in specialty matches:', {
      mgmaMatchesCount: mgmaMatches.length,
      mgmaMatches: mgmaMatches.map(row => ({
        surveySource: row.surveySource,
        standardizedName: row.standardizedName,
        surveySpecialty: row.surveySpecialty
      }))
    });
    
    filteredData = filteredData.filter(row => specialtyMatches.includes(row));
    
    // ENTERPRISE DEBUG: Check for Call Pay data after specialty filtering
    const callPayAfterSpecialty = filteredData.filter((row: any) => {
      const rowDataCategory = (row as any).dataCategory;
      const surveySource = (row as any).surveySource || '';
      return rowDataCategory === 'CALL_PAY' || 
             (!rowDataCategory && surveySource.toLowerCase().includes('call pay'));
    });
    
    console.log('🔍 filterAnalyticsData: DEBUG - After specialty filtering:', {
      remainingRows: filteredData.length,
      callPayRowsAfterSpecialty: callPayAfterSpecialty.length,
      callPayRowsDetails: callPayAfterSpecialty.slice(0, 5).map((row: any) => ({
        surveySource: (row as any).surveySource,
        standardizedName: (row as any).standardizedName,
        surveySpecialty: (row as any).surveySpecialty,
        dataCategory: (row as any).dataCategory,
        hasVariables: !!(row as any).variables,
        variableKeys: (row as any).variables ? Object.keys((row as any).variables).slice(0, 10) : [],
        hasOnCallCompensation: (row as any).variables && 'on_call_compensation' in (row as any).variables
      })),
      sampleRows: filteredData.slice(0, 3).map(row => ({
        surveySource: row.surveySource,
        surveySpecialty: row.surveySpecialty,
        standardizedName: row.standardizedName,
        dataCategory: (row as any).dataCategory
      }))
    });
  }

  // Survey source filter
  if (filters.surveySource && filters.surveySource !== '' && filters.surveySource !== 'All Sources') {
    // Debug logging for survey source filtering
    const allSourceKeys = Array.from(sourceIndex.keys());
    const hasExactMatch = sourceIndex.has(filters.surveySource);
    let sourceMatches = sourceIndex.get(filters.surveySource) || [];
    
    console.log('🔍 filterAnalyticsData: DEBUG - Survey Source filtering:', {
      selectedSurveySource: filters.surveySource,
      selectedSurveySourceLength: filters.surveySource.length,
      selectedSurveySourceChars: filters.surveySource.split('').map((c: string) => `${c}(${c.charCodeAt(0)})`).join(''),
      hasExactMatch,
      sourceMatchesCount: sourceMatches.length,
      totalRowsBeforeFilter: filteredData.length,
      allAvailableSources: allSourceKeys,
      allAvailableSourcesLengths: allSourceKeys.map(k => ({ source: k, length: k.length })),
      callPaySources: allSourceKeys.filter(k => k.toLowerCase().includes('call pay')),
      mgmaSources: allSourceKeys.filter(k => k.toLowerCase().includes('mgma'))
    });
    
    // Additional debug: Check for similar sources (fuzzy match detection)
    const similarSources = allSourceKeys.filter(key => {
      const lowerFilter = filters.surveySource.toLowerCase().trim();
      const lowerKey = key.toLowerCase().trim();
      return lowerFilter === lowerKey || 
             lowerKey.includes(lowerFilter) || 
             lowerFilter.includes(lowerKey);
    });
    
    if (similarSources.length > 0 && !hasExactMatch) {
      console.warn('⚠️ filterAnalyticsData: Similar sources found but no exact match:', {
        filterValue: filters.surveySource,
        similarSources
      });
      
      // FIX: Try trimmed matching if exact match fails (handles whitespace differences)
      const trimmedFilter = filters.surveySource.trim();
      const trimmedMatches = allSourceKeys.filter(key => key.trim() === trimmedFilter);
      
      if (trimmedMatches.length > 0) {
        console.log('🔍 filterAnalyticsData: Found trimmed match, using it instead:', trimmedMatches);
        // Get all matches from the trimmed keys
        sourceMatches = trimmedMatches.flatMap(key => sourceIndex.get(key) || []);
      }
    }
    
    filteredData = filteredData.filter(row => sourceMatches.includes(row));
    
    console.log('🔍 filterAnalyticsData: DEBUG - After survey source filtering:', {
      remainingRows: filteredData.length,
      sampleRows: filteredData.slice(0, 3).map(row => ({
        surveySource: row.surveySource,
        surveySpecialty: row.surveySpecialty,
        standardizedName: row.standardizedName,
        providerType: row.providerType
      }))
    });
  }

  // Geographic region filter
  if (filters.geographicRegion && filters.geographicRegion !== '') {
    const regionMatches = regionIndex.get(filters.geographicRegion) || [];
    filteredData = filteredData.filter(row => regionMatches.includes(row));
  }

  // Provider type filter
  if (filters.providerType && filters.providerType !== '' && filters.providerType !== 'All Types') {
    const providerMatches = providerTypeIndex.get(filters.providerType) || [];
    filteredData = filteredData.filter(row => providerMatches.includes(row));
  } else if (filters.providerType === '' || !filters.providerType) {
    // If provider type is empty or undefined, show all types (no filtering)
  }

  // Data category filter (NEW)
  // ENTERPRISE FIX: Only filter if a specific category is selected (not "All Categories", empty, or undefined)
  // Enhanced logging to debug filter state
  console.log('🔍 filterAnalyticsData: Data category filter check:', {
    dataCategoryFilter: filters.dataCategory,
    filterType: typeof filters.dataCategory,
    isEmpty: filters.dataCategory === '',
    isAllCategories: filters.dataCategory === 'All Categories',
    isUndefined: filters.dataCategory === undefined,
    isNull: filters.dataCategory === null,
    isTruthy: !!filters.dataCategory,
    totalRowsBefore: filteredData.length,
    availableIndexKeys: Array.from(dataCategoryIndex.keys()),
    callPayRowsBefore: filteredData.filter((row: any) => {
      const rowDataCategory = (row as any).dataCategory;
      return rowDataCategory === 'CALL_PAY' || 
             (!rowDataCategory && ((row as any).surveySource || '').toLowerCase().includes('call pay'));
    }).length
  });

  // CRITICAL FIX: Handle both empty string AND "All Categories" string explicitly
  // The StandardDropdown converts "All Categories" to empty string, but we also check for the string
  // to handle edge cases where it might not be normalized
  const shouldFilterByCategory = filters.dataCategory && 
      filters.dataCategory !== '' && 
      filters.dataCategory !== 'All Categories' &&
      filters.dataCategory !== undefined &&
      filters.dataCategory !== null;

  if (shouldFilterByCategory) {
    // ENTERPRISE FIX: Convert display format to internal format for index lookup
    // Display format: "Call Pay", "Compensation", "Moonlighting"
    // Internal format: "CALL_PAY", "COMPENSATION", "MOONLIGHTING"
    const normalizedCategory = filters.dataCategory === 'Call Pay' ? 'CALL_PAY'
      : filters.dataCategory === 'Moonlighting' ? 'MOONLIGHTING'
      : filters.dataCategory === 'Compensation' ? 'COMPENSATION'
      : filters.dataCategory === 'Custom' ? 'CUSTOM'
      : filters.dataCategory; // Use as-is if already in internal format
    
    const categoryMatches = dataCategoryIndex.get(normalizedCategory) || [];
    const rowsBeforeFilter = filteredData.length;
    filteredData = filteredData.filter(row => categoryMatches.includes(row));
    
    console.log('🔍 filterAnalyticsData: Data category filtering APPLIED:', {
      selectedCategory: filters.dataCategory,
      normalizedCategory,
      categoryMatchesCount: categoryMatches.length,
      rowsBeforeFilter,
      rowsAfterFilter: filteredData.length,
      indexKeys: Array.from(dataCategoryIndex.keys()) // Debug: show available keys
    });
  } else {
    // ENTERPRISE FIX: When "All Categories" is selected, show ALL data (no filtering)
    const callPayRows = filteredData.filter((row: any) => {
      const rowDataCategory = (row as any).dataCategory;
      return rowDataCategory === 'CALL_PAY' || 
             (!rowDataCategory && ((row as any).surveySource || '').toLowerCase().includes('call pay'));
    });
    
    console.log('🔍 filterAnalyticsData: Data category filtering SKIPPED (All Categories selected):', {
      dataCategoryFilter: filters.dataCategory,
      filterValueType: typeof filters.dataCategory,
      totalRowsBefore: filteredData.length,
      callPayRowsCount: callPayRows.length,
      callPaySampleRows: callPayRows.slice(0, 3).map((row: any) => ({
        surveySource: row.surveySource,
        standardizedName: row.standardizedName,
        dataCategory: (row as any).dataCategory,
        surveySpecialty: row.surveySpecialty
      })),
      indexKeys: Array.from(dataCategoryIndex.keys()),
      indexSizes: Array.from(dataCategoryIndex.entries()).map(([key, value]) => ({ key, count: value.length }))
    });
  }

  // Year filter
  if (filters.year && filters.year !== '' && filters.year !== 'All Years') {
    const yearMatches = yearIndex.get(filters.year) || [];
    filteredData = filteredData.filter(row => yearMatches.includes(row));
  }

  // Cache the result
  analyticsComputationCache.set(cacheKey, filteredData);
  
  return filteredData;
};

/**
 * UNIFIED: Calculate summary rows for analytics data
 * Single function that handles all data formats with proper variable normalization
 * Production-grade implementation with no legacy cruft
 */
export const calculateSummaryRows = (
  rows: any[], // DynamicAggregatedData[]
  selectedVariables: string[]
): {
  simple: Record<string, any>;
  weighted: Record<string, any>;
} => {
  const simple: Record<string, any> = {};
  const weighted: Record<string, any> = {};
  
  // Production-grade: All data is now in dynamic format
  // No legacy fallbacks needed - unified data structure
  
  selectedVariables.forEach(varName => {
    // FIXED: Store percentile values with their weights separately for each percentile
    // This allows independent calculation when some percentiles have missing data
    const p25Values: Array<{value: number, weight: number}> = [];
    const p50Values: Array<{value: number, weight: number}> = [];
    const p75Values: Array<{value: number, weight: number}> = [];
    const p90Values: Array<{value: number, weight: number}> = [];
    let totalOrgs = 0;
    let totalIncumbents = 0;
    
    rows.forEach(row => {
      // CRITICAL FIX: Normalize variable name before data lookup for dynamic variables
      const normalizedVarName = mapVariableNameToStandard(varName);
      
      // Try dynamic variables first with normalized name
      let metrics = row.variables?.[normalizedVarName];
      
      // CRITICAL FIX: Handle both dynamic and legacy data formats
      // If no dynamic variables found, try legacy format
      if (!metrics) {
        // Legacy data format fallback with expanded variable support
        const legacyFieldMap: Record<string, string> = {
          'tcc': 'tcc',
          'work_rvus': 'wrvu',
          'wrvu': 'wrvu',
          'cf': 'cf',
          'conversion_factor': 'cf',
          'tcc_per_work_rvu': 'cf',
          'cfs': 'cf',
          'tcc_per_work_rvus': 'cf',
          // FIXED: Add support for new variables
          'base_salary': 'base_salary',
          'panel_size': 'panel_size',
          'total_encounters': 'total_encounters',
          'asa_units': 'asa_units',
          'net_collections': 'net_collections',
          // Call Pay support
          'on_call_compensation': 'on_call',
          'oncall_compensation': 'on_call',
          'daily_rate_on_call': 'on_call',
          'on_call_rate': 'on_call'
        };
        
        const legacyPrefix = legacyFieldMap[varName] || varName;
        
        // Extract legacy data fields
        const nOrgs = row[`${legacyPrefix}_n_orgs`] || 0;
        const nIncumbents = row[`${legacyPrefix}_n_incumbents`] || 0;
        const p25 = row[`${legacyPrefix}_p25`] || 0;
        const p50 = row[`${legacyPrefix}_p50`] || 0;
        const p75 = row[`${legacyPrefix}_p75`] || 0;
        const p90 = row[`${legacyPrefix}_p90`] || 0;
        
        // Create metrics object from legacy fields
        if (p50 > 0) {
          metrics = {
            variableName: varName,
            n_orgs: nOrgs,
            n_incumbents: nIncumbents,
            p25: p25,
            p50: p50,
            p75: p75,
            p90: p90
          };
        }
      }
      
      // Process metrics from either dynamic or legacy data structure
      // FIXED: Track orgs/incumbents for rows with any valid data, but only include percentiles that have actual data
      if (metrics) {
        const weight = metrics.n_incumbents || 1;
        totalOrgs += metrics.n_orgs || 0;
        totalIncumbents += metrics.n_incumbents || 0;
        
        // CRITICAL FIX: Only include each percentile if it has actual data (> 0)
        // This ensures rows with missing percentiles (showing ***) don't contribute 0 to the weighted average
        // Each percentile is calculated independently based on available data
        if (metrics.p25 > 0) {
          p25Values.push({ value: metrics.p25, weight });
        }
        if (metrics.p50 > 0) {
          p50Values.push({ value: metrics.p50, weight });
        }
        if (metrics.p75 > 0) {
          p75Values.push({ value: metrics.p75, weight });
        }
        if (metrics.p90 > 0) {
          p90Values.push({ value: metrics.p90, weight });
        }
      }
    });
    
    // Calculate averages only if we have at least p50 data
    if (p50Values.length > 0) {
      // SIMPLE AVERAGE: Mean of all values (unweighted) - only for percentiles that have data
      simple[varName] = {
        n_orgs: Math.round(totalOrgs / p50Values.length),
        n_incumbents: Math.round(totalIncumbents / p50Values.length),
        p25: p25Values.length > 0 ? p25Values.reduce((sum, d) => sum + d.value, 0) / p25Values.length : 0,
        p50: p50Values.reduce((sum, d) => sum + d.value, 0) / p50Values.length,
        p75: p75Values.length > 0 ? p75Values.reduce((sum, d) => sum + d.value, 0) / p75Values.length : 0,
        p90: p90Values.length > 0 ? p90Values.reduce((sum, d) => sum + d.value, 0) / p90Values.length : 0
      };
      
      // WEIGHTED AVERAGE: Weighted by number of incumbents - only for percentiles that have data
      // Each percentile calculated independently based on available data
      const calculateWeighted = (data: Array<{value: number, weight: number}>): number => {
        if (data.length === 0) return 0;
        const totalWeight = data.reduce((sum, d) => sum + d.weight, 0);
        if (totalWeight === 0) return 0;
        return data.reduce((sum, d) => sum + (d.value * d.weight), 0) / totalWeight;
      };
      
      weighted[varName] = {
        n_orgs: totalOrgs,
        n_incumbents: totalIncumbents,
        p25: calculateWeighted(p25Values),
        p50: calculateWeighted(p50Values),
        p75: calculateWeighted(p75Values),
        p90: calculateWeighted(p90Values)
      };
    } else {
      // No data available
      simple[varName] = null;
      weighted[varName] = null;
    }
  });
  
  return { simple, weighted };
};
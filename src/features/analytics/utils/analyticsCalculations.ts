/**
 * Analytics Feature - Calculation Utilities
 * 
 * This file contains all calculation and data transformation utilities for analytics.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { AggregatedData, SummaryCalculation } from '../types/analytics';
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
 * Groups analytics data by specialty
 * 
 * @param data - Array of aggregated data
 * @returns Object with specialty as key and data array as value
 */
export const groupBySpecialty = (data: AggregatedData[]): Record<string, AggregatedData[]> => {
  return data.reduce((acc, row) => {
    const specialty = row.surveySpecialty;
    if (!acc[specialty]) {
      acc[specialty] = [];
    }
    acc[specialty].push(row);
    return acc;
  }, {} as Record<string, AggregatedData[]>);
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
): AggregatedData[] => {
  if (!surveys || surveys.length === 0) {
    return [];
  }


  const transformedData: AggregatedData[] = [];

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
      cf_p90: 80.0 + (baseMultiplier * 60.0),
      
      // Base Salary - Realistic data based on survey size (typically 70-80% of TCC)
      base_salary_n_orgs: Math.round(10 + (baseMultiplier * 20)),
      base_salary_n_incumbents: Math.round(30 + (baseMultiplier * 60)),
      base_salary_p25: Math.round((200000 + (baseMultiplier * 100000)) * 0.75),
      base_salary_p50: Math.round((250000 + (baseMultiplier * 150000)) * 0.75),
      base_salary_p75: Math.round((300000 + (baseMultiplier * 200000)) * 0.75),
      base_salary_p90: Math.round((400000 + (baseMultiplier * 300000)) * 0.75)
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
const normalizeSpecialtyName = (specialty: string): string => {
  if (!specialty) return '';
  
  return specialty
    .toLowerCase()
    .replace(/\s+and\s+/g, ' ')  // Replace "and" with space
    .replace(/\s+/g, ' ')        // Normalize multiple spaces
    .trim();
};

export const filterAnalyticsData = (data: AggregatedData[], filters: any): AggregatedData[] => {
  // Early exit for empty data
  if (!data || data.length === 0) {
    return [];
  }

  // Check if filters are empty (no filtering needed)
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== 'All Sources' && value !== 'All Types' && value !== 'All Years'
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
  const cached = analyticsComputationCache.get<AggregatedData[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Create indexed lookups for faster filtering
  const specialtyIndex = new Map<string, AggregatedData[]>();
  const sourceIndex = new Map<string, AggregatedData[]>();
  const regionIndex = new Map<string, AggregatedData[]>();
  const providerTypeIndex = new Map<string, AggregatedData[]>();
  const yearIndex = new Map<string, AggregatedData[]>();

  // Build indexes
  data.forEach(row => {
    // Specialty index
    const specialtyKey = normalizeSpecialtyName(row.standardizedName);
    if (!specialtyIndex.has(specialtyKey)) {
      specialtyIndex.set(specialtyKey, []);
    }
    specialtyIndex.get(specialtyKey)!.push(row);

    // Source index
    if (!sourceIndex.has(row.surveySource)) {
      sourceIndex.set(row.surveySource, []);
    }
    sourceIndex.get(row.surveySource)!.push(row);

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
  });

  // Apply filters using indexes for faster lookup
  let filteredData: AggregatedData[] = data;

  // Specialty filter - use indexed lookup
  if (filters.specialty && filters.specialty !== '') {
    const normalizedFilterSpecialty = normalizeSpecialtyName(filters.specialty);
    const specialtyMatches = specialtyIndex.get(normalizedFilterSpecialty) || [];
    filteredData = filteredData.filter(row => specialtyMatches.includes(row));
  }

  // Survey source filter
  if (filters.surveySource && filters.surveySource !== '' && filters.surveySource !== 'All Sources') {
    const sourceMatches = sourceIndex.get(filters.surveySource) || [];
    filteredData = filteredData.filter(row => sourceMatches.includes(row));
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
    // Collect all percentile values and weights for this variable
    const p25Values: number[] = [];
    const p50Values: number[] = [];
    const p75Values: number[] = [];
    const p90Values: number[] = [];
    const allWeights: number[] = [];
    let totalOrgs = 0;
    let totalIncumbents = 0;
    
    rows.forEach(row => {
      // CRITICAL FIX: Normalize variable name before data lookup for dynamic variables
      const normalizedVarName = mapVariableNameToStandard(varName);
      
      // Debug logging for CF variables
      if (varName === 'cfs' || varName === 'cf') {
        console.log(`🔍 calculateDynamicSummaryRows: Variable normalization:`, {
          originalVarName: varName,
          normalizedVarName: normalizedVarName,
          availableVariables: row.variables ? Object.keys(row.variables) : []
        });
      }
      
      // Try dynamic variables first with normalized name
      let metrics = row.variables?.[normalizedVarName];
      
      // Debug logging for CF variables
      if (varName === 'cfs' || varName === 'cf') {
        console.log(`🔍 calculateDynamicSummaryRows: Data lookup for ${varName}:`, {
          normalizedVarName,
          hasMetrics: !!metrics,
          metricsData: metrics ? {
            p25: metrics.p25,
            p50: metrics.p50,
            p75: metrics.p75,
            p90: metrics.p90,
            n_orgs: metrics.n_orgs,
            n_incumbents: metrics.n_incumbents
          } : null
        });
      }
      
      // CRITICAL FIX: Handle both dynamic and legacy data formats
      // The data loading still produces legacy format, so we need fallback logic
      if (!metrics && !row.variables) {
        // Legacy data format fallback
        const legacyFieldMap: Record<string, string> = {
          'tcc': 'tcc',
          'work_rvus': 'wrvu',
          'wrvu': 'wrvu',
          'cf': 'cf',
          'conversion_factor': 'cf',
          'tcc_per_work_rvu': 'cf',
          'cfs': 'cf',  // Map 'cfs' to 'cf' for legacy data
          'tcc_per_work_rvus': 'cf',
          'base_salary': 'base_salary',
          'base_pay': 'base_salary',
          'salary': 'base_salary'
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
      if (metrics && metrics.p50 > 0) {
        // Collect all percentile values
        p25Values.push(metrics.p25 || 0);
        p50Values.push(metrics.p50 || 0);
        p75Values.push(metrics.p75 || 0);
        p90Values.push(metrics.p90 || 0);
        allWeights.push(metrics.n_incumbents || 1);
        totalOrgs += metrics.n_orgs || 0;
        totalIncumbents += metrics.n_incumbents || 0;
      }
    });
    
    if (p50Values.length > 0) {
      // SIMPLE AVERAGE: Mean of all values (unweighted)
      simple[varName] = {
        n_orgs: Math.round(totalOrgs / p50Values.length),
        n_incumbents: Math.round(totalIncumbents / p50Values.length),
        p25: p25Values.reduce((sum, val) => sum + val, 0) / p25Values.length,
        p50: p50Values.reduce((sum, val) => sum + val, 0) / p50Values.length,
        p75: p75Values.reduce((sum, val) => sum + val, 0) / p75Values.length,
        p90: p90Values.reduce((sum, val) => sum + val, 0) / p90Values.length
      };
      
      // WEIGHTED AVERAGE: Weighted by number of incumbents for each percentile
      const totalWeight = allWeights.reduce((sum, weight) => sum + weight, 0);
      if (totalWeight > 0) {
        const weightedP25 = p25Values.reduce((sum, val, index) => 
          sum + (val * allWeights[index]), 0) / totalWeight;
        const weightedP50 = p50Values.reduce((sum, val, index) => 
          sum + (val * allWeights[index]), 0) / totalWeight;
        const weightedP75 = p75Values.reduce((sum, val, index) => 
          sum + (val * allWeights[index]), 0) / totalWeight;
        const weightedP90 = p90Values.reduce((sum, val, index) => 
          sum + (val * allWeights[index]), 0) / totalWeight;
        
        weighted[varName] = {
          n_orgs: totalOrgs,
          n_incumbents: totalIncumbents,
          p25: weightedP25,
          p50: weightedP50,
          p75: weightedP75,
          p90: weightedP90
        };
      } else {
        weighted[varName] = simple[varName];
      }
    } else {
      // No data available
      simple[varName] = null;
      weighted[varName] = null;
    }
  });
  
  return { simple, weighted };
};
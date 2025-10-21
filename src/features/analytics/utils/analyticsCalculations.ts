/**
 * Analytics Feature - Calculation Utilities
 * 
 * This file contains all calculation and data transformation utilities for analytics.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { AggregatedData, SummaryCalculation } from '../types/analytics';
import { analyticsComputationCache, cacheUtils } from '../services/analyticsComputationCache';

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
 * Calculates summary rows for a group of analytics data
 * 
 * @param rows - Array of aggregated data rows
 * @returns Summary calculation with simple and weighted averages
 */
export const calculateSummaryRows = (rows: AggregatedData[]): SummaryCalculation => {
  if (rows.length === 0) {
    return {
      simple: {
        tcc_n_orgs: 0, tcc_n_incumbents: 0,
        tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
        wrvu_n_orgs: 0, wrvu_n_incumbents: 0,
        wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
        cf_n_orgs: 0, cf_n_incumbents: 0,
        cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0
      },
      weighted: {
        tcc_n_orgs: 0, tcc_n_incumbents: 0,
        tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
        wrvu_n_orgs: 0, wrvu_n_incumbents: 0,
        wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
        cf_n_orgs: 0, cf_n_incumbents: 0,
        cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0
      }
    };
  }

  // Simple averages (mean of all values) - Each metric section has independent org/incumbent counts
  const simple = {
    // TCC metrics with independent organizational data
    tcc_n_orgs: Math.round(rows.reduce((sum, row) => sum + row.tcc_n_orgs, 0) / rows.length),
    tcc_n_incumbents: Math.round(rows.reduce((sum, row) => sum + row.tcc_n_incumbents, 0) / rows.length),
    tcc_p25: rows.reduce((sum, row) => sum + row.tcc_p25, 0) / rows.length,
    tcc_p50: rows.reduce((sum, row) => sum + row.tcc_p50, 0) / rows.length,
    tcc_p75: rows.reduce((sum, row) => sum + row.tcc_p75, 0) / rows.length,
    tcc_p90: rows.reduce((sum, row) => sum + row.tcc_p90, 0) / rows.length,
    
    // wRVU metrics with independent organizational data
    wrvu_n_orgs: Math.round(rows.reduce((sum, row) => sum + row.wrvu_n_orgs, 0) / rows.length),
    wrvu_n_incumbents: Math.round(rows.reduce((sum, row) => sum + row.wrvu_n_incumbents, 0) / rows.length),
    wrvu_p25: rows.reduce((sum, row) => sum + row.wrvu_p25, 0) / rows.length,
    wrvu_p50: rows.reduce((sum, row) => sum + row.wrvu_p50, 0) / rows.length,
    wrvu_p75: rows.reduce((sum, row) => sum + row.wrvu_p75, 0) / rows.length,
    wrvu_p90: rows.reduce((sum, row) => sum + row.wrvu_p90, 0) / rows.length,
    
    // CF metrics with independent organizational data
    cf_n_orgs: Math.round(rows.reduce((sum, row) => sum + row.cf_n_orgs, 0) / rows.length),
    cf_n_incumbents: Math.round(rows.reduce((sum, row) => sum + row.cf_n_incumbents, 0) / rows.length),
    cf_p25: rows.reduce((sum, row) => sum + row.cf_p25, 0) / rows.length,
    cf_p50: rows.reduce((sum, row) => sum + row.cf_p50, 0) / rows.length,
    cf_p75: rows.reduce((sum, row) => sum + row.cf_p75, 0) / rows.length,
    cf_p90: rows.reduce((sum, row) => sum + row.cf_p90, 0) / rows.length,
  };

  // Weighted averages (weighted by number of incumbents) - Each metric section weighted independently
  const totalTccIncumbents = rows.reduce((sum, row) => sum + row.tcc_n_incumbents, 0);
  const totalWrvuIncumbents = rows.reduce((sum, row) => sum + row.wrvu_n_incumbents, 0);
  const totalCfIncumbents = rows.reduce((sum, row) => sum + row.cf_n_incumbents, 0);
  
  const weighted = {
    // TCC weighted averages
    tcc_n_orgs: rows.reduce((sum, row) => sum + row.tcc_n_orgs, 0),
    tcc_n_incumbents: totalTccIncumbents,
    tcc_p25: totalTccIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.tcc_p25 * row.tcc_n_incumbents), 0) / totalTccIncumbents : 0,
    tcc_p50: totalTccIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.tcc_p50 * row.tcc_n_incumbents), 0) / totalTccIncumbents : 0,
    tcc_p75: totalTccIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.tcc_p75 * row.tcc_n_incumbents), 0) / totalTccIncumbents : 0,
    tcc_p90: totalTccIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.tcc_p90 * row.tcc_n_incumbents), 0) / totalTccIncumbents : 0,
    
    // wRVU weighted averages
    wrvu_n_orgs: rows.reduce((sum, row) => sum + row.wrvu_n_orgs, 0),
    wrvu_n_incumbents: totalWrvuIncumbents,
    wrvu_p25: totalWrvuIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.wrvu_p25 * row.wrvu_n_incumbents), 0) / totalWrvuIncumbents : 0,
    wrvu_p50: totalWrvuIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.wrvu_p50 * row.wrvu_n_incumbents), 0) / totalWrvuIncumbents : 0,
    wrvu_p75: totalWrvuIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.wrvu_p75 * row.wrvu_n_incumbents), 0) / totalWrvuIncumbents : 0,
    wrvu_p90: totalWrvuIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.wrvu_p90 * row.wrvu_n_incumbents), 0) / totalWrvuIncumbents : 0,
    
    // CF weighted averages
    cf_n_orgs: rows.reduce((sum, row) => sum + row.cf_n_orgs, 0),
    cf_n_incumbents: totalCfIncumbents,
    cf_p25: totalCfIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.cf_p25 * row.cf_n_incumbents), 0) / totalCfIncumbents : 0,
    cf_p50: totalCfIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.cf_p50 * row.cf_n_incumbents), 0) / totalCfIncumbents : 0,
    cf_p75: totalCfIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.cf_p75 * row.cf_n_incumbents), 0) / totalCfIncumbents : 0,
    cf_p90: totalCfIncumbents > 0 ? rows.reduce((sum, row) => sum + (row.cf_p90 * row.cf_n_incumbents), 0) / totalCfIncumbents : 0,
  };

  return { simple, weighted };
};

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
 * Calculate summary rows for dynamic variables
 * NEW: Handles DynamicAggregatedData with selected variables
 */
export const calculateDynamicSummaryRows = (
  rows: any[], // DynamicAggregatedData[]
  selectedVariables: string[]
): {
  simple: Record<string, any>;
  weighted: Record<string, any>;
} => {
  const simple: Record<string, any> = {};
  const weighted: Record<string, any> = {};
  
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
      const metrics = row.variables?.[varName];
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
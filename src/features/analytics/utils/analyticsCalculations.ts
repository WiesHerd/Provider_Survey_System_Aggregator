/**
 * Analytics Feature - Calculation Utilities
 * 
 * This file contains all calculation and data transformation utilities for analytics.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { AggregatedData, SummaryCalculation } from '../types/analytics';

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

  console.log('🔍 transformSurveyData: Processing', surveys.length, 'surveys');
  console.log('🔍 transformSurveyData: Mappings available - specialty:', mappings.length, 'column:', columnMappings.length, 'region:', regionMappings.length);

  const transformedData: AggregatedData[] = [];

  surveys.forEach((survey: any) => {
    console.log(`🔍 transformSurveyData: Processing survey ${survey.name} (${survey.type})`);
    
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

  console.log('🔍 transformSurveyData: Generated', transformedData.length, 'aggregated records');
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
  console.log('🔍 filterAnalyticsData: Filtering', data.length, 'records with filters:', filters);
  
  const filteredData = data.filter(row => {
    // Specialty filter - use fuzzy matching for specialty names
    if (filters.specialty && filters.specialty !== '') {
      const normalizedFilterSpecialty = normalizeSpecialtyName(filters.specialty);
      const normalizedRowSpecialty = normalizeSpecialtyName(row.standardizedName);
      
      if (normalizedRowSpecialty !== normalizedFilterSpecialty) {
        console.log('🔍 filterAnalyticsData: Specialty mismatch:', {
          filter: filters.specialty,
          normalizedFilter: normalizedFilterSpecialty,
          row: row.standardizedName,
          normalizedRow: normalizedRowSpecialty
        });
        return false;
      }
    }
    
    // Survey source filter (exclude "All Sources")
    if (filters.surveySource && filters.surveySource !== '' && filters.surveySource !== 'All Sources' && row.surveySource !== filters.surveySource) {
      return false;
    }
    
    // Geographic region filter
    if (filters.geographicRegion && filters.geographicRegion !== '' && row.geographicRegion !== filters.geographicRegion) {
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
  
  console.log('🔍 filterAnalyticsData: Filtered to', filteredData.length, 'records');
  return filteredData;
};
/**
 * Analytics calculation utilities for survey data processing
 * Extracted from SurveyAnalytics.tsx to improve maintainability
 */

export interface AggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;
  geographicRegion: string;
  n_orgs: number;
  n_incumbents: number;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
}

/**
 * Calculates the percentile value from an array of numbers
 * @param numbers - Array of numbers to calculate percentile from
 * @param percentile - Percentile to calculate (0-100)
 * @returns The percentile value
 */
export const calculatePercentile = (numbers: number[], percentile: number): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = numbers.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sortedNumbers.length);
  return sortedNumbers[index] || 0;
};

/**
 * Calculates weighted average of values
 * @param values - Array of values
 * @param weights - Array of weights (must match values length)
 * @returns Weighted average
 */
export const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const sum = weights.reduce((acc, weight, index) => acc + weight * values[index], 0);
  const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
  return weightSum === 0 ? 0 : sum / weightSum;
};

/**
 * Calculates simple average of values
 * @param values - Array of values
 * @returns Average value
 */
export const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
};

/**
 * Formats a number as currency
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
 * Formats a number with 2 decimal places
 * @param value - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Enterprise-grade intelligent column mapping function
 * Creates mappings between source columns and target columns with confidence scores
 */
export const createIntelligentMappings = (row: any, surveySource: string): Array<{sourceColumn: string, targetColumn: string, confidence: number}> => {
  const mappings: Array<{sourceColumn: string, targetColumn: string, confidence: number}> = [];
  
  // Define standardized column patterns with confidence scores
  const columnPatterns = [
    // TCC patterns (Total Cash Compensation)
    { pattern: /tcc/i, target: 'tcc', confidence: 0.9 },
    { pattern: /total.*cash.*comp/i, target: 'tcc', confidence: 0.8 },
    { pattern: /compensation/i, target: 'tcc', confidence: 0.7 },
    
    // wRVU patterns
    { pattern: /wrvu/i, target: 'wrvu', confidence: 0.9 },
    { pattern: /work.*rvu/i, target: 'wrvu', confidence: 0.8 },
    { pattern: /relative.*value.*unit/i, target: 'wrvu', confidence: 0.7 },
    
    // Conversion Factor patterns
    { pattern: /cf/i, target: 'cf', confidence: 0.9 },
    { pattern: /conversion.*factor/i, target: 'cf', confidence: 0.8 },
    { pattern: /dollar.*per.*wrvu/i, target: 'cf', confidence: 0.7 },
    
    // Geographic patterns
    { pattern: /region/i, target: 'geographicRegion', confidence: 0.8 },
    { pattern: /geographic/i, target: 'geographicRegion', confidence: 0.7 },
    { pattern: /location/i, target: 'geographicRegion', confidence: 0.6 },
    
    // Specialty patterns
    { pattern: /specialty/i, target: 'specialty', confidence: 0.8 },
    { pattern: /department/i, target: 'specialty', confidence: 0.6 },
    
    // Provider Type patterns
    { pattern: /provider.*type/i, target: 'providerType', confidence: 0.8 },
    { pattern: /type/i, target: 'providerType', confidence: 0.6 },
  ];
  
  // Process each column in the row
  Object.keys(row).forEach(sourceColumn => {
    let bestMatch = { target: '', confidence: 0 };
    
    // Find the best matching pattern
    columnPatterns.forEach(pattern => {
      if (pattern.pattern.test(sourceColumn) && pattern.confidence > bestMatch.confidence) {
        bestMatch = { target: pattern.target, confidence: pattern.confidence };
      }
    });
    
    // Add mapping if confidence is above threshold
    if (bestMatch.confidence > 0.5) {
      mappings.push({
        sourceColumn,
        targetColumn: bestMatch.target,
        confidence: bestMatch.confidence
      });
    }
  });
  
  return mappings;
};

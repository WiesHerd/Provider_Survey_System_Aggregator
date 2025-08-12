/**
 * Shared calculation utilities for the Survey Aggregator application
 * These functions are used across multiple features and should be centralized
 */

/**
 * Calculates the percentile value from an array of numbers
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
 * Calculates the weighted average of values
 * 
 * @param values - Array of values to average
 * @param weights - Array of weights corresponding to each value
 * @returns The weighted average
 * 
 * @example
 * ```typescript
 * const avg = calculateWeightedAverage([1, 2, 3], [0.5, 0.3, 0.2]); // Returns weighted average
 * ```
 */
export const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const sum = weights.reduce((acc, weight, index) => acc + weight * values[index], 0);
  const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
  return weightSum === 0 ? 0 : sum / weightSum;
};

/**
 * Calculates the simple average of values
 * 
 * @param values - Array of numbers to average
 * @returns The average value
 * 
 * @example
 * ```typescript
 * const avg = calculateAverage([1, 2, 3, 4, 5]); // Returns 3
 * ```
 */
export const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
};

/**
 * Calculates the median value from an array of numbers
 * 
 * @param numbers - Array of numbers to calculate median from
 * @returns The median value
 * 
 * @example
 * ```typescript
 * const median = calculateMedian([1, 2, 3, 4, 5]); // Returns 3
 * ```
 */
export const calculateMedian = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sortedNumbers.length / 2);
  
  if (sortedNumbers.length % 2 === 0) {
    return (sortedNumbers[middle - 1] + sortedNumbers[middle]) / 2;
  }
  
  return sortedNumbers[middle];
};

/**
 * Calculates the standard deviation of values
 * 
 * @param values - Array of numbers to calculate standard deviation from
 * @returns The standard deviation
 * 
 * @example
 * ```typescript
 * const stdDev = calculateStandardDeviation([1, 2, 3, 4, 5]); // Returns standard deviation
 * ```
 */
export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const mean = calculateAverage(values);
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = calculateAverage(squaredDifferences);
  
  return Math.sqrt(variance);
};

/**
 * Calculates the coefficient of variation (CV) - standard deviation / mean
 * 
 * @param values - Array of numbers to calculate CV from
 * @returns The coefficient of variation as a percentage
 * 
 * @example
 * ```typescript
 * const cv = calculateCoefficientOfVariation([1, 2, 3, 4, 5]); // Returns CV as percentage
 * ```
 */
export const calculateCoefficientOfVariation = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const mean = calculateAverage(values);
  if (mean === 0) return 0;
  
  const stdDev = calculateStandardDeviation(values);
  return (stdDev / mean) * 100;
};

/**
 * Calculation utilities for Chart Builder
 * 
 * Handles data aggregation, Y-axis scaling, and statistical calculations
 */

import { YAxisConfig, ChartDataItem } from '../types/reportBuilder';

/**
 * Smart scaling function to make differences more prominent
 * Calculates optimal Y-axis range for charts
 */
export const calculateOptimalYAxis = (
  data: ChartDataItem[], 
  isCurrency: boolean, 
  isWRVU: boolean
): YAxisConfig => {
  if (data.length === 0) return { min: 0, max: 100 };
  
  const values = data.map(item => item.value).filter(val => val !== null && val !== undefined);
  if (values.length === 0) return { min: 0, max: 100 };
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  // If values are very close together (less than 5% difference), use smart scaling
  const percentageDifference = range / max;
  
  if (percentageDifference < 0.05 && range > 0) {
    // Use a tighter range to make differences more visible
    const padding = range * 0.2; // 20% padding
    const smartMin = Math.max(0, min - padding);
    const smartMax = max + padding;
    
    return { min: smartMin, max: smartMax };
  }
  
  // Default scaling with 10% padding
  const padding = range * 0.1;
  return { 
    min: Math.max(0, min - padding), 
    max: max + padding 
  };
};

/**
 * Calculates average value from chart data
 */
export const calculateAverage = (data: ChartDataItem[], metric?: string): number => {
  if (data.length === 0) return 0;
  
  if (metric) {
    const values = data
      .map(item => item.metricValues?.[metric] || 0)
      .filter(val => val > 0);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  const values = data.map(item => item.value).filter(val => val > 0);
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/**
 * Calculates median value from chart data
 */
export const calculateMedian = (data: ChartDataItem[], metric?: string): number => {
  if (data.length === 0) return 0;
  
  let values: number[];
  if (metric) {
    values = data
      .map(item => item.metricValues?.[metric] || 0)
      .filter(val => val > 0)
      .sort((a, b) => a - b);
  } else {
    values = data
      .map(item => item.value)
      .filter(val => val > 0)
      .sort((a, b) => a - b);
  }
  
  if (values.length === 0) return 0;
  
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];
};

/**
 * Calculates total count across all data items
 */
export const calculateTotalCount = (data: ChartDataItem[]): number => {
  return data.reduce((sum, item) => sum + (item.count || 0), 0);
};

/**
 * Determines if a metric is currency-based
 */
export const isCurrencyMetric = (metric: string): boolean => {
  return metric.includes('tcc') || metric.includes('cf');
};

/**
 * Determines if a metric is wRVU-based
 */
export const isWRVUMetric = (metric: string): boolean => {
  return metric.includes('wrvu');
};










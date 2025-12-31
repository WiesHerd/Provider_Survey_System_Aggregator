/**
 * Validation utilities for Chart Builder
 * 
 * Handles validation of report configurations and data
 */

import { ReportConfigInput } from '../types/reportBuilder';

/**
 * Validates report configuration
 */
export const validateReportConfig = (config: ReportConfigInput): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.dimension || config.dimension.trim() === '') {
    errors.push('Dimension is required');
  }
  
  if (!config.metrics || config.metrics.length === 0) {
    errors.push('At least one metric must be selected');
  }
  
  if (!config.chartType) {
    errors.push('Chart type is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validates report name for saving
 */
export const validateReportName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Report name is required' };
  }
  
  if (name.trim().length < 3) {
    return { valid: false, error: 'Report name must be at least 3 characters' };
  }
  
  if (name.trim().length > 100) {
    return { valid: false, error: 'Report name must be less than 100 characters' };
  }
  
  return { valid: true };
};

/**
 * Validates that chart data exists
 */
export const validateChartData = (data: any[]): { valid: boolean; error?: string } => {
  if (!data || data.length === 0) {
    return { valid: false, error: 'No data available for chart' };
  }
  
  return { valid: true };
};










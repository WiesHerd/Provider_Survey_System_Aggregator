/**
 * Analytics Feature - Variable Formatters
 * 
 * Utility functions for formatting variable names and values.
 * Following enterprise patterns for consistent display formatting.
 */

import { VariableCategory } from '../types/variables';

/**
 * Format variable name for display
 * Converts normalized names to user-friendly display names
 */
export const formatVariableDisplayName = (normalizedName: string): string => {
  const displayMap: Record<string, string> = {
    'tcc': 'TCC (Total Cash Compensation)',
    'work_rvus': 'Work RVUs',
    'work_rvu': 'Work RVUs',
    'wrvu': 'Work RVUs',
    'tcc_per_work_rvu': 'TCC per Work RVU',
    'tcc_per_work_rvus': 'TCC per Work RVU',
    'cf': 'Conversion Factor',
    'conversion_factor': 'Conversion Factor',
    'base_salary': 'Base Salary',
    'base_compensation': 'Base Salary',
    'asa_units': 'ASA Units',
    'panel_size': 'Panel Size',
    'total_encounters': 'Total Encounters',
    'tcc_per_encounter': 'TCC per Encounter',
    'tcc_to_net_collections': 'TCC to Net Collections',
    'tcc_per_asa_unit': 'TCC per ASA Unit'
  };

  // Check for exact match first
  if (displayMap[normalizedName]) {
    return displayMap[normalizedName];
  }

  // Pattern-based formatting for unknown variables
  return formatVariableNameFromPattern(normalizedName);
};

/**
 * Format variable name from pattern (fallback for unknown variables)
 */
const formatVariableNameFromPattern = (normalizedName: string): string => {
  // Handle snake_case to Title Case
  const words = normalizedName.split('_');
  const formatted = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Handle common abbreviations
  return formatted
    .replace(/\bTcc\b/g, 'TCC')
    .replace(/\bRvu\b/g, 'RVU')
    .replace(/\bRvus\b/g, 'RVUs')
    .replace(/\bAsa\b/g, 'ASA')
    .replace(/\bCf\b/g, 'CF');
};

/**
 * Detect variable category from name
 */
export const detectVariableCategory = (variableName: string): VariableCategory => {
  const lower = variableName.toLowerCase();
  
  // Ratio detection (has "per" or "/" or "rate")
  if (lower.includes('per ') || lower.includes('/') || lower.includes('rate')) {
    return 'ratio';
  }
  
  // Compensation detection (money-related keywords)
  if (lower.match(/compensation|salary|tcc|cash|bonus|pay|base/)) {
    return 'compensation';
  }
  
  // Productivity detection (volume/work keywords)
  if (lower.match(/rvu|units|volume|encounters|panel|visits|asa/)) {
    return 'productivity';
  }
  
  return 'other';
};

/**
 * Format variable value based on variable type
 */
export const formatVariableValue = (
  value: number, 
  variableName: string, 
  options: { showCurrency?: boolean; showDecimals?: number } = {}
): string => {
  if (value === 0 || isNaN(value)) {
    return 'N/A';
  }

  const { showCurrency = false, showDecimals = 0 } = options;
  
  // Determine if this is a currency variable
  const isCurrency = isCurrencyVariable(variableName);
  
  if (isCurrency || showCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: showDecimals,
      maximumFractionDigits: showDecimals,
    }).format(value);
  }
  
  // Format as number with appropriate decimals
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: showDecimals,
    maximumFractionDigits: showDecimals,
  }).format(value);
};

/**
 * Check if a variable represents currency values
 */
const isCurrencyVariable = (variableName: string): boolean => {
  const lower = variableName.toLowerCase();
  
  // Currency-related patterns
  const currencyPatterns = [
    /tcc/,
    /total.*cash/,
    /compensation/,
    /salary/,
    /pay/,
    /bonus/,
    /cash/
  ];
  
  return currencyPatterns.some(pattern => pattern.test(lower));
};

/**
 * Get variable color for UI display (DARK COLORS for pills/chips)
 */
export const getVariableColor = (variableName: string, index: number): string => {
  const VARIABLE_COLORS = [
    '#1976D2', // Dark Blue (TCC)
    '#388E3C', // Dark Green (wRVU)
    '#F57C00', // Dark Orange (CF)
    '#7B1FA2', // Dark Purple (Base Salary)
    '#00796B', // Dark Teal (ASA Units)
    '#C2185B', // Dark Pink (Panel Size)
    '#5D4037', // Dark Brown (Other)
    '#455A64', // Dark Blue Grey (Other)
  ];
  
  return VARIABLE_COLORS[index % VARIABLE_COLORS.length];
};

/**
 * Get LIGHT background color for table headers (like original)
 */
export const getVariableLightBackgroundColor = (variableName: string, index: number): string => {
  const LIGHT_COLORS = [
    '#E3F2FD', // Light Blue (TCC)
    '#E8F5E8', // Light Green (wRVU)
    '#FFF3E0', // Light Orange (CF)
    '#F3E5F5', // Light Purple (Base Salary)
    '#E0F2F1', // Light Teal (ASA Units)
    '#FCE4EC', // Light Pink (Panel Size)
    '#F1F8E9', // Light Green (Other)
    '#FFF8E1', // Light Yellow (Other)
  ];
  
  return LIGHT_COLORS[index % LIGHT_COLORS.length];
};

/**
 * Normalize variable name for internal use
 */
export const normalizeVariableName = (variableName: string): string => {
  return variableName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

/**
 * Group variables by category for display
 */
export const groupVariablesByCategory = (variables: string[]): Record<VariableCategory, string[]> => {
  const groups: Record<VariableCategory, string[]> = {
    compensation: [],
    productivity: [],
    ratio: [],
    other: []
  };
  
  variables.forEach(variable => {
    const category = detectVariableCategory(variable);
    groups[category].push(variable);
  });
  
  return groups;
};

/**
 * Validate variable selection (max 5 variables)
 */
export const validateVariableSelection = (selectedVariables: string[]): {
  isValid: boolean;
  error?: string;
} => {
  if (selectedVariables.length === 0) {
    return { isValid: false, error: 'Please select at least one variable' };
  }
  
  if (selectedVariables.length > 5) {
    return { isValid: false, error: 'Maximum 5 variables can be selected' };
  }
  
  return { isValid: true };
};

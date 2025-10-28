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
    'tcc_excluding_premium': 'TCC Excluding Premium',
    'tcc_excluding': 'TCC Excluding Premium',
    'work_rvus': 'Work RVUs',
    'work_rvu': 'Work RVUs',
    'wrvu': 'Work RVUs',
    'tcc_per_work_rvu': 'CFs',
    'tcc_per_work_rvus': 'CFs',
    'cf': 'CFs',
    'conversion_factor': 'CFs',
    'base_salary': 'Base Salary',
    'base_compensation': 'Base Salary',
    'base_comp': 'Base Salary',
    'salary': 'Base Salary',
    'base_pay_hourly_rate': 'Base Pay Hourly Rate',
    'hourly_rate': 'Base Pay Hourly Rate',
    'asa_units': 'ASA Units',
    'asa': 'ASA Units',
    'asa_unit': 'ASA Units',
    'panel_size': 'Panel Size',
    'panel': 'Panel Size',
    'patient_panel': 'Panel Size',
    'patient_panel_size': 'Panel Size',
    'total_encounters': 'Total Encounters',
    'encounters': 'Total Encounters',
    'patient_encounters': 'Total Encounters',
    'total_visits': 'Total Encounters',
    'net_collections': 'Net Collections',
    'collections': 'Net Collections',
    'tcc_per_encounter': 'TCC per Encounter',
    'tcc_to_net_collections': 'TCC to Net Collections',
    'tcc_per_asa_unit': 'TCC per ASA Unit',
    'tcc_per_asa': 'TCC per ASA Unit',
    'comp_per_encounter': 'TCC per Encounter',
    'compensation_per_encounter': 'TCC per Encounter',
    'tcc_to_collections': 'TCC to Net Collections',
    'comp_to_collections': 'TCC to Net Collections',
    'comp_per_asa': 'TCC per ASA Unit'
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
    .replace(/\bCf\b/g, 'CF')
    .replace(/\bCfs\b/g, 'CFs');
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
    return 'n/a';
  }

  const { showCurrency = false, showDecimals = 0 } = options;
  
  // Determine if this is a currency variable
  const isCurrency = isCurrencyVariable(variableName);
  
  // Determine if this is a ratio variable (like TCC per Work RVU) that needs 2 decimals
  const isRatio = isRatioVariable(variableName);
  
  // Determine if this is a percentage variable (like TCC to Net Collections)
  const isPercentage = isPercentageVariable(variableName);
  
  // Debug logging
  console.log('🔍 formatVariableValue: Variable:', variableName, 'isCurrency:', isCurrency, 'isRatio:', isRatio, 'isPercentage:', isPercentage);
  
  // Use 2 decimals for ratio variables, 1 decimal for percentages, otherwise use provided decimals
  const actualDecimals = isRatio ? 2 : isPercentage ? 1 : showDecimals;
  
  if (isCurrency || showCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: actualDecimals,
      maximumFractionDigits: actualDecimals,
    }).format(value);
  }
  
  // Format as percentage if it's a percentage variable
  if (isPercentage) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: actualDecimals,
      maximumFractionDigits: actualDecimals,
    }).format(value / 100); // Convert from decimal to percentage
  }
  
  // Format as number with appropriate decimals
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: actualDecimals,
    maximumFractionDigits: actualDecimals,
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
    /base.*salary/,
    /base.*comp/,
    /pay/,
    /bonus/,
    /cash/,
    /cf$/,  // Add CF variables as currency
    /cfs$/,  // Add CFS variables as currency
    /hourly.*rate/,
    /base.*pay.*hourly/,
    /excluding.*premium/,
    /tcc.*excluding/
  ];
  
  return currencyPatterns.some(pattern => pattern.test(lower));
};

/**
 * Check if a variable represents ratio values (needs 2 decimal places)
 */
const isRatioVariable = (variableName: string): boolean => {
  const lower = variableName.toLowerCase();
  
  // Ratio-related patterns
  const ratioPatterns = [
    /per.*work.*rvu/,
    /tcc.*per.*work.*rvu/,
    /conversion.*factor/,
    /cf$/,
    /cfs$/,  // Add support for 'cfs' variable
    /per.*encounter/,
    /per.*asa/,
    /rate/,
    /ratio/
  ];
  
  return ratioPatterns.some(pattern => pattern.test(lower));
};

/**
 * Check if a variable represents percentage values (needs percentage formatting)
 */
const isPercentageVariable = (variableName: string): boolean => {
  const lower = variableName.toLowerCase();
  
  // Debug logging to see what variable names we're getting
  console.log('🔍 isPercentageVariable: Checking variable:', variableName, 'lowercase:', lower);
  
  // Percentage-related patterns - handle both display names and normalized names
  const percentagePatterns = [
    /as.*a.*percentage/,
    /percentage.*of/,
    /to.*net.*collections/,
    /to.*collections/,
    /ratio.*to/,
    /percent$/,
    /%$/,
    /tcc.*excluding.*premium.*to.*net.*collections/,
    /base.*salary.*as.*a.*percentage/,
    /excluding.*premium.*to.*net.*collections/,
    /tcc.*excluding.*premium.*to.*net.*collections/i
  ];
  
  const isPercentage = percentagePatterns.some(pattern => {
    const matches = pattern.test(lower);
    if (matches) {
      console.log('✅ isPercentageVariable: Pattern matched:', pattern.toString(), 'for variable:', variableName);
    }
    return matches;
  });
  
  console.log('🔍 isPercentageVariable: Result for', variableName, ':', isPercentage);
  return isPercentage;
};

/**
 * Get variable color for UI display (DARK COLORS for pills/chips)
 */
export const getVariableColor = (variableName: string, index: number): string => {
  const VARIABLE_COLORS = [
    '#1565C0', // Medium Blue (TCC) - closer to table's #E3F2FD
    '#2E7D32', // Medium Green (wRVU) - closer to table's #E8F5E8
    '#FFD54F', // Light Amber (CF) - closer to table's #FFF3E0 and more yellowish
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
  const normalized = variableName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Apply intelligent mapping to standardize variations
  return mapVariableNameToStandard(normalized);
};

/**
 * Map variable name variations to standard names
 * Handles different naming conventions across surveys
 */
export const mapVariableNameToStandard = (normalizedName: string): string => {
  // Comprehensive mapping of variable name variations to standard names
  const variableMapping: Record<string, string> = {
    // TCC variations
    'total_cash_compensation': 'tcc',
    'total_compensation': 'tcc',
    'total_cash_comp': 'tcc',
    'cash_compensation': 'tcc',
    'total_comp': 'tcc',
    'tcc_excluding_premium': 'tcc_excluding_premium',
    'tcc_excluding': 'tcc_excluding_premium',
    
    // Work RVU variations
    'work_rvus': 'work_rvus',
    'work_rvu': 'work_rvus',
    'wrvu': 'work_rvus',
    'wrvus': 'work_rvus',
    'work_relative_value_units': 'work_rvus',
    
    // TCC per Work RVU variations (Conversion Factor)
    'tcc_per_work_rvu': 'tcc_per_work_rvu',
    'tcc_per_work_rvus': 'tcc_per_work_rvu',
    'tcc_per_wrvu': 'tcc_per_work_rvu',
    'conversion_factor': 'tcc_per_work_rvu',
    'cf': 'tcc_per_work_rvu',
    'cfs': 'tcc_per_work_rvu',  // Add mapping for 'cfs' to 'tcc_per_work_rvu'
    'comp_per_wrvu': 'tcc_per_work_rvu',
    'compensation_per_wrvu': 'tcc_per_work_rvu',
    
    // Base Salary variations
    'base_salary': 'base_salary',
    'base_compensation': 'base_salary',
    'base_comp': 'base_salary',
    'salary': 'base_salary',
    'base_pay_hourly_rate': 'base_pay_hourly_rate',
    'hourly_rate': 'base_pay_hourly_rate',
    'base_pay_hourly': 'base_pay_hourly_rate',
    
    // ASA Units variations
    'asa_units': 'asa_units',
    'asa': 'asa_units',
    'asa_unit': 'asa_units',
    
    // Panel Size variations
    'panel_size': 'panel_size',
    'panel': 'panel_size',
    'patient_panel': 'panel_size',
    'patient_panel_size': 'panel_size',
    
    // Encounters variations
    'total_encounters': 'total_encounters',
    'encounters': 'total_encounters',
    'patient_encounters': 'total_encounters',
    'total_visits': 'total_encounters',
    
    // TCC per Encounter variations
    'tcc_per_encounter': 'tcc_per_encounter',
    'comp_per_encounter': 'tcc_per_encounter',
    'compensation_per_encounter': 'tcc_per_encounter',
    
    // Net Collections variations
    'net_collections': 'net_collections',
    'collections': 'net_collections',
    'net_collection': 'net_collections',
    
    // TCC to Collections variations
    'tcc_to_net_collections': 'tcc_to_net_collections',
    'tcc_to_collections': 'tcc_to_net_collections',
    'comp_to_collections': 'tcc_to_net_collections',
    
    // TCC per ASA Unit variations
    'tcc_per_asa_unit': 'tcc_per_asa_unit',
    'tcc_per_asa': 'tcc_per_asa_unit',
    'comp_per_asa': 'tcc_per_asa_unit'
  };
  
  // Return mapped name if exists, otherwise return original normalized name
  return variableMapping[normalizedName] || normalizedName;
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

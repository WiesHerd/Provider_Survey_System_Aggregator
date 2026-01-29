/**
 * Format Detection System - Normalized Format Only
 * 
 * Enterprise Approach: One standard format for all survey data
 * Users convert their data to our format (like Salesforce, QuickBooks, SAP)
 * 
 * Benefits:
 * - Simple, predictable validation
 * - Zero edge cases from format conversion
 * - Consistent data structure
 * - Easy to maintain and debug
 */

export type CSVFormat = 'normalized';

export interface FormatDetectionResult {
  format: CSVFormat | undefined;
  confidence: number; // 0-100
  detectedColumns: string[];
  missingRequired: string[];
  suggestions: string[];
}

/**
 * Required columns for normalized format
 * These are the core columns needed for all survey data
 */
export const REQUIRED_COLUMNS = [
  'specialty',
  'variable',
  'p25',
  'p50',
  'p75',
  'p90'
];

/**
 * Optional columns that enhance data quality
 */
export const OPTIONAL_COLUMNS = [
  'provider_type',
  'geographic_region',
  'n_orgs',
  'n_incumbents'
];

/**
 * All supported columns (required + optional)
 */
export const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

/**
 * Column aliases - alternative names we accept
 * Enhanced with SullivanCotter and MGMA wide format patterns
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  'specialty': ['specialty', 'speciality', 'specialty name', 'medical specialty'],
  'variable': ['variable', 'benchmark', 'metric', 'measure', 'compensation type'],
  'provider_type': ['provider_type', 'provider type', 'type', 'role', 'provider category'],
  'geographic_region': ['geographic_region', 'geographic region', 'region', 'location', 'geography', 'market'],
  'n_orgs': ['n_orgs', 'n_org', 'orgs', 'organizations', 'group_count', 'group count', 'number of organizations', '# orgs'],
  'n_incumbents': ['n_incumbents', 'n_incumbent', 'incumbents', 'indv_count', 'individual_count', 'individual count', 'number of incumbents', '# incumbents'],
  'p25': ['p25', '25th', '25th%', '25th percentile', '25%tile', '25th %ile'],
  'p50': ['p50', '50th', '50th%', '50th percentile', 'median', '50%tile', '50th %ile'],
  'p75': ['p75', '75th', '75th%', '75th percentile', '75%tile', '75th %ile'],
  'p90': ['p90', '90th', '90th%', '90th percentile', '90%tile', '90th %ile']
};

/**
 * Detect SullivanCotter/MGMA wide format patterns
 * These files have columns like: tcc_p25, tcc_p50, wrvu_p25, etc.
 */
function detectWideVariableFormat(headers: string[]): {
  isWideFormat: boolean;
  detectedVariables: string[];
  suggestions: string[];
} {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Pattern: variable_p25, variable_p50, variable_p75, variable_p90
  const widePattern = /^(\w+)_(p25|p50|p75|p90|25th|50th|75th|90th)$/i;
  const variablePatterns = new Set<string>();
  
  lowerHeaders.forEach(header => {
    const match = header.match(widePattern);
    if (match) {
      const variable = match[1].toLowerCase();
      // Common variables in wide format
      if (['tcc', 'wrvu', 'wrvus', 'cf', 'cfs', 'conversion', 'compensation', 'salary', 'bonus'].some(v => variable.includes(v))) {
        variablePatterns.add(variable);
      }
    }
  });
  
  const isWideFormat = variablePatterns.size > 0;
  const suggestions: string[] = [];
  
  if (isWideFormat) {
    suggestions.push('Your file appears to be in "wide variable" format (SullivanCotter/MGMA style)');
    suggestions.push('This format has separate columns for each variable (e.g., tcc_p25, wrvu_p25)');
    suggestions.push('You need to convert it to "normalized" format where each row represents one variable');
    suggestions.push('Download our template to see the correct format');
    suggestions.push('Or use our data transformation tool to convert automatically');
  }
  
  return {
    isWideFormat,
    detectedVariables: Array.from(variablePatterns),
    suggestions
  };
}

/**
 * Detect if CSV matches normalized format
 * Returns confidence score and missing columns
 * Enhanced with SullivanCotter/MGMA wide format detection
 */
export function detectFormat(headers: string[]): FormatDetectionResult {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // First, check if this is a wide variable format (SullivanCotter/MGMA)
  const wideFormatCheck = detectWideVariableFormat(headers);
  
  // Map detected columns to standard names
  const mappedColumns = new Map<string, string>();
  
  // Check each standard column against aliases
  for (const [standardName, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = aliases.find(alias => 
      lowerHeaders.some(h => h === alias.toLowerCase())
    );
    if (found) {
      mappedColumns.set(standardName, found);
    }
  }
  
  // Check required columns
  const foundRequired = REQUIRED_COLUMNS.filter(col => mappedColumns.has(col));
  const missingRequired = REQUIRED_COLUMNS.filter(col => !mappedColumns.has(col));
  
  // Calculate confidence based on required columns found
  let confidence = Math.round((foundRequired.length / REQUIRED_COLUMNS.length) * 100);
  
  // Build suggestions
  const suggestions: string[] = [];
  
  // If wide format detected, prioritize that message
  if (wideFormatCheck.isWideFormat) {
    suggestions.push(...wideFormatCheck.suggestions);
    // Lower confidence if wide format detected (needs conversion)
    confidence = Math.max(0, confidence - 30);
  }
  
  if (missingRequired.length > 0) {
    suggestions.push(`Add missing columns: ${missingRequired.join(', ')}`);
    suggestions.push('Download our template to see the correct format');
  }
  
  // Check for optional columns
  const foundOptional = OPTIONAL_COLUMNS.filter(col => mappedColumns.has(col));
  if (foundOptional.length === 0 && !wideFormatCheck.isWideFormat) {
    suggestions.push('Consider adding optional columns for better data quality: provider_type, geographic_region, n_orgs, n_incumbents');
  }
  
  // Determine if format is valid
  const isValid = missingRequired.length === 0 && !wideFormatCheck.isWideFormat;
  
  return {
    format: isValid ? 'normalized' : undefined,
    confidence,
    detectedColumns: headers,
    missingRequired: wideFormatCheck.isWideFormat 
      ? [...missingRequired, 'format_conversion_required']
      : missingRequired,
    suggestions
  };
}

/**
 * Get column mapping from detected headers to standard names
 * Returns map of standardName -> detectedName
 */
export function getColumnMapping(headers: string[]): Map<string, string> {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const mapping = new Map<string, string>();
  
  for (const [standardName, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      const lower = lowerHeaders[i];
      if (aliases.some(alias => alias.toLowerCase() === lower)) {
        mapping.set(standardName, headers[i]);
        break;
      }
    }
  }
  
  return mapping;
}

/**
 * Validate that all required columns are present
 */
export function validateRequiredColumns(headers: string[]): {
  isValid: boolean;
  missingColumns: string[];
  foundColumns: string[];
} {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const foundColumns: string[] = [];
  const missingColumns: string[] = [];
  
  for (const requiredCol of REQUIRED_COLUMNS) {
    const aliases = COLUMN_ALIASES[requiredCol] || [requiredCol];
    const found = aliases.some(alias => 
      lowerHeaders.includes(alias.toLowerCase())
    );
    
    if (found) {
      foundColumns.push(requiredCol);
    } else {
      missingColumns.push(requiredCol);
    }
  }
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns,
    foundColumns
  };
}

/**
 * Get format requirements for documentation/display
 * @deprecated Use getFormatRequirements() without parameters
 */
export function getFormatRequirements(format?: 'normalized'): {
  requiredColumns: string[];
  optionalColumns: string[];
  description: string;
  example: string;
} {
  return {
    requiredColumns: REQUIRED_COLUMNS,
    optionalColumns: OPTIONAL_COLUMNS,
    description: 'Normalized format: One row per variable per specialty. Each row contains percentile values for a single metric (TCC, wRVU, CF, etc.)',
    example: 'specialty,provider_type,geographic_region,variable,n_orgs,n_incumbents,p25,p50,p75,p90\nFamily Medicine,Advanced Practice,National,TCC,120,950,120000,135000,150000,165000'
  };
}

/**
 * Get expected format (always normalized now)
 * @deprecated Only normalized format is supported
 */
export function getExpectedFormat(_surveySource?: string): 'normalized' {
  return 'normalized';
}

/**
 * Get expected formats (always returns normalized only)
 * @deprecated Only normalized format is supported
 */
export function getExpectedFormats(_surveySource?: string): ('normalized')[] {
  return ['normalized'];
}

/**
 * Three-tier validation engine
 * Tier 1: Structural validation (critical - blocks processing)
 * Tier 2: Format & type validation (warnings - allows upload)
 * Tier 3: Content quality checks (info - visual highlighting)
 */

import {
  ValidationTier,
  ValidationIssue,
  Tier1ValidationResult,
  Tier2ValidationResult,
  Tier3ValidationResult,
  CompleteValidationResult,
  CellLocation
} from '../types/validation';

// Re-export types for convenience
export type {
  CompleteValidationResult,
  Tier1ValidationResult,
  Tier2ValidationResult,
  Tier3ValidationResult,
  ValidationIssue,
  ValidationTier
} from '../types/validation';

/**
 * Required column names (case-insensitive matching)
 */
const REQUIRED_COLUMNS = {
  specialty: ['specialty', 'speciality'],
  providerType: ['provider_type', 'provider type', 'providertype'],
  region: ['region', 'geographic region', 'geographic_region', 'geography'],
  variable: ['variable', 'benchmark', 'metric']
};

/**
 * Percentile column patterns (case-insensitive)
 */
const PERCENTILE_PATTERNS = [
  /^p25|25th|25th\s*%tile|25th\s*percentile$/i,
  /^p50|50th|50th\s*%tile|50th\s*percentile|median$/i,
  /^p75|75th|75th\s*%tile|75th\s*percentile$/i,
  /^p90|90th|90th\s*%tile|90th\s*percentile$/i
];

/**
 * Accepted variable values (case-insensitive with variations)
 * These match the variables supported throughout the analytics system
 */
const ACCEPTED_VARIABLES = [
  // Core compensation variables
  { patterns: [/^total\s*cash\s*compensation|^tcc$/i], name: 'Total Cash Compensation' },
  { patterns: [/^base\s*salary|^base$/i], name: 'Base Salary' },
  { patterns: [/^base\s*pay\s*hourly\s*rate|^hourly\s*rate$/i], name: 'Base Pay Hourly Rate' },
  { patterns: [/^bonus$/i], name: 'Bonus' },
  { patterns: [/^incentive$/i], name: 'Incentive' },
  { patterns: [/^total\s*compensation$/i], name: 'Total Compensation' },
  
  // Productivity variables
  { patterns: [/^wrvu|^work\s*rvu|^work\s*relative\s*value\s*unit$/i], name: 'wRVUs' },
  { patterns: [/^asa\s*units?|^asa$/i], name: 'ASA Units' },
  { patterns: [/^panel\s*size|^panel$|^patient\s*panel$/i], name: 'Panel Size' },
  { patterns: [/^total\s*encounters|^encounters|^patient\s*encounters|^total\s*visits$/i], name: 'Total Encounters' },
  { patterns: [/^net\s*collections|^collections$/i], name: 'Net Collections' },
  { patterns: [/^total\s*cost\s*of\s*benefits$/i], name: 'Total Cost of Benefits' },
  
  // Conversion factors
  { patterns: [/^conversion\s*factor|^cf$/i], name: 'Conversion Factor' },
  
  // Ratio variables
  { patterns: [/^tcc\s*per\s*encounter|^comp\s*per\s*encounter|^compensation\s*per\s*encounter$/i], name: 'TCC per Encounter' },
  { patterns: [/^tcc\s*to\s*net\s*collections|^tcc\s*to\s*collections|^comp\s*to\s*collections$/i], name: 'TCC to Net Collections' },
  { patterns: [/^tcc\s*per\s*asa\s*unit|^tcc\s*per\s*asa|^comp\s*per\s*asa$/i], name: 'TCC per ASA Unit' },
  
  // On-call compensation
  { patterns: [/^on\s*call\s*compensation|^oncall\s*compensation|^daily\s*rate\s*on\s*call|^on\s*call\s*rate$/i], name: 'Daily Rate On-Call Compensation' }
];

/**
 * Vendor markers that should be treated as placeholders (not errors)
 * These are used by survey vendors to indicate insufficient data or missing values
 * Common patterns:
 * - "*", "**", "***" - Asterisks indicating insufficient data
 * - "ISD" - Insufficient Sample Data (Sullivan Cotter)
 * - "N/A", "NA" - Not Available
 */
const VENDOR_MARKERS = [
  // Asterisk patterns (1-5 asterisks, common in surveys)
  '*', '**', '***', '****', '*****',
  // ISD variations (Sullivan Cotter)
  'ISD', 'isd', 'Isd', 'ISD*', 'isd*', 'ISD**', 'isd**', 'ISD***', 'isd***',
  // N/A variations
  'N/A', 'n/a', 'N/A*', 'n/a*', 'N/A**', 'n/a**', 'N/A***', 'n/a***',
  'NA', 'na', 'NA*', 'na*', 'NA**', 'na**', 'NA***', 'na***',
  // Dash patterns
  '--', '---', '----',
  // Combined patterns
  'N/A (ISD)', 'n/a (isd)', 'NA (ISD)', 'na (isd)',
  'Insufficient Sample Data', 'insufficient sample data',
  'Insufficient Data', 'insufficient data'
];

/**
 * Check if a column name matches a required column (case-insensitive)
 */
export function matchesRequiredColumn(columnName: string, requiredType: keyof typeof REQUIRED_COLUMNS): boolean {
  const lowerColumn = columnName.toLowerCase().trim();
  return REQUIRED_COLUMNS[requiredType].some(pattern => 
    lowerColumn === pattern || lowerColumn.includes(pattern)
  );
}

/**
 * Check if a column name matches a percentile pattern
 */
export function isPercentileColumn(columnName: string): boolean {
  return PERCENTILE_PATTERNS.some(pattern => pattern.test(columnName));
}

/**
 * Parse a formatted number string (handles currency, commas, percentages)
 * Examples: "$321,645" -> 321645, "89.00%" -> 89.00, "1,742" -> 1742
 * 
 * @param value - The value to parse
 * @returns The parsed number, or NaN if not parseable
 */
function parseFormattedNumber(value: any): number {
  if (value === null || value === undefined || value === '') {
    return NaN;
  }
  
  // Convert to string and trim
  let str = String(value).trim();
  
  // Check for vendor markers first (don't try to parse these)
  if (isVendorMarker(str)) {
    return NaN; // Vendor markers are valid but not numeric
  }
  
  // Remove currency symbols ($, €, £, ¥, etc.)
  str = str.replace(/^[\$€£¥₹]/, '');
  
  // Remove percentage sign and handle percentage (optional - we'll just strip it)
  const isPercentage = str.includes('%');
  str = str.replace(/%/g, '');
  
  // Remove commas (thousands separators)
  str = str.replace(/,/g, '');
  
  // Remove spaces
  str = str.replace(/\s/g, '');
  
  // Try to parse as number
  const num = Number(str);
  
  if (isNaN(num) || !isFinite(num)) {
    return NaN;
  }
  
  // For percentages, we could divide by 100, but for validation purposes,
  // we'll just check if it's a valid number format (the % is already stripped)
  return num;
}

/**
 * Check if a value is a valid number (including formatted numbers and empty strings)
 * Handles formatted numbers like "$321,645", "89.00%", "1,742"
 */
export function isValidNumber(value: any): boolean {
  if (value === null || value === undefined || value === '') {
    return true; // Empty is valid (may be optional)
  }
  
  // Try parsing as formatted number
  const parsed = parseFormattedNumber(value);
  return !isNaN(parsed);
}

/**
 * Check if a value matches accepted variable values
 */
export function isValidVariableValue(value: string): { valid: boolean; matchedName?: string } {
  const trimmedValue = value.trim();
  
  // Check vendor markers first (these are valid placeholders)
  if (isVendorMarker(trimmedValue)) {
    return { valid: true };
  }
  
  // Check against accepted variables
  for (const acceptedVar of ACCEPTED_VARIABLES) {
    if (acceptedVar.patterns.some(pattern => pattern.test(trimmedValue))) {
      return { valid: true, matchedName: acceptedVar.name };
    }
  }
  
  return { valid: false };
}

/**
 * Check if a value is a vendor marker (should not trigger errors)
 * Handles case-insensitive matching and variations
 * Also checks for asterisk-only patterns (1-10 asterisks)
 */
export function isVendorMarker(value: any): boolean {
  if (typeof value !== 'string') return false;
  const trimmedValue = value.trim();
  
  // Check if it's all asterisks (common pattern: *, **, ***, etc.)
  if (/^\*{1,10}$/.test(trimmedValue)) {
    return true;
  }
  
  // Check against known vendor markers (case-insensitive)
  return VENDOR_MARKERS.some(marker => {
    const lowerMarker = marker.toLowerCase();
    const lowerValue = trimmedValue.toLowerCase();
    return lowerValue === lowerMarker || lowerValue.includes(lowerMarker);
  });
}

/**
 * Tier 1: Structural Validation (Critical - Blocks Processing)
 */
export function validateTier1(
  headers: string[],
  rows: any[][]
): Tier1ValidationResult {
  const errors: ValidationIssue[] = [];

  // Check for empty file
  if (rows.length === 0) {
    errors.push({
      severity: 'critical',
      tier: ValidationTier.Tier1,
      category: 'structure',
      message: 'File contains no data rows',
      fixInstructions: [
        'Ensure your file contains data rows below the header row',
        'Check that the file was saved correctly'
      ]
    });
    return { isValid: false, errors, blocked: true };
  }

  // Check for empty headers
  if (headers.length === 0) {
    errors.push({
      severity: 'critical',
      tier: ValidationTier.Tier1,
      category: 'structure',
      message: 'No column headers found',
      fixInstructions: [
        'Ensure first row contains column names',
        'Check that file format is correct'
      ]
    });
    return { isValid: false, errors, blocked: true };
  }

  // Check for duplicate column headers
  const headerCounts = new Map<string, number>();
  const duplicateHeaders: string[] = [];
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const count = headerCounts.get(normalizedHeader) || 0;
    headerCounts.set(normalizedHeader, count + 1);
    if (count > 0 && !duplicateHeaders.includes(header)) {
      duplicateHeaders.push(header);
    }
  });

  if (duplicateHeaders.length > 0) {
    errors.push({
      severity: 'critical',
      tier: ValidationTier.Tier1,
      category: 'structure',
      message: `Duplicate column headers detected: ${duplicateHeaders.join(', ')}`,
      affectedColumns: duplicateHeaders,
      fixInstructions: [
        'Rename duplicate columns to make them unique',
        'Remove duplicate columns if they contain the same data'
      ]
    });
  }

  // Check for blank/empty headers
  const blankHeaders = headers
    .map((h, i) => ({ header: h, index: i }))
    .filter(({ header }) => !header || header.trim() === '');
  
  if (blankHeaders.length > 0) {
    errors.push({
      severity: 'critical',
      tier: ValidationTier.Tier1,
      category: 'structure',
      message: `Header row contains ${blankHeaders.length} blank or empty column${blankHeaders.length > 1 ? 's' : ''}`,
      affectedColumns: blankHeaders.map(h => `Column ${h.index + 1}`),
      fixInstructions: [
        'Add column names for all columns',
        'Remove empty columns if they are not needed'
      ]
    });
  }

  // Check for required columns
  const foundColumns = {
    specialty: headers.some(h => matchesRequiredColumn(h, 'specialty')),
    providerType: headers.some(h => matchesRequiredColumn(h, 'providerType')),
    region: headers.some(h => matchesRequiredColumn(h, 'region')),
    variable: headers.some(h => matchesRequiredColumn(h, 'variable'))
  };

  const missingColumns: string[] = [];
  if (!foundColumns.specialty) missingColumns.push('Specialty');
  if (!foundColumns.providerType) missingColumns.push('Provider_Type');
  if (!foundColumns.region) missingColumns.push('Region');
  if (!foundColumns.variable) missingColumns.push('Variable');

  if (missingColumns.length > 0) {
    errors.push({
      severity: 'critical',
      tier: ValidationTier.Tier1,
      category: 'structure',
      message: `Missing required columns: ${missingColumns.join(', ')}`,
      affectedColumns: missingColumns,
      fixInstructions: [
        'Add the missing required columns to your file',
        'Ensure column names match exactly (case-insensitive)',
        'Check that column names are in the header row'
      ]
    });
  }

  // Check for at least one percentile column
  const hasPercentileColumn = headers.some(h => isPercentileColumn(h));
  if (!hasPercentileColumn) {
    errors.push({
      severity: 'critical',
      tier: ValidationTier.Tier1,
      category: 'structure',
      message: 'No percentile columns found (need at least one of: 25th, 50th, 75th, 90th %tile)',
      fixInstructions: [
        'Add at least one percentile column (p25, p50, p75, or p90)',
        'Column names can be: "25th %tile", "p50", "median", "90th percentile", etc.'
      ]
    });
  }

  // Check for inconsistent row lengths
  const expectedLength = headers.length;
  const inconsistentRows: number[] = [];
  rows.forEach((row, index) => {
    if (row.length !== expectedLength) {
      inconsistentRows.push(index + 1); // 1-based for user display
    }
  });

  if (inconsistentRows.length > 0) {
    const sampleRows = inconsistentRows.slice(0, 5);
    errors.push({
      severity: 'critical',
      tier: ValidationTier.Tier1,
      category: 'structure',
      message: `${inconsistentRows.length} row${inconsistentRows.length > 1 ? 's' : ''} have inconsistent column count (expected ${expectedLength}, found different)`,
      affectedRows: sampleRows,
      fixInstructions: [
        `Fix rows: ${sampleRows.join(', ')}${inconsistentRows.length > 5 ? ` and ${inconsistentRows.length - 5} more` : ''}`,
        'Ensure all rows have the same number of columns as the header row',
        'Check for extra commas or missing values'
      ]
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    blocked: errors.length > 0
  };
}

/**
 * Tier 2: Format & Type Validation (Warnings - Allows Upload)
 */
export function validateTier2(
  headers: string[],
  rows: any[][]
): Tier2ValidationResult {
  const warnings: ValidationIssue[] = [];

  // Find column indices
  const specialtyColIndex = headers.findIndex(h => matchesRequiredColumn(h, 'specialty'));
  const regionColIndex = headers.findIndex(h => matchesRequiredColumn(h, 'region'));
  const variableColIndex = headers.findIndex(h => matchesRequiredColumn(h, 'variable'));

  // Find percentile columns
  const percentileColumns = headers
    .map((h, i) => ({ name: h, index: i }))
    .filter(({ name }) => isPercentileColumn(name));

  // Validate percentile columns contain valid numbers
  percentileColumns.forEach(({ name, index }) => {
    const invalidRows: Array<{ row: number; value: any }> = [];
    
    rows.forEach((row, rowIndex) => {
      const value = row[index];
      // Skip empty values and vendor markers (these are valid placeholders)
      if (value !== null && value !== undefined && value !== '') {
        const stringValue = String(value).trim();
        // Check if it's a vendor marker first (valid placeholder)
        if (isVendorMarker(stringValue)) {
          // Vendor markers are valid, skip
          return;
        }
        
        // Parse the value (handles formatted numbers like "$321,645", "89.00%", "1,742")
        const parsed = parseFormattedNumber(value);
        
        if (isNaN(parsed)) {
          // Not a valid number (formatted or otherwise)
          invalidRows.push({ row: rowIndex + 1, value: stringValue }); // 1-based
        }
        // If parsed successfully, it's a valid number (formatted or not) - no warning needed
      }
    });

    // Only warn about truly invalid values (not formatted numbers)
    if (invalidRows.length > 0) {
      const sampleRows = invalidRows.slice(0, 5);
      const uniqueValues = Array.from(new Set(sampleRows.map(r => r.value))).slice(0, 5);
      warnings.push({
        severity: 'warning',
        tier: ValidationTier.Tier2,
        category: 'format',
        message: `Column '${name}' contains non-numeric values in ${invalidRows.length} row${invalidRows.length > 1 ? 's' : ''}`,
        affectedRows: sampleRows.map(r => r.row),
        affectedColumns: [name],
        fixInstructions: [
          `Found non-numeric values: ${uniqueValues.map(v => `"${v}"`).join(', ')}${sampleRows.length > 5 ? ' and more' : ''}`,
          `Rows with issues: ${sampleRows.map(r => r.row).join(', ')}${invalidRows.length > 5 ? ` and ${invalidRows.length - 5} more` : ''}`,
          'Note: Vendor markers (ISD, *, N/A) are treated as valid placeholders',
          'Note: Formatted numbers (with $, commas, %) are automatically parsed and accepted',
          'Ensure percentile columns contain only numbers, formatted numbers, or valid vendor markers'
        ]
      });
    }
  });

  // Flag rows missing required fields
  const missingFields: Array<{ row: number; field: string }> = [];
  rows.forEach((row, rowIndex) => {
    if (specialtyColIndex >= 0 && (!row[specialtyColIndex] || String(row[specialtyColIndex]).trim() === '')) {
      missingFields.push({ row: rowIndex + 1, field: 'Specialty' });
    }
    if (regionColIndex >= 0 && (!row[regionColIndex] || String(row[regionColIndex]).trim() === '')) {
      missingFields.push({ row: rowIndex + 1, field: 'Region' });
    }
    if (variableColIndex >= 0 && (!row[variableColIndex] || String(row[variableColIndex]).trim() === '')) {
      missingFields.push({ row: rowIndex + 1, field: 'Variable' });
    }
  });

  if (missingFields.length > 0) {
    const groupedByField = missingFields.reduce((acc, item) => {
      if (!acc[item.field]) acc[item.field] = [];
      acc[item.field].push(item.row);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(groupedByField).forEach(([field, rows]) => {
      const sampleRows = rows.slice(0, 5);
      warnings.push({
        severity: 'warning',
        tier: ValidationTier.Tier2,
        category: 'data',
        message: `${rows.length} row${rows.length > 1 ? 's' : ''} missing required field: ${field}`,
        affectedRows: sampleRows,
        fixInstructions: [
          `Add ${field} values to rows: ${sampleRows.join(', ')}${rows.length > 5 ? ` and ${rows.length - 5} more` : ''}`
        ]
      });
    });
  }

  // Note: We don't validate Variable column values against a fixed list.
  // Survey vendors add new variables each year, and we can't predict them all.
  // The system is designed to handle any variable name dynamically.
  // We only check that the Variable column exists (structural validation) 
  // and has values (done in missing fields check above).

  return {
    isValid: warnings.length === 0,
    warnings,
    blocked: false // Tier 2 never blocks
  };
}

/**
 * Tier 3: Content Quality Checks (Info - Visual Highlighting)
 */
export function validateTier3(
  headers: string[],
  rows: any[][]
): Tier3ValidationResult {
  const info: ValidationIssue[] = [];

  // Find percentile columns
  const percentileColumns = headers
    .map((h, i) => ({ name: h, index: i }))
    .filter(({ name }) => isPercentileColumn(name));

  // Find p50 and p90 columns for comparison
  const p50Col = percentileColumns.find(({ name }) => /p50|50th|median/i.test(name));
  const p90Col = percentileColumns.find(({ name }) => /p90|90th/i.test(name));

  // Check if 50th percentile > 90th percentile
  if (p50Col && p90Col) {
    const invalidRows: number[] = [];
    rows.forEach((row, rowIndex) => {
      const p50Value = Number(row[p50Col.index]);
      const p90Value = Number(row[p90Col.index]);
      if (isValidNumber(p50Value) && isValidNumber(p90Value) && p50Value > p90Value) {
        invalidRows.push(rowIndex + 1);
      }
    });

    if (invalidRows.length > 0) {
      const sampleRows = invalidRows.slice(0, 5);
      info.push({
        severity: 'info',
        tier: ValidationTier.Tier3,
        category: 'content',
        message: `${invalidRows.length} row${invalidRows.length > 1 ? 's' : ''} have 50th percentile exceeding 90th percentile`,
        affectedRows: sampleRows,
        affectedColumns: [p50Col.name, p90Col.name],
        fixInstructions: [
          `Review rows: ${sampleRows.join(', ')}${invalidRows.length > 5 ? ` and ${invalidRows.length - 5} more` : ''}`,
          '50th percentile should typically be less than 90th percentile',
          'Verify data accuracy'
        ]
      });
    }
  }

  // Check for negative or zero percentile values
  percentileColumns.forEach(({ name, index }) => {
    const invalidRows: number[] = [];
    rows.forEach((row, rowIndex) => {
      const value = Number(row[index]);
      if (isValidNumber(value) && value <= 0) {
        invalidRows.push(rowIndex + 1);
      }
    });

    if (invalidRows.length > 0) {
      const sampleRows = invalidRows.slice(0, 5);
      info.push({
        severity: 'info',
        tier: ValidationTier.Tier3,
        category: 'content',
        message: `Column '${name}' contains ${invalidRows.length} negative or zero value${invalidRows.length > 1 ? 's' : ''}`,
        affectedRows: sampleRows,
        affectedColumns: [name],
        fixInstructions: [
          `Review rows: ${sampleRows.join(', ')}${invalidRows.length > 5 ? ` and ${invalidRows.length - 5} more` : ''}`,
          'Percentile values should typically be positive numbers'
        ]
      });
    }
  });

  // Check for duplicate rows (exact duplicates)
  const rowHashes = new Map<string, number[]>();
  rows.forEach((row, rowIndex) => {
    const hash = JSON.stringify(row);
    if (!rowHashes.has(hash)) {
      rowHashes.set(hash, []);
    }
    rowHashes.get(hash)!.push(rowIndex + 1);
  });

  const duplicateGroups = Array.from(rowHashes.entries())
    .filter(([_, rows]) => rows.length > 1);

  if (duplicateGroups.length > 0) {
    const sampleDuplicates = duplicateGroups.slice(0, 3);
    const duplicateRows = sampleDuplicates.flatMap(([_, rows]) => rows);
    info.push({
      severity: 'info',
      tier: ValidationTier.Tier3,
      category: 'content',
      message: `${duplicateGroups.length} set${duplicateGroups.length > 1 ? 's' : ''} of duplicate rows detected`,
      affectedRows: duplicateRows.slice(0, 10),
      fixInstructions: [
        `Duplicate rows found: ${duplicateRows.slice(0, 5).join(', ')}${duplicateRows.length > 5 ? ` and ${duplicateRows.length - 5} more` : ''}`,
        'Review if duplicates are intentional or should be removed'
      ]
    });
  }

  return {
    isValid: true, // Tier 3 never fails validation
    info,
    blocked: false
  };
}

/**
 * Run all validation tiers and return complete result
 */
export function validateAll(
  headers: string[],
  rows: any[][]
): CompleteValidationResult {
  const tier1 = validateTier1(headers, rows);
  const tier2 = validateTier2(headers, rows);
  const tier3 = validateTier3(headers, rows);

  const errorCount = tier1.errors.length;
  const warningCount = tier2.warnings.length;
  const infoCount = tier3.info.length;
  const totalIssues = errorCount + warningCount + infoCount;

  return {
    tier1,
    tier2,
    tier3,
    isValid: tier1.isValid,
    canProceed: tier1.isValid, // Can only proceed if Tier 1 passes
    totalIssues,
    errorCount,
    warningCount,
    infoCount
  };
}

/**
 * Validate a single row (for inline editing)
 * Returns row-level validation result
 */
export function validateSingleRow(
  row: any[],
  headers: string[],
  rowIndex: number
): any {
  // Use the row validation utility
  const { validateRow } = require('./rowValidation');
  return validateRow(row, headers, rowIndex);
}

/**
 * Validate a single cell (for inline editing)
 * Returns cell-level validation result
 */
export function validateSingleCell(
  value: any,
  columnName: string,
  rowIndex: number,
  headers: string[]
): any {
  // Use the row validation utility
  const { validateCell } = require('./rowValidation');
  return validateCell(value, columnName, rowIndex, headers);
}


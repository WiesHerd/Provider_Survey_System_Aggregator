/**
 * Row-level validation utilities
 * Provides functions to validate individual rows and cells for inline editing
 */

import {
  CellValidation,
  ValidationIssue,
  ValidationTier,
  CellLocation
} from '../types/validation';
import {
  RowValidationResult
} from '../types/editableTable';
import {
  matchesRequiredColumn,
  isPercentileColumn,
  isValidNumber,
  isValidVariableValue,
  isVendorMarker
} from './validationEngine';

// Helper function to check required columns (wrapper for validationEngine function)
function matchesRequiredColumnLocal(columnName: string, requiredType: 'specialty' | 'providerType' | 'region' | 'variable'): boolean {
  // Map local type to validationEngine type
  const typeMap: Record<string, keyof typeof REQUIRED_COLUMNS> = {
    specialty: 'specialty',
    providerType: 'providerType',
    region: 'region',
    variable: 'variable'
  };
  return matchesRequiredColumn(columnName, typeMap[requiredType]);
}

// Import REQUIRED_COLUMNS type from validationEngine (we need to check if it's exported)
// For now, we'll use a local constant that matches the validationEngine structure
const REQUIRED_COLUMNS = {
  specialty: ['specialty', 'speciality'],
  providerType: ['provider_type', 'provider type', 'providertype'],
  region: ['region', 'geographic region', 'geographic_region', 'geography'],
  variable: ['variable', 'benchmark', 'metric']
} as const;

/**
 * Validate a single cell
 * 
 * @param value - Cell value
 * @param columnName - Column header name
 * @param rowIndex - Row index (0-based)
 * @param headers - All column headers
 * @returns Cell validation result
 */
export function validateCell(
  value: any,
  columnName: string,
  rowIndex: number,
  headers: string[]
): CellValidation {
  const cellLocation: CellLocation = {
    row: rowIndex,
    column: headers.indexOf(columnName),
    columnName
  };

  const issues: ValidationIssue[] = [];
  let hasCriticalError = false;
  let hasWarning = false;
  let hasInfo = false;

  // Check if required field is missing
  if (matchesRequiredColumn(columnName, 'specialty' as any) || 
      matchesRequiredColumn(columnName, 'region' as any) ||
      matchesRequiredColumn(columnName, 'variable' as any)) {
    const stringValue = String(value || '').trim();
    if (!stringValue || stringValue === '') {
      issues.push({
        severity: 'critical',
        tier: ValidationTier.Tier1,
        category: 'structure',
        message: `Missing required field: ${columnName}`,
        cellLocation,
        fixInstructions: [`Add a value for ${columnName}`]
      });
      hasCriticalError = true;
    }
  }

  // Check percentile columns for numeric values
  if (isPercentileColumn(columnName)) {
    const stringValue = String(value || '').trim();
    if (stringValue && !isVendorMarker(stringValue)) {
      if (!isValidNumber(value)) {
        issues.push({
          severity: 'warning',
          tier: ValidationTier.Tier2,
          category: 'format',
          message: `Expected number, found '${stringValue}'`,
          cellLocation,
          fixInstructions: [
            'Ensure percentile columns contain only numbers',
            'Note: Vendor markers (ISD, *, ***) are treated as valid placeholders'
          ]
        });
        hasWarning = true;
      }
    }
  }

  // Note: We don't validate Variable column values against a fixed list.
  // Survey vendors add new variables each year, and we can't predict them all.
  // The system is designed to handle any variable name dynamically.
  // We only check that the Variable column exists and has values (structural validation).

  return {
    cellLocation,
    issues,
    hasCriticalError,
    hasWarning,
    hasInfo
  };
}

/**
 * Validate a single row
 * 
 * @param row - Row data array
 * @param headers - Column headers
 * @param rowIndex - Row index (0-based)
 * @returns Row validation result
 */
export function validateRow(
  row: any[],
  headers: string[],
  rowIndex: number
): RowValidationResult {
  const cellValidations = new Map<number, CellValidation>();
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];

  // Validate each cell in the row
  headers.forEach((header, colIndex) => {
    const value = row[colIndex];
    const cellValidation = validateCell(value, header, rowIndex, headers);
    cellValidations.set(colIndex, cellValidation);

    // Categorize issues
    cellValidation.issues.forEach(issue => {
      if (issue.severity === 'critical') {
        errors.push(issue);
      } else if (issue.severity === 'warning') {
        warnings.push(issue);
      } else if (issue.severity === 'info') {
        info.push(issue);
      }
    });
  });

  return {
    rowIndex,
    isValid: errors.length === 0,
    cellValidations,
    errors,
    warnings,
    info,
    errorCount: errors.length,
    warningCount: warnings.length,
    infoCount: info.length
  };
}

/**
 * Get human-readable validation message for a cell
 * 
 * @param validation - Cell validation result
 * @returns Validation message string
 */
export function getCellValidationMessage(validation: CellValidation): string {
  if (!validation || validation.issues.length === 0) {
    return '';
  }

  const criticalIssues = validation.issues.filter(i => i.severity === 'critical');
  const warningIssues = validation.issues.filter(i => i.severity === 'warning');
  const infoIssues = validation.issues.filter(i => i.severity === 'info');

  const messages: string[] = [];
  
  if (criticalIssues.length > 0) {
    messages.push(`Critical: ${criticalIssues.map(i => i.message).join('; ')}`);
  }
  if (warningIssues.length > 0) {
    messages.push(`Warning: ${warningIssues.map(i => i.message).join('; ')}`);
  }
  if (infoIssues.length > 0) {
    messages.push(`Info: ${infoIssues.map(i => i.message).join('; ')}`);
  }

  return messages.join('\n');
}


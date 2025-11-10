/**
 * Error Message Formatter
 * Transforms technical validation messages into user-friendly, action-oriented guidance
 * Enterprise-grade: Clear, concise, and user-centric
 */

import { ValidationIssue, ValidationSeverity } from '../types/validation';

/**
 * User-friendly message format
 */
export interface UserFriendlyMessage {
  primary: string;        // Main message (one sentence)
  guidance: string;       // What to do (one sentence)
  details?: {             // Optional details (collapsed by default)
    affectedRows?: number[];
    affectedColumns?: string[];
    examples?: string[];
  };
  severity: ValidationSeverity;
}

/**
 * Grouped issue for combining similar errors
 */
export interface GroupedIssue {
  issues: ValidationIssue[];
  primary: string;
  guidance: string;
  severity: ValidationSeverity;
  details?: {
    affectedRows?: number[];
    affectedColumns?: string[];
    examples?: string[];
  };
}

/**
 * Transform technical validation issue to user-friendly message
 */
export function formatUserMessage(issue: ValidationIssue): UserFriendlyMessage {
  const primary = formatPrimaryMessage(issue);
  const guidance = getActionableGuidance(issue);
  
  return {
    primary,
    guidance,
    severity: issue.severity,
    details: {
      affectedRows: issue.affectedRows,
      affectedColumns: issue.affectedColumns,
      examples: issue.example ? [issue.example] : undefined
    }
  };
}

/**
 * Format primary message - one clear sentence
 */
function formatPrimaryMessage(issue: ValidationIssue): string {
  const message = issue.message.toLowerCase();
  
  // Missing columns
  if (message.includes('missing required columns') || message.includes('missing column')) {
    const columns = extractColumnNames(issue.message, issue.affectedColumns);
    if (columns.length === 1) {
      return `Add ${formatColumnName(columns[0])} column`;
    } else if (columns.length === 2) {
      return `Add ${formatColumnName(columns[0])} and ${formatColumnName(columns[1])} columns`;
    } else {
      return `Add ${columns.length} required columns: ${columns.map(formatColumnName).join(', ')}`;
    }
  }
  
  // Duplicate rows
  if (message.includes('duplicate rows') || message.includes('duplicate row')) {
    const count = extractCount(issue.message) || issue.affectedRows?.length || 0;
    return `${count} duplicate row${count !== 1 ? 's' : ''} found`;
  }
  
  // Duplicate columns
  if (message.includes('duplicate column')) {
    const columns = extractColumnNames(issue.message, issue.affectedColumns);
    return `Duplicate columns found: ${columns.map(formatColumnName).join(', ')}`;
  }
  
  // No data rows
  if (message.includes('no data rows') || message.includes('no rows')) {
    return 'File contains no data';
  }
  
  // No headers
  if (message.includes('no column headers') || message.includes('no headers')) {
    return 'Add column headers to your file';
  }
  
  // Missing percentile columns
  if (message.includes('percentile') && message.includes('not found')) {
    return 'Add percentile columns (25th, 50th, 75th, or 90th)';
  }
  
  // Inconsistent row lengths
  if (message.includes('inconsistent column count') || message.includes('inconsistent row')) {
    const count = extractCount(issue.message) || issue.affectedRows?.length || 0;
    return `${count} row${count !== 1 ? 's' : ''} have incorrect column count`;
  }
  
  // Non-numeric values
  if (message.includes('non-numeric') || message.includes('contains non-numeric')) {
    const column = extractColumnName(issue.message);
    return `Some values in ${column} aren't numbers`;
  }
  
  // Missing required fields
  if (message.includes('missing required field')) {
    const field = extractFieldName(issue.message);
    const count = extractCount(issue.message) || issue.affectedRows?.length || 0;
    return `${count} row${count !== 1 ? 's' : ''} missing ${field}`;
  }
  
  // Percentile validation errors
  if (message.includes('percentile') && (message.includes('exceed') || message.includes('invalid'))) {
    return 'Some percentile values appear incorrect';
  }
  
  // Negative values
  if (message.includes('negative') || message.includes('zero value')) {
    const column = extractColumnName(issue.message);
    return `Some values in ${column} are negative or zero`;
  }
  
  // Blank headers
  if (message.includes('blank') && message.includes('header')) {
    const count = extractCount(issue.message) || 0;
    return `${count} blank column header${count !== 1 ? 's' : ''} found`;
  }
  
  // Default: clean up technical language
  return cleanTechnicalMessage(issue.message);
}

/**
 * Get actionable guidance - what user should do
 */
function getActionableGuidance(issue: ValidationIssue): string {
  const message = issue.message.toLowerCase();
  
  // Missing columns
  if (message.includes('missing required columns') || message.includes('missing column')) {
    const columns = extractColumnNames(issue.message, issue.affectedColumns);
    if (columns.length === 1) {
      return `Add ${formatColumnName(columns[0])} to your file header and include values for each row.`;
    } else {
      return `Add these columns to your file header and include values for each row.`;
    }
  }
  
  // Duplicate rows
  if (message.includes('duplicate rows') || message.includes('duplicate row')) {
    return 'Remove duplicates if they\'re not needed.';
  }
  
  // Duplicate columns
  if (message.includes('duplicate column')) {
    return 'Rename or remove duplicate columns.';
  }
  
  // No data rows
  if (message.includes('no data rows') || message.includes('no rows')) {
    return 'Add data rows below the header row.';
  }
  
  // No headers
  if (message.includes('no column headers') || message.includes('no headers')) {
    return 'Add column names in the first row of your file.';
  }
  
  // Missing percentile columns
  if (message.includes('percentile') && message.includes('not found')) {
    return 'Add at least one percentile column (p25, p50, p75, or p90).';
  }
  
  // Inconsistent row lengths
  if (message.includes('inconsistent column count') || message.includes('inconsistent row')) {
    return 'Ensure all rows have the same number of columns as the header row.';
  }
  
  // Non-numeric values
  if (message.includes('non-numeric') || message.includes('contains non-numeric')) {
    return 'Use numbers or leave blank. Vendor markers (ISD, *, N/A) are accepted.';
  }
  
  // Missing required fields
  if (message.includes('missing required field')) {
    const field = extractFieldName(issue.message);
    return `Add ${field} values to the affected rows.`;
  }
  
  // Percentile validation errors
  if (message.includes('percentile') && (message.includes('exceed') || message.includes('invalid'))) {
    return 'Review percentile values for accuracy.';
  }
  
  // Negative values
  if (message.includes('negative') || message.includes('zero value')) {
    return 'Review values - they should typically be positive numbers.';
  }
  
  // Blank headers
  if (message.includes('blank') && message.includes('header')) {
    return 'Add names for all columns or remove empty columns.';
  }
  
  // Default: use first fix instruction if available
  if (issue.fixInstructions && issue.fixInstructions.length > 0) {
    return cleanTechnicalMessage(issue.fixInstructions[0]);
  }
  
  return 'Review and fix the issue above.';
}

/**
 * Group related issues intelligently
 */
export function groupRelatedIssues(issues: ValidationIssue[]): GroupedIssue[] {
  const groups: Map<string, ValidationIssue[]> = new Map();
  
  issues.forEach(issue => {
    const key = getGroupingKey(issue);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(issue);
  });
  
  return Array.from(groups.entries()).map(([key, groupedIssues]) => {
    // Sort by severity (critical first)
    groupedIssues.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return 0;
    });
    
    const primaryIssue = groupedIssues[0];
    const primary = formatPrimaryMessage(primaryIssue);
    const guidance = getActionableGuidance(primaryIssue);
    
    // Combine affected rows and columns
    const affectedRows = new Set<number>();
    const affectedColumns = new Set<string>();
    
    groupedIssues.forEach(issue => {
      issue.affectedRows?.forEach(row => affectedRows.add(row));
      issue.affectedColumns?.forEach(col => affectedColumns.add(col));
    });
    
    return {
      issues: groupedIssues,
      primary: enhanceGroupedMessage(primary, groupedIssues.length),
      guidance,
      severity: primaryIssue.severity,
      details: {
        affectedRows: Array.from(affectedRows).sort((a, b) => a - b),
        affectedColumns: Array.from(affectedColumns),
      }
    };
  });
}

/**
 * Get grouping key for similar issues
 */
function getGroupingKey(issue: ValidationIssue): string {
  const message = issue.message.toLowerCase();
  
  // Group missing columns together
  if (message.includes('missing required columns') || message.includes('missing column')) {
    return 'missing-columns';
  }
  
  // Group duplicate rows together
  if (message.includes('duplicate rows') || message.includes('duplicate row')) {
    return 'duplicate-rows';
  }
  
  // Group duplicate columns together
  if (message.includes('duplicate column')) {
    return 'duplicate-columns';
  }
  
  // Group non-numeric errors by column
  if (message.includes('non-numeric') || message.includes('contains non-numeric')) {
    const column = extractColumnName(issue.message);
    return `non-numeric-${column}`;
  }
  
  // Group missing fields by field name
  if (message.includes('missing required field')) {
    const field = extractFieldName(issue.message);
    return `missing-field-${field}`;
  }
  
  // Group inconsistent rows together
  if (message.includes('inconsistent column count') || message.includes('inconsistent row')) {
    return 'inconsistent-rows';
  }
  
  // Default: group by category and severity
  return `${issue.category}-${issue.severity}`;
}

/**
 * Enhance grouped message with count
 */
function enhanceGroupedMessage(message: string, count: number): string {
  if (count === 1) return message;
  
  // Add count if not already present
  if (!message.match(/^\d+/)) {
    return `${count} ${message.toLowerCase()}`;
  }
  
  return message;
}

/**
 * Prioritize issues - critical first, then warnings, then info
 */
export function prioritizeIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Extract column names from message
 */
function extractColumnNames(message: string, affectedColumns?: string[]): string[] {
  // Always prefer affectedColumns if available
  if (affectedColumns && affectedColumns.length > 0) {
    return affectedColumns;
  }
  
  // Try to extract from message patterns
  // Pattern: "Missing required columns: X, Y, Z"
  let match = message.match(/(?:missing required columns?|columns?):\s*([^.]+)/i);
  if (match) {
    return match[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // Pattern: "Duplicate column headers detected: X, Y"
  match = message.match(/duplicate column headers? detected:\s*([^.]+)/i);
  if (match) {
    return match[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // Pattern: Column 'X' contains...
  match = message.match(/column\s+['"]([^'"]+)['"]/i);
  if (match) {
    return [match[1]];
  }
  
  return [];
}

/**
 * Extract column name from message
 */
function extractColumnName(message: string): string {
  const match = message.match(/column\s+['"]([^'"]+)['"]/i) ||
                message.match(/['"]([^'"]+)['"]\s+contains/i);
  
  if (match) {
    return formatColumnName(match[1]);
  }
  
  // Try to find column name in affectedColumns context
  return 'this column';
}

/**
 * Format column name for display
 */
function formatColumnName(column: string): string {
  // Convert snake_case and camelCase to Title Case
  return column
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract field name from message
 */
function extractFieldName(message: string): string {
  const match = message.match(/field\s+['"]([^'"]+)['"]/i) ||
                message.match(/missing\s+([^.]+)/i);
  
  if (match) {
    return formatColumnName(match[1]);
  }
  
  return 'required field';
}

/**
 * Extract count from message
 */
function extractCount(message: string): number | null {
  const match = message.match(/(\d+)\s+(?:row|column|set|issue)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Clean technical message - remove jargon, make conversational
 */
function cleanTechnicalMessage(message: string): string {
  return message
    // Remove technical prefixes
    .replace(/^(error|warning|info):\s*/i, '')
    // Remove row/column indices
    .replace(/row\s+\d+/gi, '')
    .replace(/column\s+\d+/gi, '')
    // Clean up punctuation
    .replace(/\s+/g, ' ')
    .trim()
    // Capitalize first letter
    .replace(/^./, c => c.toUpperCase());
}


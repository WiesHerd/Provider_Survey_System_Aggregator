/**
 * Validation type definitions for three-tier validation system
 * Tier 1: Structural validation (critical - blocks processing)
 * Tier 2: Format & type validation (warnings - allows upload)
 * Tier 3: Content quality checks (info - visual highlighting)
 */

/**
 * Validation tier enumeration
 */
export enum ValidationTier {
  Tier1 = 'tier1', // Structural validation - critical errors
  Tier2 = 'tier2', // Format & type validation - warnings
  Tier3 = 'tier3'  // Content quality checks - info
}

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'critical' | 'warning' | 'info';

/**
 * Validation category
 */
export type ValidationCategory = 
  | 'structure' 
  | 'format' 
  | 'data' 
  | 'business' 
  | 'encoding'
  | 'content'
  | 'statistical'  // Statistical analysis (outliers, distributions)
  | 'completeness' // Data completeness metrics
  | 'consistency'; // Cross-row consistency checks

/**
 * Cell location for validation issues
 */
export interface CellLocation {
  row: number; // 0-based row index
  column: number; // 0-based column index
  columnName?: string; // Column header name
}

/**
 * Validation issue interface
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  tier: ValidationTier;
  category: ValidationCategory;
  message: string;
  cellLocation?: CellLocation;
  affectedRows?: number[]; // Row indices (1-based for user display)
  affectedColumns?: string[]; // Column names
  fixInstructions?: string[];
  example?: string;
}

/**
 * Tier 1 validation result (structural - critical)
 */
export interface Tier1ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  blocked: boolean; // Always true for Tier 1 errors
}

/**
 * Tier 2 validation result (format & type - warnings)
 */
export interface Tier2ValidationResult {
  isValid: boolean;
  warnings: ValidationIssue[];
  blocked: boolean; // Always false for Tier 2
}

/**
 * Tier 3 validation result (content quality - info)
 */
export interface Tier3ValidationResult {
  isValid: boolean;
  info: ValidationIssue[];
  blocked: boolean; // Always false for Tier 3
}

/**
 * Complete validation result combining all tiers
 */
export interface CompleteValidationResult {
  tier1: Tier1ValidationResult;
  tier2: Tier2ValidationResult;
  tier3: Tier3ValidationResult;
  isValid: boolean; // True only if Tier 1 is valid
  canProceed: boolean; // True if Tier 1 is valid (Tier 2/3 don't block)
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Cell-level validation data for highlighting
 */
export interface CellValidation {
  cellLocation: CellLocation;
  issues: ValidationIssue[];
  hasCriticalError: boolean;
  hasWarning: boolean;
  hasInfo: boolean;
}

/**
 * Validation summary for display
 */
export interface ValidationSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  summaryMessage: string;
  tier1Errors: ValidationIssue[];
  tier2Warnings: ValidationIssue[];
  tier3Info: ValidationIssue[];
}

/**
 * File metadata for parsing
 */
export interface FileMetadata {
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'xls';
  fileSize: number;
  sheetName?: string; // For Excel files
  sheetCount?: number; // For Excel files
  rowCount: number;
  columnCount: number;
  hasMergedCells?: boolean; // Excel-specific
}

/**
 * Parse result from file parser
 */
export interface ParseResult {
  headers: string[];
  rows: any[][]; // Array of row arrays
  metadata: FileMetadata;
}

/**
 * Excel parse result
 */
export interface ExcelParseResult {
  sheets: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
  }>;
  data: {
    headers: string[];
    rows: any[][];
  };
  selectedSheet?: string;
  hasMergedCells: boolean;
}


/**
 * Type definitions for editable table with inline validation
 */

import { CellValidation, ValidationIssue } from './validation';

/**
 * Individual cell edit with validation status
 */
export interface CellEdit {
  rowIndex: number;
  colIndex: number;
  originalValue: any;
  editedValue: any;
  isEdited: boolean;
  validation: CellValidation | null;
}

/**
 * Editable row data with edit state and validation
 */
export interface EditableRow {
  index: number; // Original row index (0-based)
  data: any[]; // Row data array
  originalData: any[]; // Original row data (for reset)
  isDeleted: boolean;
  isDirty: boolean; // Has unsaved edits
  cellEdits: Map<number, CellEdit>; // colIndex -> CellEdit
  validation: RowValidationResult | null;
}

/**
 * Per-row validation result
 */
export interface RowValidationResult {
  rowIndex: number;
  isValid: boolean;
  cellValidations: Map<number, CellValidation>; // colIndex -> CellValidation
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Overall table edit state
 */
export interface TableEditState {
  rows: EditableRow[];
  deletedRows: Set<number>; // Original row indices
  editedCells: Map<string, any>; // "row-col" -> edited value
  validationResults: Map<number, RowValidationResult>; // rowIndex -> validation
  hasUnsavedChanges: boolean;
  totalEdits: number;
  totalDeletions: number;
}

/**
 * Props for ValidationPreviewTable component
 */
export interface ValidationPreviewTableProps {
  headers: string[];
  rows: any[][];
  validationResult: any; // CompleteValidationResult
  onDataChange?: (cleanedData: { headers: string[]; rows: any[][] }) => void;
  onValidationChange?: (validationResult: any) => void;
  maxPreviewRows?: number;
  disabled?: boolean;
}

/**
 * Props for EditableCell component
 */
export interface EditableCellProps {
  value: any;
  rowIndex: number;
  colIndex: number;
  columnName: string;
  validation: CellValidation | null;
  onEdit: (rowIndex: number, colIndex: number, value: any) => void;
  disabled?: boolean;
}


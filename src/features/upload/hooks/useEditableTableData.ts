/**
 * Hook for managing editable table data with validation
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  EditableRow,
  TableEditState,
  RowValidationResult,
  CellEdit
} from '../types/editableTable';
import {
  validateRow,
  validateCell
} from '../utils/rowValidation';

interface UseEditableTableDataOptions {
  headers: string[];
  rows: any[][];
  maxPreviewRows?: number;
}

interface UseEditableTableDataReturn {
  // State
  editableRows: EditableRow[];
  deletedRows: Set<number>;
  hasUnsavedChanges: boolean;
  totalEdits: number;
  totalDeletions: number;
  
  // Actions
  editCell: (rowIndex: number, colIndex: number, value: any) => void;
  deleteRow: (rowIndex: number) => void;
  restoreRow: (rowIndex: number) => void;
  addRow: () => void;
  resetChanges: () => void;
  
  // Data
  getCleanedData: () => { headers: string[]; rows: any[][] };
  getValidationSummary: () => {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    rowsWithIssues: number;
  };
}

/**
 * Hook for managing editable table data with inline validation
 * 
 * @param options - Configuration options
 * @returns Editable table state and actions
 */
export function useEditableTableData(
  options: UseEditableTableDataOptions
): UseEditableTableDataReturn {
  const { headers, rows, maxPreviewRows = 20 } = options;

  // Initialize editable rows from original data
  const initializeRows = useCallback((): EditableRow[] => {
    const previewRows = rows.slice(0, maxPreviewRows);
    return previewRows.map((row, index) => ({
      index,
      data: [...row],
      originalData: [...row],
      isDeleted: false,
      isDirty: false,
      cellEdits: new Map(),
      validation: null
    }));
  }, [rows, maxPreviewRows]);

  const [editableRows, setEditableRows] = useState<EditableRow[]>(() => initializeRows());
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
  const [validationResults, setValidationResults] = useState<Map<number, RowValidationResult>>(new Map());

  // Initialize validation when rows change
  useEffect(() => {
    const initialValidations = new Map<number, RowValidationResult>();
    editableRows.forEach(row => {
      if (!row.isDeleted && !validationResults.has(row.index)) {
        const validation = validateRow(row.data, headers, row.index);
        initialValidations.set(row.index, validation);
      }
    });
    if (initialValidations.size > 0) {
      setValidationResults(prev => {
        const newMap = new Map(prev);
        initialValidations.forEach((validation, index) => {
          newMap.set(index, validation);
        });
        return newMap;
      });
    }
  }, [editableRows.length, headers]); // Run when rows or headers change

  // Re-initialize when headers or rows change
  useEffect(() => {
    setEditableRows(initializeRows());
    setDeletedRows(new Set());
    setValidationResults(new Map());
  }, [initializeRows]);

  // Edit a cell
  const editCell = useCallback((rowIndex: number, colIndex: number, value: any) => {
    setEditableRows(prev => {
      const newRows = [...prev];
      const row = newRows.find(r => r.index === rowIndex);
      if (!row || row.isDeleted) return prev;

      // Update row data
      const newData = [...row.data];
      newData[colIndex] = value;

      // Validate the cell first
      const cellValidation = validateCell(value, headers[colIndex], rowIndex, headers);

      // Create cell edit record
      const cellEdit: CellEdit = {
        rowIndex,
        colIndex,
        originalValue: row.originalData[colIndex],
        editedValue: value,
        isEdited: true,
        validation: cellValidation
      };

      // Update cell edits map
      const newCellEdits = new Map(row.cellEdits);
      newCellEdits.set(colIndex, cellEdit);

      // Validate the entire row
      const rowValidation = validateRow(newData, headers, rowIndex);

      // Update validation results
      setValidationResults(prevValidations => {
        const newValidations = new Map(prevValidations);
        newValidations.set(rowIndex, rowValidation);
        return newValidations;
      });

      // Update row
      const updatedRow: EditableRow = {
        ...row,
        data: newData,
        isDirty: true,
        cellEdits: newCellEdits,
        validation: rowValidation
      };

      const rowIndexInArray = newRows.findIndex(r => r.index === rowIndex);
      if (rowIndexInArray >= 0) {
        newRows[rowIndexInArray] = updatedRow;
      }

      return newRows;
    });
  }, [headers]);

  // Delete a row
  const deleteRow = useCallback((rowIndex: number) => {
    setDeletedRows(prev => {
      const newSet = new Set(prev);
      newSet.add(rowIndex);
      return newSet;
    });

    setEditableRows(prev => {
      return prev.map(row => 
        row.index === rowIndex 
          ? { ...row, isDeleted: true }
          : row
      );
    });

    // Remove validation result for deleted row
    setValidationResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(rowIndex);
      return newMap;
    });
  }, []);

  // Restore a deleted row
  const restoreRow = useCallback((rowIndex: number) => {
    setDeletedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(rowIndex);
      return newSet;
    });

    setEditableRows(prev => {
      return prev.map(row => {
        if (row.index === rowIndex) {
          // Restore original data and re-validate
          const restoredRow: EditableRow = {
            ...row,
            data: [...row.originalData],
            isDeleted: false,
            isDirty: false,
            cellEdits: new Map(),
            validation: null
          };

          // Re-validate restored row
          const validation = validateRow(restoredRow.data, headers, rowIndex);
          restoredRow.validation = validation;

          setValidationResults(prevValidations => {
            const newValidations = new Map(prevValidations);
            newValidations.set(rowIndex, validation);
            return newValidations;
          });

          return restoredRow;
        }
        return row;
      });
    });
  }, [headers]);

  // Add a new row
  const addRow = useCallback(() => {
    const newRowIndex = editableRows.length > 0 
      ? Math.max(...editableRows.map(r => r.index)) + 1 
      : rows.length;
    
    const emptyRow = headers.map(() => '');
    const newRow: EditableRow = {
      index: newRowIndex,
      data: emptyRow,
      originalData: emptyRow,
      isDeleted: false,
      isDirty: true,
      cellEdits: new Map(),
      validation: null
    };

    // Validate the new row
    const validation = validateRow(newRow.data, headers, newRowIndex);
    newRow.validation = validation;

    setEditableRows(prev => [...prev, newRow]);
    setValidationResults(prev => {
      const newMap = new Map(prev);
      newMap.set(newRowIndex, validation);
      return newMap;
    });
  }, [editableRows, headers, rows.length]);

  // Reset all changes
  const resetChanges = useCallback(() => {
    setEditableRows(initializeRows());
    setDeletedRows(new Set());
    setValidationResults(new Map());
  }, [initializeRows]);

  // Get cleaned data (excluding deleted rows, with edits applied)
  const getCleanedData = useCallback(() => {
    const cleanedRows = editableRows
      .filter(row => !row.isDeleted)
      .map(row => row.data);

    return {
      headers: [...headers],
      rows: cleanedRows
    };
  }, [editableRows, headers]);

  // Get validation summary
  const getValidationSummary = useCallback(() => {
    let totalIssues = 0;
    let errorCount = 0;
    let warningCount = 0;
    const rowsWithIssues = new Set<number>();

    validationResults.forEach((validation, rowIndex) => {
      if (!editableRows.find(r => r.index === rowIndex)?.isDeleted) {
        errorCount += validation.errorCount;
        warningCount += validation.warningCount;
        totalIssues += validation.errorCount + validation.warningCount + validation.infoCount;
        
        if (validation.errorCount > 0 || validation.warningCount > 0) {
          rowsWithIssues.add(rowIndex);
        }
      }
    });

    return {
      totalIssues,
      errorCount,
      warningCount,
      rowsWithIssues: rowsWithIssues.size
    };
  }, [validationResults, editableRows]);

  // Computed values
  const hasUnsavedChanges = useMemo(() => {
    return editableRows.some(row => row.isDirty) || deletedRows.size > 0;
  }, [editableRows, deletedRows]);

  const totalEdits = useMemo(() => {
    return editableRows.reduce((count, row) => count + row.cellEdits.size, 0);
  }, [editableRows]);

  const totalDeletions = deletedRows.size;

  return {
    editableRows,
    deletedRows,
    hasUnsavedChanges,
    totalEdits,
    totalDeletions,
    editCell,
    deleteRow,
    restoreRow,
    addRow,
    resetChanges,
    getCleanedData,
    getValidationSummary
  };
}


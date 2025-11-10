/**
 * Validation Preview Table Component
 * Displays editable preview table with inline validation highlighting
 */

import React, { memo, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  TrashIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { ValidationPreviewTableProps } from '../types/editableTable';
import { useEditableTableData } from '../hooks/useEditableTableData';
import { EditableCell } from './EditableCell';

/**
 * Validation Preview Table component
 * 
 * @param headers - Column headers
 * @param rows - Row data arrays
 * @param validationResult - Complete validation result
 * @param onDataChange - Callback when cleaned data is confirmed
 * @param onValidationChange - Callback when validation changes
 * @param maxPreviewRows - Maximum number of rows to preview
 * @param disabled - Whether editing is disabled
 */
export const ValidationPreviewTable: React.FC<ValidationPreviewTableProps> = memo(({
  headers,
  rows,
  validationResult,
  onDataChange,
  onValidationChange,
  maxPreviewRows = 20,
  disabled = false
}) => {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const {
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
  } = useEditableTableData({
    headers,
    rows,
    maxPreviewRows
  });

  const validationSummary = validationResult ? getValidationSummary() : { totalIssues: 0, errorCount: 0, warningCount: 0, rowsWithIssues: 0 };

  // Get cell validation for a specific cell
  const getCellValidation = (rowIndex: number, colIndex: number) => {
    const row = editableRows.find(r => r.index === rowIndex);
    if (!row || row.isDeleted) return null;
    
    const rowValidation = row.validation;
    if (!rowValidation) return null;

    return rowValidation.cellValidations.get(colIndex) || null;
  };

  // Handle confirm cleaned data
  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const cleanedData = getCleanedData();
      onDataChange?.(cleanedData);
      
      // Re-run validation on cleaned data if callback provided
      if (onValidationChange) {
        // Import and run validation
        const { validateAll } = await import('../utils/validationEngine');
        const newValidation = validateAll(cleanedData.headers, cleanedData.rows);
        onValidationChange(newValidation);
      }
    } catch (error) {
      console.error('Error confirming cleaned data:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle reset changes
  const handleReset = () => {
    if (hasUnsavedChanges) {
      setShowResetDialog(true);
    } else {
      resetChanges();
    }
  };

  const confirmReset = () => {
    resetChanges();
    setShowResetDialog(false);
  };

  // Filter to ONLY show rows that failed validation (have errors, warnings, or info)
  const visibleRows = useMemo(() => {
    return editableRows.filter(row => {
      // Don't show deleted rows
      if (row.isDeleted) return false;
      
      // Only show rows with validation issues
      const validation = row.validation;
      if (!validation) return false;
      
      // Show rows with errors, warnings, or info
      return validation.errorCount > 0 || validation.warningCount > 0 || validation.infoCount > 0;
    });
  }, [editableRows]);
  
  // Get row count info
  const totalRows = rows.length;
  const previewRowCount = Math.min(maxPreviewRows, totalRows);
  const hasMoreRows = totalRows > maxPreviewRows;

  // Don't render anything if there are no visible rows with issues
  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      {/* Minimal Status Bar - Only show when there are issues */}
      {validationResult && validationSummary.rowsWithIssues > 0 && (
        <Box
          sx={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            p: 1.5,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="body2" sx={{ color: '#374151', fontSize: '0.875rem' }}>
            Showing {validationSummary.rowsWithIssues} row{validationSummary.rowsWithIssues > 1 ? 's' : ''} with validation issues. Hover over cells for details.
          </Typography>
        </Box>
      )}

      {/* Unsaved Changes - Minimal style */}
      {hasUnsavedChanges && (
        <Box
          sx={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            p: 1.5,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="body2" sx={{ color: '#374151', fontSize: '0.875rem' }}>
            {totalDeletions} row{totalDeletions > 1 ? 's' : ''} deleted • {totalEdits} cell{totalEdits > 1 ? 's' : ''} edited. Click 'Confirm Cleaned Data' to apply.
          </Typography>
          <Button
            size="small"
            onClick={handleReset}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              color: '#6b7280',
              fontSize: '0.875rem',
              '&:hover': { backgroundColor: '#f9fafb' }
            }}
          >
            Reset
          </Button>
        </Box>
      )}

      {/* Action Buttons - Only show when there are visible rows with issues */}
      {visibleRows.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckIcon style={{ width: 20, height: 20 }} />}
            onClick={handleConfirm}
            disabled={!hasUnsavedChanges || disabled || isConfirming}
            sx={{ borderRadius: '8px' }}
          >
            {isConfirming ? 'Confirming...' : 'Confirm Cleaned Data'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowPathIcon style={{ width: 20, height: 20 }} />}
            onClick={handleReset}
            disabled={!hasUnsavedChanges || disabled}
            sx={{ borderRadius: '8px' }}
          >
            Reset Changes
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PlusIcon style={{ width: 20, height: 20 }} />}
            onClick={addRow}
            disabled={disabled}
            sx={{ borderRadius: '8px' }}
          >
            Add Row
          </Button>
          {hasMoreRows && (
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Showing first {previewRowCount} of {totalRows} rows
            </Typography>
          )}
        </Box>
      )}

      {/* Deleted Rows Section - Minimal style */}
      {deletedRows.size > 0 && (
        <Box
          sx={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            p: 1.5,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="body2" sx={{ color: '#374151', fontSize: '0.875rem' }}>
            {deletedRows.size} row{deletedRows.size > 1 ? 's' : ''} deleted. Click "Restore All" to undo.
          </Typography>
          <Button
            size="small"
            onClick={() => {
              // Restore all deleted rows
              deletedRows.forEach(rowIndex => restoreRow(rowIndex));
            }}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              color: '#6b7280',
              fontSize: '0.875rem',
              '&:hover': { backgroundColor: '#f9fafb' }
            }}
          >
            Restore All
          </Button>
        </Box>
      )}

      {/* Preview Table */}
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ 
          borderRadius: '8px',
          maxHeight: 600,
          overflowX: 'auto'
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {headers.map((header: string, index: number) => (
                <TableCell
                  key={index}
                  sx={{
                    backgroundColor: '#f9fafb',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb',
                    minWidth: header.toLowerCase().includes('specialty') ? 200 : 
                             header.toLowerCase().includes('provider') ? 150 :
                             header.toLowerCase().includes('region') ? 120 : 100
                  }}
                >
                  {header}
                </TableCell>
              ))}
              <TableCell
                sx={{
                  backgroundColor: '#f9fafb',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  borderBottom: '2px solid #e5e7eb',
                  width: 60,
                  textAlign: 'center'
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow
                key={row.index}
                sx={{
                  '&:hover': {
                    backgroundColor: row.isDeleted ? '#fef2f2' : '#f9fafb'
                  },
                  opacity: row.isDeleted ? 0.6 : 1,
                  backgroundColor: row.isDeleted ? '#fee2e2' : 'transparent',
                  textDecoration: row.isDeleted ? 'line-through' : 'none'
                }}
              >
                {headers.map((header: string, colIndex: number) => {
                  const cellValue = row.data[colIndex];
                  const cellValidation = getCellValidation(row.index, colIndex);
                  
                  return (
                    <TableCell
                      key={colIndex}
                      sx={{
                        padding: '4px',
                        borderRight: colIndex < headers.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}
                    >
                      <EditableCell
                        value={cellValue}
                        rowIndex={row.index}
                        colIndex={colIndex}
                        columnName={header}
                        validation={cellValidation}
                        onEdit={editCell}
                        disabled={disabled}
                      />
                    </TableCell>
                  );
                })}
                <TableCell
                  sx={{
                    textAlign: 'center',
                    padding: '4px'
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    {deletedRows.has(row.index) ? (
                      <Tooltip title="Restore row" arrow>
                        <IconButton
                          size="small"
                          onClick={() => restoreRow(row.index)}
                          disabled={disabled}
                          sx={{
                            color: 'success.main',
                            '&:hover': {
                              backgroundColor: 'success.light',
                              color: 'success.dark'
                            }
                          }}
                        >
                          <ArrowUturnLeftIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Delete row" arrow>
                        <IconButton
                          size="small"
                          onClick={() => deleteRow(row.index)}
                          disabled={disabled}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'error.light',
                              color: 'error.dark'
                            }
                          }}
                        >
                          <TrashIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        PaperProps={{
          sx: { borderRadius: '12px' }
        }}
      >
        <DialogTitle>
          Reset Changes?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset all changes? This will restore the original data and remove all edits and deletions.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setShowResetDialog(false)}
            variant="outlined"
            sx={{ borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmReset}
            variant="contained"
            color="error"
            sx={{ borderRadius: '8px' }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

ValidationPreviewTable.displayName = 'ValidationPreviewTable';


/**
 * Validation Cell Highlight Component
 * Provides cell highlighting and tooltips for AG Grid cells based on validation results
 */

import React, { memo, useMemo } from 'react';
import { Tooltip } from '@mui/material';
import { CellValidation, ValidationIssue } from '../types/validation';

export interface ValidationCellHighlightProps {
  value: any;
  cellValidation?: CellValidation;
  children?: React.ReactNode;
}

/**
 * Validation Cell Highlight component for AG Grid cells
 * Applies red/yellow borders and tooltips based on validation issues
 * 
 * @param value - Cell value to display
 * @param cellValidation - Validation data for this cell
 * @param children - Optional children to wrap
 */
export const ValidationCellHighlight: React.FC<ValidationCellHighlightProps> = memo(({
  value,
  cellValidation,
  children
}) => {
  const tooltipContent = useMemo(() => {
    if (!cellValidation || cellValidation.issues.length === 0) {
      return null;
    }

    const criticalIssues = cellValidation.issues.filter(i => i.severity === 'critical');
    const warningIssues = cellValidation.issues.filter(i => i.severity === 'warning');
    const infoIssues = cellValidation.issues.filter(i => i.severity === 'info');

    const parts: string[] = [];
    
    if (criticalIssues.length > 0) {
      parts.push(`Critical: ${criticalIssues.map(i => i.message).join('; ')}`);
    }
    if (warningIssues.length > 0) {
      parts.push(`Warning: ${warningIssues.map(i => i.message).join('; ')}`);
    }
    if (infoIssues.length > 0) {
      parts.push(`Info: ${infoIssues.map(i => i.message).join('; ')}`);
    }

    return parts.join('\n');
  }, [cellValidation]);

  const borderStyle = useMemo(() => {
    if (!cellValidation) return {};
    
    if (cellValidation.hasCriticalError) {
      return {
        border: '2px solid #ef4444',
        borderRadius: '2px'
      };
    } else if (cellValidation.hasWarning) {
      return {
        border: '2px solid #f59e0b',
        borderRadius: '2px'
      };
    } else if (cellValidation.hasInfo) {
      return {
        border: '1px solid #3b82f6',
        borderRadius: '2px'
      };
    }
    
    return {};
  }, [cellValidation]);

  const content = children || value;

  if (!cellValidation || cellValidation.issues.length === 0) {
    return <>{content}</>;
  }

  if (tooltipContent) {
    return (
      <Tooltip
        title={
          <div style={{ whiteSpace: 'pre-line', fontSize: '0.875rem' }}>
            {tooltipContent}
          </div>
        }
        arrow
        placement="top"
      >
        <div style={{ ...borderStyle, padding: '2px', display: 'inline-block', width: '100%' }}>
          {content}
        </div>
      </Tooltip>
    );
  }

  return (
    <div style={{ ...borderStyle, padding: '2px', display: 'inline-block', width: '100%' }}>
      {content}
    </div>
  );
});

ValidationCellHighlight.displayName = 'ValidationCellHighlight';

/**
 * Helper function to create cell validation data from validation result
 * Maps validation issues to cell locations for highlighting
 */
export function createCellValidationMap(
  validationResult: any,
  headers: string[]
): Map<string, CellValidation> {
  const cellMap = new Map<string, CellValidation>();

  if (!validationResult) return cellMap;

  // Process Tier 1 errors
  validationResult.tier1?.errors?.forEach((issue: ValidationIssue) => {
    if (issue.cellLocation) {
      const key = `${issue.cellLocation.row}-${issue.cellLocation.column}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          cellLocation: issue.cellLocation,
          issues: [],
          hasCriticalError: false,
          hasWarning: false,
          hasInfo: false
        });
      }
      const cellValidation = cellMap.get(key)!;
      cellValidation.issues.push(issue);
      cellValidation.hasCriticalError = true;
    } else if (issue.affectedRows && issue.affectedColumns) {
      // Map to all affected cells
      issue.affectedRows.forEach((rowIndex) => {
        issue.affectedColumns?.forEach((colName) => {
          const colIndex = headers.findIndex(h => h === colName);
          if (colIndex >= 0) {
            const key = `${rowIndex - 1}-${colIndex}`; // rowIndex is 1-based, convert to 0-based
            if (!cellMap.has(key)) {
              cellMap.set(key, {
                cellLocation: { row: rowIndex - 1, column: colIndex, columnName: colName },
                issues: [],
                hasCriticalError: false,
                hasWarning: false,
                hasInfo: false
              });
            }
            const cellValidation = cellMap.get(key)!;
            cellValidation.issues.push(issue);
            cellValidation.hasCriticalError = true;
          }
        });
      });
    }
  });

  // Process Tier 2 warnings
  validationResult.tier2?.warnings?.forEach((issue: ValidationIssue) => {
    if (issue.cellLocation) {
      const key = `${issue.cellLocation.row}-${issue.cellLocation.column}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          cellLocation: issue.cellLocation,
          issues: [],
          hasCriticalError: false,
          hasWarning: false,
          hasInfo: false
        });
      }
      const cellValidation = cellMap.get(key)!;
      cellValidation.issues.push(issue);
      cellValidation.hasWarning = true;
    } else if (issue.affectedRows && issue.affectedColumns) {
      issue.affectedRows.forEach((rowIndex) => {
        issue.affectedColumns?.forEach((colName) => {
          const colIndex = headers.findIndex(h => h === colName);
          if (colIndex >= 0) {
            const key = `${rowIndex - 1}-${colIndex}`;
            if (!cellMap.has(key)) {
              cellMap.set(key, {
                cellLocation: { row: rowIndex - 1, column: colIndex, columnName: colName },
                issues: [],
                hasCriticalError: false,
                hasWarning: false,
                hasInfo: false
              });
            }
            const cellValidation = cellMap.get(key)!;
            cellValidation.issues.push(issue);
            cellValidation.hasWarning = true;
          }
        });
      });
    }
  });

  // Process Tier 3 info
  validationResult.tier3?.info?.forEach((issue: ValidationIssue) => {
    if (issue.cellLocation) {
      const key = `${issue.cellLocation.row}-${issue.cellLocation.column}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          cellLocation: issue.cellLocation,
          issues: [],
          hasCriticalError: false,
          hasWarning: false,
          hasInfo: false
        });
      }
      const cellValidation = cellMap.get(key)!;
      cellValidation.issues.push(issue);
      cellValidation.hasInfo = true;
    } else if (issue.affectedRows && issue.affectedColumns) {
      issue.affectedRows.forEach((rowIndex) => {
        issue.affectedColumns?.forEach((colName) => {
          const colIndex = headers.findIndex(h => h === colName);
          if (colIndex >= 0) {
            const key = `${rowIndex - 1}-${colIndex}`;
            if (!cellMap.has(key)) {
              cellMap.set(key, {
                cellLocation: { row: rowIndex - 1, column: colIndex, columnName: colName },
                issues: [],
                hasCriticalError: false,
                hasWarning: false,
                hasInfo: false
              });
            }
            const cellValidation = cellMap.get(key)!;
            cellValidation.issues.push(issue);
            cellValidation.hasInfo = true;
          }
        });
      });
    }
  });

  return cellMap;
}


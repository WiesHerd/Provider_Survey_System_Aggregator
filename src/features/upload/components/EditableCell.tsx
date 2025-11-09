/**
 * Editable Cell Component
 * Provides inline editing with validation highlighting
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { TextField, Tooltip } from '@mui/material';
import { EditableCellProps } from '../types/editableTable';
import { getCellValidationMessage } from '../utils/rowValidation';

/**
 * Editable Cell component with inline editing and validation highlighting
 * 
 * @param value - Current cell value
 * @param rowIndex - Row index
 * @param colIndex - Column index
 * @param columnName - Column header name
 * @param validation - Cell validation result
 * @param onEdit - Callback when cell is edited
 * @param disabled - Whether editing is disabled
 */
export const EditableCell: React.FC<EditableCellProps> = memo(({
  value,
  rowIndex,
  colIndex,
  columnName,
  validation,
  onEdit,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update edit value when value prop changes (external updates)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value || ''));
    }
  }, [value, isEditing]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Save changes if value changed
    const newValue = editValue.trim();
    const originalValue = String(value || '').trim();
    if (newValue !== originalValue) {
      onEdit(rowIndex, colIndex, newValue);
    } else {
      // Reset to original if no change
      setEditValue(originalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditValue(String(value || ''));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Determine border color based on validation
  const getBorderColor = () => {
    if (!validation) return 'transparent';
    
    if (validation.hasCriticalError) {
      return '#ef4444'; // Red for critical errors
    } else if (validation.hasWarning) {
      return '#f59e0b'; // Yellow for warnings
    } else if (isEditing && editValue !== String(value || '')) {
      return '#10b981'; // Green for valid edits
    }
    
    return 'transparent';
  };

  const borderColor = getBorderColor();
  const borderWidth = validation && (validation.hasCriticalError || validation.hasWarning) ? 2 : 1;
  const validationMessage = validation ? getCellValidationMessage(validation) : '';

  // Display value
  const displayValue = isEditing ? editValue : String(value || '');

  if (isEditing) {
    return (
      <TextField
        inputRef={inputRef}
        value={editValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        size="small"
        variant="outlined"
        fullWidth
        disabled={disabled}
        sx={{
          '& .MuiOutlinedInput-root': {
            padding: '4px 8px',
            fontSize: '0.875rem',
            borderColor: borderColor,
            borderWidth: borderWidth,
            '&:hover': {
              borderColor: borderColor,
            },
            '&.Mui-focused': {
              borderColor: borderColor,
              borderWidth: borderWidth,
            }
          },
          '& .MuiOutlinedInput-input': {
            padding: 0
          }
        }}
      />
    );
  }

  const cellContent = (
    <div
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '8px 12px',
        cursor: disabled ? 'default' : 'pointer',
        border: borderColor !== 'transparent' ? `${borderWidth}px solid ${borderColor}` : '1px solid #e5e7eb',
        borderRadius: '4px',
        minHeight: '32px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: isEditing ? '#f9fafb' : (isHovered && !disabled ? '#f9fafb' : 'transparent'),
        transition: 'all 0.2s ease'
      }}
    >
      <span style={{ 
        fontSize: '0.875rem',
        color: '#1f2937',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: '100%'
      }}>
        {displayValue || <span style={{ color: '#9ca3af' }}>—</span>}
      </span>
    </div>
  );

  if (validationMessage) {
    return (
      <Tooltip
        title={
          <div style={{ whiteSpace: 'pre-line', fontSize: '0.875rem' }}>
            {validationMessage}
          </div>
        }
        arrow
        placement="top"
      >
        {cellContent}
      </Tooltip>
    );
  }

  return cellContent;
});

EditableCell.displayName = 'EditableCell';


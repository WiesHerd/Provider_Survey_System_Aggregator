/**
 * Sheet Selector Component
 * Allows users to select which Excel sheet to parse when multiple sheets are detected
 */

import React, { memo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
}

export interface SheetSelectorProps {
  sheets: SheetInfo[];
  selectedSheet: string;
  onSheetSelect: (sheetName: string) => void;
  disabled?: boolean;
}

/**
 * Sheet Selector component for Excel files with multiple sheets
 * 
 * @param sheets - Array of sheet information
 * @param selectedSheet - Currently selected sheet name
 * @param onSheetSelect - Callback when sheet is selected
 * @param disabled - Whether the selector is disabled
 */
export const SheetSelector: React.FC<SheetSelectorProps> = memo(({
  sheets,
  selectedSheet,
  onSheetSelect,
  disabled = false
}) => {
  if (sheets.length <= 1) {
    return null; // Don't show selector if only one sheet
  }

  const handleChange = (event: any) => {
    onSheetSelect(event.target.value);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel id="sheet-selector-label">Select Sheet</InputLabel>
        <Select
          labelId="sheet-selector-label"
          id="sheet-selector"
          value={selectedSheet}
          label="Select Sheet"
          onChange={handleChange}
          sx={{ borderRadius: '8px' }}
        >
          {sheets.map((sheet) => (
            <MenuItem key={sheet.name} value={sheet.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <DocumentTextIcon style={{ width: 16, height: 16, color: '#666' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">{sheet.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {sheet.rowCount.toLocaleString()} rows, {sheet.columnCount} columns
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Excel file contains {sheets.length} sheet{sheets.length > 1 ? 's' : ''}. Select which sheet to upload.
      </Typography>
    </Box>
  );
});

SheetSelector.displayName = 'SheetSelector';


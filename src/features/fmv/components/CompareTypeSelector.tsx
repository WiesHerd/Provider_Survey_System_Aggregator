import React from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  RadioGroup, 
  FormControlLabel, 
  Radio 
} from '@mui/material';
import { CompareTypeSelectorProps } from '../types/fmv';

/**
 * Comparison Type Selector component for choosing FMV analysis type
 * 
 * @param compareType - Current comparison type
 * @param onCompareTypeChange - Callback when comparison type changes
 */
export const CompareTypeSelector: React.FC<CompareTypeSelectorProps> = ({ 
  compareType, 
  onCompareTypeChange 
}) => {
  return (
    <Paper sx={{ 
      p: 2, 
      mb: 3, 
      background: '#f8fafc', 
      boxShadow: 'none', 
      border: '1.5px solid #b0b4bb' 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Typography
          variant="subtitle1"
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary', 
            mb: 0, 
            minWidth: 180 
          }}
          component="label"
          htmlFor="comparison-type-radio-group"
        >
          Comparison Type
        </Typography>
        <RadioGroup
          row
          id="comparison-type-radio-group"
          value={compareType}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            onCompareTypeChange(e.target.value as 'TCC' | 'wRVUs' | 'CFs')
          }
          sx={{ gap: 4 }}
        >
          <FormControlLabel 
            value="TCC" 
            control={<Radio />} 
            label="Total Cash Compensation" 
          />
          <FormControlLabel 
            value="wRVUs" 
            control={<Radio />} 
            label="Work RVUs" 
          />
          <FormControlLabel 
            value="CFs" 
            control={<Radio />} 
            label="Conversion Factors" 
          />
        </RadioGroup>
      </Box>
    </Paper>
  );
};

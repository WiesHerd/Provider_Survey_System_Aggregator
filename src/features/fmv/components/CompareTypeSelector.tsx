import React from 'react';
import { 
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
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
      <RadioGroup
        row
        value={compareType}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
          onCompareTypeChange(e.target.value as 'TCC' | 'wRVUs' | 'CFs')
        }
        className="flex flex-col sm:flex-row gap-6"
      >
        <FormControlLabel 
          value="TCC" 
          control={
            <Radio 
              sx={{
                color: '#6b7280',
                '&.Mui-checked': {
                  color: '#3b82f6',
                },
              }}
            />
          } 
          label={
            <span className="text-sm font-medium text-gray-900">
              Total Cash Compensation
            </span>
          }
          className="flex-1"
        />
        <FormControlLabel 
          value="wRVUs" 
          control={
            <Radio 
              sx={{
                color: '#6b7280',
                '&.Mui-checked': {
                  color: '#3b82f6',
                },
              }}
            />
          } 
          label={
            <span className="text-sm font-medium text-gray-900">
              Work RVUs
            </span>
          }
          className="flex-1"
        />
        <FormControlLabel 
          value="CFs" 
          control={
            <Radio 
              sx={{
                color: '#6b7280',
                '&.Mui-checked': {
                  color: '#3b82f6',
                },
              }}
            />
          } 
          label={
            <span className="text-sm font-medium text-gray-900">
              Conversion Factors
            </span>
          }
          className="flex-1"
        />
      </RadioGroup>
    </div>
  );
};

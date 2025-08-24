import React from 'react';
import { 
  TextField, 
  InputAdornment 
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { TrashIcon } from '@heroicons/react/24/outline';
import { TCCItemizationProps } from '../types/fmv';
import { calculateTotalTCC } from '../utils/fmvCalculations';

/**
 * TCC Itemization component for breaking down compensation components
 * 
 * @param components - Array of compensation components
 * @param onComponentsChange - Callback when components change
 * @param fte - Full-time equivalent value
 * @param onFTEChange - Callback when FTE changes
 */
export const TCCItemization: React.FC<TCCItemizationProps> = ({ 
  components, 
  onComponentsChange,
  fte,
  onFTEChange
}) => {
  const addComponent = () => {
    onComponentsChange([...components, { type: '', amount: '', notes: '' }]);
  };

  const removeComponent = (idx: number) => {
    onComponentsChange(components.filter((_, i) => i !== idx));
  };

  const updateComponent = (idx: number, field: 'type' | 'amount' | 'notes', value: string) => {
    const newComps = [...components];
    newComps[idx] = { ...newComps[idx], [field]: value };
    onComponentsChange(newComps);
  };

  const total = calculateTotalTCC(components);

  return (
    <div className="space-y-6">
      {/* Component Rows */}
      <div className="space-y-4">
        {components.map((component, idx) => (
          <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* FTE Field - Only show on first row */}
            {idx === 0 && (
              <div className="lg:col-span-2">
                <TextField
                  label="FTE"
                  type="number"
                  value={fte}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    onFTEChange(Number(e.target.value))
                  }
                  fullWidth
                  size="small"
                  inputProps={{ 
                    min: 0.1, 
                    max: 2.0, 
                    step: 0.1 
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#3b82f6',
                    },
                  }}
                />
              </div>
            )}
            
            {/* Empty space for other rows to align */}
            {idx > 0 && <div className="lg:col-span-2" />}
            
            {/* Type Field */}
            <div className="lg:col-span-3">
              <TextField
                label="Type"
                value={component.type}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateComponent(idx, 'type', e.target.value)
                }
                fullWidth
                size="small"
                placeholder="Enter compensation type..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#3b82f6',
                  },
                }}
              />
            </div>
            
            {/* Amount Field */}
            <div className="lg:col-span-3">
              <TextField
                label="Amount"
                type="text"
                value={component.amount ? `$${Number(component.amount).toLocaleString()}` : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  // Remove all non-numeric characters except decimal point
                  const numericValue = e.target.value.replace(/[^0-9.]/g, '');
                  updateComponent(idx, 'amount', numericValue);
                }}
                fullWidth
                size="small"
                placeholder="0"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#3b82f6',
                  },
                }}
              />
            </div>
            
            {/* Notes Field */}
            <div className="lg:col-span-3">
              <TextField
                label="Notes"
                value={component.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateComponent(idx, 'notes', e.target.value)
                }
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#3b82f6',
                  },
                }}
              />
            </div>
            
            {/* Remove Button */}
            <div className="lg:col-span-1 flex justify-center">
              <button
                onClick={() => removeComponent(idx)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                aria-label="Remove component"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Total TCC Display */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Total Cash Compensation</h3>
            <p className="text-sm text-gray-600">Sum of all compensation components</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">${total.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {components.length} component{components.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Component Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={addComponent}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Component
        </button>
      </div>
    </div>
  );
};

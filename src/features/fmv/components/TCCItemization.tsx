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
 */
export const TCCItemization: React.FC<TCCItemizationProps> = ({ 
  components, 
  onComponentsChange 
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
            {/* Type Field */}
            <div className="lg:col-span-3">
              <Autocomplete
                freeSolo
                options={["Base Salary", "Bonus", "Incentive", "Other"]}
                value={component.type}
                onInputChange={(_, newValue) => updateComponent(idx, 'type', newValue)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Type" 
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
                )}
              />
            </div>
            
            {/* Amount Field */}
            <div className="lg:col-span-3">
              <TextField
                label="Amount"
                type="number"
                value={component.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateComponent(idx, 'amount', e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ 
                  startAdornment: <InputAdornment position="start">$</InputAdornment> 
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
            
            {/* Notes Field */}
            <div className="lg:col-span-5">
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
      
      {/* Total TCC and Add Component Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
        <div className="text-lg font-semibold text-gray-900">
          Total TCC: <span className="text-blue-600">${total.toLocaleString()}</span>
        </div>
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

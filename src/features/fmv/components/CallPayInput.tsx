import React from 'react';
import { 
  TextField, 
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tooltip
} from '@mui/material';
import { CallPayInputProps } from '../types/fmv';
import { applyFTEAdjustment, applyCallPayAdjustmentsToValue } from '../utils/fmvCalculations';

/**
 * Call Pay Input component for entering call pay rate and adjustment factors
 * 
 * @param value - Base call pay rate value
 * @param onChange - Callback when call pay value changes
 * @param fte - Full-time equivalent value
 * @param onFTEChange - Callback when FTE changes
 * @param adjustments - Call Pay adjustment factors
 * @param onAdjustmentsChange - Callback when adjustments change
 */
export const CallPayInput: React.FC<CallPayInputProps> = ({ 
  value, 
  onChange,
  fte,
  onFTEChange,
  adjustments,
  onAdjustmentsChange
}) => {
  const baseValue = Number(value) || 0;
  const adjustedValue = baseValue > 0 && !adjustments.applyToMarketData 
    ? applyCallPayAdjustmentsToValue(baseValue, adjustments) 
    : baseValue;
  const fteAdjusted = applyFTEAdjustment(adjustedValue, fte);
  const showNormalization = fte < 1.0 && fte > 0;

  const updateAdjustment = (field: keyof typeof adjustments, newValue: number | boolean) => {
    onAdjustmentsChange({
      ...adjustments,
      [field]: newValue
    });
  };

  const clearAll = () => {
    onChange('');
    onFTEChange(1.0);
    onAdjustmentsChange({
      weekendPremium: 0,
      majorHolidayPremium: 0,
      highValueHolidayPremium: 0,
      frequencyMultiplier: 0,
      acuityMultiplier: 0,
      applyToMarketData: false
    });
  };

  // Calculate total multiplier for display
  const calculateMultiplier = (): number => {
    let multiplier = 1.0;
    if (adjustments.weekendPremium > 0) multiplier *= (1 + adjustments.weekendPremium / 100);
    if (adjustments.majorHolidayPremium > 0) multiplier *= (1 + adjustments.majorHolidayPremium / 100);
    if (adjustments.highValueHolidayPremium > 0) multiplier *= (1 + adjustments.highValueHolidayPremium / 100);
    if (adjustments.frequencyMultiplier > 0) multiplier *= (1 + adjustments.frequencyMultiplier / 100);
    if (adjustments.acuityMultiplier > 0) multiplier *= (1 + adjustments.acuityMultiplier / 100);
    return multiplier;
  };

  const totalMultiplier = calculateMultiplier();

  return (
    <div className="space-y-6">
      {/* Call Pay Rate Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-2">
          <label htmlFor="fte-input" className="block text-sm font-medium text-gray-700 mb-2">
            FTE
          </label>
          <TextField
            id="fte-input"
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
                backgroundColor: 'white',
                borderRadius: '8px',
                height: '40px',
                border: '1px solid #d1d5db',
                '&:hover': { 
                  borderColor: '#9ca3af',
                  borderWidth: '1px'
                },
                '&.Mui-focused': { 
                  boxShadow: 'none', 
                  borderColor: '#3b82f6',
                  borderWidth: '1px'
                },
                '& fieldset': {
                  border: 'none'
                }
              }
            }}
          />
        </div>
        
        <div className="lg:col-span-10">
          <label htmlFor="call-pay-rate-input" className="block text-sm font-medium text-gray-700 mb-2">
            Base Call Pay Rate
          </label>
          <TextField
            id="call-pay-rate-input"
            type="text"
            value={value ? `$${Number(value).toLocaleString()}` : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              // Remove all non-numeric characters except decimal point
              const numericValue = e.target.value.replace(/[^0-9.]/g, '');
              onChange(numericValue);
            }}
            fullWidth
            size="small"
            placeholder="Enter base call pay rate..."
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '8px',
                height: '40px',
                border: '1px solid #d1d5db',
                '&:hover': { 
                  borderColor: '#9ca3af',
                  borderWidth: '1px'
                },
                '&.Mui-focused': { 
                  boxShadow: 'none', 
                  borderColor: '#3b82f6',
                  borderWidth: '1px'
                },
                '& fieldset': {
                  border: 'none'
                }
              }
            }}
          />
        </div>
      </div>

      {/* Adjustment Factors Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Adjustment Factors</h3>
            <p className="text-sm text-gray-600 mt-1">
              Apply premium adjustments for weekends, holidays, frequency, or acuity. 
              Choose whether to apply adjustments to market data benchmarks or to your input rate.
            </p>
          </div>
        </div>
        
        <div className="px-6 py-6">
          {/* Adjustment Application Toggle */}
          <div className="mb-6">
            <FormLabel component="legend" className="text-sm font-semibold text-gray-700 mb-3 block">
              Apply Adjustments To:
            </FormLabel>
            <RadioGroup
              row
              value={adjustments.applyToMarketData ? 'market' : 'input'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAdjustment('applyToMarketData', e.target.value === 'market')}
              className="gap-6"
            >
              <FormControlLabel 
                value="input" 
                control={<Radio />} 
                label={
                  <span className="text-sm text-gray-700">
                    My Rate (compare adjusted rate vs. unadjusted market)
                  </span>
                }
                sx={{
                  '& .MuiFormControlLabel-label': {
                    marginLeft: '8px'
                  }
                }}
              />
              <FormControlLabel 
                value="market" 
                control={<Radio />} 
                label={
                  <span className="text-sm text-gray-700">
                    Market Data (compare my rate vs. adjusted market benchmarks)
                  </span>
                }
                sx={{
                  '& .MuiFormControlLabel-label': {
                    marginLeft: '8px'
                  }
                }}
              />
            </RadioGroup>
          </div>

          {/* Adjustment Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Weekend Premium */}
            <Tooltip title="Weekend call pay premium (typically 25-50% for 1.25x-1.5x multiplier)">
              <TextField
                label="Weekend Premium (%)"
                type="number"
                value={adjustments.weekendPremium}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateAdjustment('weekendPremium', Math.max(0, Math.min(100, Number(e.target.value))))
                }
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 100, step: 1 }}
                helperText={`${adjustments.weekendPremium}% = ${(1 + adjustments.weekendPremium / 100).toFixed(2)}x`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    height: '40px',
                    border: '1px solid #d1d5db',
                    '&:hover': { 
                      borderColor: '#9ca3af',
                      borderWidth: '1px'
                    },
                    '&.Mui-focused': { 
                      boxShadow: 'none', 
                      borderColor: '#3b82f6',
                      borderWidth: '1px'
                    },
                    '& fieldset': {
                      border: 'none'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    backgroundColor: 'white',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    '&.Mui-focused': {
                      color: '#3b82f6'
                    }
                  }
                }}
              />
            </Tooltip>

            {/* Major Holiday Premium */}
            <Tooltip title="Major holiday premium (typically 100-200% for 2x-3x multiplier)">
              <TextField
                label="Major Holiday Premium (%)"
                type="number"
                value={adjustments.majorHolidayPremium}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateAdjustment('majorHolidayPremium', Math.max(0, Math.min(200, Number(e.target.value))))
                }
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 200, step: 1 }}
                helperText={`${adjustments.majorHolidayPremium}% = ${(1 + adjustments.majorHolidayPremium / 100).toFixed(2)}x`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    height: '40px',
                    border: '1px solid #d1d5db',
                    '&:hover': { 
                      borderColor: '#9ca3af',
                      borderWidth: '1px'
                    },
                    '&.Mui-focused': { 
                      boxShadow: 'none', 
                      borderColor: '#3b82f6',
                      borderWidth: '1px'
                    },
                    '& fieldset': {
                      border: 'none'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    backgroundColor: 'white',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    '&.Mui-focused': {
                      color: '#3b82f6'
                    }
                  }
                }}
              />
            </Tooltip>

            {/* High-Value Holiday Premium */}
            <Tooltip title="High-value holiday premium (typically 200-300% for 3x-4x multiplier)">
              <TextField
                label="High-Value Holiday Premium (%)"
                type="number"
                value={adjustments.highValueHolidayPremium}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateAdjustment('highValueHolidayPremium', Math.max(0, Math.min(300, Number(e.target.value))))
                }
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 300, step: 1 }}
                helperText={`${adjustments.highValueHolidayPremium}% = ${(1 + adjustments.highValueHolidayPremium / 100).toFixed(2)}x`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    height: '40px',
                    border: '1px solid #d1d5db',
                    '&:hover': { 
                      borderColor: '#9ca3af',
                      borderWidth: '1px'
                    },
                    '&.Mui-focused': { 
                      boxShadow: 'none', 
                      borderColor: '#3b82f6',
                      borderWidth: '1px'
                    },
                    '& fieldset': {
                      border: 'none'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    backgroundColor: 'white',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    '&.Mui-focused': {
                      color: '#3b82f6'
                    }
                  }
                }}
              />
            </Tooltip>

            {/* Frequency Multiplier */}
            <Tooltip title="Frequency adjustment for high call frequency (typically 10-25% for 1.1x-1.25x multiplier)">
              <TextField
                label="Frequency Multiplier (%)"
                type="number"
                value={adjustments.frequencyMultiplier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateAdjustment('frequencyMultiplier', Math.max(0, Math.min(50, Number(e.target.value))))
                }
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 50, step: 1 }}
                helperText={`${adjustments.frequencyMultiplier}% = ${(1 + adjustments.frequencyMultiplier / 100).toFixed(2)}x`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    height: '40px',
                    border: '1px solid #d1d5db',
                    '&:hover': { 
                      borderColor: '#9ca3af',
                      borderWidth: '1px'
                    },
                    '&.Mui-focused': { 
                      boxShadow: 'none', 
                      borderColor: '#3b82f6',
                      borderWidth: '1px'
                    },
                    '& fieldset': {
                      border: 'none'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    backgroundColor: 'white',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    '&.Mui-focused': {
                      color: '#3b82f6'
                    }
                  }
                }}
              />
            </Tooltip>

            {/* Acuity Multiplier */}
            <Tooltip title="Acuity adjustment for high-acuity specialties (typically 10-20% for 1.1x-1.2x multiplier)">
              <TextField
                label="Acuity Multiplier (%)"
                type="number"
                value={adjustments.acuityMultiplier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateAdjustment('acuityMultiplier', Math.max(0, Math.min(50, Number(e.target.value))))
                }
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 50, step: 1 }}
                helperText={`${adjustments.acuityMultiplier}% = ${(1 + adjustments.acuityMultiplier / 100).toFixed(2)}x`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    height: '40px',
                    border: '1px solid #d1d5db',
                    '&:hover': { 
                      borderColor: '#9ca3af',
                      borderWidth: '1px'
                    },
                    '&.Mui-focused': { 
                      boxShadow: 'none', 
                      borderColor: '#3b82f6',
                      borderWidth: '1px'
                    },
                    '& fieldset': {
                      border: 'none'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    backgroundColor: 'white',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    '&.Mui-focused': {
                      color: '#3b82f6'
                    }
                  }
                }}
              />
            </Tooltip>
          </div>

          {/* Total Multiplier Display */}
          {totalMultiplier > 1.0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-gray-700">
                <strong>Total Adjustment Multiplier:</strong> {totalMultiplier.toFixed(3)}x
                {baseValue > 0 && !adjustments.applyToMarketData && (
                  <span className="ml-2">
                    (Base: ${baseValue.toLocaleString()} → Adjusted: ${adjustedValue.toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Adjusted Call Pay Display */}
      {baseValue > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Call Pay Rate</h3>
              <p className="text-sm text-gray-600">Used for market comparison</p>
              {!adjustments.applyToMarketData && adjustedValue !== baseValue && (
                <div className="mt-3">
                  <div className="text-sm text-gray-700 mb-1">
                    Base Rate: <span className="font-semibold text-gray-900">${baseValue.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    Adjusted Rate: <span className="font-semibold text-blue-600">${adjustedValue.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {showNormalization && (
                <div className="mt-3">
                  <div className="text-sm text-gray-700 mb-1">
                    Normalized to 1.0 FTE: <span className="font-semibold text-gray-900">${fteAdjusted.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    ${adjustedValue.toLocaleString()} ÷ {fte} FTE = ${fteAdjusted.toLocaleString()} at 1.0 FTE
                  </div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                ${adjustments.applyToMarketData ? baseValue.toLocaleString() : adjustedValue.toLocaleString()}
              </div>
              {showNormalization && (
                <>
                  <div className="text-sm text-gray-600 font-medium mt-1">
                    @ {fte} FTE
                  </div>
                  <hr className="my-2 border-gray-300" />
                  <div className="text-3xl font-bold text-gray-700">${fteAdjusted.toLocaleString()}</div>
                  <div className="text-sm text-gray-500 font-medium">
                    @ 1.0 FTE
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={clearAll}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear All
        </button>
      </div>
    </div>
  );
};


/**
 * Report Config Panel Component
 * 
 * Configuration section for dimensions, metrics, and chart type
 */

import React from 'react';
import { FormControl, Select, MenuItem, TextField, Typography, Autocomplete, Chip, Box } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { ReportConfigPanelProps } from '../types/reportBuilder';
import { getMetricDisplayVariableColor, getMetricShortLabel, getMetricDisplayLabel } from '../utils/reportFormatters';
import { TemplateSelector } from './TemplateSelector';

export const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  config,
  availableOptions,
  onConfigChange,
  onTemplateSelect
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Chart & Report Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Create charts and data tables by configuring dimensions, metrics, and filters</p>
        </div>
      </div>
      <div className="px-6 py-6">
        {onTemplateSelect && (
          <TemplateSelector onSelectTemplate={onTemplateSelect} />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
            <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
              Report Name
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter report name to save..."
              value={config.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onConfigChange('name', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            />
          </FormControl>

          <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
            <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
              Group By (X-Axis)
            </Typography>
            <Select
              value={config.dimension}
              onChange={(e: SelectChangeEvent<string>) => onConfigChange('dimension', e.target.value)}
              sx={{
                backgroundColor: 'white',
                borderRadius: '8px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="specialty">Specialty</MenuItem>
              <MenuItem value="region">Region</MenuItem>
              <MenuItem value="providerType">Provider Type</MenuItem>
              <MenuItem value="surveySource">Survey Source</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
            <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
              Secondary Grouping (Optional)
            </Typography>
            <Select
              value={config.secondaryDimension || ''}
              onChange={(e: SelectChangeEvent<string>) => onConfigChange('secondaryDimension', e.target.value || null)}
              sx={{
                backgroundColor: 'white',
                borderRadius: '8px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">None</MenuItem>
              {availableOptions.dimensions
                .filter(dim => dim !== config.dimension)
                .map(dim => (
                  <MenuItem key={dim} value={dim}>
                    {dim === 'specialty' ? 'Specialty' : 
                     dim === 'region' ? 'Region' : 
                     dim === 'providerType' ? 'Provider Type' : 
                     dim === 'surveySource' ? 'Survey Source' : dim}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
            <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
              Measures (Y-Axis)
            </Typography>
            <Autocomplete
              multiple
              value={config.metrics}
              onChange={(event: any, newValue: string[]) => {
                onConfigChange('metrics', newValue);
                if (newValue.length > 0) {
                  onConfigChange('metric', newValue[0]);
                }
              }}
              options={availableOptions.metrics}
              getOptionLabel={(option: string) => getMetricDisplayLabel(option)}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  placeholder="Select measures..."
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      minHeight: '40px',
                      '& fieldset': {
                        borderColor: '#d1d5db',
                      },
                      '&:hover fieldset': {
                        borderColor: '#9ca3af',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                        borderWidth: '1px',
                      }
                    }
                  }}
                />
              )}
              renderTags={(value: string[], getTagProps: any) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {value.map((option: string, index: number) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={`${option}-${index}`}
                      label={getMetricShortLabel(option)}
                      size="small"
                      sx={{ 
                        backgroundColor: getMetricDisplayVariableColor(option), 
                        color: 'white',
                        '& .MuiChip-deleteIcon': {
                          color: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': { color: 'white' }
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
              sx={{
                '& .MuiAutocomplete-paper': {
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
                  maxHeight: '400px'
                },
                '& .MuiAutocomplete-option': {
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  '&:hover': { backgroundColor: '#f3f4f6' },
                  '&.Mui-selected': { 
                    backgroundColor: '#ede9fe',
                    color: '#5b21b6'
                  }
                }
              }}
              noOptionsText="No measures found"
              clearOnBlur={false}
              disableCloseOnSelect={true}
            />
          </FormControl>

          <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
            <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
              Years
            </Typography>
            <Autocomplete
              multiple
              value={config.filters.years}
              onChange={(event: any, newValue: string[]) => {
                // This will be handled by parent component's updateFilter
                // For now, update filters directly
                onConfigChange('filters', { ...config.filters, years: newValue });
              }}
              options={availableOptions.years || []}
              getOptionLabel={(option: string) => option}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  placeholder="Select years..."
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      minHeight: '40px',
                      '& fieldset': {
                        borderColor: '#d1d5db',
                      },
                      '&:hover fieldset': {
                        borderColor: '#9ca3af',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                        borderWidth: '1px',
                      }
                    }
                  }}
                />
              )}
              renderTags={(value: string[], getTagProps: any) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {value.map((option: string, index: number) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                      sx={{ 
                        backgroundColor: '#10B981', 
                        color: 'white',
                        '& .MuiChip-deleteIcon': {
                          color: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': { color: 'white' }
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
              sx={{
                '& .MuiAutocomplete-paper': {
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
                  maxHeight: '400px'
                },
                '& .MuiAutocomplete-option': {
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  '&:hover': { backgroundColor: '#f3f4f6' },
                  '&.Mui-selected': {
                    backgroundColor: '#d1fae5',
                    color: '#065f46'
                  }
                }
              }}
              noOptionsText="No years found"
              clearOnBlur={false}
              disableCloseOnSelect={true}
            />
          </FormControl>

          <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
            <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
              Chart Type
            </Typography>
            <Select
              value={config.chartType}
              onChange={(e: SelectChangeEvent<string>) => onConfigChange('chartType', e.target.value)}
              sx={{
                backgroundColor: 'white',
                borderRadius: '8px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="bar">Bar Chart</MenuItem>
              <MenuItem value="line">Line Chart</MenuItem>
              <MenuItem value="pie">Pie Chart</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>
    </div>
  );
};


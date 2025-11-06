import React from 'react';
import { Box, Typography, Alert, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { RegionalComparisonProps, RegionalData, VariableRegionalData } from '../types/regional';
import { PERCENTILES } from '../utils/regionalCalculations';
import { formatVariableDisplayName } from '../../../features/analytics/utils/variableFormatters';
import { VariableFormattingService } from '../../../features/analytics/services/variableFormattingService';
import { formatCurrency, formatNumber } from '../../../shared/utils/formatters';

/**
 * Regional Comparison component for displaying regional data in HTML tables
 * 
 * @param data - Regional data array
 * @param onRegionClick - Callback when a region is clicked
 * @param onMetricClick - Callback when a metric is clicked
 * @param className - Additional CSS classes
 */
export const RegionalComparison: React.FC<RegionalComparisonProps> = ({
  data,
  selectedVariables = [],
  variableMetadata = {},
  onRegionClick,
  onMetricClick,
  regionTooltips,
  onRegionInfoClick,
  className = ''
}) => {
  const regionNames = data.map(region => region.region);
  const formattingService = VariableFormattingService.getInstance();

  // Helper function to get min/max values for highlighting
  const getMinMax = (values: number[]) => {
    if (values.length === 0) return { min: 0, max: 0 };
    const validValues = values.filter(v => v > 0);
    if (validValues.length === 0) return { min: 0, max: 0 };
    let min = Math.min(...validValues);
    let max = Math.max(...validValues);
    return { min, max };
  };

  // Early return if no data
  if (!data || data.length === 0) {
    return (
      <Alert severity="info" className="mt-4">
        No regional data available. Please select a specialty to view regional comparisons.
      </Alert>
    );
  }

  // Determine if using variable-aware format
  const isVariableAware = data.length > 0 && 'variables' in data[0];
  
  // Get variables to display
  let variablesToDisplay: string[] = [];
  if (isVariableAware && selectedVariables.length > 0) {
    variablesToDisplay = selectedVariables;
  } else if (!isVariableAware) {
    // Legacy format: use TCC, CF, wRVU
    variablesToDisplay = ['tcc', 'tcc_per_work_rvu', 'work_rvus'];
  } else {
    // Fallback: extract from data if available
    const firstData = data[0] as VariableRegionalData;
    if (firstData.variables) {
      variablesToDisplay = Object.keys(firstData.variables);
    }
  }

  // Get variable formatting function
  const getVariableFormat = (variableName: string): (value: number) => string => {
    // Check if metadata provides format function
    if (variableMetadata[variableName] && typeof variableMetadata[variableName].format === 'function') {
      return variableMetadata[variableName].format;
    }
    
    // Use formatting service
    const formattingRule = formattingService.getRuleForVariable(variableName);
    if (formattingRule) {
      return (value: number) => {
        if (value === 0) return '0';
        if (formattingRule.showCurrency) {
          return formatCurrency(value, formattingRule.decimals || 0);
        }
        if (formattingRule.decimals !== undefined) {
          return formatNumber(value, formattingRule.decimals);
        }
        return formatNumber(value);
      };
    }
    
    // Default formatting based on variable name patterns
    const lower = variableName.toLowerCase();
    if (lower.includes('tcc') || lower.includes('compensation') || lower.includes('salary') || lower.includes('call')) {
      return (value: number) => formatCurrency(value, 0);
    }
    if (lower.includes('per') || lower.includes('factor') || lower.includes('conversion')) {
      return (value: number) => formatCurrency(value, 2);
    }
    return (value: number) => formatNumber(value);
  };

  // Get variable label
  const getVariableLabel = (variableName: string): string => {
    if (variableMetadata[variableName]?.label) {
      return variableMetadata[variableName].label;
    }
    return formatVariableDisplayName(variableName);
  };

  // Get value from data (supports both formats)
  const getValue = (regionData: RegionalData | VariableRegionalData, variableName: string, percentile: string): number => {
    if ('variables' in regionData) {
      // Variable-aware format
      const varData = regionData.variables[variableName];
      return varData?.[percentile as 'p25' | 'p50' | 'p75' | 'p90'] || 0;
    } else {
      // Legacy format - map variable names to legacy fields
      const legacyMap: Record<string, Record<string, keyof RegionalData>> = {
        'tcc': { p25: 'tcc_p25', p50: 'tcc_p50', p75: 'tcc_p75', p90: 'tcc_p90' },
        'tcc_per_work_rvu': { p25: 'cf_p25', p50: 'cf_p50', p75: 'cf_p75', p90: 'cf_p90' },
        'work_rvus': { p25: 'wrvus_p25', p50: 'wrvus_p50', p75: 'wrvus_p75', p90: 'wrvus_p90' }
      };
      
      const fieldMap = legacyMap[variableName];
      if (fieldMap && fieldMap[percentile]) {
        return (regionData[fieldMap[percentile]] as number) || 0;
      }
      return 0;
    }
  };

  return (
    <Box className={`space-y-8 ${className}`}>
      {variablesToDisplay.map(variableName => {
        const variableLabel = getVariableLabel(variableName);
        const formatValue = getVariableFormat(variableName);
        
        return (
          <Box key={variableName} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
              </div>
              <div>
                <Typography variant="h6" className="text-gray-900 font-semibold">
                    {variableLabel}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Regional comparison across percentiles
                </Typography>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Percentile
                  </th>
                  {regionNames.map(region => (
                    <th key={region} className="text-center py-4 px-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                      <div className="inline-flex items-center justify-center space-x-1">
                        <span>{region}</span>
                        <Tooltip title={regionTooltips?.[region] || ''} placement="top" arrow>
                          <IconButton size="small" onClick={() => onRegionInfoClick?.(region)}>
                            <InfoOutlinedIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERCENTILES.map((p, index) => {
                  // Type assertion to help TypeScript with union type arrays
                  const typedData = data as (RegionalData | VariableRegionalData)[];
                  const values = typedData.map(r => getValue(r, variableName, p.key));
                  const { min, max } = getMinMax(values);
                  
                  return (
                    <tr 
                      key={p.key} 
                      className={`border-b border-gray-100 transition-colors duration-150 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50`}
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {p.label}
                      </td>
                      {regionNames.map(region => {
                        const regionData = typedData.find(d => d.region === region);
                        const value = regionData ? getValue(regionData, variableName, p.key) : 0;
                        
                        let cellClass = 'text-center py-4 px-4 font-medium';
                        let tooltip = '';
                        let badgeClass = '';
                        
                        if (value > 0 && value === max) {
                          // Highest value: subtle green background with rounded corners
                          badgeClass = 'bg-green-50 text-green-700';
                          tooltip = 'Highest value';
                        } else if (value > 0 && value === min) {
                          // Lowest value: subtle red background with rounded corners
                          badgeClass = 'bg-red-50 text-red-700';
                          tooltip = 'Lowest value';
                        } else {
                          // Default: subtle gray background with rounded corners
                          badgeClass = value > 0 ? 'bg-gray-50 text-gray-700' : 'bg-transparent text-gray-400';
                        }
                        
                        return (
                          <td 
                            key={region} 
                            className={cellClass}
                            title={tooltip}
                          >
                            <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-semibold min-w-[80px] ${badgeClass}`}>
                              {value > 0 ? formatValue(value) : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Box>
        );
      })}
    </Box>
  );
};

import React from 'react';
import { Box, Typography, Alert, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { RegionalComparisonProps, RegionalData } from '../types/regional';
import { REGIONAL_METRICS, PERCENTILES } from '../utils/regionalCalculations';

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
  onRegionClick,
  onMetricClick,
  regionTooltips,
  onRegionInfoClick,
  className = ''
}) => {
  const regionNames = data.map(region => region.region);

  // Helper function to get min/max values for highlighting
  const getMinMax = (values: number[]) => {
    let min = Math.min(...values);
    let max = Math.max(...values);
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

  return (
    <Box className={`space-y-8 ${className}`}>
      {REGIONAL_METRICS.map(metric => (
        <Box key={metric.key} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                {metric.key === 'tcc' ? (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                ) : metric.key === 'cf' ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
              </div>
              <div>
                <Typography variant="h6" className="text-gray-900 font-semibold">
                  {metric.label}
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
                  const values = data.map(r => r[`${metric.key}_${p.key}` as keyof RegionalData] as number);
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
                        const regionData = data.find(d => d.region === region);
                        const value = regionData ? regionData[`${metric.key}_${p.key}` as keyof RegionalData] as number : 0;
                        
                        let cellClass = 'text-center py-4 px-4 font-medium';
                        let tooltip = '';
                        let badgeClass = '';
                        
                        if (value === max) {
                          cellClass += ' text-green-700';
                          badgeClass = 'bg-green-100 text-green-800 border-green-200';
                          tooltip = 'Highest value';
                        } else if (value === min) {
                          cellClass += ' text-red-700';
                          badgeClass = 'bg-red-100 text-red-800 border-red-200';
                          tooltip = 'Lowest value';
                        } else {
                          cellClass += ' text-gray-900';
                          badgeClass = 'bg-gray-100 text-gray-800 border-gray-200';
                        }
                        
                        return (
                          <td 
                            key={region} 
                            className={cellClass}
                            title={tooltip}
                          >
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border ${badgeClass}`}>
                              {metric.format(value)}
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
      ))}
    </Box>
  );
};

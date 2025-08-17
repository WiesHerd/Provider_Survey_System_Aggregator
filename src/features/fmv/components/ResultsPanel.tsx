import React from 'react';
import { 
  Button 
} from '@mui/material';
import { keyframes } from '@mui/system';
import { ResultsPanelProps } from '../types/fmv';
import { formatFMVValue } from '../utils/fmvCalculations';

// CSS keyframes for marker pulse animation
const markerPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
`;

/**
 * Results Panel component for displaying market comparison results
 * 
 * @param compareType - Type of comparison being displayed
 * @param marketData - Market data with percentiles
 * @param percentiles - User percentile rankings
 * @param inputValue - User's input value
 * @param rawValue - Raw user value
 * @param fte - FTE value
 * @param onResetFilters - Optional callback to reset filters
 */
export const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
  compareType, 
  marketData, 
  percentiles, 
  inputValue, 
  rawValue, 
  fte, 
  onResetFilters 
}) => {
  // Get the appropriate percentile data based on comparison type
  const percentileData = 
    compareType === 'wRVUs' ? marketData?.wrvu :
    compareType === 'TCC' ? marketData?.tcc :
    compareType === 'CFs' ? marketData?.cf :
    undefined;

  const currentPercentile = 
    compareType === 'wRVUs' ? percentiles.wrvu :
    compareType === 'TCC' ? percentiles.tcc :
    compareType === 'CFs' ? percentiles.cf :
    null;

  // Check if market data is available
  const noMarketData = !percentileData;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Market Comparison
        </h2>
        <p className="text-sm text-gray-600">
          Compare your values against market benchmarks
        </p>
      </div>
      
      {noMarketData ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-gray-900 font-medium mb-2">
            No market data available
          </div>
          <div className="text-gray-600 mb-6">
            Try adjusting your filters to find matching market data.
          </div>
          {onResetFilters && (
            <Button 
              variant="outlined" 
              size="small" 
              onClick={onResetFilters}
              sx={{
                borderRadius: '8px',
                borderColor: '#3b82f6',
                color: '#3b82f6',
                '&:hover': {
                  borderColor: '#2563eb',
                  backgroundColor: '#eff6ff',
                },
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Percentile Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {['25th', '50th', '75th', '90th'].map((percentile) => {
              const key = `p${percentile.slice(0, 2)}` as keyof typeof percentileData;
              return (
                <div key={percentile} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 text-center">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    {percentile} Percentile
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {percentileData && percentileData[key] != null
                      ? formatFMVValue(percentileData[key], compareType)
                      : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Percentile Visualization */}
          <div className="text-center space-y-4">
            {typeof currentPercentile === 'number' && !isNaN(currentPercentile) ? (
              <div className="text-2xl font-bold text-blue-600 mb-4">
                You are in the {currentPercentile.toFixed(2)}th percentile
              </div>
            ) : (
              <div className="text-lg text-gray-600 mb-4">
                Enter a value to see your percentile
              </div>
            )}
            
            {/* Percentile Bar */}
            <div className="relative">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${typeof currentPercentile === 'number' && !isNaN(currentPercentile) ? currentPercentile : 0}%` 
                  }}
                />
              </div>
              
              {/* Percentile Marker */}
              {typeof currentPercentile === 'number' && !isNaN(currentPercentile) && (
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-blue-600 border-4 border-white rounded-full shadow-lg"
                  style={{ 
                    left: `${Math.min(currentPercentile, 100)}%`,
                    transform: 'translate(-50%, -50%)',
                    animation: `${markerPulse} 2s infinite`,
                  }}
                />
              )}
            </div>
            
            {/* Percentile Labels */}
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>0th</span>
              <span>100th</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

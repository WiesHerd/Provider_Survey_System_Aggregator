import React from 'react';
import { 
  Button,
  Tooltip
} from '@mui/material';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ResultsPanelProps, AggregationMethod } from '../types/fmv';
import { formatFMVValue } from '../utils/fmvCalculations';

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
  aggregationMethod,
  surveyCount = 0,
  isFilteringSpecificSurvey = false,
  onResetFilters,
  onAggregationMethodChange
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
  const noMarketData = !marketData || !percentileData;

  // Handle aggregation method cycling
  const handleAggregationCycle = () => {
    if (!onAggregationMethodChange) return;
    
    const methods: AggregationMethod[] = ['simple', 'weighted', 'pure'];
    const currentIndex = methods.indexOf(aggregationMethod);
    const nextIndex = (currentIndex + 1) % methods.length;
    onAggregationMethodChange(methods[nextIndex]);
  };

  // Get method display info
  const getMethodInfo = () => {
    switch (aggregationMethod) {
      case 'simple':
        return { label: 'Simple AVG', color: 'blue' };
      case 'weighted':
        return { label: 'Weighted AVG', color: 'purple' };
      case 'pure':
        return { label: 'Pure Survey', color: 'green' };
      default:
        return { label: 'Simple AVG', color: 'blue' };
    }
  };

  const methodInfo = getMethodInfo();

  // Debug logging
  console.log('🔍 ResultsPanel Debug:', {
    noMarketData,
    hasOnAggregationMethodChange: !!onAggregationMethodChange,
    isFilteringSpecificSurvey,
    shouldShowButton: !noMarketData && onAggregationMethodChange && !isFilteringSpecificSurvey,
    aggregationMethod
  });

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Market Comparison
            </h2>
            <p className="text-sm text-gray-600">
              Compare your values against market benchmarks
            </p>
          </div>
          {!noMarketData && onAggregationMethodChange && !isFilteringSpecificSurvey && (
            <div className="flex items-center gap-3">
              <Tooltip 
                title={
                  <div className="space-y-1">
                    <div><strong>Simple Average:</strong> Equal weight given to each survey</div>
                    <div><strong>Weighted Average:</strong> Weighted by number of incumbents in each survey</div>
                    <div><strong>Pure Survey:</strong> Use data from a single survey only (no aggregation)</div>
                    <div className="text-xs text-gray-300 mt-2">Click to cycle through methods</div>
                  </div>
                }
                arrow
                placement="bottom"
              >
                <button
                  onClick={handleAggregationCycle}
                  className="group relative overflow-hidden px-4 py-2 rounded-xl border-0 transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div className="relative flex items-center gap-2">
                    <div className="relative">
                      <ArrowPathIcon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                      <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300"></div>
                    </div>
                    <div className="text-sm font-semibold tracking-wide">
                      {methodInfo.label}
                    </div>
                  </div>
                </button>
              </Tooltip>
            </div>
          )}
        </div>
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
              onClick={onResetFilters}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                px: 4,
                py: 2,
                color: 'white !important',
                '&:hover': {
                  color: 'white !important'
                }
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Single Survey Notice */}
          {marketData && surveyCount === 1 && aggregationMethod !== 'pure' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <strong>Single Survey Selected:</strong> Simple and weighted averages will produce identical results. 
                  Use "Pure Survey" for unaggregated data, or select multiple surveys to see the difference between aggregation methods.
                </div>
              </div>
            </div>
          )}


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
                  className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-blue-600 border-4 border-white rounded-full shadow-lg animate-pulse"
                  style={{ 
                    left: `${Math.min(currentPercentile, 100)}%`,
                    transform: 'translate(-50%, -50%)',
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

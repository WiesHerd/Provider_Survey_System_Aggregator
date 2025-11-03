import React from 'react';
import { 
  Button,
  Tooltip
} from '@mui/material';
import { ArrowPathIcon, BoltIcon } from '@heroicons/react/24/outline';
import { ResultsPanelProps, AggregationMethod, CallPayAdjustments } from '../types/fmv';
import { formatFMVValue } from '../utils/fmvCalculations';
import { EmptyState } from '../../mapping/components/shared/EmptyState';

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
  onAggregationMethodChange,
  availableCallPaySpecialties,
  availableCallPaySurveySources
}) => {
  // Get the appropriate percentile data based on comparison type
  const percentileData = 
    compareType === 'wRVUs' ? marketData?.wrvu :
    compareType === 'TCC' ? marketData?.tcc :
    compareType === 'CFs' ? marketData?.cf :
    compareType === 'CallPay' ? marketData?.callPay :
    undefined;

  const currentPercentile = 
    compareType === 'wRVUs' ? percentiles.wrvu :
    compareType === 'TCC' ? percentiles.tcc :
    compareType === 'CFs' ? percentiles.cf :
    compareType === 'CallPay' ? percentiles.callPay :
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
        <EmptyState
          icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
          title="No Market Data Available"
          message={
            compareType === 'CallPay' 
              ? (() => {
                  let msg = "No Call Pay market data found for the selected filters.\n\n";
                  msg += "Make sure you have Call Pay surveys uploaded with dataCategory='CALL_PAY', and that your specialty, provider type, and region filters match available data.";
                  
                  if (availableCallPaySpecialties && availableCallPaySpecialties.length > 0) {
                    msg += `\n\nAvailable Call Pay specialties:\n${availableCallPaySpecialties.slice(0, 10).map(s => `• ${s}`).join('\n')}`;
                    if (availableCallPaySpecialties.length > 10) {
                      msg += `\n(and ${availableCallPaySpecialties.length - 10} more)`;
                    }
                  }
                  
                  if (availableCallPaySurveySources && availableCallPaySurveySources.length > 0) {
                    msg += `\n\nAvailable Call Pay survey sources:\n${availableCallPaySurveySources.map(s => `• ${s}`).join('\n')}`;
                  }
                  
                  return msg;
                })()
              : "Try adjusting your filters to find matching market data."
          }
          action={onResetFilters ? {
            label: "Reset Filters",
            onClick: onResetFilters,
            icon: <ArrowPathIcon className="h-4 w-4" />
          } : undefined}
        />
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

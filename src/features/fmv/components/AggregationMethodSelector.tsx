import React from 'react';
import { Tooltip } from '@mui/material';
import { AggregationMethod } from '../types/fmv';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface AggregationMethodSelectorProps {
  aggregationMethod: AggregationMethod;
  onAggregationMethodChange: (method: AggregationMethod) => void;
  disabled?: boolean;
}

/**
 * Sleek Google-style aggregation method toggle
 * 
 * @param aggregationMethod - Current aggregation method
 * @param onAggregationMethodChange - Callback when aggregation method changes
 * @param disabled - Whether the selector is disabled
 */
export const AggregationMethodSelector: React.FC<AggregationMethodSelectorProps> = ({ 
  aggregationMethod, 
  onAggregationMethodChange,
  disabled = false
}) => {
  const handleToggle = () => {
    if (disabled) return;
    // Cycle through: simple -> weighted -> pure -> simple
    const methods: AggregationMethod[] = ['simple', 'weighted', 'pure'];
    const currentIndex = methods.indexOf(aggregationMethod);
    const nextIndex = (currentIndex + 1) % methods.length;
    onAggregationMethodChange(methods[nextIndex]);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Aggregation Method
        </h3>
        <Tooltip 
          title={
            <div className="space-y-2">
              <div><strong>Simple Average:</strong> Equal weight given to each survey</div>
              <div><strong>Weighted Average:</strong> Weighted by number of incumbents in each survey</div>
              <div><strong>Pure Survey:</strong> Use data from a single survey only (no aggregation)</div>
            </div>
          }
          arrow
        >
          <InformationCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help" />
        </Tooltip>
      </div>
      
      {/* Google-style method selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}
            ${aggregationMethod === 'simple' 
              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
              : 'bg-gray-100 text-gray-600 border border-gray-200'
            }
          `}
          aria-label="Cycle through aggregation methods"
        >
          {aggregationMethod === 'simple' && 'Simple Average'}
          {aggregationMethod === 'weighted' && 'Weighted Average'}
          {aggregationMethod === 'pure' && 'Pure Survey'}
        </button>
        
        <div className="text-xs text-gray-500">
          Click to cycle
        </div>
      </div>
    </div>
  );
};

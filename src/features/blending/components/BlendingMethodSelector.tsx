/**
 * Blending Method Selector Component
 * 
 * Allows users to select how specialties will be blended together
 * This component appears first in the workflow to set expectations
 */

import React, { memo } from 'react';
import { CalculatorIcon, ChartBarIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

export type BlendingMethod = 'weighted' | 'simple' | 'custom';

interface BlendingMethodSelectorProps {
  method: BlendingMethod;
  onMethodChange: (method: BlendingMethod) => void;
  selectedCount: number;
  customWeights: Record<number, number>;
  onCustomWeightChange: (index: number, weight: number) => void;
  selectedDataRows: number[];
  filteredSurveyData: any[];
}

/** Scale current weights proportionally so they sum to 100%. If total is 0, use equal weights. */
function normalizeWeightsTo100(
  selectedDataRows: number[],
  customWeights: Record<number, number>
): Record<number, number> {
  const total = selectedDataRows.reduce((sum, index) => sum + (customWeights[index] || 0), 0);
  const n = selectedDataRows.length;
  if (n === 0) return {};
  if (total <= 0) {
    const equal = Math.floor((100 / n) * 10) / 10;
    const remainder = Math.round((100 - equal * n) * 10) / 10;
    const out: Record<number, number> = {};
    selectedDataRows.forEach((index, i) => {
      out[index] = i === 0 ? equal + remainder : equal;
    });
    return out;
  }
  const scale = 100 / total;
  const out: Record<number, number> = {};
  let sum = 0;
  selectedDataRows.forEach((index, i) => {
    const w = (customWeights[index] || 0) * scale;
    const rounded = i === selectedDataRows.length - 1
      ? Math.round((100 - sum) * 10) / 10
      : Math.round(w * 10) / 10;
    out[index] = rounded;
    sum += rounded;
  });
  return out;
}

/** Set equal weight per specialty so total is exactly 100%. */
function equalWeights(selectedDataRows: number[]): Record<number, number> {
  const n = selectedDataRows.length;
  if (n === 0) return {};
  const base = Math.floor((100 / n) * 10) / 10;
  const remainder = Math.round((100 - base * n) * 10) / 10;
  const out: Record<number, number> = {};
  selectedDataRows.forEach((index, i) => {
    out[index] = i === 0 ? base + remainder : base;
  });
  return out;
}

const BlendingMethodSelectorInner: React.FC<BlendingMethodSelectorProps> = ({
  method,
  onMethodChange,
  selectedCount,
  customWeights,
  onCustomWeightChange,
  selectedDataRows,
  filteredSurveyData
}) => {
  const totalWeight = Object.values(customWeights).reduce((sum, weight) => sum + (weight || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;

  const handleNormalizeTo100 = () => {
    const next = normalizeWeightsTo100(selectedDataRows, customWeights);
    Object.entries(next).forEach(([indexStr, weight]) => {
      onCustomWeightChange(Number(indexStr), weight);
    });
  };

  const handleSetEqualWeights = () => {
    const next = equalWeights(selectedDataRows);
    Object.entries(next).forEach(([indexStr, weight]) => {
      onCustomWeightChange(Number(indexStr), weight);
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Step 1: Choose Blending Method
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select how you want to combine the selected specialties
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Weighted Average */}
          <button
            type="button"
            onClick={() => onMethodChange('weighted')}
            className={`flex flex-col items-start space-y-3 p-5 rounded-xl border-2 transition-all text-left ${
              method === 'weighted' 
                ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-3 w-full">
              <div className={`p-2 rounded-lg ${
                method === 'weighted' ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <ChartBarIcon className={`w-5 h-5 ${
                  method === 'weighted' ? 'text-indigo-600' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">Weighted Average</div>
                <div className="text-xs text-gray-500 mt-0.5">Recommended</div>
              </div>
              {method === 'weighted' && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              Weights each specialty by its incumbent count, giving more influence to specialties with larger sample sizes. Best for most use cases.
            </div>
          </button>

          {/* Simple Average */}
          <button
            type="button"
            onClick={() => onMethodChange('simple')}
            className={`flex flex-col items-start space-y-3 p-5 rounded-xl border-2 transition-all text-left ${
              method === 'simple' 
                ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-3 w-full">
              <div className={`p-2 rounded-lg ${
                method === 'simple' ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <CalculatorIcon className={`w-5 h-5 ${
                  method === 'simple' ? 'text-indigo-600' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">Simple Average</div>
                <div className="text-xs text-gray-500 mt-0.5">Equal weights</div>
              </div>
              {method === 'simple' && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              Gives equal weight to all selected specialties regardless of sample size. Useful when you want to treat all specialties equally.
            </div>
          </button>

          {/* Custom Weights */}
          <button
            type="button"
            onClick={() => onMethodChange('custom')}
            className={`flex flex-col items-start space-y-3 p-5 rounded-xl border-2 transition-all text-left ${
              method === 'custom' 
                ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-3 w-full">
              <div className={`p-2 rounded-lg ${
                method === 'custom' ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <AdjustmentsHorizontalIcon className={`w-5 h-5 ${
                  method === 'custom' ? 'text-indigo-600' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">Custom Weights</div>
                <div className="text-xs text-gray-500 mt-0.5">Manual control</div>
              </div>
              {method === 'custom' && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              Set your own percentage weights for each specialty. Maximum control when you have specific weighting requirements.
            </div>
          </button>
        </div>

        {/* Custom Weight Controls */}
        {method === 'custom' && selectedCount > 0 && (
          <div className="space-y-4 bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-gray-900">Set Custom Weights (%)</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-medium text-gray-600">
                  Total: {totalWeight.toFixed(1)}%
                  {!isWeightValid && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Should be 100%)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNormalizeTo100}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
                  >
                    Normalize to 100%
                  </button>
                  <button
                    type="button"
                    onClick={handleSetEqualWeights}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
                  >
                    Set equal weights
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {selectedDataRows.map((index) => {
                const row = filteredSurveyData[index];
                
                if (!row) {
                  return null;
                }
                
                const currentWeight = customWeights[index] || 0;
                return (
                  <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="space-y-3">
                      {/* Specialty Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {row.surveySpecialty}
                          </div>
                          <div className="text-xs text-gray-500">
                            {row.surveySource} • {(row.tcc_n_orgs || row.n_orgs || 0).toLocaleString()} records
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-700 ml-4">
                          {currentWeight.toFixed(1)}%
                        </div>
                      </div>
                      
                      {/* Slider and Input */}
                      <div className="space-y-2">
                        {/* Slider */}
                        <div className="relative">
                          <label htmlFor={`weight-slider-${index}`} className="sr-only">
                            Set weight percentage for {row.surveySpecialty}
                          </label>
                          <input
                            id={`weight-slider-${index}`}
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={currentWeight}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              onCustomWeightChange(index, value);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
                            style={{
                              '--weight-percent': `${currentWeight}%`,
                              background: `linear-gradient(to right, #9333ea 0%, #9333ea ${currentWeight}%, #e5e7eb ${currentWeight}%, #e5e7eb 100%)`,
                              accentColor: '#9333ea'
                            } as React.CSSProperties}
                            data-weight={currentWeight}
                            aria-label={`Set weight percentage for ${row.surveySpecialty}`}
                          />
                        </div>
                        
                        {/* Number Input */}
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={currentWeight}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              onCustomWeightChange(index, value);
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {!isWeightValid && (
              <div className="text-xs text-gray-600 bg-gray-100 p-3 rounded-lg border border-gray-200">
                Tip: Weights should total 100% for optimal blending
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const BlendingMethodSelector = memo(BlendingMethodSelectorInner);


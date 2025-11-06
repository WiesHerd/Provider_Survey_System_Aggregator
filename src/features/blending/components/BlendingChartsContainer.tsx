/**
 * Blending Charts Container Component
 * 
 * Displays separate charts for TCC, wRVU, and CF
 */

import React from 'react';
import { TCCChart } from './TCCChart';
import { WRVUChart } from './WRVUChart';
import { ConversionFactorChart } from './ConversionFactorChart';
import { BlendedMetrics } from '../types/blending';

interface BlendingChartsContainerProps {
  blendedMetrics: BlendedMetrics;
  blendingMethod: 'simple' | 'weighted' | 'custom';
}

export const BlendingChartsContainer: React.FC<BlendingChartsContainerProps> = ({
  blendedMetrics,
  blendingMethod
}) => {
  // Prepare chart data for separate charts
  const tccData = {
    tcc: {
      p25: blendedMetrics.tcc_p25,
      p50: blendedMetrics.tcc_p50,
      p75: blendedMetrics.tcc_p75,
      p90: blendedMetrics.tcc_p90
    }
  };

  const wrvuData = {
    wrvu: {
      p25: blendedMetrics.wrvu_p25,
      p50: blendedMetrics.wrvu_p50,
      p75: blendedMetrics.wrvu_p75,
      p90: blendedMetrics.wrvu_p90
    }
  };

  const cfData = {
    cf: {
      p25: blendedMetrics.cf_p25,
      p50: blendedMetrics.cf_p50,
      p75: blendedMetrics.cf_p75,
      p90: blendedMetrics.cf_p90
    }
  };

  return (
    <div className="space-y-6">
      {/* Method-specific title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {blendingMethod === 'simple' && 'Simple Average Analysis'}
          {blendingMethod === 'weighted' && 'Weighted Average Analysis'}
          {blendingMethod === 'custom' && 'Custom Weight Analysis'}
        </h3>
        <p className="text-sm text-gray-600">
          {blendingMethod === 'simple' && 'Equal weights applied to all specialties'}
          {blendingMethod === 'weighted' && 'Weights based on incumbent count (sample size)'}
          {blendingMethod === 'custom' && 'Weights defined by user preferences'}
        </p>
      </div>

      {/* Three separate charts in a grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TCC Chart */}
        <div className="lg:col-span-1">
          <TCCChart
            data={tccData}
            title="Total Cash Compensation (TCC)"
            height={300}
            width={400}
          />
        </div>

        {/* wRVU Chart */}
        <div className="lg:col-span-1">
          <WRVUChart
            data={wrvuData}
            title="Work RVU (wRVU)"
            height={300}
            width={400}
          />
        </div>

        {/* CF Chart */}
        <div className="lg:col-span-1">
          <ConversionFactorChart
            data={cfData}
            title="Conversion Factor (CF)"
            height={300}
            width={400}
          />
        </div>
      </div>

      {/* Analysis insights */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2 text-sm">Analysis Insights</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Each chart shows the percentile distribution (P25, P50, P75, P90) for its respective metric</p>
          <p>• TCC represents total cash compensation in dollars</p>
          <p>• Work RVU represents work relative value units</p>
          <p>• Conversion Factor (CF) represents dollars per work RVU</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Blending Charts Container Component
 * 
 * Displays method-specific charts based on the blending method used
 * - Simple Average: Compensation Range Chart only
 * - Weighted Average: Weight Distribution + Compensation Range Charts
 * - Custom Weights: Custom Weight Distribution + Compensation Range Charts
 */

import React from 'react';
import { WeightDistributionChart } from './WeightDistributionChart';
import { CompensationRangeChart } from './CompensationRangeChart';
import { BlendedMetrics } from '../types/blending';

interface BlendingChartsContainerProps {
  blendedMetrics: BlendedMetrics;
  blendingMethod: 'simple' | 'weighted' | 'custom';
  selectedData?: Array<{
    specialty: string;
    weight: number;
    records: number;
  }>;
  customWeights?: Record<number, number>;
}

export const BlendingChartsContainer: React.FC<BlendingChartsContainerProps> = ({
  blendedMetrics,
  blendingMethod,
  selectedData = [],
  customWeights = {}
}) => {
  // Debug logging removed for production
  // Prepare chart data
  const compensationData = {
    tcc: {
      p25: blendedMetrics.tcc_p25,
      p50: blendedMetrics.tcc_p50,
      p75: blendedMetrics.tcc_p75,
      p90: blendedMetrics.tcc_p90
    },
    wrvu: {
      p25: blendedMetrics.wrvu_p25,
      p50: blendedMetrics.wrvu_p50,
      p75: blendedMetrics.wrvu_p75,
      p90: blendedMetrics.wrvu_p90
    },
    cf: {
      p25: blendedMetrics.cf_p25,
      p50: blendedMetrics.cf_p50,
      p75: blendedMetrics.cf_p75,
      p90: blendedMetrics.cf_p90
    }
  };

  // Prepare weight distribution data
  const getWeightDistributionData = () => {
    if (blendingMethod === 'simple') {
      // For simple average, show equal weights
      return selectedData.map(item => ({
        specialty: item.specialty,
        weight: 100 / selectedData.length,
        records: item.records
      }));
    } else if (blendingMethod === 'weighted') {
      // For weighted average, show actual weights based on incumbent count
      return selectedData.map(item => ({
        specialty: item.specialty,
        weight: item.weight,
        records: item.records
      }));
    } else if (blendingMethod === 'custom') {
      // For custom weights, show user-defined weights
      return selectedData.map(item => ({
        specialty: item.specialty,
        weight: item.weight,
        records: item.records
      }));
    }
    return [];
  };

  const weightData = getWeightDistributionData();

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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Distribution Chart (for weighted and custom methods) */}
        {(blendingMethod === 'weighted' || blendingMethod === 'custom') && weightData.length > 0 && (
          <div className="lg:col-span-1">
            <WeightDistributionChart
              data={weightData}
              title={
                blendingMethod === 'weighted' 
                  ? 'Weight Distribution (by Incumbent Count)'
                  : 'Custom Weight Distribution'
              }
              height={250}
              width={400}
            />
          </div>
        )}

        {/* Compensation Range Chart (for all methods) */}
        <div className={blendingMethod === 'simple' ? 'lg:col-span-2' : 'lg:col-span-1'}>
          <CompensationRangeChart
            data={compensationData}
            title="Compensation Range Analysis"
            height={250}
            width={blendingMethod === 'simple' ? 600 : 400}
          />
        </div>
      </div>

      {/* Method-specific insights */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Analysis Insights</h4>
        <div className="text-sm text-gray-600 space-y-1">
          {blendingMethod === 'simple' && (
            <p>• All specialties contribute equally to the blended result</p>
          )}
          {blendingMethod === 'weighted' && (
            <>
              <p>• Weights are determined by the number of incumbents (sample size)</p>
              <p>• Specialties with larger sample sizes have greater influence on the final result</p>
            </>
          )}
          {blendingMethod === 'custom' && (
            <>
              <p>• Weights are based on your specific business requirements</p>
              <p>• Allows for strategic emphasis on particular specialties</p>
            </>
          )}
          <p>• The compensation range shows the spread across percentiles (P25, P50, P75, P90)</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Calculation Details Component
 * 
 * Shows detailed calculation breakdown for transparency and verification
 * Displays source data, weights, and calculation steps
 */

import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { formatNumber } from '../../../shared/utils/formatters';

interface SourceRow {
  specialty: string;
  surveySource: string;
  surveyYear: string;
  region: string;
  providerType: string;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  records: number;
  incumbents: number;
  weight: number;
}

interface CalculationDetailsProps {
  sourceData: SourceRow[];
  blendedMetrics: {
    tcc_p25: number;
    tcc_p50: number;
    tcc_p75: number;
    tcc_p90: number;
    wrvu_p25: number;
    wrvu_p50: number;
    wrvu_p75: number;
    wrvu_p90: number;
    cf_p25: number;
    cf_p50: number;
    cf_p75: number;
    cf_p90: number;
  };
  blendingMethod: 'weighted' | 'simple' | 'custom';
}

export const CalculationDetails: React.FC<CalculationDetailsProps> = ({
  sourceData,
  blendedMetrics,
  blendingMethod
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Validate percentile ordering
  const validationIssues = useMemo(() => {
    const issues: Array<{ metric: string; issue: string; values: { p75: number; p90: number } }> = [];
    
    // Check TCC
    if (blendedMetrics.tcc_p90 < blendedMetrics.tcc_p75) {
      issues.push({
        metric: 'TCC',
        issue: 'P90 is lower than P75',
        values: { p75: blendedMetrics.tcc_p75, p90: blendedMetrics.tcc_p90 }
      });
    }
    if (blendedMetrics.tcc_p75 < blendedMetrics.tcc_p50) {
      issues.push({
        metric: 'TCC',
        issue: 'P75 is lower than P50',
        values: { p75: blendedMetrics.tcc_p75, p90: blendedMetrics.tcc_p50 }
      });
    }
    
    // Check wRVU
    if (blendedMetrics.wrvu_p90 < blendedMetrics.wrvu_p75) {
      issues.push({
        metric: 'wRVU',
        issue: 'P90 is lower than P75',
        values: { p75: blendedMetrics.wrvu_p75, p90: blendedMetrics.wrvu_p90 }
      });
    }
    
    // Check CF
    if (blendedMetrics.cf_p90 < blendedMetrics.cf_p75) {
      issues.push({
        metric: 'CF',
        issue: 'P90 is lower than P75',
        values: { p75: blendedMetrics.cf_p75, p90: blendedMetrics.cf_p90 }
      });
    }
    if (blendedMetrics.cf_p75 < blendedMetrics.cf_p50) {
      issues.push({
        metric: 'CF',
        issue: 'P75 is lower than P50',
        values: { p75: blendedMetrics.cf_p75, p90: blendedMetrics.cf_p50 }
      });
    }
    
    return issues;
  }, [blendedMetrics]);

  // Calculate CF from TCC/wRVU for verification
  const calculatedCF = useMemo(() => {
    return {
      p25: blendedMetrics.tcc_p25 > 0 && blendedMetrics.wrvu_p25 > 0 
        ? blendedMetrics.tcc_p25 / blendedMetrics.wrvu_p25 
        : 0,
      p50: blendedMetrics.tcc_p50 > 0 && blendedMetrics.wrvu_p50 > 0 
        ? blendedMetrics.tcc_p50 / blendedMetrics.wrvu_p50 
        : 0,
      p75: blendedMetrics.tcc_p75 > 0 && blendedMetrics.wrvu_p75 > 0 
        ? blendedMetrics.tcc_p75 / blendedMetrics.wrvu_p75 
        : 0,
      p90: blendedMetrics.tcc_p90 > 0 && blendedMetrics.wrvu_p90 > 0 
        ? blendedMetrics.tcc_p90 / blendedMetrics.wrvu_p90 
        : 0,
    };
  }, [blendedMetrics]);

  // Compare calculated CF vs blended CF
  const cfDiscrepancies = useMemo(() => {
    const discrepancies: Array<{ percentile: string; blended: number; calculated: number; difference: number }> = [];
    const percentiles = [
      { key: 'p25', label: 'P25' },
      { key: 'p50', label: 'P50' },
      { key: 'p75', label: 'P75' },
      { key: 'p90', label: 'P90' }
    ];
    
    percentiles.forEach(({ key, label }) => {
      const blended = blendedMetrics[`cf_${key}` as keyof typeof blendedMetrics] as number;
      const calculated = calculatedCF[key as keyof typeof calculatedCF];
      const difference = Math.abs(blended - calculated);
      const percentDiff = blended > 0 ? (difference / blended) * 100 : 0;
      
      // Flag if difference is more than 5%
      if (percentDiff > 5) {
        discrepancies.push({
          percentile: label,
          blended,
          calculated,
          difference: percentDiff
        });
      }
    });
    
    return discrepancies;
  }, [blendedMetrics, calculatedCF]);

  const hasIssues = validationIssues.length > 0 || cfDiscrepancies.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center space-x-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">Calculation Details & Verification</h3>
            <p className="text-xs text-gray-600">
              View source data, weights, and calculation steps
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200 space-y-6">
          {/* Validation Warnings */}
          {hasIssues && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">Data Validation Warnings</h4>
                  
                  {validationIssues.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-amber-800 mb-1">Percentile Ordering Issues:</p>
                      <ul className="text-xs text-amber-700 space-y-1 ml-4 list-disc">
                        {validationIssues.map((issue, idx) => (
                          <li key={idx}>
                            <strong>{issue.metric}:</strong> {issue.issue} 
                            (P75: {formatNumber(issue.values.p75, 2)}, P90: {formatNumber(issue.values.p90, 2)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {cfDiscrepancies.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-800 mb-1">CF Calculation Discrepancies:</p>
                      <p className="text-xs text-amber-700 mb-2">
                        The blended CF values differ significantly from CF calculated as TCC/wRVU. 
                        This suggests CF percentiles may have been averaged directly rather than calculated from TCC/wRVU.
                      </p>
                      <ul className="text-xs text-amber-700 space-y-1 ml-4 list-disc">
                        {cfDiscrepancies.map((disc, idx) => (
                          <li key={idx}>
                            <strong>{disc.percentile}:</strong> Blended: ${formatNumber(disc.blended, 2)}, 
                            Calculated (TCC/wRVU): ${formatNumber(disc.calculated, 2)} 
                            ({formatNumber(disc.difference, 1)}% difference)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Source Data Table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Source Data ({sourceData.length} {sourceData.length === 1 ? 'row' : 'rows'})
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Records</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">TCC P50</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">wRVU P50</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CF P50</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CF P75</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CF P90</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sourceData.map((row, idx) => {
                    const cfFromTccWrvu = row.tcc_p50 > 0 && row.wrvu_p50 > 0 
                      ? row.tcc_p50 / row.wrvu_p50 
                      : 0;
                    const cfDiff = Math.abs(row.cf_p50 - cfFromTccWrvu);
                    const hasCFIssue = cfDiff > (row.cf_p50 * 0.05); // 5% threshold
                    
                    return (
                      <tr key={idx} className={hasCFIssue ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 text-gray-900 font-medium">
                          {row.specialty}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {row.surveySource} {row.surveyYear}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          {(row.weight * 100).toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {row.records.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          ${formatNumber(row.tcc_p50, 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {formatNumber(row.wrvu_p50, 0)}
                        </td>
                        <td className={`px-3 py-2 text-right ${hasCFIssue ? 'text-amber-700 font-semibold' : 'text-gray-900'}`}>
                          ${formatNumber(row.cf_p50, 2)}
                          {hasCFIssue && (
                            <span className="ml-1 text-xs" title={`Expected: $${formatNumber(cfFromTccWrvu, 2)}`}>
                              ⚠
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          ${formatNumber(row.cf_p75, 2)}
                        </td>
                        <td className={`px-3 py-2 text-right ${row.cf_p90 < row.cf_p75 ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                          ${formatNumber(row.cf_p90, 2)}
                          {row.cf_p90 < row.cf_p75 && (
                            <span className="ml-1 text-xs" title="P90 is lower than P75 - this is unusual">
                              ⚠
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sourceData.some(row => row.cf_p90 < row.cf_p75) && (
              <p className="text-xs text-amber-700 mt-2 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                Some source rows have P90 &lt; P75. This may indicate data quality issues in the source survey.
              </p>
            )}
          </div>

          {/* Calculation Method */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Calculation Method</h4>
            <p className="text-xs text-gray-700 mb-2">
              <strong>Blending Method:</strong> {blendingMethod === 'weighted' ? 'Weighted Average (by incumbent count)' : blendingMethod === 'simple' ? 'Simple Average (equal weights)' : 'Custom Weights'}
            </p>
            <p className="text-xs text-gray-700">
              <strong>Formula:</strong> Each percentile is calculated as a weighted average: 
              <code className="bg-gray-200 px-1 rounded mx-1">Blended_PXX = Σ(Source_PXX × Weight)</code>
            </p>
            <p className="text-xs text-amber-700 mt-2">
              <strong>Note:</strong> CF (Conversion Factor) is currently calculated as a weighted average of CF percentiles. 
              For more accurate results, CF should be calculated as TCC ÷ wRVU after blending.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


/**
 * Blended Results Preview Component
 * 
 * Shows a preview of blended metrics before creating the final blend
 * Appears after selections are made and blending method is chosen
 */

import React, { useMemo, useState } from 'react';
import { formatNumber, formatCurrency } from '../../../shared/utils/formatters';
import { ExclamationTriangleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { useToast } from '../../../components/ui/use-toast';

interface BlendedMetrics {
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
  totalRecords: number;
  specialties: string[];
  method: 'weighted' | 'simple' | 'custom';
}

interface BlendedResultsPreviewProps {
  metrics: BlendedMetrics | null;
  blendingMethod: 'weighted' | 'simple' | 'custom';
  selectedCount: number;
  selectedDataRows?: number[];
  filteredSurveyData?: any[];
  customWeights?: Record<number, number>;
}

export const BlendedResultsPreview: React.FC<BlendedResultsPreviewProps> = ({
  metrics,
  blendingMethod,
  selectedCount,
  selectedDataRows = [],
  filteredSurveyData = [],
  customWeights = {}
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  const methodLabels = {
    weighted: 'Weighted by incumbent count',
    simple: 'Simple average (equal weights)',
    custom: 'Custom weights applied'
  };
  
  // Excel export functionality
  const handleExportToExcel = () => {
    if (!metrics) return;
    
    setIsExporting(true);
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet with blended metrics
      const summaryData = [
        ['Blended Compensation Metrics'],
        [''],
        ['Blending Method', methodLabels[blendingMethod]],
        ['Number of Specialties', metrics.specialties.length],
        ['Total Records', metrics.totalRecords],
        [''],
        ['Metric', 'P25', 'P50 (Median)', 'P75', 'P90'],
        ['TCC ($)', metrics.tcc_p25, metrics.tcc_p50, metrics.tcc_p75, metrics.tcc_p90],
        ['Work RVU', metrics.wrvu_p25, metrics.wrvu_p50, metrics.wrvu_p75, metrics.wrvu_p90],
        ['CF ($)', metrics.cf_p25, metrics.cf_p50, metrics.cf_p75, metrics.cf_p90],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Blended Metrics');
      
      // Source data sheet (if available)
      if (selectedDataRows.length > 0 && filteredSurveyData.length > 0) {
        const selectedData = selectedDataRows.map(index => filteredSurveyData[index]).filter(row => row);
        if (selectedData.length > 0) {
          const sourceData = selectedData.map((row, idx) => ({
            'Specialty': row.surveySpecialty || '',
            'Survey': row.surveySource || '',
            'Year': row.surveyYear || '',
            'Region': row.geographicRegion || '',
            'Provider Type': row.providerType || '',
            'TCC P25': row.tcc_p25 || '',
            'TCC P50': row.tcc_p50 || '',
            'TCC P75': row.tcc_p75 || '',
            'TCC P90': row.tcc_p90 || '',
            'wRVU P25': row.wrvu_p25 || '',
            'wRVU P50': row.wrvu_p50 || '',
            'wRVU P75': row.wrvu_p75 || '',
            'wRVU P90': row.wrvu_p90 || '',
            'CF P25': row.cf_p25 || '',
            'CF P50': row.cf_p50 || '',
            'CF P75': row.cf_p75 || '',
            'CF P90': row.cf_p90 || '',
            'Weight (%)': blendingMethod === 'custom' && customWeights[idx] ? customWeights[idx].toFixed(2) : 
                         blendingMethod === 'weighted' ? ((row.tcc_n_incumbents || 0) / selectedData.reduce((sum, r) => sum + (r.tcc_n_incumbents || 0), 0) * 100).toFixed(2) :
                         (100 / selectedData.length).toFixed(2),
            'Records': row.tcc_n_orgs || row.n_orgs || 0
          }));
          
          const sourceSheet = XLSX.utils.json_to_sheet(sourceData);
          sourceSheet['!cols'] = [
            { wch: 30 },
            { wch: 20 },
            { wch: 8 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 10 }
          ];
          XLSX.utils.book_append_sheet(workbook, sourceSheet, 'Source Data');
        }
      }
      
      // Download file
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `blended-results-${timestamp}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: 'Export Successful',
        description: 'Blended results exported to Excel successfully.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export to Excel.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Validate percentile ordering and generate specific issue messages
  const percentileIssues = useMemo(() => {
    if (!metrics) return [];
    
    const issues: string[] = [];
    
    // Check CF percentile ordering
    if (metrics.cf_p90 < metrics.cf_p75) {
      issues.push(`Conversion Factor: P90 (${formatNumber(metrics.cf_p90, 2)}) is smaller than P75 (${formatNumber(metrics.cf_p75, 2)})`);
    }
    if (metrics.cf_p75 < metrics.cf_p50) {
      issues.push(`Conversion Factor: P75 (${formatNumber(metrics.cf_p75, 2)}) is smaller than P50 (${formatNumber(metrics.cf_p50, 2)})`);
    }
    
    // Check TCC percentile ordering
    if (metrics.tcc_p90 < metrics.tcc_p75) {
      issues.push(`Total Cash Compensation: P90 (${formatNumber(metrics.tcc_p90, 0)}) is smaller than P75 (${formatNumber(metrics.tcc_p75, 0)})`);
    }
    
    // Check wRVU percentile ordering
    if (metrics.wrvu_p90 < metrics.wrvu_p75) {
      issues.push(`Work RVUs: P90 (${formatNumber(metrics.wrvu_p90, 0)}) is smaller than P75 (${formatNumber(metrics.wrvu_p75, 0)})`);
    }
    
    return issues;
  }, [metrics]);

  // Early return after hooks
  if (!metrics || selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Step 4: Preview Blended Results
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {methodLabels[blendingMethod]}
              {' • '}{metrics.specialties.slice(0, 3).join(', ')}
              {metrics.specialties.length > 3 && ` +${metrics.specialties.length - 3} more`}
              {' • '}{metrics.totalRecords.toLocaleString()} records
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportToExcel}
              disabled={isExporting || !metrics}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export to Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="px-6 py-6">
        {/* Google-style metrics table */}
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P25
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P50
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P75
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P90
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <div className="text-sm font-medium text-gray-900">Total Cash Compensation</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(metrics.tcc_p25, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(metrics.tcc_p50, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(metrics.tcc_p75, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(metrics.tcc_p90, 0)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div className="text-sm font-medium text-gray-900">Work RVUs</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(metrics.wrvu_p25, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  {formatNumber(metrics.wrvu_p50, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(metrics.wrvu_p75, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(metrics.wrvu_p90, 0)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <div className="text-sm font-medium text-gray-900">Conversion Factor</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  ${formatNumber(metrics.cf_p25, 2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  ${formatNumber(metrics.cf_p50, 2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  ${formatNumber(metrics.cf_p75, 2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  ${formatNumber(metrics.cf_p90, 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Percentile Ordering Issues Notification */}
        {percentileIssues.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Percentile Ordering Notice
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="font-medium">The following percentile ordering issues were detected:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    {percentileIssues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-blue-700">
                    This typically occurs when some source data rows have missing values for higher percentiles (P75, P90). 
                    The blending calculation excludes missing values, which can result in these ordering differences. 
                    Please review the source data to verify the results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


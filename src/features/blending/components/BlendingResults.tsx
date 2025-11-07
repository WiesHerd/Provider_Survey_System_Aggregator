/**
 * Blending Results Component
 * 
 * This component displays the results of a specialty blend,
 * showing calculated metrics and allowing export functionality.
 */

import React, { useState } from 'react';
import { 
  DocumentArrowDownIcon, 
  ArrowLeftIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { BlendedResult } from '../types/blending';
import { BlendingChartsContainer } from './BlendingChartsContainer';
import { useToast } from '../../../components/ui/use-toast';
import { generateBlendedReportPDF, BlendedReportData } from '../utils/pdfReportGenerator';

interface BlendingResultsProps {
  result: BlendedResult;
  onBack: () => void;
}

export const BlendingResults: React.FC<BlendingResultsProps> = ({
  result,
  onBack
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  
  // PDF export functionality - generates professional PDF report
  const handleExportToPDF = async () => {
    try {
      setIsExportingPDF(true);
      
      toast({
        title: 'Generating PDF Report',
        description: 'Creating your professional report... This may take a few seconds.',
      });
      
      // Convert BlendedResult to BlendedReportData format
      const reportData: BlendedReportData = {
        title: 'Blended Compensation Report',
        generatedAt: new Date(result.createdAt).toLocaleString(),
        blendMethod: result.blendingMethod || 'weighted',
        specialties: result.specialties?.map(s => s.name) || [],
        totalRecords: result.sampleSize || 0,
        customWeights: result.customWeights && result.specialties ? result.specialties.map((spec, index) => ({
          specialty: spec.name,
          weight: spec.weight || 0,
          records: spec.records || 0
        })) : undefined,
        metrics: {
          tcc: {
            p25: result.blendedData.tcc_p25,
            p50: result.blendedData.tcc_p50,
            p75: result.blendedData.tcc_p75,
            p90: result.blendedData.tcc_p90
          },
          wrvu: {
            p25: result.blendedData.wrvu_p25,
            p50: result.blendedData.wrvu_p50,
            p75: result.blendedData.wrvu_p75,
            p90: result.blendedData.wrvu_p90
          },
          cf: {
            p25: result.blendedData.cf_p25,
            p50: result.blendedData.cf_p50,
            p75: result.blendedData.cf_p75,
            p90: result.blendedData.cf_p90
          }
        }
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${result.blendName?.replace(/[^a-z0-9]/gi, '-') || 'Blended-Report'}-${timestamp}.pdf`;
      
      // Generate PDF
      await generateBlendedReportPDF(reportData, filename);
      
      setIsExportingPDF(false);
      
      toast({
        title: 'Report Generated Successfully',
        description: `Your PDF report "${filename}" has been downloaded. Check your downloads folder.`,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setIsExportingPDF(false);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to generate PDF. Please check the browser console for details.',
        variant: 'destructive'
      });
    }
  };

  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ['Blend Name', result.blendName || 'Untitled Blend'],
        ['Created', result.createdAt ? new Date(result.createdAt).toLocaleString() : ''],
        ['Blending Method', result.blendingMethod || 'simple'],
        ['Sample Size', result.sampleSize || 0],
        ['Confidence', `${((result.confidence || 0) * 100).toFixed(1)}%`],
        ['Number of Specialties', result.specialties?.length || 0],
        ['', ''],
        ['Metric', 'P25', 'P50 (Median)', 'P75', 'P90'],
        ['TCC ($)', result.blendedData.tcc_p25, result.blendedData.tcc_p50, result.blendedData.tcc_p75, result.blendedData.tcc_p90],
        ['Work RVU', result.blendedData.wrvu_p25, result.blendedData.wrvu_p50, result.blendedData.wrvu_p75, result.blendedData.wrvu_p90],
        ['CF ($)', result.blendedData.cf_p25, result.blendedData.cf_p50, result.blendedData.cf_p75, result.blendedData.cf_p90],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Specialties sheet
      if (result.specialties && result.specialties.length > 0) {
        const specialtiesData = result.specialties.map(spec => ({
          'Specialty Name': spec.name,
          'Survey Source': spec.surveySource,
          'Survey Year': spec.surveyYear,
          'Geographic Region': spec.geographicRegion,
          'Provider Type': spec.providerType,
          'Weight (%)': spec.weight.toFixed(2),
          'Records': spec.records
        }));
        
        const specialtiesSheet = XLSX.utils.json_to_sheet(specialtiesData);
        specialtiesSheet['!cols'] = [
          { wch: 30 },
          { wch: 20 },
          { wch: 12 },
          { wch: 20 },
          { wch: 15 },
          { wch: 12 },
          { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(workbook, specialtiesSheet, 'Specialties');
      }
      
      // Download file
      const filename = `blending-results-${result.blendName?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'untitled'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: 'Export Successful',
        description: 'Blending results exported to Excel successfully.',
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
  
  
  return (
    <div className="space-y-6">
      {/* Content area */}
      <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blending Results</h1>
            <p className="text-gray-600 mt-1">Results for: {result.blendName}</p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Blending
          </button>
        </div>
      </div>
        
        {/* Blend Summary & Specialties */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Blend Summary</h2>
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{result.specialties.length}</div>
                <div className="text-xs text-gray-600">Specialties</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{result.sampleSize.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Sample Size</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">{(result.confidence * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-600">Confidence</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Specialties Used</h3>
            <div className="space-y-2">
              {result.specialties.map((specialty, index) => (
                <div key={specialty.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{specialty.name}</div>
                      <div className="text-xs text-gray-500">
                        {specialty.surveySource} • {specialty.surveyYear} • {specialty.geographicRegion}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-medium text-gray-900 text-sm">{specialty.weight.toFixed(2)}%</div>
                    <div className="text-xs text-gray-500">{specialty.records.toLocaleString()} records</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Blended Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Blended Compensation Metrics</h2>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-gray-200">
              {/* TCC Metrics */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Total Cash Compensation (TCC)</h3>
                <div className="space-y-0 divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">25th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.tcc_p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">50th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.tcc_p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">75th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.tcc_p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">90th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.tcc_p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              
              {/* wRVU Metrics */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Work RVUs (wRVU)</h3>
                <div className="space-y-0 divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">25th Percentile:</span>
                    <span className="font-medium text-gray-900">{result.blendedData.wrvu_p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">50th Percentile:</span>
                    <span className="font-medium text-gray-900">{result.blendedData.wrvu_p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">75th Percentile:</span>
                    <span className="font-medium text-gray-900">{result.blendedData.wrvu_p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">90th Percentile:</span>
                    <span className="font-medium text-gray-900">{result.blendedData.wrvu_p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              
              {/* CF Metrics */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Collection Factor (CF)</h3>
                <div className="space-y-0 divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">25th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.cf_p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">50th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.cf_p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">75th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.cf_p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-600">90th Percentile:</span>
                    <span className="font-medium text-gray-900">${result.blendedData.cf_p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Charts Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Visual Analysis</h2>
          <BlendingChartsContainer
            blendedMetrics={result.blendedData}
            blendingMethod={result.blendingMethod}
          />
        </div>

        {/* Timestamp - included in PDF */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600">
            Created: {new Date(result.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

        {/* Actions - excluded from PDF */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-end">
            <div className="flex space-x-3">
              <button
                onClick={handleExportToExcel}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </button>
              <button
                onClick={handleExportToPDF}
                disabled={isExportingPDF}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                <DocumentChartBarIcon className="w-4 h-4 mr-2" />
                {isExportingPDF ? 'Exporting...' : 'Export to PDF'}
              </button>
            </div>
          </div>
        </div>
        
    </div>
  );
};

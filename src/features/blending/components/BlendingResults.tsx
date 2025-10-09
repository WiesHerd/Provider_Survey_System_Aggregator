/**
 * Blending Results Component
 * 
 * This component displays the results of a specialty blend,
 * showing calculated metrics and allowing export functionality.
 */

import React from 'react';
import { BlendedResult } from '../types/blending';

interface BlendingResultsProps {
  result: BlendedResult;
  onBack: () => void;
  onClose: () => void;
}

export const BlendingResults: React.FC<BlendingResultsProps> = ({
  result,
  onBack,
  onClose
}) => {
  const handleExportToExcel = () => {
    // TODO: Implement Excel export
    console.log('Export to Excel:', result);
  };
  
  const handleExportToCSV = () => {
    // TODO: Implement CSV export
    console.log('Export to CSV:', result);
  };
  
  const handleSaveAsTemplate = () => {
    // TODO: Implement save as template
    console.log('Save as template:', result);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Blending Results</h1>
              <p className="text-gray-600 mt-1">Results for: {result.blendName}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Back to Blending
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        
        {/* Blend Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Blend Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{result.specialties.length}</div>
              <div className="text-sm text-gray-600">Specialties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.sampleSize.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Sample Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{(result.confidence * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
          </div>
        </div>
        
        {/* Specialties Used */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Specialties Used</h2>
          <div className="space-y-3">
            {result.specialties.map((specialty, index) => (
              <div key={specialty.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{specialty.name}</div>
                    <div className="text-sm text-gray-500">
                      {specialty.surveySource} • {specialty.surveyYear} • {specialty.geographicRegion}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{specialty.weight.toFixed(2)}%</div>
                  <div className="text-sm text-gray-500">{specialty.records.toLocaleString()} records</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Blended Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Blended Compensation Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TCC Metrics */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Total Cash Compensation (TCC)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">25th Percentile:</span>
                  <span className="font-medium">${result.blendedData.tcc_p25.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">50th Percentile:</span>
                  <span className="font-medium">${result.blendedData.tcc_p50.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">75th Percentile:</span>
                  <span className="font-medium">${result.blendedData.tcc_p75.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">90th Percentile:</span>
                  <span className="font-medium">${result.blendedData.tcc_p90.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* wRVU Metrics */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Work RVUs (wRVU)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">25th Percentile:</span>
                  <span className="font-medium">{result.blendedData.wrvu_p25.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">50th Percentile:</span>
                  <span className="font-medium">{result.blendedData.wrvu_p50.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">75th Percentile:</span>
                  <span className="font-medium">{result.blendedData.wrvu_p75.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">90th Percentile:</span>
                  <span className="font-medium">{result.blendedData.wrvu_p90.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* CF Metrics */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Collection Factor (CF)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">25th Percentile:</span>
                  <span className="font-medium">{result.blendedData.cf_p25.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">50th Percentile:</span>
                  <span className="font-medium">{result.blendedData.cf_p50.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">75th Percentile:</span>
                  <span className="font-medium">{result.blendedData.cf_p75.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">90th Percentile:</span>
                  <span className="font-medium">{result.blendedData.cf_p90.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Created: {new Date(result.createdAt).toLocaleString()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExportToExcel}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Export to Excel
              </button>
              <button
                onClick={handleExportToCSV}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Export to CSV
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Save as Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

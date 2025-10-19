import React from 'react';

interface TCCDataDiagnosticProps {
  data: any[];
  title?: string;
}

/**
 * TCC Data Diagnostic Component
 * Helps debug TCC data availability and display issues
 */
const TCCDataDiagnostic: React.FC<TCCDataDiagnosticProps> = ({ 
  data, 
  title = "TCC Data Diagnostic" 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="text-sm font-medium text-red-900 mb-2">❌ {title}</h4>
        <p className="text-xs text-red-800">No data available for analysis</p>
      </div>
    );
  }

  const tccRows = data.filter(row => 
    row.tcc_p25 > 0 || row.tcc_p50 > 0 || row.tcc_p75 > 0 || row.tcc_p90 > 0
  );

  const sampleRow = tccRows[0] || data[0];

  const diagnosticInfo = {
    totalRows: data.length,
    tccRowsCount: tccRows.length,
    tccDataPercentage: data.length > 0 ? Math.round((tccRows.length / data.length) * 100) : 0,
    hasTccP25: tccRows.filter(row => row.tcc_p25 > 0).length,
    hasTccP50: tccRows.filter(row => row.tcc_p50 > 0).length,
    hasTccP75: tccRows.filter(row => row.tcc_p75 > 0).length,
    hasTccP90: tccRows.filter(row => row.tcc_p90 > 0).length,
    sampleTccData: sampleRow ? {
      tcc_p25: sampleRow.tcc_p25,
      tcc_p50: sampleRow.tcc_p50,
      tcc_p75: sampleRow.tcc_p75,
      tcc_p90: sampleRow.tcc_p90,
      specialty: sampleRow.specialty || sampleRow.surveySpecialty,
      surveySource: sampleRow.surveySource
    } : null
  };

  const getStatusColor = (count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    if (percentage === 0) return 'text-red-600';
    if (percentage < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    if (percentage === 0) return '❌';
    if (percentage < 50) return '⚠️';
    return '✅';
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-sm font-medium text-blue-900 mb-3">🔍 {title}</h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-900">{diagnosticInfo.totalRows}</div>
          <div className="text-xs text-blue-700">Total Rows</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-semibold ${getStatusColor(diagnosticInfo.tccRowsCount, diagnosticInfo.totalRows)}`}>
            {diagnosticInfo.tccRowsCount}
          </div>
          <div className="text-xs text-blue-700">TCC Rows</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-semibold ${getStatusColor(diagnosticInfo.tccRowsCount, diagnosticInfo.totalRows)}`}>
            {diagnosticInfo.tccDataPercentage}%
          </div>
          <div className="text-xs text-blue-700">TCC Coverage</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-900">
            {getStatusIcon(diagnosticInfo.tccRowsCount, diagnosticInfo.totalRows)}
          </div>
          <div className="text-xs text-blue-700">Status</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-white rounded border">
          <div className={`text-sm font-medium ${getStatusColor(diagnosticInfo.hasTccP25, diagnosticInfo.tccRowsCount)}`}>
            {getStatusIcon(diagnosticInfo.hasTccP25, diagnosticInfo.tccRowsCount)} TCC P25
          </div>
          <div className="text-xs text-gray-600">{diagnosticInfo.hasTccP25} rows</div>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <div className={`text-sm font-medium ${getStatusColor(diagnosticInfo.hasTccP50, diagnosticInfo.tccRowsCount)}`}>
            {getStatusIcon(diagnosticInfo.hasTccP50, diagnosticInfo.tccRowsCount)} TCC P50
          </div>
          <div className="text-xs text-gray-600">{diagnosticInfo.hasTccP50} rows</div>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <div className={`text-sm font-medium ${getStatusColor(diagnosticInfo.hasTccP75, diagnosticInfo.tccRowsCount)}`}>
            {getStatusIcon(diagnosticInfo.hasTccP75, diagnosticInfo.tccRowsCount)} TCC P75
          </div>
          <div className="text-xs text-gray-600">{diagnosticInfo.hasTccP75} rows</div>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <div className={`text-sm font-medium ${getStatusColor(diagnosticInfo.hasTccP90, diagnosticInfo.tccRowsCount)}`}>
            {getStatusIcon(diagnosticInfo.hasTccP90, diagnosticInfo.tccRowsCount)} TCC P90
          </div>
          <div className="text-xs text-gray-600">{diagnosticInfo.hasTccP90} rows</div>
        </div>
      </div>

      {diagnosticInfo.sampleTccData && (
        <div className="mt-3 p-3 bg-white rounded border">
          <h5 className="text-xs font-medium text-gray-900 mb-2">Sample TCC Data:</h5>
          <div className="text-xs text-gray-700 space-y-1">
            <p><strong>Specialty:</strong> {diagnosticInfo.sampleTccData.specialty}</p>
            <p><strong>Survey Source:</strong> {diagnosticInfo.sampleTccData.surveySource}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <p><strong>TCC P25:</strong> ${diagnosticInfo.sampleTccData.tcc_p25?.toLocaleString() || 'N/A'}</p>
              <p><strong>TCC P50:</strong> ${diagnosticInfo.sampleTccData.tcc_p50?.toLocaleString() || 'N/A'}</p>
              <p><strong>TCC P75:</strong> ${diagnosticInfo.sampleTccData.tcc_p75?.toLocaleString() || 'N/A'}</p>
              <p><strong>TCC P90:</strong> ${diagnosticInfo.sampleTccData.tcc_p90?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {diagnosticInfo.tccRowsCount === 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h5 className="text-xs font-medium text-yellow-900 mb-1">⚠️ No TCC Data Found</h5>
          <p className="text-xs text-yellow-800">
            This could indicate:
            <br />• Column mappings are not configured for TCC fields
            <br />• Data source doesn't contain TCC columns
            <br />• TCC data is being filtered out
            <br />• Data transformation is not working correctly
          </p>
        </div>
      )}
    </div>
  );
};

export default TCCDataDiagnostic;
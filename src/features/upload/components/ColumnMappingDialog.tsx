/**
 * Column Mapping Dialog Component
 * 
 * Enterprise-grade column mapping interface for CSV uploads.
 * Shows detected columns and allows users to map them to expected columns.
 * Only appears when columns don't match expected format.
 */

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ColumnMapping {
  csvColumn: string;
  expectedColumn: string;
  isRequired: boolean;
  autoMatched: boolean;
}

interface ColumnMappingDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mappings: Record<string, string>) => void;
  detectedColumns: string[];
  expectedColumns: Array<{
    name: string;
    required: boolean;
    displayName: string;
  }>;
  format: 'normalized' | 'wide';
  sampleData?: Record<string, any>[];
  surveyType?: string;
}

export const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({
  open,
  onClose,
  onConfirm,
  detectedColumns,
  expectedColumns,
  format,
  sampleData = [],
  surveyType
}) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Initialize mappings when dialog opens
  React.useEffect(() => {
    if (open) {
      const initialMappings: ColumnMapping[] = detectedColumns.map(csvCol => {
        // Try to auto-match based on column name
        const matchedExpected = expectedColumns.find(expCol => {
          const csvLower = csvCol.toLowerCase().trim();
          const expLower = expCol.name.toLowerCase();
          
          // Direct match
          if (csvLower === expLower) return true;
          
          // Common variations
          if (expLower === 'variable' && (csvLower.includes('benchmark') || csvLower.includes('variable'))) return true;
          if (expLower === 'n_orgs' && (csvLower.includes('group count') || csvLower.includes('organizations'))) return true;
          if (expLower === 'n_incumbents' && (csvLower.includes('indv count') || csvLower.includes('incumbents'))) return true;
          if (expLower === 'p25' && csvLower.includes('25th')) return true;
          if (expLower === 'p50' && csvLower.includes('50th')) return true;
          if (expLower === 'p75' && csvLower.includes('75th')) return true;
          if (expLower === 'p90' && csvLower.includes('90th')) return true;
          if (expLower === 'specialty' && csvLower.includes('specialty')) return true;
          if (expLower === 'geographic_region' && (csvLower.includes('region') || csvLower.includes('geographic'))) return true;
          if (expLower === 'provider_type' && (csvLower.includes('provider') || csvLower.includes('type'))) return true;
          
          return false;
        });

        return {
          csvColumn: csvCol,
          expectedColumn: matchedExpected?.name || '',
          isRequired: matchedExpected?.required || false,
          autoMatched: !!matchedExpected
        };
      });

      setMappings(initialMappings);
    }
  }, [open, detectedColumns, expectedColumns]);

  const handleMappingChange = (csvColumn: string, expectedColumn: string) => {
    setMappings(prev => prev.map(mapping => 
      mapping.csvColumn === csvColumn
        ? { ...mapping, expectedColumn, autoMatched: false }
        : mapping
    ));
  };

  const handleConfirm = () => {
    const mappingRecord: Record<string, string> = {};
    mappings.forEach(mapping => {
      if (mapping.expectedColumn) {
        mappingRecord[mapping.csvColumn] = mapping.expectedColumn;
      }
    });

    // TODO: Save template if requested
    if (saveAsTemplate && surveyType) {
      console.log('🔍 Saving column mapping template for:', surveyType);
      // Save to IndexedDB as template
    }

    onConfirm(mappingRecord);
  };

  const unmappedRequired = mappings.filter(
    m => m.isRequired && !m.expectedColumn
  );

  const canProceed = unmappedRequired.length === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }
      }}
    >
      <DialogTitle className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Map Your Columns</h2>
          <p className="text-sm text-gray-600 mt-1">
            Map your CSV columns to the expected format
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="Close dialog"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </DialogTitle>

      <DialogContent className="p-6 bg-gray-50">
        {/* Instructions - Google-style subtle guidance */}
        <div className="mb-5 p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700 leading-relaxed">
            Select the expected column name for each of your CSV columns. 
            <span className="font-medium text-gray-900"> Required columns</span> must be mapped to proceed.
          </p>
        </div>

        {/* Mapping Table - Google-style clean table */}
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Your CSV Column
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Maps To
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mappings.map((mapping, index) => {
                const isUnmappedRequired = mapping.isRequired && !mapping.expectedColumn;

                return (
                  <tr 
                    key={index}
                    className={isUnmappedRequired ? 'bg-red-50' : mapping.autoMatched ? 'bg-emerald-50' : 'hover:bg-gray-50 transition-colors duration-150'}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-sm font-mono font-semibold text-gray-900">{mapping.csvColumn}</code>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping.expectedColumn}
                        onChange={(e) => handleMappingChange(mapping.csvColumn, e.target.value)}
                        aria-label={`Map ${mapping.csvColumn} to expected column`}
                        title={`Map ${mapping.csvColumn} to expected column`}
                        className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors duration-200 ${
                          isUnmappedRequired 
                            ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                            : 'border-gray-300 bg-white hover:border-gray-400 focus:ring-blue-500'
                        } focus:outline-none focus:ring-2 focus:border-transparent`}
                      >
                        <option value="">-- Select column --</option>
                        {expectedColumns.map(expCol => (
                          <option key={expCol.name} value={expCol.name}>
                            {expCol.displayName} {expCol.required ? '(Required)' : '(Optional)'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {mapping.expectedColumn ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Mapped
                        </span>
                      ) : mapping.isRequired ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                          Optional
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sample Data Preview - Google-style subtle preview */}
        {sampleData.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Sample Data (First Row)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {detectedColumns.slice(0, 8).map((col, idx) => (
                      <th key={idx} className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  <tr>
                    {detectedColumns.slice(0, 8).map((col, idx) => (
                      <td key={idx} className="px-3 py-2 text-xs text-gray-900">
                        {String(sampleData[0]?.[col] || '')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Save Template Option - Google-style subtle checkbox */}
        {surveyType && (
          <div className="mt-5 flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="saveTemplate"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="saveTemplate" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
              Save this mapping as a template for future <span className="font-medium text-gray-900">"{surveyType}"</span> uploads
            </label>
          </div>
        )}
      </DialogContent>

      <DialogActions className="px-6 py-4 border-t border-gray-200 bg-white">
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 500,
            borderColor: '#d1d5db',
            color: '#374151',
            '&:hover': {
              borderColor: '#9ca3af',
              backgroundColor: '#f9fafb'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!canProceed}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 500,
            backgroundColor: '#2563eb',
            '&:hover': {
              backgroundColor: '#1d4ed8'
            },
            '&:disabled': {
              backgroundColor: '#d1d5db',
              color: '#9ca3af'
            }
          }}
        >
          Confirm & Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};


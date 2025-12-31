/**
 * Report Actions Component
 * 
 * Handles save, export, and load actions for reports
 */

import React from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import { DocumentArrowDownIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { ReportActionsProps } from '../types/reportBuilder';
import { useToast } from '../../../../contexts/ToastContext';
import { validateReportName } from '../utils/reportValidators';

export const ReportActions: React.FC<ReportActionsProps> = ({
  reportName,
  chartData,
  onSave,
  onExport,
  savedReports,
  onLoadReport,
  onDeleteReport
}) => {
  const toast = useToast();

  const handleSave = () => {
    const validation = validateReportName(reportName);
    if (!validation.valid) {
      toast.error('Save Failed', validation.error);
      return;
    }
    onSave();
    toast.success('Report Saved', 'Your report has been saved successfully');
  };

  const handleExport = () => {
    if (chartData.length === 0) {
      toast.warning('No Data', 'There is no data to export');
      return;
    }
    onExport();
    toast.success('Export Started', 'Your report is being downloaded');
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!reportName.trim()}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Save Report
        </button>
        <button
          onClick={handleExport}
          disabled={chartData.length === 0}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>

      {savedReports.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value=""
            onChange={(e: React.ChangeEvent<{ value: unknown }>) => {
              const value = e.target.value as string;
              const report = savedReports.find(r => r.id === value);
              if (report) onLoadReport(report);
            }}
            displayEmpty
            sx={{
              backgroundColor: 'white',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem value="" disabled>
              Load Saved Report
            </MenuItem>
            {savedReports.map((report) => (
              <MenuItem key={report.id} value={report.id}>
                {report.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </div>
  );
};


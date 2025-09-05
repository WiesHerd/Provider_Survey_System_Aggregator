/**
 * Analytics Export Component
 * Provides export functionality for analytics data
 */

import React, { memo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import { 
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { AnalyticsExportProps } from '../types/analytics';

/**
 * Analytics Export component for exporting analytics data
 * 
 * @param data - The analytics data to export
 * @param onExport - Callback when export is triggered
 * @param loading - Whether data is loading
 */
export const AnalyticsExport: React.FC<AnalyticsExportProps> = memo(({ 
  data, 
  onExport,
  loading 
}) => {
  const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
    onExport(format);
  };

  return (
    <Box className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <Box className="flex items-center justify-between mb-4">
        <Box className="flex items-center gap-2">
          <DocumentArrowDownIcon className="h-5 w-5 text-gray-600" />
          <Typography variant="h6" className="font-semibold text-gray-900">
            Export Data
          </Typography>
        </Box>
        <Typography variant="body2" className="text-gray-500">
          {data.length} records available
        </Typography>
      </Box>

      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<TableCellsIcon className="h-4 w-4" />}
          onClick={() => handleExport('excel')}
          disabled={loading || data.length === 0}
          className="border-blue-300 text-blue-600 hover:bg-blue-50"
        >
          Export to Excel
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<DocumentTextIcon className="h-4 w-4" />}
          onClick={() => handleExport('csv')}
          disabled={loading || data.length === 0}
          className="border-green-300 text-green-600 hover:bg-green-50"
        >
          Export to CSV
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<DocumentTextIcon className="h-4 w-4" />}
          onClick={() => handleExport('pdf')}
          disabled={loading || data.length === 0}
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          Export to PDF
        </Button>
      </Stack>
    </Box>
  );
});

AnalyticsExport.displayName = 'AnalyticsExport';

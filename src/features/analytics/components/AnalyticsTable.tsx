/**
 * Analytics Table Component
 * Displays analytics data in a table format
 */

import React, { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { AnalyticsTableProps } from '../types/analytics';
import { formatCurrency, formatNumber } from '../utils/analyticsCalculations';
import LoadingSpinner from '../../../components/ui/loading-spinner';

/**
 * Analytics Table component for displaying survey analytics data
 * 
 * @param data - The analytics data to display
 * @param loading - Whether data is loading
 * @param onRowClick - Callback when a row is clicked
 */
export const AnalyticsTable: React.FC<AnalyticsTableProps> = memo(({ 
  data, 
  loading,
  onRowClick 
}) => {
  // Early returns for loading/error states
  if (loading) {
    return (
      <Box className="flex items-center justify-center p-8">
        <LoadingSpinner message="Loading analytics data..." size="lg" variant="primary" />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box className="flex items-center justify-center p-8">
        <Typography variant="h6" color="text.secondary">
          No analytics data available
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} className="rounded-xl shadow-sm">
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell className="font-semibold bg-gray-50">Specialty</TableCell>
            <TableCell className="font-semibold bg-gray-50">Survey Source</TableCell>
            <TableCell className="font-semibold bg-gray-50">Region</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">Organizations</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">Incumbents</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">TCC P25</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">TCC P50</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">TCC P75</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">TCC P90</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">wRVU P25</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">wRVU P50</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">wRVU P75</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">wRVU P90</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">CF P25</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">CF P50</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">CF P75</TableCell>
            <TableCell className="font-semibold bg-gray-50 text-right">CF P90</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={`${row.surveySource}-${row.surveySpecialty}-${index}`}
              hover
              onClick={() => onRowClick?.(row)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <TableCell className="font-medium">
                {row.surveySpecialty}
              </TableCell>
              <TableCell>
                {row.surveySource}
              </TableCell>
              <TableCell>
                {row.geographicRegion}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.n_orgs)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.n_incumbents)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.tcc_p25)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.tcc_p50)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.tcc_p75)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.tcc_p90)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.wrvu_p25)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.wrvu_p50)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.wrvu_p75)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.wrvu_p90)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.cf_p25)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.cf_p50)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.cf_p75)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.cf_p90)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

AnalyticsTable.displayName = 'AnalyticsTable';
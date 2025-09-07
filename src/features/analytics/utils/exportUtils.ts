import * as XLSX from 'xlsx';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';

interface ExportOptions {
  includeFilters?: boolean;
  includeSummary?: boolean;
  filename?: string;
}

/**
 * Export analytics data to Excel
 */
export const exportToExcel = (
  data: AggregatedData[],
  filters: AnalyticsFilters,
  options: ExportOptions = {}
) => {
  const {
    includeFilters = true,
    includeSummary = true,
    filename = `survey-analytics-${new Date().toISOString().split('T')[0]}.xlsx`
  } = options;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Prepare data for export
  const exportData = data.map(row => ({
    'Survey Source': row.surveySource,
    'Survey Specialty': row.surveySpecialty,
    'Geographic Region': row.geographicRegion,
    'Provider Type': row.providerType,
    'Survey Year': row.surveyYear,
    'TCC # Orgs': row.tcc_n_orgs,
    'TCC # Incumbents': row.tcc_n_incumbents,
    'wRVU # Orgs': row.wrvu_n_orgs,
    'wRVU # Incumbents': row.wrvu_n_incumbents,
    'CF # Orgs': row.cf_n_orgs,
    'CF # Incumbents': row.cf_n_incumbents,
    'TCC P25': row.tcc_p25,
    'TCC P50': row.tcc_p50,
    'TCC P75': row.tcc_p75,
    'TCC P90': row.tcc_p90,
    'wRVU P25': row.wrvu_p25,
    'wRVU P50': row.wrvu_p50,
    'wRVU P75': row.wrvu_p75,
    'wRVU P90': row.wrvu_p90,
    'CF P25': row.cf_p25,
    'CF P50': row.cf_p50,
    'CF P75': row.cf_p75,
    'CF P90': row.cf_p90
  }));

  // Create main data worksheet
  const dataWorksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Survey Source
    { wch: 20 }, // Survey Specialty
    { wch: 15 }, // Geographic Region
    { wch: 15 }, // Provider Type
    { wch: 12 }, // Survey Year
    { wch: 15 }, // # Organizations
    { wch: 15 }, // # Incumbents
    { wch: 12 }, // TCC P25
    { wch: 12 }, // TCC P50
    { wch: 12 }, // TCC P75
    { wch: 12 }, // TCC P90
    { wch: 12 }, // wRVU P25
    { wch: 12 }, // wRVU P50
    { wch: 12 }, // wRVU P75
    { wch: 12 }, // wRVU P90
    { wch: 12 }, // CF P25
    { wch: 12 }, // CF P50
    { wch: 12 }, // CF P75
    { wch: 12 }  // CF P90
  ];
  dataWorksheet['!cols'] = columnWidths;

  // Add data worksheet
  XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Survey Data');

  // Add filters worksheet if requested
  if (includeFilters) {
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value && value !== '')
      .map(([key, value]) => ({ 'Filter': key, 'Value': value }));

    if (activeFilters.length > 0) {
      const filtersWorksheet = XLSX.utils.json_to_sheet(activeFilters);
      filtersWorksheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, filtersWorksheet, 'Active Filters');
    }
  }

  // Add summary worksheet if requested
  if (includeSummary) {
    const totalRecords = data.length;
    const totalTccOrgs = data.reduce((sum, row) => sum + row.tcc_n_orgs, 0);
    const totalTccIncumbents = data.reduce((sum, row) => sum + row.tcc_n_incumbents, 0);
    const totalWrvuOrgs = data.reduce((sum, row) => sum + row.wrvu_n_orgs, 0);
    const totalWrvuIncumbents = data.reduce((sum, row) => sum + row.wrvu_n_incumbents, 0);
    const totalCfOrgs = data.reduce((sum, row) => sum + row.cf_n_orgs, 0);
    const totalCfIncumbents = data.reduce((sum, row) => sum + row.cf_n_incumbents, 0);
    const avgTccP50 = data.reduce((sum, row) => sum + row.tcc_p50, 0) / data.length;
    const avgWrvuP50 = data.reduce((sum, row) => sum + row.wrvu_p50, 0) / data.length;

    const summaryData = [
      { 'Metric': 'Total Records', 'Value': totalRecords },
      { 'Metric': 'Total TCC Organizations', 'Value': totalTccOrgs },
      { 'Metric': 'Total TCC Incumbents', 'Value': totalTccIncumbents },
      { 'Metric': 'Total wRVU Organizations', 'Value': totalWrvuOrgs },
      { 'Metric': 'Total wRVU Incumbents', 'Value': totalWrvuIncumbents },
      { 'Metric': 'Total CF Organizations', 'Value': totalCfOrgs },
      { 'Metric': 'Total CF Incumbents', 'Value': totalCfIncumbents },
      { 'Metric': 'Average TCC P50', 'Value': Math.round(avgTccP50) },
      { 'Metric': 'Average wRVU P50', 'Value': Math.round(avgWrvuP50) },
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
    ];

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
  }

  // Download the file
  XLSX.writeFile(workbook, filename);
};

/**
 * Export to CSV (simpler alternative)
 */
export const exportToCSV = (
  data: AggregatedData[],
  filters: AnalyticsFilters,
  options: ExportOptions = {}
) => {
  const {
    filename = `survey-analytics-${new Date().toISOString().split('T')[0]}.csv`
  } = options;

  // Prepare CSV data
  const headers = [
    'Survey Source',
    'Survey Specialty',
    'Geographic Region',
    'Provider Type',
    'Survey Year',
    'TCC # Orgs',
    'TCC # Incumbents',
    'wRVU # Orgs',
    'wRVU # Incumbents',
    'CF # Orgs',
    'CF # Incumbents',
    'TCC P25',
    'TCC P50',
    'TCC P75',
    'TCC P90',
    'wRVU P25',
    'wRVU P50',
    'wRVU P75',
    'wRVU P90',
    'CF P25',
    'CF P50',
    'CF P75',
    'CF P90'
  ];

  const csvData = data.map(row => [
    row.surveySource,
    row.surveySpecialty,
    row.geographicRegion,
    row.providerType,
    row.surveyYear,
    row.tcc_n_orgs,
    row.tcc_n_incumbents,
    row.wrvu_n_orgs,
    row.wrvu_n_incumbents,
    row.cf_n_orgs,
    row.cf_n_incumbents,
    row.tcc_p25,
    row.tcc_p50,
    row.tcc_p75,
    row.tcc_p90,
    row.wrvu_p25,
    row.wrvu_p50,
    row.wrvu_p75,
    row.wrvu_p90,
    row.cf_p25,
    row.cf_p50,
    row.cf_p75,
    row.cf_p90
  ]);

  // Add headers
  csvData.unshift(headers);

  // Convert to CSV string
  const csvContent = csvData
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

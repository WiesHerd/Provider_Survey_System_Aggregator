/**
 * Report Export Utilities
 * 
 * Handles CSV export functionality for reports
 */

import { ReportConfigInput, ChartDataItem } from '../types/reportBuilder';
import { getMetricDisplayLabel } from './reportFormatters';

/**
 * Exports report data to CSV file
 * 
 * @param config - Report configuration
 * @param chartData - Chart data to export
 */
export const exportReportToCSV = (
  config: ReportConfigInput,
  chartData: ChartDataItem[]
): void => {
  const metricLabel = getMetricDisplayLabel(config.metric);
  const yearsText = config.filters.years.length > 0 ? config.filters.years.join(', ') : 'All';
  const regionsText = config.filters.regions.length > 0 ? `${config.filters.regions.length} selected` : 'All';
  const sourcesText = config.filters.surveySources.length > 0 ? `${config.filters.surveySources.length} selected` : 'All';
  const specialtiesText = config.filters.specialties.length > 0 ? `${config.filters.specialties.length} selected` : 'All';

  const metaLines = [
    `Report: ${config.dimension} × ${metricLabel}`,
    `Years: ${yearsText}`,
    `Regions: ${regionsText}`,
    `Survey Sources: ${sourcesText}`,
    `Specialties: ${specialtiesText}`,
    `Items: ${chartData.length}`,
    `Generated: ${new Date().toISOString()}`
  ].join('\n');

  const tableHeaders = `${config.dimension},${config.metric},Count\n`;
  const tableRows = chartData.map(row => `${row.name},${row.value},${row.count}`).join('\n');

  const blob = new Blob([metaLines + '\n\n' + tableHeaders + tableRows], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `custom-report-${config.dimension}-${config.metric}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  // Clean up blob URL to prevent memory leak
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
};








// Temporarily disabled due to build issues
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';

interface PrintOptions {
  includeFilters?: boolean;
  includeSummary?: boolean;
  orientation?: 'portrait' | 'landscape';
  title?: string;
}

/**
 * Generate PDF from analytics data (temporarily disabled)
 */
export const generateAnalyticsPDF = (
  data: AggregatedData[],
  filters: AnalyticsFilters,
  options: PrintOptions = {}
) => {
  // Temporarily return null until jspdf issues are resolved
  console.warn('PDF generation temporarily disabled');
  return null;
};

/**
 * Download PDF (temporarily disabled)
 */
export const downloadAnalyticsPDF = (
  data: AggregatedData[],
  filters: AnalyticsFilters,
  options: PrintOptions = {}
) => {
  console.warn('PDF download temporarily disabled');
};

/**
 * Print using browser print dialog
 */
export const printAnalytics = (data: AggregatedData[], filters: AnalyticsFilters) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const activeFilters = Object.entries(filters)
    .filter(([_, value]) => value && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  
  const totalRecords = data.length;
  const totalOrgs = data.reduce((sum, row) => sum + row.n_orgs, 0);
  const totalIncumbents = data.reduce((sum, row) => sum + row.n_incumbents, 0);
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Survey Analytics Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .summary { margin-bottom: 20px; }
        .filters { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .numeric { text-align: right; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Survey Analytics Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
      </div>
      
      ${activeFilters ? `
        <div class="filters">
          <h3>Active Filters:</h3>
          <p>${activeFilters}</p>
        </div>
      ` : ''}
      
      <div class="summary">
        <h3>Summary:</h3>
        <p>Total Records: ${totalRecords.toLocaleString()}</p>
        <p>Total Organizations: ${totalOrgs.toLocaleString()}</p>
        <p>Total Incumbents: ${totalIncumbents.toLocaleString()}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Survey Source</th>
            <th>Specialty</th>
            <th>Region</th>
            <th class="numeric"># Orgs</th>
            <th class="numeric"># Incumbents</th>
            <th class="numeric">TCC P25</th>
            <th class="numeric">TCC P50</th>
            <th class="numeric">TCC P75</th>
            <th class="numeric">TCC P90</th>
            <th class="numeric">wRVU P25</th>
            <th class="numeric">wRVU P50</th>
            <th class="numeric">wRVU P75</th>
            <th class="numeric">wRVU P90</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.surveySource}</td>
              <td>${row.surveySpecialty}</td>
              <td>${row.geographicRegion}</td>
              <td class="numeric">${row.n_orgs.toLocaleString()}</td>
              <td class="numeric">${row.n_incumbents.toLocaleString()}</td>
              <td class="numeric">$${row.tcc_p25.toLocaleString()}</td>
              <td class="numeric">$${row.tcc_p50.toLocaleString()}</td>
              <td class="numeric">$${row.tcc_p75.toLocaleString()}</td>
              <td class="numeric">$${row.tcc_p90.toLocaleString()}</td>
              <td class="numeric">${row.wrvu_p25.toLocaleString()}</td>
              <td class="numeric">${row.wrvu_p50.toLocaleString()}</td>
              <td class="numeric">${row.wrvu_p75.toLocaleString()}</td>
              <td class="numeric">${row.wrvu_p90.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="no-print" style="margin-top: 20px;">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
};

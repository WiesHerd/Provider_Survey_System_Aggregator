import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';

interface PrintOptions {
  includeFilters?: boolean;
  includeSummary?: boolean;
  orientation?: 'portrait' | 'landscape';
  title?: string;
}

/**
 * Generate PDF from analytics data
 */
export const generateAnalyticsPDF = (
  data: AggregatedData[],
  filters: AnalyticsFilters,
  options: PrintOptions = {}
) => {
  const {
    includeFilters = true,
    includeSummary = true,
    orientation = 'landscape',
    title = 'Survey Analytics Report'
  } = options;

  // Create PDF document
  const doc = new jsPDF(orientation);
  
  let yPosition = 20;
  
  // Add title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, yPosition);
  yPosition += 15;
  
  // Add generation date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, yPosition);
  yPosition += 10;
  
  // Add filters if requested
  if (includeFilters) {
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value && value !== '')
      .map(([key, value]) => `${key}: ${value}`);
    
    if (activeFilters.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Active Filters:', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      activeFilters.forEach(filter => {
        doc.text(`• ${filter}`, 25, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }
  }
  
  // Add summary if requested
  if (includeSummary) {
    const totalRecords = data.length;
    const totalOrgs = data.reduce((sum, row) => sum + row.n_orgs, 0);
    const totalIncumbents = data.reduce((sum, row) => sum + row.n_incumbents, 0);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total Records: ${totalRecords.toLocaleString()}`, 25, yPosition);
    yPosition += 6;
    doc.text(`• Total Organizations: ${totalOrgs.toLocaleString()}`, 25, yPosition);
    yPosition += 6;
    doc.text(`• Total Incumbents: ${totalIncumbents.toLocaleString()}`, 25, yPosition);
    yPosition += 10;
  }
  
  // Prepare table data
  const tableData = data.map(row => [
    row.surveySource,
    row.surveySpecialty,
    row.geographicRegion,
    row.n_orgs.toLocaleString(),
    row.n_incumbents.toLocaleString(),
    `$${row.tcc_p25.toLocaleString()}`,
    `$${row.tcc_p50.toLocaleString()}`,
    `$${row.tcc_p75.toLocaleString()}`,
    `$${row.tcc_p90.toLocaleString()}`,
    row.wrvu_p25.toLocaleString(),
    row.wrvu_p50.toLocaleString(),
    row.wrvu_p75.toLocaleString(),
    row.wrvu_p90.toLocaleString()
  ]);
  
  // Add table
  autoTable(doc, {
    head: [
      [
        'Survey Source',
        'Specialty',
        'Region',
        '# Orgs',
        '# Incumbents',
        'TCC P25',
        'TCC P50',
        'TCC P75',
        'TCC P90',
        'wRVU P25',
        'wRVU P50',
        'wRVU P75',
        'wRVU P90'
      ]
    ],
    body: tableData,
    startY: yPosition,
    styles: { 
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: { 
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Survey Source
      1: { cellWidth: 25 }, // Specialty
      2: { cellWidth: 20 }, // Region
      3: { cellWidth: 15, halign: 'right' }, // # Orgs
      4: { cellWidth: 20, halign: 'right' }, // # Incumbents
      5: { cellWidth: 18, halign: 'right' }, // TCC P25
      6: { cellWidth: 18, halign: 'right' }, // TCC P50
      7: { cellWidth: 18, halign: 'right' }, // TCC P75
      8: { cellWidth: 18, halign: 'right' }, // TCC P90
      9: { cellWidth: 18, halign: 'right' }, // wRVU P25
      10: { cellWidth: 18, halign: 'right' }, // wRVU P50
      11: { cellWidth: 18, halign: 'right' }, // wRVU P75
      12: { cellWidth: 18, halign: 'right' }  // wRVU P90
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 10, right: 10, bottom: 10, left: 10 }
  });
  
  return doc;
};

/**
 * Download PDF
 */
export const downloadAnalyticsPDF = (
  data: AggregatedData[],
  filters: AnalyticsFilters,
  options: PrintOptions = {}
) => {
  const doc = generateAnalyticsPDF(data, filters, options);
  const filename = `survey-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
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

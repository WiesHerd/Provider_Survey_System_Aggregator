/**
 * Report Export Service
 * 
 * Handles PDF and Excel export for reports
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { ReportData, ReportConfig, ReportMetric } from '../types/reports';

/**
 * PDF Formatting Constants
 */
const PDF_CONSTANTS = {
  // Page dimensions (landscape A4 in mm)
  PAGE_WIDTH: 297,
  PAGE_HEIGHT: 210,
  MARGIN: 15,
  
  // Typography
  FONT_SIZE: {
    TITLE: 18,
    SUBTITLE: 11,
    HEADER: 9,
    BODY: 8,
    SMALL: 7
  },
  
  // Colors (RGB)
  COLORS: {
    PRIMARY_TEXT: [31, 41, 55],      // #1f2937
    SECONDARY_TEXT: [75, 85, 99],     // #4b5563
    MUTED_TEXT: [107, 114, 128],      // #6b7280
    HEADER_BG: [99, 102, 241],        // #6366f1 (purple accent)
    HEADER_TEXT: [255, 255, 255],     // white
    BORDER: [209, 213, 219],          // #d1d5db
    ROW_EVEN: [249, 250, 251],        // #f9fafb
    ROW_ODD: [255, 255, 255]          // white
  },
  
  // Table dimensions
  CELL_HEIGHT: 7,
  CELL_PADDING: 4,
  HEADER_HEIGHT: 8,
  
  // Spacing
  SPACING: {
    AFTER_TITLE: 8,
    AFTER_SUBTITLE: 6,
    BEFORE_TABLE: 8,
    SECTION: 5
  }
};

/**
 * Export report to Excel
 */
export function exportToExcel(data: ReportData, config: ReportConfig): void {
  try {
    const workbook = XLSX.utils.book_new();

    // Check if region column should be included
    const shouldIncludeRegion = data.rows.some(row => row.region) || !config.selectedRegion;
    
    // Check if provider type column should be included
    const shouldIncludeProviderType = data.rows.some(row => row.providerType) || !config.selectedProviderType || config.selectedProviderType.length === 0;
    
    // Check if year column should be included
    const shouldIncludeYear = data.rows.some(row => row.surveyYear) || config.selectedYear.length > 1;

    // Prepare report configuration summary
    const getMetricDisplayName = (metric: ReportMetric): string => {
      const names: Record<ReportMetric, string> = {
        tcc: 'Total Cash Compensation',
        wrvu: 'Work RVUs',
        cf: 'Conversion Factors'
      };
      return names[metric];
    };

    const formatFilterValue = (values: string[]): string => {
      if (values.length === 0) return 'All';
      if (values.length === 1) return values[0];
      return values.join(', ');
    };

    const configSummary = [
      ['Report Configuration Summary'],
      [],
      ['Metric', getMetricDisplayName(config.metric)],
      ['Provider Type', formatFilterValue(config.selectedProviderType)],
      ['Survey Source', formatFilterValue(config.selectedSurveySource)],
      ['Region', formatFilterValue(config.selectedRegion)],
      ['Year', formatFilterValue(config.selectedYear)],
      ['Blending Enabled', config.enableBlending ? 'Yes' : 'No'],
      ['Blending Method', config.enableBlending 
        ? (config.blendingMethod === 'weighted' ? 'Weighted Average' : 'Simple Average') 
        : 'N/A'],
      ['Selected Percentiles', config.selectedPercentiles.map(p => p.toUpperCase()).join(', ')],
      [],
      ['Report Statistics'],
      [],
      ['Total Rows', data.metadata.totalRows],
      ['Blended Rows', data.metadata.blendedRows],
      ['Unmapped Rows', data.metadata.unmappedRows],
      ['Generated At', data.metadata.generatedAt.toLocaleString()],
      [],
      ['Report Data'],
      []
    ];

    // Prepare data for export
    const exportData = data.rows.map(row => {
      const baseRow: Record<string, any> = {
        'Specialty': row.specialty,
      };

      if (shouldIncludeRegion && row.region) {
        baseRow['Region'] = row.region;
      }

      if (shouldIncludeProviderType && row.providerType) {
        baseRow['Provider Type'] = row.providerType;
      }

      if (row.surveySource) {
        baseRow['Survey Source'] = row.surveySource;
      }

      if (shouldIncludeYear && row.surveyYear) {
        baseRow['Year'] = row.surveyYear;
      }

      // Add selected percentiles
      if (config.selectedPercentiles.includes('p25') && row.p25 !== undefined) {
        baseRow['P25'] = row.p25;
      }
      if (config.selectedPercentiles.includes('p50') && row.p50 !== undefined) {
        baseRow['P50'] = row.p50;
      }
      if (config.selectedPercentiles.includes('p75') && row.p75 !== undefined) {
        baseRow['P75'] = row.p75;
      }
      if (config.selectedPercentiles.includes('p90') && row.p90 !== undefined) {
        baseRow['P90'] = row.p90;
      }

      baseRow['# Organizations'] = row.n_orgs;
      baseRow['# Incumbents'] = row.n_incumbents;
      baseRow['Blended'] = row.isBlended ? 'Yes' : 'No';

      return baseRow;
    });

    // Combine config summary with data
    const allData: any[][] = [
      ...configSummary,
    ];
    
    // Add headers and data rows only if there's data
    if (exportData.length > 0) {
      // Add headers row
      allData.push(Object.keys(exportData[0]));
      // Add data rows
      exportData.forEach(row => {
        allData.push(Object.values(row));
      });
    }

    // Create worksheet from combined data
    const worksheet = XLSX.utils.aoa_to_sheet(allData);

    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Specialty
    ];

    if (shouldIncludeRegion) {
      columnWidths.push({ wch: 15 }); // Region
    }

    if (shouldIncludeProviderType) {
      columnWidths.push({ wch: 18 }); // Provider Type
    }

    if (config.selectedSurveySource) {
      columnWidths.push({ wch: 25 }); // Survey Source
    }

    if (shouldIncludeYear) {
      columnWidths.push({ wch: 12 }); // Year
    }

    // Add percentile columns
    config.selectedPercentiles.forEach(() => {
      columnWidths.push({ wch: 15 });
    });

    columnWidths.push(
      { wch: 15 }, // # Organizations
      { wch: 15 }, // # Incumbents
      { wch: 10 }  // Blended
    );

    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');

    // Generate filename
    const filename = `${config.metric}-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error(`Failed to export to Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export report to PDF
 */
export function exportToPDF(data: ReportData, config: ReportConfig): void {
  try {
    // Create PDF document in landscape orientation
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = PDF_CONSTANTS.PAGE_WIDTH;
    const pageHeight = PDF_CONSTANTS.PAGE_HEIGHT;
    const margin = PDF_CONSTANTS.MARGIN;
    let yPosition = margin;

    // Draw title
    doc.setFontSize(PDF_CONSTANTS.FONT_SIZE.TITLE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(
      PDF_CONSTANTS.COLORS.PRIMARY_TEXT[0],
      PDF_CONSTANTS.COLORS.PRIMARY_TEXT[1],
      PDF_CONSTANTS.COLORS.PRIMARY_TEXT[2]
    );
    const title = `${getMetricDisplayName(config.metric)} Report`;
    doc.text(title, margin, yPosition);
    yPosition += PDF_CONSTANTS.SPACING.AFTER_TITLE;

    // Draw metadata section
    doc.setFontSize(PDF_CONSTANTS.FONT_SIZE.SUBTITLE);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(
      PDF_CONSTANTS.COLORS.SECONDARY_TEXT[0],
      PDF_CONSTANTS.COLORS.SECONDARY_TEXT[1],
      PDF_CONSTANTS.COLORS.SECONDARY_TEXT[2]
    );
    
    const totalRows = data.rows.length;
    const blendedCount = data.rows.filter(r => r.isBlended).length;
    const unmappedCount = totalRows - blendedCount;
    
    doc.text(`Generated: ${data.metadata.generatedAt.toLocaleString()}`, margin, yPosition);
    yPosition += PDF_CONSTANTS.SPACING.SECTION;
    
    doc.text(
      `Total Rows: ${totalRows.toLocaleString()} | Blended: ${blendedCount.toLocaleString()} | Unmapped: ${unmappedCount.toLocaleString()}`,
      margin,
      yPosition
    );
    yPosition += PDF_CONSTANTS.SPACING.BEFORE_TABLE;

    // Check if region column should be included
    const shouldIncludeRegion = data.rows.some(row => row.region) || !config.selectedRegion;
    
    // Check if provider type column should be included
    const shouldIncludeProviderType = data.rows.some(row => row.providerType) || !config.selectedProviderType || config.selectedProviderType.length === 0;
    
    // Check if year column should be included
    const shouldIncludeYear = data.rows.some(row => row.surveyYear) || config.selectedYear.length > 1;

    // Prepare table headers
    const headers: string[] = ['Specialty'];
    if (shouldIncludeRegion) {
      headers.push('Region');
    }
    if (shouldIncludeProviderType) {
      headers.push('Provider Type');
    }
    if (config.selectedSurveySource && config.selectedSurveySource.length > 0) {
      headers.push('Survey Source');
    }
    if (shouldIncludeYear) {
      headers.push('Year');
    }

    // Add percentile headers
    config.selectedPercentiles.forEach(p => {
      headers.push(p.toUpperCase());
    });

    headers.push('# Orgs', '# Incumbents', 'Blended');

    // Calculate optimal column widths
    const tableStartX = margin;
    const tableWidth = pageWidth - (margin * 2);
    const colCount = headers.length;
    
    // Calculate column widths - Specialty gets more space, numeric columns get adequate space
    const specialtyWidth = tableWidth * 0.22;
    const textColWidth = tableWidth * 0.12; // Region, Provider Type, Survey Source
    const yearColWidth = tableWidth * 0.08; // Year column
    const percentileWidth = tableWidth * 0.10; // Percentile columns
    const countColWidth = tableWidth * 0.08; // # Orgs, # Incumbents
    const blendedWidth = tableWidth * 0.06; // Blended column
    
    const colWidths: number[] = [specialtyWidth];
    
    if (shouldIncludeRegion) {
      colWidths.push(textColWidth);
    }
    if (shouldIncludeProviderType) {
      colWidths.push(textColWidth);
    }
    if (config.selectedSurveySource && config.selectedSurveySource.length > 0) {
      colWidths.push(textColWidth);
    }
    if (shouldIncludeYear) {
      colWidths.push(yearColWidth);
    }
    
    // Add percentile column widths
    config.selectedPercentiles.forEach(() => {
      colWidths.push(percentileWidth);
    });
    
    colWidths.push(countColWidth, countColWidth, blendedWidth);
    
    // Normalize column widths to fit exactly
    const totalCalculatedWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const scaleFactor = tableWidth / totalCalculatedWidth;
    const normalizedWidths = colWidths.map(w => w * scaleFactor);

    // Prepare table data with proper formatting
    const tableData = data.rows.map(row => {
      const rowData: any[] = [row.specialty || '-'];

      if (shouldIncludeRegion && row.region) {
        rowData.push(row.region);
      } else if (shouldIncludeRegion) {
        rowData.push('-');
      }

      if (shouldIncludeProviderType) {
        rowData.push(row.providerType || '-');
      }

      if (config.selectedSurveySource && config.selectedSurveySource.length > 0) {
        rowData.push(row.surveySource || '-');
      }

      if (shouldIncludeYear) {
        rowData.push(row.surveyYear || '-');
      }

      // Add selected percentiles with proper currency formatting
      if (config.selectedPercentiles.includes('p25')) {
        rowData.push(formatCurrency(row.p25, config.metric));
      }
      if (config.selectedPercentiles.includes('p50')) {
        rowData.push(formatCurrency(row.p50, config.metric));
      }
      if (config.selectedPercentiles.includes('p75')) {
        rowData.push(formatCurrency(row.p75, config.metric));
      }
      if (config.selectedPercentiles.includes('p90')) {
        rowData.push(formatCurrency(row.p90, config.metric));
      }

      rowData.push(
        row.n_orgs?.toLocaleString('en-US') || '0',
        row.n_incumbents?.toLocaleString('en-US') || '0',
        row.isBlended ? 'Yes' : 'No'
      );

      return rowData;
    });

    // Draw table header
    let currentY = yPosition;
    drawTableHeader(doc, tableStartX, currentY, headers, normalizedWidths);
    currentY += PDF_CONSTANTS.HEADER_HEIGHT;

    // Draw data rows with proper page handling
    tableData.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (currentY + PDF_CONSTANTS.CELL_HEIGHT > pageHeight - margin) {
        doc.addPage('landscape');
        currentY = margin;
        
        // Redraw header on new page
        drawTableHeader(doc, tableStartX, currentY, headers, normalizedWidths);
        currentY += PDF_CONSTANTS.HEADER_HEIGHT;
      }

      // Draw row with borders and alternating colors
      drawTableRow(
        doc,
        tableStartX,
        currentY,
        row,
        headers,
        normalizedWidths,
        rowIndex,
        config.metric
      );
      
      currentY += PDF_CONSTANTS.CELL_HEIGHT;
    });

    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(PDF_CONSTANTS.FONT_SIZE.SMALL);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(
        PDF_CONSTANTS.COLORS.MUTED_TEXT[0],
        PDF_CONSTANTS.COLORS.MUTED_TEXT[1],
        PDF_CONSTANTS.COLORS.MUTED_TEXT[2]
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - margin / 2,
        { align: 'center' }
      );
    }

    // Generate filename
    const filename = `${config.metric}-report-${new Date().toISOString().split('T')[0]}.pdf`;

    // Save PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error(`Failed to export to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get metric display name
 */
function getMetricDisplayName(metric: ReportMetric): string {
  const names: Record<ReportMetric, string> = {
    tcc: 'Total Cash Compensation',
    wrvu: 'Work RVUs',
    cf: 'Conversion Factors'
  };
  return names[metric];
}

/**
 * Format number (no dollar signs, comma separators, decimals only when needed)
 */
function formatNumber(value: number): string {
  if (value === 0 || !value) return '0';
  
  // Check if it's a whole number
  if (value % 1 === 0) {
    return value.toLocaleString('en-US');
  }
  
  // For decimals, show up to 2 decimal places
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Format currency value with dollar sign and proper formatting
 */
function formatCurrency(value: number | undefined, metric: ReportMetric): string {
  if (value === undefined || value === null) return '-';
  
  if (metric === 'tcc') {
    // Format as currency with dollar sign for TCC (including zero values)
    return `$${value.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }
  
  // For other metrics, use standard number formatting
  if (value === 0) return '0';
  return formatNumber(value);
}

/**
 * Draw a cell with border and background
 */
function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  options: {
    align?: 'left' | 'center' | 'right';
    fillColor?: number[];
    textColor?: number[];
    fontSize?: number;
    fontStyle?: 'normal' | 'bold';
    border?: boolean;
  } = {}
): void {
  const {
    align = 'left',
    fillColor,
    textColor = PDF_CONSTANTS.COLORS.PRIMARY_TEXT,
    fontSize = PDF_CONSTANTS.FONT_SIZE.BODY,
    fontStyle = 'normal',
    border = true
  } = options;

  // Draw background if specified
  if (fillColor) {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(x, y, width, height, 'F');
  }

  // Draw border
  if (border) {
    doc.setDrawColor(
      PDF_CONSTANTS.COLORS.BORDER[0],
      PDF_CONSTANTS.COLORS.BORDER[1],
      PDF_CONSTANTS.COLORS.BORDER[2]
    );
    doc.setLineWidth(0.1);
    doc.rect(x, y, width, height, 'S');
  }

  // Set text properties
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontStyle);

  // Calculate text position - center vertically in cell
  const textY = y + height / 2 + fontSize / 3; // Adjust for baseline
  const maxTextWidth = width - (PDF_CONSTANTS.CELL_PADDING * 2);

  // Truncate text if too long
  let displayText = text;
  const textWidth = doc.getTextWidth(text);
  if (textWidth > maxTextWidth) {
    const truncated = doc.splitTextToSize(text, maxTextWidth);
    displayText = truncated[0];
  }

  // Calculate text X position based on alignment
  let textX: number;
  const finalTextWidth = doc.getTextWidth(displayText);
  
  if (align === 'left') {
    textX = x + PDF_CONSTANTS.CELL_PADDING;
  } else if (align === 'center') {
    textX = x + (width - finalTextWidth) / 2;
  } else {
    // right align
    textX = x + width - PDF_CONSTANTS.CELL_PADDING - finalTextWidth;
  }

  // Draw text
  doc.text(displayText, textX, textY, {
    maxWidth: maxTextWidth
  });
}

/**
 * Draw table header row
 */
function drawTableHeader(
  doc: jsPDF,
  x: number,
  y: number,
  headers: string[],
  colWidths: number[]
): void {
  let currentX = x;
  
  headers.forEach((header, index) => {
    const width = colWidths[index];
    
    // Determine alignment based on column type
    let align: 'left' | 'center' | 'right' = 'left';
    if (header === 'Blended' || header === 'Year') {
      align = 'center';
    } else if (['P25', 'P50', 'P75', 'P90', '# Orgs', '# Incumbents'].includes(header)) {
      align = 'right';
    }
    
    drawCell(
      doc,
      currentX,
      y,
      width,
      PDF_CONSTANTS.HEADER_HEIGHT,
      header,
      {
        align,
        fillColor: PDF_CONSTANTS.COLORS.HEADER_BG,
        textColor: PDF_CONSTANTS.COLORS.HEADER_TEXT,
        fontSize: PDF_CONSTANTS.FONT_SIZE.HEADER,
        fontStyle: 'bold',
        border: true
      }
    );
    
    currentX += width;
  });
}

/**
 * Draw table data row
 */
function drawTableRow(
  doc: jsPDF,
  x: number,
  y: number,
  rowData: any[],
  headers: string[],
  colWidths: number[],
  rowIndex: number,
  metric: ReportMetric
): void {
  let currentX = x;
  
  // Determine background color (alternating rows)
  const fillColor = rowIndex % 2 === 0 
    ? PDF_CONSTANTS.COLORS.ROW_EVEN 
    : PDF_CONSTANTS.COLORS.ROW_ODD;
  
  rowData.forEach((cell, colIndex) => {
    const width = colWidths[colIndex];
    const header = headers[colIndex];
    const cellText = String(cell || '-');
    
    // Determine alignment based on column type
    let align: 'left' | 'center' | 'right' = 'left';
    if (header === 'Blended' || header === 'Year') {
      align = 'center';
    } else if (['P25', 'P50', 'P75', 'P90', '# Orgs', '# Incumbents'].includes(header)) {
      align = 'right';
    }
    
    drawCell(
      doc,
      currentX,
      y,
      width,
      PDF_CONSTANTS.CELL_HEIGHT,
      cellText,
      {
        align,
        fillColor,
        fontSize: PDF_CONSTANTS.FONT_SIZE.BODY,
        fontStyle: 'normal',
        border: true
      }
    );
    
    currentX += width;
  });
}

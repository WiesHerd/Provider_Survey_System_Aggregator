/**
 * PDF Report Generator Utility
 * 
 * Generates professional multi-page PDF reports for specialty blending results
 * Uses jsPDF for PDF creation and Chart.js for chart rendering
 */

import jsPDF from 'jspdf';
import { ChartConfiguration } from 'chart.js';
import { renderChartToImage } from './chartImageConverter';

/**
 * Interface for report data
 */
export interface BlendedReportData {
  title: string;
  generatedAt: string;
  blendMethod: 'weighted' | 'simple' | 'custom';
  specialties: string[];
  totalRecords: number;
  customWeights?: Array<{
    specialty: string;
    weight: number;
    records: number;
  }>;
  metrics: {
    tcc: { p25: number; p50: number; p75: number; p90: number };
    wrvu: { p25: number; p50: number; p75: number; p90: number };
    cf: { p25: number; p50: number; p75: number; p90: number };
  };
  totalIncumbents?: number;
  confidence?: number;
  effectiveDollarsPerRVU?: { p25: number; p50: number; p75: number; p90: number };
  iqrTcc?: number;
  iqrWrvu?: number;
  iqrCf?: number;
}

/**
 * PDF dimensions (Letter size: 8.5 x 11 inches)
 */
const PDF_WIDTH = 8.5;
const PDF_HEIGHT = 11;
const PDF_MARGIN = 0.5;
const CONTENT_WIDTH = PDF_WIDTH - (PDF_MARGIN * 2);
const CONTENT_HEIGHT = PDF_HEIGHT - (PDF_MARGIN * 2);

/**
 * Grid System and Alignment Constants
 * Microsoft-grade alignment system for consistent positioning
 */
const LABEL_COLUMN_WIDTH = 1.5; // Consistent label width for key-value pairs
const VALUE_COLUMN_START = PDF_MARGIN + LABEL_COLUMN_WIDTH + 0.1; // Start position for values
const VALUE_COLUMN_WIDTH = CONTENT_WIDTH - LABEL_COLUMN_WIDTH - 0.1; // Available width for values

/**
 * Consistent Vertical Spacing System
 */
const SPACING = {
  SECTION: 0.4,        // Between major sections
  SUBSECTION: 0.25,   // Within sections
  LINE: 0.15,          // Between text lines
  TABLE_ROW: 0.18,     // Between table rows
  TABLE_HEADER: 0.12   // After table headers
};

/**
 * Typography Scale
 */
const TYPOGRAPHY = {
  TITLE: 20,
  SECTION_HEADER: 12,
  SUBSECTION_HEADER: 11,
  TABLE_HEADER: 8,
  BODY: 9,
  SMALL: 7,
  TINY: 6.5
};

/**
 * Colors (consistent with design system)
 */
const COLORS = {
  PRIMARY_TEXT: [31, 41, 55],      // #1f2937
  SECONDARY_TEXT: [55, 65, 81],     // #374151
  MUTED_TEXT: [107, 114, 128],      // #6b7280
  BORDER: [209, 213, 219],          // #d1d5db
  LIGHT_BORDER: [243, 244, 246],    // #f3f4f6
  ACCENT: [99, 102, 241],          // #6366f1
  ERROR: [239, 68, 68]             // #ef4444
};

/**
 * Formats a number as currency without dollar sign (per user preference)
 */
const formatCurrency = (value: number, decimals: number = 0): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formats a number with commas
 */
const formatNumber = (value: number, decimals: number = 0): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Helper Functions for Alignment and Layout
 */

/**
 * Calculates equal column widths for tables
 */
const calculateTableColumns = (
  totalWidth: number,
  columnCount: number,
  spacing: number = 0.1
): number[] => {
  const totalSpacing = spacing * (columnCount - 1);
  const availableWidth = totalWidth - totalSpacing;
  const columnWidth = availableWidth / columnCount;
  return Array(columnCount).fill(columnWidth);
};

/**
 * Calculates column positions for tables with custom widths
 */
const calculateColumnPositions = (columnWidths: number[], startX: number, spacing: number = 0.1): number[] => {
  const positions: number[] = [startX];
  let currentX = startX;
  
  for (let i = 0; i < columnWidths.length - 1; i++) {
    currentX += columnWidths[i] + spacing;
    positions.push(currentX);
  }
  
  return positions;
};

/**
 * Renders text with wrapping and returns the final Y position
 */
const renderWrappedText = (
  pdf: jsPDF,
  text: string,
  maxWidth: number,
  x: number,
  y: number,
  options: { fontSize?: number; color?: number[]; font?: 'normal' | 'bold' } = {}
): number => {
  const { fontSize = TYPOGRAPHY.BODY, color = COLORS.MUTED_TEXT, font = 'normal' } = options;
  
  pdf.setFontSize(fontSize);
  pdf.setTextColor(color[0], color[1], color[2]);
  pdf.setFont('helvetica', font);
  
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y);
  
  // Return final Y position accounting for wrapped lines
  const lineHeight = fontSize * 0.012; // Approximate line height in inches
  return y + (lines.length - 1) * lineHeight;
};

/**
 * Professional table rendering utility using jsPDF native methods
 * Enterprise-grade solution for clean, properly formatted tables
 */
interface TableColumn {
  header: string;
  width: number; // in inches
  align: 'left' | 'right' | 'center';
  dataKey?: string;
}

interface TableRow {
  [key: string]: string | number;
}

/**
 * Renders a professional table with borders and proper formatting
 */
const renderProfessionalTable = (
  pdf: jsPDF,
  startY: number,
  columns: TableColumn[],
  rows: TableRow[],
  options: {
    headerBgColor?: number[];
    headerTextColor?: number[];
    borderColor?: number[];
    rowHeight?: number;
    fontSize?: number;
    boldFirstColumn?: boolean;
  } = {}
): number => {
  const {
    headerBgColor = [243, 244, 246],
    headerTextColor = [55, 65, 81],
    borderColor = [209, 213, 219],
    rowHeight = 0.2,
    fontSize = TYPOGRAPHY.TABLE_HEADER,
    boldFirstColumn = true
  } = options;

  let yPos = startY;
  const cellPadding = 0.05;
  const tableStartX = PDF_MARGIN;
  const tableEndX = PDF_WIDTH - PDF_MARGIN;
  
  // Calculate column positions
  let currentX = PDF_MARGIN;
  const columnPositions: number[] = [currentX];
  
  columns.forEach((col, index) => {
    if (index < columns.length - 1) {
      currentX += col.width;
      columnPositions.push(currentX);
    }
  });
  
  // Draw header background
  pdf.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
  pdf.rect(tableStartX, yPos - rowHeight, tableEndX - tableStartX, rowHeight, 'F');
  
  // Draw header text
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  
  let headerX = PDF_MARGIN + cellPadding;
  columns.forEach((col, index) => {
    const textX = col.align === 'right' ? headerX + col.width - cellPadding : headerX;
    pdf.text(col.header, textX, yPos - (rowHeight / 2) + 0.03, { align: col.align });
    headerX += col.width;
  });
  
  // Draw header bottom border
  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setLineWidth(0.01);
  pdf.line(tableStartX, yPos, tableEndX, yPos);
  
  yPos += 0.02; // Small gap after header
  
  // Draw rows - preserve current font settings
  const currentFont = pdf.getFont();
  const currentFontStyle = pdf.getFont().fontName;
  const isBold = currentFontStyle.includes('bold') || currentFontStyle.includes('Bold');
  
  rows.forEach((row, rowIndex) => {
    const rowY = yPos + (rowIndex * rowHeight);
    
    // Draw row data (no background shading for data rows)
    let cellX = PDF_MARGIN + cellPadding;
    columns.forEach((col, colIndex) => {
      // Get cell value - use dataKey if provided, otherwise use column index
      let cellValue = '';
      if (col.dataKey) {
        cellValue = String(row[col.dataKey] || '');
      } else {
        // Use column header as key (lowercase, spaces to underscores)
        const key = col.header.toLowerCase().replace(/\s+/g, '');
        cellValue = String(row[key] || row[Object.keys(row)[colIndex]] || '');
      }
      
      // First column styling - only bold if boldFirstColumn option is true
      if (colIndex === 0 && boldFirstColumn && isBold) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(COLORS.MUTED_TEXT[0], COLORS.MUTED_TEXT[1], COLORS.MUTED_TEXT[2]);
      }
      
      // Calculate text position based on alignment
      const textX = col.align === 'right' ? cellX + col.width - cellPadding : cellX;
      pdf.text(cellValue, textX, rowY + (rowHeight / 2) + 0.03, { align: col.align });
      cellX += col.width;
    });
    
    // Draw row bottom border
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.line(tableStartX, rowY + rowHeight, tableEndX, rowY + rowHeight);
  });
  
  // Draw vertical borders
  columnPositions.forEach((xPos) => {
    pdf.line(xPos, startY - rowHeight, xPos, yPos + (rows.length * rowHeight));
  });
  
  // Draw outer borders
  pdf.setLineWidth(0.015);
  pdf.rect(tableStartX, startY - rowHeight, tableEndX - tableStartX, yPos + (rows.length * rowHeight) - (startY - rowHeight), 'S');
  
  return yPos + (rows.length * rowHeight) + 0.1;
};

/**
 * Creates a Chart.js configuration for a bar chart with data labels above bars
 */
const createBarChartConfig = (
  data: { p25: number; p50: number; p75: number; p90: number },
  title: string,
  color: string,
  yAxisLabel: string,
  formatValue: (value: number) => string,
  formatLabel: (value: number) => string
): ChartConfiguration => {
  const values = [data.p25, data.p50, data.p75, data.p90];
  const maxValue = Math.max(...values);
  const yAxisMax = Math.ceil(maxValue * 1.50); // Increased padding for labels
  
  // Round based on value magnitude
  let yAxisMaxRounded: number;
  if (maxValue > 100000) {
    yAxisMaxRounded = Math.ceil(yAxisMax / 50000) * 50000;
  } else if (maxValue > 1000) {
    yAxisMaxRounded = Math.ceil(yAxisMax / 1000) * 1000;
  } else {
    yAxisMaxRounded = Math.ceil(yAxisMax / 5) * 5;
  }
  
  return {
    type: 'bar',
    data: {
      labels: ['P25', 'P50', 'P75', 'P90'], // Shorter labels for compact layout
      datasets: [{
        label: title,
        data: values,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 0,
        borderRadius: 4,
        barThickness: 35, // Thinner bars for compact layout
        maxBarThickness: 45,
        categoryPercentage: 0.7,
        barPercentage: 0.85,
        // Store formatter in dataset for plugin access (using type assertion for custom property)
        _labelFormatter: formatLabel
      } as any]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0 // Disable animation for faster rendering
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false
        }
      },
      layout: {
        padding: {
          top: 50, // Increased for labels above bars
          bottom: 15,
          left: 10,
          right: 10
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: yAxisMaxRounded,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 8,
              family: 'Inter, sans-serif'
            },
            color: '#6B7280',
            padding: 4,
            callback: function(value) {
              return formatValue(Number(value));
            }
          },
          title: {
            display: true,
            text: yAxisLabel,
            font: {
              size: 9,
              weight: 'bold',
              family: 'Inter, sans-serif'
            },
            color: '#374151',
            padding: { top: 0, bottom: 4 }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 9,
              weight: 'bold',
              family: 'Inter, sans-serif'
            },
            color: '#111827',
            padding: 6
          },
          title: {
            display: true,
            text: 'Percentile',
            font: {
              size: 9,
              weight: 'bold',
              family: 'Inter, sans-serif'
            },
            color: '#374151'
          }
        }
      }
    }
  };
};

/**
 * Loads logo image and converts to data URL for PDF
 */
const loadLogoAsDataURL = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Fetch SVG as text and convert to data URL
    const logoPath = `${process.env.PUBLIC_URL || ''}/benchpoint-icon.svg`;
    
    fetch(logoPath)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch logo');
        return response.text();
      })
      .then(svgText => {
        // Convert SVG to data URL
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 64; // SVG viewBox is 64x64
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataURL = canvas.toDataURL('image/png');
              URL.revokeObjectURL(url); // Clean up
              resolve(dataURL);
            } else {
              URL.revokeObjectURL(url);
              reject(new Error('Could not get canvas context'));
            }
          } catch (error) {
            URL.revokeObjectURL(url);
            reject(error);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load logo image'));
        };
        img.src = url;
      })
      .catch(error => {
        reject(error);
      });
  });
};

/**
 * Adds header page to PDF with all content (single page layout)
 */
const addHeaderPage = async (pdf: jsPDF, data: BlendedReportData): Promise<void> => {
  // Add logo and branding to header (top right)
  try {
    const logoDataURL = await loadLogoAsDataURL();
    const logoWidth = 0.35; // 0.35 inches
    const logoHeight = 0.35; // 0.35 inches
    const logoX = PDF_WIDTH - PDF_MARGIN - 1.2; // Leave space for text
    const logoY = PDF_MARGIN + 0.05;
    pdf.addImage(logoDataURL, 'PNG', logoX, logoY, logoWidth, logoHeight);
    
    // Add BenchPoint text next to logo
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(79, 70, 229); // #4F46E5 (indigo)
    pdf.text('Bench', logoX + logoWidth + 0.05, logoY + 0.12);
    pdf.setTextColor(124, 58, 237); // #7C3AED (purple)
    pdf.text('Point', logoX + logoWidth + 0.05, logoY + 0.25);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    // Continue without logo if it fails to load
  }
  
  // Header with consistent typography
  pdf.setFontSize(TYPOGRAPHY.TITLE);
  pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.title, PDF_MARGIN, PDF_MARGIN + 0.3);
  
  pdf.setFontSize(TYPOGRAPHY.BODY);
  pdf.setTextColor(COLORS.MUTED_TEXT[0], COLORS.MUTED_TEXT[1], COLORS.MUTED_TEXT[2]);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated on ${data.generatedAt}`, PDF_MARGIN, PDF_MARGIN + 0.55);
  
  // Draw separator line
  pdf.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
  pdf.setLineWidth(0.02);
  pdf.line(PDF_MARGIN, PDF_MARGIN + 0.7, PDF_WIDTH - PDF_MARGIN, PDF_MARGIN + 0.7);
  
  let yPos = PDF_MARGIN + 0.95;
  
  // Report Summary section header
  pdf.setFontSize(TYPOGRAPHY.SECTION_HEADER);
  pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Report Summary', PDF_MARGIN, yPos);
  
  yPos += SPACING.SUBSECTION;
  
  // Key-value pairs with consistent alignment
  const methodLabel = data.blendMethod === 'weighted' 
    ? 'Weighted by incumbent count'
    : data.blendMethod === 'simple'
    ? 'Simple average (equal weights)'
    : 'Custom weights applied';
  
  // Blending Method
  pdf.setFontSize(TYPOGRAPHY.BODY);
  pdf.setTextColor(COLORS.SECONDARY_TEXT[0], COLORS.SECONDARY_TEXT[1], COLORS.SECONDARY_TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Blending Method:', PDF_MARGIN, yPos);
  
  const methodFinalY = renderWrappedText(
    pdf,
    methodLabel,
    VALUE_COLUMN_WIDTH,
    VALUE_COLUMN_START,
    yPos,
    { fontSize: TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT, font: 'normal' }
  );
  yPos = Math.max(yPos, methodFinalY) + SPACING.LINE;
  
  // Specialties Included
  pdf.setFontSize(TYPOGRAPHY.BODY);
  pdf.setTextColor(COLORS.SECONDARY_TEXT[0], COLORS.SECONDARY_TEXT[1], COLORS.SECONDARY_TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Specialties Included:', PDF_MARGIN, yPos);
  
  let specialtiesText = data.specialties.length > 5 
    ? `${data.specialties.slice(0, 5).join(', ')}, +${data.specialties.length - 5} more`
    : data.specialties.join(', ');
  
  const specialtiesFinalY = renderWrappedText(
    pdf,
    specialtiesText,
    VALUE_COLUMN_WIDTH,
    VALUE_COLUMN_START,
    yPos,
    { fontSize: TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT, font: 'normal' }
  );
  yPos = Math.max(yPos, specialtiesFinalY) + SPACING.LINE;
  
  // Total Records
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total Records:', PDF_MARGIN, yPos);
  renderWrappedText(
    pdf,
    data.totalRecords.toLocaleString(),
    VALUE_COLUMN_WIDTH,
    VALUE_COLUMN_START,
    yPos,
    { fontSize: TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT, font: 'normal' }
  );
  yPos += SPACING.LINE;
  
  if (typeof data.totalIncumbents === 'number' && data.totalIncumbents > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Incumbents:', PDF_MARGIN, yPos);
    renderWrappedText(
      pdf,
      data.totalIncumbents.toLocaleString(),
      VALUE_COLUMN_WIDTH,
      VALUE_COLUMN_START,
      yPos,
      { fontSize: TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT, font: 'normal' }
    );
    yPos += SPACING.LINE;
  }
  
  if (typeof data.confidence === 'number') {
    const confLabel = data.confidence > 0.7 ? 'High' : data.confidence >= 0.4 ? 'Medium' : 'Low';
    pdf.setFont('helvetica', 'bold');
    pdf.text('Confidence:', PDF_MARGIN, yPos);
    renderWrappedText(
      pdf,
      `${confLabel} (${(data.confidence * 100).toFixed(0)}%)`,
      VALUE_COLUMN_WIDTH,
      VALUE_COLUMN_START,
      yPos,
      { fontSize: TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT, font: 'normal' }
    );
    yPos += SPACING.LINE;
  }
  
  // Custom weights section if applicable
  if (data.customWeights && data.customWeights.length > 0) {
      yPos += SPACING.SECTION;
      
      // Section header
      pdf.setFontSize(TYPOGRAPHY.SUBSECTION_HEADER);
      pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Custom Weight Distribution', PDF_MARGIN, yPos);
      
      yPos += SPACING.SUBSECTION;
      
      // Description text
      const descriptionText = 'The following percentages were applied to each specialty:';
      const descriptionFinalY = renderWrappedText(
        pdf,
        descriptionText,
        CONTENT_WIDTH,
        PDF_MARGIN,
        yPos,
        { fontSize: TYPOGRAPHY.TABLE_HEADER, color: COLORS.MUTED_TEXT, font: 'normal' }
      );
      yPos = Math.max(yPos, descriptionFinalY) + SPACING.LINE + 0.1; // Extra spacing before table
      
      // Ensure normal font before rendering weights table (no bold specialty names)
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(COLORS.MUTED_TEXT[0], COLORS.MUTED_TEXT[1], COLORS.MUTED_TEXT[2]);
      
      // Prepare table data for professional rendering
      // Weight column matches P90 width (1.25 inches) from metrics table below
      const weightsColumns: TableColumn[] = [
        { header: 'Specialty', width: 6.25, align: 'left', dataKey: 'specialty' },
        { header: 'Weight', width: 1.25, align: 'right', dataKey: 'weight' }
      ];
      
      const weightsRows: TableRow[] = data.customWeights.map(item => ({
        specialty: item.specialty,
        weight: `${item.weight.toFixed(1)}%`
      }));
      
      // Render professional table (no bold first column)
      yPos = renderProfessionalTable(
        pdf,
        yPos,
        weightsColumns,
        weightsRows,
        {
          fontSize: TYPOGRAPHY.TABLE_HEADER,
          rowHeight: 0.18,
          boldFirstColumn: false // Don't bold specialty names
        }
      );
      
      yPos += SPACING.SECTION + 0.15; // Extra spacing between custom weights and metrics tables
      
      // Add metrics table right after custom weights section
      const finalY = addMetricsTable(pdf, data, yPos);
      
      // Add charts on the same page after metrics (with extra spacing)
      yPos = finalY + SPACING.SECTION + 0.15; // Extra spacing before charts
      await addChartsToPage(pdf, data, yPos);
    } else {
      // If no custom weights, add metrics table after report summary
      yPos += SPACING.SECTION;
      const finalY = addMetricsTable(pdf, data, yPos);
      
      // Add charts on the same page after metrics (with extra spacing)
      yPos = finalY + SPACING.SECTION + 0.15; // Extra spacing before charts
      await addChartsToPage(pdf, data, yPos);
    }
};

/**
 * Adds metrics table to PDF at specified y position
 * Uses autoTable for proper table rendering with native table structure
 */
const addMetricsTable = (pdf: jsPDF, data: BlendedReportData, startY: number): number => {
  let yPos = startY;
  
  // Section header
  pdf.setFontSize(TYPOGRAPHY.SUBSECTION_HEADER);
  pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Blended Compensation Metrics', PDF_MARGIN, yPos);
  
  yPos += SPACING.SUBSECTION;
  
  // Prepare table data for professional rendering
  // Column widths: 2.5 + 1.25 + 1.25 + 1.25 + 1.25 = 7.5 inches (fits content width)
  const metricsColumns: TableColumn[] = [
    { header: 'Metric', width: 2.5, align: 'left', dataKey: 'metric' },
    { header: 'P25', width: 1.25, align: 'right', dataKey: 'p25' },
    { header: 'P50', width: 1.25, align: 'right', dataKey: 'p50' },
    { header: 'P75', width: 1.25, align: 'right', dataKey: 'p75' },
    { header: 'P90', width: 1.25, align: 'right', dataKey: 'p90' }
  ];
  
  const metricsRows: TableRow[] = [
    {
      metric: 'Total Cash Compensation',
      p25: `$${formatCurrency(data.metrics.tcc.p25)}`,
      p50: `$${formatCurrency(data.metrics.tcc.p50)}`,
      p75: `$${formatCurrency(data.metrics.tcc.p75)}`,
      p90: `$${formatCurrency(data.metrics.tcc.p90)}`
    },
    {
      metric: 'Work RVUs',
      p25: formatNumber(data.metrics.wrvu.p25),
      p50: formatNumber(data.metrics.wrvu.p50),
      p75: formatNumber(data.metrics.wrvu.p75),
      p90: formatNumber(data.metrics.wrvu.p90)
    },
    {
      metric: 'Conversion Factor',
      p25: `$${formatCurrency(data.metrics.cf.p25, 2)}`,
      p50: `$${formatCurrency(data.metrics.cf.p50, 2)}`,
      p75: `$${formatCurrency(data.metrics.cf.p75, 2)}`,
      p90: `$${formatCurrency(data.metrics.cf.p90, 2)}`
    }
  ];

  if (data.effectiveDollarsPerRVU) {
    const e = data.effectiveDollarsPerRVU;
    const fmt = (v: number) => (Number.isNaN(v) || !Number.isFinite(v) ? '—' : `$${formatCurrency(v, 2)}`);
    metricsRows.push({
      metric: 'Effective $/wRVU (TCC ÷ wRVU)',
      p25: fmt(e.p25),
      p50: fmt(e.p50),
      p75: fmt(e.p75),
      p90: fmt(e.p90)
    });
  }

  if (typeof data.iqrTcc === 'number' || typeof data.iqrWrvu === 'number' || typeof data.iqrCf === 'number') {
    metricsRows.push({
      metric: 'IQR (P75 − P25)',
      p25: typeof data.iqrTcc === 'number' ? `$${formatCurrency(data.iqrTcc)}` : '—',
      p50: typeof data.iqrWrvu === 'number' ? formatNumber(data.iqrWrvu) : '—',
      p75: typeof data.iqrCf === 'number' ? `$${formatNumber(data.iqrCf, 2)}` : '—',
      p90: ''
    });
  }
  
  // Render professional table with bold metric names
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
  
  const finalY = renderProfessionalTable(
    pdf,
    yPos,
    metricsColumns,
    metricsRows,
    {
      fontSize: TYPOGRAPHY.TABLE_HEADER,
      rowHeight: 0.18
    }
  );
  
  // Reset font for remaining content
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLORS.MUTED_TEXT[0], COLORS.MUTED_TEXT[1], COLORS.MUTED_TEXT[2]);
  
  return finalY + SPACING.SECTION;
};

/**
 * Adds metrics table page to PDF (deprecated - now added to first page)
 * Kept for backward compatibility but metrics are now added to header page
 */
const addMetricsPage = (pdf: jsPDF, data: BlendedReportData): void => {
  // Metrics table is now added to the first page, so this function is no longer used
  // But kept for now in case we need it later
};

/**
 * Adds charts to the current page (compact version for single-page layout)
 * Uses precise calculations for perfect alignment
 */
const addChartsToPage = async (
  pdf: jsPDF, 
  data: BlendedReportData,
  startY: number
): Promise<void> => {
  // Section header
  pdf.setFontSize(TYPOGRAPHY.SUBSECTION_HEADER);
  pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Visual Analysis', PDF_MARGIN, startY);
  
  // Method description
  const methodTitle = data.blendMethod === 'simple' 
    ? 'Simple Average Analysis'
    : data.blendMethod === 'weighted'
    ? 'Weighted Average Analysis'
    : 'Custom Weight Analysis';
  
  const methodDescription = data.blendMethod === 'simple'
    ? 'Equal weights applied to all specialties'
    : data.blendMethod === 'weighted'
    ? 'Weights based on incumbent count (sample size)'
    : 'Weights defined by user preferences';
  
  pdf.setFontSize(TYPOGRAPHY.TABLE_HEADER);
  pdf.setFont('helvetica', 'bold');
  pdf.text(methodTitle, PDF_MARGIN, startY + 0.2);
  
  pdf.setFontSize(TYPOGRAPHY.SMALL);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLORS.MUTED_TEXT[0], COLORS.MUTED_TEXT[1], COLORS.MUTED_TEXT[2]);
  pdf.text(methodDescription, PDF_MARGIN, startY + 0.32);
  
  // Calculate chart dimensions precisely
  const chartSpacing = 0.1; // Spacing between charts
  const totalSpacing = chartSpacing * 2; // Space between 3 charts (2 gaps)
  const chartWidth = (CONTENT_WIDTH - totalSpacing) / 3;
  const chartHeight = 1.5;
  const chartStartY = startY + 0.65; // Moved charts lower - descriptive text at 0.32, so gap is 0.33 inches
  
  // Calculate precise chart X positions
  const chart1X = PDF_MARGIN;
  const chart2X = PDF_MARGIN + chartWidth + chartSpacing;
  const chart3X = PDF_MARGIN + (chartWidth + chartSpacing) * 2;
  
  // Chart center positions for titles
  const chart1Center = chart1X + chartWidth / 2;
  const chart2Center = chart2X + chartWidth / 2;
  const chart3Center = chart3X + chartWidth / 2;
  
  // Add chart titles above each chart (moved down to avoid header overlap)
  pdf.setFontSize(TYPOGRAPHY.TABLE_HEADER);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
  pdf.text('TCC', chart1Center, chartStartY - 0.02, { align: 'center' });
  pdf.text('wRVU', chart2Center, chartStartY - 0.02, { align: 'center' });
  pdf.text('CF', chart3Center, chartStartY - 0.02, { align: 'center' });
  
  // Generate chart images - compact titles with formatted labels
  const tccChartConfig = createBarChartConfig(
    data.metrics.tcc,
    'TCC',
    '#1E3A8A',
    'TCC ($)',
    (v) => '$' + formatCurrency(v / 1000) + 'K', // Y-axis format
    (v) => '$' + Math.round(v / 1000) + 'K' // Label format (above bar)
  );
  
  const wrvuChartConfig = createBarChartConfig(
    data.metrics.wrvu,
    'wRVU',
    '#0D9488',
    'wRVU',
    (v) => formatNumber(v), // Y-axis format
    (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0) // Label format (above bar)
  );
  
  const cfChartConfig = createBarChartConfig(
    data.metrics.cf,
    'CF',
    '#C2410C',
    'CF ($)',
    (v) => '$' + formatCurrency(v, 2), // Y-axis format
    (v) => '$' + v.toFixed(2) // Label format (above bar)
  );
  
  // Render charts to images
  const chartWidthPx = Math.round(chartWidth * 96); // Convert inches to pixels (96 DPI)
  const chartHeightPx = Math.round(chartHeight * 96);
  
  try {
    console.log('🔍 Starting chart image generation...');
    
    // Generate charts sequentially to avoid memory issues and better error handling
    let tccImage: string | null = null;
    let wrvuImage: string | null = null;
    let cfImage: string | null = null;
    
    try {
      console.log('🔍 Generating TCC chart...');
      tccImage = await renderChartToImage(tccChartConfig, chartWidthPx, chartHeightPx);
      console.log('✅ TCC chart generated');
    } catch (error) {
      console.error('❌ Error generating TCC chart:', error);
    }
    
    try {
      console.log('🔍 Generating wRVU chart...');
      wrvuImage = await renderChartToImage(wrvuChartConfig, chartWidthPx, chartHeightPx);
      console.log('✅ wRVU chart generated');
    } catch (error) {
      console.error('❌ Error generating wRVU chart:', error);
    }
    
    try {
      console.log('🔍 Generating CF chart...');
      cfImage = await renderChartToImage(cfChartConfig, chartWidthPx, chartHeightPx);
      console.log('✅ CF chart generated');
    } catch (error) {
      console.error('❌ Error generating CF chart:', error);
    }
    
    // Add charts to PDF with precise positioning
    if (tccImage) {
      pdf.addImage(tccImage, 'PNG', chart1X, chartStartY, chartWidth, chartHeight);
      console.log('✅ TCC chart added to PDF');
    } else {
      console.warn('⚠️ TCC chart image is missing');
    }
    
    if (wrvuImage) {
      pdf.addImage(wrvuImage, 'PNG', chart2X, chartStartY, chartWidth, chartHeight);
      console.log('✅ wRVU chart added to PDF');
    } else {
      console.warn('⚠️ wRVU chart image is missing');
    }
    
    if (cfImage) {
      pdf.addImage(cfImage, 'PNG', chart3X, chartStartY, chartWidth, chartHeight);
      console.log('✅ CF chart added to PDF');
    } else {
      console.warn('⚠️ CF chart image is missing');
    }
    
    // Add insights box - very compact
    const insightsY = chartStartY + chartHeight + SPACING.LINE;
    const insightsMaxWidth = CONTENT_WIDTH;
    
    // Check if we have room for insights
    if (insightsY < PDF_HEIGHT - PDF_MARGIN - 0.3) {
      pdf.setFontSize(TYPOGRAPHY.SMALL);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(COLORS.PRIMARY_TEXT[0], COLORS.PRIMARY_TEXT[1], COLORS.PRIMARY_TEXT[2]);
      pdf.text('Analysis Insights', PDF_MARGIN, insightsY);
      
      pdf.setFontSize(TYPOGRAPHY.TINY);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(COLORS.MUTED_TEXT[0], COLORS.MUTED_TEXT[1], COLORS.MUTED_TEXT[2]);
      const insightsText = 'Each chart shows percentile distribution (P25, P50, P75, P90). TCC = total cash compensation. Work RVU = work relative value units. CF = dollars per work RVU.';
      const insightsLines = pdf.splitTextToSize(insightsText, insightsMaxWidth);
      pdf.text(insightsLines, PDF_MARGIN, insightsY + 0.12);
    }
    
    // If no charts were generated, show a message
    if (!tccImage && !wrvuImage && !cfImage) {
      pdf.setFontSize(TYPOGRAPHY.BODY);
      pdf.setTextColor(COLORS.ERROR[0], COLORS.ERROR[1], COLORS.ERROR[2]);
      pdf.text('Charts could not be generated. Please check the browser console for errors.', PDF_MARGIN, chartStartY);
    }
    
  } catch (error) {
    console.error('❌ Error generating chart images:', error);
    // Add error message
    pdf.setFontSize(TYPOGRAPHY.BODY);
    pdf.setTextColor(COLORS.ERROR[0], COLORS.ERROR[1], COLORS.ERROR[2]);
    pdf.text(`Error generating charts: ${error instanceof Error ? error.message : 'Unknown error'}`, PDF_MARGIN, chartStartY);
    pdf.text('Please check the browser console for more details.', PDF_MARGIN, chartStartY + 0.2);
  }
};

/**
 * Generates a complete PDF report from blended metrics data
 * 
 * @param data - The report data to include
 * @param filename - Optional filename for the PDF (default: 'Blended-Compensation-Report.pdf')
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export const generateBlendedReportPDF = async (
  data: BlendedReportData,
  filename: string = 'Blended-Compensation-Report.pdf'
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🔍 Starting PDF generation...');
      console.log('🔍 Report data:', data);
      
      // Create new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });
      
      console.log('✅ PDF document created');
      
      // Add everything to single page
      console.log('🔍 Adding all content to single page...');
      await addHeaderPage(pdf, data);
      console.log('✅ Single-page report generated');
      
      // Add footer with timestamp on last page
      const pageCount = pdf.getNumberOfPages();
      pdf.setPage(pageCount);
      pdf.setFontSize(TYPOGRAPHY.TABLE_HEADER);
      pdf.setTextColor(COLORS.MUTED_TEXT[0], COLORS.MUTED_TEXT[1], COLORS.MUTED_TEXT[2]);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Created: ${data.generatedAt}`,
        PDF_WIDTH / 2,
        PDF_HEIGHT - PDF_MARGIN + 0.2,
        { align: 'center' }
      );
      
      console.log('🔍 Saving PDF...');
      // Save PDF
      pdf.save(filename);
      console.log('✅ PDF saved successfully:', filename);
      resolve();
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      reject(error);
    }
  });
};


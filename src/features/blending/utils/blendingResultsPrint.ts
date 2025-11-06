/**
 * HTML Report Generation for Blending Results Print
 * 
 * Generates a beautiful HTML document with charts and formatting
 * for printing blending results, similar to generateBlendedReportHTML
 */

import { BlendedResult } from '../types/blending';
import { generatePieChartHTML, generateBarChartHTML, WeightDistributionData, CompensationRangeData } from './chartGenerators';

/**
 * Generates a complete HTML document for printing blending results
 * 
 * @param result - The BlendedResult to generate HTML for
 * @returns Complete HTML document string
 */
export const generateBlendingResultsHTML = (result: BlendedResult): string => {
  const reportData = {
    title: 'Specialty Blending Results',
    blendName: result.blendName || 'Untitled Blend',
    generatedAt: new Date(result.createdAt).toLocaleString(),
    blendMethod: result.blendingMethod,
    specialties: result.specialties || [],
    sampleSize: result.sampleSize || 0,
    confidence: result.confidence || 0,
    metrics: {
      tcc: {
        p25: result.blendedData.tcc_p25,
        p50: result.blendedData.tcc_p50,
        p75: result.blendedData.tcc_p75,
        p90: result.blendedData.tcc_p90
      },
      wrvu: {
        p25: result.blendedData.wrvu_p25,
        p50: result.blendedData.wrvu_p50,
        p75: result.blendedData.wrvu_p75,
        p90: result.blendedData.wrvu_p90
      },
      cf: {
        p25: result.blendedData.cf_p25,
        p50: result.blendedData.cf_p50,
        p75: result.blendedData.cf_p75,
        p90: result.blendedData.cf_p90
      }
    }
  };

  // Prepare weight distribution data for pie chart (for weighted and custom methods)
  let weightDistributionData: WeightDistributionData[] = [];
  if (result.blendingMethod === 'weighted' || result.blendingMethod === 'custom') {
    weightDistributionData = result.specialties.map(specialty => ({
      specialty: specialty.name,
      weight: specialty.weight,
      records: specialty.records
    }));
  }

  // Prepare compensation range data for bar chart
  const compensationRangeData: CompensationRangeData = {
    tcc: {
      p25: result.blendedData.tcc_p25,
      p50: result.blendedData.tcc_p50,
      p75: result.blendedData.tcc_p75,
      p90: result.blendedData.tcc_p90
    },
    wrvu: {
      p25: result.blendedData.wrvu_p25,
      p50: result.blendedData.wrvu_p50,
      p75: result.blendedData.wrvu_p75,
      p90: result.blendedData.wrvu_p90
    },
    cf: {
      p25: result.blendedData.cf_p25,
      p50: result.blendedData.cf_p50,
      p75: result.blendedData.cf_p75,
      p90: result.blendedData.cf_p90
    }
  };

  // Generate HTML charts
  const weightChartHTML = (result.blendingMethod === 'weighted' || result.blendingMethod === 'custom') && weightDistributionData.length > 0
    ? generatePieChartHTML(
        weightDistributionData,
        result.blendingMethod === 'weighted' 
          ? 'Weight Distribution (by Incumbent Count)'
          : 'Custom Weight Distribution',
        400,
        350
      )
    : '';

  const compensationChartHTML = generateBarChartHTML(
    compensationRangeData,
    'Compensation Range Analysis',
    600,
    400
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportData.title}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        * {
          font-family: inherit;
        }
        
        @media print {
          body { margin: 0; padding: 0.25in; }
          .no-print { display: none; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          .footer { page-break-inside: avoid; }
          @page {
            margin: 0.25in;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-center { content: ""; }
            @bottom-right { content: ""; }
          }
        }
        
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 20px; 
          line-height: 1.5; 
          color: #333; 
          background: white;
        }
        .header { 
          border-bottom: 2px solid #6366f1; 
          padding-bottom: 15px; 
          margin-bottom: 20px; 
          margin-top: 0;
        }
        .title { 
          font-size: 28px; 
          font-weight: bold; 
          color: #1f2937; 
          margin: 0; 
        }
        .subtitle { 
          font-size: 16px; 
          color: #6b7280; 
          margin: 8px 0 0 0; 
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin: 20px 0; 
        }
        .info-item { 
          background: #f9fafb; 
          padding: 15px; 
          border-radius: 8px; 
          border: 1px solid #e5e7eb;
        }
        .info-label { 
          font-weight: 600; 
          color: #374151; 
          margin-bottom: 5px; 
        }
        .info-value { 
          color: #6b7280; 
        }
        .metrics-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          page-break-inside: avoid;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
        }
        .metrics-table th { 
          background: #f3f4f6; 
          padding: 8px; 
          text-align: left; 
          font-weight: 600; 
          color: #374151; 
          border: 1px solid #d1d5db; 
        }
        .metrics-table td { 
          padding: 8px; 
          border: 1px solid #d1d5db; 
        }
        .metrics-table tr:nth-child(even) { 
          background: #f9fafb; 
        }
        .metric-name { 
          font-weight: 600; 
        }
        .percentile-value { 
          text-align: right; 
          font-family: 'SF Mono', Monaco, monospace; 
        }
        .p50 { 
          font-weight: bold; 
          background: #fef3c7; 
        }
        .footer { 
          margin-top: 20px; 
          padding-top: 15px; 
          border-top: 1px solid #e5e7eb; 
          color: #6b7280; 
          font-size: 12px; 
          page-break-inside: avoid;
        }
        .chart-section { 
          margin: 30px 0; 
          page-break-inside: avoid;
        }
        .chart-container { 
          display: flex; 
          justify-content: center; 
          align-items: center;
          margin: 20px 0; 
          background: #f9fafb; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          padding: 20px;
          height: 320px;
          box-sizing: border-box;
          overflow: hidden;
        }
        .chart-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .chart-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 30px; 
          margin: 20px 0;
          align-items: start;
        }
        .chart-single { 
          display: flex; 
          justify-content: center; 
          margin: 20px 0;
        }
        .chart-title { 
          font-size: 18px; 
          font-weight: 600; 
          color: #1f2937; 
          margin-bottom: 15px; 
          text-align: center;
        }
        .chart-placeholder { 
          text-align: center; 
          color: #6b7280; 
          font-style: italic; 
          padding: 40px;
        }
        .specialties-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          page-break-inside: avoid;
        }
        .specialties-table th {
          background: #f3f4f6;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        .specialties-table td {
          padding: 10px;
          border: 1px solid #d1d5db;
        }
        .specialties-table tr:nth-child(even) {
          background: #f9fafb;
        }
        @media print {
          .chart-container { 
            background: white; 
            border: 1px solid #d1d5db;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${reportData.title}</h1>
        <p class="subtitle">${reportData.blendName} - Generated on ${reportData.generatedAt}</p>
      </div>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Blending Method</div>
          <div class="info-value">${
            reportData.blendMethod === 'weighted' 
              ? 'Weighted by incumbent count' 
              : reportData.blendMethod === 'simple' 
              ? 'Simple average (equal weights)' 
              : 'Custom weights applied'
          }</div>
        </div>
        <div class="info-item">
          <div class="info-label">Specialties Included</div>
          <div class="info-value">${reportData.specialties.length} specialty${reportData.specialties.length !== 1 ? 'ies' : ''}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Sample Size</div>
          <div class="info-value">${reportData.sampleSize.toLocaleString()} records</div>
        </div>
        <div class="info-item">
          <div class="info-label">Confidence</div>
          <div class="info-value">${(reportData.confidence * 100).toFixed(1)}%</div>
        </div>
      </div>
      
      <!-- Charts Section -->
      <div class="chart-section">
        ${weightChartHTML && compensationChartHTML ? `
          <div class="chart-grid">
            <div class="chart-container">
              ${weightChartHTML}
            </div>
            <div class="chart-container">
              ${compensationChartHTML}
            </div>
          </div>
        ` : compensationChartHTML ? `
          <div class="chart-single">
            <div class="chart-container">
              ${compensationChartHTML}
            </div>
          </div>
        ` : weightChartHTML ? `
          <div class="chart-grid">
            <div class="chart-container">
              ${weightChartHTML}
            </div>
          </div>
        ` : ''}
        
        <!-- Chart Explanation -->
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #0c4a6e;">
          <strong>📊 Chart Note:</strong> The primary chart shows Total Cash Compensation (TCC) across all percentiles with actual dollar values. Work RVU and Conversion Factor medians are displayed as compact indicators below for reference.
        </div>
      </div>
      
      <!-- Blended Metrics Table -->
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>P25</th>
            <th>P50 (Median)</th>
            <th>P75</th>
            <th>P90</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="metric-name">Total Cash Compensation</td>
            <td class="percentile-value">$${reportData.metrics.tcc.p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="percentile-value p50">$${reportData.metrics.tcc.p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="percentile-value">$${reportData.metrics.tcc.p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="percentile-value">$${reportData.metrics.tcc.p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td class="metric-name">Work RVUs</td>
            <td class="percentile-value">${reportData.metrics.wrvu.p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="percentile-value p50">${reportData.metrics.wrvu.p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="percentile-value">${reportData.metrics.wrvu.p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="percentile-value">${reportData.metrics.wrvu.p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td class="metric-name">Conversion Factor</td>
            <td class="percentile-value">$${reportData.metrics.cf.p25.toFixed(2)}</td>
            <td class="percentile-value p50">$${reportData.metrics.cf.p50.toFixed(2)}</td>
            <td class="percentile-value">$${reportData.metrics.cf.p75.toFixed(2)}</td>
            <td class="percentile-value">$${reportData.metrics.cf.p90.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      <!-- Specialties Used Table -->
      ${reportData.specialties.length > 0 ? `
        <h3 style="color: #374151; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">Specialties Used</h3>
        <table class="specialties-table">
          <thead>
            <tr>
              <th>Specialty Name</th>
              <th>Survey Source</th>
              <th>Survey Year</th>
              <th>Geographic Region</th>
              <th>Provider Type</th>
              <th style="text-align: right;">Weight (%)</th>
              <th style="text-align: right;">Records</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.specialties.map(specialty => `
              <tr>
                <td>${specialty.name}</td>
                <td>${specialty.surveySource}</td>
                <td>${specialty.surveyYear}</td>
                <td>${specialty.geographicRegion}</td>
                <td>${specialty.providerType}</td>
                <td style="text-align: right; font-weight: 600;">${specialty.weight.toFixed(2)}%</td>
                <td style="text-align: right;">${specialty.records.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr style="background: #f3f4f6; font-weight: 600;">
              <td colspan="5">Total</td>
              <td style="text-align: right;">${reportData.specialties.reduce((sum, s) => sum + s.weight, 0).toFixed(2)}%</td>
              <td style="text-align: right;">${reportData.specialties.reduce((sum, s) => sum + s.records, 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      ` : ''}
      
      <div class="footer">
        <p>This report was generated by the Survey Aggregator system. The data represents blended compensation metrics based on the selected specialties and blending method.</p>
        ${result.blendingMethod === 'custom' && result.customWeights ? `
        <p><strong>Custom Blending Methodology:</strong> This report used custom weight percentages for each specialty as shown in the Specialties Used table above. These weights were applied to calculate the blended percentiles shown in the compensation metrics.</p>
        ` : ''}
        <p><strong>Note:</strong> P50 values represent the median (50th percentile) and are highlighted for emphasis.</p>
        <p><strong>Transparency:</strong> ${reportData.blendMethod === 'custom' ? 'Custom weights are disclosed above for full transparency and reproducibility.' : 'Blending methodology is clearly indicated in the report header.'}</p>
      </div>
    </body>
    </html>
  `;
};


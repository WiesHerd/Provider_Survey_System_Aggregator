/**
 * HTML Report Generation for Blending Results Print
 * 
 * Generates a beautiful HTML document matching the exact layout of BlendingResults screen
 * for printing blending results with proper charts and formatting
 */

import { BlendedResult } from '../types/blending';
import { generateTCCChartHTML, generateWRVUChartHTML, generateCFChartHTML } from './chartGenerators';

/**
 * Generates a complete HTML document for printing blending results
 * Matches the exact layout structure of BlendingResults screen
 * 
 * @param result - The BlendedResult to generate HTML for
 * @returns Complete HTML document string
 */
export const generateBlendingResultsHTML = (result: BlendedResult): string => {
  const reportData = {
    title: 'Blending Results',
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

  // Generate three separate charts - very compact to fit all on one page
  const tccChartHTML = generateTCCChartHTML(
    reportData.metrics.tcc,
    'Total Cash Compensation (TCC)',
    600,
    180
  );

  const wrvuChartHTML = generateWRVUChartHTML(
    reportData.metrics.wrvu,
    'Work RVU (wRVU)',
    600,
    180
  );

  const cfChartHTML = generateCFChartHTML(
    reportData.metrics.cf,
    'Conversion Factor (CF)',
    600,
    180
  );

  // Method-specific title and description
  const methodTitle = result.blendingMethod === 'simple' 
    ? 'Simple Average Analysis'
    : result.blendingMethod === 'weighted'
    ? 'Weighted Average Analysis'
    : 'Custom Weight Analysis';
  
  const methodDescription = result.blendingMethod === 'simple'
    ? 'Equal weights applied to all specialties'
    : result.blendingMethod === 'weighted'
    ? 'Weights based on incumbent count (sample size)'
    : 'Weights defined by user preferences';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportData.title}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 24px;
          line-height: 1.5;
          color: #111827;
          background: #f9fafb;
        }
        
        .space-y-6 > * + * {
          margin-top: 24px;
        }
        
        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          padding: 24px;
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        
        .charts-section.card {
          padding: 16px;
        }
        
        .header-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .header-title {
          font-size: 24px;
          font-weight: bold;
          color: #111827;
          margin: 0;
        }
        
        .header-subtitle {
          color: #6b7280;
          margin-top: 4px;
          font-size: 14px;
        }
        
        .blend-summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        
        .blend-summary-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        
        .stats-container {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        
        .stat-item {
          text-align: center;
          font-size: 14px;
        }
        
        .stat-value {
          font-size: 20px;
          font-weight: bold;
        }
        
        .stat-value.blue {
          color: #2563eb;
        }
        
        .stat-value.green {
          color: #16a34a;
        }
        
        .stat-value.purple {
          color: #9333ea;
        }
        
        .stat-label {
          font-size: 12px;
          color: #6b7280;
        }
        
        .specialties-section {
          border-top: 1px solid #e5e7eb;
          padding-top: 24px;
        }
        
        .specialties-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }
        
        .specialties-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .specialty-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        .specialty-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .specialty-badge {
          width: 28px;
          height: 28px;
          background: #dbeafe;
          color: #2563eb;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        .specialty-name {
          font-weight: 500;
          color: #111827;
          font-size: 14px;
        }
        
        .specialty-meta {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }
        
        .specialty-right {
          text-align: right;
          flex-shrink: 0;
        }
        
        .specialty-weight {
          font-weight: 500;
          color: #111827;
          font-size: 14px;
        }
        
        .specialty-records {
          font-size: 12px;
          color: #6b7280;
        }
        
        .metrics-section-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 24px;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .metrics-column {
          padding: 16px;
        }
        
        .metrics-column:not(:last-child) {
          border-right: 1px solid #e5e7eb;
        }
        
        .metrics-column-title {
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        
        .metrics-list {
          display: flex;
          flex-direction: column;
        }
        
        .metric-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
        }
        
        .metric-row:not(:last-child) {
          border-bottom: 1px solid #f3f4f6;
        }
        
        .metric-label {
          font-size: 14px;
          color: #6b7280;
        }
        
        .metric-value {
          font-weight: 500;
          color: #111827;
          font-size: 14px;
        }
        
        .charts-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
        }
        
        .charts-method-title {
          text-align: center;
          margin-bottom: 6px;
        }
        
        .charts-method-title h3 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px 0;
        }
        
        .charts-method-description {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          margin: 20px 0;
        }
        
        .chart-column {
          width: 100%;
          min-width: 0;
        }
        
        @media print {
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 40px;
            margin: 40px 0;
          }
          
          .chart-column {
            width: 100%;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        
        .insights-box {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          margin-top: 24px;
        }
        
        .insights-title {
          font-weight: 500;
          color: #111827;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .insights-list {
          font-size: 12px;
          color: #6b7280;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .timestamp {
          font-size: 14px;
          color: #6b7280;
        }
        
        .print-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .charts-section {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        .charts-container {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0.4in;
            background: white;
          }
          
          .card {
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: none;
            border: 1px solid #d1d5db;
            margin-bottom: 12px;
          }
          
          .space-y-6 > * + * {
            margin-top: 12px !important;
          }
          
          .print-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            orphans: 3;
            widows: 3;
          }
          
          .charts-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto;
          }
          
          .charts-section.card {
            padding: 12px !important;
            max-height: 10in;
            overflow: visible;
          }
          
          .charts-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex;
            flex-direction: column;
            gap: 12px !important;
            margin: 12px 0 !important;
          }
          
          .chart-column {
            width: 100%;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-bottom: 0 !important;
            min-height: 180px;
            max-height: 200px;
            height: auto;
          }
          
          .chart-column:not(:last-child) {
            page-break-after: avoid !important;
            break-after: avoid !important;
            margin-bottom: 0 !important;
          }
          
          .charts-method-title {
            margin-bottom: 4px !important;
          }
          
          .charts-method-title h3 {
            font-size: 14px !important;
            margin: 0 0 2px 0 !important;
          }
          
          .charts-method-description {
            font-size: 11px !important;
          }
          
          .charts-section-title {
            font-size: 14px !important;
            margin-bottom: 8px !important;
          }
          
          .insights-box {
            margin-top: 12px !important;
            padding: 12px !important;
          }
          
          .insights-title {
            font-size: 12px !important;
            margin-bottom: 6px !important;
          }
          
          .insights-list {
            font-size: 11px !important;
            gap: 2px !important;
          }
          
          .timestamp {
            margin-top: 12px !important;
            padding-top: 8px !important;
            font-size: 11px !important;
          }
          
          .metrics-grid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .insights-box {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          @page {
            margin: 0.5in;
            size: letter;
          }
        }
      </style>
    </head>
    <body>
      <div class="space-y-6">
        <!-- Blend Summary Section -->
        <div class="card print-section">
          <div class="blend-summary-header">
            <h2 class="blend-summary-title">Blend Summary</h2>
            <div class="stats-container">
              <div class="stat-item">
                <div class="stat-value blue">${reportData.specialties.length}</div>
                <div class="stat-label">Specialties</div>
              </div>
              <div class="stat-item">
                <div class="stat-value green">${reportData.sampleSize.toLocaleString()}</div>
                <div class="stat-label">Sample Size</div>
              </div>
              <div class="stat-item">
                <div class="stat-value purple">${(reportData.confidence * 100).toFixed(1)}%</div>
                <div class="stat-label">Confidence</div>
              </div>
            </div>
          </div>
          
          <div class="specialties-section">
            <h3 class="specialties-title">Specialties Used</h3>
            <div class="specialties-list">
              ${reportData.specialties.map((specialty, index) => `
                <div class="specialty-item">
                  <div class="specialty-item-left">
                    <div class="specialty-badge">${index + 1}</div>
                    <div>
                      <div class="specialty-name">${specialty.name}</div>
                      <div class="specialty-meta">${specialty.surveySource} • ${specialty.surveyYear} • ${specialty.geographicRegion}</div>
                    </div>
                  </div>
                  <div class="specialty-right">
                    <div class="specialty-weight">${specialty.weight.toFixed(2)}%</div>
                    <div class="specialty-records">${specialty.records.toLocaleString()} records</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <!-- Blended Compensation Metrics Section -->
        <div class="card print-section">
          <h2 class="metrics-section-title">Blended Compensation Metrics</h2>
          <div class="metrics-grid">
            <!-- TCC Column -->
            <div class="metrics-column">
              <h3 class="metrics-column-title">Total Cash Compensation (TCC)</h3>
              <div class="metrics-list">
                <div class="metric-row">
                  <span class="metric-label">25th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.tcc.p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">50th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.tcc.p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">75th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.tcc.p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">90th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.tcc.p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            
            <!-- wRVU Column -->
            <div class="metrics-column">
              <h3 class="metrics-column-title">Work RVUs (wRVU)</h3>
              <div class="metrics-list">
                <div class="metric-row">
                  <span class="metric-label">25th Percentile:</span>
                  <span class="metric-value">${reportData.metrics.wrvu.p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">50th Percentile:</span>
                  <span class="metric-value">${reportData.metrics.wrvu.p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">75th Percentile:</span>
                  <span class="metric-value">${reportData.metrics.wrvu.p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">90th Percentile:</span>
                  <span class="metric-value">${reportData.metrics.wrvu.p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            
            <!-- CF Column -->
            <div class="metrics-column">
              <h3 class="metrics-column-title">Collection Factor (CF)</h3>
              <div class="metrics-list">
                <div class="metric-row">
                  <span class="metric-label">25th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.cf.p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">50th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.cf.p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">75th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.cf.p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">90th Percentile:</span>
                  <span class="metric-value">$${reportData.metrics.cf.p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Visual Analysis Section - Keep charts together -->
        <div class="card charts-section print-section">
          <h2 class="charts-section-title">Visual Analysis</h2>
          
          <!-- Method-specific title and description -->
          <div class="charts-method-title">
            <h3>${methodTitle}</h3>
            <p class="charts-method-description">${methodDescription}</p>
          </div>
          
          <!-- Three separate charts in grid - keep together -->
          <div class="charts-grid charts-container">
            <div class="chart-column">
              ${tccChartHTML}
            </div>
            <div class="chart-column">
              ${wrvuChartHTML}
            </div>
            <div class="chart-column">
              ${cfChartHTML}
            </div>
          </div>
          
          <!-- Analysis Insights -->
          <div class="insights-box">
            <h4 class="insights-title">Analysis Insights</h4>
            <div class="insights-list">
              <p>• Each chart shows the percentile distribution (P25, P50, P75, P90) for its respective metric</p>
              <p>• TCC represents total cash compensation in dollars</p>
              <p>• Work RVU represents work relative value units</p>
              <p>• Conversion Factor (CF) represents dollars per work RVU</p>
            </div>
          </div>
          
          <!-- Timestamp at bottom of charts section -->
          <div class="timestamp" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            Created: ${reportData.generatedAt}
          </div>
        </div>
      </div>
      
      <script>
        // Ensure all charts are rendered before print
        (function() {
          let retryCount = 0;
          const maxRetries = 100; // Max 20 seconds (100 * 200ms)
          const totalCharts = 3; // TCC, wRVU, CF
          
          function checkChartsReady() {
            const canvases = document.querySelectorAll('canvas');
            const chartsWithData = Array.from(canvases).filter(canvas => {
              const ctx = canvas.getContext('2d');
              if (!ctx) return false;
              try {
                const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
                const pixels = imageData.data;
                // Check if canvas has any non-white pixels
                for (let i = 0; i < pixels.length; i += 4) {
                  if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) {
                    return true;
                  }
                }
              } catch (e) {
                // Canvas might not be ready yet
                return false;
              }
              return false;
            });
            
            return chartsWithData.length >= totalCharts;
          }
          
          // Wait for Chart.js to load and charts to render
          function waitForCharts() {
            retryCount++;
            
            // Prevent infinite loops
            if (retryCount > maxRetries) {
              console.warn('Charts may not have fully rendered, but proceeding anyway');
              return;
            }
            
            if (typeof Chart !== 'undefined' && checkChartsReady()) {
              // Charts are ready
              return;
            }
            setTimeout(waitForCharts, 200);
          }
          
          if (document.readyState === 'loading') {
            window.addEventListener('load', function() {
              setTimeout(waitForCharts, 1000);
            });
          } else {
            setTimeout(waitForCharts, 1000);
          }
        })();
      </script>
    </body>
    </html>
  `;
};

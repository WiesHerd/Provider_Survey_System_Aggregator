/**
 * Chart Generation Utilities
 * 
 * Generates HTML/Chart.js charts for HTML reports
 * Much simpler and more reliable than SVG implementation
 */

/**
 * Weight distribution data for pie charts
 */
export interface WeightDistributionData {
  specialty: string;
  weight: number;
  records: number;
}

/**
 * Compensation range data for bar charts
 */
export interface CompensationRangeData {
  tcc: { p25: number; p50: number; p75: number; p90: number };
  wrvu: { p25: number; p50: number; p75: number; p90: number };
  cf: { p25: number; p50: number; p75: number; p90: number };
}

/**
 * Generates a Chart.js pie chart for weight distribution
 * 
 * @param data - Array of weight distribution data
 * @param title - Chart title
 * @param width - Chart width (default: 400)
 * @param height - Chart height (default: 350)
 * @returns HTML string with Chart.js
 */
export const generatePieChartHTML = (
  data: WeightDistributionData[],
  title: string = "Weight Distribution",
  width: number = 400,
  height: number = 350
): string => {
  if (data.length === 0) {
    return `<div class="chart-placeholder">No data available for weight distribution</div>`;
  }

  const chartId = `pie-chart-${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate total weight for percentage calculations
  const totalWeight = data.reduce((sum, item) => sum + item.weight, 0);
  
  // Colors for the pie chart segments
  const colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ];

  return `
    <style>
      @media print {
        .pie-chart-print {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .pie-svg-print {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .legend-item-print {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style>
    <div style="width: 100%; height: 100%; padding: 15px; box-sizing: border-box;" class="pie-chart-print">
      <div id="${chartId}" style="width: 100%; height: 100%;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: bold; color: #1f2937; margin: 0;">
            ${title}
          </h3>
        </div>
        
        <!-- Pie Chart Visualization -->
        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
          <div style="position: relative; width: 200px; height: 200px;">
            <svg width="200" height="200" style="transform: rotate(-90deg);" class="pie-svg-print">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" stroke-width="20"/>
              ${data.map((item, index) => {
                const percentage = (item.weight / totalWeight) * 100;
                const circumference = 2 * Math.PI * 80;
                const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = index === 0 ? 0 : data.slice(0, index).reduce((sum, prevItem) => {
                  const prevPercentage = (prevItem.weight / totalWeight) * 100;
                  return sum - (prevPercentage / 100) * circumference;
                }, 0);
                
                return `
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="80" 
                    fill="none" 
                    stroke="${colors[index % colors.length]}" 
                    stroke-width="20"
                    stroke-dasharray="${strokeDasharray}"
                    stroke-dashoffset="${strokeDashoffset}"
                    stroke-linecap="round"
                  />
                `;
              }).join('')}
            </svg>
            
            <!-- Center text -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
              <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: bold; color: #1f2937;">
                Total
              </div>
              <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #6b7280;">
                ${totalWeight.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        
        <!-- Legend -->
        <div style="display: flex; flex-direction: column; gap: 8px; max-width: 300px; margin: 0 auto;">
          ${data.map((item, index) => {
            const percentage = ((item.weight / totalWeight) * 100).toFixed(1);
            return `
              <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f9fafb; border-radius: 6px; border-left: 4px solid ${colors[index % colors.length]}; border: 1px solid #e5e7eb;" class="legend-item-print">
                <div style="width: 12px; height: 12px; background: ${colors[index % colors.length]}; border-radius: 50%; flex-shrink: 0; border: 1px solid #d1d5db;"></div>
                <div style="flex: 1; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #374151;">
                  ${item.specialty}
                </div>
                <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; font-weight: 600; color: #1f2937;">
                  ${percentage}%
                </div>
                <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #6b7280;">
                  (${item.records} records)
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
};

/**
 * Generates a TCC (Total Cash Compensation) Chart.js bar chart
 * 
 * @param data - TCC data with p25, p50, p75, p90
 * @param title - Chart title
 * @param width - Chart width (default: 400)
 * @param height - Chart height (default: 300)
 * @returns HTML string with Chart.js
 */
export const generateTCCChartHTML = (
  data: { p25: number; p50: number; p75: number; p90: number },
  title: string = "Total Cash Compensation (TCC)",
  width: number = 400,
  height: number = 300
): string => {
  const chartId = `tcc-chart-${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate max value for y-axis with 30% padding to prevent label clipping
  const values = [data.p25, data.p50, data.p75, data.p90];
  const maxValue = Math.max(...values);
  const yAxisMax = Math.ceil(maxValue * 1.30);
  // Round to nearest 50K for cleaner tick marks
  const yAxisMaxRounded = Math.ceil(yAxisMax / 50000) * 50000;
  
  return `
    <div style="width: 100%; padding: 0; box-sizing: border-box; overflow: visible;">
      <div id="${chartId}" style="width: 100%;">
        <div style="text-align: center; margin-bottom: 8px;">
          <h3 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #111827; margin: 0;">
            ${title}
          </h3>
        </div>
        
        <div style="width: 100%; height: ${height}px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 10px; box-sizing: border-box; overflow: visible;">
          <canvas id="${chartId}-canvas" style="width: 100% !important; height: 100% !important; max-width: 100%;"></canvas>
        </div>
        
        <script>
          (function() {
            let chartInstance = null;
            let retryCount = 0;
            const maxRetries = 50; // Max 10 seconds (50 * 200ms)
            
            function initChart() {
              retryCount++;
              
              // Prevent infinite loops
              if (retryCount > maxRetries) {
                console.warn('Chart initialization failed after max retries for chart');
                return;
              }
              
              const canvas = document.getElementById('${chartId}-canvas');
              if (!canvas) {
                setTimeout(initChart, 200);
                return;
              }
              
              if (typeof Chart === 'undefined') {
                setTimeout(initChart, 200);
                return;
              }
              
              if (chartInstance) {
                return; // Already initialized
              }
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                setTimeout(initChart, 200);
                return;
              }
              
              // Register plugin for data labels
              const dataLabelsPlugin = {
                id: 'dataLabels-${chartId}',
                afterDatasetsDraw: function(chart) {
                  const ctx = chart.ctx;
                  const data = chart.data;
                  const meta = chart.getDatasetMeta(0);
                  
                  if (!meta || !meta.data) return;
                  
                  meta.data.forEach((bar, index) => {
                    const value = data.datasets[0].data[index];
                    const x = bar.x;
                    const y = bar.y - 15;
                    
                    // Draw label with background for better visibility
                    const labelText = '$' + (value / 1000).toFixed(0) + 'K';
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textMetrics = ctx.measureText(labelText);
                    const textWidth = textMetrics.width;
                    const textHeight = 16;
                    const padding = 4;
                    
                    // Draw background rectangle
                    ctx.fillRect(x - textWidth / 2 - padding, y - textHeight / 2, textWidth + padding * 2, textHeight);
                    
                    // Draw text
                    ctx.fillStyle = '#1f2937';
                    ctx.fillText(labelText, x, y);
                    ctx.restore();
                  });
                }
              };
              
              Chart.register(dataLabelsPlugin);
              
              chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: ['P25', 'P50 (Median)', 'P75', 'P90'],
                  datasets: [{
                    label: 'Total Cash Compensation (TCC)',
                    data: [${data.p25}, ${data.p50}, ${data.p75}, ${data.p90}],
                    backgroundColor: '#1E3A8A',
                    borderColor: '#1E40AF',
                    borderWidth: 0,
                    borderRadius: 4,
                    barThickness: 70,
                    maxBarThickness: 90,
                    categoryPercentage: 0.75,
                    barPercentage: 0.9
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  resizeDelay: 0,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: '#FFFFFF',
                      bodyColor: '#FFFFFF',
                      borderColor: '#374151',
                      borderWidth: 1,
                      cornerRadius: 8,
                      callbacks: {
                        label: function(context) {
                          return 'TCC: $' + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                      }
                    }
                  },
                  layout: {
                    padding: {
                      top: 60,
                      bottom: 20,
                      left: 15,
                      right: 15
                    }
                  },
                  animation: {
                    duration: 0 // Disable animation for immediate rendering
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: ${yAxisMaxRounded},
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false,
                        lineWidth: 1
                      },
                      ticks: {
                        font: {
                          size: 11,
                          weight: 'normal',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#6B7280',
                        padding: 8,
                        callback: function(value) {
                          return '$' + (value / 1000).toFixed(0) + 'K';
                        }
                      },
                      title: {
                        display: true,
                        text: 'TCC ($)',
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#374151',
                        padding: { top: 0, bottom: 12 }
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#111827',
                        padding: 12
                      },
                      title: {
                        display: true,
                        text: 'Percentile',
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#374151'
                      }
                    }
                  }
                }
              });
              } catch (error) {
                console.error('Error initializing chart ${chartId}:', error);
                // Don't retry on error - something is wrong
                return;
              }
            }
            
            // Wait for window load to ensure Chart.js is fully loaded
            function startInit() {
              if (document.readyState === 'loading') {
                window.addEventListener('load', function() {
                  setTimeout(initChart, 1000);
                });
              } else {
                // DOM already loaded, wait longer for Chart.js CDN
                setTimeout(initChart, 1000);
              }
            }
            
            startInit();
          })();
        </script>
      </div>
    </div>
  `;
};

/**
 * Generates a wRVU (Work RVU) Chart.js bar chart
 * 
 * @param data - wRVU data with p25, p50, p75, p90
 * @param title - Chart title
 * @param width - Chart width (default: 400)
 * @param height - Chart height (default: 300)
 * @returns HTML string with Chart.js
 */
export const generateWRVUChartHTML = (
  data: { p25: number; p50: number; p75: number; p90: number },
  title: string = "Work RVU (wRVU)",
  width: number = 400,
  height: number = 300
): string => {
  const chartId = `wrvu-chart-${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate max value for y-axis with 30% padding to prevent label clipping
  const values = [data.p25, data.p50, data.p75, data.p90];
  const maxValue = Math.max(...values);
  const yAxisMax = Math.ceil(maxValue * 1.30);
  // Round to nearest 1000 for cleaner tick marks
  const yAxisMaxRounded = Math.ceil(yAxisMax / 1000) * 1000;
  
  return `
    <div style="width: 100%; padding: 0; box-sizing: border-box; overflow: visible;">
      <div id="${chartId}" style="width: 100%;">
        <div style="text-align: center; margin-bottom: 8px;">
          <h3 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #111827; margin: 0;">
            ${title}
          </h3>
        </div>
        
        <div style="width: 100%; height: ${height}px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 10px; box-sizing: border-box; overflow: visible;">
          <canvas id="${chartId}-canvas" style="width: 100% !important; height: 100% !important; max-width: 100%;"></canvas>
        </div>
        
        <script>
          (function() {
            let chartInstance = null;
            let retryCount = 0;
            const maxRetries = 50; // Max 10 seconds (50 * 200ms)
            
            function initChart() {
              retryCount++;
              
              // Prevent infinite loops
              if (retryCount > maxRetries) {
                console.warn('Chart initialization failed after max retries for chart');
                return;
              }
              
              const canvas = document.getElementById('${chartId}-canvas');
              if (!canvas) {
                setTimeout(initChart, 200);
                return;
              }
              
              if (typeof Chart === 'undefined') {
                setTimeout(initChart, 200);
                return;
              }
              
              if (chartInstance) {
                return; // Already initialized
              }
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                setTimeout(initChart, 200);
                return;
              }
              
              // Register plugin for data labels
              const dataLabelsPlugin = {
                id: 'dataLabels-${chartId}',
                afterDatasetsDraw: function(chart) {
                  const ctx = chart.ctx;
                  const data = chart.data;
                  const meta = chart.getDatasetMeta(0);
                  
                  if (!meta || !meta.data) return;
                  
                  meta.data.forEach((bar, index) => {
                    const value = data.datasets[0].data[index];
                    const x = bar.x;
                    const y = bar.y - 15;
                    
                    // Draw label with background for better visibility
                    const labelText = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textMetrics = ctx.measureText(labelText);
                    const textWidth = textMetrics.width;
                    const textHeight = 16;
                    const padding = 4;
                    
                    // Draw background rectangle
                    ctx.fillRect(x - textWidth / 2 - padding, y - textHeight / 2, textWidth + padding * 2, textHeight);
                    
                    // Draw text
                    ctx.fillStyle = '#1f2937';
                    ctx.fillText(labelText, x, y);
                    ctx.restore();
                  });
                }
              };
              
              Chart.register(dataLabelsPlugin);
              
              chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: ['P25', 'P50 (Median)', 'P75', 'P90'],
                  datasets: [{
                    label: 'Work RVUs (wRVU)',
                    data: [${data.p25}, ${data.p50}, ${data.p75}, ${data.p90}],
                    backgroundColor: '#0D9488',
                    borderColor: '#14B8A6',
                    borderWidth: 0,
                    borderRadius: 4,
                    barThickness: 70,
                    maxBarThickness: 90,
                    categoryPercentage: 0.75,
                    barPercentage: 0.9
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  resizeDelay: 0,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: '#FFFFFF',
                      bodyColor: '#FFFFFF',
                      borderColor: '#374151',
                      borderWidth: 1,
                      cornerRadius: 8,
                      callbacks: {
                        label: function(context) {
                          return 'wRVU: ' + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                      }
                    }
                  },
                  layout: {
                    padding: {
                      top: 60,
                      bottom: 20,
                      left: 15,
                      right: 15
                    }
                  },
                  animation: {
                    duration: 0 // Disable animation for immediate rendering
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: ${yAxisMaxRounded},
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false,
                        lineWidth: 1
                      },
                      ticks: {
                        font: {
                          size: 11,
                          weight: 'normal',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#6B7280',
                        padding: 8,
                        callback: function(value) {
                          return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
                        }
                      },
                      title: {
                        display: true,
                        text: 'wRVU',
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#374151',
                        padding: { top: 0, bottom: 12 }
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#111827',
                        padding: 12
                      },
                      title: {
                        display: true,
                        text: 'Percentile',
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#374151'
                      }
                    }
                  }
                }
              });
              } catch (error) {
                console.error('Error initializing chart ${chartId}:', error);
                // Don't retry on error - something is wrong
                return;
              }
            }
            
            // Wait for window load to ensure Chart.js is fully loaded
            function startInit() {
              if (document.readyState === 'loading') {
                window.addEventListener('load', function() {
                  setTimeout(initChart, 1000);
                });
              } else {
                // DOM already loaded, wait longer for Chart.js CDN
                setTimeout(initChart, 1000);
              }
            }
            
            startInit();
          })();
        </script>
      </div>
    </div>
  `;
};

/**
 * Generates a CF (Conversion Factor) Chart.js bar chart
 * 
 * @param data - CF data with p25, p50, p75, p90
 * @param title - Chart title
 * @param width - Chart width (default: 400)
 * @param height - Chart height (default: 300)
 * @returns HTML string with Chart.js
 */
export const generateCFChartHTML = (
  data: { p25: number; p50: number; p75: number; p90: number },
  title: string = "Conversion Factor (CF)",
  width: number = 400,
  height: number = 300
): string => {
  const chartId = `cf-chart-${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate max value for y-axis with 30% padding to prevent label clipping
  const values = [data.p25, data.p50, data.p75, data.p90];
  const maxValue = Math.max(...values);
  const yAxisMax = Math.ceil(maxValue * 1.30);
  // Round to nearest 5 for cleaner tick marks
  const yAxisMaxRounded = Math.ceil(yAxisMax / 5) * 5;
  
  return `
    <div style="width: 100%; padding: 0; box-sizing: border-box; overflow: visible;">
      <div id="${chartId}" style="width: 100%;">
        <div style="text-align: center; margin-bottom: 8px;">
          <h3 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #111827; margin: 0;">
            ${title}
          </h3>
        </div>
        
        <div style="width: 100%; height: ${height}px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 10px; box-sizing: border-box; overflow: visible;">
          <canvas id="${chartId}-canvas" style="width: 100% !important; height: 100% !important; max-width: 100%;"></canvas>
        </div>
        
        <script>
          (function() {
            let chartInstance = null;
            let retryCount = 0;
            const maxRetries = 50; // Max 10 seconds (50 * 200ms)
            
            function initChart() {
              retryCount++;
              
              // Prevent infinite loops
              if (retryCount > maxRetries) {
                console.warn('Chart initialization failed after max retries for chart');
                return;
              }
              
              const canvas = document.getElementById('${chartId}-canvas');
              if (!canvas) {
                setTimeout(initChart, 200);
                return;
              }
              
              if (typeof Chart === 'undefined') {
                setTimeout(initChart, 200);
                return;
              }
              
              if (chartInstance) {
                return; // Already initialized
              }
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                setTimeout(initChart, 200);
                return;
              }
              
              // Register plugin for data labels
              const dataLabelsPlugin = {
                id: 'dataLabels-${chartId}',
                afterDatasetsDraw: function(chart) {
                  const ctx = chart.ctx;
                  const data = chart.data;
                  const meta = chart.getDatasetMeta(0);
                  
                  if (!meta || !meta.data) return;
                  
                  meta.data.forEach((bar, index) => {
                    const value = data.datasets[0].data[index];
                    const x = bar.x;
                    const y = bar.y - 15;
                    
                    // Draw label with background for better visibility
                    const labelText = '$' + value.toFixed(2);
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textMetrics = ctx.measureText(labelText);
                    const textWidth = textMetrics.width;
                    const textHeight = 16;
                    const padding = 4;
                    
                    // Draw background rectangle
                    ctx.fillRect(x - textWidth / 2 - padding, y - textHeight / 2, textWidth + padding * 2, textHeight);
                    
                    // Draw text
                    ctx.fillStyle = '#1f2937';
                    ctx.fillText(labelText, x, y);
                    ctx.restore();
                  });
                }
              };
              
              Chart.register(dataLabelsPlugin);
              
              chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: ['P25', 'P50 (Median)', 'P75', 'P90'],
                  datasets: [{
                    label: 'Conversion Factor (CF)',
                    data: [${data.p25}, ${data.p50}, ${data.p75}, ${data.p90}],
                    backgroundColor: '#C2410C',
                    borderColor: '#EA580C',
                    borderWidth: 0,
                    borderRadius: 4,
                    barThickness: 70,
                    maxBarThickness: 90,
                    categoryPercentage: 0.75,
                    barPercentage: 0.9
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  resizeDelay: 0,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: '#FFFFFF',
                      bodyColor: '#FFFFFF',
                      borderColor: '#374151',
                      borderWidth: 1,
                      cornerRadius: 8,
                      callbacks: {
                        label: function(context) {
                          return 'CF: $' + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                      }
                    }
                  },
                  layout: {
                    padding: {
                      top: 60,
                      bottom: 20,
                      left: 15,
                      right: 15
                    }
                  },
                  animation: {
                    duration: 0 // Disable animation for immediate rendering
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: ${yAxisMaxRounded},
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false,
                        lineWidth: 1
                      },
                      ticks: {
                        font: {
                          size: 11,
                          weight: 'normal',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#6B7280',
                        padding: 8,
                        callback: function(value) {
                          return '$' + value.toFixed(2);
                        }
                      },
                      title: {
                        display: true,
                        text: 'CF ($)',
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#374151',
                        padding: { top: 0, bottom: 12 }
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#111827',
                        padding: 12
                      },
                      title: {
                        display: true,
                        text: 'Percentile',
                        font: {
                          size: 12,
                          weight: 'bold',
                          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                        },
                        color: '#374151'
                      }
                    }
                  }
                }
              });
              } catch (error) {
                console.error('Error initializing chart ${chartId}:', error);
                // Don't retry on error - something is wrong
                return;
              }
            }
            
            // Wait for window load to ensure Chart.js is fully loaded
            function startInit() {
              if (document.readyState === 'loading') {
                window.addEventListener('load', function() {
                  setTimeout(initChart, 1000);
                });
              } else {
                // DOM already loaded, wait longer for Chart.js CDN
                setTimeout(initChart, 1000);
              }
            }
            
            startInit();
          })();
        </script>
      </div>
    </div>
  `;
};

/**
 * Generates 3 separate Chart.js bar charts for compensation ranges
 * Each chart has proper scaling for its metric type
 * 
 * @param data - Compensation range data
 * @param title - Chart title
 * @param width - Chart width (default: 600)
 * @param height - Chart height (default: 400)
 * @returns HTML string with Chart.js
 */
export const generateBarChartHTML = (
  data: CompensationRangeData,
  title: string = "Compensation Range Analysis",
  width: number = 600,
  height: number = 400
): string => {
  // Validate data
  if (!data || !data.tcc || !data.wrvu || !data.cf) {
    console.error('🔍 Invalid data passed to generateBarChartHTML:', data);
    return `<div class="chart-placeholder">Invalid data provided for bar chart</div>`;
  }
  
  const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;
  
  // Debug logging
  console.log('🔍 CF values:', [data.cf.p25, data.cf.p50, data.cf.p75, data.cf.p90]);
  console.log('🔍 TCC values:', [data.tcc.p25, data.tcc.p50, data.tcc.p75, data.tcc.p90]);
  console.log('🔍 wRVU values:', [data.wrvu.p25, data.wrvu.p50, data.wrvu.p75, data.wrvu.p90]);
  
  // Format values for display
  const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;
  const formatNumber = (value: number) => Math.round(value).toLocaleString();
  
  // Calculate max value for y-axis with padding to prevent bars from extending beyond border
  const tccValues = [data.tcc.p25, data.tcc.p50, data.tcc.p75, data.tcc.p90];
  const maxTccValue = Math.max(...tccValues);
  // Add 20% padding above the max value to ensure bars don't touch the top border
  const yAxisMax = Math.ceil(maxTccValue * 1.20);
  // Round to nearest 50K for cleaner tick marks
  const yAxisMaxRounded = Math.ceil(yAxisMax / 50000) * 50000;
  
  return `
    <div style="width: 100%; height: 100%; padding: 15px; box-sizing: border-box;">
      <div id="${chartId}" style="width: 100%; height: 100%;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: bold; color: #1f2937; margin: 0;">
            Total Cash Compensation (TCC)
          </h3>
        </div>
        
        <!-- Simple Chart Container -->
        <div style="width: 100%; height: 250px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; padding: 20px; box-sizing: border-box; margin-top: 10px; overflow: hidden;">
          <canvas id="${chartId}-canvas" style="width: 100%; height: 100%;"></canvas>
        </div>
        
        <!-- Secondary Metrics -->
        <div style="display: flex; justify-content: center; gap: 40px; margin-top: 20px;">
          <div style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; background: #10B981; border-radius: 6px; color: white;">
            <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; font-weight: 600;">wRVU:</div>
            <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; font-weight: bold;">${formatNumber(data.wrvu.p50)}</div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; background: #F59E0B; border-radius: 6px; color: white;">
            <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; font-weight: 600;">CF:</div>
            <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; font-weight: bold;">${formatCurrency(data.cf.p50)}</div>
          </div>
        </div>
        
        <script>
          (function() {
            let chartInstance = null;
            let retryCount = 0;
            const maxRetries = 50; // Max 10 seconds (50 * 200ms)
            
            function initChart() {
              retryCount++;
              
              // Prevent infinite loops
              if (retryCount > maxRetries) {
                console.warn('Chart initialization failed after max retries for chart');
                return;
              }
              
              const canvas = document.getElementById('${chartId}-canvas');
              if (!canvas) {
                setTimeout(initChart, 200);
                return;
              }
              
              if (typeof Chart === 'undefined') {
                setTimeout(initChart, 200);
                return;
              }
              
              if (chartInstance) {
                return; // Already initialized
              }
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                setTimeout(initChart, 200);
                return;
              }
              
              chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: ['P25', 'P50', 'P75', 'P90'],
                  datasets: [{
                    data: [${data.tcc.p25}, ${data.tcc.p50}, ${data.tcc.p75}, ${data.tcc.p90}],
                    backgroundColor: '#3B82F6',
                    borderColor: '#1D4ED8',
                    borderWidth: 1,
                    borderRadius: 4
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  resizeDelay: 0,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      enabled: false
                    }
                  },
                  layout: {
                    padding: {
                      top: 60,
                      bottom: 20,
                      left: 15,
                      right: 15
                    }
                  },
                  animation: {
                    onComplete: function() {
                      const ctx = this.ctx;
                      const data = this.data;
                      const meta = this.getDatasetMeta(0);
                      
                      meta.data.forEach((bar, index) => {
                        const value = data.datasets[0].data[index];
                        const x = bar.x;
                        const y = bar.y - 5;
                        
                        ctx.fillStyle = '#1f2937';
                        ctx.font = 'bold 11px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('$' + (value / 1000).toFixed(0) + 'K', x, y);
                      });
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                      max: ${yAxisMaxRounded},
                      grid: {
                        display: false
                      },
                      ticks: {
                        callback: function(value) {
                          return '$' + (value / 1000).toFixed(0) + 'K';
                        }
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        font: { weight: '600' }
                      }
                    }
                  }
                }
              });
              } catch (error) {
                console.error('Error initializing chart ${chartId}:', error);
                // Don't retry on error - something is wrong
                return;
              }
            }
            
            // Wait for window load to ensure Chart.js is fully loaded
            function startInit() {
              if (document.readyState === 'loading') {
                window.addEventListener('load', function() {
                  setTimeout(initChart, 1000);
                });
              } else {
                // DOM already loaded, wait longer for Chart.js CDN
                setTimeout(initChart, 1000);
              }
            }
            
            startInit();
          })();
        </script>
      </div>
    </div>
  `;
};

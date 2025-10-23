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
  
  return `
    <div style="width: 100%; height: 100%; padding: 15px; box-sizing: border-box;">
      <div id="${chartId}" style="width: 100%; height: 100%;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: bold; color: #1f2937; margin: 0;">
            Total Cash Compensation (TCC)
          </h3>
        </div>
        
        <!-- Simple Chart Container -->
        <div style="width: 100%; height: 250px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; padding: 20px; box-sizing: border-box; margin-top: 10px;">
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
            function initChart() {
              if (typeof Chart === 'undefined') {
                setTimeout(initChart, 100);
                return;
              }
              
              const ctx = document.getElementById('${chartId}-canvas').getContext('2d');
              
              new Chart(ctx, {
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
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      enabled: false
                    }
                  },
                  layout: {
                    padding: {
                      top: 30,
                      bottom: 20
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
            }
            
            initChart();
          })();
        </script>
      </div>
    </div>
  `;
};

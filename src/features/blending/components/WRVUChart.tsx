/**
 * Work RVU (wRVU) Bar Chart Component
 * 
 * Shows the percentile ranges (P25, P50, P75, P90) for Work RVU only
 */

import React from 'react';
import { Bar } from 'react-chartjs-2';
import './BlendingCharts.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

interface WRVUChartProps {
  data: {
    wrvu: { p25: number; p50: number; p75: number; p90: number };
  };
  title?: string;
  height?: number;
  width?: number;
}

export const WRVUChart: React.FC<WRVUChartProps> = ({
  data,
  title = "Work RVU (wRVU) Range Analysis",
  height = 300,
  width = 600
}) => {
  // Format values for data labels
  const formatWRVU = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const chartData = {
    labels: ['P25', 'P50 (Median)', 'P75', 'P90'],
    datasets: [
      {
        label: 'Work RVUs (wRVU)',
        data: [data.wrvu.p25, data.wrvu.p50, data.wrvu.p75, data.wrvu.p90],
        backgroundColor: '#0D9488', // Professional teal
        borderColor: '#14B8A6',
        borderWidth: 0,
        hoverBackgroundColor: '#14B8A6',
        hoverBorderColor: '#0D9488',
        yAxisID: 'y',
        barThickness: 70,
        maxBarThickness: 90,
        categoryPercentage: 0.75,
        barPercentage: 0.9,
        borderRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: width / height,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 18,
          weight: 'bold' as const,
          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        },
        color: '#111827',
        padding: { bottom: 24, top: 8 }
      },
      legend: {
        display: false // Single series, no need for legend
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            return context[0].label;
          },
          label: (context: any) => {
            const value = context.parsed.y;
            return `Work RVUs (wRVU): ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        display: true,
        title: {
          display: true,
          text: 'Percentile',
          font: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          color: '#374151'
        },
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          color: '#111827',
          padding: 12
        },
        stacked: false,
        border: {
          display: false
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'wRVU',
          font: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          color: '#374151',
          padding: { top: 0, bottom: 12 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 11,
            weight: 'normal' as const,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          color: '#6B7280',
          padding: 8,
          callback: function(value: any) {
            return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
          }
        },
        beginAtZero: true
      }
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart' as const,
      onComplete: (chart: any) => {
        // Safety checks
        if (!chart || !chart.data || !chart.data.datasets || !chart.ctx) {
          return;
        }
        
        const datasets = chart.data.datasets;
        if (!Array.isArray(datasets) || datasets.length === 0) {
          return;
        }
        
        const dataset = datasets[0];
        if (!dataset || !dataset.data) return;
        
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !Array.isArray(meta.data)) return;
        
        const ctx = chart.ctx;
        
        meta.data.forEach((bar: any, index: number) => {
          if (!bar || typeof bar.x === 'undefined' || typeof bar.y === 'undefined') return;
          
          const value = dataset.data[index];
          if (typeof value !== 'number' || isNaN(value)) return;
          
          const x = bar.x;
          const y = bar.y - 8;
          const labelText = formatWRVU(value);
          
          if (!labelText) return;
          
          // Draw label background
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const textWidth = ctx.measureText(labelText).width;
          const padding = 6;
          const labelX = x;
          const labelY = y - 10;
          
          // Use roundRect if available, otherwise fallback to rect
          if (ctx.roundRect) {
            ctx.roundRect(
              labelX - textWidth / 2 - padding,
              labelY - 10,
              textWidth + padding * 2,
              18,
              4
            );
          } else {
            ctx.rect(
              labelX - textWidth / 2 - padding,
              labelY - 10,
              textWidth + padding * 2,
              18
            );
          }
          ctx.fill();
          ctx.stroke();
          
          // Draw label text
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, labelX, labelY - 1);
          ctx.restore();
        });
      }
    },
    layout: {
      padding: {
        top: 20,
        bottom: 10
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="chart-container" style={{ height: `${height}px` }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};


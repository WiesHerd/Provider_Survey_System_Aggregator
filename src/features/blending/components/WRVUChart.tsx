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
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title, ChartDataLabels);

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
        barThickness: 30,
        maxBarThickness: 35,
        categoryPercentage: 0.5,
        barPercentage: 0.6,
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
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 4,
        color: '#111827',
        font: {
          size: 12,
          weight: 'bold' as const,
          family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        },
        formatter: (value: number) => {
          return formatWRVU(value);
        },
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#374151',
        borderWidth: 1,
        borderRadius: 4,
        padding: {
          top: 4,
          bottom: 4,
          left: 6,
          right: 6
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
      easing: 'easeOutQuart' as const
    },
    layout: {
      padding: {
        top: 50,
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



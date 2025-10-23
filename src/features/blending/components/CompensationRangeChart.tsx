/**
 * Compensation Range Bar Chart Component
 * 
 * Shows the percentile ranges (P25, P50, P75, P90) for TCC, wRVU, and CF
 * Used for all blending methods to visualize the spread of compensation data
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

interface CompensationRangeChartProps {
  data: {
    tcc: { p25: number; p50: number; p75: number; p90: number };
    wrvu: { p25: number; p50: number; p75: number; p90: number };
    cf: { p25: number; p50: number; p75: number; p90: number };
  };
  title?: string;
  height?: number;
  width?: number;
}

export const CompensationRangeChart: React.FC<CompensationRangeChartProps> = ({
  data,
  title = "Compensation Range Analysis",
  height = 400,
  width = 600
}) => {
  const chartData = {
    labels: ['P25', 'P50 (Median)', 'P75', 'P90'],
    datasets: [
      {
        label: 'Total Cash Compensation (TCC)',
        data: [data.tcc.p25, data.tcc.p50, data.tcc.p75, data.tcc.p90],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        hoverBackgroundColor: 'rgba(59, 130, 246, 0.9)',
        hoverBorderColor: '#1D4ED8',
        yAxisID: 'y'
      },
      {
        label: 'Work RVUs (wRVU)',
        data: [data.wrvu.p25, data.wrvu.p50, data.wrvu.p75, data.wrvu.p90],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10B981',
        borderWidth: 2,
        hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
        hoverBorderColor: '#059669',
        yAxisID: 'y1'
      },
      {
        label: 'Conversion Factor (CF)',
        data: [data.cf.p25, data.cf.p50, data.cf.p75, data.cf.p90],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#F59E0B',
        borderWidth: 2,
        hoverBackgroundColor: 'rgba(245, 158, 11, 0.9)',
        hoverBorderColor: '#D97706',
        yAxisID: 'y2'
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
          size: 16,
          weight: 'bold' as const,
          family: 'Inter, sans-serif'
        },
        color: '#1F2937',
        padding: 20
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: '#374151'
        }
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
            const label = context.dataset.label;
            const value = context.parsed.y;
            
            if (label?.includes('TCC')) {
              return `${label}: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (label?.includes('wRVU')) {
              return `${label}: ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (label?.includes('CF')) {
              return `${label}: $${value.toFixed(2)}`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Percentile',
          font: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, sans-serif'
          },
          color: '#374151'
        },
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: '#6B7280'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'TCC ($)',
          font: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, sans-serif'
          },
          color: '#3B82F6'
        },
        grid: {
          color: 'rgba(59, 130, 246, 0.1)'
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: '#3B82F6',
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'wRVU',
          font: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, sans-serif'
          },
          color: '#10B981'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: '#10B981',
          callback: function(value: any) {
            return value.toLocaleString();
          }
        }
      },
      y2: {
        type: 'linear' as const,
        display: false,
        position: 'right' as const,
        title: {
          display: true,
          text: 'CF ($)',
          font: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, sans-serif'
          },
          color: '#F59E0B'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: '#F59E0B',
          callback: function(value: any) {
            return '$' + value.toFixed(2);
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

/**
 * Conversion Factor Chart Component
 * 
 * Shows the percentile ranges (P25, P50, P75, P90) for Conversion Factor (CF)
 * Separate chart with proper scaling for CF values ($0-$100 range)
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

interface ConversionFactorChartProps {
  data: {
    cf: { p25: number; p50: number; p75: number; p90: number };
  };
  title?: string;
  height?: number;
  width?: number;
}

export const ConversionFactorChart: React.FC<ConversionFactorChartProps> = ({
  data,
  title = "Conversion Factor (CF) Range Analysis",
  height = 250,
  width = 400
}) => {
  // Format CF values for data labels
  const formatCF = (value: number) => `$${value.toFixed(2)}`;

  const chartData = {
    labels: ['P25', 'P50 (Median)', 'P75', 'P90'],
    datasets: [
      {
        label: 'Conversion Factor (CF)',
        data: [data.cf.p25, data.cf.p50, data.cf.p75, data.cf.p90],
        backgroundColor: '#C2410C', // Professional muted orange
        borderColor: '#EA580C',
        borderWidth: 0,
        hoverBackgroundColor: '#EA580C',
        hoverBorderColor: '#C2410C',
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
            return `Conversion Factor (CF): $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          return formatCF(value);
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
            family: 'Inter, sans-serif'
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
          text: 'CF ($)',
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
            return '$' + value.toFixed(2);
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


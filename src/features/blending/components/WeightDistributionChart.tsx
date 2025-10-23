/**
 * Weight Distribution Pie Chart Component
 * 
 * Shows how each specialty contributes to the final blended result
 * Used for Weighted Average and Custom Weight blending methods
 */

import React from 'react';
import { Pie } from 'react-chartjs-2';
import './BlendingCharts.css';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface WeightDistributionChartProps {
  data: Array<{
    specialty: string;
    weight: number;
    records: number;
  }>;
  title?: string;
  height?: number;
  width?: number;
}

export const WeightDistributionChart: React.FC<WeightDistributionChartProps> = ({
  data,
  title = "Weight Distribution",
  height = 300,
  width = 400
}) => {
  // Generate professional color palette
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ];

  const chartData = {
    labels: data.map(item => item.specialty),
    datasets: [
      {
        data: data.map(item => item.weight),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color + '80'),
        borderWidth: 2,
        hoverBackgroundColor: colors.slice(0, data.length).map(color => color + 'CC'),
        hoverBorderColor: '#374151',
        hoverBorderWidth: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: width / height,
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
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: '#374151',
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, index: number) => {
                const dataset = data.datasets[0];
                const value = dataset.data[index];
                const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[index],
                  strokeStyle: dataset.borderColor[index],
                  lineWidth: dataset.borderWidth,
                  pointStyle: 'circle',
                  hidden: false,
                  index: index
                };
              });
            }
            return [];
          }
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
            const value = context.parsed;
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            const records = data[context.dataIndex]?.records || 0;
            
            return [
              `Weight: ${percentage}%`,
              `Records: ${records.toLocaleString()}`
            ];
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeInOutQuart' as const
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="chart-container">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};

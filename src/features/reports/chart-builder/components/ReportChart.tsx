/**
 * Report Chart Component
 * 
 * Renders charts based on chart type (bar, line, pie)
 */

import React from 'react';
import { Typography } from '@mui/material';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { EChartsBar, EChartsCF } from '../../../../components/charts';
import { ReportChartProps } from '../types/reportBuilder';
import { calculateOptimalYAxis, isCurrencyMetric, isWRVUMetric } from '../utils/reportCalculations';
import { ErrorBoundary } from './ErrorBoundary';

const COLORS = ['#6A5ACD', '#8B7DD6', '#A89DE0', '#C5BDE9', '#E2D1F2'];

export const ReportChart: React.FC<ReportChartProps> = ({
  chartData,
  chartType,
  metrics,
  metric
}) => {
  if (chartData.length === 0) {
    return null;
  }

  const isCurrency = isCurrencyMetric(metric);
  const isWRVU = isWRVUMetric(metric);
  const yAxisConfig = calculateOptimalYAxis(chartData, isCurrency, isWRVU);

  return (
    <ErrorBoundary>
      {chartType === 'pie' && (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip 
              formatter={(value: any) => [
                isCurrency ? `$${value.toLocaleString()}` : 
                isWRVU ? value.toLocaleString() : 
                `$${value}`,
                metric.replace('_', ' ').toUpperCase()
              ]} 
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {chartType === 'line' && (
        <div className="w-full overflow-x-auto">
          <div className="w-full min-w-full">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={chartData.length > 15 ? 120 : 100}
                  tick={{ fontSize: chartData.length > 15 ? 9 : 12 }}
                  interval={chartData.length > 15 ? 2 : 0}
                />
                <YAxis 
                  domain={[yAxisConfig.min, yAxisConfig.max]}
                  tickFormatter={(value) => 
                    isCurrency ? `$${(value / 1000).toFixed(0)}K` : 
                    isWRVU ? value.toLocaleString() : 
                    `$${value}`
                  }
                />
                <RechartsTooltip 
                  formatter={(value: any) => [
                    isCurrency ? `$${value.toLocaleString()}` : 
                    isWRVU ? value.toLocaleString() : 
                    `$${value}`,
                    metric.replace('_', ' ').toUpperCase()
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6A5ACD" 
                  strokeWidth={2}
                  dot={{ fill: '#6A5ACD', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {chartType === 'bar' && (
        <div className="w-full space-y-6">
          {metrics.some(m => m.includes('tcc') || m.includes('wrvu')) && (
            <div className="w-full">
              <div className="mb-4 text-center">
                <Typography variant="h6" className="text-gray-900 font-semibold">
                  Compensation Analysis
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Total Cash Compensation (TCC) and Work RVU metrics
                </Typography>
              </div>
              <EChartsBar 
                key={`chart-${metrics.join('-')}`}
                data={chartData}
                metrics={metrics}
                chartHeight={600}
              />
            </div>
          )}
          
          {metrics.some(m => m.includes('cf')) && (
            <div className="w-full">
              <div className="mb-4 text-center">
                <Typography variant="h6" className="text-gray-900 font-semibold">
                  Conversion Factor Analysis
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Conversion Factor (CF) metrics shown separately due to different scale
                </Typography>
              </div>
              <EChartsCF 
                key={`cf-chart-${metrics.join('-')}`}
                data={chartData}
                metrics={metrics}
                chartHeight={600}
              />
            </div>
          )}
        </div>
      )}
    </ErrorBoundary>
  );
};


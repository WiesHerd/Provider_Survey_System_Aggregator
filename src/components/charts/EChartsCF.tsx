import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface EChartsCFProps {
  data: Array<{
    name: string;
    value: number;
    count: number;
    metricValues?: Record<string, number>;
  }>;
  metrics: string[];
  chartHeight?: number;
}

const METRIC_LABELS: Record<string, string> = {
  'cf_p25': 'CF 25th',
  'cf_p50': 'CF 50th',
  'cf_p75': 'CF 75th',
  'cf_p90': 'CF 90th'
};

const COLORS = ['#f59e0b', '#fb923c', '#fbbf24', '#fcd34d'];

export const EChartsCF: React.FC<EChartsCFProps> = ({ 
  data, 
  metrics,
  chartHeight = 300 
}) => {
  const option = useMemo(() => {
    const categories = data.map(item => item.name);
    
    // Only CF metrics
    const cfMetrics = metrics.filter(m => m.includes('cf'));
    
    // Calculate max values for CF (typically $40-$200)
    const cfValues = data.flatMap(item => 
      cfMetrics.map(m => item.metricValues?.[m] || 0)
    ).filter(v => v > 0);
    
    const maxCf = cfValues.length > 0 ? Math.max(...cfValues) : 200;
    
    // Calculate intelligent Y-axis max (round up to nearest $50 with 10% headroom)
    const cfMax = Math.ceil(maxCf * 1.1 / 50) * 50;
    
    // Build series array
    const series = cfMetrics.map((metric, index) => {
      return {
        name: METRIC_LABELS[metric] || metric,
        type: 'bar',
        data: data.map(item => item.metricValues?.[metric] || item.value || 0),
        itemStyle: {
          color: COLORS[index % COLORS.length],
          borderRadius: [3, 3, 0, 0]
        },
        barMaxWidth: 60,
        label: {
          show: false
        }
      };
    });
    
    return {
      grid: {
        left: '5%',
        right: '5%',
        top: '15%',
        bottom: '15%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151',
          fontSize: 12
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].name}</div>`;
          params.forEach((param: any) => {
            const value = param.value;
            const formatted = `$${value.toLocaleString()}`;
            result += `
              <div style="display: flex; align-items: center; margin: 4px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                <span style="flex: 1;">${param.seriesName}:</span>
                <span style="font-weight: 600; margin-left: 12px;">${formatted}</span>
              </div>
            `;
          });
          return result;
        }
      },
      legend: {
        data: cfMetrics.map(m => METRIC_LABELS[m] || m),
        top: '2%',
        textStyle: {
          fontSize: 12,
          color: '#6b7280'
        }
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: categories.length > 3 ? 45 : 0,
          fontSize: 11,
          color: '#6b7280'
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Conversion Factor ($)',
        nameLocation: 'middle',
        nameGap: 50,
        min: 0,
        max: cfMax,
        nameTextStyle: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#374151'
        },
        axisLabel: {
          formatter: (value: number) => `$${value.toFixed(0)}`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: 11,
          color: '#6b7280'
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
            type: 'dashed'
          }
        }
      },
      series: series
    };
  }, [data, metrics]);

  return (
    <ReactECharts 
      option={option} 
      style={{ height: `${chartHeight}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};


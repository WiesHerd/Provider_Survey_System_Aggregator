import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface EChartsBarProps {
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
  'tcc_p25': 'TCC 25th',
  'tcc_p50': 'TCC 50th',
  'tcc_p75': 'TCC 75th',
  'tcc_p90': 'TCC 90th',
  'wrvu_p25': 'wRVU 25th',
  'wrvu_p50': 'wRVU 50th',
  'wrvu_p75': 'wRVU 75th',
  'wrvu_p90': 'wRVU 90th',
  'cf_p25': 'CF 25th',
  'cf_p50': 'CF 50th',
  'cf_p75': 'CF 75th',
  'cf_p90': 'CF 90th'
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export const EChartsBar: React.FC<EChartsBarProps> = ({ 
  data, 
  metrics,
  chartHeight = 600 
}) => {
  const option = useMemo(() => {
    const categories = data.map(item => item.name);
    
    // Separate metrics by type (exclude CF from main chart - it needs its own scale)
    const tccMetrics = metrics.filter(m => m.includes('tcc'));
    const wrvuMetrics = metrics.filter(m => m.includes('wrvu'));
    
    // Only render TCC and wRVU in this chart (CF gets separate chart)
    const chartMetrics = [...tccMetrics, ...wrvuMetrics];
    
    // Calculate max values for fixed scaling (zero baseline with intelligent max)
    const tccValues = data.flatMap(item => 
      tccMetrics.map(m => item.metricValues?.[m] || 0)
    ).filter(v => v > 0);
    const wrvuValues = data.flatMap(item =>
      wrvuMetrics.map(m => item.metricValues?.[m] || 0)
    ).filter(v => v > 0);
    
    const maxTcc = tccValues.length > 0 ? Math.max(...tccValues) : 100000;
    const maxWrvu = wrvuValues.length > 0 ? Math.max(...wrvuValues) : 10000;
    
    // Calculate intelligent Y-axis max values (round up with 10% headroom)
    const tccMax = Math.ceil(maxTcc * 1.1 / 50000) * 50000;
    const wrvuMax = Math.ceil(maxWrvu * 1.1 / 2000) * 2000;
    
    // Build series array (only for TCC and wRVU)
    const series = chartMetrics.map((metric, index) => {
      const isWRVU = metric.includes('wrvu');
      
      return {
        name: METRIC_LABELS[metric] || metric,
        type: 'bar',
        yAxisIndex: isWRVU ? 1 : 0,
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
            const isWRVU = param.seriesName.includes('wRVU');
            const formatted = isWRVU 
              ? value.toLocaleString()
              : `$${value.toLocaleString()}`;
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
        data: chartMetrics.map(m => METRIC_LABELS[m] || m),
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
      yAxis: [
        // Left Y-axis for currency
        {
          type: 'value',
          name: 'Total Cash Compensation ($)',
          nameLocation: 'middle',
          nameGap: 50,
          min: 0,
          max: tccMax,
          nameTextStyle: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#374151'
          },
          axisLabel: {
            formatter: (value: number) => `$${(value / 1000).toFixed(0)}K`,
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
        // Right Y-axis for wRVU
        {
          type: 'value',
          name: 'Work RVUs',
          nameLocation: 'middle',
          nameGap: 50,
          min: 0,
          max: wrvuMax,
          nameTextStyle: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#374151'
          },
          axisLabel: {
            formatter: (value: number) => value.toLocaleString(),
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
            show: false
          }
        }
      ],
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


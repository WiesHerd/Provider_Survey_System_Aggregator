import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { loadECharts } from '../../config/bundleConfig';

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

// Apple/Google-style sophisticated color palette
// Primary colors with proper contrast ratios and visual hierarchy
const COLORS = [
  '#6366f1', // Indigo - primary metric
  '#8b5cf6', // Purple - secondary metric
  '#ec4899', // Pink - tertiary metric
  '#f59e0b', // Amber - quaternary metric
  '#10b981'  // Emerald - quinary metric
];


export const EChartsBar: React.FC<EChartsBarProps> = ({ 
  data, 
  metrics,
  chartHeight = 600 
}) => {
  const [ReactECharts, setReactECharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadECharts().then((EChartsComponent) => {
      setReactECharts(() => EChartsComponent);
      setLoading(false);
    }).catch((error) => {
      console.error('Failed to load ECharts:', error);
      setLoading(false);
    });
  }, []);

  const option = useMemo(() => {
    const categories = data.map(item => item.name);
    
    // Calculate max label length to determine rotation and padding needs
    const maxLabelLength = Math.max(...categories.map(cat => cat.length));
    const hasLongLabels = maxLabelLength > 15;
    const needsRotation = categories.length > 3 || hasLongLabels;
    
    // Separate metrics by type (exclude CF from main chart - it needs its own scale)
    const tccMetrics = metrics.filter(m => m.includes('tcc'));
    const wrvuMetrics = metrics.filter(m => m.includes('wrvu'));
    
    // Sort TCC metrics by percentile order (25th, 50th, 75th, 90th)
    const sortedTccMetrics = tccMetrics.sort((a, b) => {
      const percentileOrder = { 'p25': 1, 'p50': 2, 'p75': 3, 'p90': 4 };
      const aPercentile = a.match(/p\d+/)?.[0] || '';
      const bPercentile = b.match(/p\d+/)?.[0] || '';
      return (percentileOrder[aPercentile as keyof typeof percentileOrder] || 0) - 
             (percentileOrder[bPercentile as keyof typeof percentileOrder] || 0);
    });
    
    // Sort wRVU metrics by percentile order (25th, 50th, 75th, 90th)
    const sortedWrvuMetrics = wrvuMetrics.sort((a, b) => {
      const percentileOrder = { 'p25': 1, 'p50': 2, 'p75': 3, 'p90': 4 };
      const aPercentile = a.match(/p\d+/)?.[0] || '';
      const bPercentile = b.match(/p\d+/)?.[0] || '';
      return (percentileOrder[aPercentile as keyof typeof percentileOrder] || 0) - 
             (percentileOrder[bPercentile as keyof typeof percentileOrder] || 0);
    });
    
    // Only render TCC and wRVU in this chart (CF gets separate chart)
    const chartMetrics = [...sortedTccMetrics, ...sortedWrvuMetrics];
    
    // Calculate max values for fixed scaling (zero baseline with intelligent max)
    const tccValues = data.flatMap(item => 
      sortedTccMetrics.map(m => item.metricValues?.[m] || 0)
    ).filter(v => v > 0);
    const wrvuValues = data.flatMap(item =>
      sortedWrvuMetrics.map(m => item.metricValues?.[m] || 0)
    ).filter(v => v > 0);
    
    const maxTcc = tccValues.length > 0 ? Math.max(...tccValues) : 100000;
    const maxWrvu = wrvuValues.length > 0 ? Math.max(...wrvuValues) : 10000;
    
    // Calculate intelligent Y-axis max values (round up with 10% headroom)
    const tccMax = Math.ceil(maxTcc * 1.1 / 50000) * 50000;
    const wrvuMax = Math.ceil(maxWrvu * 1.1 / 2000) * 2000;
    
    // Build series array (only for TCC and wRVU)
    const series = chartMetrics.map((metric, index) => {
      const isWRVU = metric.includes('wrvu');
      const seriesData = data.map(item => item.metricValues?.[metric] || item.value || 0);
      
      // Debug logging for series data
      
      const baseColor = COLORS[index % COLORS.length];
      
      return {
        name: METRIC_LABELS[metric] || metric,
        type: 'bar',
        yAxisIndex: isWRVU ? 1 : 0,
        data: seriesData,
        itemStyle: {
          color: baseColor, // Solid color with shadow for depth
          borderRadius: [4, 4, 0, 0], // More refined rounded corners
          shadowBlur: 4,
          shadowColor: `${baseColor}40`, // Subtle shadow with color tint
          shadowOffsetY: 2
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: `${baseColor}60`, // Enhanced shadow on hover
            shadowOffsetY: 3
          }
        },
        barMaxWidth: 60,
        animation: true,
        animationDuration: 800,
        animationEasing: 'cubicOut', // Smooth Apple-style animation
        label: {
          show: chartMetrics.length === 1, // Only show labels when there's a single metric
          position: 'top',
          formatter: (params: any) => {
            const isWRVU = params.seriesName.includes('wRVU');
            const value = params.value;
            if (isWRVU) {
              return value.toLocaleString();
            } else {
              return `$${(value / 1000).toFixed(0)}K`;
            }
          },
          fontSize: 12, // Increased from 11px for better readability
          fontWeight: '600',
          color: '#111827', // Better contrast (WCAG AA compliant)
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          borderRadius: 6, // More refined
          padding: [6, 10, 6, 10], // Better padding
          shadowBlur: 4,
          shadowColor: 'rgba(0, 0, 0, 0.08)',
          shadowOffsetY: 2
        }
      };
    });
    
    return {
      // Pixel-based grid for consistent spacing (Apple/Google standard)
      grid: {
        left: 80, // Fixed pixel value for Y-axis labels
        right: 80, // Fixed pixel value for right Y-axis labels
        top: 80, // Space for legend and title
        bottom: needsRotation && hasLongLabels ? 120 : needsRotation ? 80 : 60, // Increased bottom padding for rotated long labels
        containLabel: false // We control spacing precisely
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(0, 0, 0, 0.05)' // Subtle shadow pointer
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.98)', // Slightly more opaque
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 8, // More refined corners
        padding: [12, 16], // Better padding
        textStyle: {
          color: '#111827', // Better contrast
          fontSize: 13, // Increased from 12px
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: 1.5
        },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);', // Apple-style shadow
        formatter: (params: any) => {
          let result = `<div style="font-weight: 600; font-size: 13px; margin-bottom: 10px; color: #111827;">${params[0].name}</div>`;
          params.forEach((param: any) => {
            const value = param.value;
            const isWRVU = param.seriesName.includes('wRVU');
            const formatted = isWRVU 
              ? value.toLocaleString()
              : `$${value.toLocaleString()}`;
            result += `
              <div style="display: flex; align-items: center; margin: 6px 0;">
                <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${param.color}; margin-right: 10px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);"></span>
                <span style="flex: 1; font-size: 13px; color: #6b7280;">${param.seriesName}:</span>
                <span style="font-weight: 600; font-size: 13px; margin-left: 16px; color: #111827;">${formatted}</span>
              </div>
            `;
          });
          return result;
        }
      },
      legend: {
        data: chartMetrics.map(m => METRIC_LABELS[m] || m),
        top: 16, // Pixel-based positioning
        left: 'center', // Centered for better visual balance
        itemGap: 24, // Better spacing between legend items
        textStyle: {
          fontSize: 13, // Increased from 12px
          fontWeight: '500', // Medium weight for better readability
          color: '#374151', // Better contrast
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: 1.5
        },
        icon: 'roundRect', // More refined icon shape
        itemWidth: 12,
        itemHeight: 12
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: needsRotation ? (hasLongLabels ? 60 : 45) : 0, // 60 degrees for long labels, 45 for shorter
          fontSize: 12, // Increased from 11px
          fontWeight: '500',
          color: '#6b7280',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: 1.4,
          margin: needsRotation ? (hasLongLabels ? 20 : 16) : 12, // Increased margin for rotated labels
          // Truncate very long labels to prevent cutoff
          formatter: (value: string) => {
            // For long labels that are rotated, truncate to prevent cutoff
            if (needsRotation && value.length > 25) {
              return value.substring(0, 22) + '...';
            }
            return value;
          },
          // Set width for long labels to ensure proper spacing
          width: hasLongLabels ? 80 : undefined
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#e5e7eb',
            width: 1
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#e5e7eb'
          },
          length: 4
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
            fontSize: 13, // Increased from 12px
            fontWeight: '600', // Semibold instead of bold for refinement
            color: '#111827', // Better contrast
            lineHeight: 1.4
          },
          axisLabel: {
            formatter: (value: number) => `$${(value / 1000).toFixed(0)}K`,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: 12, // Increased from 11px
            fontWeight: '500',
            color: '#6b7280',
            lineHeight: 1.4,
            margin: 8 // Better spacing
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#e5e7eb'
            }
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#f3f4f6',
              type: 'dashed',
              width: 1,
              dashOffset: 2
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
            fontSize: 13, // Increased from 12px
            fontWeight: '600', // Semibold instead of bold
            color: '#111827', // Better contrast
            lineHeight: 1.4
          },
          axisLabel: {
            formatter: (value: number) => value.toLocaleString(),
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: 12, // Increased from 11px
            fontWeight: '500',
            color: '#6b7280',
            lineHeight: 1.4,
            margin: 8 // Better spacing
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
      series: series,
      // Animation configuration for smooth Apple-style transitions
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
      animationDelay: (idx: number) => idx * 50 // Staggered animation
    };
  }, [data, metrics]);

  if (loading) {
    return (
      <div style={{ height: `${chartHeight}px`, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (!ReactECharts) {
    return (
      <div style={{ height: `${chartHeight}px`, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-red-500">Failed to load chart library</div>
      </div>
    );
  }

  return (
    <ReactECharts 
      option={option} 
      style={{ height: `${chartHeight}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};


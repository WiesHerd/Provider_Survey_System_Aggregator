/**
 * Enterprise Performance Dashboard
 * Inspired by Google Analytics and Microsoft Application Insights
 * Provides real-time performance monitoring and analytics
 */

import React, { memo, useState, useEffect, useMemo } from 'react';
import { usePerformanceAnalytics, PerformanceMetrics, PerformanceEvent } from '../hooks/usePerformanceAnalytics';

export interface PerformanceDashboardProps {
  componentName: string;
  className?: string;
  showRealTimeMetrics?: boolean;
  showEventHistory?: boolean;
  showMemoryUsage?: boolean;
  showUserSatisfaction?: boolean;
  refreshInterval?: number;
  maxEventsToShow?: number;
}

interface PerformanceChartData {
  timestamp: number;
  renderTime: number;
  memoryUsage: number;
  searchResponseTime: number;
  userSatisfactionScore: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = memo(({
  componentName,
  className = '',
  showRealTimeMetrics = true,
  showEventHistory = true,
  showMemoryUsage = true,
  showUserSatisfaction = true,
  refreshInterval = 2000,
  maxEventsToShow = 10,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartData, setChartData] = useState<PerformanceChartData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<keyof PerformanceMetrics>('renderTime');
  
  const analytics = usePerformanceAnalytics(componentName, {
    enableRealTimeMonitoring: true,
    enableMemoryTracking: showMemoryUsage,
    enableUserInteractionTracking: true,
    reportingInterval: refreshInterval,
  });

  // Update chart data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = analytics.metrics;
      const newDataPoint: PerformanceChartData = {
        timestamp: Date.now(),
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage,
        searchResponseTime: metrics.searchResponseTime,
        userSatisfactionScore: metrics.userSatisfactionScore,
      };

      setChartData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 50 data points
        return updated.slice(-50);
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Calculate performance trends
  const performanceTrends = useMemo(() => {
    if (chartData.length < 2) return null;

    const recent = chartData.slice(-10);
    const older = chartData.slice(-20, -10);
    
    if (older.length === 0) return null;

    const calculateTrend = (metric: keyof PerformanceChartData) => {
      const recentAvg = recent.reduce((sum, point) => sum + point[metric], 0) / recent.length;
      const olderAvg = older.reduce((sum, point) => sum + point[metric], 0) / older.length;
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;
      return { current: recentAvg, change, trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable' };
    };

    return {
      renderTime: calculateTrend('renderTime'),
      memoryUsage: calculateTrend('memoryUsage'),
      searchResponseTime: calculateTrend('searchResponseTime'),
      userSatisfactionScore: calculateTrend('userSatisfactionScore'),
    };
  }, [chartData]);

  // Get performance status
  const getPerformanceStatus = (metric: keyof PerformanceMetrics, value: number) => {
    const thresholds: Record<string, { good: number; warning: number; critical: number }> = {
      renderTime: { good: 16, warning: 50, critical: 100 },
      memoryUsage: { good: 50, warning: 100, critical: 200 },
      searchResponseTime: { good: 300, warning: 1000, critical: 3000 },
      userSatisfactionScore: { good: 80, warning: 60, critical: 40 },
      interactionTime: { good: 100, warning: 500, critical: 1000 },
      dataLoadTime: { good: 1000, warning: 3000, critical: 5000 },
      mappingOperationTime: { good: 2000, warning: 5000, critical: 10000 },
      errorRate: { good: 0, warning: 5, critical: 10 },
      successRate: { good: 95, warning: 85, critical: 70 },
    };

    const threshold = thresholds[metric] || thresholds.renderTime;
    if (value <= threshold.good) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
    if (value <= threshold.warning) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
  };

  // Format metric value
  const formatMetricValue = (metric: keyof PerformanceMetrics, value: number) => {
    switch (metric) {
      case 'renderTime':
      case 'searchResponseTime':
      case 'mappingOperationTime':
      case 'dataLoadTime':
        return `${value.toFixed(2)}ms`;
      case 'memoryUsage':
        return `${value.toFixed(2)}MB`;
      case 'errorRate':
      case 'successRate':
      case 'userSatisfactionScore':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  // Get recent events
  const recentEvents = useMemo(() => {
    return analytics.events
      .slice(-maxEventsToShow)
      .reverse()
      .map(event => ({
        ...event,
        timeAgo: Date.now() - event.timestamp,
      }));
  }, [analytics.events, maxEventsToShow]);

  const formatTimeAgo = (ms: number) => {
    if (ms < 1000) return 'Just now';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
  };

  const getSeverityColor = (severity: PerformanceEvent['severity']) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          title="Open Performance Dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-hidden ${className}`}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Dashboard</h3>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[calc(80vh-80px)] overflow-y-auto">
          {/* Component Info */}
          <div className="text-sm text-gray-600">
            <strong>Component:</strong> {componentName}
          </div>

          {/* Real-time Metrics */}
          {showRealTimeMetrics && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Real-time Metrics</h4>
              <div className="grid grid-cols-2 gap-3">
                {(['renderTime', 'searchResponseTime', 'successRate', 'userSatisfactionScore'] as const)
                  .map(metric => {
                    const value = analytics.metrics[metric];
                    const status = getPerformanceStatus(metric, value);
                    const trend = performanceTrends?.[metric as keyof typeof performanceTrends];
                    
                    return (
                      <div key={metric} className={`p-3 rounded-lg ${status.bg}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600 capitalize">
                            {metric.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          {trend && (
                            <span className={`text-xs ${
                              trend.trend === 'up' ? 'text-red-500' : 
                              trend.trend === 'down' ? 'text-green-500' : 'text-gray-500'
                            }`}>
                              {trend.trend === 'up' ? '↗' : trend.trend === 'down' ? '↘' : '→'}
                            </span>
                          )}
                        </div>
                        <div className={`text-lg font-semibold ${status.color}`}>
                          {formatMetricValue(metric, value)}
                        </div>
                        {trend && (
                          <div className="text-xs text-gray-500">
                            {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}% vs avg
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Memory Usage */}
          {showMemoryUsage && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Memory Usage</h4>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Current Usage</span>
                  <span className="font-medium">{formatMetricValue('memoryUsage', analytics.metrics.memoryUsage)}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((analytics.metrics.memoryUsage / 200) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* User Satisfaction */}
          {showUserSatisfaction && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">User Satisfaction Score</h4>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Score</span>
                  <span className="font-medium">{analytics.metrics.userSatisfactionScore.toFixed(1)}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      analytics.metrics.userSatisfactionScore >= 80 ? 'bg-green-500' :
                      analytics.metrics.userSatisfactionScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analytics.metrics.userSatisfactionScore}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Event History */}
          {showEventHistory && recentEvents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Recent Events</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recentEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(event.severity)}`}>
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-600">
                        {event.duration ? `${event.duration.toFixed(0)}ms` : 'N/A'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(event.timeAgo)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t border-gray-200">
            <button
              onClick={() => analytics.updateMemoryMetrics()}
              className="flex-1 px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Refresh Metrics
            </button>
            <button
              onClick={() => {
                setChartData([]);
                analytics.addEvent({
                  type: 'user_action',
                  metadata: { action: 'clear_chart_data' }
                });
              }}
              className="flex-1 px-3 py-2 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

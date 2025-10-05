/**
 * Enterprise Performance Monitoring Service
 * Centralized performance analytics and reporting
 * Inspired by Google Analytics, Microsoft Application Insights, and New Relic
 */

export interface PerformanceReport {
  id: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  componentName: string;
  metrics: {
    renderTime: number;
    memoryUsage: number;
    interactionTime: number;
    dataLoadTime: number;
    searchResponseTime: number;
    mappingOperationTime: number;
    errorRate: number;
    successRate: number;
    userSatisfactionScore: number;
  };
  events: PerformanceEvent[];
  userAgent: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export interface PerformanceEvent {
  id: string;
  type: 'render' | 'data_load' | 'search' | 'mapping' | 'error' | 'user_action';
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold_exceeded' | 'error_rate_high' | 'memory_leak' | 'slow_renders';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  componentName: string;
  metrics: Record<string, number>;
  resolved: boolean;
}

export interface PerformanceConfig {
  enableRealTimeMonitoring: boolean;
  enableErrorReporting: boolean;
  enableUserTracking: boolean;
  enableNetworkMonitoring: boolean;
  reportingEndpoint?: string;
  alertingEndpoint?: string;
  thresholds: {
    renderTime: number;
    memoryUsage: number;
    searchResponseTime: number;
    errorRate: number;
  };
  reportingInterval: number;
  maxEventsPerReport: number;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableRealTimeMonitoring: true,
  enableErrorReporting: true,
  enableUserTracking: false,
  enableNetworkMonitoring: true,
  thresholds: {
    renderTime: 16,
    memoryUsage: 100,
    searchResponseTime: 300,
    errorRate: 5,
  },
  reportingInterval: 30000, // 30 seconds
  maxEventsPerReport: 100,
};

class PerformanceMonitoringService {
  private config: PerformanceConfig;
  private sessionId: string;
  private userId?: string;
  private componentMetrics: Map<string, any> = new Map();
  private globalEvents: PerformanceEvent[] = [];
  private alerts: PerformanceAlert[] = [];
  private reportingInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    // Initialize session tracking
    this.trackSessionStart();

    // Start periodic reporting
    if (this.config.enableRealTimeMonitoring) {
      this.startPeriodicReporting();
    }

    // Monitor page visibility changes
    this.setupVisibilityMonitoring();

    // Monitor network changes
    if (this.config.enableNetworkMonitoring) {
      this.setupNetworkMonitoring();
    }

    // Monitor memory usage
    this.setupMemoryMonitoring();

    this.isInitialized = true;
    console.log('🚀 Performance Monitoring Service initialized');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trackSessionStart() {
    this.addEvent({
      type: 'user_action',
      metadata: {
        action: 'session_start',
        timestamp: Date.now(),
        url: window.location.href,
        referrer: document.referrer,
      }
    });
  }

  private setupVisibilityMonitoring() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.addEvent({
          type: 'user_action',
          metadata: { action: 'page_hidden' }
        });
      } else {
        this.addEvent({
          type: 'user_action',
          metadata: { action: 'page_visible' }
        });
      }
    });
  }

  private setupNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          this.addEvent({
            type: 'user_action',
            metadata: {
              action: 'network_change',
              effectiveType: connection.effectiveType,
              downlink: connection.downlink,
              rtt: connection.rtt,
            }
          });
        });
      }
    }
  }

  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        setInterval(() => {
          const memoryUsageMB = memory.usedJSHeapSize / 1024 / 1024;
          if (memoryUsageMB > this.config.thresholds.memoryUsage) {
            this.createAlert({
              type: 'memory_leak',
              severity: 'warning',
              message: `High memory usage detected: ${memoryUsageMB.toFixed(2)}MB`,
              componentName: 'global',
              metrics: { memoryUsage: memoryUsageMB }
            });
          }
        }, 10000); // Check every 10 seconds
      }
    }
  }

  private startPeriodicReporting() {
    this.reportingInterval = setInterval(() => {
      this.generateAndSendReport();
    }, this.config.reportingInterval);
  }

  // Public API methods
  public trackComponentMetrics(componentName: string, metrics: any) {
    this.componentMetrics.set(componentName, {
      ...metrics,
      lastUpdated: Date.now(),
    });

    // Check for performance issues
    this.checkPerformanceThresholds(componentName, metrics);
  }

  public addEvent(event: Omit<PerformanceEvent, 'id' | 'timestamp'>) {
    const fullEvent: PerformanceEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.globalEvents.push(fullEvent);

    // Keep only recent events to prevent memory leaks
    if (this.globalEvents.length > this.config.maxEventsPerReport * 2) {
      this.globalEvents = this.globalEvents.slice(-this.config.maxEventsPerReport);
    }

    // Check for error events
    if (event.type === 'error' && event.severity === 'critical') {
      this.createAlert({
        type: 'error_rate_high',
        severity: 'critical',
        message: `Critical error in ${event.metadata?.componentName || 'unknown component'}: ${event.metadata?.error || 'Unknown error'}`,
        componentName: event.metadata?.componentName || 'unknown',
        metrics: { errorCount: 1 }
      });
    }
  }

  public createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>) {
    const fullAlert: PerformanceAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.push(fullAlert);

    // Log alert
    console.warn(`🚨 Performance Alert: ${fullAlert.message}`, fullAlert);

    // Send alert if endpoint is configured
    if (this.config.alertingEndpoint) {
      this.sendAlert(fullAlert);
    }
  }

  private checkPerformanceThresholds(componentName: string, metrics: any) {
    const thresholds = this.config.thresholds;

    // Check render time
    if (metrics.renderTime > thresholds.renderTime) {
      this.createAlert({
        type: 'slow_renders',
        severity: metrics.renderTime > thresholds.renderTime * 2 ? 'critical' : 'warning',
        message: `Slow renders detected in ${componentName}: ${metrics.renderTime.toFixed(2)}ms`,
        componentName,
        metrics: { renderTime: metrics.renderTime }
      });
    }

    // Check search response time
    if (metrics.searchResponseTime > thresholds.searchResponseTime) {
      this.createAlert({
        type: 'threshold_exceeded',
        severity: 'warning',
        message: `Slow search response in ${componentName}: ${metrics.searchResponseTime.toFixed(2)}ms`,
        componentName,
        metrics: { searchResponseTime: metrics.searchResponseTime }
      });
    }

    // Check error rate
    if (metrics.errorRate > thresholds.errorRate) {
      this.createAlert({
        type: 'error_rate_high',
        severity: 'critical',
        message: `High error rate in ${componentName}: ${metrics.errorRate.toFixed(1)}%`,
        componentName,
        metrics: { errorRate: metrics.errorRate }
      });
    }
  }

  private async generateAndSendReport() {
    if (!this.config.reportingEndpoint) return;

    try {
      const report: PerformanceReport = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        componentName: 'global',
        metrics: this.aggregateMetrics(),
        events: this.globalEvents.slice(-this.config.maxEventsPerReport),
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: this.getConnectionInfo(),
      };

      await this.sendReport(report);

      // Clear sent events
      this.globalEvents = this.globalEvents.slice(-this.config.maxEventsPerReport);
    } catch (error) {
      console.error('Failed to generate performance report:', error);
    }
  }

  private aggregateMetrics() {
    const allMetrics = Array.from(this.componentMetrics.values());
    
    if (allMetrics.length === 0) {
      return {
        renderTime: 0,
        memoryUsage: 0,
        interactionTime: 0,
        dataLoadTime: 0,
        searchResponseTime: 0,
        mappingOperationTime: 0,
        errorRate: 0,
        successRate: 100,
        userSatisfactionScore: 100,
      };
    }

    return {
      renderTime: this.average(allMetrics.map(m => m.renderTime || 0)),
      memoryUsage: this.max(allMetrics.map(m => m.memoryUsage || 0)),
      interactionTime: this.average(allMetrics.map(m => m.interactionTime || 0)),
      dataLoadTime: this.average(allMetrics.map(m => m.dataLoadTime || 0)),
      searchResponseTime: this.average(allMetrics.map(m => m.searchResponseTime || 0)),
      mappingOperationTime: this.average(allMetrics.map(m => m.mappingOperationTime || 0)),
      errorRate: this.average(allMetrics.map(m => m.errorRate || 0)),
      successRate: this.average(allMetrics.map(m => m.successRate || 100)),
      userSatisfactionScore: this.average(allMetrics.map(m => m.userSatisfactionScore || 100)),
    };
  }

  private getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        return {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        };
      }
    }
    return undefined;
  }

  private async sendReport(report: PerformanceReport) {
    if (!this.config.reportingEndpoint) return;

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.error('Failed to send performance report:', error);
    }
  }

  private async sendAlert(alert: PerformanceAlert) {
    if (!this.config.alertingEndpoint) return;

    try {
      await fetch(this.config.alertingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.error('Failed to send performance alert:', error);
    }
  }

  // Utility methods
  private average(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private max(numbers: number[]): number {
    return Math.max(...numbers);
  }

  // Public getters
  public getMetrics() {
    return this.aggregateMetrics();
  }

  public getEvents() {
    return this.globalEvents;
  }

  public getAlerts() {
    return this.alerts;
  }

  public getConfig() {
    return this.config;
  }

  // Cleanup
  public destroy() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    this.isInitialized = false;
    console.log('🛑 Performance Monitoring Service destroyed');
  }
}

// Singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

// Export for testing
export { PerformanceMonitoringService };















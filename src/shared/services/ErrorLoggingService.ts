/**
 * Enterprise Error Logging Service
 * 
 * Centralized error logging, aggregation, and analytics for production monitoring.
 * Provides error tracking, aggregation, and reporting capabilities.
 */

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    component?: string;
    action?: string;
    userId?: string;
    userAgent?: string;
    url?: string;
  };
  metadata?: Record<string, any>;
}

export interface ErrorAggregation {
  errorType: string;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  affectedComponents: string[];
  affectedUsers: string[];
}

export interface ErrorLoggingConfig {
  enableLocalStorage: boolean;
  enableConsole: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  maxLocalLogs: number;
  aggregationWindow: number; // milliseconds
}

const DEFAULT_CONFIG: ErrorLoggingConfig = {
  enableLocalStorage: true,
  enableConsole: true,
  enableRemoteLogging: false,
  maxLocalLogs: 1000,
  aggregationWindow: 60000 // 1 minute
};

/**
 * Error Logging Service
 * Centralized error logging and analytics
 */
export class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private config: ErrorLoggingConfig;
  private logs: ErrorLogEntry[] = [];
  private aggregations: Map<string, ErrorAggregation> = new Map();
  private lastAggregationTime = Date.now();

  private constructor(config: Partial<ErrorLoggingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadLogsFromStorage();
    this.startAggregationTimer();
  }

  public static getInstance(config?: Partial<ErrorLoggingConfig>): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService(config);
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Log an error
   */
  public logError(
    message: string,
    error?: Error,
    context?: {
      component?: string;
      action?: string;
      userId?: string;
    },
    metadata?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level: 'error',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      },
      metadata
    };

    this.addLog(entry);
    this.updateAggregation(entry);
  }

  /**
   * Log a warning
   */
  public logWarning(
    message: string,
    context?: {
      component?: string;
      action?: string;
      userId?: string;
    },
    metadata?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level: 'warning',
      message,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      },
      metadata
    };

    this.addLog(entry);
  }

  /**
   * Log an info message
   */
  public logInfo(
    message: string,
    context?: {
      component?: string;
      action?: string;
      userId?: string;
    },
    metadata?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level: 'info',
      message,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      },
      metadata
    };

    this.addLog(entry);
  }

  /**
   * Add log entry
   */
  private addLog(entry: ErrorLogEntry): void {
    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.config.maxLocalLogs) {
      this.logs = this.logs.slice(-this.config.maxLocalLogs);
    }

    // Console logging
    if (this.config.enableConsole) {
      const logMethod = entry.level === 'error' ? console.error : entry.level === 'warning' ? console.warn : console.log;
      logMethod(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.error || entry.context);
    }

    // Local storage
    if (this.config.enableLocalStorage) {
      this.saveLogsToStorage();
    }

    // Remote logging
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemote(entry).catch(err => {
        // Use logger for error logging (logger.error always logs, even in production)
        const { logger } = require('../utils/logger');
        logger.error('Failed to send error log to remote:', err);
      });
    }
  }

  /**
   * Update error aggregation
   */
  private updateAggregation(entry: ErrorLogEntry): void {
    if (entry.level !== 'error' || !entry.error) {
      return;
    }

    const errorType = entry.error.name || 'UnknownError';
    const aggregation = this.aggregations.get(errorType) || {
      errorType,
      count: 0,
      firstOccurrence: entry.timestamp,
      lastOccurrence: entry.timestamp,
      affectedComponents: [],
      affectedUsers: []
    };

    aggregation.count++;
    aggregation.lastOccurrence = entry.timestamp;
    
    if (entry.context.component && !aggregation.affectedComponents.includes(entry.context.component)) {
      aggregation.affectedComponents.push(entry.context.component);
    }
    
    if (entry.context.userId && !aggregation.affectedUsers.includes(entry.context.userId)) {
      aggregation.affectedUsers.push(entry.context.userId);
    }

    this.aggregations.set(errorType, aggregation);
  }

  /**
   * Get error aggregations
   */
  public getErrorAggregations(): ErrorAggregation[] {
    return Array.from(this.aggregations.values());
  }

  /**
   * Get recent error logs
   */
  public getRecentErrors(limit: number = 100): ErrorLogEntry[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-limit)
      .reverse();
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    totalWarnings: number;
    uniqueErrorTypes: number;
    errorsLast24Hours: number;
    mostCommonError: string | null;
  } {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);

    const errorsLast24Hours = this.logs.filter(
      log => log.level === 'error' && log.timestamp >= last24Hours
    ).length;

    const mostCommonError = this.aggregations.size > 0
      ? Array.from(this.aggregations.entries())
          .sort((a, b) => b[1].count - a[1].count)[0][0]
      : null;

    return {
      totalErrors: this.logs.filter(log => log.level === 'error').length,
      totalWarnings: this.logs.filter(log => log.level === 'warning').length,
      uniqueErrorTypes: this.aggregations.size,
      errorsLast24Hours,
      mostCommonError
    };
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
    this.aggregations.clear();
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('errorLogs');
      localStorage.removeItem('errorAggregations');
    }
  }

  /**
   * Save logs to local storage
   */
  private saveLogsToStorage(): void {
    try {
      const logsToSave = this.logs.slice(-this.config.maxLocalLogs);
      localStorage.setItem('errorLogs', JSON.stringify(logsToSave));
      localStorage.setItem('errorAggregations', JSON.stringify(Array.from(this.aggregations.entries())));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  /**
   * Load logs from local storage
   */
  private loadLogsFromStorage(): void {
    try {
      const logsJson = localStorage.getItem('errorLogs');
      if (logsJson) {
        this.logs = JSON.parse(logsJson);
      }

      const aggregationsJson = localStorage.getItem('errorAggregations');
      if (aggregationsJson) {
        const entries = JSON.parse(aggregationsJson);
        this.aggregations = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  /**
   * Send log to remote endpoint
   */
  private async sendToRemote(entry: ErrorLogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Silently fail - don't throw errors from error logging
      console.error('Failed to send error log to remote:', error);
    }
  }

  /**
   * Start aggregation timer
   */
  private startAggregationTimer(): void {
    setInterval(() => {
      this.performAggregation();
    }, this.config.aggregationWindow);
  }

  /**
   * Perform periodic aggregation cleanup
   */
  private performAggregation(): void {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours

    // Remove old aggregations
    for (const [key, aggregation] of this.aggregations.entries()) {
      if (aggregation.lastOccurrence < cutoff) {
        this.aggregations.delete(key);
      }
    }

    this.lastAggregationTime = now;
  }
}







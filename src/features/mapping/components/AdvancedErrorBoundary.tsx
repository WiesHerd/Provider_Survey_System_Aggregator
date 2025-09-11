/**
 * Advanced Error Boundary with Circuit Breaker Pattern
 * Inspired by Netflix's Hystrix and Google's Error Reporting
 * Provides enterprise-grade error handling with automatic recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  recoveryAttempts: number;
}

export interface AdvancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, retryCount: number) => void;
  onRecovery?: (retryCount: number) => void;
  maxRetries?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enableAutoRecovery?: boolean;
  componentName?: string;
  errorReportingEndpoint?: string;
}

interface ErrorReport {
  id: string;
  timestamp: number;
  componentName: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo: {
    componentStack: string;
  };
  userAgent: string;
  url: string;
  retryCount: number;
  circuitBreakerState: string;
  performanceMetrics?: {
    memoryUsage?: number;
    renderTime?: number;
  };
}

export class AdvancedErrorBoundary extends Component<
  AdvancedErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private circuitBreakerTimeoutId: NodeJS.Timeout | null = null;
  private errorHistory: Error[] = [];
  private readonly maxErrorHistory = 10;

  constructor(props: AdvancedErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      circuitBreakerState: 'CLOSED',
      recoveryAttempts: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { 
      onError, 
      componentName = 'Unknown Component',
      errorReportingEndpoint,
      maxRetries = 3,
      circuitBreakerThreshold = 5,
      circuitBreakerTimeout = 30000
    } = this.props;

    // Update error history
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
    }

    // Update state
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1,
    });

    // Log error with context
    console.error(`🚨 Error Boundary caught error in ${componentName}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount + 1,
      circuitBreakerState: this.state.circuitBreakerState,
      errorHistory: this.errorHistory.length,
      timestamp: new Date().toISOString(),
    });

    // Check circuit breaker
    this.updateCircuitBreakerState(circuitBreakerThreshold, circuitBreakerTimeout);

    // Report error
    if (errorReportingEndpoint) {
      this.reportError(error, errorInfo, componentName);
    }

    // Call error callback
    onError?.(error, errorInfo, this.state.retryCount + 1);

    // Attempt auto-recovery if enabled
    if (this.props.enableAutoRecovery && this.state.retryCount < maxRetries) {
      this.attemptRecovery();
    }
  }

  private updateCircuitBreakerState(threshold: number, timeout: number) {
    const { circuitBreakerState } = this.state;
    const recentErrors = this.errorHistory.filter(
      (_, index) => index >= this.errorHistory.length - threshold
    );

    // Check if we should open the circuit breaker
    if (circuitBreakerState === 'CLOSED' && recentErrors.length >= threshold) {
      console.warn(`🔴 Circuit breaker OPENED for ${this.props.componentName} - too many errors`);
      
      this.setState({ circuitBreakerState: 'OPEN' });
      
      // Set timeout to attempt half-open
      this.circuitBreakerTimeoutId = setTimeout(() => {
        console.log(`🟡 Circuit breaker HALF-OPEN for ${this.props.componentName} - attempting recovery`);
        this.setState({ circuitBreakerState: 'HALF_OPEN' });
      }, timeout);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo, componentName: string) {
    if (!this.props.errorReportingEndpoint) return;

    try {
      const errorReport: ErrorReport = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        componentName,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack || '',
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount,
        circuitBreakerState: this.state.circuitBreakerState,
        performanceMetrics: this.getPerformanceMetrics(),
      };

      await fetch(this.props.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private getPerformanceMetrics() {
    const metrics: ErrorReport['performanceMetrics'] = {};
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024;
      }
    }
    
    return metrics;
  }

  private attemptRecovery() {
    const { maxRetries = 3, onRecovery } = this.props;
    const { retryCount, circuitBreakerState } = this.state;

    if (retryCount >= maxRetries) {
      console.error(`❌ Max retries (${maxRetries}) exceeded for ${this.props.componentName}`);
      return;
    }

    if (circuitBreakerState === 'OPEN') {
      console.log(`⏳ Circuit breaker is OPEN - skipping recovery attempt`);
      return;
    }

    console.log(`🔄 Attempting recovery for ${this.props.componentName} (attempt ${retryCount + 1}/${maxRetries})`);

    // Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        recoveryAttempts: this.state.recoveryAttempts + 1,
      });

      onRecovery?.(retryCount + 1);
      
      console.log(`✅ Recovery attempt ${retryCount + 1} completed for ${this.props.componentName}`);
    }, retryDelay);
  }

  private handleRetry = () => {
    this.attemptRecovery();
  };

  private handleReset = () => {
    // Clear all timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    if (this.circuitBreakerTimeoutId) {
      clearTimeout(this.circuitBreakerTimeoutId);
    }

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      circuitBreakerState: 'CLOSED',
      recoveryAttempts: 0,
    });

    // Clear error history
    this.errorHistory = [];
    
    console.log(`🔄 Error boundary reset for ${this.props.componentName}`);
  };

  componentWillUnmount() {
    // Cleanup timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    if (this.circuitBreakerTimeoutId) {
      clearTimeout(this.circuitBreakerTimeoutId);
    }
  }

  render() {
    const { 
      hasError, 
      error, 
      errorInfo, 
      retryCount, 
      circuitBreakerState,
      recoveryAttempts 
    } = this.state;
    
    const { 
      children, 
      fallback, 
      componentName = 'Component',
      enableAutoRecovery = true,
      maxRetries = 3 
    } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default error UI with enterprise styling
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-red-200">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Error Title */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h3>

            {/* Error Message */}
            <p className="text-sm text-gray-600 mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>

            {/* Circuit Breaker Status */}
            {circuitBreakerState !== 'CLOSED' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    circuitBreakerState === 'OPEN' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm text-yellow-800">
                    Circuit Breaker: {circuitBreakerState}
                  </span>
                </div>
              </div>
            )}

            {/* Error Details */}
            <details className="mb-4 text-left">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                <div><strong>Component:</strong> {componentName}</div>
                <div><strong>Retry Count:</strong> {retryCount}</div>
                <div><strong>Recovery Attempts:</strong> {recoveryAttempts}</div>
                <div><strong>Error:</strong> {error?.name}</div>
                {error?.stack && (
                  <div className="mt-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {enableAutoRecovery && retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  Try Again ({retryCount + 1}/{maxRetries})
                </button>
              )}
              
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Auto-recovery indicator */}
            {enableAutoRecovery && retryCount < maxRetries && (
              <p className="text-xs text-gray-500 mt-3">
                Auto-recovery will attempt in a few seconds...
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Set display name for debugging
(AdvancedErrorBoundary as any).displayName = 'AdvancedErrorBoundary';

/**
 * Survey Data Error Boundary Component
 * 
 * Provides error handling and retry mechanisms for components that load survey data
 * Shows user-friendly error messages and retry options
 */

import React, { Component, ReactNode } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { getDataService } from '../../services/DataService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error Boundary for Survey Data Loading
 * Catches errors and provides retry functionality
 */
export class SurveyDataErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SurveyDataErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = async () => {
    try {
      // Clear error state
      this.setState({
        hasError: false,
        error: null,
        retryCount: this.state.retryCount + 1
      });

      // Optionally trigger a retry callback
      if (this.props.onRetry) {
        await this.props.onRetry();
      }

      // Force re-render of children
      this.forceUpdate();
    } catch (error) {
      console.error('Retry failed:', error);
      this.setState({
        hasError: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An error occurred while loading survey data';
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                           errorMessage.toLowerCase().includes('fetch') ||
                           errorMessage.toLowerCase().includes('connection');

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white border border-red-200 rounded-xl">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Survey Data
          </h3>
          <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
            {isNetworkError 
              ? 'Unable to connect to the database. Please check your internet connection and try again.'
              : errorMessage}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
          {this.state.retryCount > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Retry attempt {this.state.retryCount}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for retrying survey data operations
 */
export function useSurveyDataRetry() {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const retry = React.useCallback(async (operation: () => Promise<any>, maxRetries: number = 3) => {
    setIsRetrying(true);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
      } catch (error) {
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          await new Promise(resolve => setTimeout(resolve, delay));
          setRetryCount(attempt + 1);
        } else {
          setIsRetrying(false);
          throw error;
        }
      }
    }
  }, []);

  return { retry, isRetrying, retryCount };
}

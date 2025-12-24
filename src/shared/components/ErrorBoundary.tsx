/**
 * Generic Error Boundary Component
 * 
 * Provides enterprise-grade error handling for any component.
 * Can be reused across the application for consistent error handling.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Collapse, IconButton } from '@mui/material';
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
  retryCount: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries: number;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.maxRetries = props.maxRetries || 3;
    this.state = { 
      hasError: false, 
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName = 'Component', onError } = this.props;
    
    logger.error(`Error Boundary (${componentName}) caught an error:`, error, errorInfo);
    
    // Call custom error handler if provided
    onError?.(error, errorInfo);
    
    // Log to error reporting service (if available)
    this.logErrorToService(error, errorInfo, componentName);
    
    this.setState({
      error,
      errorInfo
    });
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo, componentName: string) => {
    // In a real application, this would send to an error reporting service
    const errorReport = {
      component: componentName,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    logger.error('Error Report:', errorReport);
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Max retries reached, reload the page
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  private getErrorMessage = (error: Error): string => {
    // Provide user-friendly error messages based on error type
    if (error.message.includes('IndexedDB') || error.message.includes('database')) {
      return 'Database connection failed. This might be due to browser storage issues.';
    }
    
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Network error occurred. Please check your internet connection.';
    }
    
    if (error.message.includes('Permission') || error.message.includes('denied')) {
      return 'Permission denied. Please check your browser settings for local storage access.';
    }
    
    return 'An unexpected error occurred. Please try refreshing the page.';
  };

  private getRecoverySuggestions = (error: Error): string[] => {
    const suggestions: string[] = [];
    
    if (error.message.includes('IndexedDB') || error.message.includes('database')) {
      suggestions.push('Clear your browser cache and cookies');
      suggestions.push('Try using a different browser');
      suggestions.push('Check if your browser supports IndexedDB');
    }
    
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Check if you have firewall restrictions');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Refresh the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support if the problem persists');
    }
    
    return suggestions;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, showDetails, retryCount } = this.state;
      const { componentName = 'Component' } = this.props;
      
      if (!error) {
        return null;
      }

      const errorMessage = this.getErrorMessage(error);
      const suggestions = this.getRecoverySuggestions(error);

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 4,
            bgcolor: 'background.default'
          }}
        >
          <Box
            sx={{
              maxWidth: 600,
              width: '100%',
              textAlign: 'center'
            }}
          >
            <Box sx={{ mb: 3 }}>
              <ExclamationTriangleIcon 
                style={{ 
                  width: 64, 
                  height: 64, 
                  color: '#f59e0b',
                  margin: '0 auto'
                }} 
              />
            </Box>
            
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
              Something Went Wrong
            </Typography>
            
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                {errorMessage}
              </Typography>
            </Alert>

            {suggestions.length > 0 && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'left' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Suggestions:
                </Typography>
                {suggestions.map((suggestion, index) => (
                  <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    • {suggestion}
                  </Typography>
                ))}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
              <Button
                variant="contained"
                onClick={this.handleRetry}
                disabled={retryCount >= this.maxRetries}
                startIcon={<ArrowPathIcon className="w-5 h-5" />}
                sx={{ borderRadius: '8px', px: 3 }}
              >
                {retryCount >= this.maxRetries ? 'Max Retries Reached' : `Try Again (${retryCount}/${this.maxRetries})`}
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReload}
                sx={{ borderRadius: '8px', px: 3 }}
              >
                Reload Page
              </Button>
            </Box>

            {/* Error Details (for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="text"
                  onClick={this.toggleDetails}
                  startIcon={showDetails ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  sx={{ mb: 1 }}
                >
                  {showDetails ? 'Hide' : 'Show'} Error Details
                </Button>
                
                <Collapse in={showDetails}>
                  <Alert severity="info" sx={{ textAlign: 'left', mt: 1 }}>
                    <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      <strong>Component:</strong> {componentName}<br />
                      <strong>Error:</strong> {error.message}<br />
                      <strong>Stack:</strong> {error.stack}<br />
                      {this.state.errorInfo && (
                        <>
                          <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </Typography>
                  </Alert>
                </Collapse>
              </Box>
            )}
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}




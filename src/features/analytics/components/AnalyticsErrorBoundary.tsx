/**
 * Analytics Error Boundary
 * Provides enterprise-grade error handling for the analytics feature
 * 
 * Google-Level Error Handling:
 * - Graceful degradation
 * - User-friendly error messages
 * - Recovery options
 * - Diagnostic information for debugging
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Collapse, IconButton } from '@mui/material';
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
  retryCount: number;
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Analytics Error Boundary caught an error:', error, errorInfo);
    
    // Log to error reporting service (if available)
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, this would send to an error reporting service
    // For now, we'll just log to console with structured data
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('📊 Error Report:', errorReport);
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
    if (error.message.includes('IndexedDB')) {
      return 'Database connection failed. This might be due to browser storage issues.';
    }
    
    if (error.message.includes('Failed to load analytics data')) {
      return 'Unable to load survey data. Please check if you have uploaded any surveys.';
    }
    
    if (error.message.includes('Network')) {
      return 'Network error occurred while loading data. Please check your internet connection.';
    }
    
    if (error.message.includes('Permission')) {
      return 'Permission denied. Please check your browser settings for local storage access.';
    }
    
    return 'An unexpected error occurred while loading analytics data.';
  };

  private getRecoverySuggestions = (error: Error): string[] => {
    const suggestions: string[] = [];
    
    if (error.message.includes('IndexedDB')) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache and cookies');
      suggestions.push('Check if your browser supports IndexedDB');
      suggestions.push('Try using a different browser (Chrome, Firefox, Edge)');
    } else if (error.message.includes('Failed to load analytics data')) {
      suggestions.push('Upload some survey data first');
      suggestions.push('Check if your data was uploaded successfully');
      suggestions.push('Try refreshing the page');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support if the problem persists');
    }
    
    return suggestions;
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount, showDetails } = this.state;
      const errorMessage = error ? this.getErrorMessage(error) : 'An unknown error occurred';
      const suggestions = error ? this.getRecoverySuggestions(error) : [];
      const canRetry = retryCount < this.maxRetries;

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 3,
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
            {/* Error Icon */}
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

            {/* Error Title */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
              Analytics Error
            </Typography>

            {/* Error Message */}
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              {errorMessage}
            </Typography>

            {/* Error Alert */}
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                textAlign: 'left',
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>What happened?</strong><br />
                The analytics feature encountered an error while loading your data.
              </Typography>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Recovery suggestions:</strong>
              </Typography>
              
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {suggestions.map((suggestion, index) => (
                  <Typography key={index} component="li" variant="body2" sx={{ mb: 0.5 }}>
                    {suggestion}
                  </Typography>
                ))}
              </Box>
            </Alert>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
              {canRetry && (
                <Button
                  variant="contained"
                  startIcon={<ArrowPathIcon style={{ width: 20, height: 20 }} />}
                onClick={this.handleRetry}
                  sx={{ borderRadius: '8px', px: 3 }}
                >
                  Try Again ({this.maxRetries - retryCount} attempts left)
                </Button>
              )}
              
              <Button
                variant="outlined"
                onClick={this.handleReload}
                sx={{ borderRadius: '8px', px: 3 }}
              >
                Reload Page
              </Button>
            </Box>

            {/* Technical Details (Collapsible) */}
            {error && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="text"
                  onClick={this.toggleDetails}
                  endIcon={showDetails ? 
                    <ChevronDownIcon style={{ width: 20, height: 20 }} /> : 
                    <ChevronRightIcon style={{ width: 20, height: 20 }} />
                  }
                  sx={{ mb: 2 }}
                >
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                <Collapse in={showDetails}>
                  <Alert severity="info" sx={{ textAlign: 'left' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Error Details:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      <strong>Error:</strong> {error.message}
                    </Typography>
                    {error.stack && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        <strong>Stack Trace:</strong><br />
                        {error.stack}
                      </Typography>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', mt: 1 }}>
                        <strong>Component Stack:</strong><br />
                        {this.state.errorInfo.componentStack}
                      </Typography>
                    )}
                  </Alert>
                </Collapse>
              </Box>
            )}

            {/* Retry Count Info */}
            {retryCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                Retry attempt {retryCount} of {this.maxRetries}
              </Typography>
            )}
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
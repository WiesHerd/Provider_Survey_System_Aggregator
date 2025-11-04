/**
 * Upload Error Boundary
 * Catches upload errors gracefully and provides user-friendly error messages with recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Paper
} from '@mui/material';
import {
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { UploadErrorType, ERROR_TYPE_DESCRIPTIONS } from '../types/uploadStates';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  onClear?: () => void;
  onDismiss?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
}

export class UploadErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Upload Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to error reporting service if available
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, this would send to an error reporting service
    console.error('Upload Error Details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  };

  private getErrorType = (error: Error): UploadErrorType => {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    if (message.includes('parse') || message.includes('csv')) {
      return 'parsing';
    }
    
    if (message.includes('database') || message.includes('indexeddb')) {
      return 'database';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    
    if (message.includes('permission') || message.includes('denied')) {
      return 'permission';
    }
    
    return 'unknown';
  };

  private getErrorMessage = (error: Error): string => {
    const errorType = this.getErrorType(error);
    
    switch (errorType) {
      case 'validation':
        return 'The file format is invalid. Please check that your CSV file has the correct structure and try again.';
      
      case 'parsing':
        return 'There was an error reading your CSV file. Please ensure the file is not corrupted and try again.';
      
      case 'database':
        return 'There was an error saving your data. Please try again or refresh the page if the problem persists.';
      
      case 'network':
        return 'There was a network error. Please check your connection and try again.';
      
      case 'permission':
        return 'You do not have permission to perform this action. Please contact your administrator.';
      
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  };

  private getSuggestedAction = (error: Error): string | null => {
    const errorType = this.getErrorType(error);
    
    switch (errorType) {
      case 'validation':
        return 'Check that your CSV file has headers and data rows, and that all required columns are present.';
      
      case 'parsing':
        return 'Try opening the file in Excel or another CSV editor to check for formatting issues.';
      
      case 'database':
        return 'Try refreshing the page to reinitialize the database, or clear your browser cache.';
      
      case 'network':
        return 'Check your internet connection and try again.';
      
      case 'permission':
        return 'Contact your system administrator to check your permissions.';
      
      default:
        return 'Try refreshing the page or contact support if the problem continues.';
    }
  };

  private handleRetry = async () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      return;
    }

    this.setState(prev => ({ retryCount: prev.retryCount + 1 }));

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });

    // Call retry callback if provided
    this.props.onRetry?.();
  };

  private handleClear = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0
    });

    this.props.onClear?.();
  };

  private handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });

    this.props.onDismiss?.();
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, retryCount } = this.state;
      const errorType = error ? this.getErrorType(error) : 'unknown';
      const errorMessage = error ? this.getErrorMessage(error) : 'An unknown error occurred';
      const suggestedAction = error ? this.getSuggestedAction(error) : null;
      const canRetry = retryCount < this.maxRetries;

      return (
        <Paper 
          elevation={2}
          sx={{ 
            p: 3, 
            m: 2, 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'error.light',
            backgroundColor: 'error.50'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <ExclamationTriangleIcon 
              style={{ 
                width: 24, 
                height: 24, 
                color: '#ef4444',
                flexShrink: 0,
                marginTop: 2
              }} 
            />
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" color="error.main" sx={{ mb: 1 }}>
                Upload Failed
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {errorMessage}
              </Typography>

              {suggestedAction && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Suggestion:</strong> {suggestedAction}
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {canRetry && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<ArrowPathIcon style={{ width: 16, height: 16 }} />}
                    onClick={this.handleRetry}
                    sx={{ borderRadius: '6px' }}
                  >
                    Try Again ({this.maxRetries - retryCount} left)
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={this.handleClear}
                  sx={{ borderRadius: '6px' }}
                >
                  Clear and Start Over
                </Button>
                
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  onClick={this.handleDismiss}
                  sx={{ borderRadius: '6px' }}
                >
                  Dismiss
                </Button>
              </Box>

              {/* Error Details */}
              <Box>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.toggleDetails}
                  startIcon={showDetails ? 
                    <ChevronDownIcon style={{ width: 16, height: 16 }} /> : 
                    <ChevronRightIcon style={{ width: 16, height: 16 }} />
                  }
                  sx={{ 
                    textTransform: 'none',
                    color: 'text.secondary',
                    '&:hover': { backgroundColor: 'transparent' }
                  }}
                >
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                <Collapse in={showDetails}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Error Type: {ERROR_TYPE_DESCRIPTIONS[errorType]}
                    </Typography>
                    
                    {error && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Message: {error.message}
                      </Typography>
                    )}
                    
                    {error?.stack && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Stack Trace:
                        </Typography>
                        <Box 
                          component="pre" 
                          sx={{ 
                            fontSize: '0.75rem', 
                            color: 'text.secondary',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: 200,
                            overflow: 'auto',
                            bgcolor: 'grey.100',
                            p: 1,
                            borderRadius: 0.5
                          }}
                        >
                          {error.stack}
                        </Box>
                      </Box>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Component Stack:
                        </Typography>
                        <Box 
                          component="pre" 
                          sx={{ 
                            fontSize: '0.75rem', 
                            color: 'text.secondary',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: 200,
                            overflow: 'auto',
                            bgcolor: 'grey.100',
                            p: 1,
                            borderRadius: 0.5
                          }}
                        >
                          {errorInfo.componentStack}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Box>
            
            <IconButton
              size="small"
              onClick={this.handleDismiss}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { backgroundColor: 'transparent' }
              }}
            >
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </IconButton>
          </Box>
        </Paper>
      );
    }

    return this.props.children;
  }
}

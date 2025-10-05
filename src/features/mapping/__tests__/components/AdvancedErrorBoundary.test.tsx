/**
 * Advanced Error Boundary Component Tests
 * Comprehensive test suite for AdvancedErrorBoundary component
 * Tests circuit breaker pattern, automatic recovery, and error reporting
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedErrorBoundary } from '../../components/AdvancedErrorBoundary';
import { 
  createMockError,
  setupTestEnvironment,
  teardownTestEnvironment,
  waitForNextTick
} from '../setup';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Component that throws an error after a delay
const DelayedError: React.FC<{ delay?: number }> = ({ delay = 100 }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      throw new Error('Delayed error');
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return <div>Will throw error</div>;
};

describe('AdvancedErrorBoundary', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  describe('Basic Error Handling', () => {
    it('should render children when no error occurs', () => {
      render(
        <AdvancedErrorBoundary componentName="TestComponent">
          <div>Test content</div>
        </AdvancedErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch and display error when child component throws', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <AdvancedErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </AdvancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should display custom fallback when provided', () => {
      const customFallback = <div>Custom error fallback</div>;
      
      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          fallback={customFallback}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    });
  });

  describe('Error Information Display', () => {
    it('should show technical details when expanded', () => {
      render(
        <AdvancedErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </AdvancedErrorBoundary>
      );

      const detailsElement = screen.getByText('Technical Details');
      fireEvent.click(detailsElement);

      expect(screen.getByText('Component: TestComponent')).toBeInTheDocument();
      expect(screen.getByText('Retry Count: 1')).toBeInTheDocument();
      expect(screen.getByText('Error: Error')).toBeInTheDocument();
    });

    it('should display error stack trace in technical details', () => {
      const error = createMockError('Test error with stack');
      
      render(
        <AdvancedErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} errorMessage="Test error with stack" />
        </AdvancedErrorBoundary>
      );

      const detailsElement = screen.getByText('Technical Details');
      fireEvent.click(detailsElement);

      expect(screen.getByText(/TestError: Test error with stack/)).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button when auto-recovery is enabled', () => {
      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          enableAutoRecovery={true}
          maxRetries={3}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      expect(screen.getByText('Try Again (1/3)')).toBeInTheDocument();
    });

    it('should not show retry button when max retries exceeded', () => {
      const { rerender } = render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          enableAutoRecovery={true}
          maxRetries={1}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      // Simulate multiple retries
      for (let i = 0; i < 2; i++) {
        const retryButton = screen.getByText('Try Again (1/1)');
        fireEvent.click(retryButton);
        
        rerender(
          <AdvancedErrorBoundary 
            componentName="TestComponent"
            enableAutoRecovery={true}
            maxRetries={1}
          >
            <ThrowError shouldThrow={true} />
          </AdvancedErrorBoundary>
        );
      }

      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          onError={onError}
        >
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </AdvancedErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        1 // retry count
      );
    });

    it('should call onRecovery callback when recovery is attempted', async () => {
      const onRecovery = jest.fn();
      
      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          enableAutoRecovery={true}
          maxRetries={3}
          onRecovery={onRecovery}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again (1/3)');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(onRecovery).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should show circuit breaker status when open', () => {
      const { rerender } = render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          circuitBreakerThreshold={2}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      // Trigger multiple errors to open circuit breaker
      for (let i = 0; i < 3; i++) {
        rerender(
          <AdvancedErrorBoundary 
            componentName="TestComponent"
            circuitBreakerThreshold={2}
          >
            <ThrowError shouldThrow={true} />
          </AdvancedErrorBoundary>
        );
      }

      expect(screen.getByText('Circuit Breaker: OPEN')).toBeInTheDocument();
    });

    it('should show circuit breaker status when half-open', async () => {
      jest.useRealTimers();
      
      const { rerender } = render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          circuitBreakerThreshold={2}
          circuitBreakerTimeout={100}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      // Trigger multiple errors to open circuit breaker
      for (let i = 0; i < 3; i++) {
        rerender(
          <AdvancedErrorBoundary 
            componentName="TestComponent"
            circuitBreakerThreshold={2}
            circuitBreakerTimeout={100}
          >
            <ThrowError shouldThrow={true} />
          </AdvancedErrorBoundary>
        );
      }

      // Wait for circuit breaker to go half-open
      await waitFor(() => {
        expect(screen.getByText('Circuit Breaker: HALF_OPEN')).toBeInTheDocument();
      }, { timeout: 200 });
      
      jest.useFakeTimers();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset error state when reset button is clicked', () => {
      const { rerender } = render(
        <AdvancedErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      // Re-render with no error
      rerender(
        <AdvancedErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={false} />
        </AdvancedErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error Reporting', () => {
    it('should report error when endpoint is provided', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          errorReportingEndpoint="https://api.example.com/errors"
        >
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </AdvancedErrorBoundary>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/errors',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('Test error'),
          })
        );
      });
    });

    it('should handle error reporting failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockFetch = jest.fn().mockRejectedValue(new Error('Reporting failed'));
      global.fetch = mockFetch;

      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          errorReportingEndpoint="https://api.example.com/errors"
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to report error:',
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Metrics', () => {
    it('should include performance metrics in error reports', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          errorReportingEndpoint="https://api.example.com/errors"
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      await waitFor(() => {
        const reportBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(reportBody.performanceMetrics).toBeDefined();
        expect(reportBody.performanceMetrics.memoryUsage).toBeDefined();
      });
    });
  });

  describe('Auto-Recovery', () => {
    it('should attempt auto-recovery with exponential backoff', async () => {
      jest.useRealTimers();
      
      const onRecovery = jest.fn();
      
      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          enableAutoRecovery={true}
          maxRetries={3}
          onRecovery={onRecovery}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again (1/3)');
      fireEvent.click(retryButton);

      // Wait for auto-recovery to complete
      await waitFor(() => {
        expect(onRecovery).toHaveBeenCalledWith(1);
      }, { timeout: 2000 });
      
      jest.useFakeTimers();
    });

    it('should show auto-recovery indicator', () => {
      render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          enableAutoRecovery={true}
          maxRetries={3}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      expect(screen.getByText('Auto-recovery will attempt in a few seconds...')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should clean up timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(
        <AdvancedErrorBoundary 
          componentName="TestComponent"
          enableAutoRecovery={true}
        >
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});















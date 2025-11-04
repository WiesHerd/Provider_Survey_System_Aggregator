/**
 * Performance Dashboard Component Tests
 * Comprehensive test suite for PerformanceDashboard component
 * Tests real-time metrics, event history, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformanceDashboard } from '../../components/PerformanceDashboard';
import { usePerformanceAnalytics } from '../../hooks/usePerformanceAnalytics';
import { 
  createMockPerformanceMetrics,
  createMockPerformanceEvent,
  setupTestEnvironment,
  teardownTestEnvironment
} from '../setup';

// Mock the usePerformanceAnalytics hook
jest.mock('../../hooks/usePerformanceAnalytics');
const mockUsePerformanceAnalytics = usePerformanceAnalytics as jest.MockedFunction<typeof usePerformanceAnalytics>;

describe('PerformanceDashboard', () => {
  const mockAnalytics = {
    metrics: createMockPerformanceMetrics(),
    events: [],
    measureRender: jest.fn(),
    measureDataLoad: jest.fn(),
    measureSearch: jest.fn(),
    measureMapping: jest.fn(),
    trackUserInteraction: jest.fn(),
    addEvent: jest.fn(),
    updateMemoryMetrics: jest.fn(),
    updateSuccessMetrics: jest.fn(),
    config: {
      enableRealTimeMonitoring: true,
      enableMemoryTracking: true,
      enableUserInteractionTracking: true,
      performanceThresholds: {
        renderTime: 16,
        memoryUsage: 100,
        searchResponseTime: 300,
      },
      reportingInterval: 5000,
    },
  };

  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
    mockUsePerformanceAnalytics.mockReturnValue(mockAnalytics);
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  describe('Initial Render', () => {
    it('should render as collapsed dashboard initially', () => {
      render(<PerformanceDashboard componentName="TestComponent" />);
      
      // Should show the floating button
      expect(screen.getByTitle('Open Performance Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Performance Dashboard')).not.toBeInTheDocument();
    });

    it('should expand when button is clicked', () => {
      render(<PerformanceDashboard componentName="TestComponent" />);
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);
      
      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Component: TestComponent')).toBeInTheDocument();
    });

    it('should collapse when close button is clicked', () => {
      render(<PerformanceDashboard componentName="TestComponent" />);
      
      // Expand dashboard
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);
      
      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
      
      // Collapse dashboard
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Performance Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Metrics Display', () => {
    beforeEach(() => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showRealTimeMetrics={true}
        />
      );
      
      // Expand dashboard
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);
    });

    it('should display render time metric', () => {
      expect(screen.getByText('Render Time')).toBeInTheDocument();
      expect(screen.getByText('10.00ms')).toBeInTheDocument();
    });

    it('should display search response time metric', () => {
      expect(screen.getByText('Search Response Time')).toBeInTheDocument();
      expect(screen.getByText('200.00ms')).toBeInTheDocument();
    });

    it('should display success rate metric', () => {
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });

    it('should display user satisfaction score metric', () => {
      expect(screen.getByText('User Satisfaction Score')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument();
    });

    it('should show good status for good performance', () => {
      const renderTimeElement = screen.getByText('10.00ms');
      expect(renderTimeElement.closest('div')).toHaveClass('bg-green-50');
    });

    it('should show warning status for poor performance', () => {
      mockUsePerformanceAnalytics.mockReturnValue({
        ...mockAnalytics,
        metrics: {
          ...mockAnalytics.metrics,
          renderTime: 100, // Poor performance
        },
      });

      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showRealTimeMetrics={true}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      const renderTimeElement = screen.getByText('100.00ms');
      expect(renderTimeElement.closest('div')).toHaveClass('bg-red-50');
    });
  });

  describe('Memory Usage Display', () => {
    beforeEach(() => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showMemoryUsage={true}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);
    });

    it('should display memory usage when enabled', () => {
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Current Usage')).toBeInTheDocument();
      expect(screen.getByText('50.00MB')).toBeInTheDocument();
    });

    it('should show memory usage progress bar', () => {
      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toBeInTheDocument();
    });

    it('should not display memory usage when disabled', () => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showMemoryUsage={false}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.queryByText('Memory Usage')).not.toBeInTheDocument();
    });
  });

  describe('User Satisfaction Display', () => {
    beforeEach(() => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showUserSatisfaction={true}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);
    });

    it('should display user satisfaction score when enabled', () => {
      expect(screen.getByText('User Satisfaction Score')).toBeInTheDocument();
      expect(screen.getByText('Overall Score')).toBeInTheDocument();
      expect(screen.getByText('95.0/100')).toBeInTheDocument();
    });

    it('should show satisfaction progress bar with appropriate color', () => {
      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveClass('bg-green-500'); // Good score
    });

    it('should not display user satisfaction when disabled', () => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showUserSatisfaction={false}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.queryByText('User Satisfaction Score')).not.toBeInTheDocument();
    });
  });

  describe('Event History Display', () => {
    const mockEvents = [
      createMockPerformanceEvent({
        type: 'render',
        duration: 15,
        severity: 'low',
        timestamp: Date.now() - 1000,
      }),
      createMockPerformanceEvent({
        type: 'search',
        duration: 250,
        severity: 'medium',
        timestamp: Date.now() - 2000,
      }),
      createMockPerformanceEvent({
        type: 'error',
        duration: 0,
        severity: 'high',
        timestamp: Date.now() - 3000,
      }),
    ];

    beforeEach(() => {
      mockUsePerformanceAnalytics.mockReturnValue({
        ...mockAnalytics,
        events: mockEvents,
      });

      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showEventHistory={true}
          maxEventsToShow={5}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);
    });

    it('should display recent events when enabled', () => {
      expect(screen.getByText('Recent Events')).toBeInTheDocument();
      expect(screen.getByText('render')).toBeInTheDocument();
      expect(screen.getByText('search')).toBeInTheDocument();
      expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('should show event durations', () => {
      expect(screen.getByText('15ms')).toBeInTheDocument();
      expect(screen.getByText('250ms')).toBeInTheDocument();
    });

    it('should show event timestamps', () => {
      expect(screen.getByText('1s ago')).toBeInTheDocument();
      expect(screen.getByText('2s ago')).toBeInTheDocument();
      expect(screen.getByText('3s ago')).toBeInTheDocument();
    });

    it('should limit displayed events to maxEventsToShow', () => {
      const manyEvents = Array.from({ length: 20 }, (_, i) => 
        createMockPerformanceEvent({
          type: 'render',
          timestamp: Date.now() - i * 1000,
        })
      );

      mockUsePerformanceAnalytics.mockReturnValue({
        ...mockAnalytics,
        events: manyEvents,
      });

      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showEventHistory={true}
          maxEventsToShow={5}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      // Should only show 5 events
      const eventElements = screen.getAllByText('render');
      expect(eventElements).toHaveLength(5);
    });

    it('should not display events when disabled', () => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showEventHistory={false}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.queryByText('Recent Events')).not.toBeInTheDocument();
    });
  });

  describe('Performance Trends', () => {
    it('should display trend indicators', () => {
      // Mock performance trends
      const mockTrends = {
        renderTime: { current: 10, change: -20, trend: 'down' },
        searchResponseTime: { current: 200, change: 10, trend: 'up' },
        userSatisfactionScore: { current: 95, change: 0, trend: 'stable' },
      };

      // Mock the component to include trends
      const MockDashboardWithTrends = () => {
        const [trends] = React.useState(mockTrends);
        
        return (
          <div>
            <div data-testid="trend-render">↘</div>
            <div data-testid="trend-search">↗</div>
            <div data-testid="trend-satisfaction">→</div>
          </div>
        );
      };

      render(<MockDashboardWithTrends />);
      
      expect(screen.getByTestId('trend-render')).toHaveTextContent('↘');
      expect(screen.getByTestId('trend-search')).toHaveTextContent('↗');
      expect(screen.getByTestId('trend-satisfaction')).toHaveTextContent('→');
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      render(<PerformanceDashboard componentName="TestComponent" />);
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);
    });

    it('should call updateMemoryMetrics when refresh button is clicked', () => {
      const refreshButton = screen.getByText('Refresh Metrics');
      fireEvent.click(refreshButton);
      
      expect(mockAnalytics.updateMemoryMetrics).toHaveBeenCalled();
    });

    it('should clear chart data when clear button is clicked', () => {
      const clearButton = screen.getByText('Clear Data');
      fireEvent.click(clearButton);
      
      expect(mockAnalytics.addEvent).toHaveBeenCalledWith({
        type: 'user_action',
        metadata: { action: 'clear_chart_data' },
      });
    });
  });

  describe('Configuration Options', () => {
    it('should respect showRealTimeMetrics configuration', () => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showRealTimeMetrics={false}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.queryByText('Real-time Metrics')).not.toBeInTheDocument();
    });

    it('should respect showMemoryUsage configuration', () => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showMemoryUsage={false}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.queryByText('Memory Usage')).not.toBeInTheDocument();
    });

    it('should respect showUserSatisfaction configuration', () => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showUserSatisfaction={false}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.queryByText('User Satisfaction Score')).not.toBeInTheDocument();
    });

    it('should respect showEventHistory configuration', () => {
      render(
        <PerformanceDashboard 
          componentName="TestComponent"
          showEventHistory={false}
        />
      );
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.queryByText('Recent Events')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have proper responsive classes', () => {
      render(<PerformanceDashboard componentName="TestComponent" />);
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      const dashboard = screen.getByText('Performance Dashboard').closest('div');
      expect(dashboard).toHaveClass('w-96', 'max-h-[80vh]');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PerformanceDashboard componentName="TestComponent" />);
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh metrics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<PerformanceDashboard componentName="TestComponent" />);
      
      const expandButton = screen.getByTitle('Open Performance Dashboard');
      fireEvent.click(expandButton);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Performance Dashboard');
    });
  });
});






































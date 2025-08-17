import React, { Suspense, lazy } from 'react';
import LoadingSpinner from './ui/loading-spinner';

// Lazy load Charts component to reduce initial bundle size
const Charts = lazy(() => import('./Charts'));

interface ChartsWrapperProps {
  data?: any[];
  title?: string;
  type?: 'line' | 'bar' | 'pie';
  xAxisKey?: string;
  yAxisKey?: string;
}

const ChartsWrapper: React.FC<ChartsWrapperProps> = ({ data, title, type, xAxisKey, yAxisKey }) => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading charts..." size="lg" variant="primary" fullScreen={true} />}>
      <ErrorBoundary>
        <Charts data={data} title={title} type={type} xAxisKey={xAxisKey} yAxisKey={yAxisKey} />
      </ErrorBoundary>
    </Suspense>
  );
};

// Simple Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ChartsWrapper Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <LoadingSpinner 
          message="Something went wrong loading the charts. Please refresh the page." 
          size="lg" 
          variant="error" 
          fullScreen={true} 
        />
      );
    }

    return this.props.children;
  }
}

export default ChartsWrapper;

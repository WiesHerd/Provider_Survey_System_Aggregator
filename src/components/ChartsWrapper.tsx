import React, { Suspense, lazy } from 'react';

// Lazy load Charts component to reduce initial bundle size
const Charts = lazy(() => import('./Charts'));

// Loading component for Charts
const ChartsLoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    <span className="ml-2 text-gray-600">Loading charts...</span>
  </div>
);

interface ChartsWrapperProps {
  data?: any[];
  title?: string;
  type?: 'line' | 'bar' | 'pie';
  xAxisKey?: string;
  yAxisKey?: string;
}

const ChartsWrapper: React.FC<ChartsWrapperProps> = ({ data, title, type, xAxisKey, yAxisKey }) => {
  return (
    <Suspense fallback={<ChartsLoadingSpinner />}>
      <ErrorBoundary fallback={<ChartsLoadingSpinner />}>
        <Charts data={data} title={title} type={type} xAxisKey={xAxisKey} yAxisKey={yAxisKey} />
      </ErrorBoundary>
    </Suspense>
  );
};

// Simple Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
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
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default ChartsWrapper;

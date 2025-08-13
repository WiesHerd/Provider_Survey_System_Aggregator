import React, { Suspense, lazy } from 'react';

// Lazy load Charts component to reduce initial bundle size
const Charts = lazy(() => import('./Charts').then(module => ({ default: module.Charts })));

// Loading component for Charts
const ChartsLoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    <span className="ml-2 text-gray-600">Loading charts...</span>
  </div>
);

const ChartsWrapper: React.FC = () => {
  return (
    <Suspense fallback={<ChartsLoadingSpinner />}>
      <Charts />
    </Suspense>
  );
};

export default ChartsWrapper;

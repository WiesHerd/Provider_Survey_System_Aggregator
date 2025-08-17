import React, { Suspense } from 'react';
import LoadingSpinner from './ui/loading-spinner';

// Lazy load the CustomReports component
const CustomReports = React.lazy(() => import('./CustomReports'));

const CustomReportsWrapper: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CustomReports />
    </Suspense>
  );
};

export default CustomReportsWrapper;

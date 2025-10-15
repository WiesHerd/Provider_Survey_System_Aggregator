import React, { Suspense } from 'react';
import { SuspenseSpinner } from '../shared/components';

// Lazy load the CustomReports component
const CustomReports = React.lazy(() => import('./CustomReports'));

const CustomReportsWrapper: React.FC = () => {
  return (
    <Suspense fallback={<SuspenseSpinner message="Loading custom reports..." />}>
      <CustomReports />
    </Suspense>
  );
};

export default CustomReportsWrapper;

import React from 'react';
import { AnalyticsContainer } from '../features/analytics';

/**
 * Analytics Wrapper Component
 * Now uses the refactored analytics feature for better maintainability
 */
const AnalyticsWrapper: React.FC = () => {
  return <AnalyticsContainer />;
};

export default AnalyticsWrapper;

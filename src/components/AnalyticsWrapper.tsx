import React from 'react';
import SurveyAnalytics from './SurveyAnalytics';

/**
 * Analytics Wrapper Component
 * This ensures the analytics screen works properly with the legacy component
 * while we plan the refactoring to the feature-based version
 */
const AnalyticsWrapper: React.FC = () => {
  return <SurveyAnalytics />;
};

export default AnalyticsWrapper;

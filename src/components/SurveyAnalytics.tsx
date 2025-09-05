/**
 * SurveyAnalytics Component
 * Refactored to use the new modular analytics feature
 */

import React from 'react';
import { AnalyticsContainer } from '../features/analytics';

/**
 * Main SurveyAnalytics component
 * Now uses the refactored analytics feature for better maintainability
 */
const SurveyAnalytics: React.FC = () => {
  return <AnalyticsContainer />;
};

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics;

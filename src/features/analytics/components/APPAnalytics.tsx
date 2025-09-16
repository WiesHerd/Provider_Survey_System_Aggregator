/**
 * APP Analytics Component
 * 
 * Provider-specific analytics view for Advanced Practice Provider (APP) data only.
 * This component filters and displays analytics specifically for APP compensation data.
 */

import React from 'react';
import { useProviderContext } from '../../../contexts/ProviderContext';
import SurveyAnalytics from './SurveyAnalytics';
import { ProviderTypeBadge } from '../../../shared/components';

/**
 * APP Analytics Component
 * 
 * Wraps the main SurveyAnalytics component with APP-specific filtering
 * and displays a provider type badge to indicate the current view.
 */
export const APPAnalytics: React.FC = () => {
  const { selectedProviderType } = useProviderContext();

  return (
    <div className="space-y-6">
      {/* Provider Type Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">APP Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analysis of Advanced Practice Provider compensation data
          </p>
        </div>
        <ProviderTypeBadge providerType="APP" size="lg" />
      </div>

      {/* Analytics Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <SurveyAnalytics />
      </div>
    </div>
  );
};

export default APPAnalytics;

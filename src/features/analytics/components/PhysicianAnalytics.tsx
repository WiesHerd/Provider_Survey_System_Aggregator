/**
 * Physician Analytics Component
 * 
 * Provider-specific analytics view for Physician data only.
 * This component filters and displays analytics specifically for Physician compensation data.
 */

import React from 'react';
import { useProviderContext } from '../../../contexts/ProviderContext';
import SurveyAnalytics from './SurveyAnalytics';
import { ProviderTypeBadge } from '../../../shared/components';

/**
 * Physician Analytics Component
 * 
 * Wraps the main SurveyAnalytics component with Physician-specific filtering
 * and displays a provider type badge to indicate the current view.
 */
export const PhysicianAnalytics: React.FC = () => {
  const { selectedProviderType } = useProviderContext();

  return (
    <div className="space-y-6">
      {/* Provider Type Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Physician Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analysis of Physician compensation data
          </p>
        </div>
        <ProviderTypeBadge providerType="PHYSICIAN" size="lg" />
      </div>

      {/* Analytics Content - Pass provider type filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <SurveyAnalytics providerTypeFilter="PHYSICIAN" />
      </div>
    </div>
  );
};

export default PhysicianAnalytics;
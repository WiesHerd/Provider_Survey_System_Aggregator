/**
 * APP FMV Component
 * 
 * Provider-specific Fair Market Value calculator for Advanced Practice Provider (APP) data only.
 * This component provides FMV calculations specifically for APP compensation.
 */

import React from 'react';
import { useProviderContext } from '../../../contexts/ProviderContext';
import FairMarketValue from '../../../components/FairMarketValue';
import { ProviderTypeBadge } from '../../../shared/components';

/**
 * APP FMV Component
 * 
 * Wraps the main FairMarketValue component with APP-specific filtering
 * and displays a provider type badge to indicate the current view.
 */
export const APPFMV: React.FC = () => {
  const { selectedProviderType } = useProviderContext();

  return (
    <div className="space-y-6">
      {/* Provider Type Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">APP Fair Market Value</h1>
          <p className="text-gray-600 mt-1">
            Calculate and compare APP compensation against market data
          </p>
        </div>
        <ProviderTypeBadge providerType="APP" size="lg" />
      </div>

      {/* FMV Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <FairMarketValue />
      </div>
    </div>
  );
};

export default APPFMV;

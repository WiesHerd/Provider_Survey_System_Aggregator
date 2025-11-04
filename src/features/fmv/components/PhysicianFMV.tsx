/**
 * Physician FMV Component
 * 
 * Provider-specific Fair Market Value calculator for Physician data only.
 * This component provides FMV calculations specifically for physician compensation.
 */

import React from 'react';
import { useProviderContext } from '../../../contexts/ProviderContext';
import FairMarketValue from '../../../components/FairMarketValue';
import { ProviderTypeBadge } from '../../../shared/components';

/**
 * Physician FMV Component
 * 
 * Wraps the main FairMarketValue component with physician-specific filtering
 * and displays a provider type badge to indicate the current view.
 */
export const PhysicianFMV: React.FC = () => {
  const { selectedProviderType } = useProviderContext();

  return (
    <div className="space-y-6">
      {/* Provider Type Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Physician Fair Market Value</h1>
          <p className="text-gray-600 mt-1">
            Calculate and compare physician compensation against market data
          </p>
        </div>
        <ProviderTypeBadge providerType="PHYSICIAN" size="lg" />
      </div>

      {/* FMV Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <FairMarketValue />
      </div>
    </div>
  );
};

export default PhysicianFMV;

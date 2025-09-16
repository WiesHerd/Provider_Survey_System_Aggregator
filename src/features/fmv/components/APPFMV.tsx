/**
 * APP FMV Component
 * 
 * Provider-specific Fair Market Value calculator for Advanced Practice Provider (APP) data only.
 * This component provides FMV calculations specifically for APP compensation.
 */

import React, { memo } from 'react';
import FairMarketValue from '../../../components/FairMarketValue';

/**
 * APP FMV Component
 * 
 * Provider-specific Fair Market Value calculator for APP data.
 * Uses the main FairMarketValue component which will automatically
 * filter data based on the current provider type context.
 */
export const APPFMV: React.FC = memo(() => {
  return (
    <div className="space-y-6">
      {/* Provider Type Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">APP Fair Market Value</h1>
          <p className="text-gray-600 mt-1">
            Calculate and compare APP compensation against market data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Advanced Practice Provider
          </span>
        </div>
      </div>

      {/* FMV Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <FairMarketValue />
      </div>
    </div>
  );
});

export default APPFMV;

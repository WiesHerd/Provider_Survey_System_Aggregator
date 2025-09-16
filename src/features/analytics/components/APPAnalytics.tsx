/**
 * APP Analytics Component
 * 
 * Provider-specific analytics view for Advanced Practice Provider (APP) data only.
 * This component filters and displays analytics specifically for APP compensation data.
 */

import React, { memo, useMemo } from 'react';
import { useAnalyticsData, AnalyticsTable, AnalyticsFilters } from '../index';
import { useYear } from '../../../contexts/YearContext';

/**
 * APP Analytics Component
 * 
 * Provider-specific analytics for Advanced Practice Provider data.
 * Automatically filters data to show only APP compensation data.
 */
export const APPAnalytics: React.FC = memo(() => {
  const { currentYear } = useYear();
  
  // Initialize analytics data hook with APP-specific filtering
  const {
    data,
    allData,
    loading,
    error,
    filters,
    setFilters,
    exportToExcel,
    exportToCSV
  } = useAnalyticsData({
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: 'APP', // Filter for APP data only
    year: ''
  });

  // Generate filter options for APP data only
  const filterOptions = useMemo(() => {
    console.log('🔍 APPAnalytics: Generating filter options for APP data from', allData.length, 'records');
    
    // Filter data to APP only for generating options
    const appData = allData.filter(row => row.providerType === 'APP');
    
    const availableSpecialties = [...new Set(appData.map(row => row.standardizedName).filter((item): item is string => Boolean(item)))].sort();
    const availableSources = [...new Set(appData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].sort();
    const availableRegions = [...new Set(appData.map(row => row.geographicRegion).filter((item): item is string => Boolean(item)))].sort();
    const availableYears = [...new Set(appData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();

    console.log('🔍 APPAnalytics: APP filter options - specialties:', availableSpecialties.length, 'sources:', availableSources.length, 'regions:', availableRegions.length, 'years:', availableYears.length);

    return {
      specialties: availableSpecialties,
      sources: availableSources,
      regions: availableRegions,
      providerTypes: ['APP'], // Only APP available
      years: availableYears
    };
  }, [allData, currentYear]);

  return (
    <div className="space-y-6">
      {/* Provider Type Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">APP Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analysis of Advanced Practice Provider compensation data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Advanced Practice Provider
          </span>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="flex flex-col space-y-6">
        {/* Filters Section */}
        <div className="w-full">
          <AnalyticsFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableSpecialties={filterOptions.specialties}
            availableSources={filterOptions.sources}
            availableRegions={filterOptions.regions}
            availableProviderTypes={filterOptions.providerTypes}
            availableYears={filterOptions.years}
          />
        </div>

        {/* Data Table Section */}
        <div className="w-full">
          <AnalyticsTable
            data={data}
            loading={loading}
            error={error}
            onExport={exportToExcel}
          />
        </div>
      </div>
    </div>
  );
});

export default APPAnalytics;

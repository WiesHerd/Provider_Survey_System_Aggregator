/**
 * Analytics Feature - Main Survey Analytics Component
 * 
 * This is the main component that orchestrates the analytics feature.
 * Following enterprise patterns for component composition and separation of concerns.
 */

import React, { memo, useMemo } from 'react';
import { useAnalyticsData, AnalyticsTable, AnalyticsFilters } from '../index';
import { useYear } from '../../../contexts/YearContext';

/**
 * Main SurveyAnalytics component
 * 
 * This component orchestrates the analytics feature by:
 * 1. Managing data fetching and state
 * 2. Providing filter controls
 * 3. Displaying data in a structured table
 * 4. Handling export functionality
 */
const SurveyAnalytics: React.FC = memo(() => {
  const { currentYear } = useYear();
  
  // Initialize analytics data hook
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
    providerType: '',
    year: ''
  });


  // Generate cascading filter options based on current filter state
  const filterOptions = useMemo(() => {
    console.log('🔍 SurveyAnalytics: Generating cascading filter options from', allData.length, 'all data records');
    console.log('🔍 SurveyAnalytics: Current filters:', filters);
    
    // Enterprise-grade UX: Always show ALL available options
    // This allows users to easily change any filter at any time without being locked into cascading behavior
    console.log('🔍 SurveyAnalytics: Generating all available options for enterprise-grade UX');
    
    // Generate options from the FULL dataset (not filtered)
    // This allows users to change any filter at any time
    const availableSpecialties = [...new Set(allData.map(row => row.standardizedName).filter((item): item is string => Boolean(item)))].sort();
    const availableSources = [...new Set(allData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].sort();
    const availableRegions = [...new Set(allData.map(row => row.geographicRegion).filter((item): item is string => Boolean(item)))].sort();
    const availableProviderTypes = [...new Set(allData.map(row => row.providerType).filter((item): item is string => Boolean(item)))].sort();
    const availableYears = [...new Set(allData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();

    console.log('🔍 SurveyAnalytics: Cascading filter options - specialties:', availableSpecialties.length, 'sources:', availableSources.length, 'regions:', availableRegions.length, 'providerTypes:', availableProviderTypes.length, 'years:', availableYears.length);

    return {
      specialties: availableSpecialties,
      sources: availableSources,
      regions: availableRegions,
      providerTypes: availableProviderTypes,
      years: availableYears
    };
  }, [allData, filters, currentYear]);

  return (
    <div className="flex flex-col space-y-6">
      {/* Fixed Filters Section - Left-aligned, reasonable width */}
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

      {/* Data Table Section - Contained with horizontal scroll */}
      <div className="w-full">
        <AnalyticsTable
          data={data}
          loading={loading}
          error={error}
          onExport={exportToExcel}
        />
      </div>
    </div>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics;
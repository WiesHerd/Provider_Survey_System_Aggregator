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


  // Extract unique values for filter options from ALL data (not filtered data)
  const filterOptions = useMemo(() => {
    console.log('🔍 SurveyAnalytics: Generating filter options from', allData.length, 'all data records');
    
    // Get all unique values from the full dataset
    // Use standardizedName for specialties (these are already the normalized names from mappings)
    const allSpecialties = [...new Set(allData.map(row => row.standardizedName).filter((item): item is string => Boolean(item)))].sort();
    const allSources = [...new Set(allData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].sort();
    const allRegions = [...new Set(allData.map(row => row.geographicRegion).filter((item): item is string => Boolean(item)))].sort();
    const allProviderTypes = [...new Set(allData.map(row => row.providerType).filter((item): item is string => Boolean(item)))].sort();
    const allYears = [...new Set(allData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();

    console.log('🔍 SurveyAnalytics: All filter options - specialties:', allSpecialties.length, 'sources:', allSources.length, 'regions:', allRegions.length, 'providerTypes:', allProviderTypes.length, 'years:', allYears.length);
    console.log('🔍 SurveyAnalytics: Normalized specialties:', allSpecialties.filter(s => s.toLowerCase().includes('allergy')));

    return {
      specialties: allSpecialties,
      sources: allSources,
      regions: allRegions,
      providerTypes: allProviderTypes,
      years: allYears
    };
  }, [allData, currentYear]);

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
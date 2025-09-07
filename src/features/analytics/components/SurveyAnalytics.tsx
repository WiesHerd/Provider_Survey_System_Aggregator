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

  // Normalize specialty name for deduplication (same logic as AnalyticsDataService)
  const normalizeSpecialtyName = (specialty: string): string => {
    if (!specialty) return '';
    
    return specialty
      .toLowerCase()
      .replace(/\s+and\s+/g, ' ')  // Replace "and" with space
      .replace(/\s+/g, ' ')        // Normalize multiple spaces
      .trim();
  };

  // Extract unique values for filter options from ALL data (not filtered data)
  const filterOptions = useMemo(() => {
    console.log('🔍 SurveyAnalytics: Generating filter options from', allData.length, 'all data records');
    
    // Get all unique values from the full dataset
    // Use standardizedName for specialties (parent/standardized names from mappings)
    const rawSpecialties = allData.map(row => row.standardizedName).filter((item): item is string => Boolean(item));
    
    // Normalize and deduplicate specialties to avoid showing multiple variations
    const normalizedSpecialtyMap = new Map<string, string>();
    rawSpecialties.forEach(specialty => {
      const normalized = normalizeSpecialtyName(specialty);
      if (!normalizedSpecialtyMap.has(normalized)) {
        // Use the first occurrence as the canonical name
        normalizedSpecialtyMap.set(normalized, specialty);
      }
    });
    
    const allSpecialties = Array.from(normalizedSpecialtyMap.values()).sort();
    const allSources = [...new Set(allData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].sort();
    const allRegions = [...new Set(allData.map(row => row.geographicRegion).filter((item): item is string => Boolean(item)))].sort();
    const allProviderTypes = [...new Set(allData.map(row => row.providerType).filter((item): item is string => Boolean(item)))].sort();
    const allYears = [...new Set(allData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();

    console.log('🔍 SurveyAnalytics: All filter options - specialties:', allSpecialties.length, 'sources:', allSources.length, 'regions:', allRegions.length, 'providerTypes:', allProviderTypes.length, 'years:', allYears.length);
    console.log('🔍 SurveyAnalytics: Deduplicated specialties:', allSpecialties.filter(s => s.toLowerCase().includes('allergy')));

    return {
      specialties: allSpecialties,
      sources: allSources,
      regions: allRegions,
      providerTypes: allProviderTypes,
      years: allYears
    };
  }, [allData, currentYear]);

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <AnalyticsFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableSpecialties={filterOptions.specialties}
        availableSources={filterOptions.sources}
        availableRegions={filterOptions.regions}
        availableProviderTypes={filterOptions.providerTypes}
        availableYears={filterOptions.years}
      />

      {/* Data Table Section */}
      <AnalyticsTable
        data={data}
        loading={loading}
        error={error}
        onExport={exportToExcel}
      />
    </div>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics;
/**
 * Analytics Feature - Main Survey Analytics Component
 * 
 * This is the main component that orchestrates the analytics feature.
 * Following enterprise patterns for component composition and separation of concerns.
 */

import React, { memo, useMemo } from 'react';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsTable } from './AnalyticsTable';
import { AnalyticsFilters } from './AnalyticsFilters';
import { useYear } from '../../../contexts/YearContext';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { filterAnalyticsData } from '../utils/analyticsCalculations';

interface SurveyAnalyticsProps {
  providerTypeFilter?: 'PHYSICIAN' | 'APP';
}

/**
 * Main SurveyAnalytics component
 * 
 * This component orchestrates the analytics feature by:
 * 1. Managing data fetching and state
 * 2. Providing filter controls
 * 3. Displaying data in a structured table
 * 4. Handling export functionality
 */
const SurveyAnalytics: React.FC<SurveyAnalyticsProps> = memo(({ providerTypeFilter }) => {
  const { currentYear } = useYear();
  const { selectedProviderType } = useProviderContext();
  
  // Use the provider type from context (sidebar selection) or fallback to prop
  const effectiveProviderType = selectedProviderType || providerTypeFilter;
  
  // Helper function to categorize provider types into PHYSICIAN/APP categories
  const categorizeProviderType = (providerType: string): 'PHYSICIAN' | 'APP' | 'OTHER' => {
    if (!providerType) return 'OTHER';
    
    const lower = providerType.toLowerCase();
    
    // APP categories (check these first to avoid conflicts with "Physician Assistant")
    if (lower.includes('nurse practitioner') || lower.includes('np') || 
        lower.includes('physician assistant') || lower.includes('pa') || 
        lower.includes('crna') || lower.includes('advanced practice') || 
        lower.includes('app')) {
      return 'APP';
    }
    
    // Physician categories (check after APP to avoid conflicts)
    if (lower.includes('physician') || lower.includes('md') || lower.includes('do') || 
        lower.includes('doctor') || lower.includes('phd')) {
      return 'PHYSICIAN';
    }
    
    return 'OTHER';
  };
  
  // Initialize analytics data hook with empty filters (no pre-selection)
  const {
    allData,
    loading,
    loadingProgress,
    error,
    filters,
    setFilters,
    exportToExcel
  } = useAnalyticsData({
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '', // Don't pre-select provider type in filters
    year: ''
  });

  // Apply provider type filtering behind the scenes, then apply UI filters
  const data = useMemo(() => {
    // First apply provider type filtering if specified
    let providerFilteredData = allData;
    if (effectiveProviderType) {
      providerFilteredData = allData.filter(row => {
        const category = categorizeProviderType(row.providerType || '');
        return category === effectiveProviderType;
      });
    }
    
    // Then apply UI filters to the provider-filtered data
    return filterAnalyticsData(providerFilteredData, filters);
  }, [allData, filters, effectiveProviderType]);

  // Generate cascading filter options based on current filter state and provider type
  const filterOptions = useMemo(() => {
    
    // Start with all data
    let filteredData = allData;
    
    // Apply provider type filtering first
    if (effectiveProviderType) {
      filteredData = filteredData.filter(row => {
        const category = categorizeProviderType(row.providerType || '');
        return category === effectiveProviderType;
      });
    }
    
    // Apply cascading filters - each filter affects the available options for others
    let cascadingData = filteredData;
    
    // If year is selected, filter by year first
    if (filters.year) {
      cascadingData = cascadingData.filter(row => row.surveyYear === filters.year);
    }
    
    // If specialty is selected, filter by specialty
    if (filters.specialty) {
      cascadingData = cascadingData.filter(row => row.standardizedName === filters.specialty);
    }
    
    // If survey source is selected, filter by survey source
    if (filters.surveySource) {
      cascadingData = cascadingData.filter(row => row.surveySource === filters.surveySource);
    }
    
    // If region is selected, filter by region
    if (filters.geographicRegion) {
      cascadingData = cascadingData.filter(row => row.geographicRegion === filters.geographicRegion);
    }
    
    // Generate options from the cascading-filtered dataset
    const availableSpecialties = [...new Set(cascadingData.map(row => row.standardizedName).filter((item): item is string => Boolean(item)))].sort();
    const availableSources = [...new Set(cascadingData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].sort();
    const availableRegions = [...new Set(cascadingData.map(row => row.geographicRegion).filter((item): item is string => Boolean(item)))].sort();
    const availableProviderTypes = [...new Set(cascadingData.map(row => row.providerType).filter((item): item is string => Boolean(item)))].sort();
    const availableYears = [...new Set(cascadingData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();


    return {
      specialties: availableSpecialties,
      sources: availableSources,
      regions: availableRegions,
      providerTypes: availableProviderTypes,
      years: availableYears
    };
  }, [allData, filters, currentYear, effectiveProviderType, providerTypeFilter]);

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
          data={data} // This will be filtered by the hook based on UI filters
          loading={loading}
          loadingProgress={loadingProgress}
          error={error}
          onExport={exportToExcel}
        />
      </div>
    </div>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics;
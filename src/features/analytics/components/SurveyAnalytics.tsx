/**
 * Analytics Feature - Main Survey Analytics Component
 * 
 * This is the main component that orchestrates the analytics feature.
 * Following enterprise patterns for component composition and separation of concerns.
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsTable } from './AnalyticsTable';
import { AnalyticsFilters } from './AnalyticsFilters';
import { useYear } from '../../../contexts/YearContext';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { filterAnalyticsData } from '../utils/analyticsCalculations';
import { VariableDiscoveryService } from '../services/variableDiscoveryService';
import { DEFAULT_VARIABLES } from '../types/variables';

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
  console.log('🔍 SurveyAnalytics: Component rendered');
  const { currentYear } = useYear();
  const { selectedProviderType } = useProviderContext();
  
  // NEW: Variable selection state
  const [selectedVariables, setSelectedVariables] = useState<string[]>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('analytics_selected_variables');
    const variables = saved ? JSON.parse(saved) : [...DEFAULT_VARIABLES];
    console.log('🔍 SurveyAnalytics: selectedVariables from localStorage/defaults:', variables);
    return variables;
  });
  
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [isDiscoveringVariables, setIsDiscoveringVariables] = useState(false);
  
  // Use the provider type from context (sidebar selection) or fallback to prop
  const effectiveProviderType = selectedProviderType || providerTypeFilter;
  
  // NEW: Discover variables on mount
  useEffect(() => {
    const discoverVariables = async () => {
      try {
        setIsDiscoveringVariables(true);
        const service = VariableDiscoveryService.getInstance();
        const discovered = await service.discoverAllVariables();
        setAvailableVariables(discovered.map(v => v.normalizedName));
      } catch (error) {
        console.error('Failed to discover variables:', error);
        setAvailableVariables([]);
      } finally {
        setIsDiscoveringVariables(false);
      }
    };
    
    discoverVariables();
  }, []);
  
  // Save to localStorage when variables change
  useEffect(() => {
    localStorage.setItem('analytics_selected_variables', JSON.stringify(selectedVariables));
  }, [selectedVariables]);
  
  // TEMPORARILY DISABLED: Cache clearing to stop infinite loop
  // TODO: Re-enable cache clearing once the infinite loop issue is resolved
  /*
  useEffect(() => {
    const hasClearedCache = sessionStorage.getItem('analytics_cache_cleared');
    if (!hasClearedCache) {
      try {
        const { AnalyticsDataService } = require('../services/analyticsDataService');
        const service = new AnalyticsDataService();
        service.clearCache();
        sessionStorage.setItem('analytics_cache_cleared', 'true');
        console.log('🔄 Cleared analytics cache once for fresh data fetch');
      } catch (error) {
        console.warn('Failed to clear analytics cache:', error);
      }
    }
  }, []);
  */
  
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
  }, selectedVariables); // NEW: Pass selected variables to hook

  // Apply provider type filtering behind the scenes, then apply UI filters
  const data = useMemo(() => {
    // First apply provider type filtering if specified
    let providerFilteredData = allData;
    if (effectiveProviderType && effectiveProviderType !== 'BOTH') {
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
    
    // Get unique regions and create formatted display options
    const uniqueRegions = [...new Set(cascadingData.map(row => row.geographicRegion).filter((item): item is string => Boolean(item)))].sort();
    
    // Create region mapping for display vs. actual values
    const regionMapping = new Map<string, string>();
    const availableRegions = uniqueRegions.map(region => {
      const lower = region.toLowerCase();
      let formattedRegion: string;
      
      if (lower.includes('northeast') || lower.includes('northeastern') || lower.includes('ne')) {
        formattedRegion = 'Northeast';
      } else if (lower.includes('southeast') || lower.includes('southern') || lower.includes('se')) {
        formattedRegion = 'South';
      } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('north central') || lower.includes('nc')) {
        formattedRegion = 'Midwest';
      } else if (lower.includes('west') || lower.includes('western')) {
        formattedRegion = 'West';
      } else if (lower.includes('national')) {
        formattedRegion = 'National';
      } else {
        formattedRegion = region.charAt(0).toUpperCase() + region.slice(1).toLowerCase();
      }
      
      // Map formatted display name to original region value
      regionMapping.set(formattedRegion, region);
      return formattedRegion;
    });
    
    const availableProviderTypes = [...new Set(cascadingData.map(row => row.providerType).filter((item): item is string => Boolean(item)))].sort();
    const availableYears = [...new Set(cascadingData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();


    return {
      specialties: availableSpecialties,
      sources: availableSources,
      regions: availableRegions,
      regionMapping: regionMapping,
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
          regionMapping={filterOptions.regionMapping}
          availableProviderTypes={filterOptions.providerTypes}
          availableYears={filterOptions.years}
          selectedVariables={selectedVariables}
          availableVariables={availableVariables}
          onVariablesChange={setSelectedVariables}
        />
      </div>

      {/* Data Table Section - Contained with horizontal scroll */}
      <div className="w-full max-w-full overflow-hidden">
        <AnalyticsTable
          data={data} // This will be filtered by the hook based on UI filters
          loading={loading}
          loadingProgress={loadingProgress}
          error={error}
          onExport={exportToExcel}
          selectedVariables={selectedVariables}
        />
      </div>
    </div>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics;
/**
 * Analytics Feature - Main Survey Analytics Component
 * 
 * This is the main component that orchestrates the analytics feature.
 * Following enterprise patterns for component composition and separation of concerns.
 */

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsTable } from './AnalyticsTable';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsErrorBoundary } from './AnalyticsErrorBoundary';
import { useYear } from '../../../contexts/YearContext';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { filterAnalyticsData } from '../utils/analyticsCalculations';
import { VariableDiscoveryService } from '../services/variableDiscoveryService';
import { VariableFormattingService } from '../services/variableFormattingService';
import { VariableFormattingDialog } from './VariableFormattingDialog';
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
  
  // NEW: Variable selection state - Start with common variables selected
  const [selectedVariables, setSelectedVariables] = useState<string[]>(() => {
    console.log('🔍 SurveyAnalytics: Initializing selectedVariables with common variables');
    return ['tcc', 'work_rvus', 'cf']; // Start with most common variables selected
  });
  
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [isDiscoveringVariables, setIsDiscoveringVariables] = useState(false);
  
  // Variable formatting state
  const [formattingRules, setFormattingRules] = useState<any[]>([]);
  const [formattingService] = useState(() => VariableFormattingService.getInstance());
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  
  // Function to open format variables dialog
  const handleFormatVariables = useCallback(() => {
    setShowFormatDialog(true);
  }, []);
  
  // Use the provider type from context (sidebar selection) or fallback to prop
  const effectiveProviderType = selectedProviderType || providerTypeFilter;
  
  // NEW: Discover variables on mount
  useEffect(() => {
    const discoverVariables = async () => {
      try {
        setIsDiscoveringVariables(true);
        const service = VariableDiscoveryService.getInstance();
        const discovered = await service.discoverAllVariables();
        const variableNames = discovered.map(v => v.normalizedName);
        setAvailableVariables(variableNames);
        
        // Keep pre-selected common variables, but update available variables
        console.log('🔍 SurveyAnalytics: Discovered variables:', variableNames);
        console.log('🔍 SurveyAnalytics: Keeping pre-selected common variables:', selectedVariables);
        
        // Filter selectedVariables to only include those that were actually discovered
        const validSelectedVariables = selectedVariables.filter(variable => 
          variableNames.includes(variable)
        );
        
        if (validSelectedVariables.length !== selectedVariables.length) {
          console.log('🔍 SurveyAnalytics: Updating selectedVariables to match discovered variables');
          setSelectedVariables(validSelectedVariables);
        }
        
        // If no variables were discovered, try to get them from the data directly
        if (variableNames.length === 0) {
          console.log('🔍 SurveyAnalytics: No variables discovered, trying fallback method...');
          // Fallback: Get variables from the first data row
          // This will be handled by the analytics data service
        }
      } catch (error) {
        console.error('Failed to discover variables:', error);
        setAvailableVariables([]);
        setSelectedVariables([]);
      } finally {
        setIsDiscoveringVariables(false);
      }
    };
    
    discoverVariables();
  }, []);

  // Load formatting rules on mount
  useEffect(() => {
    const loadFormattingRules = async () => {
      try {
        const rules = await formattingService.loadRules();
        setFormattingRules(rules);
      } catch (error) {
        console.warn('Failed to load formatting rules:', error);
      }
    };
    
    loadFormattingRules();
  }, [formattingService]);
  
  // Save to localStorage when variables change
  useEffect(() => {
    if (selectedVariables.length > 0) {
      localStorage.setItem('analytics_selected_variables', JSON.stringify(selectedVariables));
      console.log('🔍 SurveyAnalytics: Saved selectedVariables to localStorage:', selectedVariables);
    }
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

  // FIXED: Also discover variables from the analytics data when it loads
  useEffect(() => {
    if (allData.length > 0) {
      console.log('🔍 SurveyAnalytics: Data loaded, extracting variables from data...');
      
      // Extract variables from the first data row
      const firstRow = allData[0] as any; // Type assertion for dynamic data
      if (firstRow && firstRow.variables) {
        const variableNames = Object.keys(firstRow.variables);
        console.log('🔍 SurveyAnalytics: Extracted variables from data:', variableNames);
        
        // Update available variables but keep pre-selected ones
        console.log('🔍 SurveyAnalytics: Updating available variables, keeping pre-selected:', selectedVariables);
        setAvailableVariables(variableNames); // Update available variables
        // Don't override selectedVariables - keep the common ones we pre-selected
      }
    }
  }, [allData, selectedVariables]);

  // Apply provider type filtering, UI filters, and variable filtering
  const data = useMemo(() => {
    console.log('🔍 SurveyAnalytics: Processing data - allData length:', allData.length);
    console.log('🔍 SurveyAnalytics: selectedVariables:', selectedVariables);
    console.log('🔍 SurveyAnalytics: effectiveProviderType:', effectiveProviderType);
    console.log('🔍 SurveyAnalytics: selectedProviderType:', selectedProviderType);
    console.log('🔍 SurveyAnalytics: providerTypeFilter:', providerTypeFilter);
    
    // DEBUG: Check what provider types exist in the data
    if (allData.length > 0) {
      const uniqueProviderTypes = [...new Set(allData.map(row => row.providerType || 'undefined'))];
      console.log('🔍 SurveyAnalytics: Unique provider types in data:', uniqueProviderTypes);
      
      // Check categorization for each unique provider type
      uniqueProviderTypes.forEach(providerType => {
        const category = categorizeProviderType(providerType);
        console.log(`🔍 Provider type "${providerType}" -> categorized as "${category}"`);
      });
    }
    
    // TEMPORARILY DISABLED: Provider type filtering to force show all data
    let providerFilteredData = allData;
    console.log('🔍 SurveyAnalytics: Provider type filtering DISABLED - showing all data');
    console.log('🔍 SurveyAnalytics: effectiveProviderType would be:', effectiveProviderType);
    console.log('🔍 SurveyAnalytics: selectedProviderType:', selectedProviderType);
    console.log('🔍 SurveyAnalytics: providerTypeFilter:', providerTypeFilter);
    
    // TODO: Re-enable provider type filtering once we understand the data structure
    /*
    if (effectiveProviderType && effectiveProviderType !== 'BOTH') {
      console.log('🔍 SurveyAnalytics: Applying provider type filter:', effectiveProviderType);
      providerFilteredData = allData.filter(row => {
        const category = categorizeProviderType(row.providerType || '');
        const matches = category === effectiveProviderType;
        if (!matches && allData.length <= 5) {
          console.log(`🔍 Row filtered out: providerType="${row.providerType}" -> category="${category}" (looking for "${effectiveProviderType}")`);
        }
        return matches;
      });
      console.log('🔍 SurveyAnalytics: After provider filtering:', providerFilteredData.length);
    }
    */
    
    // Apply UI filters to the provider-filtered data
    const uiFilteredData = filterAnalyticsData(providerFilteredData, filters);
    console.log('🔍 SurveyAnalytics: After UI filtering:', uiFilteredData.length);
    
    // Debug: Check the structure of the first row
    if (uiFilteredData.length > 0) {
      const firstRow = uiFilteredData[0] as any;
      console.log('🔍 SurveyAnalytics: First row structure:', {
        standardizedName: firstRow.standardizedName,
        surveySource: firstRow.surveySource,
        surveySpecialty: firstRow.surveySpecialty,
        originalSpecialty: firstRow.originalSpecialty,
        geographicRegion: firstRow.geographicRegion,
        hasVariables: !!firstRow.variables,
        variablesKeys: firstRow.variables ? Object.keys(firstRow.variables) : 'none'
      });
    }
    
    // TEMPORARILY DISABLED: Variable filtering to force show all data
    console.log('🔍 SurveyAnalytics: Variable filtering DISABLED - showing all data');
    console.log('🔍 SurveyAnalytics: selectedVariables would be:', selectedVariables);
    console.log('🔍 SurveyAnalytics: Returning all UI filtered data:', uiFilteredData.length, 'records');
    
    // TODO: Re-enable variable filtering once we understand the data structure
    /*
    // CRITICAL FIX: Apply variable filtering at UI level
    // If no variables are selected, show all data (for initial load)
    // If variables are selected, filter to only show those variables
    if (selectedVariables.length === 0) {
      console.log('🔍 SurveyAnalytics: No variables selected, showing all data');
      return uiFilteredData;
    } else {
      console.log('🔍 SurveyAnalytics: Filtering data for selected variables:', selectedVariables);
      
      // Filter data to only include rows that have the selected variables
      // Note: allData is always DynamicAggregatedData[] when using getAnalyticsDataByVariables
      const filteredData = uiFilteredData.filter((row: any) => {
        if (!row.variables) return false;
        return selectedVariables.some(variable => row.variables[variable]);
      });
      
      console.log('🔍 SurveyAnalytics: Data length after variable filtering:', filteredData.length);
      
      // If no data after variable filtering, try to show all data as fallback
      if (filteredData.length === 0 && uiFilteredData.length > 0) {
        console.log('🔍 SurveyAnalytics: No data after variable filtering, showing all data as fallback');
        return uiFilteredData;
      }
      
      return filteredData;
    }
    */
    
    return uiFilteredData;
  }, [allData, filters, effectiveProviderType, selectedVariables]);

  // Generate cascading filter options based on current filter state and provider type
  const filterOptions = useMemo(() => {
    console.log('🔍 SurveyAnalytics: Generating filter options from allData length:', allData.length);
    
    // Start with all data - DISABLED provider type filtering for filter options too
    let filteredData = allData;
    console.log('🔍 SurveyAnalytics: Filter options - provider type filtering DISABLED');
    
    // TODO: Re-enable provider type filtering for filter options once we understand the data structure
    /*
    // Apply provider type filtering first
    if (effectiveProviderType) {
      filteredData = filteredData.filter(row => {
        const category = categorizeProviderType(row.providerType || '');
        return category === effectiveProviderType;
      });
    }
    */
    
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
    
    console.log('🔍 SurveyAnalytics: Filter options generated:', {
      specialties: availableSpecialties.length,
      sources: availableSources.length,
      specialtiesList: availableSpecialties.slice(0, 5), // Show first 5
      sourcesList: availableSources.slice(0, 5) // Show first 5
    });
    
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

    console.log('🔍 SurveyAnalytics: All filter options:', {
      specialties: availableSpecialties.length,
      sources: availableSources.length,
      regions: availableRegions.length,
      providerTypes: availableProviderTypes.length,
      years: availableYears.length,
      providerTypesList: availableProviderTypes.slice(0, 5),
      yearsList: availableYears.slice(0, 5)
    });

    return {
      specialties: availableSpecialties,
      sources: availableSources,
      regions: availableRegions,
      regionMapping: regionMapping,
      providerTypes: availableProviderTypes,
      years: availableYears
    };
  }, [allData, filters, currentYear, effectiveProviderType, providerTypeFilter]);

  // Debug: Log final data length after all filtering
  console.log('🔍 SurveyAnalytics: Final data length after all filters:', data.length);
  console.log('🔍 SurveyAnalytics: Selected variables:', selectedVariables);
  console.log('🔍 SurveyAnalytics: All data length:', allData.length);

  return (
    <AnalyticsErrorBoundary>
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
            onFormatVariables={handleFormatVariables}
            selectedVariables={selectedVariables}
            formattingRules={formattingRules}
          />
        </div>
      </div>
      
      {/* Variable Formatting Dialog */}
      <VariableFormattingDialog
        open={showFormatDialog}
        onClose={() => setShowFormatDialog(false)}
        variables={selectedVariables}
        onFormattingChange={useCallback(async (rules) => {
          setFormattingRules(rules);
          await formattingService.saveRules(rules);
        }, [formattingService])}
        currentRules={formattingRules}
      />
    </AnalyticsErrorBoundary>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics;
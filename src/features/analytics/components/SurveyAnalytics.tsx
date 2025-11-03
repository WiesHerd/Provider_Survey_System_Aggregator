/**
 * Analytics Feature - Main Survey Analytics Component
 * 
 * This is the main component that orchestrates the analytics feature.
 * Following enterprise patterns for component composition and separation of concerns.
 */

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
// Using new benchmarking query hook with TanStack Query for performance optimization
import { useBenchmarkingQuery } from '../hooks/useBenchmarkingQuery';
// Keep old hook available for fallback if needed
// import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsTable } from './AnalyticsTable';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsErrorBoundary } from './AnalyticsErrorBoundary';
// import { useYear } from '../../../contexts/YearContext'; // Not currently used
import { useProviderContext } from '../../../contexts/ProviderContext';
import { filterAnalyticsData, normalizeSpecialtyName } from '../utils/analyticsCalculations';
import { VariableDiscoveryService } from '../services/variableDiscoveryService';
import { VariableFormattingService } from '../services/variableFormattingService';
import { VariableFormattingDialog } from './VariableFormattingDialog';
// import { DEFAULT_VARIABLES } from '../types/variables'; // Not used currently
import { logMGMA } from '../utils/diagnostics';
import { SavedViews } from './SavedViews';

interface SurveyAnalyticsProps {
  providerTypeFilter?: 'PHYSICIAN' | 'APP' | 'CALL' | 'BOTH';
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
  // const { currentYear } = useYear(); // Not currently used
  const { selectedProviderType } = useProviderContext();
  
  // NEW: Variable selection state - Start with common variables selected
  const [selectedVariables, setSelectedVariables] = useState<string[]>(() => {
    console.log('🔍 SurveyAnalytics: Initializing selectedVariables with common variables');
    return ['tcc', 'work_rvus', 'tcc_per_work_rvu']; // Include TCC per Work RVU by default
  });
  
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  // const [isDiscoveringVariables, setIsDiscoveringVariables] = useState(false); // Not used currently
  
  // Variable formatting state
  const [formattingRules, setFormattingRules] = useState<any[]>([]);
  const [formattingService] = useState(() => VariableFormattingService.getInstance());
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  
  // Saved Views state
  const [viewName, setViewName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // Function to open format variables dialog
  const handleFormatVariables = useCallback(() => {
    setShowFormatDialog(true);
  }, []);
  
  // CRITICAL FIX: Benchmarking screen should show ALL data regardless of sidebar selection
  // Check if we're on benchmarking route - if so, ignore provider type filtering
  const isBenchmarkingScreen = typeof window !== 'undefined' && window.location.pathname.includes('/benchmarking');
  
  // Use the provider type from context (sidebar selection) or fallback to prop
  // BUT: For benchmarking screen, always use 'BOTH' to show all data
  const effectiveProviderType = isBenchmarkingScreen 
    ? 'BOTH' 
    : (selectedProviderType || providerTypeFilter);
  
  // Expose VariableDiscoveryService globally for debugging (moved before filters to avoid dependency issues)
  useEffect(() => {
    (window as any).VariableDiscoveryService = VariableDiscoveryService;
    (window as any).refreshVariables = async (dataCategory?: string) => {
      const service = VariableDiscoveryService.getInstance();
      service.clearCache();
      const vars = await service.discoverAllVariables(dataCategory);
      console.log('🔄 Refreshed variables:', vars.map(v => v.normalizedName));
      return vars;
    };
    (window as any).diagnoseMGMA = logMGMA;
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
  
  // Helper function to categorize provider types into PHYSICIAN/APP/CALL categories
  const categorizeProviderType = (providerType: string): 'PHYSICIAN' | 'APP' | 'CALL' | 'OTHER' => {
    if (!providerType) return 'OTHER';
    
    const lower = providerType.toLowerCase();
    
    // Call Pay categories (check first)
    if (lower === 'call' || lower.includes('call pay') || lower.includes('on-call') || 
        lower.includes('oncall') || lower.includes('call compensation')) {
      return 'CALL';
    }
    
    // APP categories (check these second to avoid conflicts with "Physician Assistant")
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
  // Using new benchmarking query hook with TanStack Query for caching and performance
  const {
    allData,
    loading,
    loadingProgress,
    error,
    filters,
    setFilters,
    exportToExcel
  } = useBenchmarkingQuery({
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '', // Don't pre-select provider type in filters
    year: ''
  }, selectedVariables); // NEW: Pass selected variables to hook

  // CRITICAL FIX: Discover variables on mount and when dataCategory filter changes
  useEffect(() => {
    const discoverVariables = async () => {
      try {
        const service = VariableDiscoveryService.getInstance();
        // CRITICAL: Clear cache to ensure we get fresh discovery when filter changes
        service.clearCache();
        
        // CRITICAL FIX: Filter variable discovery by dataCategory if a specific category is selected
        // Only filter if not "All Categories", empty, null, or undefined
        const dataCategoryFilter = filters.dataCategory &&
          filters.dataCategory !== '' &&
          filters.dataCategory !== 'All Categories' &&
          filters.dataCategory !== undefined &&
          filters.dataCategory !== null
          ? filters.dataCategory
          : undefined;
        
        console.log('🔍 SurveyAnalytics: Discovering variables', dataCategoryFilter ? `(filtered by: ${dataCategoryFilter})` : '(all categories)');
        const discovered = await service.discoverAllVariables(dataCategoryFilter);
        const variableNames = discovered.map(v => v.normalizedName);
        console.log('🔍 SurveyAnalytics: All discovered variables:', variableNames);
        console.log('🔍 SurveyAnalytics: Available variables count:', variableNames.length);
        
        // Check specifically for ASA
        const asaVars = discovered.filter(v => v.normalizedName.includes('asa'));
        if (asaVars.length > 0) {
          console.log('✅ SurveyAnalytics: Found ASA variables:', asaVars.map(v => v.normalizedName));
        } else {
          console.log('❌ SurveyAnalytics: NO ASA variables found');
        }
        
        // DEBUG: Check specifically for on-call compensation variables
        const onCallVars = discovered.filter(v => 
          v.normalizedName.includes('on_call') || 
          v.normalizedName.includes('oncall') ||
          v.name.toLowerCase().includes('on call') ||
          v.name.toLowerCase().includes('oncall')
        );
        if (onCallVars.length > 0) {
          console.log('✅ SurveyAnalytics: Found On-Call Compensation variables:', onCallVars.map(v => ({
            name: v.name,
            normalizedName: v.normalizedName,
            sources: v.availableSources,
            recordCount: v.recordCount
          })));
        } else {
          console.warn('⚠️ SurveyAnalytics: NO On-Call Compensation variables found in discovered variables');
          console.log('🔍 SurveyAnalytics: This may indicate Call Pay surveys are not being processed correctly');
        }
        
        setAvailableVariables(variableNames);
        
        // Run MGMA diagnostic if requested (can be triggered from console or URL)
        if (window.location.search.includes('diagnose=mgma')) {
          console.log('🔍 Running MGMA diagnostic...');
          await logMGMA();
        }
        
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
      }
    };
    
    discoverVariables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dataCategory]); // CRITICAL FIX: Re-discover variables when dataCategory filter changes

  // FIXED: Don't overwrite discovered variables - they should show ALL available variables
  // from all surveys, not just ones with data in current filtered results
  // CRITICAL FIX: The discovered variables from VariableDiscoveryService should be the source of truth
  // This ensures variables like ASA are available even if they don't appear in current filtered data
  useEffect(() => {
    if (allData.length > 0) {
      console.log('🔍 SurveyAnalytics: Data loaded, checking variables in current data...');
      
      // Extract variables from the first data row for validation/debugging only
      const firstRow = allData[0] as any; // Type assertion for dynamic data
      if (firstRow && firstRow.variables) {
        const dataVariableNames = Object.keys(firstRow.variables);
        console.log('🔍 SurveyAnalytics: Variables in current filtered data:', dataVariableNames);
        console.log('🔍 SurveyAnalytics: Keeping all discovered variables in dropdown (not overwriting with filtered data)');
        
        // CRITICAL: Only set availableVariables from data if we haven't discovered any yet
        // Otherwise, keep the discovered variables which include ALL variables from ALL surveys
        // This ensures ASA and other variables show up even if current filters exclude them
        if (availableVariables.length === 0) {
          console.log('🔍 SurveyAnalytics: No discovered variables yet, using data variables as temporary fallback');
          setAvailableVariables(dataVariableNames);
        }
        // If we have discovered variables, DON'T overwrite them - they're the source of truth
      }
      
      // DEBUG: Check specialty mapping data structure (simplified)
      console.log('🔍 SurveyAnalytics: DEBUG - Checking specialty mapping data...');
      const familyMedicineData = allData.filter(row => 
        row.surveySpecialty?.toLowerCase().includes('family') || 
        row.standardizedName?.toLowerCase().includes('family')
      );
      
      console.log('🔍 SurveyAnalytics: DEBUG - Family Medicine related data:');
      familyMedicineData.forEach((row, index) => {
        console.log(`Family Medicine ${index + 1}:`, {
          surveySource: row.surveySource,
          surveySpecialty: row.surveySpecialty,
          standardizedName: row.standardizedName
        });
      });
    }
  }, [allData, selectedVariables, availableVariables.length]);

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
    
    // Apply provider type filtering
    // CRITICAL FIX: Benchmarking screen should NEVER filter by provider type - show ALL data
    let providerFilteredData = allData;
    
    if (effectiveProviderType && effectiveProviderType !== 'BOTH' && !isBenchmarkingScreen) {
      // Only apply provider type filtering if NOT on benchmarking screen
      providerFilteredData = allData.filter(row => {
        if (!row.providerType) return false;
        // Direct match for exact provider types (CALL, PHYSICIAN, APP)
        if (row.providerType === effectiveProviderType) {
          return true;
        }
        // Also check categorized match for backward compatibility
        const category = categorizeProviderType(row.providerType);
        return category === effectiveProviderType;
      });
      console.log('🔍 SurveyAnalytics: Provider filtering enabled:', {
        filter: effectiveProviderType,
        before: allData.length,
        after: providerFilteredData.length
      });
    } else {
      if (isBenchmarkingScreen) {
        console.log('🔍 SurveyAnalytics: Benchmarking screen - Provider type filtering DISABLED - showing ALL data');
      } else {
        console.log('🔍 SurveyAnalytics: Provider type filtering disabled - showing all data');
      }
    }
    
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
    
    // Sort by standardized name to group same specialties from different provider types together
    const sortedData = [...uiFilteredData].sort((a, b) => {
      const nameA = (a.standardizedName || '').toLowerCase();
      const nameB = (b.standardizedName || '').toLowerCase();
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
      }
      // If same standardized name, sort by provider type to keep similar data together
      const typeA = (a.providerType || '').toLowerCase();
      const typeB = (b.providerType || '').toLowerCase();
      return typeA.localeCompare(typeB);
    });
    
    return sortedData;
  }, [allData, filters, effectiveProviderType, selectedVariables, isBenchmarkingScreen, selectedProviderType, providerTypeFilter]);

  // Generate cascading filter options based on current filter state and provider type
  const filterOptions = useMemo(() => {
    console.log('🔍 SurveyAnalytics: Generating filter options from allData length:', allData.length);
    
    // Start with all data - CRITICAL: Benchmarking should always show all filter options
    let filteredData = allData;
    if (isBenchmarkingScreen) {
      console.log('🔍 SurveyAnalytics: Filter options - Benchmarking screen - showing ALL filter options (no provider type filtering)');
    } else {
      console.log('🔍 SurveyAnalytics: Filter options - provider type filtering DISABLED');
    }
    
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
      // Use the same normalization logic as the main filtering
      const normalizedFilterSpecialty = normalizeSpecialtyName(filters.specialty);
      
      cascadingData = cascadingData.filter(row => 
        normalizeSpecialtyName(row.standardizedName || '') === normalizedFilterSpecialty
      );
    }
    
    // If survey source is selected, filter by survey source
    if (filters.surveySource) {
      cascadingData = cascadingData.filter(row => row.surveySource === filters.surveySource);
    }
    
    // If region is selected, filter by region
    if (filters.geographicRegion) {
      cascadingData = cascadingData.filter(row => row.geographicRegion === filters.geographicRegion);
    }
    
    // If data category is selected, filter by data category (NEW)
    // ENTERPRISE FIX: Only filter if a specific category is selected (not "All Categories", empty, or undefined)
    // CRITICAL FIX: Handle both empty string AND "All Categories" string explicitly
    const shouldFilterByCategory = filters.dataCategory && 
        filters.dataCategory !== '' && 
        filters.dataCategory !== 'All Categories' &&
        filters.dataCategory !== undefined &&
        filters.dataCategory !== null;

    if (shouldFilterByCategory) {
      // Convert display name back to internal format if needed
      const categoryFilter = filters.dataCategory === 'Call Pay' ? 'CALL_PAY'
        : filters.dataCategory === 'Moonlighting' ? 'MOONLIGHTING'
        : filters.dataCategory === 'Compensation' ? 'COMPENSATION'
        : filters.dataCategory === 'Custom' ? 'CUSTOM'
        : filters.dataCategory;
      
      const rowsBeforeFilter = cascadingData.length;
      cascadingData = cascadingData.filter(row => {
        const rowDataCategory = (row as any).dataCategory;
        return rowDataCategory === categoryFilter;
      });
      
      console.log('🔍 SurveyAnalytics: Cascading filter - Data category filtering APPLIED:', {
        selectedCategory: filters.dataCategory,
        normalizedCategory: categoryFilter,
        rowsBeforeFilter,
        cascadingDataCount: cascadingData.length
      });
    } else {
      // ENTERPRISE FIX: When "All Categories" is selected, don't filter by dataCategory
      const callPayRows = cascadingData.filter((row: any) => {
        const rowDataCategory = (row as any).dataCategory;
        return rowDataCategory === 'CALL_PAY' || 
               (!rowDataCategory && ((row as any).surveySource || '').toLowerCase().includes('call pay'));
      });
      
      console.log('🔍 SurveyAnalytics: Cascading filter - Data category filtering SKIPPED (All Categories):', {
        dataCategoryFilter: filters.dataCategory,
        filterValueType: typeof filters.dataCategory,
        cascadingDataCount: cascadingData.length,
        callPayRowsCount: callPayRows.length,
        callPaySampleRows: callPayRows.slice(0, 3).map((row: any) => ({
          surveySource: row.surveySource,
          standardizedName: row.standardizedName,
          dataCategory: (row as any).dataCategory
        }))
      });
    }
    
    // CRITICAL FIX: Generate survey sources from ALL data, not cascading-filtered data
    // This ensures all surveys are always available in the dropdown, regardless of other filter selections
    // Other options (specialties, regions, etc.) can still use cascading filters for better UX
    const allSurveySources = allData.map(row => row.surveySource).filter((item): item is string => Boolean(item));
    const availableSourcesFromAllData = [...new Set(allSurveySources)].sort();
    
    // CRITICAL FIX: Generate data categories from ALL data, not cascading-filtered data
    // This ensures all data categories are always available in the dropdown, regardless of other filter selections
    // This allows users to filter by data category even if current specialty selection doesn't have that category
    // ENTERPRISE FIX: Also detect Call Pay from survey source name if dataCategory is missing (backward compatibility)
    const allDataCategories = allData.map(row => {
      const dataCategory = (row as any).dataCategory;
      // If no dataCategory, infer from surveySource for backward compatibility
      if (!dataCategory) {
        const surveySource = row.surveySource || '';
        if (surveySource.toLowerCase().includes('call pay')) {
          return 'CALL_PAY';
        }
        if (surveySource.toLowerCase().includes('moonlighting')) {
          return 'MOONLIGHTING';
        }
      }
      return dataCategory;
    }).filter((item): item is string => Boolean(item));
    const availableDataCategoriesFromAllData = [...new Set(allDataCategories)].sort();
    // Format data categories for display
    const formattedDataCategoriesFromAllData = availableDataCategoriesFromAllData.map(cat => {
      if (cat === 'CALL_PAY') return 'Call Pay';
      if (cat === 'MOONLIGHTING') return 'Moonlighting';
      if (cat === 'COMPENSATION') return 'Compensation';
      return cat;
    });
    
    // CRITICAL DEBUG: Check for MGMA surveys specifically
    const mgmaSources = allSurveySources.filter(src => src.toLowerCase().includes('mgma'));
    const uniqueMgmaSources = [...new Set(mgmaSources)];
    
    // Enhanced logging to debug survey source generation
    console.log('🔍 SurveyAnalytics: Survey source generation:', {
      totalRows: allData.length,
      totalSurveySources: allSurveySources.length,
      uniqueSurveySources: availableSourcesFromAllData.length,
      allSurveySourcesList: availableSourcesFromAllData,
      mgmaSourcesRaw: mgmaSources,
      uniqueMgmaSources: uniqueMgmaSources,
      hasMgmaPhysician: availableSourcesFromAllData.some(s => s === 'MGMA Physician'),
      hasMgmaCallPay: availableSourcesFromAllData.some(s => s === 'MGMA Call Pay'),
      sampleRows: allData.slice(0, 10).map(row => ({
        surveySource: row.surveySource,
        dataCategory: (row as any).dataCategory,
        providerType: row.providerType,
        specialty: row.standardizedName
      })),
      mgmaRows: allData.filter(row => row.surveySource && row.surveySource.toLowerCase().includes('mgma')).slice(0, 5).map(row => ({
        surveySource: row.surveySource,
        dataCategory: (row as any).dataCategory,
        providerType: row.providerType,
        specialty: row.standardizedName
      }))
    });
    
    // Generate other options from the cascading-filtered dataset (for specialties, regions, etc.)
    const availableSpecialties = [...new Set(cascadingData.map(row => row.standardizedName).filter((item): item is string => Boolean(item)))].sort();
    
    console.log('🔍 SurveyAnalytics: Filter options generated:', {
      specialties: availableSpecialties.length,
      sources: availableSourcesFromAllData.length,
      sourcesFromCascading: [...new Set(cascadingData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].length,
      specialtiesList: availableSpecialties.slice(0, 5), // Show first 5
      sourcesList: availableSourcesFromAllData, // Show all sources
      cascadingSourcesList: [...new Set(cascadingData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].slice(0, 5)
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
    
    // CRITICAL FIX: Format provider types properly and remove duplicates (case-insensitive)
    // Normalize to title case and deduplicate case-insensitively
    const providerTypeMap = new Map<string, string>(); // Maps lowercase to properly formatted
    cascadingData.forEach(row => {
      if (row.providerType) {
        const lower = row.providerType.toLowerCase();
        // Use original if not in map, otherwise keep the first properly formatted version
        if (!providerTypeMap.has(lower)) {
          // Format to title case: "staff physician" -> "Staff Physician"
          const formatted = row.providerType
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          providerTypeMap.set(lower, formatted);
        }
      }
    });
    const availableProviderTypes = Array.from(providerTypeMap.values()).sort();
    const availableYears = [...new Set(cascadingData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();
    
    // CRITICAL FIX: Use data categories from ALL data, not cascading-filtered data
    // This ensures all data categories are always available in the dropdown, regardless of other filter selections
    // This matches the pattern used for survey sources above
    // Note: formattedDataCategoriesFromAllData was already created above from allData

    console.log('🔍 SurveyAnalytics: All filter options:', {
      specialties: availableSpecialties.length,
      sources: availableSourcesFromAllData.length,
      regions: availableRegions.length,
      providerTypes: availableProviderTypes.length,
      dataCategories: formattedDataCategoriesFromAllData.length,
      years: availableYears.length,
      providerTypesList: availableProviderTypes.slice(0, 5),
      dataCategoriesList: formattedDataCategoriesFromAllData.slice(0, 5),
      yearsList: availableYears.slice(0, 5),
      allSourcesList: availableSourcesFromAllData
    });

    return {
      specialties: availableSpecialties,
      sources: availableSourcesFromAllData, // CRITICAL FIX: Use all sources from allData, not cascading-filtered
      regions: availableRegions,
      regionMapping: regionMapping,
      providerTypes: availableProviderTypes,
      dataCategories: formattedDataCategoriesFromAllData, // CRITICAL FIX: Use all data categories from allData, not cascading-filtered
      years: availableYears
    };
  }, [allData, filters, isBenchmarkingScreen]);

  // Debug: Log final data length after all filtering
  console.log('🔍 SurveyAnalytics: Final data length after all filters:', data.length);
  console.log('🔍 SurveyAnalytics: Selected variables:', selectedVariables);
  console.log('🔍 SurveyAnalytics: All data length:', allData.length);

  // Handle loading a saved view
  const handleLoadView = useCallback((view: any) => {
    // Update filters from saved view
    setFilters(view.filters);
    // Update variables from saved view
    setSelectedVariables(view.selectedVariables);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setFilters and setSelectedVariables are stable from useState/useAnalyticsData

  return (
    <AnalyticsErrorBoundary>
      <div className="flex flex-col space-y-6">
        {/* Save/Load Views - Page-level actions above filters */}
        <div className="flex items-center justify-end w-full">
          <SavedViews
            filters={filters}
            selectedVariables={selectedVariables}
            onLoadView={handleLoadView}
            viewName={viewName}
            onViewNameChange={setViewName}
            showSaveModal={showSaveModal}
            onShowSaveModal={setShowSaveModal}
          />
        </div>

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
            availableDataCategories={filterOptions.dataCategories}
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
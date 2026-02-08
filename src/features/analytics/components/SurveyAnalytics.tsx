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
import { AggregatedData } from '../types/analytics';
import { DynamicAggregatedData } from '../types/variables';
import { useSpecialtyOptions } from '../../../shared/hooks/useSpecialtyOptions';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { exportToExcel as exportToExcelUtil } from '../utils/exportUtils';

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
  const { selectedProviderType } = useProviderContext();
  
  // Variable selection state - no default selections (user must select)
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  
  // CRITICAL: Sort variables by original file column order (preserve upload file sequence)
  // This ensures physician surveys display columns in the same order as the upload file
  const [orderedVariables, setOrderedVariables] = useState<string[]>(selectedVariables);
  
  useEffect(() => {
    const sortVariables = async () => {
      if (selectedVariables.length === 0) {
        setOrderedVariables([]);
        return;
      }
      
      try {
        const { sortVariablesByOriginalOrder } = require('../utils/variableOrdering');
        const sorted = await sortVariablesByOriginalOrder(selectedVariables, selectedProviderType);
        setOrderedVariables(sorted);
      } catch (error) {
        console.error('Error sorting variables by original order:', error);
        // Fallback to original order on error
        setOrderedVariables(selectedVariables);
      }
    };
    
    sortVariables();
  }, [selectedVariables, selectedProviderType]);
  
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
    
    // Setup diagnostic functions for Call Pay data investigation
    const { setupDiagnostics } = require('../utils/callPayDiagnostics');
    setupDiagnostics();
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
  
  // Save to DataService when variables change
  useEffect(() => {
    const saveSelectedVariables = async () => {
      if (selectedVariables.length > 0) {
        try {
          const { getDataService } = await import('../../../services/DataService');
          const dataService = getDataService();
          await dataService.saveUserPreference('analytics_selected_variables', selectedVariables);
          console.log('🔍 SurveyAnalytics: Saved selectedVariables to DataService:', selectedVariables);
        } catch (error) {
          console.error('Failed to save selected variables:', error);
        }
      }
    };
    saveSelectedVariables();
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
  }, orderedVariables); // NEW: Pass ordered variables to hook (preserves original file column order)

  // NEW: Get specialty options with mapping transparency
  const { specialties: specialtyOptions, loading: specialtyOptionsLoading, error: specialtyOptionsError } = useSpecialtyOptions();

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
        
        // Update available variables list
        console.log('🔍 SurveyAnalytics: Discovered variables:', variableNames);
        console.log('🔍 SurveyAnalytics: Current selectedVariables:', selectedVariables);
        
        // CRITICAL FIX: Don't remove user-selected variables even if not discovered
        // The user may have selected variables that exist in the data but weren't discovered
        // We'll let the table show "***" if data isn't found, rather than removing the selection
        // Since there are no default variables, always keep user selections
        console.log('🔍 SurveyAnalytics: Keeping user-selected variables (even if not discovered)');
        
        // Check if any selected variables are not in discovered list
        const missingVariables = selectedVariables.filter(v => !variableNames.includes(v));
        if (missingVariables.length > 0) {
          console.log('🔍 SurveyAnalytics: User selected variables not in discovered list:', missingVariables);
          console.log('🔍 SurveyAnalytics: These will be shown in table; if data missing, will display "***"');
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
      const familyMedicineData = (allData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => 
        row.surveySpecialty?.toLowerCase().includes('family') || 
        row.standardizedName?.toLowerCase().includes('family')
      );
      
      console.log('🔍 SurveyAnalytics: DEBUG - Family Medicine related data:');
      familyMedicineData.forEach((row: AggregatedData | DynamicAggregatedData, index: number) => {
        console.log(`Family Medicine ${index + 1}:`, {
          surveySource: row.surveySource,
          surveySpecialty: row.surveySpecialty,
          standardizedName: row.standardizedName
        });
      });
    }
  }, [allData, selectedVariables, availableVariables.length]);

  // Apply provider type filtering, UI filters, and variable filtering
  const data = useMemo((): (AggregatedData | DynamicAggregatedData)[] => {
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
      providerFilteredData = (allData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => {
        if (!row.providerType) return false;
        // Direct match for exact provider types (CALL, PHYSICIAN, APP)
        if (row.providerType === effectiveProviderType) {
          return true;
        }
        // Also check categorized match for backward compatibility
        const category = categorizeProviderType(row.providerType);
        return category === effectiveProviderType;
      }) as AggregatedData[] | DynamicAggregatedData[];
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
  }, [allData, filters, effectiveProviderType, orderedVariables, isBenchmarkingScreen, selectedProviderType, providerTypeFilter]);

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
      cascadingData = (cascadingData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => row.surveyYear === filters.year) as AggregatedData[] | DynamicAggregatedData[];
    }
    
    // If specialty is selected, filter by specialty
    if (filters.specialty) {
      // Use the same normalization logic as the main filtering
      const normalizedFilterSpecialty = normalizeSpecialtyName(filters.specialty);
      
      cascadingData = (cascadingData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => 
        normalizeSpecialtyName(row.standardizedName || '') === normalizedFilterSpecialty
      ) as AggregatedData[] | DynamicAggregatedData[];
    }
    
    // If survey source is selected, filter by survey source
    if (filters.surveySource) {
      cascadingData = (cascadingData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => row.surveySource === filters.surveySource) as AggregatedData[] | DynamicAggregatedData[];
    }
    
    // If region is selected, filter by region
    if (filters.geographicRegion) {
      cascadingData = (cascadingData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => row.geographicRegion === filters.geographicRegion) as AggregatedData[] | DynamicAggregatedData[];
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
      cascadingData = (cascadingData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => {
        const rowDataCategory = (row as any).dataCategory;
        return rowDataCategory === categoryFilter;
      }) as AggregatedData[] | DynamicAggregatedData[];
      
      console.log('🔍 SurveyAnalytics: Cascading filter - Data category filtering APPLIED:', {
        selectedCategory: filters.dataCategory,
        normalizedCategory: categoryFilter,
        rowsBeforeFilter,
        cascadingDataCount: cascadingData.length
      });
    } else {
      // ENTERPRISE FIX: When "All Categories" is selected, don't filter by dataCategory
      const callPayRows = (cascadingData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => {
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
    
    // CASCADING OPTIONS: Only show dropdown values that have data for the current filter combination.
    // This prevents "No Benchmarking Data Available" from selecting options that yield zero rows.
    const availableSourcesFromCascading = [...new Set(cascadingData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].sort();

    // Data categories from cascading data only (so selected category always has data)
    const dataCategoriesFromCascading = cascadingData.map((row: AggregatedData | DynamicAggregatedData) => {
      const dataCategory = (row as any).dataCategory;
      if (!dataCategory) {
        const surveySource = row.surveySource || '';
        if (surveySource.toLowerCase().includes('call pay')) return 'CALL_PAY';
        if (surveySource.toLowerCase().includes('moonlighting')) return 'MOONLIGHTING';
      }
      return dataCategory;
    }).filter((item): item is string => Boolean(item));
    const availableDataCategoriesFromCascading = [...new Set(dataCategoriesFromCascading)].sort();
    const formattedDataCategoriesFromCascading = availableDataCategoriesFromCascading.map(cat => {
      if (cat === 'CALL_PAY') return 'Call Pay';
      if (cat === 'MOONLIGHTING') return 'Moonlighting';
      if (cat === 'COMPENSATION') return 'Compensation';
      return cat;
    });

    // All other options from cascading data (specialties, regions, years, provider types)
    const availableSpecialties = [...new Set(cascadingData.map(row => row.standardizedName).filter((item): item is string => Boolean(item)))].sort();
    
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

    // Only show specialty options that have data (avoids referencing filterOptions before init)
    const allowedSpecialtyNames = new Set(availableSpecialties);
    const dataBackedSpecialtyOptions = allowedSpecialtyNames.size === 0
      ? []
      : specialtyOptions.filter(opt => allowedSpecialtyNames.has(opt.name));

    return {
      specialties: availableSpecialties,
      sources: availableSourcesFromCascading,
      regions: availableRegions,
      regionMapping: regionMapping,
      providerTypes: availableProviderTypes,
      dataCategories: formattedDataCategoriesFromCascading,
      years: availableYears,
      dataBackedSpecialtyOptions
    };
  }, [allData, filters, isBenchmarkingScreen, specialtyOptions]);

  // Only show Display Variables that have data for the current filter combination (Year, Source, Specialty, etc.).
  const dataBackedVariableSet = useMemo(() => {
    const set = new Set<string>();
    (data as (AggregatedData | DynamicAggregatedData)[]).forEach((row: AggregatedData | DynamicAggregatedData) => {
      const vars = (row as { variables?: Record<string, unknown> }).variables;
      if (vars && typeof vars === 'object') {
        Object.keys(vars).forEach(k => set.add(k));
      }
    });
    return set;
  }, [data]);

  const dataBackedVariables = useMemo(() => {
    // Preserve discovery order; only include variables that appear in current filtered data
    const ordered = availableVariables.filter(v => dataBackedVariableSet.has(v));
    // Include any variables in data not yet in discovery (edge case)
    const extra: string[] = [];
    dataBackedVariableSet.forEach(v => {
      if (!availableVariables.includes(v)) extra.push(v);
    });
    return [...ordered, ...extra.sort()];
  }, [availableVariables, dataBackedVariableSet]);

  // Clear specialty when it's no longer in the data-backed list (e.g. after changing Year or Survey Source)
  useEffect(() => {
    if (!filters.specialty) return;
    const allowed = new Set(filterOptions.specialties);
    if (allowed.has(filters.specialty)) return;
    setFilters({ ...filters, specialty: '' });
  }, [filterOptions.specialties, filters.specialty, setFilters]);

  // Clear selected variables that no longer have data for the current filter combination
  useEffect(() => {
    if (selectedVariables.length === 0) return;
    const allowed = new Set(dataBackedVariables);
    const valid = selectedVariables.filter(v => allowed.has(v));
    if (valid.length === selectedVariables.length) return;
    setSelectedVariables(valid);
  }, [dataBackedVariables, selectedVariables, setSelectedVariables]);

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

  // Handle Excel export with current displayed data
  const handleExportToExcel = useCallback(() => {
    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }
    
    // Use the currently displayed data (after all filtering)
    exportToExcelUtil(
      data as AggregatedData[] | DynamicAggregatedData[],
      filters,
      selectedVariables,
      {
        includeFilters: true,
        includeSummary: true,
        filename: `benchmarking-data-${new Date().toISOString().split('T')[0]}.xlsx`
      }
    );
  }, [data, filters, selectedVariables]);

  return (
    <AnalyticsErrorBoundary>
      <div className="flex flex-col space-y-6">
        {/* Save/Load Views and Export - Page-level actions above filters */}
        <div className="flex items-center justify-between w-full">
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            {/* Download to Excel Button */}
            <button
              onClick={handleExportToExcel}
              disabled={data.length === 0 || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export to Excel
            </button>
            
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
            availableDataCategories={isBenchmarkingScreen ? [] : filterOptions.dataCategories} // Hide data category filter on benchmarking screen
            availableYears={filterOptions.years}
            selectedVariables={selectedVariables}
            availableVariables={dataBackedVariables}
            onVariablesChange={setSelectedVariables}
            availableSpecialtyOptions={filterOptions.dataBackedSpecialtyOptions}
            specialtyOptionsLoading={specialtyOptionsLoading} // NEW: Pass loading state to prevent showing empty dropdown
            specialtyOptionsError={specialtyOptionsError} // NEW: Pass error state for user-friendly error messages
          />
        </div>

        {/* Data Table Section - Contained with horizontal scroll */}
        <div className="w-full max-w-full overflow-hidden">
          <AnalyticsTable
            data={data as AggregatedData[] | DynamicAggregatedData[]} // This will be filtered by the hook based on UI filters
            loading={loading}
            loadingProgress={loadingProgress}
            error={error}
            onExport={exportToExcel}
            onFormatVariables={handleFormatVariables}
            selectedVariables={orderedVariables} // Use ordered variables to preserve original file column order
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
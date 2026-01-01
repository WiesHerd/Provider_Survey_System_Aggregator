/**
 * Custom hook for managing blending filters
 * 
 * Handles cascading filter logic and state management
 */

import { useState, useCallback, useMemo } from 'react';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';

export interface BlendingFilters {
  selectedSurvey: string;
  selectedYear: string;
  selectedRegion: string;
  selectedProviderType: string;
  specialtySearch: string;
}

export interface FilterOptions {
  surveys: string[];
  years: string[];
  regions: string[];
  providerTypes: string[];
}

/**
 * Custom hook for managing blending filters
 * 
 * @param allData - All survey data
 * @returns Filter state and handlers
 */
export const useBlendingFilters = (allData: any[]) => {
  const safeString = useCallback((value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }, []);

  // Filter state
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProviderType, setSelectedProviderType] = useState('');
  const [specialtySearch, setSpecialtySearch] = useState('');
  
  // Debounce specialty search to avoid excessive filtering on every keystroke
  const debouncedSpecialtySearch = useDebouncedValue(specialtySearch, 300);

  // Cascading filter options - computed based on current selections
  const filterOptions = useMemo((): FilterOptions => {
    console.log('🔍 Filter Options Debug:', {
      allDataLength: allData?.length || 0,
      selectedSurvey,
      selectedYear,
      selectedRegion,
      selectedProviderType
    });

    if (!allData || allData.length === 0) {
      console.log('⚠️ No survey data available for filters');
      return {
        surveys: [],
        years: [],
        regions: [],
        providerTypes: []
      };
    }

    // Always show all available surveys
    const surveys = [...new Set(allData.map(row => safeString(row?.surveySource)).filter(Boolean))].sort();

    // For other filters, show options based on current selections
    let filteredData = allData;

    // Apply survey filter if one is selected
    if (selectedSurvey) {
      filteredData = filteredData.filter(row => safeString(row?.surveySource) === selectedSurvey);
    }

    // For years, show all available years from the current filtered data
    const years = [...new Set(filteredData.map(row => safeString(row?.surveyYear)).filter(Boolean))].sort();

    // Apply year filter if one is selected
    if (selectedYear) {
      filteredData = filteredData.filter(row => safeString(row?.surveyYear) === selectedYear);
    }

    // For regions, show all available regions from the current filtered data
    const regions = [...new Set(filteredData.map(row => safeString(row?.geographicRegion)).filter(Boolean))].sort();

    // Apply region filter if one is selected
    if (selectedRegion) {
      filteredData = filteredData.filter(row => safeString(row?.geographicRegion) === selectedRegion);
    }

    // For provider types, show all available provider types from the current filtered data
    const providerTypes = [...new Set(filteredData.map(row => safeString(row?.providerType)).filter(Boolean))].sort();

    const result = {
      surveys,
      years,
      regions,
      providerTypes
    };

    console.log('🔍 Final Filter Options:', result);
    return result;
  }, [allData, selectedSurvey, selectedYear, selectedRegion, selectedProviderType, safeString]);

  // Cascading filter change handlers
  const handleSurveyChange = useCallback((value: string) => {
    const normalized = value === 'all-surveys' ? '' : (value ? safeString(value) : '');
    setSelectedSurvey(normalized);
    // Only clear dependent filters when selecting a specific survey (not "All")
    // When "All Surveys" is selected, preserve other filter selections
    if (normalized && normalized !== '') {
      // Only clear other filters when a specific survey is selected
      setSelectedYear('');
      setSelectedRegion('');
      setSelectedProviderType('');
    }
    // When selecting "All Surveys" (empty string), keep all other filters
  }, [safeString]);

  const handleYearChange = useCallback((value: string) => {
    const normalized = value ? safeString(value) : '';
    setSelectedYear(normalized);
    // Don't clear dependent filters - just update available options
    // Let the filter options logic handle showing only valid combinations
  }, [safeString]);

  const handleRegionChange = useCallback((value: string) => {
    const normalized = value ? safeString(value) : '';
    setSelectedRegion(normalized);
    // Don't clear dependent filters - just update available options
    // Let the filter options logic handle showing only valid combinations
  }, [safeString]);

  const handleProviderTypeChange = useCallback((value: string) => {
    setSelectedProviderType(value ? safeString(value) : '');
  }, [safeString]);

  const handleSpecialtySearchChange = useCallback((value: string) => {
    setSpecialtySearch(value);
  }, []);

  // Filter and sort survey data based on all filters
  const filteredSurveyData = useMemo(() => {
    if (!allData || allData.length === 0) {
      return [];
    }

    return allData.filter((row: any) => {
      if (!row) {
        return false;
      }

      const surveyValue = safeString(row.surveySource);
      const yearValue = safeString(row.surveyYear);
      const regionValue = safeString(row.geographicRegion);
      const providerTypeValue = safeString(row.providerType);
      const specialtyValue = safeString(row.surveySpecialty);

      const matchesSurvey = !selectedSurvey || surveyValue === selectedSurvey;
      const matchesYear = !selectedYear || yearValue === selectedYear;
      const matchesRegion = !selectedRegion || regionValue === selectedRegion;

      let matchesProviderType = true;
      if (selectedProviderType) {
        if (selectedProviderType === 'Physician') {
          matchesProviderType = providerTypeValue === 'Staff Physician' || providerTypeValue === 'Physician' || providerTypeValue === 'staff physician';
        } else {
          matchesProviderType = providerTypeValue === selectedProviderType;
        }
      }

      const matchesSpecialty = !debouncedSpecialtySearch || (() => {
        // Use flexible word matching for specialty search
        const searchTerms = debouncedSpecialtySearch.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
        if (searchTerms.length === 0) return true;
        
        const specialtyText = specialtyValue.toLowerCase();
        return searchTerms.every(term => specialtyText.includes(term));
      })();

      return matchesSurvey && matchesYear && matchesRegion && matchesProviderType && matchesSpecialty;
    });
  }, [allData, selectedSurvey, selectedYear, selectedRegion, selectedProviderType, debouncedSpecialtySearch, safeString]);

  return {
    // Filter state
    selectedSurvey,
    selectedYear,
    selectedRegion,
    selectedProviderType,
    specialtySearch,
    
    // Filter options
    filterOptions,
    
    // Filtered data
    filteredSurveyData,
    
    // Handlers
    handleSurveyChange,
    handleYearChange,
    handleRegionChange,
    handleProviderTypeChange,
    handleSpecialtySearchChange,
    
    // Direct setters for template restoration
    setSelectedSurvey,
    setSelectedYear,
    setSelectedRegion,
    setSelectedProviderType,
    setSpecialtySearch,
    
    // Reset function
    resetFilters: useCallback(() => {
      setSelectedSurvey('');
      setSelectedYear('');
      setSelectedRegion('');
      setSelectedProviderType('');
      setSpecialtySearch('');
    }, [])
  };
};

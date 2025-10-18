/**
 * Custom hook for managing blending filters
 * 
 * Handles cascading filter logic and state management
 */

import { useState, useCallback, useMemo } from 'react';

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

  // Cascading filter options - computed based on current selections
  const filterOptions = useMemo((): FilterOptions => {
    if (!allData || allData.length === 0) {
      return {
        surveys: [],
        years: [],
        regions: [],
        providerTypes: []
      };
    }

    let filteredData = allData;

    const surveys = [...new Set(filteredData.map(row => safeString(row?.surveySource)).filter(Boolean))].sort();

    if (selectedSurvey) {
      filteredData = filteredData.filter(row => safeString(row?.surveySource) === selectedSurvey);
    }
    const years = [...new Set(filteredData.map(row => safeString(row?.surveyYear)).filter(Boolean))].sort();

    if (selectedYear) {
      filteredData = filteredData.filter(row => safeString(row?.surveyYear) === selectedYear);
    }
    const regions = [...new Set(filteredData.map(row => safeString(row?.geographicRegion)).filter(Boolean))].sort();

    if (selectedRegion) {
      filteredData = filteredData.filter(row => safeString(row?.geographicRegion) === selectedRegion);
    }
    const providerTypes = [...new Set(filteredData.map(row => safeString(row?.providerType)).filter(Boolean))].sort();

    return {
      surveys,
      years,
      regions,
      providerTypes
    };
  }, [allData, selectedSurvey, selectedYear, selectedRegion, safeString]);

  // Cascading filter change handlers
  const handleSurveyChange = useCallback((value: string) => {
    const normalized = value ? safeString(value) : '';
    setSelectedSurvey(normalized);
    setSelectedYear('');
    setSelectedRegion('');
    setSelectedProviderType('');
  }, [safeString]);

  const handleYearChange = useCallback((value: string) => {
    const normalized = value ? safeString(value) : '';
    setSelectedYear(normalized);
    setSelectedRegion('');
    setSelectedProviderType('');
  }, [safeString]);

  const handleRegionChange = useCallback((value: string) => {
    const normalized = value ? safeString(value) : '';
    setSelectedRegion(normalized);
    setSelectedProviderType('');
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

      const matchesSpecialty = !specialtySearch || specialtyValue.toLowerCase().includes(specialtySearch.toLowerCase());

      return matchesSurvey && matchesYear && matchesRegion && matchesProviderType && matchesSpecialty;
    });
  }, [allData, selectedSurvey, selectedYear, selectedRegion, selectedProviderType, specialtySearch, safeString]);

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

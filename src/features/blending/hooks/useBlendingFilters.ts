/**
 * Custom hook for managing blending filters
 * 
 * Handles cascading filter logic and state management
 */

import { useState, useCallback, useMemo } from 'react';

export interface BlendingFilters {
  selectedSurveys: string[];
  selectedYears: string[];
  selectedRegions: string[];
  selectedProviderTypes: string[];
  selectedSpecialties: string[];
}

export interface FilterOptions {
  surveys: string[];
  years: string[];
  regions: string[];
  providerTypes: string[];
  specialties: string[];
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

  // Filter state - all multi-select
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedProviderTypes, setSelectedProviderTypes] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // Cascading filter options - computed based on current multi-select selections
  const filterOptions = useMemo((): FilterOptions => {
    if (!allData || allData.length === 0) {
      return {
        surveys: [],
        years: [],
        regions: [],
        providerTypes: [],
        specialties: []
      };
    }

    const surveys = [...new Set(allData.map(row => safeString(row?.surveySource)).filter(Boolean))].sort();

    let dataForYears = allData;
    if (selectedSurveys.length > 0) {
      dataForYears = dataForYears.filter(row => selectedSurveys.includes(safeString(row?.surveySource)));
    }
    const years = [...new Set(dataForYears.map(row => safeString(row?.surveyYear)).filter(Boolean))].sort();

    let dataForRegions = dataForYears;
    if (selectedYears.length > 0) {
      dataForRegions = dataForRegions.filter(row => selectedYears.includes(safeString(row?.surveyYear)));
    }
    const regions = [...new Set(dataForRegions.map(row => safeString(row?.geographicRegion)).filter(Boolean))].sort();

    let dataForProviderTypes = dataForRegions;
    if (selectedRegions.length > 0) {
      dataForProviderTypes = dataForProviderTypes.filter(row => selectedRegions.includes(safeString(row?.geographicRegion)));
    }
    const providerTypes = [...new Set(dataForProviderTypes.map(row => safeString(row?.providerType)).filter(Boolean))].sort();

    let dataForSpecialties = dataForProviderTypes;
    if (selectedProviderTypes.length > 0) {
      dataForSpecialties = dataForSpecialties.filter(row => {
        const pt = safeString(row?.providerType);
        return selectedProviderTypes.some(selected => {
          if (selected === 'Physician') {
            return pt === 'Staff Physician' || pt === 'Physician' || pt === 'staff physician';
          }
          return pt === selected;
        });
      });
    }
    const specialties = [...new Set(dataForSpecialties.map(row => safeString(row?.surveySpecialty)).filter(Boolean))].sort();

    return {
      surveys,
      years,
      regions,
      providerTypes,
      specialties
    };
  }, [allData, selectedSurveys, selectedYears, selectedRegions, selectedProviderTypes, safeString]);

  const handleSurveyChange = useCallback((value: string[]) => {
    setSelectedSurveys(Array.isArray(value) ? value : []);
  }, []);

  const handleYearChange = useCallback((value: string[]) => {
    setSelectedYears(Array.isArray(value) ? value : []);
  }, []);

  const handleRegionChange = useCallback((value: string[]) => {
    setSelectedRegions(Array.isArray(value) ? value : []);
  }, []);

  const handleProviderTypeChange = useCallback((value: string[]) => {
    setSelectedProviderTypes(Array.isArray(value) ? value : []);
  }, []);

  const handleSelectedSpecialtiesChange = useCallback((value: string[]) => {
    setSelectedSpecialties(Array.isArray(value) ? value : []);
  }, []);

  // Filter rows: include if each dimension is empty OR row value is in selected list
  const filteredSurveyData = useMemo(() => {
    if (!allData || allData.length === 0) {
      return [];
    }

    return allData.filter((row: any) => {
      if (!row) return false;

      const surveyValue = safeString(row.surveySource);
      const yearValue = safeString(row.surveyYear);
      const regionValue = safeString(row.geographicRegion);
      const providerTypeValue = safeString(row.providerType);
      const specialtyValue = safeString(row.surveySpecialty);

      const matchesSurvey = selectedSurveys.length === 0 || selectedSurveys.includes(surveyValue);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(yearValue);
      const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(regionValue);

      let matchesProviderType = true;
      if (selectedProviderTypes.length > 0) {
        matchesProviderType = selectedProviderTypes.some(selected => {
          if (selected === 'Physician') {
            return providerTypeValue === 'Staff Physician' || providerTypeValue === 'Physician' || providerTypeValue === 'staff physician';
          }
          return providerTypeValue === selected;
        });
      }

      const matchesSpecialty =
        selectedSpecialties.length === 0 ||
        selectedSpecialties.some(s => s && specialtyValue === s);

      return matchesSurvey && matchesYear && matchesRegion && matchesProviderType && matchesSpecialty;
    });
  }, [allData, selectedSurveys, selectedYears, selectedRegions, selectedProviderTypes, selectedSpecialties, safeString]);

  return {
    selectedSurveys,
    selectedYears,
    selectedRegions,
    selectedProviderTypes,
    selectedSpecialties,
    filterOptions,
    filteredSurveyData,
    handleSurveyChange,
    handleYearChange,
    handleRegionChange,
    handleProviderTypeChange,
    handleSelectedSpecialtiesChange,
    setSelectedSurveys,
    setSelectedYears,
    setSelectedRegions,
    setSelectedProviderTypes,
    setSelectedSpecialties,
    resetFilters: useCallback(() => {
      setSelectedSurveys([]);
      setSelectedYears([]);
      setSelectedRegions([]);
      setSelectedProviderTypes([]);
      setSelectedSpecialties([]);
    }, [])
  };
};

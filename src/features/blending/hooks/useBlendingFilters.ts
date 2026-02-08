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

  // Helper: row matches selected provider type (Physician matches Staff Physician, Physician, staff physician)
  const matchesProviderType = useCallback((row: any, selectedSet: Set<string>) => {
    if (selectedSet.size === 0) return true;
    const pt = safeString(row?.providerType);
    for (const selected of selectedSet) {
      if (selected === 'Physician') {
        if (pt === 'Staff Physician' || pt === 'Physician' || pt === 'staff physician') return true;
      } else if (pt === selected) return true;
    }
    return false;
  }, [safeString]);

  // Single-pass cascading filter options: one O(n) pass over allData
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
    const surveySet = new Set<string>();
    const yearSet = new Set<string>();
    const regionSet = new Set<string>();
    const providerTypeSet = new Set<string>();
    const specialtySet = new Set<string>();
    const selSurveys = new Set(selectedSurveys);
    const selYears = new Set(selectedYears);
    const selRegions = new Set(selectedRegions);
    const selProviderTypes = new Set(selectedProviderTypes);
    const selSpecialties = new Set(selectedSpecialties);

    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      if (!row) continue;
      const s = safeString(row.surveySource);
      const y = safeString(row.surveyYear);
      const r = safeString(row.geographicRegion);
      const pt = safeString(row.providerType);
      const sp = safeString(row.surveySpecialty);

      if (s) surveySet.add(s);

      const okSurvey = selSurveys.size === 0 || selSurveys.has(s);
      if (okSurvey && y) yearSet.add(y);

      const okYear = selYears.size === 0 || selYears.has(y);
      if (okSurvey && okYear && r) regionSet.add(r);

      const okRegion = selRegions.size === 0 || selRegions.has(r);
      if (okSurvey && okYear && okRegion && pt) providerTypeSet.add(pt);

      const okProvider = selProviderTypes.size === 0 || matchesProviderType(row, selProviderTypes);
      if (okSurvey && okYear && okRegion && okProvider && sp) specialtySet.add(sp);
    }

    const sort = (arr: string[]) => [...arr].filter(Boolean).sort();
    return {
      surveys: sort(Array.from(surveySet)),
      years: sort(Array.from(yearSet)),
      regions: sort(Array.from(regionSet)),
      providerTypes: sort(Array.from(providerTypeSet)),
      specialties: sort(Array.from(specialtySet))
    };
  }, [allData, selectedSurveys, selectedYears, selectedRegions, selectedProviderTypes, selectedSpecialties, safeString, matchesProviderType]);

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

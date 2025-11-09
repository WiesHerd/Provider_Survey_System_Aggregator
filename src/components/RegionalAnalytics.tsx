import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FormControl, Autocomplete, TextField, Drawer, Typography, List, ListItem, ListItemText, Divider, Tooltip } from '@mui/material';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ISurveyRow } from '../types/survey';
import { getDataService } from '../services/DataService';
import { RegionalComparison } from '../features/regional';
import { EnterpriseLoadingSpinner } from '../shared/components/EnterpriseLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { formatSpecialtyForDisplay, formatCurrency, formatNumber } from '../shared/utils/formatters';
import { filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
// Using new benchmarking query hook for better performance (reuses same data as benchmarking)
import { useBenchmarkingQuery } from '../features/analytics/hooks/useBenchmarkingQuery';
import { useSpecialtyOptions } from '../shared/hooks/useSpecialtyOptions';
import { SpecialtyDropdown } from '../shared/components';
import { AggregatedData } from '../features/analytics/types/analytics';
import { DynamicAggregatedData } from '../features/analytics/types/variables';
import { VariableDiscoveryService } from '../features/analytics/services/variableDiscoveryService';
import { formatVariableDisplayName } from '../features/analytics/utils/variableFormatters';
import { VariableFormattingService } from '../features/analytics/services/variableFormattingService';
import { matchSpecialtyName } from '../features/analytics/utils/analyticsCalculations';
import RegionalPrintable from './RegionalPrintable';

// These will be dynamically populated from region mappings
const DEFAULT_REGION_NAMES = ['National', 'Northeast', 'Midwest', 'South', 'West'];

// Helper function to check if data is in old AggregatedData format
const isAggregatedData = (row: AggregatedData | DynamicAggregatedData): row is AggregatedData => {
  return 'tcc_p50' in row;
};

// Helper function to safely get TCC p50 from either format
const getTccP50 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) {
    return row.tcc_p50 || 0;
  }
  // For DynamicAggregatedData, check variables object
  const tcc = row.variables?.tcc || row.variables?.total_cash_compensation;
  return tcc?.p50 || 0;
};

// Helper function to safely get CF p50 from either format
const getCfP50 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) {
    return row.cf_p50 || 0;
  }
  // For DynamicAggregatedData, check variables object
  const cf = row.variables?.tcc_per_work_rvu || row.variables?.conversion_factor;
  return cf?.p50 || 0;
};

// Helper function to safely get wRVU p50 from either format
const getWrvuP50 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) {
    return row.wrvu_p50 || 0;
  }
  // For DynamicAggregatedData, check variables object
  const wrvu = row.variables?.work_rvus || row.variables?.wrvu;
  return wrvu?.p50 || 0;
};

// Helper functions for all percentiles
const getTccP25 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.tcc_p25 || 0;
  const tcc = row.variables?.tcc || row.variables?.total_cash_compensation;
  return tcc?.p25 || 0;
};

const getTccP75 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.tcc_p75 || 0;
  const tcc = row.variables?.tcc || row.variables?.total_cash_compensation;
  return tcc?.p75 || 0;
};

const getTccP90 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.tcc_p90 || 0;
  const tcc = row.variables?.tcc || row.variables?.total_cash_compensation;
  return tcc?.p90 || 0;
};

const getCfP25 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.cf_p25 || 0;
  const cf = row.variables?.tcc_per_work_rvu || row.variables?.conversion_factor;
  return cf?.p25 || 0;
};

const getCfP75 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.cf_p75 || 0;
  const cf = row.variables?.tcc_per_work_rvu || row.variables?.conversion_factor;
  return cf?.p75 || 0;
};

const getCfP90 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.cf_p90 || 0;
  const cf = row.variables?.tcc_per_work_rvu || row.variables?.conversion_factor;
  return cf?.p90 || 0;
};

const getWrvuP25 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.wrvu_p25 || 0;
  const wrvu = row.variables?.work_rvus || row.variables?.wrvu;
  return wrvu?.p25 || 0;
};

const getWrvuP75 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.wrvu_p75 || 0;
  const wrvu = row.variables?.work_rvus || row.variables?.wrvu;
  return wrvu?.p75 || 0;
};

const getWrvuP90 = (row: AggregatedData | DynamicAggregatedData): number => {
  if (isAggregatedData(row)) return row.wrvu_p90 || 0;
  const wrvu = row.variables?.work_rvus || row.variables?.wrvu;
  return wrvu?.p90 || 0;
};

/**
 * Generic helper to extract variable value from either data format
 * Supports both legacy AggregatedData and dynamic DynamicAggregatedData
 */
const getVariableValue = (
  row: AggregatedData | DynamicAggregatedData,
  variableName: string,
  percentile: 'p25' | 'p50' | 'p75' | 'p90'
): number => {
  // Legacy format: check direct properties
  if (isAggregatedData(row)) {
    // Map standard variable names to legacy field names
    const legacyFieldMap: Record<string, Record<string, keyof AggregatedData>> = {
      'tcc': { p25: 'tcc_p25', p50: 'tcc_p50', p75: 'tcc_p75', p90: 'tcc_p90' },
      'total_cash_compensation': { p25: 'tcc_p25', p50: 'tcc_p50', p75: 'tcc_p75', p90: 'tcc_p90' },
      'tcc_per_work_rvu': { p25: 'cf_p25', p50: 'cf_p50', p75: 'cf_p75', p90: 'cf_p90' },
      'conversion_factor': { p25: 'cf_p25', p50: 'cf_p50', p75: 'cf_p75', p90: 'cf_p90' },
      'cf': { p25: 'cf_p25', p50: 'cf_p50', p75: 'cf_p75', p90: 'cf_p90' },
      'work_rvus': { p25: 'wrvu_p25', p50: 'wrvu_p50', p75: 'wrvu_p75', p90: 'wrvu_p90' },
      'work_rvu': { p25: 'wrvu_p25', p50: 'wrvu_p50', p75: 'wrvu_p75', p90: 'wrvu_p90' },
      'wrvu': { p25: 'wrvu_p25', p50: 'wrvu_p50', p75: 'wrvu_p75', p90: 'wrvu_p90' },
      'wrvus': { p25: 'wrvu_p25', p50: 'wrvu_p50', p75: 'wrvu_p75', p90: 'wrvu_p90' }
    };
    
    const fieldMap = legacyFieldMap[variableName];
    if (fieldMap && fieldMap[percentile]) {
      return (row[fieldMap[percentile]] as number) || 0;
    }
    return 0;
  }
  
  // Dynamic format: check variables object
  const variables = row.variables || {};
  
  // Try exact match first
  if (variables[variableName] && variables[variableName][percentile]) {
    return variables[variableName][percentile] || 0;
  }
  
  // For Call Pay variables, try comprehensive matching
  const isCallPayVariable = variableName.toLowerCase().includes('call') || 
                             variableName.toLowerCase().includes('on_call') ||
                             variableName.toLowerCase().includes('oncall') ||
                             variableName.toLowerCase().includes('daily_rate');
  
  if (isCallPayVariable) {
    // Try all possible Call Pay variable name variations
    const callPayVariations = [
      'on_call_compensation',
      'oncall_compensation', 
      'daily_rate_on_call',
      'daily_rate_oncall',
      'daily_rate_on_call_compensation',
      'daily_rate_oncall_compensation',
      'on_call_rate',
      'oncall_rate',
      'call_pay',
      'callpay',
      'on_call',
      'oncall'
    ];
    
    // Also check all variable keys in the row for any that contain call/oncall keywords
    const allVariableKeys = Object.keys(variables);
    const callPayKeys = allVariableKeys.filter(key => {
      const lower = key.toLowerCase();
      return lower.includes('call') || lower.includes('oncall') || lower.includes('daily');
    });
    
    // Try variations first
    for (const variation of callPayVariations) {
      if (variables[variation] && variables[variation][percentile]) {
        return variables[variation][percentile] || 0;
      }
    }
    
    // Then try any call pay keys found in the data
    for (const key of callPayKeys) {
      if (variables[key] && variables[key][percentile]) {
        return variables[key][percentile] || 0;
      }
    }
  }
  
  // Try alternative variable name variations for other variables
  const alternativeNames = [
    // For TCC
    'total_cash_compensation', 'total_compensation', 'tcc',
    // For CF
    'tcc_per_work_rvu', 'tcc_per_work_rvus', 'conversion_factor', 'cf',
    // For wRVU
    'work_rvus', 'work_rvu', 'wrvu', 'wrvus'
  ];
  
  // Check if variableName matches any alternative
  for (const altName of alternativeNames) {
    if (variableName.includes(altName) || altName.includes(variableName)) {
      if (variables[altName] && variables[altName][percentile]) {
        return variables[altName][percentile] || 0;
      }
    }
  }
  
  // Try direct key match with normalization
  const normalizedKey = variableName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (variables[normalizedKey] && variables[normalizedKey][percentile]) {
    return variables[normalizedKey][percentile] || 0;
  }
  
  // Last resort: try case-insensitive partial match on all keys
  const lowerVarName = variableName.toLowerCase();
  for (const key of Object.keys(variables)) {
    if (key.toLowerCase() === lowerVarName || 
        key.toLowerCase().includes(lowerVarName) || 
        lowerVarName.includes(key.toLowerCase())) {
      if (variables[key] && variables[key][percentile]) {
        return variables[key][percentile] || 0;
      }
    }
  }
  
  return 0;
};

/**
 * Check if row has any valid data for the selected variables
 */
const hasValidVariableData = (
  row: AggregatedData | DynamicAggregatedData,
  variables: string[]
): boolean => {
  if (variables.length === 0) return false;
  
  return variables.some(variableName => {
    const p25 = getVariableValue(row, variableName, 'p25');
    const p50 = getVariableValue(row, variableName, 'p50');
    const p75 = getVariableValue(row, variableName, 'p75');
    const p90 = getVariableValue(row, variableName, 'p90');
    return p25 > 0 || p50 > 0 || p75 > 0 || p90 > 0;
  });
};

export const RegionalAnalytics: React.FC = () => {
  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
  
  const [analyticsData, setAnalyticsData] = useState<AggregatedData[] | DynamicAggregatedData[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedProviderType, setSelectedProviderType] = useState<string>('');
  const [selectedSurveySource, setSelectedSurveySource] = useState<string>('');
  // ENTERPRISE FIX: Initialize with default compensation filter (will be set after data loads)
  const [selectedDataCategory, setSelectedDataCategory] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [regionMappings, setRegionMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [provenanceRegion, setProvenanceRegion] = useState<string>('');
  
  // Variable-aware state
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);

  // Print functionality
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: "@page { size: auto; margin: 0; }",
    documentTitle: "Regional Analytics Report"
  });

  // Use benchmarking query hook for shared data caching (same data as Survey Analytics)
  const {
    allData: queryAllData,
    loading: queryLoading,
    loadingProgress: queryProgress
  } = useBenchmarkingQuery({
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '',
    year: ''
  }, []);

  useEffect(() => {
    if (queryAllData.length > 0) {
      console.log('🔍 Regional Analytics: Loaded analytics data from cache -', queryAllData.length, 'records');
      
      // ENTERPRISE DEBUG: Log Call Pay data specifically
      const callPayData = (queryAllData as (AggregatedData | DynamicAggregatedData)[]).filter((row: any) => {
        const dataCategory = row.dataCategory || '';
        const surveySource = row.surveySource || '';
        return dataCategory === 'CALL_PAY' || surveySource.toLowerCase().includes('call pay');
      });
      console.log('🔍 Regional Analytics: Call Pay data found:', callPayData.length, 'rows');
      if (callPayData.length > 0) {
        const callPaySpecialties = Array.from(new Set(callPayData.map((r: any) => r.standardizedName)));
        console.log('🔍 Regional Analytics: Call Pay specialties (standardizedName):', callPaySpecialties);
        console.log('🔍 Regional Analytics: Sample Call Pay rows:', callPayData.slice(0, 3).map((row: any) => ({
          standardizedName: row.standardizedName,
          surveySpecialty: row.surveySpecialty,
          originalSpecialty: row.originalSpecialty,
          surveySource: row.surveySource,
          providerType: row.providerType,
          dataCategory: row.dataCategory,
          geographicRegion: row.geographicRegion,
          surveyYear: row.surveyYear,
          hasVariables: !!row.variables,
          variableKeys: row.variables ? Object.keys(row.variables) : [],
          sampleVariable: row.variables ? Object.keys(row.variables)[0] : null,
          sampleValue: row.variables && Object.keys(row.variables).length > 0 
            ? row.variables[Object.keys(row.variables)[0]] 
            : null
        })));
      }
      
      // Debug: Check what years are in the data
      const yearsInData = Array.from(new Set(queryAllData.map(r => r.surveyYear).filter(Boolean)));
      console.log('🔍 Regional Analytics: Years found in data:', yearsInData);
      
      // Debug: Check survey sources
      const sourcesInData = Array.from(new Set(queryAllData.map(r => r.surveySource).filter(Boolean)));
      console.log('🔍 Regional Analytics: Survey sources found:', sourcesInData);
      
      // Debug: Check what regions are actually in the data
      const regionsInData = Array.from(new Set(queryAllData.map(r => r.geographicRegion).filter(Boolean)));
      console.log('🔍 Regional Analytics: Regions found in data:', regionsInData);
      
      // Debug: Check specialties
      const specialtiesInData = Array.from(new Set(queryAllData.map((r: any) => r.standardizedName).filter(Boolean)));
      console.log('🔍 Regional Analytics: Specialties found in data:', specialtiesInData.slice(0, 10));
      
      // Also load mappings for filter options
      const dataService = getDataService();
      Promise.all([
        dataService.getAllSpecialtyMappings(),
        dataService.getRegionMappings()
      ]).then(([allMappings, regionMappings]) => {
        setAnalyticsData(queryAllData);
        setMappings(allMappings);
        setRegionMappings(regionMappings);
        setLoading(false);
        console.log('🔍 Regional Analytics: Data loading complete');
      });
    }
  }, [queryAllData]);
  
  // Sync loading state
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading]);

  // NEW: Get specialty options with mapping transparency
  const { specialties: specialtyOptions } = useSpecialtyOptions();

  // ENTERPRISE FIX: Populate specialties from actual data, not just mappings
  // This ensures all specialties in the data are available, even if not yet mapped
  const specialties = useMemo(() => {
    // Extract unique specialties from actual analytics data
    const specialtiesFromData = Array.from(
      new Set(
        analyticsData
          .map((row: any) => row.standardizedName)
          .filter((name: string) => name && name.trim())
      )
    ).sort();
    
    // Also include specialties from mappings (for completeness)
    const specialtiesFromMappings = mappings.map(m => m.standardizedName);
    
    // Combine and deduplicate (case-insensitive)
    const allSpecialties = new Set<string>();
    [...specialtiesFromData, ...specialtiesFromMappings].forEach(spec => {
      if (spec && spec.trim()) {
        allSpecialties.add(spec);
      }
    });
    
    const specialtyList = Array.from(allSpecialties).sort();
    
    console.log('🔍 Regional Analytics - Specialties for dropdown:', {
      fromData: specialtiesFromData.length,
      fromMappings: specialtiesFromMappings.length,
      totalUnique: specialtyList.length,
      firstFewSpecialties: specialtyList.slice(0, 10),
      sampleFromData: specialtiesFromData.slice(0, 5),
      sampleFromMappings: specialtiesFromMappings.slice(0, 5)
    });
    
    return specialtyList;
  }, [analyticsData, mappings]);

  // Extract unique provider types and survey sources from loaded data
  // ENTERPRISE FIX: Normalize and deduplicate provider types (case-insensitive, title case)
  const providerTypes = useMemo(() => {
    // Use a Map to deduplicate case-insensitively and normalize to title case
    const providerTypeMap = new Map<string, string>(); // Maps lowercase to properly formatted
    analyticsData.forEach(row => {
      const providerType = row.providerType || '';
      if (providerType && providerType.trim()) {
        const lower = providerType.toLowerCase().trim();
        if (!providerTypeMap.has(lower)) {
          // Format to title case: "staff physician" -> "Staff Physician"
          const formatted = providerType
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          providerTypeMap.set(lower, formatted);
        }
      }
    });
    const types = Array.from(providerTypeMap.values()).sort();
    console.log('🔍 Regional Analytics - Provider types extraction:', {
      totalRows: analyticsData.length,
      providerTypes: types,
      sampleRows: analyticsData.slice(0, 3).map(r => ({
        providerType: r.providerType,
        surveySource: r.surveySource
      }))
    });
    return types;
  }, [analyticsData]);
  
  const surveySources = useMemo(() => {
    const sources = Array.from(new Set(analyticsData.map(r => r.surveySource || '').filter(Boolean)));
    return sources.sort();
  }, [analyticsData]);

  // Extract available years from survey data
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(analyticsData.map(r => String(r.surveyYear || '')).filter(Boolean)));
    console.log('🔍 Regional Analytics - Available years:', years);
    return years.sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  }, [analyticsData]);

  // Extract available data categories from survey data
  const dataCategories = useMemo(() => {
    const categories = Array.from(new Set(
      analyticsData
        .map(r => r.dataCategory || '')
        .filter(Boolean)
        .map(cat => {
          // Format for display
          if (cat === 'CALL_PAY') return 'Call Pay';
          if (cat === 'MOONLIGHTING') return 'Moonlighting';
          if (cat === 'COMPENSATION') return 'Compensation';
          return cat;
        })
    ));
    return categories.sort();
  }, [analyticsData]);

  // Track if filters have been explicitly cleared by user
  const filtersClearedRef = useRef(false);

  // ENTERPRISE FIX: Default to "Compensation" only for regional analytics
  // Regional analytics is designed for annual compensation comparison, not call pay rates
  // Users can still explicitly select "Call Pay" if they want to analyze call pay regionally
  // Set default data category after data categories are available (but only if filters weren't explicitly cleared)
  useEffect(() => {
    if (dataCategories.length > 0 && !selectedDataCategory && dataCategories.includes('Compensation') && !filtersClearedRef.current) {
      setSelectedDataCategory('Compensation');
      console.log('🔍 Regional Analytics: Defaulting to "Compensation" data category for regional analytics');
    }
    // Reset the flag after a short delay to allow for initial load
    if (filtersClearedRef.current) {
      const timer = setTimeout(() => {
        filtersClearedRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dataCategories, selectedDataCategory]);

  // Variable discovery based on data category
  useEffect(() => {
    const discoverVariables = async () => {
      try {
        const service = VariableDiscoveryService.getInstance();
        service.clearCache(); // Ensure fresh discovery when category changes
        
        // Normalize data category for discovery service
        const dataCategoryFilter = selectedDataCategory && 
          selectedDataCategory !== '' && 
          selectedDataCategory !== 'All Categories'
          ? selectedDataCategory
          : undefined;
        
        console.log('🔍 Regional Analytics: Discovering variables', dataCategoryFilter ? `(filtered by: ${dataCategoryFilter})` : '(all categories)');
        const discovered = await service.discoverAllVariables(dataCategoryFilter);
        const variableNames = discovered.map(v => v.normalizedName);
        setAvailableVariables(variableNames);
        
        console.log('🔍 Regional Analytics: Available variables:', variableNames);
        
        // Set smart defaults based on data category
        let defaultVariables: string[] = [];
        if (selectedDataCategory === 'Call Pay') {
          // For Call Pay, find on_call_compensation or similar
          const callPayVar = variableNames.find(v => {
            const lower = v.toLowerCase();
            return lower.includes('on_call') || 
                   lower.includes('oncall') || 
                   lower.includes('call_pay') ||
                   lower.includes('callpay') ||
                   lower.includes('daily_rate') ||
                   lower.includes('daily') ||
                   lower.includes('call');
          });
          defaultVariables = callPayVar ? [callPayVar] : (variableNames.length > 0 ? [variableNames[0]] : []);
          console.log('🔍 Regional Analytics: Call Pay variable discovery:', {
            allVariables: variableNames,
            foundCallPayVar: callPayVar,
            defaultVariables,
            selectedDataCategory
          });
        } else if (selectedDataCategory === 'Compensation' || !selectedDataCategory || selectedDataCategory === '') {
          // For Compensation or All Categories, default to industry standard: TCC, CF, wRVU
          const tccVar = variableNames.find(v => v === 'tcc' || v === 'total_cash_compensation');
          const cfVar = variableNames.find(v => 
            v === 'tcc_per_work_rvu' || 
            v === 'conversion_factor' || 
            v === 'cf' ||
            v === 'tcc_per_work_rvus'
          );
          const wrvuVar = variableNames.find(v => 
            v === 'work_rvus' || 
            v === 'work_rvu' || 
            v === 'wrvu' ||
            v === 'wrvus'
          );
          
          defaultVariables = [];
          if (tccVar) defaultVariables.push(tccVar);
          if (cfVar) defaultVariables.push(cfVar);
          if (wrvuVar) defaultVariables.push(wrvuVar);
          
          // If standard variables not found, use first available
          if (defaultVariables.length === 0 && variableNames.length > 0) {
            defaultVariables = [variableNames[0]];
          }
          
          console.log('🔍 Regional Analytics: Compensation default variables:', defaultVariables);
        } else {
          // For other categories (Moonlighting, Custom), use first available
          defaultVariables = variableNames.length > 0 ? [variableNames[0]] : [];
        }
        
        // Only update if we have valid defaults and current selection is empty or needs updating
        if (defaultVariables.length > 0) {
          // Check if current selection is still valid (all selected vars exist in available)
          const currentSelectionValid = selectedVariables.length > 0 && 
            selectedVariables.every(v => variableNames.includes(v));
          
          // Only set defaults if:
          // 1. No variables currently selected, OR
          // 2. Current selection is invalid (vars don't exist in new available list)
          // This preserves user's manual selections if they're still valid
          if (!currentSelectionValid || selectedVariables.length === 0) {
            setSelectedVariables(defaultVariables);
            console.log('🔍 Regional Analytics: Set default variables:', defaultVariables);
          } else {
            console.log('🔍 Regional Analytics: Preserving user-selected variables:', selectedVariables);
          }
        } else if (variableNames.length > 0 && selectedVariables.length === 0) {
          // Fallback: if no defaults but variables available, use first available
          setSelectedVariables([variableNames[0]]);
          console.log('🔍 Regional Analytics: Set fallback variable:', variableNames[0]);
        }
      } catch (error) {
        console.error('🔍 Regional Analytics: Error discovering variables:', error);
        setAvailableVariables([]);
      }
    };
    
    if (selectedDataCategory !== undefined) {
      discoverVariables();
    }
  }, [selectedDataCategory]);

  // Multi-filter logic with specialty, provider type, survey source, data category, and year
  const filtered = useMemo(() => {
    if (!selectedSpecialty) {
      console.log(`⚠️ No specialty selected - returning empty array`);
      return [];
    }
    
    console.log(`🔍 Filtering for:`, {
      specialty: selectedSpecialty,
      providerType: selectedProviderType,
      surveySource: selectedSurveySource,
      dataCategory: selectedDataCategory,
      year: selectedYear
    });
    console.log(`📊 Total rows to filter: ${analyticsData.length}`);
    
    // ENTERPRISE DEBUG: Log available specialties in data (especially for Call Pay)
    if (selectedDataCategory === 'Call Pay' && analyticsData.length > 0) {
      const callPayRows = (analyticsData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => {
        const dataCat = (row as any).dataCategory || '';
        const source = row.surveySource || '';
        return dataCat === 'CALL_PAY' || source.toLowerCase().includes('call pay');
      });
      const callPaySpecialties = Array.from(new Set(callPayRows.map((r: AggregatedData | DynamicAggregatedData) => r.standardizedName).filter(Boolean)));
      console.log(`🔍 Call Pay specialties in data:`, callPaySpecialties);
      console.log(`🔍 Looking for specialty: "${selectedSpecialty}"`);
    }
    
    // ENTERPRISE DEBUG: Log sample rows before filtering
    if (analyticsData.length > 0) {
      console.log(`🔍 Sample rows BEFORE filtering:`, analyticsData.slice(0, 3).map((row: AggregatedData | DynamicAggregatedData) => ({
        standardizedName: row.standardizedName,
        providerType: row.providerType,
        surveySource: row.surveySource,
        dataCategory: (row as any).dataCategory,
        geographicRegion: row.geographicRegion,
        surveyYear: row.surveyYear,
        hasVariables: !!(row as any).variables,
        variableKeys: (row as any).variables ? Object.keys((row as any).variables).slice(0, 5) : []
      })));
    }
    
    let specialtyMatches = 0;
    let providerTypeMatches = 0;
    let surveySourceMatches = 0;
    let dataCategoryMatches = 0;
    let yearMatches = 0;
    
    const filteredRows = (analyticsData as (AggregatedData | DynamicAggregatedData)[]).filter((row: AggregatedData | DynamicAggregatedData) => {
      // Specialty filter - Use flexible matching with standardizedName (from specialty mappings)
      // ENTERPRISE FIX: Handle case-insensitive comparison and normalize variations
      const rowStandardizedName = (row.standardizedName || '').trim();
      const selectedSpecialtyNormalized = (selectedSpecialty || '').trim();
      
      if (!selectedSpecialtyNormalized) {
        return false; // No specialty selected
      }
      
      // Normalize both for comparison: lowercase and normalize spacing/colons
      const normalizeSpecialtyName = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/\s*:\s*/g, ':') // Normalize colon spacing: "pediatrics : general" -> "pediatrics:general"
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim();
      };
      
      const normalizedRow = normalizeSpecialtyName(rowStandardizedName);
      const normalizedSelected = normalizeSpecialtyName(selectedSpecialtyNormalized);
      
      // Try exact normalized match first
      if (normalizedRow === normalizedSelected) {
        specialtyMatches++;
      } else {
        // Also try partial matching for cases like "pediatrics: general" vs "pediatrics:general"
        // or "general pediatrics" vs "pediatrics: general"
        const rowParts = normalizedRow.split(/[:,\s]+/).filter(p => p.length > 0);
        const selectedParts = normalizedSelected.split(/[:,\s]+/).filter(p => p.length > 0);
        
        // Check if all selected parts are found in row (order-independent)
        const allPartsMatch = selectedParts.length > 0 && 
          selectedParts.every(part => rowParts.some(rowPart => rowPart.includes(part) || part.includes(rowPart)));
        
        if (!allPartsMatch) {
          // Debug logging for specialty mismatches (limit to avoid spam)
          if (specialtyMatches < 3) {
            console.log(`🔍 Specialty mismatch:`, {
              rowStandardizedName,
              selectedSpecialtyNormalized,
              normalizedRow,
              normalizedSelected,
              rowParts,
              selectedParts
            });
          }
          return false;
        }
        specialtyMatches++;
      }
      
      // Provider type filter - ENTERPRISE FIX: Handle Call Pay surveys (CALL provider type) specially
      // Skip filter if "All Provider Types" is selected
      if (selectedProviderType && selectedProviderType.toLowerCase() !== 'all provider types') {
        const rowProviderType = String(row.providerType || '').trim();
        const rowDataCategory = (row as any).dataCategory;
        
        // ENTERPRISE FIX: Call Pay surveys may have providerType='CALL' but should match 'Staff Physician'
        // because Call Pay is physician compensation data
        const isCallPayData = rowDataCategory === 'CALL_PAY' || 
                             (row.surveySource || '').toLowerCase().includes('call pay');
        
        // If this is Call Pay data and user selected "Staff Physician", allow it through
        // (Call Pay is physician compensation, so it should be included)
        if (isCallPayData && 
            (selectedProviderType.toLowerCase() === 'staff physician' || 
             selectedProviderType.toLowerCase() === 'physician')) {
          // Allow through - Call Pay is physician data
          providerTypeMatches++;
        } else {
          // Normalize both to title case for comparison (matches display normalization)
          const normalizeForComparison = (str: string): string => {
            if (!str) return '';
            // Handle special cases
            if (str.toLowerCase() === 'call') return 'Staff Physician';
            return str
              .split(/\s+/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          };
          const normalizedSelected = normalizeForComparison(selectedProviderType);
          const normalizedRow = normalizeForComparison(rowProviderType);
          if (normalizedRow !== normalizedSelected) {
            return false;
          }
          providerTypeMatches++;
        }
      }
      
      // Survey source filter - Skip if "All Survey Sources" is selected
      if (selectedSurveySource && selectedSurveySource.toLowerCase() !== 'all survey sources') {
        const rowSurveySource = String(row.surveySource || '');
        if (rowSurveySource.toLowerCase() !== selectedSurveySource.toLowerCase()) {
          return false;
        }
        surveySourceMatches++;
      }
      
      // Data category filter - ENTERPRISE FIX: Handle missing dataCategory (infer from surveySource)
      if (selectedDataCategory) {
        let rowDataCategory = row.dataCategory || '';
        
        // ENTERPRISE FIX: If dataCategory is missing, infer from surveySource for backward compatibility
        if (!rowDataCategory) {
          const surveySource = String(row.surveySource || '').toLowerCase();
          if (surveySource.includes('call pay')) {
            rowDataCategory = 'CALL_PAY';
          } else if (surveySource.includes('moonlighting')) {
            rowDataCategory = 'MOONLIGHTING';
          } else {
            rowDataCategory = 'COMPENSATION'; // Default for old surveys
          }
        }
        
        // Normalize selected category to enum format
        const normalizedSelected = selectedDataCategory === 'Call Pay' ? 'CALL_PAY'
          : selectedDataCategory === 'Moonlighting' ? 'MOONLIGHTING'
          : selectedDataCategory === 'Compensation' ? 'COMPENSATION'
          : selectedDataCategory.toUpperCase().replace(/\s+/g, '_');
        
        // Compare normalized values (case-insensitive)
        if (rowDataCategory.toUpperCase() !== normalizedSelected.toUpperCase()) {
          return false;
        }
        dataCategoryMatches++;
      }
      
      // Year filter
      if (selectedYear) {
        const rowYear = String(row.surveyYear || '');
        if (rowYear !== selectedYear) {
          return false;
        }
        yearMatches++;
      }
      
      return true;
    });
    
    console.log(`✅ Filtered rows found: ${filteredRows.length}`);
    console.log(`🔍 Filter breakdown:`, {
      specialtyMatches,
      providerTypeMatches: selectedProviderType ? providerTypeMatches : 'N/A (no filter)',
      surveySourceMatches: selectedSurveySource ? surveySourceMatches : 'N/A (no filter)',
      dataCategoryMatches: selectedDataCategory ? dataCategoryMatches : 'N/A (no filter)',
      yearMatches: selectedYear ? yearMatches : 'N/A (no filter)'
    });
    if (filteredRows.length > 0) {
      console.log(`📋 Sample filtered rows with data:`, filteredRows.slice(0, 3).map((row: AggregatedData | DynamicAggregatedData) => ({
        standardizedName: row.standardizedName,
        surveySource: row.surveySource,
        geographicRegion: row.geographicRegion,
        surveyYear: row.surveyYear,
        providerType: row.providerType,
        dataCategory: (row as any).dataCategory,
        tcc_p50: getTccP50(row),
        cf_p50: getCfP50(row),
        wrvu_p50: getWrvuP50(row),
        hasVariables: !!(row as any).variables,
        variableKeys: (row as any).variables ? Object.keys((row as any).variables) : []
      })));
    } else {
      // ENTERPRISE DEBUG: Log why no rows matched
      console.log(`⚠️ No filtered rows found. Debugging filter criteria:`, {
        selectedSpecialty,
        selectedProviderType,
        selectedSurveySource,
        selectedDataCategory,
        selectedYear,
        totalDataRows: analyticsData.length,
        sampleRow: analyticsData[0] ? {
          standardizedName: analyticsData[0].standardizedName,
          providerType: analyticsData[0].providerType,
          surveySource: analyticsData[0].surveySource,
          dataCategory: (analyticsData[0] as any).dataCategory,
          geographicRegion: analyticsData[0].geographicRegion
        } : null
      });
    }
    
    return filteredRows;
  }, [selectedSpecialty, selectedProviderType, selectedSurveySource, selectedDataCategory, selectedYear, analyticsData]);


  // Helper to average a field
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Prepare data for RegionalComparison: average each percentile field for each region
  const regionalComparisonData = useMemo(() => {
    console.log(`📊 Calculating regional comparison data for ${filtered.length} filtered rows`);
    
    // Debug: Check what regions are actually in the filtered data
    const uniqueRegions = Array.from(new Set(filtered.map((r: AggregatedData | DynamicAggregatedData) => r.geographicRegion)));
    console.log(`🔍 Unique regions in filtered data:`, uniqueRegions);
    
    // Debug: Show detailed region information
    console.log(`🔍 Detailed region analysis:`, filtered.slice(0, 10).map((r: AggregatedData | DynamicAggregatedData) => ({
      standardizedName: r.standardizedName,
      geographicRegion: r.geographicRegion,
      surveySource: r.surveySource,
      tcc_p50: getTccP50(r)
    })));
    
    // Filter out any rows with invalid data - ENTERPRISE FIX: Use variable-aware validation
    const validRows = (filtered as (AggregatedData | DynamicAggregatedData)[]).filter((r: AggregatedData | DynamicAggregatedData) => {
      // If variables are selected, check if row has data for any selected variable
      if (selectedVariables.length > 0) {
        const hasValidData = hasValidVariableData(r, selectedVariables);
        // ENTERPRISE DEBUG: Log call pay data validation
        const isCallPay = (r as any).dataCategory === 'CALL_PAY' || (r.surveySource || '').toLowerCase().includes('call pay');
        if (isCallPay && !hasValidData) {
          console.log(`🔍 Call Pay row filtered out - no valid variable data:`, {
            standardizedName: r.standardizedName,
            surveySource: r.surveySource,
            selectedVariables,
            hasVariables: !!(r as any).variables,
            variableKeys: (r as any).variables ? Object.keys((r as any).variables) : [],
            sampleValues: selectedVariables.map(v => ({
              variable: v,
              p50: getVariableValue(r, v, 'p50'),
              p75: getVariableValue(r, v, 'p75')
            }))
          });
        }
        return hasValidData;
      }
      
      // Otherwise, check legacy TCC/CF/wRVU fields (backward compatibility)
      const hasValidTCC = getTccP50(r) > 0 || getTccP25(r) > 0 || getTccP75(r) > 0 || getTccP90(r) > 0;
      const hasValidCF = getCfP50(r) > 0 || getCfP25(r) > 0 || getCfP75(r) > 0 || getCfP90(r) > 0;
      const hasValidWRVU = getWrvuP50(r) > 0 || getWrvuP25(r) > 0 || getWrvuP75(r) > 0 || getWrvuP90(r) > 0;
      return hasValidTCC || hasValidCF || hasValidWRVU;
    });
    
    console.log(`✅ Valid rows with data: ${validRows.length} out of ${filtered.length}`);
    if (validRows.length === 0 && filtered.length > 0) {
      console.log(`⚠️ All filtered rows were invalid. Sample invalid row:`, {
        row: filtered[0],
        selectedVariables,
        hasVariables: !!(filtered[0] as any).variables,
        variableKeys: (filtered[0] as any).variables ? Object.keys((filtered[0] as any).variables) : []
      });
    }
    
    // Helper function to map to parent region names (from Region Mapping screen)
    const mapToParentRegion = (region: string): string => {
      if (!region || region.toLowerCase() === 'national') return 'national';
      
      const lower = region.toLowerCase().trim();
      
      console.log(`🔍 Mapping region "${region}" to parent region...`);
      
      // Map to parent region names from Region Mapping screen
      // ENTERPRISE FIX: Handle "eastern" as equivalent to "northeast" (as per region mapping screen)
      if (lower.includes('eastern') || lower.includes('northeast') || lower.includes('northeastern') || lower.includes('ne') || 
          lower.includes('north central') || lower.includes('new england') || lower.includes('atlantic')) {
        console.log(`  → Mapped to northeast`);
        return 'northeast';
      } else if (lower.includes('southeast') || lower.includes('southern') || lower.includes('se') || 
                 lower.includes('south central') || lower.includes('south') || lower.includes('gulf')) {
        console.log(`  → Mapped to south`);
        return 'south';
      } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('nc') || 
                 lower.includes('great lakes') || lower.includes('central') || lower.includes('plains')) {
        console.log(`  → Mapped to midwest`);
        return 'midwest';
      } else if (lower.includes('west') || lower.includes('western') || lower.includes('southwest') || 
                 lower.includes('sw') || lower.includes('pacific') || lower.includes('mountain')) {
        console.log(`  → Mapped to west`);
        return 'west';
      }
      
      console.log(`  → No mapping found, returning original: ${lower}`);
      return lower; // Return lowercase original if no match
    };
    
    // Get standardized region names from mappings or use parent region names from Region Mapping screen
    // National should be first, then others alphabetically
    let standardizedRegions: string[] = [];
    
    if (regionMappings.length > 0) {
      standardizedRegions = regionMappings.map(m => m.standardizedName).sort();
      console.log(`🔍 Using region mappings:`, standardizedRegions);
    } else {
      // Fallback: try to determine regions from the actual data
      const dataRegions = Array.from(new Set(validRows.map((r: AggregatedData | DynamicAggregatedData) => mapToParentRegion(r.geographicRegion))));
      console.log(`🔍 No region mappings found, using data regions:`, dataRegions);
      standardizedRegions = (dataRegions as string[]).filter((r: string) => r !== 'national').sort();
    }
    
    // Ensure National is first
    const orderedRegions = ['national', ...standardizedRegions.filter(r => r !== 'national')];
    
    console.log(`🌍 Using ordered regions:`, orderedRegions);
    
    const result = orderedRegions.map(regionName => {
      // For 'national' (lowercase), use all valid filtered rows
      const regionRows = regionName.toLowerCase() === 'national'
        ? validRows
        : validRows.filter((r: AggregatedData | DynamicAggregatedData) => {
          const parentRegion = mapToParentRegion(r.geographicRegion);
          // Map the regionName to its parent region for comparison
          const targetParentRegion = mapToParentRegion(regionName);
          return parentRegion === targetParentRegion;
        });
      
      console.log(`🔍 Filtering for region "${regionName}": found ${regionRows.length} rows`);
      console.log(`🔍 Available regions in data:`, Array.from(new Set(validRows.map((r: AggregatedData | DynamicAggregatedData) => r.geographicRegion).filter(Boolean))));
      const targetParentRegion = mapToParentRegion(regionName);
      console.log(`🔍 Region mapping for ${regionName} (target parent: ${targetParentRegion}):`, validRows.slice(0, 3).map((r: AggregatedData | DynamicAggregatedData) => ({
        original: r.geographicRegion,
        parentRegion: mapToParentRegion(r.geographicRegion),
        target: targetParentRegion,
        matches: mapToParentRegion(r.geographicRegion) === targetParentRegion
      })));
      if (regionRows.length > 0) {
        console.log(`🔍 Sample rows for ${regionName}:`, regionRows.slice(0, 2).map((r: AggregatedData | DynamicAggregatedData) => ({
          region: r.geographicRegion,
          tcc_p50: getTccP50(r)
        })));
      }
      if (regionRows.length > 0) {
        console.log(`📋 Sample rows for ${regionName}:`, regionRows.slice(0, 2).map((r: AggregatedData | DynamicAggregatedData) => ({
          standardizedName: r.standardizedName,
          region: r.geographicRegion,
          tcc_p50: getTccP50(r),
          cf_p50: getCfP50(r),
          wrvu_p50: getWrvuP50(r)
        })));
      }
      
      // Calculate simple averages (same as regional calculations utility)
      const calculateAverage = (values: number[]) => {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      };
      
      // Capitalize region name for display (e.g., "eastern" -> "Eastern", "northeast" -> "Northeast")
      const capitalizeRegionName = (name: string): string => {
        if (!name) return name;
        return name.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      };
      
      // Build variable-aware regional data
      // Use VariableRegionalData structure if variables are selected, otherwise legacy RegionalData
      let regionData: any;
      if (selectedVariables.length > 0) {
        // Variable-aware structure
        const variablesData: Record<string, { p25: number; p50: number; p75: number; p90: number }> = {};
        
        selectedVariables.forEach(variableName => {
          variablesData[variableName] = {
            p25: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getVariableValue(r, variableName, 'p25'))),
            p50: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getVariableValue(r, variableName, 'p50'))),
            p75: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getVariableValue(r, variableName, 'p75'))),
            p90: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getVariableValue(r, variableName, 'p90')))
          };
        });
        
        regionData = {
          region: capitalizeRegionName(regionName),
          variables: variablesData
        };
      } else {
        // Legacy structure for backward compatibility
        regionData = {
          region: capitalizeRegionName(regionName),
          tcc_p25: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getTccP25(r))),
          tcc_p50: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getTccP50(r))),
          tcc_p75: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getTccP75(r))),
          tcc_p90: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getTccP90(r))),
          cf_p25: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getCfP25(r))),
          cf_p50: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getCfP50(r))),
          cf_p75: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getCfP75(r))),
          cf_p90: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getCfP90(r))),
          wrvus_p25: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getWrvuP25(r))),
          wrvus_p50: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getWrvuP50(r))),
          wrvus_p75: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getWrvuP75(r))),
          wrvus_p90: calculateAverage(regionRows.map((r: AggregatedData | DynamicAggregatedData) => getWrvuP90(r))),
        };
      }
      
      // Log based on data structure
      if (selectedVariables.length > 0 && 'variables' in regionData) {
        const firstVar = selectedVariables[0];
        const firstVarData = regionData.variables[firstVar];
        console.log(`📋 ${regionName}: ${regionRows.length} rows, ${firstVar} P50: ${firstVarData?.p50 || 0}`);
      } else if ('tcc_p50' in regionData) {
        console.log(`📋 ${regionName}: ${regionRows.length} rows, TCC P50: $${regionData.tcc_p50.toLocaleString()}, CF P50: $${regionData.cf_p50.toLocaleString()}`);
      }
      
      // Additional debugging for National calculation
      if (regionName.toLowerCase() === 'national') {
        console.log(`🔍 National calculation details:`, {
          totalRows: regionRows.length,
          selectedVariables: selectedVariables.length > 0 ? selectedVariables : ['legacy: tcc, cf, wrvu'],
          sampleRows: regionRows.slice(0, 3).map((r: AggregatedData | DynamicAggregatedData) => ({ 
            standardizedName: r.standardizedName, 
            region: r.geographicRegion
          }))
        });
      }
      
      return regionData;
    });
    
    console.log(`✅ Regional comparison data calculated:`, result);
    return result;
  }, [filtered, regionMappings, selectedVariables]);

  // Handle Excel export - exports formatted regional comparison table (what you see on screen)
  // Defined after regionalComparisonData to avoid dependency issues
  const handleExportToExcel = useCallback(() => {
    if (!selectedSpecialty || regionalComparisonData.length === 0) {
      return;
    }

    // Import XLSX dynamically
    import('xlsx').then((XLSX) => {
      const workbook = XLSX.utils.book_new();

      // Get variable metadata for formatting
      const formattingService = VariableFormattingService.getInstance();
      const variablesToExport = selectedVariables.length > 0 
        ? selectedVariables 
        : (regionalComparisonData[0] && 'variables' in regionalComparisonData[0] 
          ? Object.keys(regionalComparisonData[0].variables) 
          : ['tcc', 'tcc_per_work_rvu', 'work_rvus']);

      // Create variable metadata (same as used in RegionalComparison)
      const variableMetadata: Record<string, { label: string; format: (value: number) => string }> = 
        selectedVariables.length > 0 ? selectedVariables.reduce((acc, varName) => {
          const rule = formattingService.getRuleForVariable(varName);
          acc[varName] = {
            label: formatVariableDisplayName(varName),
            format: (value: number) => {
              if (value === 0) return '0';
              if (rule && rule.showCurrency) {
                return formatCurrency(value, rule.decimals || 0);
              }
              if (rule && rule.decimals !== undefined) {
                return formatNumber(value, rule.decimals);
              }
              // Default formatting based on variable name
              const lower = varName.toLowerCase();
              if (lower.includes('tcc') || lower.includes('compensation') || lower.includes('call')) {
                return formatCurrency(value, 0);
              }
              if (lower.includes('per') || lower.includes('factor') || lower.includes('conversion')) {
                return formatCurrency(value, 2);
              }
              return formatNumber(value);
            }
          };
          return acc;
        }, {} as Record<string, { label: string; format: (value: number) => string }>) : {};

      // Export each variable as a separate sheet
      variablesToExport.forEach((variableName, varIndex) => {
        const variableLabel = variableMetadata[variableName]?.label || formatVariableDisplayName(variableName);
        const formatValue = variableMetadata[variableName]?.format || ((v: number) => {
          if (v === 0) return '—';
          const rule = formattingService.getRuleForVariable(variableName);
          if (rule?.showCurrency) {
            return formatCurrency(v, rule.decimals || 0);
          }
          if (rule?.decimals !== undefined) {
            return formatNumber(v, rule.decimals);
          }
          const lower = variableName.toLowerCase();
          if (lower.includes('tcc') || lower.includes('compensation') || lower.includes('call')) {
            return formatCurrency(v, 0);
          }
          if (lower.includes('per') || lower.includes('factor') || lower.includes('conversion')) {
            return formatCurrency(v, 2);
          }
          return formatNumber(v);
        });

        // Build table data: rows = percentiles, columns = regions
        const percentiles = [
          { key: 'p25', label: '25th Percentile' },
          { key: 'p50', label: '50th Percentile' },
          { key: 'p75', label: '75th Percentile' },
          { key: 'p90', label: '90th Percentile' }
        ];

        // Create header row
        const headerRow = ['Percentile', ...regionalComparisonData.map(r => r.region)];

        // Create data rows
        const dataRows = percentiles.map(p => {
          const row: any[] = [p.label];
          regionalComparisonData.forEach(regionData => {
            let value = 0;
            if ('variables' in regionData && regionData.variables[variableName]) {
              value = regionData.variables[variableName][p.key as 'p25' | 'p50' | 'p75' | 'p90'] || 0;
            } else if ('tcc_p25' in regionData) {
              // Legacy format - map variable names to legacy fields
              const legacyMap: Record<string, Record<string, keyof typeof regionData>> = {
                'tcc': { p25: 'tcc_p25', p50: 'tcc_p50', p75: 'tcc_p75', p90: 'tcc_p90' },
                'tcc_per_work_rvu': { p25: 'cf_p25', p50: 'cf_p50', p75: 'cf_p75', p90: 'cf_p90' },
                'work_rvus': { p25: 'wrvus_p25', p50: 'wrvus_p50', p75: 'wrvus_p75', p90: 'wrvus_p90' }
              };
              const fieldMap = legacyMap[variableName];
              if (fieldMap && fieldMap[p.key]) {
                value = (regionData[fieldMap[p.key]] as number) || 0;
              }
            }
            row.push(value > 0 ? formatValue(value) : '—');
          });
          return row;
        });

        // Combine header and data
        const worksheetData = [headerRow, ...dataRows];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        const columnWidths = [
          { wch: 18 }, // Percentile column
          ...regionalComparisonData.map(() => ({ wch: 15 })) // Region columns
        ];
        worksheet['!cols'] = columnWidths;

        // Style header row (bold)
        const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = 0; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = {
            font: { bold: true },
            alignment: { horizontal: 'center' },
            fill: { fgColor: { rgb: 'F3F4F6' } }
          };
        }

        // Add sheet to workbook (limit sheet name to 31 chars for Excel)
        const sheetName = variableLabel.length > 31 ? variableLabel.substring(0, 28) + '...' : variableLabel;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Add filters summary sheet
      const filtersData = [
        ['Filter', 'Value'],
        ['Specialty', formatSpecialtyForDisplay(selectedSpecialty)],
        ['Provider Type', selectedProviderType || 'All Types'],
        ['Survey Source', selectedSurveySource || 'All Sources'],
        ['Data Category', selectedDataCategory || 'All Categories'],
        ['Year', selectedYear || 'All Years'],
        ['Generated', new Date().toLocaleString()]
      ];
      const filtersSheet = XLSX.utils.aoa_to_sheet(filtersData);
      filtersSheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, filtersSheet, 'Filters');

      // Generate filename
      const filename = `regional-analytics-${selectedSpecialty.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download
      XLSX.writeFile(workbook, filename);
    });
  }, [selectedSpecialty, selectedProviderType, selectedSurveySource, selectedDataCategory, selectedYear, regionalComparisonData, selectedVariables]);

  // Build provenance (mapping summary) for tooltips and drawer
  const { regionTooltips, provenanceDetails } = useMemo(() => {
    const tooltips: Record<string, string> = {};
    const details: Record<string, { total: number; bySource: Record<string, number>; sourceRegions: Record<string, number>; bySourceRegions: Record<string, Record<string, number>> } > = {};

    if (!regionalComparisonData || regionalComparisonData.length === 0) {
      return { regionTooltips: tooltips, provenanceDetails: details };
    }

    // Recreate validRows and orderedRegions logic for consistent grouping
    const validRows = (filtered as (AggregatedData | DynamicAggregatedData)[]).filter((r: AggregatedData | DynamicAggregatedData) => {
      const hasValidTCC = getTccP50(r) > 0 || getTccP25(r) > 0 || getTccP75(r) > 0 || getTccP90(r) > 0;
      const hasValidCF = getCfP50(r) > 0 || getCfP25(r) > 0 || getCfP75(r) > 0 || getCfP90(r) > 0;
      const hasValidWRVU = getWrvuP50(r) > 0 || getWrvuP25(r) > 0 || getWrvuP75(r) > 0 || getWrvuP90(r) > 0;
      return hasValidTCC || hasValidCF || hasValidWRVU;
    });

    const mapToParentRegion = (region: string): string => {
      if (!region || region.toLowerCase() === 'national') return 'national';
      const lower = region.toLowerCase().trim();
      // ENTERPRISE FIX: Handle "eastern" as equivalent to "northeast" (as per region mapping screen)
      if (lower.includes('eastern') || lower.includes('northeast') || lower.includes('northeastern') || lower.includes('ne') || lower.includes('north central') || lower.includes('new england') || lower.includes('atlantic')) {
        return 'northeast';
      } else if (lower.includes('southeast') || lower.includes('southern') || lower.includes('se') || lower.includes('south central') || lower.includes('south') || lower.includes('gulf')) {
        return 'south';
      } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('nc') || lower.includes('great lakes') || lower.includes('central') || lower.includes('plains')) {
        return 'midwest';
      } else if (lower.includes('west') || lower.includes('western') || lower.includes('southwest') || lower.includes('sw') || lower.includes('pacific') || lower.includes('mountain')) {
        return 'west';
      }
      return lower;
    };

    // Build defined mapping lookup: parent -> source -> Set(sourceRegion)
    const definedByParent: Record<string, Record<string, Set<string>>> = {};
    (regionMappings || []).forEach((m: any) => {
      // Normalize parent to our parent-region vocabulary (midwestern -> midwest, etc.)
      const parent = mapToParentRegion(String(m.standardizedName || ''));
      if (!definedByParent[parent]) definedByParent[parent] = {};
      (m.sourceRegions || []).forEach((sr: any) => {
        const src = String(sr.surveySource || 'Unknown');
        const name = String(sr.name || sr.region || '').toLowerCase();
        if (!definedByParent[parent][src]) definedByParent[parent][src] = new Set<string>();
        if (name) definedByParent[parent][src].add(name);
      });
    });

    const regions = regionalComparisonData.map(r => r.region);
    regions.forEach(regionName => {
      const parent = mapToParentRegion(regionName);
      const rows = parent === 'national' ? validRows : validRows.filter((r: AggregatedData | DynamicAggregatedData) => mapToParentRegion(r.geographicRegion) === parent);
      const bySource: Record<string, number> = {};
      const srcRegions: Record<string, number> = {};
      const bySourceRegions: Record<string, Record<string, number>> = {};
      rows.forEach((r: AggregatedData | DynamicAggregatedData) => {
        const src = String(r.surveySource || 'Unknown');
        bySource[src] = (bySource[src] || 0) + 1;
        const rg = String(r.geographicRegion || 'Unknown');
        srcRegions[rg] = (srcRegions[rg] || 0) + 1;
        if (!bySourceRegions[src]) bySourceRegions[src] = {};
        bySourceRegions[src][rg] = (bySourceRegions[src][rg] || 0) + 1;
      });

      // Merge in defined mappings with zero counts where missing
      const definedForParent = definedByParent[parent] || {};
      Object.entries(definedForParent).forEach(([src, set]) => {
        if (!bySource[src]) bySource[src] = 0;
        if (!bySourceRegions[src]) bySourceRegions[src] = {};
        Array.from(set).forEach(regionLabel => {
          const prettyKey = regionLabel; // already lowercased in defined map
          if (bySourceRegions[src][prettyKey] === undefined) {
            bySourceRegions[src][prettyKey] = 0;
          }
        });
      });

      const topSources = Object.entries(bySource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      tooltips[regionName] = rows.length > 0 ? `Sources • ${topSources}` : 'No mapped rows';
      details[regionName] = { total: rows.length, bySource, sourceRegions: srcRegions, bySourceRegions };
    });

    return { regionTooltips: tooltips, provenanceDetails: details };
  }, [regionalComparisonData, filtered, regionMappings]);

  if (loading) {
    return (
      <EnterpriseLoadingSpinner
        message="Loading regional analytics..."
        recordCount="auto"
        data={analyticsData}
        progress={queryProgress}
        variant="overlay"
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedDataCategory === 'Call Pay' 
                  ? 'Call Pay by Region' 
                  : selectedDataCategory === 'Compensation' 
                  ? 'Regional Compensation Analytics'
                  : 'Regional Analytics'}
              </h3>
              <p className="text-gray-600 text-sm">
                {selectedDataCategory === 'Call Pay'
                  ? 'Analyze regional call pay rates across percentiles'
                  : 'Choose filters to analyze regional compensation patterns'}
              </p>
            </div>
            {/* Print, Export, and Clear Filters Buttons - Top Right */}
            <div className="flex items-center gap-2">
              {/* Print Button - Circular Icon */}
              {selectedSpecialty && regionalComparisonData.length > 0 && (
                <Tooltip title="Print Report" placement="top" arrow>
                  <button
                    onClick={handlePrint}
                    className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                    aria-label="Print Report"
                  >
                    <PrinterIcon className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
              {/* Download to Excel Button - Circular Icon */}
              {selectedSpecialty && regionalComparisonData.length > 0 && (
                <Tooltip title="Download to Excel" placement="top" arrow>
                  <button
                    onClick={handleExportToExcel}
                    className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                    aria-label="Download to Excel"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
              {/* Clear Filters Button */}
              {(selectedSpecialty || selectedProviderType || selectedSurveySource || selectedDataCategory || selectedYear) && (
                <Tooltip title="Clear Filters" placement="top" arrow>
                  <button
                    onClick={() => {
                      filtersClearedRef.current = true; // Mark that filters were explicitly cleared
                      setSelectedSpecialty('');
                      setSelectedProviderType('');
                      setSelectedSurveySource('');
                      setSelectedDataCategory('');
                      setSelectedYear('');
                      setSelectedVariables([]); // Clear variable selection
                    }}
                    className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
                    aria-label="Clear all filters"
                  >
                    <div className="relative w-4 h-4">
                      {/* Funnel Icon */}
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                      </svg>
                      {/* X Overlay - Only show when filters are active */}
                      {(selectedSpecialty || selectedProviderType || selectedSurveySource || selectedYear) && (
                        <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <FormControl sx={{ width: '100%' }}>
                <Autocomplete
                  value={selectedYear}
                  onChange={(event: any, newValue: string | null) => setSelectedYear(newValue || '')}
                  options={['', ...availableYears]}
                  getOptionLabel={(option: string) => option || 'All Years'}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="All Years"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          height: '40px',
                          border: '1px solid #d1d5db !important',
                          '&:hover': { 
                            borderColor: '#9ca3af !important',
                            borderWidth: '1px !important'
                          },
                          '&.Mui-focused': { 
                            boxShadow: 'none', 
                            borderColor: '#3b82f6 !important',
                            borderWidth: '1px !important'
                          },
                          '& fieldset': {
                            border: 'none !important'
                          }
                        }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                      '&.Mui-selected': { 
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                      }
                    }
                  }}
                  clearOnBlur={false}
                  blurOnSelect={true}
                />
              </FormControl>
            </div>

            {/* Specialty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialty <span className="text-red-500">*</span>
              </label>
            <FormControl sx={{ width: '100%' }}>
              {specialtyOptions && specialtyOptions.length > 0 ? (
                <SpecialtyDropdown
                  value={selectedSpecialty}
                  onChange={(value) => setSelectedSpecialty(value)}
                  specialtyOptions={specialtyOptions}
                  label="Specialty"
                  placeholder="Search for a specialty..."
                  useAdvancedSearch={true}
                  size="small"
                />
              ) : (
                <Autocomplete
                  value={selectedSpecialty}
                  onChange={(event: any, newValue: string | null) => setSelectedSpecialty(newValue || '')}
                  options={specialties}
                  getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="Search for a specialty..."
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          height: '40px',
                          border: '1px solid #d1d5db !important',
                          '&:hover': { 
                            borderColor: '#9ca3af !important',
                            borderWidth: '1px !important'
                          },
                          '&.Mui-focused': { 
                            boxShadow: 'none', 
                            borderColor: '#3b82f6 !important',
                            borderWidth: '1px !important'
                          },
                          '& fieldset': {
                            border: 'none !important'
                          }
                        }
                      }}
                    />
                  )}
                  filterOptions={(options: string[], { inputValue }: { inputValue: string }) => filterSpecialtyOptions(options, inputValue, 100)}
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '300px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                    '&.Mui-selected': { 
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                    }
                  }
                }}
                noOptionsText="No specialties found"
                clearOnBlur={false}
                blurOnSelect={true}
              />
              )}
            </FormControl>
          </div>

            {/* Data Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Category
              </label>
              <FormControl sx={{ width: '100%' }}>
                <Autocomplete
                  value={selectedDataCategory}
                  onChange={(event: any, newValue: string | null) => setSelectedDataCategory(newValue || '')}
                  options={['', ...dataCategories]}
                  getOptionLabel={(option: string) => option || 'All Categories'}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="All Categories"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          height: '40px',
                          border: '1px solid #d1d5db !important',
                          '&:hover': { 
                            borderColor: '#9ca3af !important',
                            borderWidth: '1px !important'
                          },
                          '&.Mui-focused': { 
                            boxShadow: 'none', 
                            borderColor: '#3b82f6 !important',
                            borderWidth: '1px !important'
                          },
                          '& fieldset': {
                            border: 'none !important'
                          }
                        }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                      '&.Mui-selected': { 
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                      }
                    }
                  }}
                clearOnBlur={false}
                blurOnSelect={true}
              />
            </FormControl>
          </div>

            {/* Provider Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Type
              </label>
              <FormControl sx={{ width: '100%' }}>
                <Autocomplete
                  value={selectedProviderType}
                  onChange={(event: any, newValue: string | null) => setSelectedProviderType(newValue || '')}
                  options={['', ...providerTypes]}
                  getOptionLabel={(option: string) => option || 'All Provider Types'}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="All Provider Types"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          height: '40px',
                          border: '1px solid #d1d5db !important',
                          '&:hover': { 
                            borderColor: '#9ca3af !important',
                            borderWidth: '1px !important'
                          },
                          '&.Mui-focused': { 
                            boxShadow: 'none', 
                            borderColor: '#3b82f6 !important',
                            borderWidth: '1px !important'
                          },
                          '& fieldset': {
                            border: 'none !important'
                          }
                        }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                      '&.Mui-selected': { 
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                      }
                    }
                  }}
                  clearOnBlur={false}
                  blurOnSelect={true}
                />
              </FormControl>
            </div>

            {/* Survey Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Source
              </label>
              <FormControl sx={{ width: '100%' }}>
                <Autocomplete
                  value={selectedSurveySource}
                  onChange={(event: any, newValue: string | null) => setSelectedSurveySource(newValue || '')}
                  options={['', ...surveySources]}
                  getOptionLabel={(option: string) => option || 'All Survey Sources'}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="All Survey Sources"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          height: '40px',
                          border: '1px solid #d1d5db !important',
                          '&:hover': { 
                            borderColor: '#9ca3af !important',
                            borderWidth: '1px !important'
                          },
                          '&.Mui-focused': { 
                            boxShadow: 'none', 
                            borderColor: '#3b82f6 !important',
                            borderWidth: '1px !important'
                          },
                          '& fieldset': {
                            border: 'none !important'
                          }
                        }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                      '&.Mui-selected': { 
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                      }
                    }
                  }}
                  clearOnBlur={false}
                  blurOnSelect={true}
                />
              </FormControl>
            </div>
          </div>

        </div>

        {/* Empty State - When no specialty is selected */}
        {!selectedSpecialty && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mapped Regions Found</h3>
              <p className="text-gray-600 mb-4">
                Create region mappings to organize and standardize your survey data.
              </p>
            </div>
          </div>
        )}

        {/* Regional Comparison Data */}
        {selectedSpecialty && regionalComparisonData.length > 0 && (
          <div className="mt-6">
            <RegionalComparison 
              data={regionalComparisonData}
              selectedVariables={selectedVariables}
              variableMetadata={selectedVariables.length > 0 ? selectedVariables.reduce((acc, varName) => {
                const formattingService = VariableFormattingService.getInstance();
                const rule = formattingService.getRuleForVariable(varName);
                acc[varName] = {
                  label: formatVariableDisplayName(varName),
                  format: (value: number) => {
                    if (value === 0) return '0';
                    if (rule && rule.showCurrency) {
                      return formatCurrency(value, rule.decimals || 0);
                    }
                    if (rule && rule.decimals !== undefined) {
                      return formatNumber(value, rule.decimals);
                    }
                    // Default formatting based on variable name
                    const lower = varName.toLowerCase();
                    if (lower.includes('tcc') || lower.includes('compensation') || lower.includes('salary') || lower.includes('call')) {
                      return formatCurrency(value, 0);
                    }
                    if (lower.includes('per') || lower.includes('factor') || lower.includes('conversion')) {
                      return formatCurrency(value, 2);
                    }
                    return formatNumber(value);
                  }
                };
                return acc;
              }, {} as Record<string, { label: string; format: (value: number) => string }>) : {}}
              regionTooltips={regionTooltips}
              onRegionInfoClick={(region) => { setProvenanceRegion(region); setProvenanceOpen(true); }}
            />
          </div>
        )}

        {/* Empty State */}
        {selectedSpecialty && regionalComparisonData.length === 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Regional Data Found</h3>
            <p className="text-gray-600">No compensation data available for {formatSpecialtyForDisplay(selectedSpecialty)} across the selected regions.</p>
          </div>
        )}
        {/* Provenance Drawer */}
        <Drawer anchor="right" open={provenanceOpen} onClose={() => setProvenanceOpen(false)}>
          <div style={{ width: 420 }} className="p-6">
            {(() => {
              const pretty = (s: string) => s
                ? s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                : '';
              const label = pretty(provenanceRegion);
              const isNational = (label || '').toLowerCase() === 'national';
              return (
                <>
                  <Typography 
                    variant="h6" 
                    className="mb-1" 
                    sx={{ fontWeight: 700, color: isNational ? '#7C3AED' : undefined }}
                  >
                    {label}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 mb-4">Region mapping details</Typography>
                </>
              );
            })()}
            <Divider className="my-4" />
            <div className="mt-4">
              {provenanceRegion && provenanceDetails[provenanceRegion] ? (
                <>
                  <Typography variant="body2" className="text-gray-600 mb-4 text-sm">
                    Source region names from each survey that map to this region:
                  </Typography>

                  {/* Survey Sources with their mapped region names */}
                  <div className="space-y-4">
                    {Object.entries(provenanceDetails[provenanceRegion].bySourceRegions || {})
                      .sort((a, b) => {
                        // Sort by total rows for this survey
                        const aTotal = provenanceDetails[provenanceRegion].bySource[a[0]] || 0;
                        const bTotal = provenanceDetails[provenanceRegion].bySource[b[0]] || 0;
                        return bTotal - aTotal;
                      })
                      .map(([surveySource, sourceRegionsMap]) => {
                        const totalRows = provenanceDetails[provenanceRegion].bySource[surveySource] || 0;
                        // Get all source region names (keys) that map to this parent region
                        // Only show regions that have actual data (count > 0)
                        const sourceRegionNames = Object.keys(sourceRegionsMap)
                          .filter(name => {
                            // Only show regions with actual data rows
                            return (sourceRegionsMap[name] || 0) > 0;
                          })
                          .sort((a, b) => {
                            // Sort by count descending, then alphabetically
                            const countA = sourceRegionsMap[a] || 0;
                            const countB = sourceRegionsMap[b] || 0;
                            if (countB !== countA) return countB - countA;
                            return a.localeCompare(b);
                          });

                        // Only show surveys that have at least one mapped region name
                        if (sourceRegionNames.length === 0) return null;

                        return (
                          <div key={surveySource} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                            {/* Survey Source Header */}
                            <Typography variant="body2" className="font-semibold text-gray-900 mb-2">
                              {surveySource}
                            </Typography>

                            {/* Source Region Names */}
                            <div className="ml-4 space-y-1">
                              {sourceRegionNames.map((regionName) => {
                                const count = sourceRegionsMap[regionName] || 0;
                                const prettyName = regionName.toLowerCase()
                                  .split(' ')
                                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                  .join(' ');
                                const hasData = count > 0;

                                return (
                                  <div 
                                    key={`${surveySource}-${regionName}`} 
                                    className="flex items-center justify-between py-1"
                                  >
                                    <Typography 
                                      variant="body2" 
                                      className="text-sm text-gray-900"
                                    >
                                      {prettyName}
                                    </Typography>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {count.toLocaleString()} {count === 1 ? 'row' : 'rows'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                      .filter(Boolean)}
                  </div>

                  {/* Empty state if no mappings */}
                  {Object.keys(provenanceDetails[provenanceRegion].bySourceRegions || {}).length === 0 && (
                    <div className="text-center py-6">
                      <Typography variant="body2" className="text-gray-500">
                        No region mappings found for this region.
                      </Typography>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <Typography variant="body2" className="text-gray-500">
                    No mapping details available.
                  </Typography>
                </div>
              )}
            </div>
          </div>
        </Drawer>

        {/* Hidden printable component for react-to-print */}
        {selectedSpecialty && regionalComparisonData.length > 0 && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
            <RegionalPrintable
              ref={printRef}
              data={regionalComparisonData}
              selectedVariables={selectedVariables}
              variableMetadata={selectedVariables.length > 0 ? selectedVariables.reduce((acc, varName) => {
                const formattingService = VariableFormattingService.getInstance();
                const rule = formattingService.getRuleForVariable(varName);
                acc[varName] = {
                  label: formatVariableDisplayName(varName),
                  format: (value: number) => {
                    if (value === 0) return '0';
                    if (rule && rule.showCurrency) {
                      return formatCurrency(value, rule.decimals || 0);
                    }
                    if (rule && rule.decimals !== undefined) {
                      return formatNumber(value, rule.decimals);
                    }
                    // Default formatting based on variable name
                    const lower = varName.toLowerCase();
                    if (lower.includes('tcc') || lower.includes('compensation') || lower.includes('salary') || lower.includes('call')) {
                      return formatCurrency(value, 0);
                    }
                    if (lower.includes('per') || lower.includes('factor') || lower.includes('conversion')) {
                      return formatCurrency(value, 2);
                    }
                    return formatNumber(value);
                  }
                };
                return acc;
              }, {} as Record<string, { label: string; format: (value: number) => string }>) : {}}
              filters={{
                specialty: selectedSpecialty,
                providerType: selectedProviderType,
                surveySource: selectedSurveySource,
                year: selectedYear,
                dataCategory: selectedDataCategory
              }}
              regionNames={regionalComparisonData.map(region => region.region)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionalAnalytics; 
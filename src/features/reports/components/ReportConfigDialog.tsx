/**
 * Report Configuration Dialog
 * 
 * Dialog for configuring report filters, blending options, and percentiles
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  Autocomplete,
  TextField,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Box,
  Typography
} from '@mui/material';
import { 
  XMarkIcon, 
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { ReportConfig, ReportMetric, BlendingMethod, Percentile } from '../types/reports';
import { AnalyticsDataService } from '../../analytics/services/analyticsDataService';
import { queryKeys, queryClient } from '../../../shared/services/queryClient';
import { DynamicAggregatedData } from '../../analytics/types/variables';
import { formatProviderTypeForDisplay, formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { getDataService } from '../../../services/DataService';
import { StorageMode } from '../../../config/storage';
import { isFirebaseAvailable } from '../../../config/firebase';
import { EnterpriseLoadingSpinner, ButtonSpinner } from '../../../shared/components';

interface ReportConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (config: ReportConfig) => void;
  metric: ReportMetric;
  reportName: string;
}

const PERCENTILES: Percentile[] = ['p25', 'p50', 'p75', 'p90'];

function ReportConfigDialogComponent({
  open,
  onClose,
  onGenerate,
  metric,
  reportName
}: ReportConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<DynamicAggregatedData[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSurveys, setAllSurveys] = useState<any[]>([]); // Store surveys for fallback path
  const [dataAvailability, setDataAvailability] = useState<{
    surveys: number;
    providerTypes: number;
    regions: number;
    years: number;
  } | null>(null);
  
  // Cache filter options in component state to avoid re-fetching
  const filterOptionsCache = useRef<{
    metadata: {
      providerTypes: Array<{ type: string; displayName: string }>;
      specialties: string[];
      surveySources: string[];
      years: string[];
      regions: string[];
    };
    timestamp: number;
  } | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Store metadata separately for instant access
  const [filterMetadata, setFilterMetadata] = useState<{
    providerTypes: Array<{ type: string; displayName: string }>;
    specialties: string[];
    surveySources: string[];
    years: string[];
    regions: string[];
  } | null>(null);

  // Load saved preferences from Firebase or localStorage
  const loadSavedPreferences = async (): Promise<Partial<ReportConfig>> => {
    try {
      // Try Firebase first if available
      if (isFirebaseAvailable()) {
        try {
          const dataService = getDataService(StorageMode.FIREBASE);
          const preference = await dataService.getUserPreference(`reportConfig_${metric}`);
          if (preference) {
            return preference;
          }
        } catch (error) {
          console.warn('Failed to load preferences from Firebase, falling back to localStorage:', error);
        }
      }

      // Fallback to DataService (handles both Firebase and IndexedDB)
      const dataService = getDataService();
      const saved = await dataService.getUserPreference(`reportConfig_${metric}`);
      if (saved) {
        return saved;
      }
    } catch (error) {
      console.warn('Failed to load saved preferences:', error);
    }
    return {};
  };

  // Save preferences to Firebase or localStorage
  const savePreferences = async (config: ReportConfig) => {
    try {
      const preferenceData = {
        selectedProviderType: config.selectedProviderType,
        selectedSpecialty: config.selectedSpecialty,
        selectedSurveySource: config.selectedSurveySource,
        selectedRegion: config.selectedRegion,
        selectedYear: config.selectedYear,
        enableBlending: config.enableBlending,
        blendYears: config.blendYears,
        blendingMethod: config.blendingMethod,
        selectedPercentiles: config.selectedPercentiles
      };

      // Save to DataService (handles both Firebase and IndexedDB automatically)
      const dataService = getDataService();
      await dataService.saveUserPreference(`reportConfig_${metric}`, preferenceData);
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  };

  const [config, setConfig] = useState<ReportConfig>({
    metric,
    selectedProviderType: [],
    selectedSpecialty: [],
    selectedSurveySource: [],
    selectedRegion: [],
    selectedYear: [],
    enableBlending: false,
    blendYears: false,
    blendingMethod: 'weighted',
    selectedPercentiles: ['p25', 'p50', 'p75', 'p90']
  });

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const saved = await loadSavedPreferences();
      // Convert saved preferences to arrays (handle backward compatibility)
      const normalizeArray = (value: any): string[] => {
        if (Array.isArray(value)) return value;
        if (value === null || value === undefined) return [];
        return [value];
      };
      setConfig({
        metric,
        selectedProviderType: normalizeArray(saved.selectedProviderType),
        selectedSpecialty: normalizeArray(saved.selectedSpecialty),
        selectedSurveySource: normalizeArray(saved.selectedSurveySource),
        selectedRegion: normalizeArray(saved.selectedRegion),
        selectedYear: normalizeArray(saved.selectedYear),
        enableBlending: saved.enableBlending ?? false,
        blendYears: saved.blendYears ?? false,
        blendingMethod: saved.blendingMethod ?? 'weighted',
        selectedPercentiles: saved.selectedPercentiles ?? ['p25', 'p50', 'p75', 'p90']
      });
    };
    loadPreferences();
  }, [metric]);

  // Helper function to normalize region names
  // ENTERPRISE FIX: Preserve subregions (like "Great Lakes") and handle variations correctly
  const normalizeRegion = useMemo(() => {
    const cache = new Map<string, string>();
    return (region: string): string => {
      if (!region) return '';
      if (cache.has(region)) return cache.get(region)!;
      
      const lower = region.toLowerCase().trim();
      let normalized: string;
      
      // ENTERPRISE FIX: Preserve legitimate subregions - don't collapse them into parent regions
      // Subregions like "Great Lakes", "Plains", "Central" should be preserved as-is
      const subregions = [
        'great lakes', 'plains', 'central', 'mountain', 'pacific', 'atlantic',
        'new england', 'mid-atlantic', 'south atlantic', 'east north central',
        'west north central', 'east south central', 'west south central'
      ];
      
      const isSubregion = subregions.some(sub => lower.includes(sub));
      if (isSubregion) {
        // Preserve subregion with proper capitalization
        normalized = region.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        cache.set(region, normalized);
        console.log(`🔍 Report Config: Preserved subregion "${region}" -> "${normalized}"`);
        return normalized;
      }
      
      // Handle "Eastern" - typically maps to "Northeast" in US regional classifications
      if (lower === 'eastern' || (lower.includes('eastern') && !lower.includes('great lakes'))) {
        normalized = 'Northeast';
      } else if (lower.includes('northeast') || lower.includes('northeastern') || lower === 'ne') {
        normalized = 'Northeast';
      } else if (lower.includes('southeast') || lower.includes('southern') || (lower.includes('south') && !lower.includes('west'))) {
        normalized = 'South';
      } else if (lower.includes('midwest') || lower.includes('midwestern') || lower === 'nc') {
        // ENTERPRISE FIX: Only normalize to "Midwest" if it's explicitly "midwest" or "north central"
        // Don't collapse "Great Lakes" or other subregions
        normalized = 'Midwest';
      } else if (lower.includes('west') || lower.includes('western')) {
        normalized = 'West';
      } else if (lower.includes('national') || lower === 'all') {
        normalized = 'National';
      } else {
        // Preserve original region name with proper capitalization if it doesn't match known patterns
        normalized = region.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
      
      cache.set(region, normalized);
      console.log(`🔍 Report Config: Normalized region "${region}" -> "${normalized}"`);
      return normalized;
    };
  }, []);

  // Helper function to format survey source with provider type (e.g., "Gallagher Physician", "MGMA APP")
  // ENTERPRISE FIX: Match the format used in analyticsDataService (source + categoryDisplay)
  // This ensures survey sources in dropdown match what's stored in data rows
  const formatSurveySourceWithProviderType = useCallback((survey: any): string => {
    const source = survey.source || survey.type || '';
    const dataCategory = survey.dataCategory;
    const providerType = survey.providerType;
    
    if (!source) return '';
    
    // Match the format from analyticsDataService.normalizeRow()
    // For COMPENSATION data category, use provider type (APP or Physician)
    // For other categories, use category name
    if (dataCategory) {
      const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay'
        : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
        : dataCategory === 'COMPENSATION' ? (providerType === 'APP' ? 'APP' : 'Physician')
        : dataCategory === 'CUSTOM' ? (survey.customDataCategory || 'Custom')
        : dataCategory;
      
      return `${source} ${categoryDisplay}`;
    }
    
    // Fallback: If no dataCategory, use provider type directly
    if (providerType) {
      let providerTypeDisplay = '';
      if (providerType === 'PHYSICIAN') {
        providerTypeDisplay = 'Physician';
      } else if (providerType === 'APP') {
        providerTypeDisplay = 'APP';
      } else if (providerType === 'CALL') {
        providerTypeDisplay = 'Call Pay';
      } else if (providerType.trim()) {
        providerTypeDisplay = formatProviderTypeForDisplay(providerType);
      }
      
      if (providerTypeDisplay) {
        return `${source} ${providerTypeDisplay}`;
      }
    }
    
    return source;
  }, []);

  // Helper function to extract provider types from survey data rows (consistent across all paths)
  // ENTERPRISE FIX: Extract from actual "Provider Type" column in data rows, not survey metadata
  const extractProviderTypesFromSurveys = useCallback(async (surveys: any[], dataService: any): Promise<Array<{ type: string; displayName: string }>> => {
    const providerTypeSet = new Set<string>();
    
    // Sample data from each survey to extract provider types
    // Use Promise.all to load data from multiple surveys in parallel
    const samplePromises = surveys.map(async (survey) => {
      try {
        // Sample up to 100 rows per survey to get provider types
        const sampleData = await dataService.getSurveyData(survey.id, {}, { limit: 100 });
        if (sampleData && sampleData.rows) {
          sampleData.rows.forEach((row: any) => {
            // Check multiple possible field name variations for "Provider Type"
            const providerType = 
              row.providerType || 
              row['Provider Type'] || 
              row.provider_type || 
              row['Provider_Type'] || 
              row['provider_type'] ||
              row.Type ||
              (row.data && (row.data.providerType || row.data['Provider Type'] || row.data.provider_type));
            
            if (providerType && typeof providerType === 'string' && providerType.trim()) {
              providerTypeSet.add(providerType.trim());
            }
          });
        }
      } catch (err) {
        console.warn(`⚠️ Failed to load provider types from survey ${survey.id}:`, err);
        // Continue with other surveys even if one fails
      }
    });
    
    await Promise.all(samplePromises);
    
    // Format and deduplicate provider types
    const providerTypeMap = new Map<string, string>();
    providerTypeSet.forEach(providerType => {
      const normalized = providerType.trim().toUpperCase();
      if (!providerTypeMap.has(normalized)) {
        providerTypeMap.set(normalized, formatProviderTypeForDisplay(providerType.trim()));
      }
    });
    
    return Array.from(providerTypeMap.entries()).map(([type, displayName]) => ({
      type,
      displayName
    })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, []);

  // Cascading filter options - optimized to use metadata when available
  const cascadingFilterOptions = useMemo(() => {
    // Early return if metadata is available (instant access)
    if (filterMetadata) {
      let availableSources = [...filterMetadata.surveySources];
      let availableRegions = [...filterMetadata.regions];
      let availableYears = [...filterMetadata.years];
      let availableProviderTypes = [...filterMetadata.providerTypes];

      // Apply cascading filters using metadata
      if (config.selectedProviderType.length > 0) {
        // Filter sources based on selected provider types (simplified - would need full data for accurate cascading)
        // For now, return all sources since we don't have full relationship data in metadata
      }

      // ENTERPRISE FIX: Only cascade regions/years if we have full data with actual region/year values
      // Otherwise, show all available regions/years from metadata to avoid empty dropdowns
      if (config.selectedSurveySource.length > 0) {
        // Check if we have full data with actual region/year values (not just placeholder data)
        const hasFullData = allData.length > 0 && 
          allData.some(row => row.geographicRegion || row.surveyYear);
        
        console.log(`🔍 Report Config: Cascading filters - Survey source selected: ${config.selectedSurveySource.join(', ')}, hasFullData: ${hasFullData}, allData.length: ${allData.length}`);
        
        if (hasFullData) {
          // If we have full data, use it for accurate cascading
          let filteredData = allData.filter(row => 
            config.selectedSurveySource.includes(row.surveySource || '')
          );
          
          console.log(`🔍 Report Config: Filtered data for cascading: ${filteredData.length} rows`);
          
          // Re-extract regions and years from filtered data
          // ENTERPRISE FIX: Exclude dataCategory values from regions
          const extractedRegions = Array.from(new Set(
            filteredData
              .map(d => {
                const regionStr = String(d.geographicRegion || '').trim();
                if (!regionStr) return null;
                const lowerRegion = regionStr.toLowerCase();
                // ENTERPRISE FIX: Exclude dataCategory/practice setting values AND organization types
                const isDataCategory = 
                  lowerRegion.includes('inpatient') ||
                  lowerRegion.includes('outpatient') ||
                  lowerRegion.includes('both inpatient') ||
                  lowerRegion.includes('both outpatient') ||
                  lowerRegion === 'call_pay' ||
                  lowerRegion === 'moonlighting' ||
                  lowerRegion === 'compensation' ||
                  lowerRegion.includes('practice setting') ||
                  lowerRegion.includes('practice_setting') ||
                  // Exclude organization types (not geographic regions)
                  lowerRegion.includes('hospital') ||
                  lowerRegion.includes('health system') ||
                  lowerRegion.includes('medical group') ||
                  lowerRegion === 'suburban' ||
                  lowerRegion === 'rural' ||
                  lowerRegion === 'urban' ||
                  lowerRegion.includes('organization type') ||
                  lowerRegion.includes('facility type');
                return isDataCategory ? null : normalizeRegion(regionStr);
              })
              .filter((region): region is string => Boolean(region))
          )).sort();
          
          const extractedYears = Array.from(new Set(
            filteredData.map(d => d.surveyYear).filter((year): year is string => Boolean(year))
          )).sort().reverse();
          
          console.log(`🔍 Report Config: Extracted ${extractedRegions.length} regions and ${extractedYears.length} years from filtered data`);
          
          // Only update if we found regions/years, otherwise keep metadata values
          if (extractedRegions.length > 0) {
            availableRegions = extractedRegions;
            console.log(`🔍 Report Config: Updated available regions:`, availableRegions);
          }
          if (extractedYears.length > 0) {
            availableYears = extractedYears;
            console.log(`🔍 Report Config: Updated available years:`, availableYears);
          }
        } else {
          console.log(`🔍 Report Config: No full data available, using metadata regions/years`);
        }
        // If we don't have full data, keep showing all regions/years from metadata
        // This ensures dropdowns are never empty
      }

      // ENTERPRISE FIX: Only cascade years if we have full data with actual year values
      // Otherwise, show all available years from metadata to avoid empty dropdowns
      if (config.selectedRegion.length > 0) {
        // Check if we have full data with actual year values (not just placeholder data)
        const hasFullData = allData.length > 0 && 
          allData.some(row => row.surveyYear);
        
        console.log(`🔍 Report Config: Cascading filters - Region selected: ${config.selectedRegion.join(', ')}, hasFullData: ${hasFullData}`);
        
        if (hasFullData) {
          // Filter years based on selected regions
          let filteredData = allData.filter(row => {
            const region = normalizeRegion(row.geographicRegion || '');
            return config.selectedRegion.some(selectedRegion => {
              const normalized = selectedRegion.toLowerCase();
              return region.toLowerCase().includes(normalized) || normalized.includes(region.toLowerCase());
            });
          });
          
          console.log(`🔍 Report Config: Filtered data for region cascading: ${filteredData.length} rows`);
          
          const extractedYears = Array.from(new Set(
            filteredData.map(d => d.surveyYear).filter((year): year is string => Boolean(year))
          )).sort().reverse();
          
          console.log(`🔍 Report Config: Extracted ${extractedYears.length} years from region-filtered data`);
          
          // Only update if we found years, otherwise keep metadata values
          if (extractedYears.length > 0) {
            availableYears = extractedYears;
            console.log(`🔍 Report Config: Updated available years:`, availableYears);
          }
        } else {
          console.log(`🔍 Report Config: No full data available, using metadata years`);
        }
        // If we don't have full data, keep showing all years from metadata
        // This ensures dropdowns are never empty
      }

      return {
        providerTypes: availableProviderTypes,
        specialties: filterMetadata.specialties ?? [],
        surveySources: availableSources,
        regions: availableRegions,
        years: availableYears
      };
    }

    // Fallback to processing allData if metadata not available (legacy path)
    if (allData.length === 0) {
      return {
        providerTypes: [],
        specialties: [],
        surveySources: [],
        regions: [],
        years: []
      };
    }

    let filteredData = allData;

    // Apply provider type filter (multi-select)
    if (config.selectedProviderType.length > 0) {
      filteredData = filteredData.filter(row => {
        const rowProviderType = row.providerType?.trim().toUpperCase() || '';
        return config.selectedProviderType.some(pt => rowProviderType === pt.toUpperCase());
      });
    }

    // Extract available survey sources from filtered data
    const availableSources = Array.from(new Set(
      filteredData.map(d => d.surveySource).filter(Boolean)
    )).sort();

    // Apply survey source filter (multi-select)
    if (config.selectedSurveySource.length > 0) {
      filteredData = filteredData.filter(row => 
        config.selectedSurveySource.includes(row.surveySource || '')
      );
    }

    // Extract available regions from filtered data
    // ENTERPRISE FIX: Exclude dataCategory values from regions
    const availableRegions = Array.from(new Set(
      filteredData
        .map(d => {
          const regionStr = String(d.geographicRegion || '').trim();
          if (!regionStr) return null;
          const lowerRegion = regionStr.toLowerCase();
          // ENTERPRISE FIX: Exclude dataCategory/practice setting values AND organization types
          const isDataCategory = 
            lowerRegion.includes('inpatient') ||
            lowerRegion.includes('outpatient') ||
            lowerRegion.includes('both inpatient') ||
            lowerRegion.includes('both outpatient') ||
            lowerRegion === 'call_pay' ||
            lowerRegion === 'moonlighting' ||
            lowerRegion === 'compensation' ||
            lowerRegion.includes('practice setting') ||
            lowerRegion.includes('practice_setting') ||
            // Exclude organization types (not geographic regions)
            lowerRegion.includes('hospital') ||
            lowerRegion.includes('health system') ||
            lowerRegion.includes('medical group') ||
            lowerRegion === 'suburban' ||
            lowerRegion === 'rural' ||
            lowerRegion === 'urban' ||
            lowerRegion.includes('organization type') ||
            lowerRegion.includes('facility type');
          return isDataCategory ? null : normalizeRegion(regionStr);
        })
        .filter((region): region is string => Boolean(region))
    )).sort();

    // Apply region filter (multi-select)
    if (config.selectedRegion.length > 0) {
      filteredData = filteredData.filter(row => {
        const region = normalizeRegion(row.geographicRegion || '');
        return config.selectedRegion.some(selectedRegion => {
          const normalized = selectedRegion.toLowerCase();
          return region.toLowerCase().includes(normalized) || normalized.includes(region.toLowerCase());
        });
      });
    }

    // Extract available years from filtered data
    const availableYears = Array.from(new Set(
      filteredData.map(d => d.surveyYear).filter((year): year is string => Boolean(year))
    )).sort().reverse();

    // Extract all provider types (for initial load)
    // ENTERPRISE FIX: Provider types are loaded asynchronously from data rows and stored in filterMetadata
    // This fallback path is only reached when filterMetadata is null, so return empty array
    // Provider types will be available once filterMetadata is loaded
    const allProviderTypes: Array<{ type: string; displayName: string }> = [];
    const availableSpecialties = Array.from(new Set(
      filteredData
        .map(d => (d as DynamicAggregatedData).standardizedName || (d as DynamicAggregatedData).surveySpecialty)
        .filter((s): s is string => Boolean(s))
    )).sort();

      return {
        providerTypes: allProviderTypes,
        specialties: availableSpecialties,
        surveySources: availableSources,
        regions: availableRegions,
        years: availableYears
      };
  }, [filterMetadata, allData, allSurveys, config.selectedProviderType, config.selectedSurveySource, config.selectedRegion, config.selectedYear, normalizeRegion, extractProviderTypesFromSurveys, formatSurveySourceWithProviderType]);

  // Load filter options when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setLoadingOptions(true);
      loadFilterOptions();
    }
  }, [open]);

  // Reset dependent filters when parent filters change (filter out invalid selections)
  useEffect(() => {
    const availableSpecialties = cascadingFilterOptions.specialties ?? [];
    if (availableSpecialties.length > 0 && config.selectedSpecialty.length > 0) {
      const validSpecialties = config.selectedSpecialty.filter(s => availableSpecialties.includes(s));
      if (validSpecialties.length !== config.selectedSpecialty.length) {
        setConfig(prev => ({ ...prev, selectedSpecialty: validSpecialties }));
      }
    }
  }, [cascadingFilterOptions.specialties]);

  useEffect(() => {
    // When provider type changes, filter out invalid survey sources
    if (config.selectedProviderType.length > 0) {
      const availableSources = cascadingFilterOptions.surveySources;
      const validSources = config.selectedSurveySource.filter(s => availableSources.includes(s));
      if (validSources.length !== config.selectedSurveySource.length) {
        setConfig(prev => ({ ...prev, selectedSurveySource: validSources }));
      }
    }
  }, [config.selectedProviderType, cascadingFilterOptions.surveySources]);

  useEffect(() => {
    // When survey source changes, filter out invalid regions
    if (config.selectedSurveySource.length > 0) {
      const availableRegions = cascadingFilterOptions.regions;
      const validRegions = config.selectedRegion.filter(r => availableRegions.includes(r));
      if (validRegions.length !== config.selectedRegion.length) {
        setConfig(prev => ({ ...prev, selectedRegion: validRegions }));
      }
    }
  }, [config.selectedSurveySource, cascadingFilterOptions.regions]);

  useEffect(() => {
    // When region changes, filter out invalid years
    if (config.selectedRegion.length > 0) {
      const availableYears = cascadingFilterOptions.years;
      const validYears = config.selectedYear.filter(y => availableYears.includes(y));
      if (validYears.length !== config.selectedYear.length) {
        setConfig(prev => ({ ...prev, selectedYear: validYears }));
      }
    }
  }, [config.selectedRegion, cascadingFilterOptions.years]);

  // Update config and save preferences when config changes
  useEffect(() => {
    if (open) {
      savePreferences(config);
    }
  }, [config, open]);

  const loadFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      setError(null);

      // Check component-level cache first
      const now = Date.now();
      if (filterOptionsCache.current && (now - filterOptionsCache.current.timestamp) < CACHE_TTL) {
        console.log('🎯 Report Config: Using component cache for filter options');
        const cached = filterOptionsCache.current.metadata;
        setFilterMetadata({
          ...cached,
          specialties: cached.specialties ?? []
        });
        setLoadingOptions(false);
        
        // Set minimal allData for cascading filters
        const minimalData: DynamicAggregatedData[] = filterOptionsCache.current.metadata.surveySources.map(source => ({
          standardizedName: '',
          surveySource: source,
          surveySpecialty: '',
          originalSpecialty: '',
          providerType: '',
          geographicRegion: '',
          surveyYear: '',
          variables: {}
        }));
        setAllData(minimalData);
        processFilterDataFromMetadata(filterOptionsCache.current.metadata);
        return;
      }

      // Try to get cached benchmarking data (non-hook, safe)
      const benchmarkingQueryKey = queryKeys.benchmarking({
        year: '',
        specialty: '',
        providerType: '',
        region: '',
        surveySource: '',
      });

      let allData: DynamicAggregatedData[] = [];
      const dataService = getDataService();
      
      try {
        // Safely check cache (non-hook method)
        const cached = queryClient?.getQueryData<{
          data: DynamicAggregatedData[];
          mappings?: any[];
          columnMappings?: any[];
          regionMappings?: any[];
        }>(benchmarkingQueryKey);
        
        if (cached?.data && cached.data.length > 0) {
          console.log('✅ Report Config: Using cached benchmarking data');
          allData = cached.data;
          
          // ENTERPRISE FIX: Extract provider types from survey data rows (Provider Type column), not survey metadata
          const surveys = await dataService.getAllSurveys();
          setAllSurveys(surveys); // Store surveys for fallback path
          const providerTypes = await extractProviderTypesFromSurveys(surveys, dataService);
          
          // Extract other metadata from cached data
          // ENTERPRISE FIX: Survey sources from cached data may already include provider type
          // But we should also extract from surveys to ensure consistency
          const surveySourcesSet = new Set<string>();
          const yearsSet = new Set<string>();
          const regionsSet = new Set<string>();
          
          // First, add survey sources from surveys (with provider type)
          surveys.forEach(survey => {
            const formattedSource = formatSurveySourceWithProviderType(survey);
            if (formattedSource) surveySourcesSet.add(formattedSource);
          });
          
          // Also add from cached data rows (may have different format, but include for completeness)
          const specialtiesSet = new Set<string>();
          allData.forEach(row => {
            if (row.surveySource) surveySourcesSet.add(row.surveySource);
            if (row.surveyYear) yearsSet.add(row.surveyYear);
            const specialty = (row.standardizedName || row.surveySpecialty || '').trim();
            if (specialty) specialtiesSet.add(specialty);
            // ENTERPRISE FIX: Only add geographic regions, exclude dataCategory values
            if (row.geographicRegion) {
              const regionStr = String(row.geographicRegion).trim();
              const lowerRegion = regionStr.toLowerCase();
              // Exclude dataCategory/practice setting values
              const isDataCategory = 
                lowerRegion.includes('inpatient') ||
                lowerRegion.includes('outpatient') ||
                lowerRegion.includes('both inpatient') ||
                lowerRegion.includes('both outpatient') ||
                lowerRegion === 'call_pay' ||
                lowerRegion === 'moonlighting' ||
                lowerRegion === 'compensation' ||
                lowerRegion.includes('practice setting') ||
                lowerRegion.includes('practice_setting');
              
              if (!isDataCategory) {
                regionsSet.add(normalizeRegion(regionStr));
              }
            }
          });
          
          const metadata = {
            providerTypes,
            specialties: Array.from(specialtiesSet).sort(),
            surveySources: Array.from(surveySourcesSet).sort(),
            years: Array.from(yearsSet).sort().reverse(),
            regions: Array.from(regionsSet).sort()
          };
          
          setFilterMetadata(metadata);
          setAllData(allData);
          setLoadingOptions(false);
          processFilterDataFromMetadata(metadata);
          
          // Cache the metadata
          filterOptionsCache.current = {
            metadata,
            timestamp: Date.now()
          };
          return;
        }
      } catch (cacheError) {
        console.warn('⚠️ Report Config: Cache check failed, fetching fresh data', cacheError);
      }

      // OPTIMIZED: Extract metadata directly from survey metadata (instant)
      console.log('🔄 Report Config: Fetching filter options (optimized)...');
      const surveys = await dataService.getAllSurveys();
      
      // Store surveys in state for fallback path
      setAllSurveys(surveys);
      
      if (surveys.length === 0) {
        setError('No surveys found. Please upload survey data first.');
        setLoadingOptions(false);
        return;
      }
      
      // ENTERPRISE FIX: Extract provider types from survey data rows (Provider Type column), not survey metadata
      const providerTypes = await extractProviderTypesFromSurveys(surveys, dataService);
      
      // Extract other unique values directly from survey metadata (instant - no row fetching)
      // ENTERPRISE FIX: Combine survey source with provider type to differentiate Physician vs APP surveys
      const surveySourcesSet = new Set<string>();
      const yearsSet = new Set<string>();
      
      surveys.forEach(survey => {
        // Format survey source with provider type (e.g., "Gallagher Physician", "MGMA APP")
        const formattedSource = formatSurveySourceWithProviderType(survey);
        if (formattedSource) surveySourcesSet.add(formattedSource);
        if (survey.year) yearsSet.add(String(survey.year));
      });
      
      // Create metadata immediately (provider types, sources, years available instantly)
      const metadata = {
        providerTypes,
        specialties: [] as string[], // Will be populated when regions load (from analytics data)
        surveySources: Array.from(surveySourcesSet).sort(),
        years: Array.from(yearsSet).sort().reverse(),
        regions: [] as string[] // Will be populated asynchronously
      };
      
      // Show modal immediately with metadata (provider types, sources, years)
      setFilterMetadata(metadata);
      setLoadingOptions(false);
      processFilterDataFromMetadata(metadata);
      
      // Cache the metadata
      filterOptionsCache.current = {
        metadata,
        timestamp: Date.now()
      };
      
      // Load regions asynchronously in background (reduced sampling: 10-20 rows per survey)
      setLoadingRegions(true);
      loadRegionsAsync(surveys, metadata);

    } catch (error) {
      console.error('❌ Error loading filter options:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Unable to load filter options: ${errorMessage}. Please try again or refresh the page.`);
      setLoadingOptions(false);
      setLoadingRegions(false);
    }
  };

  // Load regions asynchronously without blocking UI
  // ENTERPRISE FIX: Use cached analytics data instead of sampling raw survey rows
  const loadRegionsAsync = async (surveys: any[], existingMetadata: {
    providerTypes: Array<{ type: string; displayName: string }>;
    surveySources: string[];
    years: string[];
    regions: string[];
  }) => {
    try {
      const regionsSet = new Set<string>();
      
      // Try to get cached analytics data first (complete region information)
      const benchmarkingQueryKey = queryKeys.benchmarking({
        year: '',
        specialty: '',
        providerType: '',
        region: '',
        surveySource: '',
      });
      
      const cached = queryClient?.getQueryData<{
        data: DynamicAggregatedData[];
      }>(benchmarkingQueryKey);
      
      if (cached?.data && cached.data.length > 0) {
        console.log('🔍 Report Config: Loading regions from cached analytics data:', cached.data.length, 'rows');
        
        // ENTERPRISE FIX: Track raw regions before normalization to see what we're working with
        const rawRegionsSet = new Set<string>();
        
        // Extract all unique regions from analytics data (complete dataset)
        cached.data.forEach(row => {
          if (row.geographicRegion) {
            const regionStr = String(row.geographicRegion).trim();
            if (regionStr) {
              // Track raw region before normalization
              rawRegionsSet.add(regionStr);
              
              const lowerRegion = regionStr.toLowerCase();
              // ENTERPRISE FIX: Exclude dataCategory/practice setting values AND organization types
              const isDataCategory = 
                lowerRegion.includes('inpatient') ||
                lowerRegion.includes('outpatient') ||
                lowerRegion.includes('both inpatient') ||
                lowerRegion.includes('both outpatient') ||
                lowerRegion === 'call_pay' ||
                lowerRegion === 'moonlighting' ||
                lowerRegion === 'compensation' ||
                lowerRegion.includes('practice setting') ||
                lowerRegion.includes('practice_setting') ||
                // Exclude organization types (not geographic regions)
                lowerRegion.includes('hospital') ||
                lowerRegion.includes('health system') ||
                lowerRegion.includes('medical group') ||
                lowerRegion === 'suburban' ||
                lowerRegion === 'rural' ||
                lowerRegion === 'urban' ||
                lowerRegion.includes('organization type') ||
                lowerRegion.includes('facility type');
              
              if (!isDataCategory) {
                const normalized = normalizeRegion(regionStr);
                if (normalized && normalized.length > 0) {
                  regionsSet.add(normalized);
                }
              }
            }
          }
        });
        
        console.log('🔍 Report Config: Raw regions found in analytics data (before normalization):', Array.from(rawRegionsSet).sort());
        console.log('🔍 Report Config: Extracted', regionsSet.size, 'unique normalized regions from analytics data');
        console.log('🔍 Report Config: Normalized regions found:', Array.from(regionsSet).sort());
        
        // Update allData with complete analytics data for accurate cascading
        setAllData(cached.data);
      } else {
        // Fallback: If no cached data, fetch from analytics service
        console.log('🔍 Report Config: No cached analytics data, fetching from analytics service...');
        const analyticsService = new AnalyticsDataService();
        const allData = await analyticsService.getAnalyticsDataByVariables(
          {
            specialty: '',
            surveySource: '',
            geographicRegion: '',
            providerType: '',
            year: ''
          },
          [] // Get all variables
        );
        
        console.log('🔍 Report Config: Fetched', allData.length, 'rows from analytics service');
        
        // ENTERPRISE FIX: Track raw regions before normalization
        const rawRegionsSet = new Set<string>();
        
        // Extract regions from fetched data
        allData.forEach(row => {
          if (row.geographicRegion) {
            const regionStr = String(row.geographicRegion).trim();
            if (regionStr) {
              // Track raw region before normalization
              rawRegionsSet.add(regionStr);
              
              const lowerRegion = regionStr.toLowerCase();
              // ENTERPRISE FIX: Exclude dataCategory/practice setting values AND organization types
              const isDataCategory = 
                lowerRegion.includes('inpatient') ||
                lowerRegion.includes('outpatient') ||
                lowerRegion.includes('both inpatient') ||
                lowerRegion.includes('both outpatient') ||
                lowerRegion === 'call_pay' ||
                lowerRegion === 'moonlighting' ||
                lowerRegion === 'compensation' ||
                lowerRegion.includes('practice setting') ||
                lowerRegion.includes('practice_setting') ||
                // Exclude organization types (not geographic regions)
                lowerRegion.includes('hospital') ||
                lowerRegion.includes('health system') ||
                lowerRegion.includes('medical group') ||
                lowerRegion === 'suburban' ||
                lowerRegion === 'rural' ||
                lowerRegion === 'urban' ||
                lowerRegion.includes('organization type') ||
                lowerRegion.includes('facility type');
              
              if (!isDataCategory) {
                const normalized = normalizeRegion(regionStr);
                if (normalized && normalized.length > 0) {
                  regionsSet.add(normalized);
                }
              }
            }
          }
        });
        
        console.log('🔍 Report Config: Raw regions found in analytics service data (before normalization):', Array.from(rawRegionsSet).sort());
        console.log('🔍 Report Config: Extracted', regionsSet.size, 'unique normalized regions from analytics service');
        console.log('🔍 Report Config: Normalized regions found:', Array.from(regionsSet).sort());
        
        // Update allData with fetched data
        setAllData(allData);
      }
      
      // Update metadata with regions and specialties (from analytics data)
      const specialtiesSet = new Set<string>();
      allData.forEach(row => {
        const specialty = (row.standardizedName || row.surveySpecialty || '').trim();
        if (specialty) specialtiesSet.add(specialty);
      });
      const updatedMetadata = {
        ...existingMetadata,
        regions: Array.from(regionsSet).sort(),
        specialties: Array.from(specialtiesSet).sort()
      };
      
      setFilterMetadata(updatedMetadata);
      
      // Update cache
      if (filterOptionsCache.current) {
        filterOptionsCache.current.metadata = updatedMetadata;
      }
      
    } catch (error) {
      console.error('❌ Failed to load regions asynchronously:', error);
      // Don't fail completely - just log the error
    } finally {
      setLoadingRegions(false);
    }
  };

  const processFilterDataFromMetadata = (metadata: {
    providerTypes: Array<{ type: string; displayName: string }>;
    surveySources: string[];
    years: string[];
    regions: string[];
  }) => {
    // Set data availability info from metadata
    try {
      setDataAvailability({
        surveys: metadata.surveySources.length,
        providerTypes: metadata.providerTypes.length,
        regions: metadata.regions.length,
        years: metadata.years.length
      });
    } catch (err) {
      console.warn('Failed to set data availability:', err);
    }
  };

  const processFilterData = async (allData: DynamicAggregatedData[]) => {
    // Set data availability info
    try {
      const uniqueSources = Array.from(new Set(allData.map(d => d.surveySource).filter(Boolean)));
      const uniqueProviderTypes = Array.from(new Set(allData.map(d => d.providerType).filter(Boolean)));
      const uniqueRegions = Array.from(new Set(allData.map(d => d.geographicRegion).filter(Boolean)));
      const uniqueYears = Array.from(new Set(allData.map(d => d.surveyYear).filter((year): year is string => Boolean(year))));

      setDataAvailability({
        surveys: uniqueSources.length,
        providerTypes: uniqueProviderTypes.length,
        regions: uniqueRegions.length,
        years: uniqueYears.length
      });
    } catch (err) {
      console.warn('Failed to set data availability:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleGenerate = (customConfig?: ReportConfig) => {
    const configToUse = customConfig || config;
    
    // Validate config
    if (configToUse.selectedPercentiles.length === 0) {
      setError('Please select at least one statistic (25th, 50th, 75th, or 90th percentile)');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Safety timeout
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Report generation taking longer than expected');
      setLoading(false);
      setError('Report generation is taking longer than expected. Please try again or adjust your filters.');
    }, 30000);

    Promise.resolve(onGenerate(configToUse))
      .then(() => {
        clearTimeout(timeoutId);
        setTimeout(() => {
          setLoading(false);
        }, 100);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('Error in handleGenerate:', error);
        setLoading(false);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Failed to generate report: ${errorMessage}. Please try adjusting your filters or check that you have uploaded survey data.`);
      });
  };

  const handlePercentileChange = (percentile: Percentile, checked: boolean) => {
    if (checked) {
      setConfig({
        ...config,
        selectedPercentiles: [...config.selectedPercentiles, percentile]
      });
    } else {
      setConfig({
        ...config,
        selectedPercentiles: config.selectedPercentiles.filter(p => p !== percentile)
      });
    }
  };

  // Render option with checkmark on the right side (matching app pattern)
  const renderOptionWithCheckmark = (props: any, option: string, selected: boolean) => {
    return (
      <Box
        {...props}
        component="li"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          py: 0.5,
          backgroundColor: 'white !important',
          margin: 0,
          '&:hover': {
            backgroundColor: '#f3f4f6 !important'
          }
        }}
      >
        <Typography variant="body2" sx={{ flex: 1 }}>
          {option}
        </Typography>
        {selected && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              ml: 1,
              color: '#6366f1'
            }}
          >
            <CheckCircleIcon className="w-4 h-4" />
          </Box>
        )}
      </Box>
    );
  };

  return (
      <Dialog
      open={open}
      onClose={(event: React.SyntheticEvent, reason?: 'backdropClick' | 'escapeKeyDown') => {
        // Allow closing even when loading (user might want to cancel)
        if (reason === 'backdropClick' && loading) {
          // Prevent closing on backdrop click while loading
          return;
        }
        setLoading(false); // Reset loading state when closing
        onClose();
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb'
        }
      }}
    >
      <DialogTitle className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{reportName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Generate your report with smart defaults or customize your options
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="Close dialog"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </DialogTitle>

      <DialogContent className="p-6">
        {/* Error Message */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ mb: 3, borderRadius: '8px' }}
          >
            {error}
          </Alert>
        )}

        {loadingOptions ? (
          <EnterpriseLoadingSpinner 
            message="Loading options..." 
            variant="inline"
            showProgress={false}
          />
        ) : (
          <div className="space-y-5">
                {/* Combine Similar Specialties Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">Combine Similar Specialties</h3>
                        <Tooltip title="When enabled, specialties that are mapped together will be combined into a single row. For example, 'Cardiology' and 'Cardiovascular Disease' will be merged.">
                          <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                        </Tooltip>
                      </div>
                    </div>
                    <Switch
                      checked={config.enableBlending}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, enableBlending: e.target.checked })}
                      size="medium"
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#6366f1',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#6366f1',
                        },
                      }}
                    />
                  </div>

                  {/* Blending Method Toggle */}
                  {config.enableBlending && (
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Combination Method
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, blendingMethod: 'weighted' })}
                          className={`
                            flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                            ${config.blendingMethod === 'weighted'
                              ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                              : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100'
                            }
                          `}
                        >
                          Weighted Average
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, blendingMethod: 'simple' })}
                          className={`
                            flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                            ${config.blendingMethod === 'simple'
                              ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                              : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100'
                            }
                          `}
                        >
                          Simple Average
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {config.blendingMethod === 'weighted' 
                          ? 'Weighted by number of incumbents (recommended)' 
                          : 'Equal weights for all surveys'}
                      </p>
                    </div>
                  )}
                </div>

            {/* Filter Dropdowns */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
              <div className="grid grid-cols-2 gap-4">
              {/* Provider Type Dropdown */}
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  value={config.selectedProviderType.map(type => {
                    const pt = cascadingFilterOptions.providerTypes.find((p: { type: string; displayName: string }) => p.type === type);
                    return pt?.displayName || type;
                  })}
                  onChange={(event: any, newValue: string[]) => {
                    const selectedTypes = newValue.map(displayName => {
                      const pt = cascadingFilterOptions.providerTypes.find((p: { type: string; displayName: string }) => p.displayName === displayName);
                      return pt?.type || displayName;
                    });
                    setConfig({ 
                      ...config, 
                      selectedProviderType: selectedTypes
                    });
                  }}
                  options={cascadingFilterOptions.providerTypes.map((pt: { type: string; displayName: string }) => pt.displayName)}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Provider Type"
                      placeholder={config.selectedProviderType.length === 0 ? 'All Provider Types' : 'Select provider types...'}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          minHeight: '40px',
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
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: '#3b82f6'
                          },
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                            backgroundColor: 'white',
                            padding: '0 6px',
                            zIndex: 1,
                          }
                        }
                      }}
                    />
                  )}
                  renderOption={(props: any, option: string) => {
                    const pt = cascadingFilterOptions.providerTypes.find((p: { type: string; displayName: string }) => p.displayName === option);
                    const isSelected = pt ? config.selectedProviderType.includes(pt.type) : false;
                    return renderOptionWithCheckmark(props, option, isSelected);
                  }}
                  renderTags={(value: string[], getTagProps: any) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {value.map((option: string, index: number) => (
                        <Chip 
                          {...getTagProps({ index })}
                          key={option} 
                          label={option} 
                          size="small"
                          sx={{ height: '24px', fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  )}
                  disableCloseOnSelect
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                      maxHeight: '300px'
                    }
                  }}
                />
              </FormControl>

              {/* Specialty Dropdown */}
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  value={config.selectedSpecialty}
                  onChange={(event: any, newValue: string[]) => {
                    setConfig({ ...config, selectedSpecialty: newValue });
                  }}
                  options={cascadingFilterOptions.specialties}
                  getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Specialty"
                      placeholder={config.selectedSpecialty.length === 0 ? 'All Specialties' : 'Select specialties...'}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          minHeight: '40px',
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
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: '#3b82f6'
                          },
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                            backgroundColor: 'white',
                            padding: '0 6px',
                            zIndex: 1,
                          }
                        }
                      }}
                    />
                  )}
                  renderOption={(props: any, option: string) => {
                    const isSelected = config.selectedSpecialty.includes(option);
                    return renderOptionWithCheckmark(props, formatSpecialtyForDisplay(option), isSelected);
                  }}
                  renderTags={(value: string[], getTagProps: any) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {value.map((option: string, index: number) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={formatSpecialtyForDisplay(option)}
                          size="small"
                          sx={{ height: '24px', fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  )}
                  disableCloseOnSelect
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                      maxHeight: '300px'
                    }
                  }}
                />
              </FormControl>

              {/* Survey Source Dropdown */}
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  value={config.selectedSurveySource}
                  onChange={(event: any, newValue: string[]) => {
                    setConfig({ 
                      ...config, 
                      selectedSurveySource: newValue
                    });
                  }}
                  options={cascadingFilterOptions.surveySources}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Survey Source"
                      placeholder={config.selectedSurveySource.length === 0 ? 'All Survey Sources' : 'Select survey sources...'}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          minHeight: '40px',
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
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: '#3b82f6'
                          },
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                            backgroundColor: 'white',
                            padding: '0 6px',
                            zIndex: 1,
                          }
                        }
                      }}
                    />
                  )}
                  renderOption={(props: any, option: string) => {
                    const isSelected = config.selectedSurveySource.includes(option);
                    return renderOptionWithCheckmark(props, option, isSelected);
                  }}
                  renderTags={(value: string[], getTagProps: any) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {value.map((option: string, index: number) => (
                        <Chip 
                          {...getTagProps({ index })}
                          key={option} 
                          label={option} 
                          size="small"
                          sx={{ height: '24px', fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  )}
                  disableCloseOnSelect
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                      maxHeight: '300px'
                    }
                  }}
                />
              </FormControl>

              {/* Region Dropdown */}
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  value={config.selectedRegion}
                  onChange={(event: any, newValue: string[]) => {
                    setConfig({ 
                      ...config, 
                      selectedRegion: newValue
                    });
                  }}
                  options={cascadingFilterOptions.regions}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Region"
                      placeholder={config.selectedRegion.length === 0 ? 'All Regions' : 'Select regions...'}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          minHeight: '40px',
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
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: '#3b82f6'
                          },
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                            backgroundColor: 'white',
                            padding: '0 6px',
                            zIndex: 1,
                          }
                        }
                      }}
                    />
                  )}
                  renderOption={(props: any, option: string) => {
                    const isSelected = config.selectedRegion.includes(option);
                    return renderOptionWithCheckmark(props, option, isSelected);
                  }}
                  renderTags={(value: string[], getTagProps: any) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {value.map((option: string, index: number) => (
                        <Chip 
                          {...getTagProps({ index })}
                          key={option} 
                          label={option} 
                          size="small"
                          sx={{ height: '24px', fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  )}
                  disableCloseOnSelect
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                      maxHeight: '300px'
                    }
                  }}
                />
              </FormControl>

              {/* Year Dropdown */}
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  value={config.selectedYear}
                  onChange={(event: any, newValue: string[]) => {
                    setConfig({ ...config, selectedYear: newValue });
                  }}
                  options={cascadingFilterOptions.years}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Year"
                      placeholder={config.selectedYear.length === 0 ? 'All Years' : 'Select years...'}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          minHeight: '40px',
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
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: '#3b82f6'
                          },
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                            backgroundColor: 'white',
                            padding: '0 6px',
                            zIndex: 1,
                          }
                        }
                      }}
                    />
                  )}
                  renderOption={(props: any, option: string) => {
                    const isSelected = config.selectedYear.includes(option);
                    return renderOptionWithCheckmark(props, option, isSelected);
                  }}
                  renderTags={(value: string[], getTagProps: any) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {value.map((option: string, index: number) => (
                        <Chip 
                          {...getTagProps({ index })}
                          key={option} 
                          label={option} 
                          size="small"
                          sx={{ height: '24px', fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  )}
                  disableCloseOnSelect
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                      maxHeight: '300px'
                    }
                  }}
                />
              </FormControl>

              {/* Blend selected years - only when 2+ years selected */}
              {config.selectedYear.length >= 2 && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.blendYears ?? false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfig({ ...config, blendYears: e.target.checked })
                      }
                      size="small"
                    />
                  }
                  label={
                    <span className="text-sm">
                      Blend selected years into one benchmark per specialty/source (uses same blend method below)
                    </span>
                  }
                />
              )}
              </div>
            </div>

                {/* Statistics Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Statistics to Include</h3>
                    <Tooltip title="Select which percentiles (statistics) to include in your report. P50 is the median (middle value), P25/P75 show the range, and P90 shows the top 10%.">
                      <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <FormGroup>
                    <div className="grid grid-cols-2 gap-2">
                      {PERCENTILES.map((percentile) => {
                        const labels: Record<Percentile, string> = {
                          p25: '25th Percentile',
                          p50: '50th Percentile (Median)',
                          p75: '75th Percentile',
                          p90: '90th Percentile'
                        };
                        return (
                          <FormControlLabel
                            key={percentile}
                            control={
                              <Checkbox
                                checked={config.selectedPercentiles.includes(percentile)}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                  handlePercentileChange(percentile, e.target.checked)
                                }
                                size="small"
                                sx={{
                                  padding: '4px',
                                  '&.Mui-checked': {
                                    color: '#6366f1'
                                  }
                                }}
                              />
                            }
                            label={<span className="text-sm text-gray-700">{labels[percentile]}</span>}
                            sx={{ margin: 0 }}
                          />
                        );
                      })}
                    </div>
                  </FormGroup>
                </div>
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', gap: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{ borderRadius: '8px', textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => handleGenerate()}
          variant="contained"
          disabled={loading || loadingOptions}
          sx={{
            borderRadius: '8px',
            backgroundColor: '#6366f1',
            '&:hover': {
              backgroundColor: '#4f46e5',
            },
            textTransform: 'none',
            fontWeight: 600,
            minWidth: 140
          }}
        >
          {loading ? (
            <>
              <ButtonSpinner />
              <span className="ml-2">Generating...</span>
            </>
          ) : (
            'Generate Report'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Export as const to avoid HMR initialization issues
export const ReportConfigDialog = React.memo(ReportConfigDialogComponent);

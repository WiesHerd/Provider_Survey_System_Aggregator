/**
 * Hook for managing report configuration state
 */

import { useState, useCallback } from 'react';
import { ReportConfigInput } from '../types/reportBuilder';
import { useYear } from '../../../../contexts/YearContext';

const defaultConfig: ReportConfigInput = {
  name: '',
  dimension: 'specialty',
  secondaryDimension: null,
  metric: 'tcc_p50',
  metrics: ['tcc_p50'],
  chartType: 'bar',
  filters: {
    specialties: [],
    regions: [],
    surveySources: [],
    providerTypes: [],
    years: []
  }
};

export const useReportConfig = (initialConfig?: Partial<ReportConfigInput>) => {
  const { currentYear } = useYear();
  
  const [config, setConfig] = useState<ReportConfigInput>(() => ({
    ...defaultConfig,
    filters: {
      ...defaultConfig.filters,
      years: [currentYear],
      ...initialConfig?.filters
    },
    ...initialConfig
  }));

  const updateConfig = useCallback((field: keyof ReportConfigInput, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateFilter = useCallback((filterType: keyof ReportConfigInput['filters'], value: string[]) => {
    setConfig(prev => {
      const newFilters = { ...prev.filters, [filterType]: value };
      
      // Clear dependent filters when parent filter changes
      if (filterType === 'specialties') {
        newFilters.regions = [];
        newFilters.surveySources = [];
      } else if (filterType === 'regions') {
        newFilters.surveySources = [];
      }
      
      return {
        ...prev,
        filters: newFilters
      };
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({
      ...defaultConfig,
      filters: {
        ...defaultConfig.filters,
        years: [currentYear]
      }
    });
  }, [currentYear]);

  const loadConfig = useCallback((newConfig: ReportConfigInput) => {
    setConfig({
      ...newConfig,
      name: '' // Clear name when loading
    });
  }, []);

  return {
    config,
    updateConfig,
    updateFilter,
    resetConfig,
    loadConfig
  };
};


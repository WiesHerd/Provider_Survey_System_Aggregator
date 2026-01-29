/**
 * Hook for managing report data loading and processing
 * 
 * Note: This is a simplified version that will be fully refactored
 * The data processing logic is complex and will be extracted incrementally
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ISurveyRow } from '../../../../types/survey';
import { getDataService } from '../../../../services/DataService';
import { queryKeys } from '../../../../shared/services/queryClient';
import { createQueryFn } from '../../../../shared/services/queryFetcher';
import { ReportConfigInput, ChartDataItem, AvailableOptions } from '../types/reportBuilder';
import { 
  getSpecialtyField, 
  getRegionField, 
  getProviderTypeField, 
  getSurveySourceField, 
  getYearField 
} from '../utils/reportFormatters';
import { formatSpecialtyForDisplay } from '../../../../shared/utils/formatters';

export const useReportData = (config: ReportConfigInput, specialtyMappings: Map<string, Set<string>>) => {
  const [loading, setLoading] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [surveyData, setSurveyData] = useState<ISurveyRow[]>([]);
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions>({
    dimensions: ['specialty', 'region', 'providerType', 'surveySource'],
    metrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90', 'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90', 'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'],
    specialties: [],
    regions: [],
    surveySources: [],
    providerTypes: [],
    years: []
  });

  const dataService = useMemo(() => getDataService(), []);

  interface ReportDataQueryResult {
    surveyData: ISurveyRow[];
    availableOptions: AvailableOptions;
  }

  const reportDataQuery = useQuery<ReportDataQueryResult>({
    queryKey: queryKeys.reports('all-data'),
    queryFn: createQueryFn(async () => {
      const surveys = await dataService.getAllSurveys();
      const allData: ISurveyRow[] = [];

      for (const survey of surveys) {
        try {
          const surveyDataResponse = await dataService.getSurveyData(survey.id);
          if (surveyDataResponse.rows && surveyDataResponse.rows.length > 0) {
            const surveySource = (survey as any).type || 'Unknown';
            const surveyYear = (survey as any).year || (survey as any).surveyYear || 'Unknown';
            
            const transformedRows = surveyDataResponse.rows.map((row: any) => {
              const transformedRow: any = {
                ...row,
                surveySource,
                surveyYear,
                specialty: row.specialty || row.normalizedSpecialty || '',
                geographicRegion: row.geographic_region || row.region || row.geographicRegion || '',
                providerType: row.providerType || row.provider_type || '',
                tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
                cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0,
                wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
              };

              if (row.variable) {
                const variable = String(row.variable).toLowerCase();
                const p25 = parseFloat(String(row.p25 || 0).replace(/[$,]/g, '')) || 0;
                const p50 = parseFloat(String(row.p50 || 0).replace(/[$,]/g, '')) || 0;
                const p75 = parseFloat(String(row.p75 || 0).replace(/[$,]/g, '')) || 0;
                const p90 = parseFloat(String(row.p90 || 0).replace(/[$,]/g, '')) || 0;
                
                if (p50 < 1000) return transformedRow;
                
                if (variable.includes('conversion') || variable.includes('per') || variable.includes('/')) {
                  transformedRow.cf_p25 = p25;
                  transformedRow.cf_p50 = p50;
                  transformedRow.cf_p75 = p75;
                  transformedRow.cf_p90 = p90;
                } else if (variable.includes('wrvu') || variable.includes('rvu') || variable.includes('work')) {
                  transformedRow.wrvu_p25 = p25;
                  transformedRow.wrvu_p50 = p50;
                  transformedRow.wrvu_p75 = p75;
                  transformedRow.wrvu_p90 = p90;
                } else if ((variable.includes('tcc') || variable.includes('total') || variable.includes('cash') || variable.includes('salary')) &&
                           !variable.includes('per') && !variable.includes('/') && p50 > 1000) {
                  transformedRow.tcc_p25 = p25;
                  transformedRow.tcc_p50 = p50;
                  transformedRow.tcc_p75 = p75;
                  transformedRow.tcc_p90 = p90;
                }
              } else {
                const tcc_p50 = Number(row.tcc_p50) || 0;
                if (tcc_p50 > 1000) {
                  transformedRow.tcc_p25 = row.tcc_p25 || 0;
                  transformedRow.tcc_p50 = row.tcc_p50 || 0;
                  transformedRow.tcc_p75 = row.tcc_p75 || 0;
                  transformedRow.tcc_p90 = row.tcc_p90 || 0;
                }
                transformedRow.cf_p25 = row.cf_p25 || 0;
                transformedRow.cf_p50 = row.cf_p50 || 0;
                transformedRow.cf_p75 = row.cf_p75 || 0;
                transformedRow.cf_p90 = row.cf_p90 || 0;
                transformedRow.wrvu_p25 = row.wrvu_p25 || 0;
                transformedRow.wrvu_p50 = row.wrvu_p50 || 0;
                transformedRow.wrvu_p75 = row.wrvu_p75 || 0;
                transformedRow.wrvu_p90 = row.wrvu_p90 || 0;
              }

              return transformedRow;
            });
            
            const validRows = transformedRows.filter((row: any) => 
              (row.tcc_p50 && row.tcc_p50 > 1000) || 
              (row.cf_p50 && row.cf_p50 > 0) || 
              (row.wrvu_p50 && row.wrvu_p50 > 0)
            );
            allData.push(...validRows);
          }
        } catch (error) {
          console.error('Error loading survey data:', error);
        }
      }

      const specialties = [...new Set(allData.map((row: any) => getSpecialtyField(row)).filter(Boolean))].sort();
      const regions = [...new Set(allData.map((row: any) => getRegionField(row)).filter(Boolean))].sort();
      const surveySources = [...new Set(surveys.map((s: any) => s.type || '').filter((v: any) => Boolean(v)))].sort() as string[];
      const providerTypes = [...new Set(allData.map((row: any) => getProviderTypeField(row)).filter(Boolean))].sort();
      const years = [...new Set(allData.map((row: any) => getYearField(row)).filter(Boolean))].sort();

      return {
        surveyData: allData,
        availableOptions: {
          dimensions: ['specialty', 'region', 'providerType', 'surveySource'],
          metrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90', 'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90', 'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'],
          specialties,
          regions,
          surveySources,
          providerTypes,
          years
        }
      };
    }),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (previous) => previous
  });

  // Load data
  useEffect(() => {
    setLoading(reportDataQuery.isLoading || reportDataQuery.isFetching);

    if (reportDataQuery.data?.surveyData) {
      setSurveyData(reportDataQuery.data.surveyData);
    }
    if (reportDataQuery.data?.availableOptions) {
      setAvailableOptions(reportDataQuery.data.availableOptions);
    }
  }, [reportDataQuery.data, reportDataQuery.isFetching, reportDataQuery.isLoading]);

  // Calculate filter impacts (how many records each filter affects)
  const filterImpacts = useMemo(() => {
    if (!surveyData.length) {
      return {
        specialties: 0,
        regions: 0,
        surveySources: 0,
        providerTypes: 0,
        years: 0
      };
    }

    // Calculate impact of each filter independently
    const specialtyImpact = config.filters.specialties.length > 0
      ? surveyData.filter(row => {
          const validSpecialtyNames = new Set<string>();
          config.filters.specialties.forEach(filterSpecialty => {
            const filterSpecialtyLower = filterSpecialty.toLowerCase();
            validSpecialtyNames.add(filterSpecialtyLower);
            if (specialtyMappings.has(filterSpecialtyLower)) {
              specialtyMappings.get(filterSpecialtyLower)?.forEach(name => validSpecialtyNames.add(name));
            }
          });
          return validSpecialtyNames.has(getSpecialtyField(row).toLowerCase());
        }).length
      : surveyData.length;

    const regionImpact = config.filters.regions.length > 0
      ? surveyData.filter(row => config.filters.regions.includes(getRegionField(row))).length
      : surveyData.length;

    const surveySourceImpact = config.filters.surveySources.length > 0
      ? surveyData.filter(row => config.filters.surveySources.includes(getSurveySourceField(row))).length
      : surveyData.length;

    const providerTypeImpact = config.filters.providerTypes.length > 0
      ? surveyData.filter(row => config.filters.providerTypes.includes(getProviderTypeField(row))).length
      : surveyData.length;

    const yearImpact = config.filters.years.length > 0
      ? surveyData.filter(row => {
          const year = getYearField(row);
          return !year || year === '' || year === 'Unknown' || config.filters.years.includes(year);
        }).length
      : surveyData.length;

    return {
      specialties: specialtyImpact,
      regions: regionImpact,
      surveySources: surveySourceImpact,
      providerTypes: providerTypeImpact,
      years: yearImpact
    };
  }, [surveyData, config.filters, specialtyMappings]);

  // Process chart data - simplified version
  // Full implementation will be extracted to a separate utility function
  const { chartData, filteredRecords: filteredCount } = useMemo(() => {
    if (!surveyData.length || (!config.metrics.length && !config.metric)) {
      return { chartData: [], filteredRecords: 0 };
    }

    const primaryMetric = config.metrics.length > 0 ? config.metrics[0] : config.metric;
    let filteredData = surveyData;

    // Apply filters
    if (config.filters.specialties.length > 0) {
      const validSpecialtyNames = new Set<string>();
      config.filters.specialties.forEach(filterSpecialty => {
        const filterSpecialtyLower = filterSpecialty.toLowerCase();
        validSpecialtyNames.add(filterSpecialtyLower);
        if (specialtyMappings.has(filterSpecialtyLower)) {
          specialtyMappings.get(filterSpecialtyLower)?.forEach(name => validSpecialtyNames.add(name));
        }
      });
      filteredData = filteredData.filter(row => 
        validSpecialtyNames.has(getSpecialtyField(row).toLowerCase())
      );
    }

    if (config.filters.regions.length > 0) {
      filteredData = filteredData.filter(row => 
        config.filters.regions.includes(getRegionField(row))
      );
    }

    if (config.filters.surveySources.length > 0) {
      filteredData = filteredData.filter(row => 
        config.filters.surveySources.includes(getSurveySourceField(row))
      );
    }

    if (config.filters.providerTypes.length > 0) {
      filteredData = filteredData.filter(row => 
        config.filters.providerTypes.includes(getProviderTypeField(row))
      );
    }

    if (config.filters.years.length > 0) {
      filteredData = filteredData.filter(row => {
        const year = getYearField(row);
        return !year || year === '' || year === 'Unknown' || config.filters.years.includes(year);
      });
    }

    // Group and aggregate
    const grouped = filteredData.reduce((acc, row) => {
      let dimensionValue = 'Unknown';
      
      if (config.dimension === 'region') {
        dimensionValue = getRegionField(row) || 'Unknown';
      } else if (config.dimension === 'surveySource') {
        dimensionValue = getSurveySourceField(row) || 'Unknown';
      } else if (config.dimension === 'specialty') {
        const specialty = getSpecialtyField(row) || 'Unknown';
        dimensionValue = `${specialty}-${getSurveySourceField(row)}-${getRegionField(row)}-${getProviderTypeField(row)}-${getYearField(row)}`;
      } else {
        dimensionValue = String(row[config.dimension as keyof ISurveyRow] || 'Unknown');
      }

      if (!acc[dimensionValue]) {
        acc[dimensionValue] = {
          name: dimensionValue,
          value: 0,
          count: 0,
          originalName: dimensionValue,
          metrics: config.metrics.length > 0 ? config.metrics : [config.metric],
          metricValues: {}
        };
      }

      const currentItem = acc[dimensionValue];
      if (!currentItem) return acc;

      const selectedMetrics = config.metrics.length > 0 ? config.metrics : [config.metric];
      selectedMetrics.forEach(metric => {
        const metricValue = Number(row[metric as keyof ISurveyRow]) || 0;
        if (metricValue > 0 && currentItem.metricValues) {
          currentItem.metricValues[metric] = metricValue;
        }
      });

      const primaryValue = Number(row[primaryMetric as keyof ISurveyRow]) || 0;
      if (primaryValue > 0) {
        currentItem.value = primaryValue;
        currentItem.count += 1;
      }

      return acc;
    }, {} as Record<string, ChartDataItem>);

    // Format and return
    const result = Object.values(grouped)
      .map((item: ChartDataItem) => {
        let displayName = item.name;
        if (config.dimension === 'specialty' && item.name.includes('-')) {
          const parts = item.name.split('-');
          displayName = formatSpecialtyForDisplay(parts[0]);
        }
        
        return {
          ...item,
          name: displayName
        };
      })
      .filter((item: ChartDataItem) => item.value > 1000)
      .sort((a, b) => b.value - a.value);

    if (config.dimension === 'specialty' && config.filters.specialties.length === 0) {
      return { chartData: [], filteredRecords: 0 };
    }

    const finalData = result.slice(0, 20);
    return { chartData: finalData, filteredRecords: filteredData.length };
  }, [surveyData, config, specialtyMappings]);

  // Update processing progress when data changes
  useEffect(() => {
    if (loading) {
      setProcessingProgress(0);
    } else if (surveyData.length > 0) {
      // Simulate progress during filtering/processing
      const timer = setTimeout(() => {
        setProcessingProgress(50);
        setTimeout(() => {
          setProcessingProgress(100);
          setTimeout(() => setProcessingProgress(0), 300);
        }, 200);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, surveyData.length, config, chartData.length]);

  return {
    loading,
    processingProgress,
    surveyData,
    availableOptions,
    chartData,
    totalRecords: surveyData.length,
    filteredRecords: filteredCount,
    filterImpacts
  };
};


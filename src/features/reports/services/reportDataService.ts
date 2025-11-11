/**
 * Report Data Service
 * 
 * Fetches and processes data for reports using existing analytics infrastructure
 */

import { AnalyticsDataService } from '../../analytics/services/analyticsDataService';
import { filterAnalyticsData } from '../../analytics/utils/analyticsCalculations';
import { AggregatedData } from '../../analytics/types/analytics';
import { AnalyticsFilters } from '../../analytics/types/analytics';
import { ReportTemplate, GroupingDimension } from '../templates/reportTemplates';

export interface ReportFilters {
  specialties: string[];
  regions: string[];
  surveySources: string[];
  providerTypes: string[];
  years: string[];
  dataCategory?: string;
}

export interface ReportDataConfig {
  template: ReportTemplate;
  filters: ReportFilters;
  metrics: string[];
  grouping?: GroupingDimension;
}

export interface GroupedReportData {
  groupKey: string;
  groupLabel: string;
  data: AggregatedData[];
  metrics: Record<string, {
    p25?: number;
    p50?: number;
    p75?: number;
    p90?: number;
    count: number;
  }>;
}

/**
 * Report Data Service
 */
export class ReportDataService {
  private analyticsService: AnalyticsDataService;

  constructor() {
    this.analyticsService = new AnalyticsDataService();
  }

  /**
   * Generate report data based on template and configuration
   */
  async generateReportData(config: ReportDataConfig): Promise<GroupedReportData[]> {
    try {
      // Convert report filters to analytics filters
      const analyticsFilters: AnalyticsFilters = {
        specialty: config.filters.specialties.length > 0 ? config.filters.specialties[0] : '',
        geographicRegion: config.filters.regions.length > 0 ? config.filters.regions[0] : '',
        surveySource: config.filters.surveySources.length > 0 ? config.filters.surveySources[0] : '',
        providerType: config.filters.providerTypes.length > 0 ? config.filters.providerTypes[0] : '',
        year: config.filters.years.length > 0 ? config.filters.years[0] : ''
      };

      // Fetch analytics data
      const allData = await this.analyticsService.getAnalyticsData(analyticsFilters);

      // Apply additional filters (multiple selections)
      let filteredData = allData;
      
      if (config.filters.specialties.length > 0) {
        filteredData = filteredData.filter(row => {
          const rowSpecialty = (row.standardizedName || row.surveySpecialty || '').toLowerCase();
          return config.filters.specialties.some(spec => 
            rowSpecialty.includes(spec.toLowerCase()) ||
            spec.toLowerCase().includes(rowSpecialty)
          );
        });
      }

      if (config.filters.regions.length > 0) {
        filteredData = filteredData.filter(row => 
          config.filters.regions.includes(row.geographicRegion)
        );
      }

      if (config.filters.surveySources.length > 0) {
        filteredData = filteredData.filter(row => 
          config.filters.surveySources.includes(row.surveySource)
        );
      }

      if (config.filters.providerTypes.length > 0) {
        filteredData = filteredData.filter(row => 
          row.providerType && config.filters.providerTypes.includes(row.providerType)
        );
      }

      if (config.filters.years.length > 0) {
        filteredData = filteredData.filter(row => 
          row.surveyYear && config.filters.years.includes(row.surveyYear)
        );
      }

      if (config.filters.dataCategory) {
        filteredData = filteredData.filter(row => 
          (row as any).dataCategory === config.filters.dataCategory
        );
      }

      // Group data if grouping is specified
      if (config.grouping) {
        return this.groupData(filteredData, config.grouping, config.metrics);
      }

      // If no grouping, return single group with all data
      return [{
        groupKey: 'all',
        groupLabel: 'All Data',
        data: filteredData,
        metrics: this.calculateMetrics(filteredData, config.metrics)
      }];
    } catch (error) {
      console.error('Error generating report data:', error);
      throw new Error(`Failed to generate report data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Group data by dimension
   */
  private groupData(
    data: AggregatedData[],
    grouping: GroupingDimension,
    metrics: string[]
  ): GroupedReportData[] {
    const groups = new Map<string, AggregatedData[]>();

    data.forEach(row => {
      let groupKey: string;
      let groupLabel: string;

      switch (grouping) {
        case 'specialty':
          groupKey = row.standardizedName || row.surveySpecialty;
          groupLabel = row.standardizedName || row.surveySpecialty;
          break;
        case 'region':
          groupKey = row.geographicRegion;
          groupLabel = row.geographicRegion;
          break;
        case 'surveySource':
          groupKey = row.surveySource;
          groupLabel = row.surveySource;
          break;
        case 'providerType':
          groupKey = row.providerType || 'Unknown';
          groupLabel = row.providerType || 'Unknown';
          break;
        case 'year':
          groupKey = row.surveyYear || 'Unknown';
          groupLabel = row.surveyYear || 'Unknown';
          break;
        default:
          groupKey = 'all';
          groupLabel = 'All';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    });

    // Convert to GroupedReportData array
    const result: GroupedReportData[] = [];
    groups.forEach((groupData, groupKey) => {
      result.push({
        groupKey,
        groupLabel: groupData[0] ? this.getGroupLabel(groupData[0], grouping) : groupKey,
        data: groupData,
        metrics: this.calculateMetrics(groupData, metrics)
      });
    });

    // Sort by group label
    result.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));

    return result;
  }

  /**
   * Get group label from row
   */
  private getGroupLabel(row: AggregatedData, grouping: GroupingDimension): string {
    switch (grouping) {
      case 'specialty':
        return row.standardizedName || row.surveySpecialty;
      case 'region':
        return row.geographicRegion;
      case 'surveySource':
        return row.surveySource;
      case 'providerType':
        return row.providerType || 'Unknown';
      case 'year':
        return row.surveyYear || 'Unknown';
      default:
        return 'All';
    }
  }

  /**
   * Calculate metrics for a group of data
   */
  private calculateMetrics(
    data: AggregatedData[],
    metrics: string[]
  ): Record<string, { p25?: number; p50?: number; p75?: number; p90?: number; count: number }> {
    const result: Record<string, { p25?: number; p50?: number; p75?: number; p90?: number; count: number }> = {};

    metrics.forEach(metric => {
      const isP25 = metric.includes('p25');
      const isP50 = metric.includes('p50');
      const isP75 = metric.includes('p75');
      const isP90 = metric.includes('p90');
      
      const isTCC = metric.includes('tcc');
      const isWRVU = metric.includes('wrvu');
      const isCF = metric.includes('cf');

      let sum = 0;
      let totalWeight = 0;
      let totalCount = 0;

      data.forEach(row => {
        let nIncumbents = 0;
        let percentileValue: number | undefined;

        if (isTCC) {
          nIncumbents = row.tcc_n_incumbents || 0;
          if (isP25) percentileValue = row.tcc_p25;
          else if (isP50) percentileValue = row.tcc_p50;
          else if (isP75) percentileValue = row.tcc_p75;
          else if (isP90) percentileValue = row.tcc_p90;
        } else if (isWRVU) {
          nIncumbents = row.wrvu_n_incumbents || 0;
          if (isP25) percentileValue = row.wrvu_p25;
          else if (isP50) percentileValue = row.wrvu_p50;
          else if (isP75) percentileValue = row.wrvu_p75;
          else if (isP90) percentileValue = row.wrvu_p90;
        } else if (isCF) {
          nIncumbents = row.cf_n_incumbents || 0;
          if (isP25) percentileValue = row.cf_p25;
          else if (isP50) percentileValue = row.cf_p50;
          else if (isP75) percentileValue = row.cf_p75;
          else if (isP90) percentileValue = row.cf_p90;
        }

        if (percentileValue !== undefined && percentileValue !== null && !isNaN(percentileValue) && percentileValue > 0 && nIncumbents > 0) {
          const weight = nIncumbents;
          sum += percentileValue * weight;
          totalWeight += weight;
          totalCount += nIncumbents;
        }
      });

      const weightedAverage = totalWeight > 0 ? sum / totalWeight : undefined;
      
      result[metric] = {
        p25: isP25 ? weightedAverage : undefined,
        p50: isP50 ? weightedAverage : undefined,
        p75: isP75 ? weightedAverage : undefined,
        p90: isP90 ? weightedAverage : undefined,
        count: totalCount
      };
    });

    return result;
  }

  /**
   * Get available filter options from data
   */
  async getAvailableFilterOptions(): Promise<{
    specialties: string[];
    regions: string[];
    surveySources: string[];
    providerTypes: string[];
    years: string[];
  }> {
    try {
      const allData = await this.analyticsService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });

      const specialties = new Set<string>();
      const regions = new Set<string>();
      const surveySources = new Set<string>();
      const providerTypes = new Set<string>();
      const years = new Set<string>();

      allData.forEach(row => {
        if (row.standardizedName) specialties.add(row.standardizedName);
        if (row.surveySpecialty) specialties.add(row.surveySpecialty);
        if (row.geographicRegion) regions.add(row.geographicRegion);
        if (row.surveySource) surveySources.add(row.surveySource);
        if (row.providerType) providerTypes.add(row.providerType);
        if (row.surveyYear) years.add(row.surveyYear);
      });

      return {
        specialties: Array.from(specialties).sort(),
        regions: Array.from(regions).sort(),
        surveySources: Array.from(surveySources).sort(),
        providerTypes: Array.from(providerTypes).sort(),
        years: Array.from(years).sort()
      };
    } catch (error) {
      console.error('Error getting available filter options:', error);
      return {
        specialties: [],
        regions: [],
        surveySources: [],
        providerTypes: [],
        years: []
      };
    }
  }
}


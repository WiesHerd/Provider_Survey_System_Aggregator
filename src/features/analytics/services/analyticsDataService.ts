/**
 * Analytics data service
 * Handles data fetching and processing for analytics feature
 */

import { getDataService } from '../../../services/DataService';
import { AggregatedData, VariableMapping } from '../types/analytics';
import { ISurveyRow } from '../../../types/survey';
import { ISpecialtyMapping } from '../../../types/specialty';
import { transformSurveyData, getVariableMappings, extractUniqueValues } from '../utils/dataTransformation';

/**
 * Analytics data service class
 */
export class AnalyticsDataService {
  private dataService = getDataService();

  /**
   * Load all analytics data from surveys
   * 
   * @returns Promise resolving to aggregated analytics data
   */
  async loadAnalyticsData(): Promise<AggregatedData[]> {
    try {
      // Load surveys data
      const surveys = await this.dataService.getAllSurveys();
      
      if (!surveys || Object.keys(surveys).length === 0) {
        return [];
      }

      // Load column mappings
      const columnMappings = await this.dataService.getAllColumnMappings();
      
      // Load specialty mappings
      const specialtyMappings = await this.dataService.getAllSpecialtyMappings();
      
      // Load region mappings
      const regionMappings = await this.dataService.getRegionMappings();
      
      // Load variable mappings
      const variableMappings = await getVariableMappings();

      const allData: AggregatedData[] = [];
      
      // Process each survey
      Object.entries(surveys).forEach(([surveyId, surveyData]) => {
        if (surveyData && Array.isArray(surveyData) && surveyData.length > 0) {
          const transformed = transformSurveyData(
            surveyData, 
            columnMappings, 
            specialtyMappings, 
            surveyId, 
            variableMappings, 
            regionMappings
          );
          allData.push(...transformed);
        }
      });

      return allData;
    } catch (error) {
      console.error('Error loading analytics data:', error);
      throw new Error('Failed to load analytics data');
    }
  }

  /**
   * Get unique values for filter options
   * 
   * @param data - Analytics data array
   * @returns Object containing unique values for filters
   */
  getUniqueValues(data: AggregatedData[]) {
    return extractUniqueValues(data);
  }

  /**
   * Filter analytics data based on criteria
   * 
   * @param data - Analytics data array
   * @param filters - Filter criteria
   * @returns Filtered data array
   */
  filterData(
    data: AggregatedData[], 
    filters: {
      specialty?: string;
      providerType?: string;
      region?: string;
      variable?: string;
      surveySource?: string;
    }
  ): AggregatedData[] {
    return data.filter(row => {
      if (filters.specialty && !row.surveySpecialty.toLowerCase().includes(filters.specialty.toLowerCase())) {
        return false;
      }
      if (filters.region && !row.geographicRegion.toLowerCase().includes(filters.region.toLowerCase())) {
        return false;
      }
      if (filters.surveySource && !row.surveySource.toLowerCase().includes(filters.surveySource.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get analytics summary statistics
   * 
   * @param data - Analytics data array
   * @returns Summary statistics object
   */
  getSummaryStats(data: AggregatedData[]) {
    if (data.length === 0) {
      return {
        totalRecords: 0,
        uniqueSpecialties: 0,
        uniqueRegions: 0,
        uniqueSurveySources: 0,
        totalOrganizations: 0,
        totalIncumbents: 0
      };
    }

    const uniqueSpecialties = new Set(data.map(row => row.surveySpecialty)).size;
    const uniqueRegions = new Set(data.map(row => row.geographicRegion)).size;
    const uniqueSurveySources = new Set(data.map(row => row.surveySource)).size;
    
    const totalOrganizations = data.reduce((sum, row) => sum + row.n_orgs, 0);
    const totalIncumbents = data.reduce((sum, row) => sum + row.n_incumbents, 0);
    
    return {
      totalRecords: data.length,
      uniqueSpecialties,
      uniqueRegions,
      uniqueSurveySources,
      totalOrganizations,
      totalIncumbents
    };
  }
}

// Export singleton instance
export const analyticsDataService = new AnalyticsDataService();
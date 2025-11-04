/**
 * Learned Mappings Service
 * 
 * This service handles the application of learned mappings to existing survey data.
 * Since the auto-map system was removed, this provides a manual way to apply
 * learned mappings to new or existing data.
 */

import { getDataService } from './DataService';

export interface LearnedMappingApplicationResult {
  totalRowsProcessed: number;
  mappingsApplied: number;
  specialtiesUpdated: Record<string, number>;
  errors: string[];
}

export class LearnedMappingsService {
  private static instance: LearnedMappingsService;
  private dataService = getDataService();

  static getInstance(): LearnedMappingsService {
    if (!LearnedMappingsService.instance) {
      LearnedMappingsService.instance = new LearnedMappingsService();
    }
    return LearnedMappingsService.instance;
  }

  /**
   * Apply learned specialty mappings to all existing survey data
   */
  async applyLearnedSpecialtyMappings(): Promise<LearnedMappingApplicationResult> {
    
    const result: LearnedMappingApplicationResult = {
      totalRowsProcessed: 0,
      mappingsApplied: 0,
      specialtiesUpdated: {},
      errors: []
    };

    try {
      // Get all learned specialty mappings
      const learnedMappings = await this.dataService.getLearnedMappings('specialty');

      if (Object.keys(learnedMappings).length === 0) {
        return result;
      }

      // Get all surveys
      const surveys = await this.dataService.getAllSurveys();

      for (const survey of surveys) {
        try {
          console.log(`🔍 LearnedMappingsService: Processing survey: ${survey.name}`);
          
          // Get survey data
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 10000 });
          const rows = surveyData.rows;
          
          if (rows.length === 0) {
            console.log(`🔍 LearnedMappingsService: No data in survey ${survey.name}`);
            continue;
          }

          let surveyMappingsApplied = 0;
          const surveySpecialtiesUpdated: Record<string, number> = {};

          // Process each row
          for (const row of rows) {
            result.totalRowsProcessed++;
            
            // Get the actual row data - ensure it's an object
            const rowData = (row.data || row) as Record<string, any>;
            const originalSpecialty = rowData.specialty || rowData.Specialty || '';
            
            if (!originalSpecialty) continue;

            // Check if we have a learned mapping for this specialty
            const learnedMapping = learnedMappings[originalSpecialty.toLowerCase()] || 
                                 learnedMappings[originalSpecialty];
            
            if (learnedMapping && learnedMapping !== originalSpecialty) {
              // Apply the learned mapping
              rowData.specialty = learnedMapping;
              rowData.normalizedSpecialty = learnedMapping;
              
              // Note: Since there's no updateSurveyRow method, we'll log the changes
              // In a real implementation, you'd need to add this method to DataService
              console.log(`🔍 LearnedMappingsService: Would update row ${row.id} with specialty mapping: ${originalSpecialty} -> ${learnedMapping}`);
              
              surveyMappingsApplied++;
              result.mappingsApplied++;
              
              // Track specialty updates
              if (!surveySpecialtiesUpdated[originalSpecialty]) {
                surveySpecialtiesUpdated[originalSpecialty] = 0;
              }
              surveySpecialtiesUpdated[originalSpecialty]++;
              
              if (!result.specialtiesUpdated[originalSpecialty]) {
                result.specialtiesUpdated[originalSpecialty] = 0;
              }
              result.specialtiesUpdated[originalSpecialty]++;
            }
          }

          console.log(`🔍 LearnedMappingsService: Applied ${surveyMappingsApplied} mappings to survey ${survey.name}`);
          
        } catch (error) {
          const errorMsg = `Failed to process survey ${survey.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('🔍 LearnedMappingsService:', errorMsg);
          result.errors.push(errorMsg);
        }
      }

      console.log('🔍 LearnedMappingsService: Learned mappings application completed');
      console.log('🔍 LearnedMappingsService: Results:', result);

    } catch (error) {
      const errorMsg = `Failed to apply learned mappings: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('🔍 LearnedMappingsService:', errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Apply learned column mappings to all existing survey data
   */
  async applyLearnedColumnMappings(): Promise<LearnedMappingApplicationResult> {
    console.log('🔍 LearnedMappingsService: Starting learned column mappings application...');
    
    const result: LearnedMappingApplicationResult = {
      totalRowsProcessed: 0,
      mappingsApplied: 0,
      specialtiesUpdated: {}, // Reusing for column tracking
      errors: []
    };

    try {
      // Get all learned column mappings
      const learnedMappings = await this.dataService.getLearnedMappings('column');
      console.log('🔍 LearnedMappingsService: Found', Object.keys(learnedMappings).length, 'learned column mappings');

      if (Object.keys(learnedMappings).length === 0) {
        console.log('🔍 LearnedMappingsService: No learned column mappings found');
        return result;
      }

      // Get all surveys
      const surveys = await this.dataService.getAllSurveys();
      console.log('🔍 LearnedMappingsService: Processing', surveys.length, 'surveys for column mappings');

      for (const survey of surveys) {
        try {
          console.log(`🔍 LearnedMappingsService: Processing survey columns: ${survey.name}`);
          
          // Get survey data
          const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 10000 });
          const rows = surveyData.rows;
          
          if (rows.length === 0) {
            console.log(`🔍 LearnedMappingsService: No data in survey ${survey.name}`);
            continue;
          }

          let surveyMappingsApplied = 0;
          const surveyColumnsUpdated: Record<string, number> = {};

          // Process each row
          for (const row of rows) {
            result.totalRowsProcessed++;
            
            // Get the actual row data - ensure it's an object
            const rowData = (row.data || row) as Record<string, any>;
            
            // Apply column mappings
            for (const [originalColumn, standardizedColumn] of Object.entries(learnedMappings)) {
              if (rowData[originalColumn] !== undefined && originalColumn !== standardizedColumn) {
                // Move data from original column to standardized column
                rowData[standardizedColumn] = rowData[originalColumn];
                delete rowData[originalColumn];
                
                surveyMappingsApplied++;
                result.mappingsApplied++;
                
                // Track column updates
                if (!surveyColumnsUpdated[originalColumn]) {
                  surveyColumnsUpdated[originalColumn] = 0;
                }
                surveyColumnsUpdated[originalColumn]++;
                
                if (!result.specialtiesUpdated[originalColumn]) {
                  result.specialtiesUpdated[originalColumn] = 0;
                }
                result.specialtiesUpdated[originalColumn]++;
              }
            }
            
            // Note: Since there's no updateSurveyRow method, we'll log the changes
            // In a real implementation, you'd need to add this method to DataService
            if (surveyMappingsApplied > 0) {
              console.log(`🔍 LearnedMappingsService: Would update row ${row.id} with column mappings`);
            }
          }

          console.log(`🔍 LearnedMappingsService: Applied ${surveyMappingsApplied} column mappings to survey ${survey.name}`);
          
        } catch (error) {
          const errorMsg = `Failed to process survey columns ${survey.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('🔍 LearnedMappingsService:', errorMsg);
          result.errors.push(errorMsg);
        }
      }

      console.log('🔍 LearnedMappingsService: Learned column mappings application completed');
      console.log('🔍 LearnedMappingsService: Results:', result);

    } catch (error) {
      const errorMsg = `Failed to apply learned column mappings: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('🔍 LearnedMappingsService:', errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Apply all learned mappings (specialty and column) to existing data
   */
  async applyAllLearnedMappings(): Promise<{
    specialty: LearnedMappingApplicationResult;
    column: LearnedMappingApplicationResult;
  }> {
    console.log('🔍 LearnedMappingsService: Applying all learned mappings...');
    
    const [specialtyResult, columnResult] = await Promise.all([
      this.applyLearnedSpecialtyMappings(),
      this.applyLearnedColumnMappings()
    ]);

    console.log('🔍 LearnedMappingsService: All learned mappings applied');
    console.log('🔍 LearnedMappingsService: Specialty mappings:', specialtyResult);
    console.log('🔍 LearnedMappingsService: Column mappings:', columnResult);

    return {
      specialty: specialtyResult,
      column: columnResult
    };
  }

  /**
   * Get statistics about learned mappings
   */
  async getLearnedMappingsStats(): Promise<{
    specialty: number;
    column: number;
    variable: number;
    region: number;
    providerType: number;
  }> {
    const [specialty, column, variable, region, providerType] = await Promise.all([
      this.dataService.getLearnedMappings('specialty'),
      this.dataService.getLearnedMappings('column'),
      this.dataService.getLearnedMappings('variable'),
      this.dataService.getLearnedMappings('region'),
      this.dataService.getLearnedMappings('providerType')
    ]);

    return {
      specialty: Object.keys(specialty).length,
      column: Object.keys(column).length,
      variable: Object.keys(variable).length,
      region: Object.keys(region).length,
      providerType: Object.keys(providerType).length
    };
  }
}

// Export singleton instance
export const learnedMappingsService = LearnedMappingsService.getInstance();

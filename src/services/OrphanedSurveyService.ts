/**
 * Orphaned Survey Detection and Cleanup Service
 * 
 * Detects surveys that have metadata but no data rows (failed uploads)
 * and provides utilities to clean them up.
 */

import { getDataService } from './DataService';

export interface OrphanedSurvey {
  surveyId: string;
  surveyName: string;
  expectedRowCount: number;
  actualRowCount: number;
  uploadDate?: Date;
  year?: string;
  providerType?: string;
}

export class OrphanedSurveyService {
  private static instance: OrphanedSurveyService | null = null;

  private constructor() {}

  public static getInstance(): OrphanedSurveyService {
    if (!OrphanedSurveyService.instance) {
      OrphanedSurveyService.instance = new OrphanedSurveyService();
    }
    return OrphanedSurveyService.instance;
  }

  /**
   * Detect all orphaned surveys (surveys with metadata but no data rows)
   */
  async detectOrphanedSurveys(): Promise<OrphanedSurvey[]> {
    const dataService = getDataService();
    const orphanedSurveys: OrphanedSurvey[] = [];

    try {
      console.log('🔍 OrphanedSurveyService: Scanning for orphaned surveys...');
      const surveys = await dataService.getAllSurveys();

      console.log(`🔍 OrphanedSurveyService: Checking ${surveys.length} surveys...`);

      for (const survey of surveys) {
        const expectedRowCount = survey.rowCount || 0;
        
        // Skip surveys with no expected rows (they're intentionally empty)
        if (expectedRowCount === 0) {
          continue;
        }

        try {
          // Check if data exists
          const dataResult = await dataService.getSurveyData(survey.id, {}, { limit: 1 });
          const actualRowCount = dataResult?.rows?.length || 0;

          // If survey expects rows but has none, it's orphaned
          if (expectedRowCount > 0 && actualRowCount === 0) {
            console.warn(`⚠️ Orphaned survey detected: ${survey.name || survey.id}`, {
              surveyId: survey.id,
              expectedRows: expectedRowCount,
              actualRows: actualRowCount
            });

            orphanedSurveys.push({
              surveyId: survey.id,
              surveyName: survey.name || survey.id,
              expectedRowCount,
              actualRowCount,
              uploadDate: survey.uploadDate,
              year: survey.year,
              providerType: survey.providerType
            });
          }
        } catch (error) {
          // If we can't read the data, assume it's orphaned
          console.warn(`⚠️ Error checking survey data for ${survey.id}:`, error);
          orphanedSurveys.push({
            surveyId: survey.id,
            surveyName: survey.name || survey.id,
            expectedRowCount,
            actualRowCount: 0,
            uploadDate: survey.uploadDate,
            year: survey.year,
            providerType: survey.providerType
          });
        }
      }

      console.log(`✅ OrphanedSurveyService: Found ${orphanedSurveys.length} orphaned survey(s)`);
      return orphanedSurveys;
    } catch (error) {
      console.error('❌ OrphanedSurveyService: Error detecting orphaned surveys:', error);
      throw error;
    }
  }

  /**
   * Check if a specific survey is orphaned
   */
  async isOrphaned(surveyId: string): Promise<boolean> {
    try {
      const dataService = getDataService();
      const survey = await dataService.getSurveyById(surveyId);
      
      if (!survey) {
        return false; // Survey doesn't exist, not orphaned
      }

      const expectedRowCount = survey.rowCount || 0;
      if (expectedRowCount === 0) {
        return false; // Survey has no expected rows, not orphaned
      }

      const dataResult = await dataService.getSurveyData(surveyId, {}, { limit: 1 });
      const actualRowCount = dataResult?.rows?.length || 0;

      return expectedRowCount > 0 && actualRowCount === 0;
    } catch (error) {
      console.error(`❌ OrphanedSurveyService: Error checking if survey ${surveyId} is orphaned:`, error);
      // If we can't check, assume it might be orphaned
      return true;
    }
  }

  /**
   * Clean up orphaned surveys (delete them)
   */
  async cleanupOrphanedSurveys(surveyIds?: string[]): Promise<{
    deleted: number;
    errors: Array<{ surveyId: string; error: string }>;
  }> {
    const dataService = getDataService();
    const errors: Array<{ surveyId: string; error: string }> = [];
    let deleted = 0;

    try {
      // Get orphaned surveys to clean up
      const orphanedSurveys = surveyIds 
        ? await this.detectOrphanedSurveys().then(surveys => 
            surveys.filter(s => surveyIds.includes(s.surveyId))
          )
        : await this.detectOrphanedSurveys();

      console.log(`🧹 OrphanedSurveyService: Cleaning up ${orphanedSurveys.length} orphaned survey(s)...`);

      for (const orphanedSurvey of orphanedSurveys) {
        try {
          await dataService.deleteSurveyEverywhere(orphanedSurvey.surveyId);
          deleted++;
          console.log(`✅ Deleted orphaned survey: ${orphanedSurvey.surveyName}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            surveyId: orphanedSurvey.surveyId,
            error: errorMessage
          });
          console.error(`❌ Failed to delete orphaned survey ${orphanedSurvey.surveyId}:`, error);
        }
      }

      console.log(`✅ OrphanedSurveyService: Cleanup complete. Deleted ${deleted}, Errors: ${errors.length}`);
      return { deleted, errors };
    } catch (error) {
      console.error('❌ OrphanedSurveyService: Error during cleanup:', error);
      throw error;
    }
  }
}

// Export singleton instance getter
export function getOrphanedSurveyService(): OrphanedSurveyService {
  return OrphanedSurveyService.getInstance();
}

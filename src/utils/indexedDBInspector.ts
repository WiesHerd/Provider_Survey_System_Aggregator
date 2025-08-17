import { getDataService } from '../services/DataService';

/**
 * Utility to inspect and manage IndexedDB data
 */
export class IndexedDBInspector {
  private dataService = getDataService();

  /**
   * Get all surveys stored in IndexedDB
   */
  async getAllSurveys() {
    try {
      const surveys = await this.dataService.getAllSurveys();
      console.log('📊 IndexedDB Surveys:', surveys);
      return surveys;
    } catch (error) {
      console.error('Error getting surveys:', error);
      return [];
    }
  }

  /**
   * Get survey data for a specific survey
   */
  async getSurveyData(surveyId: string) {
    try {
      const data = await this.dataService.getSurveyData(surveyId);
      console.log(`📊 Survey Data for ${surveyId}:`, data);
      return data;
    } catch (error) {
      console.error('Error getting survey data:', error);
      return null;
    }
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearAllData() {
    try {
      await this.dataService.deleteAllSurveys();
      console.log('🗑️ All IndexedDB data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Get detailed IndexedDB status
   */
  async getStatus() {
    try {
      const surveys = await this.getAllSurveys();
      const status = {
        totalSurveys: surveys.length,
        surveys: surveys.map(survey => {
          // Handle both Survey and ISurveyData types
          const surveyAny = survey as any;
          return {
            id: surveyAny.id,
            name: surveyAny.name || surveyAny.surveyProvider || 'Unknown',
            type: surveyAny.type || surveyAny.surveyProvider || 'Unknown',
            year: surveyAny.year || surveyAny.surveyYear || 'Unknown',
            rowCount: surveyAny.rowCount || surveyAny.totalRows || 0,
            uploadDate: surveyAny.uploadDate || new Date()
          };
        })
      };
      
      console.log('📊 IndexedDB Status:', status);
      return status;
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }
}

// Global instance for easy access
export const indexedDBInspector = new IndexedDBInspector();

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).indexedDBInspector = indexedDBInspector;
}

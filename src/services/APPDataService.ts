import { ProviderType, APPSurveyRow, APPSpecialtyMapping, APPFMVFilters } from '../types/provider';
import EnhancedDatabaseService from './EnhancedDatabaseService';

/**
 * APP Data Service
 * Handles all data operations specific to Advanced Practice Provider (APP) data
 */
class APPDataService {
  private static instance: APPDataService;
  private dbService: EnhancedDatabaseService;

  private constructor() {
    this.dbService = EnhancedDatabaseService.getInstance();
  }

  public static getInstance(): APPDataService {
    if (!APPDataService.instance) {
      APPDataService.instance = new APPDataService();
    }
    return APPDataService.instance;
  }

  /**
   * Get all APP surveys
   */
  public async getAPPSurveys(): Promise<any[]> {
    return await this.dbService.getSurveysByProviderType('APP');
  }

  /**
   * Get APP survey by ID
   */
  public async getAPPSurvey(surveyId: string): Promise<any | null> {
    const surveys = await this.getAPPSurveys();
    return surveys.find(survey => survey.id === surveyId) || null;
  }

  /**
   * Get all APP survey data
   */
  public async getAllAPPSurveyData(): Promise<APPSurveyRow[]> {
    const allData = await this.dbService.getAllSurveyDataByProviderType('APP');
    return allData.flatMap(chunk => chunk.data);
  }

  /**
   * Get APP survey data by survey ID
   */
  public async getAPPSurveyData(surveyId: string): Promise<APPSurveyRow[]> {
    const surveyData = await this.dbService.getSurveyDataByProviderType(surveyId, 'APP');
    return surveyData.flatMap(chunk => chunk.data);
  }

  /**
   * Save APP survey
   */
  public async saveAPPSurvey(survey: any): Promise<void> {
    await this.dbService.saveSurveyWithProviderType(survey, 'APP');
  }

  /**
   * Save APP survey data
   */
  public async saveAPPSurveyData(surveyId: string, data: APPSurveyRow[]): Promise<void> {
    await this.dbService.saveSurveyDataWithProviderType(surveyId, data, 'APP');
  }

  /**
   * Delete APP survey
   */
  public async deleteAPPSurvey(surveyId: string): Promise<void> {
    await this.dbService.deleteSurveyByProviderType(surveyId, 'APP');
  }

  /**
   * Clear all APP data
   */
  public async clearAllAPPData(): Promise<void> {
    await this.dbService.clearProviderData('APP');
  }

  /**
   * Get APP data summary
   */
  public async getAPPDataSummary(): Promise<{
    surveyCount: number;
    totalRows: number;
    specialties: string[];
    regions: string[];
    providerTypes: string[];
    certifications: string[];
    practiceSettings: string[];
  }> {
    const summary = await this.dbService.getProviderDataSummary('APP');
    const allData = await this.getAllAPPSurveyData();
    
    // Extract APP-specific data
    const providerTypes = new Set<string>();
    const certifications = new Set<string>();
    const practiceSettings = new Set<string>();
    
    allData.forEach(row => {
      providerTypes.add(row.providerType);
      certifications.add(row.certification);
      practiceSettings.add(row.practiceSetting);
    });

    return {
      ...summary,
      providerTypes: Array.from(providerTypes),
      certifications: Array.from(certifications),
      practiceSettings: Array.from(practiceSettings),
    };
  }

  /**
   * Filter APP data by criteria
   */
  public async filterAPPData(filters: Partial<APPFMVFilters>): Promise<APPSurveyRow[]> {
    const allData = await this.getAllAPPSurveyData();
    
    return allData.filter(row => {
      // Filter by specialty
      if (filters.specialty && row.specialty !== filters.specialty) {
        return false;
      }
      
      // Filter by provider type
      if (filters.providerType && row.providerType !== filters.providerType) {
        return false;
      }
      
      // Filter by region
      if (filters.region && row.region !== filters.region) {
        return false;
      }
      
      // Filter by certification
      if (filters.certification && row.certification !== filters.certification) {
        return false;
      }
      
      // Filter by practice setting
      if (filters.practiceSetting && row.practiceSetting !== filters.practiceSetting) {
        return false;
      }
      
      // Filter by supervision level
      if (filters.supervisionLevel && row.supervisionLevel !== filters.supervisionLevel) {
        return false;
      }
      
      // Filter by billing level
      if (filters.billingLevel && row.billingLevel !== filters.billingLevel) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get APP data by specialty
   */
  public async getAPPDataBySpecialty(specialty: string): Promise<APPSurveyRow[]> {
    return await this.filterAPPData({ specialty });
  }

  /**
   * Get APP data by certification
   */
  public async getAPPDataByCertification(certification: string): Promise<APPSurveyRow[]> {
    return await this.filterAPPData({ certification });
  }

  /**
   * Get APP data by practice setting
   */
  public async getAPPDataByPracticeSetting(practiceSetting: string): Promise<APPSurveyRow[]> {
    return await this.filterAPPData({ practiceSetting: practiceSetting as any });
  }

  /**
   * Get APP data by supervision level
   */
  public async getAPPDataBySupervisionLevel(supervisionLevel: string): Promise<APPSurveyRow[]> {
    return await this.filterAPPData({ supervisionLevel: supervisionLevel as any });
  }

  /**
   * Get unique APP specialties
   */
  public async getUniqueAPPSpecialties(): Promise<string[]> {
    const allData = await this.getAllAPPSurveyData();
    const specialties = new Set(allData.map(row => row.specialty));
    return Array.from(specialties).sort();
  }

  /**
   * Get unique APP certifications
   */
  public async getUniqueAPPCertifications(): Promise<string[]> {
    const allData = await this.getAllAPPSurveyData();
    const certifications = new Set(allData.map(row => row.certification));
    return Array.from(certifications).sort();
  }

  /**
   * Get unique APP practice settings
   */
  public async getUniqueAPPPracticeSettings(): Promise<string[]> {
    const allData = await this.getAllAPPSurveyData();
    const practiceSettings = new Set(allData.map(row => row.practiceSetting));
    return Array.from(practiceSettings).sort();
  }

  /**
   * Get unique APP supervision levels
   */
  public async getUniqueAPPSupervisionLevels(): Promise<string[]> {
    const allData = await this.getAllAPPSurveyData();
    const supervisionLevels = new Set(allData.map(row => row.supervisionLevel));
    return Array.from(supervisionLevels).sort();
  }

  /**
   * Get APP compensation statistics
   */
  public async getAPPCompensationStats(filters?: Partial<APPFMVFilters>): Promise<{
    tcc: { p25: number; p50: number; p75: number; p90: number };
    wrvu: { p25: number; p50: number; p75: number; p90: number };
    cf: { p25: number; p50: number; p75: number; p90: number };
    count: number;
  }> {
    const data = filters ? await this.filterAPPData(filters) : await this.getAllAPPSurveyData();
    
    if (data.length === 0) {
      return {
        tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
        wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
        cf: { p25: 0, p50: 0, p75: 0, p90: 0 },
        count: 0,
      };
    }

    // Calculate weighted averages based on n_incumbents
    const totalIncumbents = data.reduce((sum, row) => sum + row.n_incumbents, 0);
    
    const tcc = {
      p25: data.reduce((sum, row) => sum + (row.tcc_p25 * row.n_incumbents), 0) / totalIncumbents,
      p50: data.reduce((sum, row) => sum + (row.tcc_p50 * row.n_incumbents), 0) / totalIncumbents,
      p75: data.reduce((sum, row) => sum + (row.tcc_p75 * row.n_incumbents), 0) / totalIncumbents,
      p90: data.reduce((sum, row) => sum + (row.tcc_p90 * row.n_incumbents), 0) / totalIncumbents,
    };

    const wrvu = {
      p25: data.reduce((sum, row) => sum + (row.wrvu_p25 * row.n_incumbents), 0) / totalIncumbents,
      p50: data.reduce((sum, row) => sum + (row.wrvu_p50 * row.n_incumbents), 0) / totalIncumbents,
      p75: data.reduce((sum, row) => sum + (row.wrvu_p75 * row.n_incumbents), 0) / totalIncumbents,
      p90: data.reduce((sum, row) => sum + (row.wrvu_p90 * row.n_incumbents), 0) / totalIncumbents,
    };

    const cf = {
      p25: data.reduce((sum, row) => sum + (row.cf_p25 * row.n_incumbents), 0) / totalIncumbents,
      p50: data.reduce((sum, row) => sum + (row.cf_p50 * row.n_incumbents), 0) / totalIncumbents,
      p75: data.reduce((sum, row) => sum + (row.cf_p75 * row.n_incumbents), 0) / totalIncumbents,
      p90: data.reduce((sum, row) => sum + (row.cf_p90 * row.n_incumbents), 0) / totalIncumbents,
    };

    return {
      tcc,
      wrvu,
      cf,
      count: data.length,
    };
  }

  /**
   * Check if APP data exists
   */
  public async hasAPPData(): Promise<boolean> {
    return await this.dbService.hasProviderData('APP');
  }

  /**
   * Get APP data count
   */
  public async getAPPDataCount(): Promise<number> {
    const summary = await this.getAPPDataSummary();
    return summary.totalRows;
  }
}

export default APPDataService;

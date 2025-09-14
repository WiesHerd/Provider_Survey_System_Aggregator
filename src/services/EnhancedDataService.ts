/**
 * Enhanced Data Service with Provider Type Support
 * 
 * This service extends the existing DataService to support dual-provider
 * data processing (Physician and APP data).
 */

import { IndexedDBService } from './IndexedDBService';
import { ProviderDetectionService } from './ProviderDetectionService';
import { 
  ProviderType, 
  Survey, 
  PhysicianSurveyRow, 
  APPSurveyRow, 
  CombinedSurveyRow,
  PhysicianSpecialtyMapping,
  APPSpecialtyMapping,
  BaseSpecialtyMapping,
  RawSurveyData,
  ProviderDetectionResult,
  ProviderValidationResult
} from '../types/provider';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/specialty';
import { IColumnMapping } from '../types/column';

export enum StorageMode {
  INDEXED_DB = 'indexeddb'
}

/**
 * Enhanced Data Service with dual-provider support
 */
export class EnhancedDataService {
  private indexedDB: IndexedDBService;
  private mode: StorageMode;

  constructor(mode: StorageMode = StorageMode.INDEXED_DB) {
    this.indexedDB = new IndexedDBService();
    this.mode = mode;
  }

  setMode(mode: StorageMode) {
    this.mode = mode;
  }

  getMode(): StorageMode {
    return this.mode;
  }

  // ==================== PROVIDER DETECTION ====================

  /**
   * Detect provider type from raw survey data
   */
  async detectProviderType(data: RawSurveyData): Promise<ProviderDetectionResult> {
    return ProviderDetectionService.detectProviderType(data);
  }

  /**
   * Validate provider data
   */
  async validateProviderData(data: RawSurveyData, providerType: ProviderType): Promise<ProviderValidationResult> {
    return ProviderDetectionService.validateProviderData(data, providerType);
  }

  // ==================== SURVEY METHODS ====================

  /**
   * Get all surveys with provider type filtering
   */
  async getAllSurveys(providerType?: ProviderType): Promise<Survey[]> {
    const surveys = await this.indexedDB.getAllSurveys();
    
    if (providerType) {
      return surveys.filter(survey => survey.providerType === providerType);
    }
    
    return surveys;
  }

  /**
   * Get surveys by provider type
   */
  async getSurveysByProviderType(providerType: ProviderType): Promise<Survey[]> {
    return this.getAllSurveys(providerType);
  }

  /**
   * Create survey with provider type detection
   */
  async createSurveyWithProviderDetection(
    file: File,
    surveyName: string,
    surveySource: string
  ): Promise<{ survey: Survey; detectionResult: ProviderDetectionResult }> {
    // Parse CSV file
    const csvText = await file.text();
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, any> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

    // Create raw survey data
    const rawData: RawSurveyData = {
      columns: headers,
      rows,
      surveyId: crypto.randomUUID(),
      surveyName,
      surveySource
    };

    // Detect provider type
    const detectionResult = await this.detectProviderType(rawData);
    
    // Create survey with detected provider type
    const survey: Survey = {
      id: rawData.surveyId,
      name: surveyName,
      source: surveySource,
      providerType: detectionResult.providerType as ProviderType,
      data: [], // Will be populated after processing
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        totalRows: rows.length,
        specialties: [...new Set(rows.map(row => row.specialty || row.Specialty).filter(Boolean))],
        regions: [...new Set(rows.map(row => row.region || row.Region).filter(Boolean))],
        providerTypes: [...new Set(rows.map(row => row.providerType || row.ProviderType).filter(Boolean))],
        compensationMetrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90', 'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90', 'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'],
        dataQuality: {
          completeness: 0.95, // Will be calculated
          accuracy: 0.98, // Will be calculated
          consistency: 0.97, // Will be calculated
          lastValidated: new Date()
        }
      }
    };

    // Save survey
    await this.indexedDB.createSurvey(survey);

    return { survey, detectionResult };
  }

  /**
   * Create survey with explicit provider type
   */
  async createSurvey(
    survey: Survey
  ): Promise<Survey> {
    return await this.indexedDB.createSurvey(survey);
  }

  /**
   * Delete survey
   */
  async deleteSurvey(id: string): Promise<void> {
    return await this.indexedDB.deleteSurvey(id);
  }

  /**
   * Delete all surveys by provider type
   */
  async deleteSurveysByProviderType(providerType: ProviderType): Promise<void> {
    const surveys = await this.getAllSurveys(providerType);
    for (const survey of surveys) {
      await this.deleteSurvey(survey.id);
    }
  }

  // ==================== SURVEY DATA METHODS ====================

  /**
   * Get survey data with provider type filtering
   */
  async getSurveyData(
    surveyId: string, 
    filters: any = {}, 
    options: any = {}
  ): Promise<{ rows: (PhysicianSurveyRow | APPSurveyRow)[]; total: number }> {
    const survey = await this.indexedDB.getSurvey(surveyId);
    if (!survey) {
      throw new Error(`Survey with id ${surveyId} not found`);
    }

    let data = survey.data as (PhysicianSurveyRow | APPSurveyRow)[];

    // Apply filters
    if (filters.specialty) {
      data = data.filter(row => row.specialty === filters.specialty);
    }
    if (filters.region) {
      data = data.filter(row => row.region === filters.region);
    }
    if (filters.providerType) {
      data = data.filter(row => row.providerType === filters.providerType);
    }

    // Apply pagination
    const limit = options.limit || data.length;
    const offset = options.offset || 0;
    const paginatedData = data.slice(offset, offset + limit);

    return {
      rows: paginatedData,
      total: data.length
    };
  }

  /**
   * Get combined survey data (both provider types)
   */
  async getCombinedSurveyData(
    filters: any = {},
    options: any = {}
  ): Promise<{ rows: CombinedSurveyRow[]; total: number }> {
    const physicianSurveys = await this.getAllSurveys('PHYSICIAN');
    const appSurveys = await this.getAllSurveys('APP');

    let combinedData: CombinedSurveyRow[] = [];

    // Process physician data
    for (const survey of physicianSurveys) {
      const surveyData = await this.getSurveyData(survey.id, filters, { limit: 10000 });
      const combinedRows = surveyData.rows.map(row => ({
        ...row,
        providerType: 'PHYSICIAN' as ProviderType,
        physicianFields: {
          providerType: (row as PhysicianSurveyRow).providerType,
          subspecialty: (row as PhysicianSurveyRow).subspecialty,
          boardCertification: (row as PhysicianSurveyRow).boardCertification,
          fellowship: (row as PhysicianSurveyRow).fellowship,
          academicRank: (row as PhysicianSurveyRow).academicRank,
          yearsInPractice: (row as PhysicianSurveyRow).yearsInPractice
        }
      }));
      combinedData.push(...combinedRows);
    }

    // Process APP data
    for (const survey of appSurveys) {
      const surveyData = await this.getSurveyData(survey.id, filters, { limit: 10000 });
      const combinedRows = surveyData.rows.map(row => ({
        ...row,
        providerType: 'APP' as ProviderType,
        appFields: {
          providerType: (row as APPSurveyRow).providerType,
          certification: (row as APPSurveyRow).certification,
          practiceSetting: (row as APPSurveyRow).practiceSetting,
          supervisionLevel: (row as APPSurveyRow).supervisionLevel,
          billingLevel: (row as APPSurveyRow).billingLevel,
          patientVolume: (row as APPSurveyRow).patientVolume,
          proceduresPerformed: (row as APPSurveyRow).proceduresPerformed,
          yearsInPractice: (row as APPSurveyRow).yearsInPractice
        }
      }));
      combinedData.push(...combinedRows);
    }

    // Apply pagination
    const limit = options.limit || combinedData.length;
    const offset = options.offset || 0;
    const paginatedData = combinedData.slice(offset, offset + limit);

    return {
      rows: paginatedData,
      total: combinedData.length
    };
  }

  // ==================== SPECIALTY MAPPING METHODS ====================

  /**
   * Get specialty mappings by provider type
   */
  async getSpecialtyMappingsByProviderType(providerType: ProviderType): Promise<BaseSpecialtyMapping[]> {
    const mappings = await this.indexedDB.getAllSpecialtyMappings();
    return mappings.filter(mapping => mapping.providerType === providerType);
  }

  /**
   * Create physician specialty mapping
   */
  async createPhysicianSpecialtyMapping(mapping: PhysicianSpecialtyMapping): Promise<void> {
    return await this.indexedDB.createSpecialtyMapping(mapping);
  }

  /**
   * Create APP specialty mapping
   */
  async createAPPSpecialtyMapping(mapping: APPSpecialtyMapping): Promise<void> {
    return await this.indexedDB.createSpecialtyMapping(mapping);
  }

  /**
   * Get unmapped specialties by provider type
   */
  async getUnmappedSpecialtiesByProviderType(providerType: ProviderType): Promise<IUnmappedSpecialty[]> {
    const unmappedSpecialties = await this.indexedDB.getUnmappedSpecialties();
    return unmappedSpecialties.filter(specialty => specialty.providerType === providerType);
  }

  // ==================== LEGACY COMPATIBILITY ====================

  /**
   * Legacy method for backward compatibility
   */
  async getAllSurveysLegacy() {
    return await this.indexedDB.getAllSurveys();
  }

  /**
   * Legacy method for backward compatibility
   */
  async createSurveyLegacy(survey: any) {
    return await this.indexedDB.createSurvey(survey);
  }

  /**
   * Legacy method for backward compatibility
   */
  async getSurveyDataLegacy(surveyId: string, filters: any = {}, options: any = {}) {
    return await this.indexedDB.getSurveyData(surveyId, filters, options);
  }

  /**
   * Legacy method for backward compatibility
   */
  async getAllSpecialtyMappings() {
    return await this.indexedDB.getAllSpecialtyMappings();
  }

  /**
   * Legacy method for backward compatibility
   */
  async createSpecialtyMapping(mapping: ISpecialtyMapping) {
    return await this.indexedDB.createSpecialtyMapping(mapping);
  }

  /**
   * Legacy method for backward compatibility
   */
  async getUnmappedSpecialties() {
    return await this.indexedDB.getUnmappedSpecialties();
  }

  /**
   * Legacy method for backward compatibility
   */
  async getAllColumnMappings() {
    return await this.indexedDB.getAllColumnMappings();
  }

  /**
   * Legacy method for backward compatibility
   */
  async createColumnMapping(mapping: IColumnMapping) {
    return await this.indexedDB.createColumnMapping(mapping);
  }

  /**
   * Legacy method for backward compatibility
   */
  async deleteSpecialtyMapping(id: string) {
    return await this.indexedDB.deleteSpecialtyMapping(id);
  }

  /**
   * Legacy method for backward compatibility
   */
  async updateSpecialtyMapping(mapping: ISpecialtyMapping) {
    return await this.indexedDB.updateSpecialtyMapping(mapping);
  }

  /**
   * Legacy method for backward compatibility
   */
  async deleteColumnMapping(id: string) {
    return await this.indexedDB.deleteColumnMapping(id);
  }

  /**
   * Legacy method for backward compatibility
   */
  async updateColumnMapping(mapping: IColumnMapping) {
    return await this.indexedDB.updateColumnMapping(mapping);
  }

  /**
   * Legacy method for backward compatibility
   */
  async uploadSurvey(file: File, surveyName: string, surveySource: string) {
    return await this.indexedDB.uploadSurvey(file, surveyName, surveySource);
  }

  /**
   * Legacy method for backward compatibility
   */
  async deleteAllSurveys() {
    return await this.indexedDB.deleteAllSurveys();
  }

  /**
   * Legacy method for backward compatibility
   */
  async deleteAllMappings() {
    return await this.indexedDB.deleteAllMappings();
  }

  /**
   * Legacy method for backward compatibility
   */
  async deleteAllColumnMappings() {
    return await this.indexedDB.deleteAllColumnMappings();
  }
}

// Export singleton instance
export const getEnhancedDataService = (): EnhancedDataService => {
  return new EnhancedDataService();
};

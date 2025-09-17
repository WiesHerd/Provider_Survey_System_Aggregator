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
  PhysicianType,
  APPType,
  APPPracticeSetting,
  APPSupervisionLevel,
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
      return surveys.filter(survey => survey.providerType === providerType) as Survey[];
    }
    
    return surveys as Survey[];
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
      year: new Date().getFullYear().toString(),
      type: 'compensation',
      uploadDate: new Date(),
      rowCount: rows.length,
      specialtyCount: [...new Set(rows.map(row => row.specialty || row.Specialty).filter(Boolean))].length,
      dataPoints: rows.length * 12, // Approximate data points
      colorAccent: '#3B82F6',
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
      },
      // New provider-specific fields
      providerType: detectionResult.providerType as ProviderType,
      source: surveySource,
      createdAt: new Date(),
      updatedAt: new Date(),
      data: [] // Will be populated after processing
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
    // Use the existing getSurveyData method from IndexedDBService
    const result = await this.indexedDB.getSurveyData(surveyId, filters, options);
    
    // Convert ISurveyRow to our provider-specific types
    const data = result.rows.map(row => {
      // For now, we'll create a basic conversion
      // In a real implementation, you'd need to determine the provider type
      // and create the appropriate row type
      const baseRow = {
        id: row.id || crypto.randomUUID(),
        surveyId: surveyId,
        region: row.geographicRegion || row.region || '',
        n_orgs: row.n_orgs || 0,
        n_incumbents: row.n_incumbents || 0,
        tcc_p25: row.tcc_p25 || 0,
        tcc_p50: row.tcc_p50 || 0,
        tcc_p75: row.tcc_p75 || 0,
        tcc_p90: row.tcc_p90 || 0,
        wrvu_p25: row.wrvu_p25 || 0,
        wrvu_p50: row.wrvu_p50 || 0,
        wrvu_p75: row.wrvu_p75 || 0,
        wrvu_p90: row.wrvu_p90 || 0,
        cf_p25: row.cf_p25 || 0,
        cf_p50: row.cf_p50 || 0,
        cf_p75: row.cf_p75 || 0,
        cf_p90: row.cf_p90 || 0,
      };

      // Determine if this is physician or APP data based on provider type
      const providerType = row.providerType || '';
      if (providerType.includes('MD') || providerType.includes('DO') || providerType.includes('Physician')) {
        return {
          ...baseRow,
          providerType: 'MD' as PhysicianType,
          specialty: row.normalizedSpecialty || row.specialty || '',
        } as PhysicianSurveyRow;
      } else {
        return {
          ...baseRow,
          providerType: 'NP' as APPType,
          specialty: row.normalizedSpecialty || row.specialty || '',
          certification: 'Unknown',
          practiceSetting: 'Clinic' as APPPracticeSetting,
          supervisionLevel: 'Supervised' as APPSupervisionLevel,
        } as APPSurveyRow;
      }
    });

    return {
      rows: data,
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
    return mappings.filter(mapping => (mapping as any).providerType === providerType) as BaseSpecialtyMapping[];
  }

  /**
   * Create physician specialty mapping
   */
  async createPhysicianSpecialtyMapping(mapping: PhysicianSpecialtyMapping): Promise<void> {
    // Cast to compatible type for existing service
    const compatibleMapping = mapping as any;
    await this.indexedDB.createSpecialtyMapping(compatibleMapping);
  }

  /**
   * Create APP specialty mapping
   */
  async createAPPSpecialtyMapping(mapping: APPSpecialtyMapping): Promise<void> {
    // Cast to compatible type for existing service
    const compatibleMapping = mapping as any;
    await this.indexedDB.createSpecialtyMapping(compatibleMapping);
  }

  /**
   * Get unmapped specialties by provider type
   */
  async getUnmappedSpecialtiesByProviderType(providerType: ProviderType): Promise<IUnmappedSpecialty[]> {
    const unmappedSpecialties = await this.indexedDB.getUnmappedSpecialties();
    return unmappedSpecialties.filter(specialty => (specialty as any).providerType === providerType);
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
    // Note: updateSpecialtyMapping doesn't exist in IndexedDBService
    // This would need to be implemented or use delete + create pattern
    console.warn('updateSpecialtyMapping not implemented in IndexedDBService');
    return mapping;
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
    // Note: updateColumnMapping doesn't exist in IndexedDBService
    // This would need to be implemented or use delete + create pattern
    console.warn('updateColumnMapping not implemented in IndexedDBService');
    return mapping;
  }

  /**
   * Legacy method for backward compatibility
   */
  async uploadSurvey(file: File, surveyName: string, surveySource: string) {
    // Note: uploadSurvey signature expects surveyYear as number, surveyType as string, and providerType as string
    const currentYear = new Date().getFullYear();
    return await this.indexedDB.uploadSurvey(file, surveyName, currentYear, 'compensation', 'PHYSICIAN');
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
    // Note: deleteAllMappings doesn't exist in IndexedDBService
    // Use clearAllSpecialtyMappings instead
    return await this.indexedDB.clearAllSpecialtyMappings();
  }

  /**
   * Legacy method for backward compatibility
   */
  async deleteAllColumnMappings() {
    // Note: deleteAllColumnMappings doesn't exist in IndexedDBService
    // Use clearAllColumnMappings instead
    return await this.indexedDB.clearAllColumnMappings();
  }
}

// Export singleton instance
export const getEnhancedDataService = (): EnhancedDataService => {
  return new EnhancedDataService();
};

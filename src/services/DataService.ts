import { IndexedDBService } from './IndexedDBService';
import BackendService from './BackendService';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/specialty';
import { IColumnMapping } from '../types/column';

export enum StorageMode {
  INDEXED_DB = 'indexeddb',
  BACKEND = 'backend',
  HYBRID = 'hybrid'
}

/**
 * Unified Data Service that can work with IndexedDB or Backend API
 * Easy to switch between storage modes and migrate later
 */
export class DataService {
  private indexedDB: IndexedDBService;
  private backend: BackendService;
  private mode: StorageMode;

  constructor(mode: StorageMode = StorageMode.INDEXED_DB) {
    this.indexedDB = new IndexedDBService();
    this.backend = BackendService.getInstance();
    this.mode = mode;
  }

  setMode(mode: StorageMode) {
    this.mode = mode;
  }

  getMode(): StorageMode {
    return this.mode;
  }

  // Survey Methods
  async getAllSurveys() {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.getAllSurveys();
      case StorageMode.BACKEND:
        return await this.backend.getAllSurveys();
      case StorageMode.HYBRID:
        try {
          return await this.backend.getAllSurveys();
        } catch {
          return await this.indexedDB.getAllSurveys();
        }
      default:
        return await this.indexedDB.getAllSurveys();
    }
  }

  async createSurvey(survey: any) {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.createSurvey(survey);
      case StorageMode.BACKEND:
        return await this.backend.createSurvey(survey);
      case StorageMode.HYBRID:
        try {
          const result = await this.backend.createSurvey(survey);
          // Also save to IndexedDB as backup
          await this.indexedDB.createSurvey(survey);
          return result;
        } catch {
          return await this.indexedDB.createSurvey(survey);
        }
      default:
        return await this.indexedDB.createSurvey(survey);
    }
  }

  async deleteSurvey(id: string) {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.deleteSurvey(id);
      case StorageMode.BACKEND:
        return await this.backend.deleteSurvey(id);
      case StorageMode.HYBRID:
        try {
          await this.backend.deleteSurvey(id);
        } catch {
          // Continue with IndexedDB deletion
        }
        return await this.indexedDB.deleteSurvey(id);
      default:
        return await this.indexedDB.deleteSurvey(id);
    }
  }

  async deleteAllSurveys() {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.deleteAllSurveys();
      case StorageMode.BACKEND:
        return await this.backend.deleteAllSurveys();
      case StorageMode.HYBRID:
        try {
          await this.backend.deleteAllSurveys();
        } catch {
          // Continue with IndexedDB deletion
        }
        return await this.indexedDB.deleteAllSurveys();
      default:
        return await this.indexedDB.deleteAllSurveys();
    }
  }

  // Survey Data Methods
  async getSurveyData(surveyId: string, filters: any = {}, pagination: any = {}) {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.getSurveyData(surveyId, filters, pagination);
      case StorageMode.BACKEND:
        return await this.backend.getSurveyData(surveyId, filters, pagination);
      case StorageMode.HYBRID:
        try {
          return await this.backend.getSurveyData(surveyId, filters, pagination);
        } catch {
          return await this.indexedDB.getSurveyData(surveyId, filters, pagination);
        }
      default:
        return await this.indexedDB.getSurveyData(surveyId, filters, pagination);
    }
  }

  async saveSurveyData(surveyId: string, rows: any[]) {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.saveSurveyData(surveyId, rows);
      case StorageMode.BACKEND:
        return await this.backend.saveSurveyData(surveyId, rows);
      case StorageMode.HYBRID:
        try {
          await this.backend.saveSurveyData(surveyId, rows);
        } catch {
          // Continue with IndexedDB save
        }
        return await this.indexedDB.saveSurveyData(surveyId, rows);
      default:
        return await this.indexedDB.saveSurveyData(surveyId, rows);
    }
  }

  // Specialty Mapping Methods
  async getAllSpecialtyMappings(): Promise<ISpecialtyMapping[]> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.getAllSpecialtyMappings();
      case StorageMode.BACKEND:
        return await this.backend.getAllSpecialtyMappings();
      case StorageMode.HYBRID:
        try {
          return await this.backend.getAllSpecialtyMappings();
        } catch {
          return await this.indexedDB.getAllSpecialtyMappings();
        }
      default:
        return await this.indexedDB.getAllSpecialtyMappings();
    }
  }

  async createSpecialtyMapping(mapping: ISpecialtyMapping): Promise<ISpecialtyMapping> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.createSpecialtyMapping(mapping);
      case StorageMode.BACKEND:
        return await this.backend.createSpecialtyMapping(mapping);
      case StorageMode.HYBRID:
        try {
          const result = await this.backend.createSpecialtyMapping(mapping);
          // Also save to IndexedDB as backup
          await this.indexedDB.createSpecialtyMapping(mapping);
          return result;
        } catch {
          return await this.indexedDB.createSpecialtyMapping(mapping);
        }
      default:
        return await this.indexedDB.createSpecialtyMapping(mapping);
    }
  }

  async deleteSpecialtyMapping(id: string): Promise<void> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.deleteSpecialtyMapping(id);
      case StorageMode.BACKEND:
        return await this.backend.deleteSpecialtyMapping(id);
      case StorageMode.HYBRID:
        try {
          await this.backend.deleteSpecialtyMapping(id);
        } catch {
          // Continue with IndexedDB deletion
        }
        return await this.indexedDB.deleteSpecialtyMapping(id);
      default:
        return await this.indexedDB.deleteSpecialtyMapping(id);
    }
  }

  async clearAllSpecialtyMappings(): Promise<void> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.clearAllSpecialtyMappings();
      case StorageMode.BACKEND:
        return await this.backend.clearAllSpecialtyMappings();
      case StorageMode.HYBRID:
        try {
          await this.backend.clearAllSpecialtyMappings();
        } catch {
          // Continue with IndexedDB clearing
        }
        return await this.indexedDB.clearAllSpecialtyMappings();
      default:
        return await this.indexedDB.clearAllSpecialtyMappings();
    }
  }

  // Column Mapping Methods
  async getAllColumnMappings(): Promise<IColumnMapping[]> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.getAllColumnMappings();
      case StorageMode.BACKEND:
        return await this.backend.getAllColumnMappings();
      case StorageMode.HYBRID:
        try {
          return await this.backend.getAllColumnMappings();
        } catch {
          return await this.indexedDB.getAllColumnMappings();
        }
      default:
        return await this.indexedDB.getAllColumnMappings();
    }
  }

  async createColumnMapping(mapping: IColumnMapping): Promise<IColumnMapping> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.createColumnMapping(mapping);
      case StorageMode.BACKEND:
        return await this.backend.createColumnMapping(mapping);
      case StorageMode.HYBRID:
        try {
          const result = await this.backend.createColumnMapping(mapping);
          // Also save to IndexedDB as backup
          await this.indexedDB.createColumnMapping(mapping);
          return result;
        } catch {
          return await this.indexedDB.createColumnMapping(mapping);
        }
      default:
        return await this.indexedDB.createColumnMapping(mapping);
    }
  }

  async deleteColumnMapping(id: string): Promise<void> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.deleteColumnMapping(id);
      case StorageMode.BACKEND:
        return await this.backend.deleteColumnMapping(id);
      case StorageMode.HYBRID:
        try {
          await this.backend.deleteColumnMapping(id);
        } catch {
          // Continue with IndexedDB deletion
        }
        return await this.indexedDB.deleteColumnMapping(id);
      default:
        return await this.indexedDB.deleteColumnMapping(id);
    }
  }

  async clearAllColumnMappings(): Promise<void> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.clearAllColumnMappings();
      case StorageMode.BACKEND:
        return await this.backend.clearAllColumnMappings();
      case StorageMode.HYBRID:
        try {
          await this.backend.clearAllColumnMappings();
        } catch {
          // Continue with IndexedDB clearing
        }
        return await this.indexedDB.clearAllColumnMappings();
      default:
        return await this.indexedDB.clearAllColumnMappings();
    }
  }

  async getUnmappedColumns(): Promise<any[]> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.getUnmappedColumns();
      case StorageMode.BACKEND:
        return await this.backend.getUnmappedColumns();
      case StorageMode.HYBRID:
        try {
          return await this.backend.getUnmappedColumns();
        } catch {
          return await this.indexedDB.getUnmappedColumns();
        }
      default:
        return await this.indexedDB.getUnmappedColumns();
    }
  }

  async autoMapColumns(config: any): Promise<Array<{
    standardizedName: string;
    columns: any[];
    confidence: number;
  }>> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.autoMapColumns(config);
      case StorageMode.BACKEND:
        return await this.backend.autoMapColumns(config);
      case StorageMode.HYBRID:
        try {
          return await this.backend.autoMapColumns(config);
        } catch {
          return await this.indexedDB.autoMapColumns(config);
        }
      default:
        return await this.indexedDB.autoMapColumns(config);
    }
  }

  // Utility Methods
  async getUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.getUnmappedSpecialties();
      case StorageMode.BACKEND:
        return await this.backend.getUnmappedSpecialties();
      case StorageMode.HYBRID:
        try {
          return await this.backend.getUnmappedSpecialties();
        } catch {
          return await this.indexedDB.getUnmappedSpecialties();
        }
      default:
        return await this.indexedDB.getUnmappedSpecialties();
    }
  }

  async getLearnedMappings(): Promise<Record<string, string>> {
    // Learned mappings are stored in localStorage, so we need to access them directly
    // For now, return empty object since we're not implementing learned mappings in IndexedDB yet
    return {};
  }

  async healthCheck() {
    switch (this.mode) {
      case StorageMode.INDEXED_DB:
        return await this.indexedDB.healthCheck();
      case StorageMode.BACKEND:
        return await this.backend.healthCheck();
      case StorageMode.HYBRID:
        try {
          return await this.backend.healthCheck();
        } catch {
          return await this.indexedDB.healthCheck();
        }
      default:
        return await this.indexedDB.healthCheck();
    }
  }

  // Migration Methods
  async migrateToBackend() {
    console.log('🔄 Migrating data from IndexedDB to Backend...');
    
    // Migrate surveys
    const surveys = await this.indexedDB.getAllSurveys();
    for (const survey of surveys) {
      try {
        await this.backend.createSurvey(survey);
        const { rows } = await this.indexedDB.getSurveyData(survey.id);
        await this.backend.saveSurveyData(survey.id, rows);
      } catch (error) {
        console.error(`Failed to migrate survey ${survey.id}:`, error);
      }
    }

    // Migrate specialty mappings
    const mappings = await this.indexedDB.getAllSpecialtyMappings();
    for (const mapping of mappings) {
      try {
        await this.backend.createSpecialtyMapping(mapping);
      } catch (error) {
        console.error(`Failed to migrate mapping ${mapping.id}:`, error);
      }
    }

    // Migrate column mappings
    const columnMappings = await this.indexedDB.getAllColumnMappings();
    for (const mapping of columnMappings) {
      try {
        await this.backend.createColumnMapping(mapping);
      } catch (error) {
        console.error(`Failed to migrate column mapping ${mapping.id}:`, error);
      }
    }

    console.log('✅ Migration completed');
  }

  async migrateToIndexedDB() {
    console.log('🔄 Migrating data from Backend to IndexedDB...');
    
    // Migrate surveys
    const surveys = await this.backend.getAllSurveys();
    for (const survey of surveys) {
      try {
        // BackendService returns objects with name, year, type, etc.
        // but ISurveyData interface doesn't have these properties
        // So we need to cast to any to access the actual properties
        const surveyAny = survey as any;
        const surveyData: any = {
          id: surveyAny.id,
          name: surveyAny.name,
          year: surveyAny.year,
          type: surveyAny.type,
          uploadDate: surveyAny.uploadDate,
          rowCount: surveyAny.rowCount,
          specialtyCount: surveyAny.specialtyCount,
          dataPoints: surveyAny.dataPoints,
          colorAccent: surveyAny.colorAccent,
          metadata: surveyAny.metadata
        };
        await this.indexedDB.createSurvey(surveyData);
        const { rows } = await this.backend.getSurveyData(survey.id);
        await this.indexedDB.saveSurveyData(survey.id, rows);
      } catch (error) {
        console.error(`Failed to migrate survey ${survey.id}:`, error);
      }
    }

    // Migrate specialty mappings
    const mappings = await this.backend.getAllSpecialtyMappings();
    for (const mapping of mappings) {
      try {
        await this.indexedDB.createSpecialtyMapping(mapping);
      } catch (error) {
        console.error(`Failed to migrate mapping ${mapping.id}:`, error);
      }
    }

    // Migrate column mappings
    const columnMappings = await this.backend.getAllColumnMappings();
    for (const mapping of columnMappings) {
      try {
        await this.indexedDB.createColumnMapping(mapping);
      } catch (error) {
        console.error(`Failed to migrate column mapping ${mapping.id}:`, error);
      }
    }

    console.log('✅ Migration completed');
  }
}

// Singleton instance
let dataServiceInstance: DataService | null = null;

export const getDataService = (mode: StorageMode = StorageMode.INDEXED_DB): DataService => {
  if (!dataServiceInstance) {
    dataServiceInstance = new DataService(mode);
  }
  return dataServiceInstance;
};

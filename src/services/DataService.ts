import { IndexedDBService } from './IndexedDBService';
import { FirestoreService } from './FirestoreService';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/specialty';
import { IColumnMapping } from '../types/column';
import { isFirebaseAvailable } from '../config/firebase';
import { AtomicOperations } from '../shared/services/AtomicOperations';

export enum StorageMode {
  INDEXED_DB = 'indexeddb',
  FIREBASE = 'firebase'
}

/**
 * Data Service that supports both IndexedDB and Firebase Firestore
 * Automatically selects storage mode based on Firebase availability and configuration
 */
export class DataService {
  private indexedDB: IndexedDBService;
  private firestore: FirestoreService | null = null;
  private mode: StorageMode;
  private atomicOps: AtomicOperations = AtomicOperations.getInstance();

  constructor(mode?: StorageMode) {
    // Auto-detect mode if not specified
    if (!mode) {
      mode = this.detectStorageMode();
    }

    this.mode = mode;
    this.indexedDB = new IndexedDBService();

    // Initialize Firestore if Firebase mode is selected
    if (mode === StorageMode.FIREBASE) {
      if (!isFirebaseAvailable()) {
        console.warn('⚠️ Firebase mode requested but Firebase not available. Falling back to IndexedDB.');
        this.mode = StorageMode.INDEXED_DB;
      } else {
        try {
          this.firestore = new FirestoreService();
        } catch (error) {
          console.error('❌ Failed to initialize Firestore:', error);
          console.warn('⚠️ Falling back to IndexedDB.');
          this.mode = StorageMode.INDEXED_DB;
        }
      }
    }
  }

  /**
   * Auto-detect storage mode based on environment and Firebase availability
   * Prefers Firebase when available for better performance and cloud storage
   */
  private detectStorageMode(): StorageMode {
    // Check environment variable first (allows explicit override)
    const envMode = process.env.REACT_APP_STORAGE_MODE as StorageMode;
    if (envMode === StorageMode.FIREBASE || envMode === StorageMode.INDEXED_DB) {
      console.log(`📦 Storage mode set via environment: ${envMode}`);
      return envMode;
    }

    // Prefer Firebase when available for cloud storage and better performance
    if (isFirebaseAvailable()) {
      console.log('☁️ Firebase available - using cloud storage for better performance');
      return StorageMode.FIREBASE;
    }

    // Fallback to IndexedDB if Firebase not available
    console.log('💾 Firebase not available - using IndexedDB (local storage)');
    return StorageMode.INDEXED_DB;
  }

  /**
   * Get the current storage service
   */
  private getStorageService(): IndexedDBService | FirestoreService {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return this.firestore;
    }
    return this.indexedDB;
  }

  setMode(mode: StorageMode) {
    if (mode === StorageMode.FIREBASE && !isFirebaseAvailable()) {
      console.warn('⚠️ Cannot switch to Firebase mode - Firebase not available');
      return;
    }

    this.mode = mode;
    
    // Initialize Firestore if switching to Firebase mode
    if (mode === StorageMode.FIREBASE && !this.firestore) {
      try {
        this.firestore = new FirestoreService();
      } catch (error) {
        console.error('❌ Failed to initialize Firestore:', error);
        this.mode = StorageMode.INDEXED_DB;
      }
    }
  }

  getMode(): StorageMode {
    return this.mode;
  }

  // Survey Methods
  async getAllSurveys() {
    const service = this.getStorageService();
    const storageType = this.mode === StorageMode.FIREBASE ? 'Firestore' : 'IndexedDB';
    const storageLocation = this.mode === StorageMode.FIREBASE 
      ? '📍 Firebase Firestore (Cloud)' 
      : '📍 IndexedDB (Browser)';
    console.log(`📥 DataService: Getting all surveys from ${storageType}...`);
    console.log(`💾 Storage Location: ${storageLocation}`);
    const surveys = await service.getAllSurveys();
    console.log(`📊 DataService: Retrieved surveys from ${storageType}:`, {
      surveyCount: surveys.length,
      surveys: surveys.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        year: s.year,
        rowCount: s.rowCount,
        specialtyCount: s.specialtyCount
      }))
    });
    return surveys;
  }

  async createSurvey(survey: any) {
    return await this.getStorageService().createSurvey(survey);
  }

  async getSurveyById(surveyId: string) {
    return await this.getStorageService().getSurveyById(surveyId);
  }

  async deleteSurvey(id: string) {
    return await this.getStorageService().deleteSurvey(id);
  }

  async deleteWithVerification(surveyId: string) {
    return await this.getStorageService().deleteWithVerification(surveyId);
  }

  // Cache Methods for Analytics
  async saveToCache(key: string, data: any): Promise<void> {
    return await this.getStorageService().saveToCache(key, data);
  }

  async getFromCache(key: string): Promise<any> {
    return await this.getStorageService().getFromCache(key);
  }

  async clearCache(key?: string): Promise<void> {
    return await this.getStorageService().clearCache(key);
  }

  async cascadeDelete(surveyId: string) {
    return await this.getStorageService().cascadeDelete(surveyId);
  }

  async deleteAllSurveys() {
    return await this.getStorageService().deleteAllSurveys();
  }

  async forceClearDatabase() {
    return await this.getStorageService().forceClearDatabase();
  }

  async uploadSurvey(
    file: File,
    surveyName: string,
    surveyYear: number,
    surveyType: string,
    providerType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ surveyId: string; rowCount: number }> {
    return await this.getStorageService().uploadSurvey(file, surveyName, surveyYear, surveyType, providerType, onProgress);
  }

  // Survey Data Methods
  async getSurveyData(surveyId: string, filters: any = {}, pagination: any = {}) {
    return await this.getStorageService().getSurveyData(surveyId, filters, pagination);
  }

  async saveSurveyData(surveyId: string, rows: any[], onProgress?: (percent: number) => void) {
    return await this.getStorageService().saveSurveyData(surveyId, rows, onProgress);
  }



  // Specialty Mapping Methods
  async getAllSpecialtyMappings(providerType?: string): Promise<ISpecialtyMapping[]> {
    return await this.getStorageService().getAllSpecialtyMappings(providerType);
  }

  async createSpecialtyMapping(mapping: ISpecialtyMapping): Promise<ISpecialtyMapping> {
    return await this.getStorageService().createSpecialtyMapping(mapping);
  }

  async deleteSpecialtyMapping(id: string): Promise<void> {
    return await this.getStorageService().deleteSpecialtyMapping(id);
  }

  async clearAllSpecialtyMappings(): Promise<void> {
    return await this.getStorageService().clearAllSpecialtyMappings();
  }

  async updateSpecialtyMapping(id: string, updates: Partial<ISpecialtyMapping>): Promise<ISpecialtyMapping> {
    // For Firestore, use the update method
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).updateSpecialtyMapping(id, updates);
    }
    
    // For IndexedDB, use atomic operation to ensure consistency
    // This is a multi-step operation: read -> delete -> create
    let currentMapping: ISpecialtyMapping | null = null;
    
    const result = await this.atomicOps.executeAtomic<ISpecialtyMapping>(
      [
        {
          name: 'read-current-mapping',
          execute: async () => {
            const mappings = await this.getAllSpecialtyMappings();
            const mapping = mappings.find(m => m.id === id);
            if (!mapping) {
              throw new Error(`Specialty mapping with id ${id} not found`);
            }
            currentMapping = mapping;
            return mapping;
          }
        },
        {
          name: 'delete-old-mapping',
          execute: async () => {
            if (!currentMapping) {
              throw new Error('Current mapping not found');
            }
            await this.deleteSpecialtyMapping(id);
            return currentMapping;
          },
          rollback: async () => {
            // Rollback: recreate the old mapping if delete succeeded but create fails
            if (currentMapping) {
              await this.createSpecialtyMapping(currentMapping);
            }
          }
        },
        {
          name: 'create-updated-mapping',
          execute: async () => {
            if (!currentMapping) {
              throw new Error('Current mapping not found');
            }
            const updatedMapping = { ...currentMapping, ...updates, updatedAt: new Date() };
            return await this.createSpecialtyMapping(updatedMapping);
          },
          verify: async (updatedMapping: ISpecialtyMapping) => {
            // Verify the mapping was created successfully
            const mappings = await this.getAllSpecialtyMappings();
            return mappings.some(m => m.id === updatedMapping.id);
          }
        }
      ],
      `updateSpecialtyMapping-${id}`
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to update specialty mapping');
    }

    return result.data;
  }

  // Column Mapping Methods
  async getAllColumnMappings(providerType?: string): Promise<IColumnMapping[]> {
    return await this.getStorageService().getAllColumnMappings(providerType);
  }

  async createColumnMapping(mapping: IColumnMapping): Promise<IColumnMapping> {
    return await this.getStorageService().createColumnMapping(mapping);
  }

  async deleteColumnMapping(id: string): Promise<void> {
    return await this.getStorageService().deleteColumnMapping(id);
  }

  async clearAllColumnMappings(): Promise<void> {
    return await this.getStorageService().clearAllColumnMappings();
  }

  async getUnmappedColumns(providerType?: string): Promise<any[]> {
    return await this.getStorageService().getUnmappedColumns(providerType);
  }

  async getUnmappedSpecialties(providerType?: string): Promise<IUnmappedSpecialty[]> {
    const service = this.getStorageService();
    const storageType = this.mode === StorageMode.FIREBASE ? 'Firestore' : 'IndexedDB';
    console.log(`🔍 DataService.getUnmappedSpecialties: Called with providerType=${providerType}, using ${storageType}`);
    try {
      const result = await service.getUnmappedSpecialties(providerType);
      console.log(`✅ DataService.getUnmappedSpecialties: Returned ${result.length} unmapped specialties`);
      return result;
    } catch (error) {
      console.error(`❌ DataService.getUnmappedSpecialties: Error:`, error);
      throw error;
    }
  }

  async getLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Record<string, string>> {
    return await this.getStorageService().getLearnedMappings(type, providerType);
  }

  async saveLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string, corrected: string, providerType?: string, surveySource?: string): Promise<void> {
    return await this.getStorageService().saveLearnedMapping(type, original, corrected, providerType, surveySource);
  }

  async removeLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string): Promise<void> {
    return await this.getStorageService().removeLearnedMapping(type, original);
  }

  async clearLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<void> {
    return await this.getStorageService().clearLearnedMappings(type);
  }

  async getLearnedMappingsWithSource(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Array<{original: string, corrected: string, surveySource: string}>> {
    return await this.getStorageService().getLearnedMappingsWithSource(type, providerType);
  }

  async healthCheck() {
    return await this.getStorageService().healthCheck();
  }

  // Variable Mapping Methods
  async getVariableMappings(providerType?: string) {
    return await this.getStorageService().getVariableMappings(providerType);
  }

  async getUnmappedVariables(providerType?: string) {
    return await this.getStorageService().getUnmappedVariables(providerType);
  }

  async createVariableMapping(mapping: any) {
    return await this.getStorageService().createVariableMapping(mapping);
  }

  async updateVariableMapping(id: string, mapping: any) {
    return await this.getStorageService().updateVariableMapping(id, mapping);
  }

  async deleteVariableMapping(id: string) {
    return await this.getStorageService().deleteVariableMapping(id);
  }

  async clearAllVariableMappings() {
    return await this.getStorageService().clearAllVariableMappings();
  }

  // Provider Type Mapping Methods
  async getProviderTypeMappings(providerType?: string) {
    return await this.getStorageService().getProviderTypeMappings(providerType);
  }

  async getUnmappedProviderTypes(providerType?: string) {
    return await this.getStorageService().getUnmappedProviderTypes(providerType);
  }

  async createProviderTypeMapping(mapping: any) {
    return await this.getStorageService().createProviderTypeMapping(mapping);
  }

  async updateProviderTypeMapping(id: string, mapping: any) {
    return await this.getStorageService().updateProviderTypeMapping(id, mapping);
  }

  async deleteProviderTypeMapping(id: string) {
    return await this.getStorageService().deleteProviderTypeMapping(id);
  }

  async clearAllProviderTypeMappings() {
    return await this.getStorageService().clearAllProviderTypeMappings();
  }

  // Region Mapping Methods
  async getRegionMappings(providerType?: string) {
    return await this.getStorageService().getRegionMappings(providerType);
  }

  async getUnmappedRegions(providerType?: string) {
    return await this.getStorageService().getUnmappedRegions(providerType);
  }

  async createRegionMapping(mapping: any) {
    return await this.getStorageService().createRegionMapping(mapping);
  }

  async updateRegionMapping(id: string, mapping: any) {
    return await this.getStorageService().updateRegionMapping(id, mapping);
  }

  async deleteRegionMapping(id: string) {
    return await this.getStorageService().deleteRegionMapping(id);
  }

  async clearAllRegionMappings() {
    return await this.getStorageService().clearAllRegionMappings();
  }

  // Blend Template Methods
  async getAllBlendTemplates(): Promise<any[]> {
    const service = this.getStorageService();
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getAllBlendTemplates();
    }
    return await (this.indexedDB as any).getAllBlendTemplates();
  }

  async saveBlendTemplate(template: any): Promise<void> {
    const service = this.getStorageService();
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).saveBlendTemplate(template);
    }
    return await (this.indexedDB as any).saveBlendTemplate(template);
  }

  async deleteBlendTemplate(id: string): Promise<void> {
    const service = this.getStorageService();
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).deleteBlendTemplate(id);
    }
    return await (this.indexedDB as any).deleteBlendTemplate(id);
  }

  // Custom Reports Methods
  async getAllCustomReports(): Promise<any[]> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getAllCustomReports();
    }
    // For IndexedDB, return empty array (reports stored in localStorage currently)
    return [];
  }

  async saveCustomReport(report: any): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).saveCustomReport(report);
    }
    // For IndexedDB, this will be handled by migration service
    throw new Error('Custom reports require Firebase mode. Please enable Firebase storage.');
  }

  async deleteCustomReport(id: string): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).deleteCustomReport(id);
    }
    throw new Error('Custom reports require Firebase mode. Please enable Firebase storage.');
  }

  // User Preferences Methods
  async getUserPreferences(): Promise<Record<string, any>> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getUserPreferences();
    }
    // For IndexedDB, return empty object (preferences stored in localStorage currently)
    return {};
  }

  async getUserPreference(key: string): Promise<any> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getUserPreference(key);
    }
    // For IndexedDB, try localStorage as fallback
    try {
      const value = localStorage.getItem(`preference_${key}`);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async saveUserPreferences(preferences: Record<string, any>): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).saveUserPreferences(preferences);
    }
    // For IndexedDB, save to localStorage as fallback
    Object.entries(preferences).forEach(([key, value]) => {
      localStorage.setItem(`preference_${key}`, JSON.stringify(value));
    });
  }

  async saveUserPreference(key: string, value: any): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).saveUserPreference(key, value);
    }
    // For IndexedDB, save to localStorage as fallback
    localStorage.setItem(`preference_${key}`, JSON.stringify(value));
  }

  async updateUserPreferences(updates: Record<string, any>): Promise<void> {
    return await this.saveUserPreferences(updates);
  }

  async deleteUserPreference(key: string): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).deleteUserPreference(key);
    }
    // For IndexedDB, remove from localStorage
    localStorage.removeItem(`preference_${key}`);
  }

  // Audit Logging Methods
  async logAuditEvent(action: string, resourceType: string, resourceId: string, details?: any): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).logAuditEvent(action, resourceType, resourceId, details);
    }
    // For IndexedDB, just log to console (audit logs are Firebase-only feature)
    console.log('📝 Audit Event:', { action, resourceType, resourceId, details });
  }

  async getAuditLogs(limit: number = 100): Promise<any[]> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getAuditLogs(limit);
    }
    // For IndexedDB, return empty array (audit logs are Firebase-only feature)
    return [];
  }

  async getAuditLogsByAction(action: string, limit: number = 100): Promise<any[]> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getAuditLogsByAction(action, limit);
    }
    // For IndexedDB, return empty array (audit logs are Firebase-only feature)
    return [];
  }

  async getAuditLogsByResource(resourceType: string, resourceId: string, limit: number = 100): Promise<any[]> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getAuditLogsByResource(resourceType, resourceId, limit);
    }
    // For IndexedDB, return empty array (audit logs are Firebase-only feature)
    return [];
  }
}

// Singleton instance
let dataServiceInstance: DataService | null = null;

export const getDataService = (mode?: StorageMode): DataService => {
  // If mode is specified and different from current, create new instance
  if (dataServiceInstance && mode && dataServiceInstance.getMode() !== mode) {
    dataServiceInstance = new DataService(mode);
  } else if (!dataServiceInstance) {
    // Auto-detect mode if not specified
    dataServiceInstance = new DataService(mode);
  }
  return dataServiceInstance;
};

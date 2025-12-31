import { IndexedDBService } from './IndexedDBService';
import { FirestoreService } from './FirestoreService';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/specialty';
import { IColumnMapping } from '../types/column';
import { isFirebaseAvailable } from '../config/firebase';
import { getCurrentStorageMode } from '../config/storage';
import { AtomicOperations } from '../shared/services/AtomicOperations';
import { logger } from '../shared/utils/logger';

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

  /**
   * Detects Firebase errors that should trigger a safe fallback to IndexedDB.
   * We prefer a fast, working local app over long retry loops when Firebase is unavailable.
   */
  private isFirestoreUnavailableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code || '';
    const lower = message.toLowerCase();
    
    // Authentication errors
    if (
      lower.includes('firestore not initialized') ||
      lower.includes('firestore database not initialized') ||
      lower.includes('user not authenticated') ||
      lower.includes('not authenticated') ||
      code === 'unauthenticated' ||
      code === 'permission-denied'
    ) {
      return true;
    }
    
    // Network/connectivity errors
    if (
      lower.includes('network') ||
      lower.includes('failed to fetch') ||
      lower.includes('network request failed') ||
      code === 'unavailable' ||
      code === 'deadline-exceeded'
    ) {
      return true;
    }
    
    // Quota/rate limit errors (fallback to IndexedDB to avoid blocking)
    if (
      lower.includes('quota') ||
      lower.includes('rate limit') ||
      code === 'resource-exhausted'
    ) {
      return true;
    }
    
    return false;
  }

  private switchToIndexedDbForSession(reason: string, error?: unknown) {
    if (this.mode !== StorageMode.INDEXED_DB) {
      logger.warn(`⚠️ DataService: Falling back to IndexedDB for this session`);
      logger.warn(`   Reason: ${reason}`);
      if (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(`   Error: ${errorMsg}`);
      }
      this.mode = StorageMode.INDEXED_DB;
    }
  }

  /**
   * Execute an operation in the active storage mode, with automatic fallback to IndexedDB.
   * 
   * Hybrid Storage Behavior:
   * - If mode is INDEXED_DB, use IndexedDB directly
   * - If mode is FIREBASE, try Firebase first
   * - On Firebase errors (auth, network, quota), automatically fallback to IndexedDB
   * - This ensures the app always works, even if Firebase is unavailable
   * 
   * @param operation - Name of the operation (for logging)
   * @param firestoreFn - Function to execute if using Firebase
   * @param indexedDbFn - Function to execute if using IndexedDB or as fallback
   * @returns Result from the successful operation
   */
  private async runWithFirestoreFallback<T>(
    operation: string,
    firestoreFn: () => Promise<T>,
    indexedDbFn: () => Promise<T>
  ): Promise<T> {
    // If not using Firebase, use IndexedDB directly
    if (this.mode !== StorageMode.FIREBASE) {
      logger.log(`💾 DataService: ${operation} → IndexedDB (primary mode)`);
      return await indexedDbFn();
    }

    // Firebase mode: Check if Firestore is available
    if (!this.firestore) {
      logger.warn(`⚠️ DataService: ${operation} → Firestore not initialized, using IndexedDB`);
      this.switchToIndexedDbForSession(`${operation}: Firestore service not initialized`);
      return await indexedDbFn();
    }

    // Try Firebase first
    try {
      logger.log(`☁️ DataService: ${operation} → Firebase Firestore`);
      const result = await firestoreFn();
      logger.log(`✅ DataService: ${operation} → Firebase Firestore (success)`);
      return result;
    } catch (error) {
      // Check if this is a recoverable error that should trigger fallback
      if (this.isFirestoreUnavailableError(error)) {
        logger.warn(`⚠️ DataService: ${operation} → Firebase error detected, falling back to IndexedDB`);
        this.switchToIndexedDbForSession(`${operation}: Firebase unavailable`, error);
        
        // Fallback to IndexedDB
        try {
          logger.log(`💾 DataService: ${operation} → IndexedDB (fallback)`);
          const result = await indexedDbFn();
          logger.log(`✅ DataService: ${operation} → IndexedDB (fallback success)`);
          return result;
        } catch (fallbackError) {
          logger.error(`❌ DataService: ${operation} → Both Firebase and IndexedDB failed`);
          throw fallbackError;
        }
      }
      
      // Non-recoverable error or unexpected error - rethrow
      logger.error(`❌ DataService: ${operation} → Firebase error (not recoverable):`, error);
      throw error;
    }
  }

  constructor(mode?: StorageMode) {
    // Auto-detect mode if not specified using hybrid detection
    if (!mode) {
      mode = getCurrentStorageMode();
    }

    this.mode = mode;

    // HYBRID MODE: Always initialize IndexedDB for fallback support
    // This ensures seamless fallback if Firebase fails or is unavailable
    logger.log('🔧 DataService: Initializing IndexedDB (always available for fallback)');
    this.indexedDB = new IndexedDBService();

    // Initialize Firestore if Firebase mode is selected
    if (mode === StorageMode.FIREBASE) {
      if (!isFirebaseAvailable()) {
        logger.warn('⚠️ Firebase mode requested but Firebase not available. Using IndexedDB.');
        this.mode = StorageMode.INDEXED_DB;
      } else {
        try {
          logger.log('🔧 DataService: Initializing Firebase Firestore (primary storage)');
          this.firestore = new FirestoreService();
          logger.log('✅ DataService: Firebase Firestore initialized successfully');
        } catch (error) {
          logger.error('❌ Failed to initialize Firestore:', error);
          logger.warn('⚠️ Falling back to IndexedDB for this session.');
          this.mode = StorageMode.INDEXED_DB;
        }
      }
    } else {
      logger.log('✅ DataService: Using IndexedDB as primary storage');
    }
  }

  /**
   * Get storage mode using hybrid detection
   * 
   * This method is deprecated - use getCurrentStorageMode() from config/storage.ts instead.
   * Kept for backward compatibility but delegates to the centralized detection logic.
   */
  private detectStorageMode(): StorageMode {
    return getCurrentStorageMode();
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
      logger.warn('⚠️ Cannot switch to Firebase mode - Firebase not available');
      return;
    }

    this.mode = mode;
    
    // Initialize Firestore if switching to Firebase mode
    if (mode === StorageMode.FIREBASE && !this.firestore) {
      try {
        this.firestore = new FirestoreService();
      } catch (error) {
        logger.error('❌ Failed to initialize Firestore:', error);
        this.mode = StorageMode.INDEXED_DB;
      }
    }
  }

  getMode(): StorageMode {
    return this.mode;
  }

  // Survey Methods
  async getAllSurveys() {
    const storageLocation = this.mode === StorageMode.FIREBASE
      ? '📍 Firebase Firestore (Cloud)'
      : '📍 IndexedDB (Browser)';
    logger.log(`📥 DataService: Getting all surveys...`);
    logger.log(`💾 Storage Location: ${storageLocation}`);

    const surveys = await this.runWithFirestoreFallback(
      'getAllSurveys',
      async () => {
        logger.log('📥 DataService: Getting all surveys from Firestore...');
        return await this.firestore!.getAllSurveys();
      },
      async () => {
        logger.log('📥 DataService: Getting all surveys from IndexedDB...');
        return await this.indexedDB.getAllSurveys();
      }
    );

    logger.log(`📊 DataService: Retrieved surveys:`, { surveyCount: surveys.length });
    return surveys;
  }

  async createSurvey(survey: any) {
    try {
      const storageType = this.mode === StorageMode.FIREBASE ? 'Firebase Firestore (Cloud)' : 'IndexedDB (Local Browser)';
      logger.log('💾 DataService: Creating survey:', {
        id: survey.id,
        name: survey.name,
        year: survey.year,
        storageMode: this.mode,
        storageType: storageType
      });

      const result = await this.runWithFirestoreFallback(
        'createSurvey',
        async () => await this.firestore!.createSurvey(survey),
        async () => await this.indexedDB.createSurvey(survey)
      );

      logger.log(`✅ DataService: Survey created successfully in ${this.mode === StorageMode.FIREBASE ? 'Firebase' : 'IndexedDB'}`);
      return result;
    } catch (error) {
      logger.error('❌ DataService: Failed to create survey:', error);
      throw error;
    }
  }

  async getSurveyById(surveyId: string) {
    return await this.runWithFirestoreFallback(
      'getSurveyById',
      async () => await this.firestore!.getSurveyById(surveyId),
      async () => await this.indexedDB.getSurveyById(surveyId)
    );
  }

  async deleteSurvey(id: string) {
    return await this.runWithFirestoreFallback(
      'deleteSurvey',
      async () => await this.firestore!.deleteSurvey(id),
      async () => await this.indexedDB.deleteSurvey(id)
    );
  }

  async deleteWithVerification(surveyId: string) {
    return await this.runWithFirestoreFallback(
      'deleteWithVerification',
      async () => await this.firestore!.deleteWithVerification(surveyId),
      async () => await this.indexedDB.deleteWithVerification(surveyId)
    );
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

  /**
   * Batch query method for executing multiple data service queries in parallel
   * This optimizes performance by batching related queries together
   * 
   * @param queries - Array of query functions to execute in parallel
   * @returns Promise that resolves with an array of results in the same order as queries
   * 
   * @example
   * ```typescript
   * const [surveys, mappings, columnMappings] = await dataService.batchQuery([
   *   () => dataService.getAllSurveys(),
   *   () => dataService.getAllSpecialtyMappings(),
   *   () => dataService.getAllColumnMappings()
   * ]);
   * ```
   */
  async batchQuery<T extends any[]>(
    queries: Array<() => Promise<any>>
  ): Promise<T> {
    const service = this.getStorageService();
    
    // If using IndexedDB, use its optimized batch method
    if (this.mode === StorageMode.INDEXED_DB && 'batchQuery' in service) {
      return await (service as any).batchQuery(queries);
    }
    
    // Otherwise, use Promise.all for parallel execution
    logger.log(`🚀 DataService: Executing ${queries.length} queries in parallel`);
    const startTime = performance.now();
    
    try {
      const results = await Promise.all(
        queries.map(async (queryFn, index) => {
          const queryStartTime = performance.now();
          try {
            const result = await queryFn();
            const queryDuration = performance.now() - queryStartTime;
            logger.log(`✅ Query ${index + 1}/${queries.length} completed in ${queryDuration.toFixed(2)}ms`);
            return result;
          } catch (error) {
            logger.error(`❌ Query ${index + 1}/${queries.length} failed:`, error);
            throw error;
          }
        })
      );
      
      const totalDuration = performance.now() - startTime;
      logger.log(`✅ DataService: All ${queries.length} queries completed in ${totalDuration.toFixed(2)}ms`);
      
      return results as T;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      logger.error(`❌ DataService: Batch query failed after ${totalDuration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  async uploadSurvey(
    file: File,
    surveyName: string,
    surveyYear: number,
    surveyType: string,
    providerType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ surveyId: string; rowCount: number }> {
    return await this.runWithFirestoreFallback(
      'uploadSurvey',
      async () => await this.firestore!.uploadSurvey(file, surveyName, surveyYear, surveyType, providerType, onProgress),
      async () => await this.indexedDB.uploadSurvey(file, surveyName, surveyYear, surveyType, providerType, onProgress)
    );
  }

  // Survey Data Methods
  async getSurveyData(surveyId: string, filters: any = {}, pagination: any = {}) {
    return await this.runWithFirestoreFallback(
      'getSurveyData',
      async () => await this.firestore!.getSurveyData(surveyId, filters, pagination),
      async () => await this.indexedDB.getSurveyData(surveyId, filters, pagination)
    );
  }

  async saveSurveyData(surveyId: string, rows: any[], onProgress?: (percent: number) => void) {
    logger.log(`💾 DataService: Saving ${rows.length} rows...`);
    try {
      await this.runWithFirestoreFallback(
        'saveSurveyData',
        async () => await this.firestore!.saveSurveyData(surveyId, rows, onProgress),
        async () => await this.indexedDB.saveSurveyData(surveyId, rows, onProgress)
      );
      logger.log(`✅ DataService: All ${rows.length} rows saved successfully`);
    } catch (error) {
      logger.error(`❌ DataService: Failed to save survey data:`, error);
      throw error;
    }
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
    logger.log(`🔍 DataService.getUnmappedSpecialties: Called with providerType=${providerType}, using ${storageType}`);
    try {
      const result = await service.getUnmappedSpecialties(providerType);
      logger.log(`✅ DataService.getUnmappedSpecialties: Returned ${result.length} unmapped specialties`);
      return result;
    } catch (error) {
      logger.error(`❌ DataService.getUnmappedSpecialties: Error:`, error);
      throw error;
    }
  }

  async getLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Record<string, string>> {
    return await this.runWithFirestoreFallback(
      'getLearnedMappings',
      async () => await this.firestore!.getLearnedMappings(type, providerType),
      async () => await this.indexedDB.getLearnedMappings(type, providerType)
    );
  }

  async saveLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string, corrected: string, providerType?: string, surveySource?: string): Promise<void> {
    return await this.runWithFirestoreFallback(
      'saveLearnedMapping',
      async () => await this.firestore!.saveLearnedMapping(type, original, corrected, providerType, surveySource),
      async () => await this.indexedDB.saveLearnedMapping(type, original, corrected, providerType, surveySource)
    );
  }

  async removeLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string): Promise<void> {
    return await this.getStorageService().removeLearnedMapping(type, original);
  }

  async clearLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<void> {
    return await this.getStorageService().clearLearnedMappings(type);
  }

  async getLearnedMappingsWithSource(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Array<{original: string, corrected: string, surveySource: string}>> {
    return await this.runWithFirestoreFallback(
      'getLearnedMappingsWithSource',
      async () => await this.firestore!.getLearnedMappingsWithSource(type, providerType),
      async () => await this.indexedDB.getLearnedMappingsWithSource(type, providerType)
    );
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
      try {
        return await (this.firestore as any).getUserPreferences();
      } catch (error) {
        if (this.isFirestoreUnavailableError(error)) {
          this.switchToIndexedDbForSession('getUserPreferences: Firebase unavailable', error);
          // Preferences are stored in localStorage for local mode
          return {};
        }
        throw error;
      }
    }
    // Local mode: preferences stored in localStorage currently
    return {};
  }

  async getUserPreference(key: string): Promise<any> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      try {
        return await (this.firestore as any).getUserPreference(key);
      } catch (error) {
        if (this.isFirestoreUnavailableError(error)) {
          this.switchToIndexedDbForSession(`getUserPreference(${key}): Firebase unavailable`, error);
          // Fall through to localStorage
        } else {
          throw error;
        }
      }
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
      try {
        return await (this.firestore as any).saveUserPreferences(preferences);
      } catch (error) {
        if (this.isFirestoreUnavailableError(error)) {
          this.switchToIndexedDbForSession('saveUserPreferences: Firebase unavailable', error);
          // Fall through to localStorage
        } else {
          throw error;
        }
      }
    }
    // For IndexedDB, save to localStorage as fallback
    Object.entries(preferences).forEach(([key, value]) => {
      localStorage.setItem(`preference_${key}`, JSON.stringify(value));
    });
  }

  async saveUserPreference(key: string, value: any): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      try {
        return await (this.firestore as any).saveUserPreference(key, value);
      } catch (error) {
        if (this.isFirestoreUnavailableError(error)) {
          this.switchToIndexedDbForSession(`saveUserPreference(${key}): Firebase unavailable`, error);
          // Fall through to localStorage
        } else {
          throw error;
        }
      }
    }
    // For IndexedDB, save to localStorage as fallback
    localStorage.setItem(`preference_${key}`, JSON.stringify(value));
  }

  async updateUserPreferences(updates: Record<string, any>): Promise<void> {
    return await this.saveUserPreferences(updates);
  }

  async deleteUserPreference(key: string): Promise<void> {
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      try {
        return await (this.firestore as any).deleteUserPreference(key);
      } catch (error) {
        if (this.isFirestoreUnavailableError(error)) {
          this.switchToIndexedDbForSession(`deleteUserPreference(${key}): Firebase unavailable`, error);
          // Fall through to localStorage
        } else {
          throw error;
        }
      }
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
    logger.log('📝 Audit Event:', { action, resourceType, resourceId, details });
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

  // FMV Calculation Methods
  async getAllFMVCalculations(): Promise<any[]> {
    const service = this.getStorageService();
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).getAllFMVCalculations();
    }
    return await (this.indexedDB as any).getAllFMVCalculations();
  }

  async saveFMVCalculation(calculation: any): Promise<void> {
    const service = this.getStorageService();
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).saveFMVCalculation(calculation);
    }
    return await (this.indexedDB as any).saveFMVCalculation(calculation);
  }

  async deleteFMVCalculation(id: string): Promise<void> {
    const service = this.getStorageService();
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      return await (this.firestore as any).deleteFMVCalculation(id);
    }
    return await (this.indexedDB as any).deleteFMVCalculation(id);
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

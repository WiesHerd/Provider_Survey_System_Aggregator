import { IndexedDBService } from './IndexedDBService';
import { FirestoreService } from './FirestoreService';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/specialty';
import { IColumnMapping } from '../types/column';
import { isFirebaseAvailable } from '../config/firebase';
import { StorageMode, getCurrentStorageMode } from '../config/storage';
import { AtomicOperations } from '../shared/services/AtomicOperations';
import { logger } from '../shared/utils/logger';
import { clearStorage } from '../utils/clearStorage';

const isUploadDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('bp_upload_debug') === 'true';
};

// Re-export StorageMode for backward compatibility
export { StorageMode } from '../config/storage';

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
    if (this.mode !== StorageMode.FIREBASE) {
      throw new Error('Firebase storage mode is required. IndexedDB is disabled.');
    }

    if (!this.firestore) {
      throw new Error('Firestore is not initialized. Please verify Firebase configuration.');
    }

    // Try Firebase first
    try {
      logger.log(`☁️ DataService: ${operation} → Firebase Firestore`);
      const result = await firestoreFn();
      logger.log(`✅ DataService: ${operation} → Firebase Firestore (success)`);
      return result;
    } catch (error) {
      if (this.isFirestoreUnavailableError(error)) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`❌ DataService: ${operation} → Firebase unavailable: ${errorMsg}`);
        throw new Error('Firebase is required but is unavailable. Please sign in and try again.');
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

    // Initialize IndexedDB (required for legacy utilities, not for primary storage)
    logger.log('🔧 DataService: Initializing IndexedDB (legacy support only)');
    this.indexedDB = new IndexedDBService();

    // Initialize Firestore if Firebase mode is selected
    if (mode === StorageMode.FIREBASE) {
      if (!isFirebaseAvailable()) {
        throw new Error('Firebase mode requested but Firebase is not available.');
      } else {
        try {
          logger.log('🔧 DataService: Initializing Firebase Firestore (primary storage)');
          this.firestore = new FirestoreService();
          logger.log('✅ DataService: Firebase Firestore initialized successfully');
        } catch (error) {
          logger.error('❌ Failed to initialize Firestore:', error);
          throw new Error('Failed to initialize Firebase Firestore. Please check configuration.');
        }
      }
    } else {
      throw new Error('IndexedDB mode is disabled. Firebase is required for storage.');
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

  private getFirestoreServiceForCrossStoreOps(): FirestoreService | null {
    if (this.firestore) {
      return this.firestore;
    }

    if (!isFirebaseAvailable()) {
      return null;
    }

    try {
      return new FirestoreService();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`⚠️ DataService: Unable to initialize Firestore for cross-store ops: ${errorMsg}`);
      return null;
    }
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

  async getSurveyByIdFromFirestore(surveyId: string) {
    if (!this.firestore) {
      throw new Error('Firestore is not initialized. Please verify Firebase configuration.');
    }
    if (isUploadDebugEnabled()) {
      logger.log('🧪 UploadDebug: getSurveyByIdFromFirestore', { surveyId });
    }
    return await this.firestore.getSurveyById(surveyId);
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
   * Delete a survey from both Firebase and IndexedDB, and clear app-scoped localStorage keys.
   * This ensures local and cloud storage remain consistent.
   */
  async deleteSurveyEverywhere(surveyId: string): Promise<{
    success: boolean;
    errors: string[];
    deleted: {
      firestore: boolean;
      indexedDb: boolean;
      localStorage: boolean;
    };
    counts: {
      firestoreDataRows: number;
      indexedDbDataRows: number;
    };
  }> {
    const errors: string[] = [];
    const deleted = { firestore: false, indexedDb: false, localStorage: false };
    const counts = { firestoreDataRows: 0, indexedDbDataRows: 0 };

    const firestoreService = this.getFirestoreServiceForCrossStoreOps();

    if (firestoreService) {
      try {
        const firestoreResult = await firestoreService.deleteWithVerification(surveyId);
        if (!firestoreResult.success) {
          throw new Error(firestoreResult.error || 'Firestore delete failed');
        }
        deleted.firestore = firestoreResult.deletedSurvey || firestoreResult.deletedDataRows > 0;
        counts.firestoreDataRows = firestoreResult.deletedDataRows;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Firestore delete failed: ${errorMsg}`);
      }
    }

    try {
      const indexedDbResult = await this.indexedDB.deleteWithVerification(surveyId);
      if (!indexedDbResult.success) {
        throw new Error(indexedDbResult.error || 'IndexedDB delete failed');
      }
      deleted.indexedDb = indexedDbResult.deletedSurvey || indexedDbResult.deletedDataRows > 0;
      counts.indexedDbDataRows = indexedDbResult.deletedDataRows;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`IndexedDB delete failed: ${errorMsg}`);
    }

    try {
      deleted.localStorage = clearStorage.clearLocalStorage();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`localStorage clear failed: ${errorMsg}`);
    }

    return {
      success: errors.length === 0,
      errors,
      deleted,
      counts
    };
  }

  /**
   * Delete all surveys from both Firebase and IndexedDB, and clear app-scoped localStorage keys.
   */
  async deleteAllSurveysEverywhere(): Promise<{
    success: boolean;
    errors: string[];
    deleted: {
      firestore: boolean;
      indexedDb: boolean;
      localStorage: boolean;
    };
    verification: {
      firestoreSurveyCount: number | null;
      indexedDbSurveyCount: number | null;
    };
  }> {
    const errors: string[] = [];
    const deleted = { firestore: false, indexedDb: false, localStorage: false };
    const verification: { firestoreSurveyCount: number | null; indexedDbSurveyCount: number | null } = {
      firestoreSurveyCount: null,
      indexedDbSurveyCount: null
    };

    const firestoreService = this.getFirestoreServiceForCrossStoreOps();

    if (firestoreService) {
      try {
        await firestoreService.deleteAllSurveys();
        deleted.firestore = true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Firestore delete all failed: ${errorMsg}`);
      }
    }

    try {
      await this.indexedDB.deleteAllSurveys();
      deleted.indexedDb = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`IndexedDB delete all failed: ${errorMsg}`);
    }

    try {
      deleted.localStorage = clearStorage.clearLocalStorage();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`localStorage clear failed: ${errorMsg}`);
    }

    try {
      if (firestoreService) {
        const firestoreSurveys = await firestoreService.getAllSurveys();
        verification.firestoreSurveyCount = firestoreSurveys.length;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Firestore verification failed: ${errorMsg}`);
    }

    try {
      const indexedSurveys = await this.indexedDB.getAllSurveys();
      verification.indexedDbSurveyCount = indexedSurveys.length;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`IndexedDB verification failed: ${errorMsg}`);
    }

    return {
      success: errors.length === 0,
      errors,
      deleted,
      verification
    };
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
    if (this.mode === StorageMode.FIREBASE && this.firestore) {
      const result = await this.firestore.getSurveyData(surveyId, filters, pagination);
      const hasFilters = Boolean(filters?.specialty || filters?.providerType || filters?.region || filters?.variable);
      if (!hasFilters && result?.rows?.length === 0) {
        logger.warn('⚠️ DataService: Firestore returned 0 rows. Checking IndexedDB fallback...');
        const fallback = await this.indexedDB.getSurveyData(surveyId, filters, pagination);
        if (fallback?.rows?.length > 0) {
          logger.warn('⚠️ DataService: Using IndexedDB rows for survey data fallback.');
          return fallback;
        }
      }
      return result;
    }

    return await this.runWithFirestoreFallback(
      'getSurveyData',
      async () => await this.firestore!.getSurveyData(surveyId, filters, pagination),
      async () => await this.indexedDB.getSurveyData(surveyId, filters, pagination)
    );
  }

  async getSurveyDataFromFirestore(surveyId: string, filters: any = {}, pagination: any = {}) {
    if (!this.firestore) {
      throw new Error('Firestore is not initialized. Please verify Firebase configuration.');
    }
    if (isUploadDebugEnabled()) {
      logger.log('🧪 UploadDebug: getSurveyDataFromFirestore', { surveyId, filters, pagination });
    }
    return await this.firestore.getSurveyData(surveyId, filters, pagination);
  }

  async saveSurveyData(surveyId: string, rows: any[], onProgress?: (percent: number) => void) {
    logger.log(`💾 DataService: Saving ${rows.length} rows...`);
    try {
      if (isUploadDebugEnabled()) {
        logger.log('🧪 UploadDebug: saveSurveyData start', { surveyId, rowCount: rows.length });
      }
      await this.runWithFirestoreFallback(
        'saveSurveyData',
        async () => await this.firestore!.saveSurveyData(surveyId, rows, onProgress),
        async () => await this.indexedDB.saveSurveyData(surveyId, rows, onProgress)
      );
      if (isUploadDebugEnabled()) {
        logger.log('🧪 UploadDebug: saveSurveyData complete', { surveyId, rowCount: rows.length });
      }
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

  /**
   * Get learned mappings - ALWAYS uses IndexedDB for persistence
   * 
   * CRITICAL: Learned mappings must persist reliably across years.
   * IndexedDB is browser-based and doesn't have quota limits like Firebase free tier.
   * This ensures learned mappings survive even if Firebase has issues.
   */
  async getLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Record<string, string>> {
    // ALWAYS use IndexedDB for learned mappings - critical for year-over-year persistence
    logger.log(`💾 getLearnedMappings: Using IndexedDB (always persistent)`);
    return await this.indexedDB.getLearnedMappings(type, providerType);
  }

  /**
   * Save learned mapping - ALWAYS uses IndexedDB for persistence
   * 
   * CRITICAL: Learned mappings must persist reliably across years.
   * IndexedDB is browser-based and doesn't have quota limits like Firebase free tier.
   * This ensures learned mappings survive even if Firebase has issues.
   */
  async saveLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string, corrected: string, providerType?: string, surveySource?: string): Promise<void> {
    // ALWAYS use IndexedDB for learned mappings - critical for year-over-year persistence
    logger.log(`💾 saveLearnedMapping: Using IndexedDB (always persistent)`);
    return await this.indexedDB.saveLearnedMapping(type, original, corrected, providerType, surveySource);
  }

  /**
   * Remove learned mapping - ALWAYS uses IndexedDB for persistence
   * 
   * CRITICAL: Learned mappings must persist reliably across years.
   * IndexedDB is browser-based and doesn't have quota limits like Firebase free tier.
   */
  async removeLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string): Promise<void> {
    // ALWAYS use IndexedDB for learned mappings - critical for year-over-year persistence
    logger.log(`💾 removeLearnedMapping: Using IndexedDB (always persistent)`);
    return await this.indexedDB.removeLearnedMapping(type, original);
  }

  /**
   * Clear learned mappings - ALWAYS uses IndexedDB for persistence
   * 
   * CRITICAL: Learned mappings must persist reliably across years.
   * IndexedDB is browser-based and doesn't have quota limits like Firebase free tier.
   */
  async clearLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<void> {
    // ALWAYS use IndexedDB for learned mappings - critical for year-over-year persistence
    logger.log(`💾 clearLearnedMappings: Using IndexedDB (always persistent)`);
    return await this.indexedDB.clearLearnedMappings(type);
  }

  /**
   * Get learned mappings with source - ALWAYS uses IndexedDB for persistence
   * 
   * CRITICAL: Learned mappings must persist reliably across years.
   * IndexedDB is browser-based and doesn't have quota limits like Firebase free tier.
   * This ensures learned mappings survive even if Firebase has issues.
   */
  async getLearnedMappingsWithSource(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Array<{original: string, corrected: string, surveySource: string}>> {
    // ALWAYS use IndexedDB for learned mappings - critical for year-over-year persistence
    logger.log(`💾 getLearnedMappingsWithSource: Using IndexedDB (always persistent)`);
    return await this.indexedDB.getLearnedMappingsWithSource(type, providerType);
  }

  async healthCheck() {
    return await this.getStorageService().healthCheck();
  }

  // Variable Mapping Methods
  async getVariableMappings(providerType?: string) {
    return await this.runWithFirestoreFallback(
      'getVariableMappings',
      async () => await this.firestore!.getVariableMappings(providerType),
      async () => await this.indexedDB.getVariableMappings(providerType)
    );
  }

  async getUnmappedVariables(providerType?: string) {
    return await this.runWithFirestoreFallback(
      'getUnmappedVariables',
      async () => await this.firestore!.getUnmappedVariables(providerType),
      async () => await this.indexedDB.getUnmappedVariables(providerType)
    );
  }

  async createVariableMapping(mapping: any) {
    return await this.runWithFirestoreFallback(
      'createVariableMapping',
      async () => await this.firestore!.createVariableMapping(mapping),
      async () => await this.indexedDB.createVariableMapping(mapping)
    );
  }

  async updateVariableMapping(id: string, mapping: any) {
    return await this.runWithFirestoreFallback(
      'updateVariableMapping',
      async () => await this.firestore!.updateVariableMapping(id, mapping),
      async () => await this.indexedDB.updateVariableMapping(id, mapping)
    );
  }

  async deleteVariableMapping(id: string) {
    return await this.runWithFirestoreFallback(
      'deleteVariableMapping',
      async () => await this.firestore!.deleteVariableMapping(id),
      async () => await this.indexedDB.deleteVariableMapping(id)
    );
  }

  async clearAllVariableMappings() {
    return await this.runWithFirestoreFallback(
      'clearAllVariableMappings',
      async () => await this.firestore!.clearAllVariableMappings(),
      async () => await this.indexedDB.clearAllVariableMappings()
    );
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
    return await this.runWithFirestoreFallback(
      'getRegionMappings',
      async () => await this.firestore!.getRegionMappings(providerType),
      async () => await this.indexedDB.getRegionMappings(providerType)
    );
  }

  async getUnmappedRegions(providerType?: string) {
    return await this.runWithFirestoreFallback(
      'getUnmappedRegions',
      async () => await this.firestore!.getUnmappedRegions(providerType),
      async () => await this.indexedDB.getUnmappedRegions(providerType)
    );
  }

  async createRegionMapping(mapping: any) {
    return await this.runWithFirestoreFallback(
      'createRegionMapping',
      async () => await this.firestore!.createRegionMapping(mapping),
      async () => await this.indexedDB.createRegionMapping(mapping)
    );
  }

  async updateRegionMapping(id: string, mapping: any) {
    return await this.runWithFirestoreFallback(
      'updateRegionMapping',
      async () => await this.firestore!.updateRegionMapping(id, mapping),
      async () => await this.indexedDB.updateRegionMapping(id, mapping)
    );
  }

  async deleteRegionMapping(id: string) {
    return await this.runWithFirestoreFallback(
      'deleteRegionMapping',
      async () => await this.firestore!.deleteRegionMapping(id),
      async () => await this.indexedDB.deleteRegionMapping(id)
    );
  }

  async clearAllRegionMappings() {
    return await this.runWithFirestoreFallback(
      'clearAllRegionMappings',
      async () => await this.firestore!.clearAllRegionMappings(),
      async () => await this.indexedDB.clearAllRegionMappings()
    );
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

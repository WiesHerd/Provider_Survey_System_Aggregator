import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../features/mapping/types/mapping';
import { IColumnMapping } from '../types/column';
import { IUnmappedVariable } from '../features/mapping/types/mapping';
import { SurveySource } from '../shared/types';
import { parseCSVLine } from '../shared/utils/csvParser';
import { readCSVFile } from '../shared/utils';
import { ProviderType, DataCategory } from '../types/provider';
import { TransactionQueue } from '../shared/services/TransactionQueue';
import { AuditLogService } from './AuditLogService';
import { safeValidateSurvey, safeValidateSpecialtyMapping, validateColumnMapping } from '../shared/schemas/dataSchemas';

interface Survey {
  id: string;
  name: string;
  year: string;
  type: string;
  uploadDate: Date;
  rowCount: number;
  specialtyCount: number;
  dataPoints: number;
  colorAccent: string;
  metadata: any;
  providerType?: ProviderType | string; // Provider type: PHYSICIAN, APP, or CUSTOM
  // NEW: Data Category architecture fields
  dataCategory?: DataCategory; // What type of compensation data
  source?: string; // Just company name: 'MGMA', 'SullivanCotter', etc.
  surveyLabel?: string; // Optional label to differentiate surveys (e.g., "Pediatrics", "Adult Medicine")
  createdAt?: Date;
  updatedAt?: Date;
}

interface SurveyData {
  id: string;
  surveyId: string;
  data: any;
  specialty?: string;
  providerType?: string;
  region?: string;
  variable?: string;
  tcc?: number;
  cf?: number;
  wrvu?: number;
  count?: number;
  // Percentile-specific compensation data
  tcc_p25?: number;
  tcc_p50?: number;
  tcc_p75?: number;
  tcc_p90?: number;
  cf_p25?: number;
  cf_p50?: number;
  cf_p75?: number;
  cf_p90?: number;
  wrvu_p25?: number;
  wrvu_p50?: number;
  wrvu_p75?: number;
  wrvu_p90?: number;
  n_orgs?: number;
  n_incumbents?: number;
}

/**
 * IndexedDB Service for browser-based data storage
 * Mimics the backend API structure for easy migration later
 */
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SurveyAggregatorDB';
  private _dbVersion = 9; // Incremented to add variable index for fast queries
  // Getter to allow external access while allowing internal mutation
  private get DB_VERSION(): number {
    return this._dbVersion;
  }
  private isInitializing = false;
  private isReady = false;
  private initializationPromise: Promise<void> | null = null;
  private readyResolvers: (() => void)[] = [];
  private healthCheckCache: { status: 'healthy' | 'unhealthy' | 'unknown'; timestamp: number } | null = null;
  private transactionQueue: TransactionQueue = TransactionQueue.getInstance();
  private auditLog: AuditLogService = AuditLogService.getInstance();
  
  // ENTERPRISE: Cache for unmapped variables to avoid expensive recalculations
  private unmappedVariablesCache = new Map<string, { data: IUnmappedVariable[]; timestamp: number; mappingsHash: string }>();
  private readonly UNMAPPED_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

  /**
   * Initialize the database with explicit ready state tracking
   * This method ensures the database is fully ready before any operations
   */
  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  private async _performInitialization(): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.isInitializing) {
      // Wait for current initialization to complete
      return new Promise<void>((resolve) => {
        this.readyResolvers.push(resolve);
      });
    }

    this.isInitializing = true;
    console.log('🔧 Initializing IndexedDB...');

    // ENTERPRISE FIX: Add timeout to prevent indefinite hangs
    const INIT_TIMEOUT = 15000; // 15 seconds max for initialization
    
    try {
      const initPromise = (async () => {
        await this._openDatabase();
        await this._verifyObjectStores();
        this.isReady = true;
        this.healthCheckCache = { status: 'healthy', timestamp: Date.now() };
        console.log('✅ IndexedDB fully initialized and ready');
      })();

      // Race initialization against timeout
      await Promise.race([
        initPromise,
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('IndexedDB initialization timed out after 15 seconds. Please refresh the page.')), INIT_TIMEOUT)
        )
      ]);
      
      // Resolve all waiting promises
      this.readyResolvers.forEach(resolve => resolve());
      this.readyResolvers = [];
    } catch (error) {
      console.error('❌ IndexedDB initialization failed:', error);
      this.isReady = false;
      this.isInitializing = false;
      this.healthCheckCache = { status: 'unhealthy', timestamp: Date.now() };
      
      // Reject all waiting promises
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.readyResolvers.forEach(resolve => {
        // Resolve anyway so components don't hang, but they'll see the error
        resolve();
      });
      this.readyResolvers = [];
      
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _openDatabase(): Promise<void> {
    // ENTERPRISE FIX: Skip version detection to prevent hangs - always open without version
    // This is the safest approach and prevents all version mismatch errors
    // Opening without version will use existing version or create new database
    
    console.log('📊 Opening database without version (safest approach - prevents version errors)');
    
    // CRITICAL: Always open without version number - this is the safest option
    // It will use whatever version exists or create a new database if none exists
    // This completely eliminates version mismatch errors
    await this._openWithVersionAsync(null, true); // true = force open without version
    
    // After opening, update our internal version tracking to match actual version
    if (this.db) {
      const actualVersion = this.db.version;
      if (actualVersion !== this.DB_VERSION) {
        console.log(`📊 Database opened with version ${actualVersion}, updating internal version from ${this.DB_VERSION}`);
        this._dbVersion = actualVersion;
      }
    }
  }

  /**
   * Detect existing database version by opening without version number
   * Returns the version number if database exists, null if new database
   */
  private _detectDatabaseVersion(): Promise<number | null> {
    return new Promise((resolve, reject) => {
      const detectRequest = indexedDB.open(this.DB_NAME);
      let resolved = false;
      
      detectRequest.onsuccess = () => {
        if (resolved) return;
        resolved = true;
        const existingDb = detectRequest.result;
        const detectedVersion = existingDb.version;
        existingDb.close();
        resolve(detectedVersion);
      };
      
      detectRequest.onerror = () => {
        if (resolved) return;
        resolved = true;
        // Detection failed - database might not exist
        // This is not necessarily an error - it could be a new database
        resolve(null);
      };
      
      // Also handle upgrade needed during detection (shouldn't happen, but handle it)
      detectRequest.onupgradeneeded = () => {
        // This shouldn't happen when opening without version, but handle it
        console.warn('⚠️ Upgrade needed during version detection - this is unexpected');
        if (!resolved) {
          resolved = true;
          // If upgrade is needed, database exists but version detection is complex
          // Resolve with null to trigger safe fallback
          resolve(null);
        }
      };
    });
  }

  /**
   * Async wrapper for opening database with proper version handling
   * @param detectedVersion - Version detected from existing database (null if new)
   * @param forceOpenWithoutVersion - If true, always open without version number (safest fallback)
   */
  private async _openWithVersionAsync(
    detectedVersion: number | null,
    forceOpenWithoutVersion: boolean = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this._openWithVersion(detectedVersion, forceOpenWithoutVersion, resolve, reject);
    });
  }

  /**
   * Open database with proper version handling
   * @param detectedVersion - Version detected from existing database (null if new)
   * @param forceOpenWithoutVersion - If true, always open without version number (safest fallback)
   * @param resolve - Promise resolve function
   * @param reject - Promise reject function
   */
  private _openWithVersion(
    detectedVersion: number | null,
    forceOpenWithoutVersion: boolean,
    resolve: () => void,
    reject: (error: any) => void
  ): void {
    // Determine target version
    let targetVersion: number | undefined;
    
    // SAFE FALLBACK: If forced to open without version, always do so
    if (forceOpenWithoutVersion) {
      targetVersion = undefined;
      console.log(`📊 Opening database without version number (safe fallback mode)`);
    } else if (detectedVersion === null) {
      // New database - use code version
      targetVersion = this.DB_VERSION;
      console.log(`📊 Creating new database with version ${targetVersion}`);
    } else if (detectedVersion >= this.DB_VERSION) {
      // Existing version is same or higher - open without version number to use existing
      // NEVER specify version when existing is >= code version
      targetVersion = undefined;
      console.log(`📊 Opening existing database (version ${detectedVersion}) without specifying version`);
    } else {
      // Existing version is lower - upgrade to code version
      targetVersion = this.DB_VERSION;
      console.log(`📊 Upgrading database from version ${detectedVersion} to ${targetVersion}`);
    }
    
    // Open database (with or without version number based on strategy above)
    const openRequest = targetVersion !== undefined
      ? indexedDB.open(this.DB_NAME, targetVersion)
      : indexedDB.open(this.DB_NAME);
    
    openRequest.onsuccess = () => {
      this.db = openRequest.result;
      const actualVersion = this.db.version;
      console.log(`✅ IndexedDB opened successfully (version ${actualVersion})`);
      
      // Update DB_VERSION to match actual version (in case it changed)
      if (actualVersion !== this.DB_VERSION) {
        console.log(`📊 Updating DB_VERSION from ${this.DB_VERSION} to ${actualVersion}`);
        this._dbVersion = actualVersion;
      }
      
      resolve();
    };
    
    openRequest.onerror = () => {
      const error = openRequest.error || new Error('Failed to open IndexedDB');
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : String(error);
      
      console.error(`❌ Failed to open IndexedDB:`, errorMessage, `(Error name: ${errorName})`);
      
      // ENTERPRISE: Handle VersionError specifically - this happens when cached old code tries to open with lower version
      // Also handle any version-related error messages
      const isVersionError = errorName === 'VersionError' || 
                            errorMessage.includes('VersionError') ||
                            (errorMessage.includes('version') && 
                             (errorMessage.includes('less than') || 
                              errorMessage.includes('greater than') ||
                              errorMessage.includes('requested version')));
      
      if (isVersionError || (targetVersion !== undefined && errorMessage.toLowerCase().includes('version'))) {
        console.warn('🔄 Version mismatch error detected (likely cached old code), attempting to open without version number...');
        
        // Last resort: open without version number to use existing database version
        const fallbackRequest = indexedDB.open(this.DB_NAME);
        fallbackRequest.onsuccess = () => {
          this.db = fallbackRequest.result;
          const actualVersion = this.db.version;
          console.log(`✅ IndexedDB opened successfully with fallback (version ${actualVersion})`);
          this._dbVersion = actualVersion;
          console.warn('⚠️ Please refresh the page to load the latest code version');
          resolve();
        };
        fallbackRequest.onerror = () => {
          console.error('❌ Fallback open also failed:', fallbackRequest.error);
          reject(fallbackRequest.error || error);
        };
        return;
      }
      
      reject(error);
    };
    
    openRequest.onupgradeneeded = (event) => {
      console.log(`🔧 Database upgrade needed: ${event.oldVersion} -> ${event.newVersion}`);
      this._handleUpgrade(event);
    };
  }

  /**
   * Handle database upgrade/migration
   * Extracted to avoid code duplication and ensure consistent upgrade logic
   */
  private _handleUpgrade(event: IDBVersionChangeEvent): void {
    console.log('🔧 Database upgrade needed, creating object stores...');
    const db = (event.target as IDBOpenDBRequest).result;
    const oldVersion = event.oldVersion || 0;

    // Create surveys store
    if (!db.objectStoreNames.contains('surveys')) {
      console.log('📊 Creating surveys object store...');
      const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
      surveyStore.createIndex('name', 'name', { unique: false });
      surveyStore.createIndex('type', 'type', { unique: false });
      surveyStore.createIndex('year', 'year', { unique: false });
    }

    // Create survey data store
    if (!db.objectStoreNames.contains('surveyData')) {
      console.log('📊 Creating surveyData object store...');
      const dataStore = db.createObjectStore('surveyData', { keyPath: 'id' });
      dataStore.createIndex('surveyId', 'surveyId', { unique: false });
      dataStore.createIndex('specialty', 'specialty', { unique: false });
      dataStore.createIndex('variable', 'variable', { unique: false }); // ENTERPRISE: Index for fast variable queries
    } else if (oldVersion < 9) {
      // Migration: Add variable index if it doesn't exist
      const dataStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('surveyData');
      if (!dataStore.indexNames.contains('variable')) {
        dataStore.createIndex('variable', 'variable', { unique: false });
        console.log('✅ Added variable index to surveyData store');
      }
    }

    // Create specialty mappings store
    if (!db.objectStoreNames.contains('specialtyMappings')) {
      console.log('📊 Creating specialtyMappings object store...');
      const mappingStore = db.createObjectStore('specialtyMappings', { keyPath: 'id' });
      mappingStore.createIndex('standardizedName', 'standardizedName', { unique: false });
    }

    // Create specialty mapping sources store
    if (!db.objectStoreNames.contains('specialtyMappingSources')) {
      const sourceStore = db.createObjectStore('specialtyMappingSources', { keyPath: 'id' });
      sourceStore.createIndex('mappingId', 'mappingId', { unique: false });
      sourceStore.createIndex('specialty', 'specialty', { unique: false });
    }

    // Create column mappings store
    if (!db.objectStoreNames.contains('columnMappings')) {
      const columnStore = db.createObjectStore('columnMappings', { keyPath: 'id' });
      columnStore.createIndex('surveyId', 'surveyId', { unique: false });
      columnStore.createIndex('originalName', 'originalName', { unique: false });
    }

    // Create variable mappings store
    if (!db.objectStoreNames.contains('variableMappings')) {
      const variableStore = db.createObjectStore('variableMappings', { keyPath: 'id' });
      variableStore.createIndex('standardizedName', 'standardizedName', { unique: false });
      variableStore.createIndex('variableType', 'variableType', { unique: false });
    }

    // Create region mappings store
    if (!db.objectStoreNames.contains('regionMappings')) {
      const regionStore = db.createObjectStore('regionMappings', { keyPath: 'id' });
      regionStore.createIndex('standardizedName', 'standardizedName', { unique: false });
    }

    // Create provider type mappings store
    if (!db.objectStoreNames.contains('providerTypeMappings')) {
      const providerTypeStore = db.createObjectStore('providerTypeMappings', { keyPath: 'id' });
      providerTypeStore.createIndex('standardizedName', 'standardizedName', { unique: false });
    }

    // Create learned mappings stores
    if (!db.objectStoreNames.contains('learnedSpecialtyMappings')) {
      const learnedSpecialtyStore = db.createObjectStore('learnedSpecialtyMappings', { keyPath: 'id', autoIncrement: true });
      learnedSpecialtyStore.createIndex('original', 'original', { unique: false });
      learnedSpecialtyStore.createIndex('corrected', 'corrected', { unique: false });
    } else if (oldVersion < 5) {
      // Migration: Recreate learned mappings store with new structure
      db.deleteObjectStore('learnedSpecialtyMappings');
      const learnedSpecialtyStore = db.createObjectStore('learnedSpecialtyMappings', { keyPath: 'id', autoIncrement: true });
      learnedSpecialtyStore.createIndex('original', 'original', { unique: false });
      learnedSpecialtyStore.createIndex('corrected', 'corrected', { unique: false });
    }

    if (!db.objectStoreNames.contains('learnedColumnMappings')) {
      const learnedColumnStore = db.createObjectStore('learnedColumnMappings', { keyPath: 'original' });
      learnedColumnStore.createIndex('corrected', 'corrected', { unique: false });
    }

    if (!db.objectStoreNames.contains('learnedVariableMappings')) {
      const learnedVariableStore = db.createObjectStore('learnedVariableMappings', { keyPath: 'original' });
      learnedVariableStore.createIndex('corrected', 'corrected', { unique: false });
    }

    if (!db.objectStoreNames.contains('learnedRegionMappings')) {
      const learnedRegionStore = db.createObjectStore('learnedRegionMappings', { keyPath: 'original' });
      learnedRegionStore.createIndex('corrected', 'corrected', { unique: false });
    }

    if (!db.objectStoreNames.contains('learnedProviderTypeMappings')) {
      const learnedProviderTypeStore = db.createObjectStore('learnedProviderTypeMappings', { keyPath: 'original' });
      learnedProviderTypeStore.createIndex('corrected', 'corrected', { unique: false });
    }

    // Create blend templates store
    if (!db.objectStoreNames.contains('blendTemplates')) {
      const blendTemplatesStore = db.createObjectStore('blendTemplates', { keyPath: 'id' });
      blendTemplatesStore.createIndex('name', 'name', { unique: false });
      blendTemplatesStore.createIndex('createdBy', 'createdBy', { unique: false });
      blendTemplatesStore.createIndex('isPublic', 'isPublic', { unique: false });
    }

    // Create FMV calculations store
    if (!db.objectStoreNames.contains('fmvCalculations')) {
      const fmvCalculationsStore = db.createObjectStore('fmvCalculations', { keyPath: 'id' });
      fmvCalculationsStore.createIndex('providerName', 'providerName', { unique: false });
      fmvCalculationsStore.createIndex('created', 'created', { unique: false });
      fmvCalculationsStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Create cache store for analytics
    if (!db.objectStoreNames.contains('cache')) {
      console.log('📊 Creating cache object store...');
      const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
      cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
    
    console.log('✅ Database upgrade completed, all object stores created');
  }

  private async _verifyObjectStores(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened');
    }

    const requiredStores = ['surveys', 'surveyData', 'specialtyMappings', 'cache'];
    const existingStores = Array.from(this.db!.objectStoreNames);
    const missingStores = requiredStores.filter(storeName => !this.db!.objectStoreNames.contains(storeName));
    
    console.log('🔍 IndexedDB Object Stores:', {
      existing: existingStores,
      required: requiredStores,
      missing: missingStores
    });
    
    // If stores are missing, we need to trigger an upgrade to create them
    if (missingStores.length > 0) {
      console.warn('⚠️ Missing object stores detected:', missingStores);
      
      // Check if we can trigger an upgrade by opening with a higher version
      const currentVersion = this.db.version;
      const targetVersion = currentVersion + 1;
      
      console.log(`🔧 Attempting to upgrade database from version ${currentVersion} to ${targetVersion} to create missing stores...`);
      
      // Close current connection
      this.db.close();
      this.db = null;
      
      // Try to open with higher version to trigger upgrade
      try {
        await new Promise<void>((resolve, reject) => {
          const upgradeRequest = indexedDB.open(this.DB_NAME, targetVersion);
          
          upgradeRequest.onupgradeneeded = (event) => {
            console.log('🔧 Upgrade triggered to create missing stores...');
            this._handleUpgrade(event);
          };
          
          upgradeRequest.onsuccess = () => {
            this.db = upgradeRequest.result;
            const actualVersion = this.db.version;
            this._dbVersion = actualVersion; // Update internal version tracking
            console.log(`✅ Database upgraded successfully to version ${actualVersion}`);
            resolve();
          };
          
          upgradeRequest.onerror = () => {
            const error = upgradeRequest.error || new Error('Failed to upgrade database');
            console.error('❌ Database upgrade failed:', error);
            reject(error);
          };
        });
        
        // Re-verify after upgrade
        if (!this.db) {
          throw new Error('Database not opened after upgrade');
        }
        
        const db: IDBDatabase = this.db; // Store in local variable with explicit type
        const storesAfterUpgrade = Array.from(db.objectStoreNames);
        const stillMissing = requiredStores.filter(storeName => !db.objectStoreNames.contains(storeName));
        
        if (stillMissing.length > 0) {
          console.warn('⚠️ Some stores still missing after upgrade:', stillMissing);
          // Force full recreation
          await this._recreateDatabase();
          return;
        }
      } catch (upgradeError) {
        console.warn('⚠️ Upgrade failed, attempting full database recreation...', upgradeError);
        // If upgrade fails, try full recreation
        await this._recreateDatabase();
        return;
      }
    }

    // Verify we can perform basic operations
    try {
      const transaction = this.db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      await new Promise<void>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => {
          console.log('✅ Object store verification passed');
          resolve();
        };
        request.onerror = () => {
          console.error('❌ Object store count failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Object store verification failed:', error);
      // ENTERPRISE FIX: If stores exist but are corrupted/unusable, attempt a full rebuild once.
      // This prevents the app from getting stuck in a broken IndexedDB state.
      try {
        console.warn('🔧 Attempting database recreation due to non-functional object stores...');
        await this._recreateDatabase();

        // Retry the basic operation once after recreation
        if (!this.db) {
          throw new Error('Database not opened after recreation');
        }
        const retryTx = this.db.transaction(['surveys'], 'readonly');
        const retryStore = retryTx.objectStore('surveys');
        await new Promise<void>((resolve, reject) => {
          const request = retryStore.count();
          request.onsuccess = () => {
            console.log('✅ Database recreation resolved object store verification failure');
            resolve();
          };
          request.onerror = () => {
            console.error('❌ Retry verification failed:', request.error);
            reject(request.error);
          };
        });
        return;
      } catch (recreateError) {
        console.error('❌ Database recreation failed:', recreateError);
        const errorMessage = recreateError instanceof Error ? recreateError.message : String(recreateError);
        
        // Provide more helpful error message
        if (errorMessage.includes('blocked')) {
          throw new Error('Database is blocked by another tab/window. Please close other tabs and refresh the page.');
        } else {
          throw new Error(`Database object stores are not functional: ${errorMessage}`);
        }
      }
    }
  }

  private async _recreateDatabase(): Promise<void> {
    console.log('🔧 Recreating database due to missing object stores...');
    
    // Reset initialization state
    this.isReady = false;
    this.isInitializing = false;
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Delete the existing database
    try {
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME);
        let resolved = false;
        
        deleteRequest.onsuccess = () => {
          if (resolved) return;
          resolved = true;
          console.log('✅ Database deleted successfully');
          resolve();
        };
        
        deleteRequest.onerror = () => {
          if (resolved) return;
          resolved = true;
          const error = deleteRequest.error || new Error('Failed to delete database');
          console.error('❌ Failed to delete database:', error);
          reject(error);
        };
        
        deleteRequest.onblocked = () => {
          console.warn('⚠️ IndexedDB deleteDatabase is blocked (another tab/window may still be using the database).');
          console.warn('💡 Please close other tabs/windows using this application and refresh the page.');
          // Don't reject immediately - wait a bit for the block to clear
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              reject(new Error('Database deletion is blocked. Please close other tabs/windows and refresh the page.'));
            }
          }, 3000);
        };
        
        // Safety timeout: don't hang forever if browser blocks deletion
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Database recreation timed out. Please close other tabs/windows and refresh the page.'));
          }
        }, 8000);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // If deletion fails due to blocking, try to continue anyway - the upgrade might still work
      if (errorMessage.includes('blocked')) {
        console.warn('⚠️ Database deletion blocked, but attempting to continue with upgrade...');
      } else {
        throw error;
      }
    }

    // Reset state before reopening
    this.isReady = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    // Reopen with upgrade - this will trigger onupgradeneeded to create all stores
    await this._openDatabase();
    
    // Verify stores were created after recreation (skip full verification to avoid recursion)
    if (!this.db) {
      throw new Error('Database not opened after recreation');
    }
    
    // Quick check that required stores exist (don't call full _verifyObjectStores to avoid recursion)
    const db: IDBDatabase = this.db; // Store in local variable with explicit type
    const requiredStores = ['surveys', 'surveyData', 'specialtyMappings', 'cache'];
    const existingStores = Array.from(db.objectStoreNames);
    const missingStores = requiredStores.filter(storeName => !db.objectStoreNames.contains(storeName));
    
    if (missingStores.length > 0) {
      throw new Error(`Database recreation failed: stores still missing after recreation: ${missingStores.join(', ')}`);
    }
    
    console.log('✅ Database recreation completed successfully, all stores created');
  }

  /**
   * Ensure database is ready before performing operations
   * This is the main entry point for all database operations
   */
  async ensureDB(): Promise<IDBDatabase> {
    if (!this.isReady) {
      await this.initialize();
    }
    
    if (!this.db) {
      throw new Error('Database failed to initialize');
    }
    
    return this.db;
  }

  /**
   * Check if database is ready for operations
   */
  isDatabaseReady(): boolean {
    return this.isReady && this.db !== null;
  }

  /**
   * Wait until database is ready
   */
  async waitUntilReady(): Promise<void> {
    if (this.isReady) {
      return;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    return new Promise<void>((resolve) => {
      this.readyResolvers.push(resolve);
    });
  }

  /**
   * Get database health status with detailed diagnostics
   * Enterprise-grade health monitoring with comprehensive checks
   */
  async getHealthStatus(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'unknown'; 
    details: string;
    diagnostics?: {
      isInitialized: boolean;
      isReady: boolean;
      hasDatabase: boolean;
      objectStores: string[];
      requiredStores: string[];
      missingStores: string[];
      surveyCount: number;
      dataCount: number;
      lastError?: string;
      browserSupport: boolean;
      storageQuota?: number;
      storageUsage?: number;
    }
  }> {
    // Return cached result if recent (within 5 seconds)
    if (this.healthCheckCache && Date.now() - this.healthCheckCache.timestamp < 5000) {
      return {
        status: this.healthCheckCache.status,
        details: this.healthCheckCache.status === 'healthy' ? 'Database is operational' : 'Database has issues'
      };
    }

    const diagnostics: any = {
      isInitialized: this.isInitializing || this.isReady,
      isReady: this.isReady,
      hasDatabase: !!this.db,
      objectStores: [],
      requiredStores: ['surveys', 'surveyData', 'specialtyMappings', 'cache'],
      missingStores: [],
      surveyCount: 0,
      dataCount: 0,
      browserSupport: !!window.indexedDB
    };

    try {
      // Check browser support
      if (!window.indexedDB) {
        this.healthCheckCache = { status: 'unhealthy', timestamp: Date.now() };
        return { 
          status: 'unhealthy', 
          details: 'IndexedDB is not supported in this browser',
          diagnostics: { ...diagnostics, lastError: 'IndexedDB not supported' }
        };
      }

      // Check initialization state
      if (!this.isReady || !this.db) {
        this.healthCheckCache = { status: 'unhealthy', timestamp: Date.now() };
        return { 
          status: 'unhealthy', 
          details: 'Database not initialized',
          diagnostics: { ...diagnostics, lastError: 'Database not initialized' }
        };
      }

      // Get object store names
      diagnostics.objectStores = Array.from(this.db.objectStoreNames);
      diagnostics.missingStores = diagnostics.requiredStores.filter((store: string) => 
        !this.db!.objectStoreNames.contains(store)
      );

      // Check for missing critical stores
      if (diagnostics.missingStores.length > 0) {
        this.healthCheckCache = { status: 'unhealthy', timestamp: Date.now() };
        return { 
          status: 'unhealthy', 
          details: `Missing critical object stores: ${diagnostics.missingStores.join(', ')}`,
          diagnostics: { ...diagnostics, lastError: 'Missing object stores' }
        };
      }

      // Test basic operations on each critical store
      const storeTests = [
        { name: 'surveys', operation: 'count' },
        { name: 'surveyData', operation: 'count' },
        { name: 'specialtyMappings', operation: 'count' },
        { name: 'cache', operation: 'count' }
      ];

      for (const storeTest of storeTests) {
        try {
          const transaction = this.db.transaction([storeTest.name], 'readonly');
          const store = transaction.objectStore(storeTest.name);
          
          await new Promise<void>((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => {
              if (storeTest.name === 'surveys') diagnostics.surveyCount = request.result;
              if (storeTest.name === 'surveyData') diagnostics.dataCount = request.result;
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        } catch (error) {
          this.healthCheckCache = { status: 'unhealthy', timestamp: Date.now() };
          return { 
            status: 'unhealthy', 
            details: `Store ${storeTest.name} is not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`,
            diagnostics: { ...diagnostics, lastError: `Store ${storeTest.name} error` }
          };
        }
      }

      // Check storage quota if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          diagnostics.storageQuota = estimate.quota;
          diagnostics.storageUsage = estimate.usage;
        } catch (error) {
          // Storage quota check failed, but not critical
          console.warn('Storage quota check failed:', error);
        }
      }

      this.healthCheckCache = { status: 'healthy', timestamp: Date.now() };
      return { 
        status: 'healthy', 
        details: `Database is operational (${diagnostics.surveyCount} surveys, ${diagnostics.dataCount} data rows)`,
        diagnostics
      };
    } catch (error) {
      this.healthCheckCache = { status: 'unhealthy', timestamp: Date.now() };
      return { 
        status: 'unhealthy', 
        details: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        diagnostics: { ...diagnostics, lastError: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Repair database if corrupted
   * Enterprise-grade repair with multiple recovery strategies
   */
  async repairDatabase(): Promise<void> {
    console.log('🔧 Starting database repair process...');
    
    try {
      // Step 1: Force reinitialization
      console.log('🔧 Step 1: Forcing reinitialization...');
      this.isReady = false;
      this.initializationPromise = null;
      this.healthCheckCache = null;
      
      // Step 2: Close existing database connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      // Step 3: Try to reinitialize
      console.log('🔧 Step 2: Reinitializing database...');
      try {
        await this.initialize();
      } catch (initError) {
        const errorMessage = initError instanceof Error ? initError.message : String(initError);
        
        // ENTERPRISE: Handle version mismatch errors specifically
        if (errorMessage.includes('version') && (errorMessage.includes('less than') || errorMessage.includes('greater than'))) {
          console.warn('🔄 Version mismatch detected during repair, attempting to resolve...');
          
          // Use the same robust detection and opening logic as initialization
          try {
            const detectedVersion = await this._detectDatabaseVersion();
            
            if (detectedVersion !== null) {
              console.log(`📊 Detected existing database version: ${detectedVersion}, code expects: ${this.DB_VERSION}`);
              
              // Update internal version to match if higher
              if (detectedVersion > this.DB_VERSION) {
                console.warn(`⚠️ Browser has IndexedDB version ${detectedVersion}, code expects ${this.DB_VERSION}. Updating code version to match.`);
                this._dbVersion = detectedVersion;
              }
              
              // Open using the robust version handling logic
              await this._openWithVersionAsync(detectedVersion);
              this.isReady = true;
              const db = this.db as IDBDatabase | null;
              if (db) {
                console.log(`✅ Successfully opened database with version ${db.version}`);
              } else {
                console.log(`✅ Successfully opened database`);
              }
            } else {
              // No existing database detected, open as new
              await this._openWithVersionAsync(null);
              this.isReady = true;
              console.log(`✅ Successfully opened new database`);
            }
          } catch (repairError) {
            console.error('❌ Failed to repair database with version detection:', repairError);
            // Last resort: try opening without version number
            console.warn('🔄 Attempting last resort: opening without version number...');
            await this._openWithVersionAsync(null, true); // Force open without version
            this.isReady = true;
            console.log(`✅ Successfully opened database with last resort method`);
          }
        } else {
          throw initError; // Re-throw if not a version mismatch
        }
      }
      
      // Step 4: Verify repair was successful
      console.log('🔧 Step 3: Verifying repair...');
      const healthStatus = await this.getHealthStatus();
      
      if (healthStatus.status === 'healthy') {
        console.log('✅ Database repair completed successfully');
        return;
      }
      
      // Step 5: If still unhealthy, try database recreation
      console.log('🔧 Step 4: Attempting database recreation...');
      await this._recreateDatabase();
      
      // Step 6: Final verification
      const finalHealthStatus = await this.getHealthStatus();
      if (finalHealthStatus.status === 'healthy') {
        console.log('✅ Database repair completed successfully after recreation');
        return;
      }
      
      throw new Error('Database repair failed - all recovery strategies exhausted');
      
    } catch (error) {
      console.error('❌ Database repair failed:', error);
      throw new Error(`Failed to repair database: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page or clear browser data.`);
    }
  }

  private hasRequiredObjectStores(): boolean {
    if (!this.db) return false;
    
    const requiredStores = ['surveys', 'surveyData', 'specialtyMappings'];
    return requiredStores.every(storeName => this.db!.objectStoreNames.contains(storeName));
  }

  private async forceUpgrade(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Increment the version to force onupgradeneeded
      const newVersion = this.DB_VERSION + 1;
      console.log(`🔄 Forcing database upgrade from version ${this.DB_VERSION} to ${newVersion}`);
      
      const request = indexedDB.open(this.DB_NAME, newVersion);

      request.onerror = () => {
        console.error('❌ Failed to force upgrade IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Database force upgrade completed successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('🔧 Force upgrade: Database upgrade needed, creating object stores...');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create surveys store
        if (!db.objectStoreNames.contains('surveys')) {
          console.log('📊 Creating surveys object store...');
          const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
          surveyStore.createIndex('name', 'name', { unique: false });
          surveyStore.createIndex('type', 'type', { unique: false });
          surveyStore.createIndex('year', 'year', { unique: false });
        }

        // Create survey data store
        if (!db.objectStoreNames.contains('surveyData')) {
          console.log('📊 Creating surveyData object store...');
          const dataStore = db.createObjectStore('surveyData', { keyPath: 'id' });
          dataStore.createIndex('surveyId', 'surveyId', { unique: false });
          dataStore.createIndex('specialty', 'specialty', { unique: false });
        }

        // Create specialty mappings store
        if (!db.objectStoreNames.contains('specialtyMappings')) {
          console.log('📊 Creating specialtyMappings object store...');
          const mappingStore = db.createObjectStore('specialtyMappings', { keyPath: 'id' });
          mappingStore.createIndex('standardizedName', 'standardizedName', { unique: false });
        }

        // Create specialty mapping sources store
        if (!db.objectStoreNames.contains('specialtyMappingSources')) {
          const sourceStore = db.createObjectStore('specialtyMappingSources', { keyPath: 'id' });
          sourceStore.createIndex('mappingId', 'mappingId', { unique: false });
        }

        // Create learned specialty mappings store
        if (!db.objectStoreNames.contains('learnedSpecialtyMappings')) {
          const learnedStore = db.createObjectStore('learnedSpecialtyMappings', { keyPath: 'original' });
          learnedStore.createIndex('corrected', 'corrected', { unique: false });
        }

        // Create learned provider type mappings store
        if (!db.objectStoreNames.contains('learnedProviderTypeMappings')) {
          const learnedProviderTypeStore = db.createObjectStore('learnedProviderTypeMappings', { keyPath: 'original' });
          learnedProviderTypeStore.createIndex('corrected', 'corrected', { unique: false });
        }

        // Create blend templates store
        if (!db.objectStoreNames.contains('blendTemplates')) {
          const blendTemplatesStore = db.createObjectStore('blendTemplates', { keyPath: 'id' });
          blendTemplatesStore.createIndex('name', 'name', { unique: false });
          blendTemplatesStore.createIndex('createdBy', 'createdBy', { unique: false });
          blendTemplatesStore.createIndex('isPublic', 'isPublic', { unique: false });
        }
        
        console.log('✅ Force upgrade: Database upgrade completed, all object stores created');
      };
    });
  }

  // Survey Methods
  /**
   * Migrate old survey structure to new structure with dataCategory and source fields
   * Handles backward compatibility for surveys created before the dataCategory architecture
   */
  private migrateSurveyStructure(survey: Survey): Survey {
    // If already migrated (has dataCategory), return as-is
    if ((survey as any).dataCategory) {
      return survey;
    }

    const migratedSurvey = { ...survey } as any;
    const surveyType = survey.type || '';
    const surveyProviderType = survey.providerType || '';

    // Case 1: Old surveys with providerType = 'CALL'
    if (surveyProviderType === 'CALL') {
      migratedSurvey.dataCategory = 'CALL_PAY';
      // Extract source from type string (e.g., "MGMA Call Pay" → "MGMA")
      const sourceMatch = surveyType.match(/^([A-Za-z]+)\s+Call\s+Pay/i);
      migratedSurvey.source = sourceMatch ? sourceMatch[1] : this.extractSourceFromType(surveyType);
      // CRITICAL FIX: Preserve 'CALL' as providerType for backward compatibility
      // The new architecture uses dataCategory='CALL_PAY' to identify Call Pay data
      // But we keep providerType='CALL' to maintain existing logic that checks for it
      // In the future, providerType should be PHYSICIAN/APP (who), not CALL (what)
      migratedSurvey.providerType = 'CALL'; // Keep original for backward compatibility
      console.log('🔍 Migrated CALL survey:', {
        id: survey.id,
        oldType: surveyType,
        newSource: migratedSurvey.source,
        newDataCategory: migratedSurvey.dataCategory,
        preservedProviderType: 'CALL'
      });
    }
    // Case 2: Type contains "Call Pay" (even if providerType isn't CALL)
    else if (surveyType.toLowerCase().includes('call pay')) {
      migratedSurvey.dataCategory = 'CALL_PAY';
      // Extract source from type string
      const sourceMatch = surveyType.match(/^([A-Za-z]+)\s+Call\s+Pay/i);
      migratedSurvey.source = sourceMatch ? sourceMatch[1] : this.extractSourceFromType(surveyType);
      // Keep existing providerType
      if (!migratedSurvey.providerType) {
        migratedSurvey.providerType = 'PHYSICIAN'; // Default fallback
      }
      console.log('🔍 Migrated Call Pay survey (from type):', {
        id: survey.id,
        oldType: surveyType,
        newSource: migratedSurvey.source,
        newDataCategory: migratedSurvey.dataCategory
      });
    }
    // Case 3: Type contains "Moonlighting"
    else if (surveyType.toLowerCase().includes('moonlighting')) {
      migratedSurvey.dataCategory = 'MOONLIGHTING';
      migratedSurvey.source = this.extractSourceFromType(surveyType);
      // Keep existing providerType
      if (!migratedSurvey.providerType) {
        migratedSurvey.providerType = 'PHYSICIAN'; // Default fallback
      }
      console.log('🔍 Migrated Moonlighting survey:', {
        id: survey.id,
        oldType: surveyType,
        newSource: migratedSurvey.source,
        newDataCategory: migratedSurvey.dataCategory
      });
    }
    // Case 4: Standard compensation surveys (e.g., "MGMA Physician", "SullivanCotter APP")
    else {
      migratedSurvey.dataCategory = 'COMPENSATION';
      migratedSurvey.source = this.extractSourceFromType(surveyType);
      
      // Try to extract provider type from type string if not already set
      if (!migratedSurvey.providerType) {
        if (surveyType.toLowerCase().includes('app') || surveyType.toLowerCase().includes('advanced practice')) {
          migratedSurvey.providerType = 'APP';
        } else if (surveyType.toLowerCase().includes('physician') || surveyType.toLowerCase().includes('phys')) {
          migratedSurvey.providerType = 'PHYSICIAN';
        } else {
          migratedSurvey.providerType = 'PHYSICIAN'; // Default fallback
        }
      }
      console.log('🔍 Migrated Compensation survey:', {
        id: survey.id,
        oldType: surveyType,
        newSource: migratedSurvey.source,
        newDataCategory: migratedSurvey.dataCategory,
        newProviderType: migratedSurvey.providerType
      });
    }

    return migratedSurvey as Survey;
  }

  /**
   * Extract source (company name) from survey type string
   * Handles formats like "MGMA Physician", "SullivanCotter APP", "MGMA Call Pay", etc.
   */
  private extractSourceFromType(type: string): string {
    if (!type) return 'Unknown';

    // Known survey sources
    const knownSources = ['MGMA', 'SullivanCotter', 'Gallagher', 'ECG', 'AMGA'];
    
    for (const source of knownSources) {
      if (type.toLowerCase().startsWith(source.toLowerCase())) {
        return source;
      }
    }

    // If no known source matches, take first word
    const firstWord = type.split(/\s+/)[0];
    return firstWord || 'Unknown';
  }

  async getAllSurveys(): Promise<Survey[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      // Check if the surveys object store exists
      if (!db.objectStoreNames.contains('surveys')) {
        console.log('🔍 No surveys object store found - returning empty array');
        resolve([]);
        return;
      }

      try {
        const transaction = db.transaction(['surveys'], 'readonly');
        const store = transaction.objectStore('surveys');
        const request = store.getAll();

        request.onerror = () => {
          console.error('❌ Failed to get surveys:', request.error);
          resolve([]); // Return empty array instead of rejecting
        };
        request.onsuccess = () => {
          const surveys = request.result || [];
          
          // Apply migration on-the-fly for backward compatibility
          const migratedSurveys = surveys.map(survey => this.migrateSurveyStructure(survey));
          
          resolve(migratedSurveys);
        };
      } catch (error) {
        console.error('❌ Transaction error in getAllSurveys:', error);
        resolve([]); // Return empty array instead of rejecting
      }
    });
  }

  async createSurvey(survey: Survey): Promise<Survey> {
    // Validate survey data before write
    const validationResult = safeValidateSurvey(survey);
    if (!validationResult.success) {
      console.error('❌ Survey validation failed:', validationResult.error.issues);
      throw new Error(`Survey validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`);
    }
    
    const validatedSurvey = validationResult.data;
    
    // Use transaction queue to prevent race conditions
    return await this.transactionQueue.queueTransaction(async () => {
      const db = await this.ensureDB();
      const lockId = await this.transactionQueue.acquireLock('surveys', 'readwrite');
      
      try {
        return await new Promise<Survey>((resolve, reject) => {
          // Check if the surveys object store exists
          if (!db.objectStoreNames.contains('surveys')) {
            console.error('❌ No surveys object store found - cannot create survey');
            reject(new Error('Surveys object store not found. Please refresh the page to initialize the database.'));
            return;
          }

          try {
            const transaction = db.transaction(['surveys'], 'readwrite');
            const store = transaction.objectStore('surveys');
            // Convert validated data back to Survey format (with Date objects)
            const surveyToStore: Survey = {
              ...validatedSurvey,
              uploadDate: validatedSurvey.uploadDate instanceof Date ? validatedSurvey.uploadDate : new Date(validatedSurvey.uploadDate),
              metadata: validatedSurvey.metadata || {},
              providerType: validatedSurvey.providerType as ProviderType | undefined,
              dataCategory: validatedSurvey.dataCategory as DataCategory | undefined,
              createdAt: validatedSurvey.createdAt instanceof Date ? validatedSurvey.createdAt : validatedSurvey.createdAt ? new Date(validatedSurvey.createdAt) : undefined,
              updatedAt: validatedSurvey.updatedAt instanceof Date ? validatedSurvey.updatedAt : validatedSurvey.updatedAt ? new Date(validatedSurvey.updatedAt) : undefined
            };
            const request = store.add(surveyToStore);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(surveyToStore);
            
            transaction.oncomplete = () => {
              console.log('✅ Transaction completed: createSurvey');
              // Log audit event
              this.auditLog.logAuditEvent(
                'create',
                'survey',
                surveyToStore.id,
                { name: surveyToStore.name, year: surveyToStore.year, type: surveyToStore.type },
                true
              ).catch(err => console.error('Failed to log audit event:', err));
            };
            
            transaction.onerror = () => {
              console.error('❌ Transaction error in createSurvey:', transaction.error);
              reject(transaction.error);
            };
          } catch (error) {
            console.error('❌ Transaction error in createSurvey:', error);
            reject(error);
          }
        });
      } finally {
        this.transactionQueue.releaseLock('surveys', 'readwrite', lockId);
      }
    }, 'high');
  }

  async deleteSurvey(id: string): Promise<void> {
    console.log('🗑️ IndexedDBService: Starting delete survey:', id);
    
    // First, verify the survey exists
    const survey = await this.getSurveyById(id);
    if (!survey) {
      console.warn(`⚠️ IndexedDBService: Survey ${id} not found - may have already been deleted`);
      // Don't throw error - idempotent delete is acceptable
      return;
    }
    
    console.log(`🗑️ IndexedDBService: Found survey to delete: ${survey.name} (${survey.year})`);
    
    // Use transaction queue to prevent race conditions
    return await this.transactionQueue.queueTransaction(async () => {
      const db = await this.ensureDB();
      const lockId = await this.transactionQueue.acquireLock('surveys', 'readwrite');
      
      try {
        return await new Promise<void>((resolve, reject) => {
        // Set up timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.error('❌ IndexedDBService: Delete survey timed out after 5 seconds');
          reject(new Error('Delete survey operation timed out after 5 seconds'));
        }, 5000);
        
        // Include cache store in transaction to clear analytics cache
        const transaction = db.transaction(['surveys', 'surveyData', 'cache'], 'readwrite');
        
        // Delete survey
        const surveyStore = transaction.objectStore('surveys');
        const surveyDeleteRequest = surveyStore.delete(id);
        
        // Delete associated data
        const dataStore = transaction.objectStore('surveyData');
        const dataIndex = dataStore.index('surveyId');
        const dataRequest = dataIndex.openCursor(IDBKeyRange.only(id));
        
        // Clear analytics cache since data has changed
        const cacheStore = transaction.objectStore('cache');
        const cacheClearRequest = cacheStore.clear();
        
        let dataDeletedCount = 0;
        let hasError = false;
        let errorMessage = '';
        
        // Track completion of individual operations
        let surveyDeleteStarted = false;
        let dataDeletionStarted = false;
        let cacheClearStarted = false;
        
        surveyDeleteRequest.onsuccess = () => {
          console.log('✅ IndexedDBService: Survey record delete request queued');
          surveyDeleteStarted = true;
        };
        
        surveyDeleteRequest.onerror = () => {
          console.error('❌ IndexedDBService: Failed to delete survey record:', surveyDeleteRequest.error);
          hasError = true;
          errorMessage = `Failed to delete survey record: ${surveyDeleteRequest.error?.message || 'Unknown error'}`;
        };

        dataRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            dataDeletionStarted = true;
            const deleteRequest = dataStore.delete(cursor.primaryKey);
            deleteRequest.onsuccess = () => {
              dataDeletedCount++;
            };
            deleteRequest.onerror = () => {
              console.error('❌ IndexedDBService: Failed to delete data row:', deleteRequest.error);
              hasError = true;
              errorMessage = `Failed to delete data row: ${deleteRequest.error?.message || 'Unknown error'}`;
            };
            cursor.continue();
          } else {
            // No more data to delete - cursor finished
            dataDeletionStarted = true;
            console.log(`✅ IndexedDBService: Cursor finished - ${dataDeletedCount} data rows queued for deletion`);
          }
        };
        
        dataRequest.onerror = () => {
          console.error('❌ IndexedDBService: Failed to open cursor for survey data:', dataRequest.error);
          hasError = true;
          errorMessage = `Failed to open cursor: ${dataRequest.error?.message || 'Unknown error'}`;
        };
        
        cacheClearRequest.onsuccess = () => {
          console.log('✅ IndexedDBService: Cache clear request queued');
          cacheClearStarted = true;
        };
        
        cacheClearRequest.onerror = () => {
          console.error('❌ IndexedDBService: Failed to clear cache:', cacheClearRequest.error);
          hasError = true;
          errorMessage = `Failed to clear cache: ${cacheClearRequest.error?.message || 'Unknown error'}`;
        };

        // Wait for transaction to complete - this ensures all operations are committed
        transaction.oncomplete = () => {
          console.log('✅ IndexedDBService: Delete survey transaction completed');
          
          if (hasError) {
            clearTimeout(timeoutId);
            reject(new Error(errorMessage));
            return;
          }
          
          // Verify deletion was successful by checking if survey still exists
          const verifyTransaction = db.transaction(['surveys'], 'readonly');
          const verifyStore = verifyTransaction.objectStore('surveys');
          const verifyRequest = verifyStore.get(id);
          
          verifyRequest.onsuccess = () => {
            if (verifyRequest.result) {
              console.warn('⚠️ IndexedDBService: Survey still exists after deletion - this may indicate a problem');
              // Don't reject - the delete request succeeded, so it might be a timing issue
            }
            clearTimeout(timeoutId);
            console.log(`✅ IndexedDBService: Survey ${id} deleted successfully (${dataDeletedCount} data rows removed, cache cleared)`);
            resolve();
          };
          
          verifyRequest.onerror = () => {
            // Verification failed, but deletion might have succeeded
            console.warn('⚠️ IndexedDBService: Could not verify deletion, but transaction completed');
            clearTimeout(timeoutId);
            resolve();
          };
        };
        
        transaction.onerror = () => {
          console.error('❌ IndexedDBService: Delete survey transaction failed:', transaction.error);
          clearTimeout(timeoutId);
          reject(transaction.error || new Error('Transaction failed'));
        };
        });
      } finally {
        this.transactionQueue.releaseLock('surveys', 'readwrite', lockId);
      }
    }, 'high');
  }

  /**
   * Delete survey with verification and cascading cleanup
   * ENTERPRISE FIX: Properly waits for all cursor operations to complete
   */
  async deleteWithVerification(surveyId: string): Promise<{
    success: boolean;
    deletedSurvey: boolean;
    deletedDataRows: number;
    deletedMappings: number;
    error?: string;
  }> {
    try {
      console.log(`🗑️ Starting cascading delete for survey: ${surveyId}`);
      
      // Get survey info before deletion for verification
      const survey = await this.getSurveyById(surveyId);
      if (!survey) {
        return {
          success: false,
          deletedSurvey: false,
          deletedDataRows: 0,
          deletedMappings: 0,
          error: 'Survey not found'
        };
      }

      const db = await this.ensureDB();
      
      // ENTERPRISE FIX: Use Promise-based pattern to ensure all cursor operations complete
      // This ensures the transaction doesn't complete until all deletions are done
      return new Promise((resolve) => {
        // Start transaction for atomic deletion
        const transaction = db.transaction([
          'surveys', 
          'surveyData', 
          'specialtyMappings', 
          'columnMappings',
          'variableMappings',
          'regionMappings',
          'providerTypeMappings'
        ], 'readwrite');

        let deletedDataRows = 0;
        let deletedMappings = 0;
        let hasError = false;
        let errorMessage = '';
        let cursorComplete = false;
        let surveyDeleteComplete = false;
        let mappingsDeleteComplete = false;

        // Helper to check if all operations are complete
        const checkCompletion = () => {
          if (cursorComplete && surveyDeleteComplete && mappingsDeleteComplete) {
            if (hasError) {
              console.error(`❌ Cascading delete failed: ${errorMessage}`);
              resolve({
                success: false,
                deletedSurvey: false,
                deletedDataRows,
                deletedMappings,
                error: errorMessage
              });
            } else {
              console.log(`✅ Cascading delete completed: ${deletedDataRows} data rows, ${deletedMappings} mappings deleted`);
              resolve({
                success: true,
                deletedSurvey: true,
                deletedDataRows,
                deletedMappings,
              });
            }
          }
        };

        // Delete survey data using cursor - ENTERPRISE: Wait for all cursor operations
        const dataStore = transaction.objectStore('surveyData');
        const dataIndex = dataStore.index('surveyId');
        const dataRequest = dataIndex.openCursor(IDBKeyRange.only(surveyId));

        dataRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const deleteRequest = dataStore.delete(cursor.primaryKey);
            deleteRequest.onsuccess = () => {
              deletedDataRows++;
            };
            deleteRequest.onerror = () => {
              hasError = true;
              errorMessage = 'Failed to delete survey data row';
            };
            cursor.continue();
          } else {
            // Cursor iteration complete
            cursorComplete = true;
            checkCompletion();
          }
        };

        dataRequest.onerror = () => {
          hasError = true;
          errorMessage = 'Failed to open cursor for survey data deletion';
          cursorComplete = true;
          checkCompletion();
        };

        // Delete survey metadata
        const surveyStore = transaction.objectStore('surveys');
        const surveyDeleteRequest = surveyStore.delete(surveyId);
        
        surveyDeleteRequest.onsuccess = () => {
          surveyDeleteComplete = true;
          checkCompletion();
        };
        
        surveyDeleteRequest.onerror = () => {
          hasError = true;
          errorMessage = 'Failed to delete survey';
          surveyDeleteComplete = true;
          checkCompletion();
        };

        // Delete related mappings - ENTERPRISE: Delete from all mapping stores
        const mappingStores = [
          { name: 'specialtyMappings', index: 'surveyId' },
          { name: 'columnMappings', index: 'surveyId' },
          { name: 'variableMappings', index: 'surveyId' },
          { name: 'regionMappings', index: 'surveyId' },
          { name: 'providerTypeMappings', index: 'surveyId' }
        ];

        let mappingsProcessed = 0;
        const totalMappingStores = mappingStores.length;

        mappingStores.forEach(({ name, index }) => {
          if (!transaction.objectStoreNames.contains(name)) {
            mappingsProcessed++;
            if (mappingsProcessed === totalMappingStores) {
              mappingsDeleteComplete = true;
              checkCompletion();
            }
            return;
          }

          const mappingStore = transaction.objectStore(name);
          if (!mappingStore.indexNames.contains(index)) {
            mappingsProcessed++;
            if (mappingsProcessed === totalMappingStores) {
              mappingsDeleteComplete = true;
              checkCompletion();
            }
            return;
          }

          const mappingIndex = mappingStore.index(index);
          const mappingRequest = mappingIndex.openCursor(IDBKeyRange.only(surveyId));

          mappingRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              const deleteRequest = mappingStore.delete(cursor.primaryKey);
              deleteRequest.onsuccess = () => {
                deletedMappings++;
              };
              deleteRequest.onerror = () => {
                console.warn(`⚠️ Failed to delete mapping from ${name}`);
              };
              cursor.continue();
            } else {
              // This mapping store cursor complete
              mappingsProcessed++;
              if (mappingsProcessed === totalMappingStores) {
                mappingsDeleteComplete = true;
                checkCompletion();
              }
            }
          };

          mappingRequest.onerror = () => {
            console.warn(`⚠️ Failed to open cursor for ${name} deletion`);
            mappingsProcessed++;
            if (mappingsProcessed === totalMappingStores) {
              mappingsDeleteComplete = true;
              checkCompletion();
            }
          };
        });

        // Handle transaction errors
        transaction.onerror = () => {
          console.error(`❌ Transaction failed:`, transaction.error);
          hasError = true;
          errorMessage = transaction.error?.message || 'Transaction failed';
          // Mark all as complete to resolve
          cursorComplete = true;
          surveyDeleteComplete = true;
          mappingsDeleteComplete = true;
          checkCompletion();
        };

        // ENTERPRISE: Also handle transaction abort (timeout or other issues)
        transaction.onabort = () => {
          console.error(`❌ Transaction aborted`);
          hasError = true;
          errorMessage = 'Transaction was aborted';
          cursorComplete = true;
          surveyDeleteComplete = true;
          mappingsDeleteComplete = true;
          checkCompletion();
        };
      });

    } catch (error) {
      console.error(`❌ Delete with verification failed:`, error);
      return {
        success: false,
        deletedSurvey: false,
        deletedDataRows: 0,
        deletedMappings: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cascade delete all related data for a survey
   */
  async cascadeDelete(surveyId: string): Promise<{
    success: boolean;
    deletedItems: {
      survey: boolean;
      dataRows: number;
      specialtyMappings: number;
      columnMappings: number;
      variableMappings: number;
      regionMappings: number;
      providerTypeMappings: number;
    };
    errors: string[];
  }> {
    const deletedItems = {
      survey: false,
      dataRows: 0,
      specialtyMappings: 0,
      columnMappings: 0,
      variableMappings: 0,
      regionMappings: 0,
      providerTypeMappings: 0
    };
    const errors: string[] = [];

    try {
      console.log(`🗑️ Starting cascade delete for survey: ${surveyId}`);

      // Delete survey data
      try {
        const { rows } = await this.getSurveyData(surveyId);
        deletedItems.dataRows = rows.length;
      } catch (error) {
        errors.push(`Failed to count data rows: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Delete survey
      try {
        await this.deleteSurvey(surveyId);
        deletedItems.survey = true;
      } catch (error) {
        errors.push(`Failed to delete survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Note: In a real implementation, you would also delete related mappings
      // This would require more complex queries to find mappings that reference this survey

      const success = errors.length === 0 && deletedItems.survey;

      console.log(`✅ Cascade delete completed:`, { deletedItems, errors });

      return {
        success,
        deletedItems,
        errors
      };

    } catch (error) {
      console.error(`❌ Cascade delete failed:`, error);
      errors.push(`Cascade delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        deletedItems,
        errors
      };
    }
  }

  /**
   * Force clear entire IndexedDB database (nuclear option)
   * Use this if deleteAllSurveys fails or times out
   */
  async forceClearDatabase(): Promise<void> {
    console.log('💥 IndexedDBService: Force clearing entire database...');
    
    try {
      // Close existing connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      // Delete the entire database
      const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME);
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.error('❌ IndexedDBService: Force clear timed out after 5 seconds');
          reject(new Error('Force clear operation timed out after 5 seconds'));
        }, 5000);
        
        deleteRequest.onsuccess = () => {
          clearTimeout(timeoutId);
          console.log('✅ IndexedDBService: Database force cleared successfully');
          // Reinitialize the database
          this.ensureDB().then(() => {
            console.log('✅ IndexedDBService: Database reinitialized after force clear');
            resolve();
          }).catch(reject);
        };
        
        deleteRequest.onerror = () => {
          clearTimeout(timeoutId);
          console.error('❌ IndexedDBService: Failed to force clear database:', deleteRequest.error);
          reject(deleteRequest.error);
        };
        
        deleteRequest.onblocked = () => {
          console.warn('⚠️ IndexedDBService: Database deletion blocked - close other tabs');
          // Still resolve as the database will be cleared when the last tab closes
          clearTimeout(timeoutId);
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ IndexedDBService: Error in forceClearDatabase:', error);
      throw error;
    }
  }

  async deleteAllSurveys(): Promise<void> {
    console.log('🗑️ IndexedDBService: Starting delete all surveys...');
    
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        // Set up timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.error('❌ IndexedDBService: Delete all surveys timed out after 10 seconds');
          reject(new Error('Delete operation timed out after 10 seconds'));
        }, 10000); // 10 second timeout instead of 15
        
        // Include cache store in transaction to clear analytics cache
        const transaction = db.transaction(['surveys', 'surveyData', 'cache'], 'readwrite');
        
        const surveyStore = transaction.objectStore('surveys');
        const dataStore = transaction.objectStore('surveyData');
        const cacheStore = transaction.objectStore('cache');
        
        console.log('🗑️ IndexedDBService: Clearing surveys table...');
        const surveyClearRequest = surveyStore.clear();
        
        console.log('🗑️ IndexedDBService: Clearing surveyData table...');
        const dataClearRequest = dataStore.clear();
        
        console.log('🗑️ IndexedDBService: Clearing analytics cache...');
        const cacheClearRequest = cacheStore.clear();
        
        let completedOperations = 0;
        const totalOperations = 3;
        
        const checkCompletion = () => {
          completedOperations++;
          if (completedOperations === totalOperations) {
            clearTimeout(timeoutId);
            console.log('✅ IndexedDBService: All surveys and cache deleted successfully');
            resolve();
          }
        };
        
        surveyClearRequest.onsuccess = () => {
          console.log('✅ IndexedDBService: Surveys table cleared');
          checkCompletion();
        };
        
        surveyClearRequest.onerror = () => {
          console.error('❌ IndexedDBService: Failed to clear surveys table:', surveyClearRequest.error);
          clearTimeout(timeoutId);
          reject(surveyClearRequest.error);
        };
        
        dataClearRequest.onsuccess = () => {
          console.log('✅ IndexedDBService: SurveyData table cleared');
          checkCompletion();
        };
        
        dataClearRequest.onerror = () => {
          console.error('❌ IndexedDBService: Failed to clear surveyData table:', dataClearRequest.error);
          clearTimeout(timeoutId);
          reject(dataClearRequest.error);
        };
        
        cacheClearRequest.onsuccess = () => {
          console.log('✅ IndexedDBService: Analytics cache cleared');
          checkCompletion();
        };
        
        cacheClearRequest.onerror = () => {
          console.error('❌ IndexedDBService: Failed to clear cache table:', cacheClearRequest.error);
          clearTimeout(timeoutId);
          reject(cacheClearRequest.error);
        };
        
        transaction.oncomplete = () => {
          console.log('✅ IndexedDBService: Delete transaction completed');
        };
        
        transaction.onerror = () => {
          console.error('❌ IndexedDBService: Delete transaction failed:', transaction.error);
          clearTimeout(timeoutId);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('❌ IndexedDBService: Error in deleteAllSurveys:', error);
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
    try {
      console.log('📤 IndexedDBService: Starting survey upload:', {
        fileName: file.name,
        surveyName,
        surveyYear,
        surveyType,
        providerType,
        fileSize: file.size
      });

      // Parse CSV file with encoding detection and normalization
      const { text, encoding, issues, normalized } = await readCSVFile(file);
      
      if (issues.length > 0) {
        console.warn('📤 IndexedDBService: Encoding issues detected:', issues);
      }
      if (normalized) {
        console.log('📤 IndexedDBService: Character normalization applied');
      }
      
      const rows = this.parseCSV(text);
      
      console.log('📊 IndexedDBService: Parsed CSV data:', {
        rowCount: rows.length,
        firstRowKeys: rows.length > 0 ? Object.keys(rows[0]) : [],
        sampleData: rows.length > 0 ? rows[0] : null
      });

      // Extract provider types from data for better detection
      const uniqueProviderTypes = new Set(
        rows
          .map(row => row.providerType || row['Provider Type'] || row.provider_type)
          .filter(Boolean)
      );
      
      const detectedProviderTypes = Array.from(uniqueProviderTypes);
      console.log('🔍 IndexedDBService: Detected provider types in data:', detectedProviderTypes);
      
      // Use detected provider type if available, otherwise fall back to form selection
      const effectiveProviderType = detectedProviderTypes.length > 0 
        ? detectedProviderTypes[0] // Use first detected type as primary
        : providerType; // Fall back to form selection

      // Create survey record
      const surveyId = crypto.randomUUID();
      const survey = {
        id: surveyId,
        name: surveyName,
        year: surveyYear.toString(),
        type: surveyType,
        providerType: effectiveProviderType, // Use detected provider type
        uploadDate: new Date(),
        rowCount: rows.length,
        specialtyCount: 0, // Will be calculated
        dataPoints: rows.length,
        colorAccent: '#6366F1',
        metadata: {
          detectedProviderTypes: detectedProviderTypes,
          formProviderType: providerType
        }
      };

      console.log('💾 IndexedDBService: Creating survey record:', {
        ...survey,
        year: survey.year,
        yearType: typeof survey.year,
        providerType: survey.providerType
      });

      // Save survey
      await this.createSurvey(survey);
      console.log('✅ IndexedDBService: Survey record created successfully:', {
        surveyId: survey.id,
        year: survey.year,
        providerType: survey.providerType
      });
      
      // Save survey data
      console.log('💾 IndexedDBService: Saving survey data...');
      await this.saveSurveyData(surveyId, rows);
      console.log('✅ IndexedDBService: Survey data saved successfully');
      
      // Calculate specialty count
      const uniqueSpecialties = new Set<string>();
      rows.forEach((row: any) => {
        const specialty = row.specialty || row.Specialty || row['Provider Type'];
        if (specialty) uniqueSpecialties.add(specialty);
      });
      
      console.log('🔍 IndexedDBService: Calculated specialties:', {
        uniqueSpecialties: Array.from(uniqueSpecialties),
        specialtyCount: uniqueSpecialties.size
      });
      
      // Update survey with specialty count
      const updatedSurvey = { ...survey, specialtyCount: uniqueSpecialties.size };
      await this.updateSurvey(updatedSurvey);
      console.log('✅ IndexedDBService: Survey updated with specialty count');

      console.log('🎉 IndexedDBService: Survey upload completed successfully:', {
        surveyId,
        rowCount: rows.length,
        specialtyCount: uniqueSpecialties.size
      });

      return { surveyId, rowCount: rows.length };
    } catch (error) {
      throw error;
    }
  }

  private parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim()); // Remove empty lines
    if (lines.length === 0) return [];
    
    
    // Parse headers from first line using proper CSV parsing
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows - start from index 1 (skip header row)
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }
    
    if (rows.length > 0) {
    }
    
    return rows;
  }

  private async updateSurvey(survey: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');
      const request = store.put(survey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Survey Data Methods
  async getSurveyData(surveyId: string, filters: any = {}, pagination: any = {}): Promise<{ rows: ISurveyRow[] }> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveyData'], 'readonly');
      const store = transaction.objectStore('surveyData');
      const index = store.index('surveyId');
      const request = index.getAll(IDBKeyRange.only(surveyId));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result || [];
        
        // Apply filters to the data
        let filteredData = data;
        
        if (filters && Object.keys(filters).length > 0) {
          
          filteredData = data.filter((item: SurveyData) => {
            // Filter by specialty - EXACT MATCH ONLY
            if (filters.specialty && filters.specialty.trim() !== '') {
              const itemSpecialty = item.specialty || item.data?.specialty || item.data?.Specialty || '';
              if (itemSpecialty.toLowerCase() !== filters.specialty.toLowerCase()) {
                return false;
              }
            }
            
            // Filter by provider type - EXACT MATCH ONLY
            if (filters.providerType && filters.providerType.trim() !== '') {
              const itemProviderType = item.providerType || item.data?.providerType || item.data?.['Provider Type'] || item.data?.provider_type || '';
                // Provider type filter logging removed for performance
              if (itemProviderType.toLowerCase() !== filters.providerType.toLowerCase()) {
                return false;
              }
            }
            
            // Filter by region - EXACT MATCH ONLY
            if (filters.region && filters.region.trim() !== '') {
              const itemRegion = item.region || item.data?.region || item.data?.Region || item.data?.geographic_region || '';
              if (itemRegion.toLowerCase() !== filters.region.toLowerCase()) {
                return false;
              }
            }
            
            // Filter by variable - EXACT MATCH ONLY
            if (filters.variable && filters.variable.trim() !== '') {
              const itemVariable = item.variable || item.data?.variable || '';
                // Variable filter logging removed for performance
              if (itemVariable.toLowerCase() !== filters.variable.toLowerCase()) {
                return false;
              }
            }
            
            return true;
          });
          
          
          // Debug: Show what specialties actually exist in the data
          if (data.length > 0) {
            
            // Debug: Show the actual data structure
            if (data.length > 0) {
              if (data[0].data) {
              }
            }
          }
        }
        
        const rows = filteredData.map((item: SurveyData) => {
          const rowData = { ...item.data };
          return {
            ...rowData,
            id: item.id,
            surveyId: item.surveyId
          } as ISurveyRow;
        });
        
        if (rows.length > 0) {
        }
        
        // Filter out any rows that look like headers
        const filteredRows = rows.filter(row => {
          const values = Object.values(row).filter(val => val !== row.id && val !== row.surveyId);
          
          // Check if this row contains header-like values
          const headerKeywords = [
            'specialty', 'provider_type', 'geographic_region', 'variable', 
            'n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90',
            'tcc', 'wrvu', 'cf', 'providerType', 'geographicRegion'
          ];
          
          // For normalized format data, be more careful about filtering
          // Only filter out rows where ALL values are header keywords (exact matches)
          const headerMatches = values.filter(val => 
            typeof val === 'string' && 
            headerKeywords.some(keyword => 
              val.toLowerCase() === keyword.toLowerCase()
            )
          ).length;
          
          // Only filter out if ALL values are exact header matches
          // This prevents filtering out legitimate data like "Work RVUs" in the variable column
          const isHeaderRow = headerMatches === values.length && values.length > 0;
          
          if (isHeaderRow) {
          }
          
          return !isHeaderRow;
        });
        
        if (filteredRows.length > 0) {
        }
        
        resolve({ rows: filteredRows });
      };
    });
  }

  async saveSurveyData(surveyId: string, rows: any[], onProgress?: (percent: number) => void): Promise<void> {
    const db = await this.ensureDB();
    
    // Check if the surveyData object store exists
    if (!db.objectStoreNames.contains('surveyData')) {
      throw new Error('SurveyData object store not found. Please refresh the page to initialize the database.');
    }

    // Optimized: Use chunked batch writes for better performance
    // IndexedDB performs better with smaller transactions (1000-2000 rows per batch)
    const batchSize = 2000;
    const totalBatches = Math.ceil(rows.length / batchSize);
    let completedBatches = 0;

    console.log(`💾 IndexedDBService: Saving ${rows.length} rows in ${totalBatches} batches (${batchSize} rows per batch)...`);

    const startTime = Date.now();

    // Process batches sequentially to avoid overwhelming IndexedDB
    // But use Promise-based transactions for better performance
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      await this.transactionQueue.queueTransaction(async () => {
        const lockId = await this.transactionQueue.acquireLock('surveyData', 'readwrite');
        
        try {
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(['surveyData'], 'readwrite');
            const store = transaction.objectStore('surveyData');

            chunk.forEach((row, chunkIndex) => {
              const globalIndex = i + chunkIndex;
              const surveyData: SurveyData = {
                id: `${surveyId}_${globalIndex}`,
                surveyId,
                data: row,
                specialty: row.specialty || row.Specialty || row['Provider Type'],
                providerType: row.providerType || row['Provider Type'] || row.provider_type,
                region: row.region || row.Region || row.geographic_region,
                tcc: row.tcc || row.TCC,
                cf: row.cf || row.CF,
                wrvu: row.wrvu || row.wRVU,
                // Store percentile-specific compensation data
                tcc_p25: row.tcc_p25,
                tcc_p50: row.tcc_p50,
                tcc_p75: row.tcc_p75,
                tcc_p90: row.tcc_p90,
                cf_p25: row.cf_p25,
                cf_p50: row.cf_p50,
                cf_p75: row.cf_p75,
                cf_p90: row.cf_p90,
                wrvu_p25: row.wrvu_p25,
                wrvu_p50: row.wrvu_p50,
                wrvu_p75: row.wrvu_p75,
                wrvu_p90: row.wrvu_p90,
                n_orgs: row.n_orgs,
                n_incumbents: row.n_incumbents
              };
              store.add(surveyData);
            });

            transaction.oncomplete = () => {
              completedBatches++;
              const progress = Math.round((completedBatches / totalBatches) * 100);
              
              if (onProgress) {
                onProgress(progress);
              }
              
              const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log(`✅ IndexedDBService: Batch ${batchNumber}/${totalBatches} saved (${progress}% complete, ${elapsedSeconds}s elapsed)`);
              
              resolve();
            };
            
            transaction.onerror = () => {
              console.error(`❌ Transaction error in saveSurveyData batch ${batchNumber}:`, transaction.error);
              reject(transaction.error);
            };
          });
        } finally {
          this.transactionQueue.releaseLock('surveyData', 'readwrite', lockId);
        }
      }, 'high');
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ IndexedDBService: All ${rows.length} rows saved successfully in ${totalElapsed}s`);
    
    if (onProgress) {
      onProgress(100);
    }
  }

  // Specialty Mapping Methods
  async getAllSpecialtyMappings(providerType?: string): Promise<ISpecialtyMapping[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialtyMappings', 'specialtyMappingSources'], 'readonly');
      const mappingStore = transaction.objectStore('specialtyMappings');
      const sourceStore = transaction.objectStore('specialtyMappingSources');
      
      const mappingRequest = mappingStore.getAll();
      
      mappingRequest.onerror = () => reject(mappingRequest.error);
      mappingRequest.onsuccess = () => {
        const mappings = mappingRequest.result || [];
        
        // Get sources for each mapping
        const mappingPromises = mappings.map(async (mapping) => {
          const sources = await new Promise<any[]>((resolve, reject) => {
            const sourceIndex = sourceStore.index('mappingId');
            const sourceRequest = sourceIndex.getAll(IDBKeyRange.only(mapping.id));
            sourceRequest.onerror = () => reject(sourceRequest.error);
            sourceRequest.onsuccess = () => resolve(sourceRequest.result || []);
          });

          return {
            ...mapping,
            sourceSpecialties: sources
          };
        });

        Promise.all(mappingPromises).then((results) => {
          
          // ENTERPRISE DEBUG: Log all mappings before filtering - removed for performance
          
          // Filter by provider type if specified
          // Handle special 'EXCLUDE_CALL_PAY' flag to exclude Call Pay surveys
          if (providerType) {
            // Get all surveys to determine which survey sources belong to the specified provider type
            this.getAllSurveys().then(async (surveys) => {
              let surveysByProviderType;
              if (providerType === 'CALL') {
                // For CALL view: Show only Call Pay surveys
                surveysByProviderType = surveys.filter(survey => this.isCallPaySurvey(survey));
              } else if (providerType === 'PHYSICIAN') {
                // For PHYSICIAN view: Include only PHYSICIAN compensation surveys, exclude CALL_PAY, MOONLIGHTING, and APP
                // Moonlighting is a separate survey type, just like Call Pay
                surveysByProviderType = surveys.filter(survey => {
                  const isCallPay = this.isCallPaySurvey(survey);
                  const isMoonlighting = this.isMoonlightingSurvey(survey);
                  const effectiveProviderType = this.getEffectiveProviderType(survey);
                  return (effectiveProviderType === 'PHYSICIAN') && 
                         !isCallPay && 
                         !isMoonlighting &&
                         this.isCompensationSurvey(survey);
                });
              } else if (providerType === 'APP') {
                // For APP view: Include only APP surveys, exclude CALL_PAY, MOONLIGHTING, and PHYSICIAN
                surveysByProviderType = surveys.filter(survey => {
                  const isCallPay = this.isCallPaySurvey(survey);
                  const isMoonlighting = this.isMoonlightingSurvey(survey);
                  const effectiveProviderType = this.getEffectiveProviderType(survey);
                  return (effectiveProviderType === 'APP') && 
                         !isCallPay && 
                         !isMoonlighting;
                });
              } else {
                // For CUSTOM or other types: Match providerType exactly
                surveysByProviderType = surveys.filter(survey => {
                  const effectiveProviderType = this.getEffectiveProviderType(survey);
                  return effectiveProviderType === providerType || survey.providerType === providerType;
                });
              }
              const validSurveySources = new Set(surveysByProviderType.map(s => s.type || s.name));
              
              // ENTERPRISE DEBUG: Log filtering details for each mapping - removed for performance
              
              // Filter mappings based on which survey sources they belong to
              const filtered = results.filter((mapping: any) => {
                // Check if any source specialty comes from a survey source with the correct provider type
                const hasValidSource = mapping.sourceSpecialties.some((source: any) => {
                  return validSurveySources.has(source.surveySource);
                });
                
                // ENTERPRISE DEBUG: Check for MGMA mappings specifically
                const hasMGMASource = mapping.sourceSpecialties.some((source: any) => {
                  return source.surveySource === 'MGMA Physician';
                });
                
                if (hasMGMASource) {
                    // Mapping filter logging removed for performance
                }
                
                return hasValidSource;
              });
              
              // Filtered mappings logging removed for performance
            resolve(filtered);
            }).catch(reject);
          } else {
            resolve(results);
          }
        }).catch(reject);
      };
    });
  }

  async createSpecialtyMapping(mapping: ISpecialtyMapping): Promise<ISpecialtyMapping> {
    // Validate mapping data before write
    const validationResult = safeValidateSpecialtyMapping(mapping);
    if (!validationResult.success) {
      console.error('❌ Specialty mapping validation failed:', validationResult.error.issues);
      throw new Error(`Specialty mapping validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`);
    }
    
    const validatedMapping = validationResult.data;
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialtyMappings', 'specialtyMappingSources'], 'readwrite');
      const mappingStore = transaction.objectStore('specialtyMappings');
      const sourceStore = transaction.objectStore('specialtyMappingSources');

      // Save mapping (use validated mapping)
      // Cast sourceSpecialties to ensure proper typing (schema validates as string but interface expects SurveySource)
      const mappingToStore: ISpecialtyMapping = {
        ...validatedMapping,
        providerType: validatedMapping.providerType as 'PHYSICIAN' | 'APP' | undefined,
        sourceSpecialties: validatedMapping.sourceSpecialties.map(source => ({
          ...source,
          surveySource: source.surveySource as any // Schema validates as string, but interface expects SurveySource enum
        })),
        createdAt: validatedMapping.createdAt instanceof Date ? validatedMapping.createdAt : new Date(validatedMapping.createdAt),
        updatedAt: validatedMapping.updatedAt instanceof Date ? validatedMapping.updatedAt : new Date(validatedMapping.updatedAt)
      };
      mappingStore.add(mappingToStore);
      
      // Save sources
      validatedMapping.sourceSpecialties.forEach((source: any) => {
        sourceStore.add({
          ...source,
          mappingId: validatedMapping.id
        });
      });

      transaction.oncomplete = () => resolve(mappingToStore);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteSpecialtyMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialtyMappings', 'specialtyMappingSources'], 'readwrite');
      const mappingStore = transaction.objectStore('specialtyMappings');
      const sourceStore = transaction.objectStore('specialtyMappingSources');

      // Delete mapping
      mappingStore.delete(id);

      // Delete sources
      const sourceIndex = sourceStore.index('mappingId');
      const sourceRequest = sourceIndex.openCursor(IDBKeyRange.only(id));

      sourceRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          sourceStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }


  // Column Mapping Methods
  async getAllColumnMappings(providerType?: string): Promise<IColumnMapping[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readonly');
      const store = transaction.objectStore('columnMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let mappings = request.result || [];
        
        // Filter by provider type if specified
        if (providerType) {
          
          // Get all surveys to determine which survey sources belong to this provider type
          this.getAllSurveys().then(surveys => {
            const validSurveySources = new Set<string>();
            surveys.forEach(survey => {
              if (survey.providerType === providerType) {
                validSurveySources.add(survey.name);
                validSurveySources.add(survey.type);
              }
            });
            
            
            // Filter mappings to only include those with source columns from valid survey sources
            const filteredMappings = mappings.filter(mapping => {
              const hasValidSource = mapping.sourceColumns.some((source: any) => 
                validSurveySources.has(source.surveySource)
              );
              
              if (!hasValidSource) {
              }
              
              return hasValidSource;
            });
            
            resolve(filteredMappings);
          }).catch(err => {
            resolve(mappings); // Fallback to all mappings
          });
        } else {
          resolve(mappings);
        }
      };
    });
  }

  async createColumnMapping(mapping: IColumnMapping): Promise<IColumnMapping> {
    // Validate mapping data before write
    const validationResult = validateColumnMapping(mapping);
    if (!validationResult) {
      throw new Error('Column mapping validation failed');
    }
    
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readwrite');
      const store = transaction.objectStore('columnMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteColumnMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readwrite');
      const store = transaction.objectStore('columnMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllColumnMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readwrite');
      const store = transaction.objectStore('columnMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUnmappedColumns(providerType?: string): Promise<any[]> {
    const surveys = await this.getAllSurveys();
    const mappings = await this.getAllColumnMappings(providerType);
    
    
    // ENTERPRISE FIX: Handle case when no surveys exist
    if (surveys.length === 0) {
      return [];
    }
    
    const mappedNames = new Set<string>();
    mappings.forEach(mapping => {
      if (mapping.standardizedName) {
        mappedNames.add(mapping.standardizedName.toLowerCase());
      }
      mapping.sourceColumns.forEach((source: any) => {
        if (source.name) {
          mappedNames.add(source.name.toLowerCase());
        }
      });
    });

    const unmapped: any[] = [];
    const columnCounts = new Map<string, { count: number; sources: Set<string>; dataType: string }>();

    for (const survey of surveys) {
      // Filter surveys by provider type if specified
      // Use the same logic as getUnmappedSpecialties to properly exclude Call Pay
      if (providerType !== undefined) {
        // Determine if this survey matches the requested provider type
        let surveyMatchesProviderType = false;
        
        // Use helper methods for consistent classification (same as Specialty Mapping)
        const isCallPay = this.isCallPaySurvey(survey);
        const isMoonlighting = this.isMoonlightingSurvey(survey);
        const effectiveProviderType = this.getEffectiveProviderType(survey);
        
        if (providerType === 'CALL') {
          // For CALL view: Show only Call Pay surveys
          surveyMatchesProviderType = isCallPay;
        } else if (providerType === 'PHYSICIAN') {
          // For PHYSICIAN view: Include only PHYSICIAN compensation surveys, exclude CALL_PAY, MOONLIGHTING, and APP
          // Moonlighting is a separate survey type, just like Call Pay
          const isPhysicianCompensation = (effectiveProviderType === 'PHYSICIAN') && 
                                         !isCallPay && 
                                         !isMoonlighting &&
                                         this.isCompensationSurvey(survey);
          surveyMatchesProviderType = isPhysicianCompensation;
        } else if (providerType === 'APP') {
          // For APP view: Include only APP surveys, exclude CALL_PAY, MOONLIGHTING, and PHYSICIAN
          surveyMatchesProviderType = (effectiveProviderType === 'APP') && 
                                     !isCallPay && 
                                     !isMoonlighting;
        } else {
          // For CUSTOM or other types: Match providerType exactly
          surveyMatchesProviderType = effectiveProviderType === providerType || 
                                     survey.providerType === providerType;
        }
        
        if (!surveyMatchesProviderType) {
          continue;
        }
      }
      
      
      const { rows } = await this.getSurveyData(survey.id);
      
      if (rows.length > 0) {
        const firstRow = rows[0];
        
        // Get survey source with proper fallbacks - use new structure if available
        // NEW: Use survey.source and survey.dataCategory if available (same logic as Specialty Mapping)
        // This ensures "MGMA Call Pay" and "MGMA Physician" are treated as separate sources
        let surveySource: string;
        if ((survey as any).source && (survey as any).dataCategory) {
          const source = (survey as any).source;
          const dataCategory = (survey as any).dataCategory;
          const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay'
            : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
            : dataCategory === 'COMPENSATION' ? (survey.providerType === 'APP' ? 'APP' : 'Physician')
            : dataCategory;
          surveySource = `${source} ${categoryDisplay}`;
        } else {
          // Backward compatibility: Use old logic
          surveySource = survey.type || survey.name || 'Unknown';
        }
        
        // Debug: Log all columns in the first row
        
        // Check top-level columns
        Object.keys(firstRow).forEach(columnName => {
          // ENTERPRISE FIX: Add null/undefined checks
          if (!columnName || typeof columnName !== 'string') {
            return;
          }
          
          // Debug: Check each column against compensation patterns
          const isCompensation = this.isCompensationOrTechnicalColumn(columnName);
          
          // Include compensation and technical columns, including percentile columns
          if (isCompensation) {
            const key = columnName.toLowerCase();
            const current = columnCounts.get(key) || { count: 0, sources: new Set(), dataType: typeof firstRow[columnName] };
            current.count++;
            current.sources.add(surveySource);
            columnCounts.set(key, current);
            
            // Debug: Log compensation columns found
          }
        });
        
        // ALSO check nested data object for columns
        if (firstRow.data && typeof firstRow.data === 'object') {
          Object.keys(firstRow.data).forEach(columnName => {
            // ENTERPRISE FIX: Add null/undefined checks
            if (!columnName || typeof columnName !== 'string') {
              return;
            }
            
            // Debug: Check each nested column against compensation patterns
            const isCompensation = this.isCompensationOrTechnicalColumn(columnName);
            
            // Include compensation and technical columns, including percentile columns
            if (isCompensation) {
              const key = columnName.toLowerCase();
              const current = columnCounts.get(key) || { count: 0, sources: new Set(), dataType: 'string' };
              current.count++;
              current.sources.add(surveySource);
              columnCounts.set(key, current);
              
              // Debug: Log compensation columns found
            }
          });
        }
      }
    }



    // Create separate entries for each survey source, but ONLY if not already mapped
    columnCounts.forEach((value, key) => {
      Array.from(value.sources).forEach(surveySource => {
        // Check if this column is already mapped
        if (!mappedNames.has(key)) {
          unmapped.push({
            id: crypto.randomUUID(),
            name: key,
            dataType: value.dataType,
            surveySource: surveySource,
            frequency: value.count,
            category: this.categorizeColumn(key)
          });
        } else {
        }
      });
    });


    return unmapped;
  }

  /**
   * Determines if a column is compensation or technical data that should be handled by Column Mapping
   * Excludes specialty, provider type, region, and variable name columns (handled by dedicated mappers)
   */
  private isCompensationOrTechnicalColumn(columnName: string): boolean {
    // ENTERPRISE FIX: Add null/undefined checks
    if (!columnName || typeof columnName !== 'string') {
      return false;
    }
    
    const name = columnName.toLowerCase();
    
    // Exclude columns handled by dedicated mappers
    const excludePatterns = [
      /^specialty$/i,
      /^provider.*type$/i, /^providertype$/i,
      /^geographic.*region$/i, /^region$/i, /^geographicregion$/i,
      /^variable$/i, /^variable.*name$/i
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(name)) {
        return false;
      }
    }
    
    // Include compensation percentile patterns
    const includePatterns = [
      // TCC patterns
      /tcc.*p\d+/i, /p\d+.*tcc/i, /total.*cash.*\d+/i, /\d+.*total.*cash/i,
      /total.*comp.*\d+/i, /\d+.*total.*comp/i,
      
      // wRVU patterns  
      /wrvu.*p\d+/i, /p\d+.*wrvu/i, /work.*rvu.*\d+/i, /\d+.*work.*rvu/i,
      /rvu.*\d+/i, /\d+.*rvu/i,
      
      // CF patterns
      /cf.*p\d+/i, /p\d+.*cf/i, /conversion.*factor.*\d+/i, /\d+.*conversion.*factor/i,
      
      // Technical fields
      /n_orgs?$/i, /n_incumbents?$/i, /number.*org/i, /number.*incumbent/i,
      /organization.*count/i, /incumbent.*count/i,
      
      // Direct percentile matches
      /^tcc_p\d+$/i, /^wrvu_p\d+$/i, /^cf_p\d+$/i,
      
      // Basic percentile patterns (p25, p50, p75, p90)
      /^p\d+$/i, /^p25$/i, /^p50$/i, /^p75$/i, /^p90$/i,
      
      // Common survey percentile variations
      /median/i, /25th/i, /75th/i, /90th/i, /percentile/i
    ];
    
    return includePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Categorizes compensation columns for better organization
   */
  private categorizeColumn(columnName: string): string {
    // ENTERPRISE FIX: Add null/undefined checks
    if (!columnName || typeof columnName !== 'string') {
      return 'Other Compensation';
    }
    
    const name = columnName.toLowerCase();
    
    if (/tcc|total.*cash|total.*comp/i.test(name)) return 'Total Cash Compensation';
    if (/wrvu|work.*rvu|rvu/i.test(name)) return 'Work RVUs'; 
    if (/cf|conversion.*factor/i.test(name)) return 'Conversion Factor';
    if (/n_orgs?|organization|number.*org/i.test(name)) return 'Organization Count';
    if (/n_incumbents?|incumbent|number.*incumbent/i.test(name)) return 'Incumbent Count';
    
    return 'Other Compensation';
  }

  /**
   * Helper method to determine if a survey is a Call Pay survey
   * Checks both old (providerType) and new (dataCategory) ways Call Pay is stored
   */
  private isCallPaySurvey(survey: Survey): boolean {
    return survey.providerType === 'CALL' || 
           (survey as any).dataCategory === 'CALL_PAY' ||
           !!(survey.name && survey.name.toLowerCase().includes('call pay')) ||
           !!(survey.type && survey.type.toLowerCase().includes('call pay'));
  }

  /**
   * Helper method to determine if a survey is a Moonlighting survey
   * Moonlighting is physician-related compensation data
   */
  private isMoonlightingSurvey(survey: Survey): boolean {
    return (survey as any).dataCategory === 'MOONLIGHTING' ||
           !!(survey.name && survey.name.toLowerCase().includes('moonlighting')) ||
           !!(survey.type && survey.type.toLowerCase().includes('moonlighting'));
  }

  /**
   * Helper method to determine if a survey is a Compensation survey (not Call Pay or Moonlighting)
   */
  private isCompensationSurvey(survey: Survey): boolean {
    const dataCategory = (survey as any).dataCategory;
    // If dataCategory is explicitly set, use it
    if (dataCategory) {
      return dataCategory === 'COMPENSATION';
    }
    // Otherwise, if it's not Call Pay or Moonlighting, it's likely Compensation
    return !this.isCallPaySurvey(survey) && !this.isMoonlightingSurvey(survey);
  }

  /**
   * Get the effective provider type for a survey, considering dataCategory
   * This handles backward compatibility and edge cases
   */
  private getEffectiveProviderType(survey: Survey): ProviderType | string {
    // If survey has dataCategory, use it to determine effective type
    const dataCategory = (survey as any).dataCategory;
    
    if (dataCategory === 'CALL_PAY') {
      return 'CALL';
    }
    
    if (dataCategory === 'MOONLIGHTING') {
      // Moonlighting is physician-related, but keep original providerType if set
      return survey.providerType || 'PHYSICIAN';
    }
    
    if (dataCategory === 'CUSTOM') {
      // For custom surveys, use the custom providerType if available
      return survey.providerType || 'CUSTOM';
    }
    
    // For COMPENSATION or legacy surveys, use providerType directly
    return survey.providerType || 'PHYSICIAN';
  }

  // Utility Methods
  async getUnmappedSpecialties(providerType?: string): Promise<IUnmappedSpecialty[]> {
    console.log('🔍 getUnmappedSpecialties: Called with providerType:', providerType);
    const surveys = await this.getAllSurveys();
    console.log('🔍 getUnmappedSpecialties: Total surveys found:', surveys.length);
    
    // ENTERPRISE FIX: Handle case when no surveys exist
    if (surveys.length === 0) {
      return [];
    }
    
    // ENTERPRISE FIX: When providerType is undefined (showing all categories),
    // we still need to get all mappings to check for mapped specialties.
    // However, we should NOT filter surveys by providerType when building unmapped list.
    const mappings = await this.getAllSpecialtyMappings(providerType);
    
    // ENTERPRISE DEBUG: Log provider type filtering details - removed for performance
    
    // ENTERPRISE FIX: Build survey-source specific mapped names
    const mappedNamesBySource = new Map<string, Set<string>>();
    mappings.forEach(mapping => {
      mapping.sourceSpecialties.forEach((source: any) => {
        const surveySource = source.surveySource;
        if (!mappedNamesBySource.has(surveySource)) {
          mappedNamesBySource.set(surveySource, new Set<string>());
        }
        mappedNamesBySource.get(surveySource)!.add(source.specialty.toLowerCase());
      });
    });
    
    // ENTERPRISE DEBUG: Log mapped names by source - removed for performance
    
    // ENTERPRISE DEBUG: Log all mappings details - removed for performance
    
    // ENTERPRISE DEBUG: Log total mapped names for reference
    const totalMappedNames = new Set<string>();
    mappedNamesBySource.forEach((names, source) => {
      names.forEach(name => totalMappedNames.add(name));
    });

    const unmapped: IUnmappedSpecialty[] = [];
    const specialtyCounts = new Map<string, { count: number; sources: Set<string> }>();

    console.log('🔍 getUnmappedSpecialties: Starting survey processing with filter:', providerType);
    let processedCount = 0;
    let excludedCount = 0;

    for (const survey of surveys) {
      // Filter surveys by data category (Provider Type) if specified
      // When providerType is undefined, include all surveys (Call Pay, Physician, APP)
      // When providerType is specified, filter to match that provider type
      if (providerType !== undefined) {
        // Determine if this survey matches the requested provider type
        let surveyMatchesProviderType = false;
        
        // Use helper methods for consistent classification
        const isCallPay = this.isCallPaySurvey(survey);
        const isMoonlighting = this.isMoonlightingSurvey(survey);
        const effectiveProviderType = this.getEffectiveProviderType(survey);
        
        if (providerType === 'CALL') {
          // For CALL view: Show only Call Pay surveys
          surveyMatchesProviderType = isCallPay;
        } else if (providerType === 'PHYSICIAN') {
          // For PHYSICIAN view: Include only PHYSICIAN compensation surveys, exclude CALL_PAY, MOONLIGHTING, and APP
          // Moonlighting is a separate survey type, just like Call Pay
          const isPhysicianCompensation = (effectiveProviderType === 'PHYSICIAN') && 
                                         !isCallPay && 
                                         !isMoonlighting &&
                                         this.isCompensationSurvey(survey);
          surveyMatchesProviderType = isPhysicianCompensation;
        } else if (providerType === 'APP') {
          // For APP view: Include only APP surveys, exclude CALL_PAY, MOONLIGHTING, and PHYSICIAN
          surveyMatchesProviderType = (effectiveProviderType === 'APP') && 
                                     !isCallPay && 
                                     !isMoonlighting;
        } else {
          // For CUSTOM or other types: Match providerType exactly
          // For CUSTOM surveys, must match exactly (including custom providerType values)
          surveyMatchesProviderType = effectiveProviderType === providerType || 
                                     survey.providerType === providerType;
        }
        
        if (!surveyMatchesProviderType) {
          excludedCount++;
          continue;
        }
      }
      
      // Track processed surveys
      processedCount++;
      
      // ENTERPRISE DEBUG: Log Call Pay surveys when providerType is undefined
      if (providerType === undefined && survey.providerType === 'CALL') {
        console.log(`🔍 getUnmappedSpecialties: Including Call Pay survey: ${survey.type || survey.name}, providerType: ${survey.providerType}`);
      }
      
      const { rows } = await this.getSurveyData(survey.id);
      
      // Get survey source with proper fallbacks - use new structure if available
      // NEW: Use survey.source and survey.dataCategory if available (new architecture)
      let surveySource: string;
      if ((survey as any).source && (survey as any).dataCategory) {
        const source = (survey as any).source;
        const dataCategory = (survey as any).dataCategory;
        const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay'
          : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
          : dataCategory === 'COMPENSATION' ? (survey.providerType === 'APP' ? 'APP' : 'Physician')
          : dataCategory;
        surveySource = `${source} ${categoryDisplay}`;
      } else {
        // Backward compatibility: Use old logic
        surveySource = survey.type || survey.name || 'Unknown';
      }
      
      // ENTERPRISE DEBUG: Log Call Pay survey sources
      if (survey.providerType === 'CALL') {
        console.log(`🔍 getUnmappedSpecialties: Processing Call Pay survey source: ${surveySource}`);
      }
      
      // ENTERPRISE DEBUG: Log survey source for MGMA
      if (survey.name.toLowerCase().includes('mgma') || survey.type.toLowerCase().includes('mgma')) {
      }
      
      // ENTERPRISE DEBUG: Log survey source for Gallagher
      if (survey.name.toLowerCase().includes('gallagher') || survey.type.toLowerCase().includes('gallagher')) {
      }
      
      rows.forEach(row => {
        // ENTERPRISE STANDARD: No row-level filtering needed
        // Survey-level filtering (lines 919-921) already ensures data separation
        // If a survey was uploaded as PHYSICIAN/APP, ALL rows belong to that provider type
        
        const specialty = row.specialty || row.Specialty || row['Provider Type'];
        
        // ENTERPRISE FIX: Check if specialty is mapped for this specific survey source
        // Only consider it mapped if there are actual mappings for this specific survey source
        const isMappedForThisSource = specialty && typeof specialty === 'string' && 
          mappedNamesBySource.has(surveySource) && 
          mappedNamesBySource.get(surveySource)!.has(specialty.toLowerCase());
        
        // ENTERPRISE DEBUG: Log specialty extraction details for MGMA
        if (surveySource.toLowerCase().includes('mgma')) {
          // MGMA specialty extraction logging removed for performance
        }
        
        // ENTERPRISE DEBUG: Log specialty extraction details for Gallagher - removed for performance
        
        if (specialty && typeof specialty === 'string' && !isMappedForThisSource) {
          const key = specialty.toLowerCase();
          const current = specialtyCounts.get(key) || { count: 0, sources: new Set() };
          current.count++;
          current.sources.add(surveySource);
          specialtyCounts.set(key, current);
          
          // ENTERPRISE DEBUG: Log Call Pay specialties being added
          if (survey.providerType === 'CALL') {
            console.log(`🔍 getUnmappedSpecialties: Adding unmapped Call Pay specialty: "${specialty}" from ${surveySource}`);
          }
          
          // ENTERPRISE DEBUG: Log specialty extraction for MGMA
          if (surveySource.toLowerCase().includes('mgma')) {
          }
          
          // ENTERPRISE DEBUG: Log specialty extraction for Gallagher
          if (surveySource.toLowerCase().includes('gallagher')) {
          }
        }
      });
    }

    // Create separate entries for each survey source instead of combining them
    // Map survey sources to their provider types for display
    const surveyProviderTypeMap = new Map<string, string>();
    surveys.forEach(survey => {
      const source = survey.type || survey.name || 'Unknown';
      if (survey.providerType) {
        surveyProviderTypeMap.set(source, survey.providerType);
      }
    });
    
    specialtyCounts.forEach((value, key) => {
      // Create a separate entry for each survey source
      Array.from(value.sources).forEach(surveySource => {
        const providerType = surveyProviderTypeMap.get(surveySource) || 'UNKNOWN';
        unmapped.push({
          id: crypto.randomUUID(),
          name: key,
          frequency: value.count,
          surveySource: surveySource as SurveySource,
          providerType: providerType as any // Store provider type for display
        });
      });
    });
    
    console.log('🔍 getUnmappedSpecialties: Processing complete:', {
      providerType,
      totalSurveys: surveys.length,
      processedSurveys: processedCount,
      excludedSurveys: excludedCount,
      totalUnmappedSpecialties: unmapped.length
    });

    // ENTERPRISE DEBUG: Specialty counts calculated
    
    return unmapped;
  }

  async getUnmappedVariables(providerType?: string): Promise<IUnmappedVariable[]> {
    try {
      // ENTERPRISE: Check cache first for instant results
      const cacheKey = `unmapped_variables_${providerType || 'all'}`;
      const cached = this.unmappedVariablesCache.get(cacheKey);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        // Check if mappings have changed (by comparing hash)
        const mappings = await this.getVariableMappings(providerType);
        const mappingsHash = JSON.stringify(mappings.map(m => ({ id: m.id, standardizedName: m.standardizedName })));
        
        // Use cache if fresh and mappings haven't changed
        if (age < this.UNMAPPED_CACHE_TTL && cached.mappingsHash === mappingsHash) {
          console.log(`🚀 Using cached unmapped variables (${age}ms old)`);
          return cached.data;
        }
      }
      
      const surveys = await this.getAllSurveys();
      
      // ENTERPRISE FIX: Handle case when no surveys exist
      if (surveys.length === 0) {
        return [];
      }
      
      const mappings = await this.getVariableMappings(providerType);
      const mappingsHash = JSON.stringify(mappings.map(m => ({ id: m.id, standardizedName: m.standardizedName })));
      
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceVariables.forEach((source: any) => {
          mappedNames.add(source.originalVariableName.toLowerCase());
        });
      });

      const unmapped: IUnmappedVariable[] = [];
      const variableCounts = new Map<string, { count: number; sources: Set<string> }>();

      // ENTERPRISE: Process surveys in parallel batches for speed
      const filteredSurveys = surveys.filter(survey => {
        if (providerType === undefined) return true;
        
        const isCallPay = this.isCallPaySurvey(survey);
        const isMoonlighting = this.isMoonlightingSurvey(survey);
        const effectiveProviderType = this.getEffectiveProviderType(survey);
        
        if (providerType === 'CALL') return isCallPay;
        if (providerType === 'PHYSICIAN') {
          return (effectiveProviderType === 'PHYSICIAN') && !isCallPay && !isMoonlighting && this.isCompensationSurvey(survey);
        }
        if (providerType === 'APP') {
          return (effectiveProviderType === 'APP') && !isCallPay && !isMoonlighting;
        }
        return effectiveProviderType === providerType || survey.providerType === providerType;
      });

      // ENTERPRISE: Use IndexedDB cursor efficiently - only iterate, don't load full rows into memory
      // Process in smaller batches to avoid memory issues
      const db = await this.ensureDB();
      const BATCH_SIZE = 1000; // Process 1000 rows at a time
      
      const surveyResults = await Promise.all(
        filteredSurveys.map(async (survey) => {
          let surveySource: string;
          if ((survey as any).source && (survey as any).dataCategory) {
            const source = (survey as any).source;
            const dataCategory = (survey as any).dataCategory;
            const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay'
              : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
              : dataCategory === 'COMPENSATION' ? (survey.providerType === 'APP' ? 'APP' : 'Physician')
              : dataCategory;
            surveySource = `${source} ${categoryDisplay}`;
          } else {
            surveySource = survey.type || survey.name || 'Unknown';
          }
          
          // Use cursor to iterate through rows efficiently
          return new Promise<{ surveySource: string; variables: Set<string>; rowCount: number }>((resolve, reject) => {
            const transaction = db.transaction(['surveyData'], 'readonly');
            const store = transaction.objectStore('surveyData');
            const surveyIdIndex = store.index('surveyId');
            
            const variables = new Set<string>();
            let rowCount = 0;
            let processedCount = 0;
            
            // Keep transaction reference to prevent it from finishing prematurely
            // IndexedDB transactions stay active as long as there are pending requests
            let isComplete = false;
            
            // Get count first
            const countRequest = surveyIdIndex.count(IDBKeyRange.only(survey.id));
            countRequest.onsuccess = () => {
              rowCount = countRequest.result;
              
              // Use cursor to iterate - IndexedDB handles this efficiently
              const cursorRequest = surveyIdIndex.openCursor(IDBKeyRange.only(survey.id));
              
              cursorRequest.onsuccess = (event) => {
                // Check if transaction is still active
                if (transaction.error || isComplete) {
                  return;
                }
                
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                  processedCount++;
                  const row = cursor.value;
                  // Extract variable from row - check multiple possible locations
                  const variable = row.variable || row.data?.variable || row.data?.Variable || row.data?.['Variable Name'];
                  if (variable && typeof variable === 'string' && !mappedNames.has(variable.toLowerCase())) {
                    variables.add(variable.toLowerCase());
                  }
                  
                  // Continue cursor - IndexedDB operations are already async and won't block
                  // No need for setTimeout as it can cause transaction to finish prematurely
                  try {
                    cursor.continue();
                  } catch (error) {
                    // Transaction may have finished - resolve with what we have
                    if (error instanceof DOMException && error.name === 'TransactionInactiveError') {
                      console.warn('Transaction finished early, resolving with partial results');
                      isComplete = true;
                      resolve({ surveySource, variables, rowCount });
                    } else {
                      reject(error);
                    }
                  }
                } else {
                  // Done - resolve with results
                  isComplete = true;
                  resolve({ surveySource, variables, rowCount });
                }
              };
              
              cursorRequest.onerror = () => {
                isComplete = true;
                reject(cursorRequest.error);
              };
            };
            
            countRequest.onerror = () => {
              isComplete = true;
              reject(countRequest.error);
            };
            
            // Handle transaction completion/error
            transaction.onerror = () => {
              isComplete = true;
              reject(transaction.error);
            };
          });
        })
      );

      // Aggregate results
      surveyResults.forEach(({ surveySource, variables, rowCount }) => {
        variables.forEach(variable => {
          const current = variableCounts.get(variable) || { count: 0, sources: new Set() };
          current.count += rowCount; // Approximate count based on survey size
          current.sources.add(surveySource);
          variableCounts.set(variable, current);
        });
      });

      // Create separate entries for each survey source
      variableCounts.forEach((value, key) => {
        Array.from(value.sources).forEach(surveySource => {
          const variableType = this.detectVariableType(key);
          unmapped.push({
            id: crypto.randomUUID(),
            name: key,
            frequency: value.count,
            surveySource: surveySource as any,
            variableType: variableType.type,
            variableSubType: variableType.subType,
            confidence: variableType.confidence,
            suggestions: variableType.suggestions
          });
        });
      });

      // ENTERPRISE: Cache the result
      this.unmappedVariablesCache.set(cacheKey, {
        data: unmapped,
        timestamp: Date.now(),
        mappingsHash
      });

      return unmapped;
    } catch (error) {
      console.error('Error getting unmapped variables:', error);
      return [];
    }
  }
  
  /**
   * Clear unmapped variables cache (call when mappings change)
   */
  clearUnmappedVariablesCache(): void {
    this.unmappedVariablesCache.clear();
  }


  private calculateSimilarity(name1: string, name2: string, type1: string, type2: string, config: any): number {
    // Normalize names
    const normalized1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalized2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Exact match gets highest score
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Check for exact prefix match (e.g., "wrvu_p50" vs "wrvu_p90" should NOT match)
    const prefix1 = normalized1.replace(/[0-9]/g, '');
    const prefix2 = normalized2.replace(/[0-9]/g, '');
    
    // If prefixes don't match, return very low similarity
    if (prefix1 !== prefix2) {
      return 0.1;
    }

    // For same prefix, check if numbers are different (e.g., p50 vs p90)
    const numbers1 = normalized1.match(/[0-9]+/g) || [];
    const numbers2 = normalized2.match(/[0-9]+/g) || [];
    
    // If numbers are different, this is likely a different metric (p50 vs p90, p25 vs p75, etc.)
    if (numbers1.length > 0 && numbers2.length > 0) {
      const hasDifferentNumbers = numbers1.some(n1 => 
        numbers2.some(n2 => n1 !== n2)
      );
      if (hasDifferentNumbers) {
        return 0.2; // Very low similarity for different percentiles/metrics
      }
    }

    // Calculate Levenshtein distance for remaining cases
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    let similarity = 1 - distance / maxLength;

    // Boost similarity for same data type
    if (type1 === type2) {
      similarity += 0.1;
    }

    return Math.min(similarity, 1.0);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    return matrix[str2.length][str1.length];
  }

  private generateStandardizedName(columns: any[]): string {
    // Use the most common name pattern
    const names = columns.map(c => c.name.toLowerCase());
    
    // Check for common patterns
    if (names.some(n => n.includes('specialty'))) return 'specialty';
    if (names.some(n => n.includes('provider'))) return 'providerType';
    if (names.some(n => n.includes('region'))) return 'region';
    if (names.some(n => n.includes('tcc'))) return 'tcc';
    if (names.some(n => n.includes('cf'))) return 'cf';
    if (names.some(n => n.includes('wrvu'))) return 'wrvu';
    
    // Default to the first column name
    return columns[0].name;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const health = await this.getHealthStatus();
    return {
      status: health.status,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify a transaction completed successfully
   */
  async verifyTransaction(surveyId: string): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      
      return new Promise((resolve) => {
        const request = store.get(surveyId);
        request.onsuccess = () => {
          resolve(!!request.result);
        };
        request.onerror = () => {
          resolve(false);
        };
      });
    } catch (error) {
      console.error('❌ Transaction verification failed:', error);
      return false;
    }
  }

  /**
   * Get survey by ID for verification
   */
  async getSurveyById(surveyId: string): Promise<any | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      
      return new Promise((resolve, reject) => {
        const request = store.get(surveyId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Failed to get survey by ID:', error);
      return null;
    }
  }

  /**
   * Get database statistics for integrity checking
   */
  async getDatabaseStats(): Promise<{
    surveyCount: number;
    totalDataPoints: number;
    lastUpdated: string;
  }> {
    try {
      await this.ensureDB(); // Ensure DB is ready
      const surveys = await this.getAllSurveys();
      
      const totalDataPoints = surveys.reduce((sum, survey) => sum + (survey.dataPoints || 0), 0);
      const lastUpdated = surveys.length > 0 
        ? new Date(Math.max(...surveys.map(s => new Date(s.uploadDate).getTime()))).toISOString()
        : new Date().toISOString();

      return {
        surveyCount: surveys.length,
        totalDataPoints,
        lastUpdated
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return {
        surveyCount: 0,
        totalDataPoints: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }



  // Variable Mapping Methods
  async getVariableMappings(providerType?: string): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readonly');
      const store = transaction.objectStore('variableMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let mappings = request.result || [];
        
        // Filter by provider type if specified
        if (providerType) {
          
          // Get all surveys to determine which survey sources belong to this provider type
          this.getAllSurveys().then(surveys => {
            const validSurveySources = new Set<string>();
            surveys.forEach(survey => {
              if (survey.providerType === providerType) {
                validSurveySources.add(survey.name);
                validSurveySources.add(survey.type);
              }
            });
            
            
            // Filter mappings to only include those with source variables from valid survey sources
            const filteredMappings = mappings.filter(mapping => {
              const hasValidSource = mapping.sourceVariables.some((source: any) => 
                validSurveySources.has(source.surveySource)
              );
              
              if (!hasValidSource) {
              }
              
              return hasValidSource;
            });
            
            resolve(filteredMappings);
          }).catch(err => {
            resolve(mappings); // Fallback to all mappings
          });
        } else {
          resolve(mappings);
        }
      };
    });
  }

  async createVariableMapping(mapping: any): Promise<any> {
    // Clear cache when mappings change
    this.clearUnmappedVariablesCache();
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async updateVariableMapping(id: string, mapping: any): Promise<any> {
    // Clear cache when mappings change
    this.clearUnmappedVariablesCache();
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.put({ ...mapping, id });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteVariableMapping(id: string): Promise<void> {
    // Clear cache when mappings change
    this.clearUnmappedVariablesCache();
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllVariableMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUnmappedProviderTypes(providerType?: string): Promise<any[]> {
    try {
      const surveys = await this.getAllSurveys();
      
      // ENTERPRISE FIX: Handle case when no surveys exist
      if (surveys.length === 0) {
        return [];
      }
      
      const mappings = await this.getProviderTypeMappings(providerType);
      
    
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceProviderTypes.forEach((source: any) => {
          mappedNames.add(source.providerType.toLowerCase());
        });
      });

      const unmapped: any[] = [];
      const providerTypeCounts = new Map<string, { count: number; sources: Set<string> }>();

      for (const survey of surveys) {
        // Filter surveys by provider type if specified
        // Use the same logic as getUnmappedSpecialties to properly exclude Call Pay surveys
        if (providerType !== undefined) {
          // Determine if this survey matches the requested provider type
          let surveyMatchesProviderType = false;
          
          // Use helper methods for consistent classification
          const isCallPay = this.isCallPaySurvey(survey);
          const isMoonlighting = this.isMoonlightingSurvey(survey);
          const effectiveProviderType = this.getEffectiveProviderType(survey);
          
          if (providerType === 'CALL') {
            // For CALL view: Show only Call Pay surveys
            surveyMatchesProviderType = isCallPay;
          } else if (providerType === 'PHYSICIAN') {
            // For PHYSICIAN view: Include only PHYSICIAN compensation surveys, exclude CALL_PAY, MOONLIGHTING, and APP
            // Moonlighting is a separate survey type, just like Call Pay
            const isPhysicianCompensation = (effectiveProviderType === 'PHYSICIAN') && 
                                         !isCallPay && 
                                         !isMoonlighting &&
                                         this.isCompensationSurvey(survey);
            surveyMatchesProviderType = isPhysicianCompensation;
          } else if (providerType === 'APP') {
            // For APP view: Include only APP surveys, exclude CALL_PAY, MOONLIGHTING, and PHYSICIAN
            surveyMatchesProviderType = (effectiveProviderType === 'APP') && 
                                     !isCallPay && 
                                     !isMoonlighting;
          } else {
            // For CUSTOM or other types: Match providerType exactly
            // For CUSTOM surveys, must match exactly (including custom providerType values)
            surveyMatchesProviderType = effectiveProviderType === providerType || 
                                     survey.providerType === providerType;
          }
          
          if (!surveyMatchesProviderType) {
            continue;
          }
        }
        
        const { rows } = await this.getSurveyData(survey.id);
        
        // Get survey source with proper fallbacks
        const surveySource = survey.type || survey.name || 'Unknown';
        
        rows.forEach(row => {
          // Look for provider type in different possible column names
          const providerType = row.providerType || row['Provider Type'] || row.provider_type || row['provider_type'];
          if (providerType && typeof providerType === 'string' && !mappedNames.has(providerType.toLowerCase())) {
            const key = providerType.toLowerCase();
            const current = providerTypeCounts.get(key) || { count: 0, sources: new Set() };
            current.count++;
            current.sources.add(surveySource);
            providerTypeCounts.set(key, current);
          }
        });
      }

      // Create separate entries for each survey source
      providerTypeCounts.forEach((value, key) => {
        Array.from(value.sources).forEach(surveySource => {
          unmapped.push({
            id: crypto.randomUUID(),
            name: key,
            frequency: value.count,
            surveySource: surveySource as any
          });
        });
      });

      return unmapped;
    } catch (error) {
      return [];
    }
  }

  async getUnmappedRegions(providerType?: string): Promise<any[]> {
    try {
      const surveys = await this.getAllSurveys();
      
      // ENTERPRISE FIX: Handle case when no surveys exist
      if (surveys.length === 0) {
        return [];
      }
      
      const mappings = await this.getRegionMappings(providerType);
      
    
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceRegions.forEach((source: any) => {
          mappedNames.add(source.region.toLowerCase());
        });
      });

      const unmapped: any[] = [];
      const regionCounts = new Map<string, { count: number; sources: Set<string> }>();

      for (const survey of surveys) {
        // Filter surveys by provider type if specified
        if (providerType && survey.providerType !== providerType) {
          continue;
        }
        
        
        const { rows } = await this.getSurveyData(survey.id);
        
        // Get survey source with proper fallbacks
        const surveySource = survey.type || survey.name || 'Unknown';
        
        rows.forEach(row => {
          // ENTERPRISE FIX: Handle both WIDE format (direct properties) and LONG format (nested in data)
          // Type guard: row.data might be an object (ISurveyRow) or string/number
          let rowData: any = row;
          if (row && typeof row === 'object' && 'data' in row && row.data && typeof row.data === 'object') {
            rowData = row.data;
          }
          
          // Look for region in different possible column names (check both row and rowData)
          const region = (rowData && typeof rowData === 'object' 
            ? (rowData.geographicRegion || rowData['Geographic Region'] || 
               rowData.geographic_region || rowData.region || rowData.Region)
            : null) ||
            (row && typeof row === 'object'
              ? (row.geographicRegion || (row as any)['Geographic Region'] || 
                 (row as any).geographic_region || (row as any).region || (row as any).Region)
              : null);
          
          if (region && typeof region === 'string' && !mappedNames.has(region.toLowerCase())) {
            const key = region.toLowerCase();
            const current = regionCounts.get(key) || { count: 0, sources: new Set() };
            current.count++;
            current.sources.add(surveySource);
            regionCounts.set(key, current);
          }
        });
      }

      // Create separate entries for each survey source
      regionCounts.forEach((value, key) => {
        Array.from(value.sources).forEach(surveySource => {
          unmapped.push({
            id: crypto.randomUUID(),
            name: key,
            frequency: value.count,
            surveySource: surveySource as any
          });
        });
      });

      return unmapped;
    } catch (error) {
      return [];
    }
  }

  // Provider Type Mapping Methods
  async getProviderTypeMappings(providerType?: string): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readonly');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let mappings = request.result || [];
        
        // Filter by provider type if specified
        if (providerType) {
          
          // Get all surveys to determine which survey sources belong to this provider type
          this.getAllSurveys().then(surveys => {
            const validSurveySources = new Set<string>();
            surveys.forEach(survey => {
              // Use the same logic as getUnmappedSpecialties to properly exclude Call Pay surveys
              let surveyMatchesProviderType = false;
              
              // Use helper methods for consistent classification
              const isCallPay = this.isCallPaySurvey(survey);
              const isMoonlighting = this.isMoonlightingSurvey(survey);
              const effectiveProviderType = this.getEffectiveProviderType(survey);
              
              if (providerType === 'CALL') {
                // For CALL view: Show only Call Pay surveys
                surveyMatchesProviderType = isCallPay;
              } else if (providerType === 'PHYSICIAN') {
                // For PHYSICIAN view: Include PHYSICIAN surveys + MOONLIGHTING, exclude CALL_PAY and APP
                // MOONLIGHTING is physician-related compensation data
                const isPhysicianCompensation = (effectiveProviderType === 'PHYSICIAN') && 
                                             !isCallPay && 
                                             (this.isCompensationSurvey(survey) || isMoonlighting);
                surveyMatchesProviderType = isPhysicianCompensation;
              } else if (providerType === 'APP') {
                // For APP view: Include only APP surveys, exclude CALL_PAY, MOONLIGHTING, and PHYSICIAN
                surveyMatchesProviderType = (effectiveProviderType === 'APP') && 
                                         !isCallPay && 
                                         !isMoonlighting;
              } else {
                // For CUSTOM or other types: Match providerType exactly
                surveyMatchesProviderType = effectiveProviderType === providerType || 
                                         survey.providerType === providerType;
              }
              
              if (surveyMatchesProviderType) {
                validSurveySources.add(survey.name);
                validSurveySources.add(survey.type);
              }
            });
            
            
            // Filter mappings to only include those with source provider types from valid survey sources
            const filteredMappings = mappings.filter(mapping => {
              const hasValidSource = mapping.sourceProviderTypes.some((source: any) => 
                validSurveySources.has(source.surveySource)
              );
              
              if (!hasValidSource) {
              }
              
              return hasValidSource;
            });
            
            resolve(filteredMappings);
          }).catch(err => {
            resolve(mappings); // Fallback to all mappings
          });
        } else {
          resolve(mappings);
        }
      };
    });
  }

  async createProviderTypeMapping(mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async updateProviderTypeMapping(id: string, mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.put({ ...mapping, id });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteProviderTypeMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllProviderTypeMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Region Mapping Methods
  async getRegionMappings(providerType?: string): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readonly');
      const store = transaction.objectStore('regionMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let mappings = request.result || [];
        
        // Filter by provider type if specified
        if (providerType) {
          
          // Get all surveys to determine which survey sources belong to this provider type
          this.getAllSurveys().then(surveys => {
            const validSurveySources = new Set<string>();
            surveys.forEach(survey => {
              if (survey.providerType === providerType) {
                validSurveySources.add(survey.name);
                validSurveySources.add(survey.type);
              }
            });
            
            
            // Filter mappings to only include those with source regions from valid survey sources
            const filteredMappings = mappings.filter(mapping => {
              const hasValidSource = mapping.sourceRegions.some((source: any) => 
                validSurveySources.has(source.surveySource)
              );
              
              if (!hasValidSource) {
              }
              
              return hasValidSource;
            });
            
            resolve(filteredMappings);
          }).catch(err => {
            resolve(mappings); // Fallback to all mappings
          });
        } else {
          resolve(mappings);
        }
      };
    });
  }

  async createRegionMapping(mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async updateRegionMapping(id: string, mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.put({ ...mapping, id });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteRegionMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllRegionMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private detectVariableType(variableName: string): {
    type: 'compensation' | 'categorical';
    subType: string;
    confidence: number;
    suggestions: string[];
  } {
    const name = variableName.toLowerCase();
    
    // Compensation variables
    if (name.includes('tcc') || name.includes('total cash') || name.includes('compensation')) {
      return {
        type: 'compensation',
        subType: 'tcc',
        confidence: 0.9,
        suggestions: ['tcc', 'total_cash_compensation']
      };
    }
    
    if (name.includes('wrvu') || name.includes('work rvu') || name.includes('rvu')) {
      return {
        type: 'compensation',
        subType: 'wrvu',
        confidence: 0.9,
        suggestions: ['wrvu', 'work_rvu']
      };
    }
    
    if (name.includes('cf') || name.includes('conversion') || name.includes('factor')) {
      return {
        type: 'compensation',
        subType: 'cf',
        confidence: 0.9,
        suggestions: ['cf', 'conversion_factor']
      };
    }
    
    if (name.includes('base') || name.includes('salary')) {
      return {
        type: 'compensation',
        subType: 'base_pay',
        confidence: 0.8,
        suggestions: ['base_pay', 'salary']
      };
    }
    
    // Categorical variables
    if (name.includes('region') || name.includes('geographic')) {
      return {
        type: 'categorical',
        subType: 'region',
        confidence: 0.8,
        suggestions: ['region', 'geographic_region']
      };
    }
    
    if (name.includes('provider') || name.includes('type')) {
      return {
        type: 'categorical',
        subType: 'provider_type',
        confidence: 0.7,
        suggestions: ['provider_type', 'type']
      };
    }
    
    // Default to compensation if we can't determine
    return {
      type: 'compensation',
      subType: 'unknown',
      confidence: 0.5,
      suggestions: [variableName.toLowerCase().replace(/\s+/g, '_')]
    };
  }

  // ==================== LEARNED MAPPINGS METHODS ====================

  /**
   * Get learned mappings for a specific type and provider type
   */
  async getLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Record<string, string>> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const mappings: Record<string, string> = {};
        request.result.forEach((item: any) => {
          // Filter by provider type if specified
          if (providerType) {
            let itemMatchesProviderType = false;
            
            // Determine classification from learned mapping item
            // Learned mappings may have providerType, dataCategory, or surveySource to infer from
            const isCallPay = item.providerType === 'CALL' || 
                             item.dataCategory === 'CALL_PAY' ||
                             (item.surveySource && item.surveySource.toLowerCase().includes('call pay'));
            const isMoonlighting = item.dataCategory === 'MOONLIGHTING' ||
                                  (item.surveySource && item.surveySource.toLowerCase().includes('moonlighting'));
            
            // Get effective provider type for the item
            let effectiveItemProviderType = item.providerType;
            if (item.dataCategory === 'CALL_PAY') {
              effectiveItemProviderType = 'CALL';
            } else if (item.dataCategory === 'MOONLIGHTING') {
              effectiveItemProviderType = item.providerType || 'PHYSICIAN';
            } else if (item.dataCategory === 'CUSTOM') {
              effectiveItemProviderType = item.providerType || 'CUSTOM';
            }
            
            if (providerType === 'CALL') {
              // For CALL view: Show only Call Pay learned mappings
              itemMatchesProviderType = isCallPay;
            } else if (providerType === 'PHYSICIAN') {
              // For PHYSICIAN view: Include PHYSICIAN + MOONLIGHTING, exclude CALL_PAY and APP
              itemMatchesProviderType = (effectiveItemProviderType === 'PHYSICIAN' || 
                                        effectiveItemProviderType === 'ALL' || 
                                        isMoonlighting) && 
                                       !isCallPay &&
                                       effectiveItemProviderType !== 'APP';
            } else if (providerType === 'APP') {
              // For APP view: Include only APP, exclude CALL_PAY, MOONLIGHTING, and PHYSICIAN
              itemMatchesProviderType = (effectiveItemProviderType === 'APP' || 
                                        effectiveItemProviderType === 'ALL') && 
                                       !isCallPay && 
                                       !isMoonlighting &&
                                       effectiveItemProviderType !== 'PHYSICIAN';
            } else {
              // For CUSTOM or other types: Match providerType exactly
              itemMatchesProviderType = effectiveItemProviderType === providerType || 
                                       item.providerType === providerType || 
                                       item.providerType === 'ALL';
            }
            
            if (!itemMatchesProviderType) {
              return; // Skip this mapping if it doesn't match the provider type
            }
          }
          
          // Keep the most recent mapping for each original name
          if (!mappings[item.original]) {
            mappings[item.original] = item.corrected;
          }
        });
        resolve(mappings);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get learned mappings with survey source information
   */
  async getLearnedMappingsWithSource(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Array<{original: string, corrected: string, surveySource: string}>> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const mappings: Array<{original: string, corrected: string, surveySource: string}> = [];
        request.result.forEach((item: any) => {
          // Filter by provider type if specified
          if (providerType) {
            let itemMatchesProviderType = false;
            
            // Determine classification from learned mapping item
            const isCallPay = item.providerType === 'CALL' || 
                             item.dataCategory === 'CALL_PAY' ||
                             (item.surveySource && item.surveySource.toLowerCase().includes('call pay'));
            const isMoonlighting = item.dataCategory === 'MOONLIGHTING' ||
                                  (item.surveySource && item.surveySource.toLowerCase().includes('moonlighting'));
            
            // Get effective provider type for the item
            let effectiveItemProviderType = item.providerType;
            if (item.dataCategory === 'CALL_PAY') {
              effectiveItemProviderType = 'CALL';
            } else if (item.dataCategory === 'MOONLIGHTING') {
              effectiveItemProviderType = item.providerType || 'PHYSICIAN';
            } else if (item.dataCategory === 'CUSTOM') {
              effectiveItemProviderType = item.providerType || 'CUSTOM';
            }
            
            if (providerType === 'CALL') {
              // For CALL view: Show only Call Pay learned mappings
              itemMatchesProviderType = isCallPay;
            } else if (providerType === 'PHYSICIAN') {
              // For PHYSICIAN view: Include PHYSICIAN + MOONLIGHTING, exclude CALL_PAY and APP
              itemMatchesProviderType = (effectiveItemProviderType === 'PHYSICIAN' || 
                                        effectiveItemProviderType === 'ALL' || 
                                        isMoonlighting) && 
                                       !isCallPay &&
                                       effectiveItemProviderType !== 'APP';
            } else if (providerType === 'APP') {
              // For APP view: Include only APP, exclude CALL_PAY, MOONLIGHTING, and PHYSICIAN
              itemMatchesProviderType = (effectiveItemProviderType === 'APP' || 
                                        effectiveItemProviderType === 'ALL') && 
                                       !isCallPay && 
                                       !isMoonlighting &&
                                       effectiveItemProviderType !== 'PHYSICIAN';
            } else {
              // For CUSTOM or other types: Match providerType exactly
              itemMatchesProviderType = effectiveItemProviderType === providerType || 
                                       item.providerType === providerType || 
                                       item.providerType === 'ALL';
            }
            
            if (!itemMatchesProviderType) {
              return; // Skip this mapping if it doesn't match the provider type
            }
          }
          
          mappings.push({
            original: item.original,
            corrected: item.corrected,
            surveySource: item.surveySource || 'Custom'
          });
        });
        resolve(mappings);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a learned mapping with provider type and survey source
   */
  async saveLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string, corrected: string, providerType?: string, surveySource?: string): Promise<void> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({
        original: original.toLowerCase(),
        corrected,
        providerType: providerType || 'ALL', // Store provider type or 'ALL' for global mappings
        surveySource: surveySource || 'Custom', // Store survey source or 'Custom' for manual mappings
        createdAt: new Date(),
        updatedAt: new Date()
      });

      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove a learned mapping
   */
  async removeLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string): Promise<void> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // For specialty mappings, we need to delete ALL records with the same corrected name
      if (type === 'specialty') {
        // Get all records and find the one with matching original name to get the corrected name
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result;
          const recordToDelete = records.find((record: any) => 
            record.original && record.original.toLowerCase() === original.toLowerCase()
          );
          
          if (recordToDelete) {
            const correctedName = recordToDelete.corrected;
            
            // Find and delete ALL records with the same corrected name
            const recordsToDelete = records.filter((record: any) => 
              record.corrected && record.corrected.toLowerCase() === correctedName.toLowerCase()
            );
            
            
            // Delete all matching records
            let deleteCount = 0;
            const totalToDelete = recordsToDelete.length;
            
            if (totalToDelete === 0) {
              console.log(`⚠️ No records found to delete`);
              resolve();
              return;
            }
            
            recordsToDelete.forEach((record: any) => {
              const deleteRequest = store.delete(record.id);
              
              deleteRequest.onsuccess = () => {
                deleteCount++;
                console.log(`✅ Deleted learned mapping ${deleteCount}/${totalToDelete}: ${record.original} -> ${record.corrected}`);
                
                if (deleteCount === totalToDelete) {
                  console.log(`🎉 Successfully deleted all ${totalToDelete} learned mappings for: ${correctedName}`);
                  resolve();
                }
              };
              
              deleteRequest.onerror = () => {
                console.error(`❌ Error deleting learned mapping:`, deleteRequest.error);
                reject(deleteRequest.error);
              };
            });
          } else {
            console.log(`⚠️ No learned mapping found with original name: ${original}`);
            resolve(); // Not an error, just nothing to delete
          }
        };
        
        getAllRequest.onerror = () => {
          console.error(`❌ Error getting learned mappings:`, getAllRequest.error);
          reject(getAllRequest.error);
        };
      } else {
        // For other types, use the original name as key (they use original as keyPath)
        const request = store.delete(original.toLowerCase());

        request.onsuccess = () => {
          console.log(`✅ Successfully deleted learned mapping: ${original}`);
          resolve();
        };
        request.onerror = () => {
          console.error(`❌ Error deleting learned mapping:`, request.error);
          reject(request.error);
        };
      }
    });
  }

  /**
   * Clear all learned mappings of a specific type
   */
  async clearLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<void> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear ALL specialty mappings (not just learned ones)
   */
  async clearAllSpecialtyMappings(): Promise<void> {
    try {
      console.log(`🧹 Clearing ALL specialty mappings...`);
      
      const db = await this.ensureDB();
      const transaction = db.transaction(['specialtyMappings'], 'readwrite');
      const store = transaction.objectStore('specialtyMappings');
      
      // Get all specialty mappings first to log them
      const getAllRequest = store.getAll();
      
      return new Promise((resolve, reject) => {
        getAllRequest.onsuccess = () => {
          const mappings = getAllRequest.result;
          console.log(`📋 Found ${mappings.length} specialty mappings to clear`);
          
          if (mappings.length === 0) {
            console.log(`✅ No specialty mappings found`);
            resolve();
            return;
          }
          
          // Log what we're about to delete
          mappings.forEach(mapping => {
            console.log(`🗑️ Will delete mapping: ${mapping.standardizedName} (${mapping.sourceSpecialties.length} sources)`);
          });
          
          // Clear all mappings
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => {
            console.log(`✅ Successfully cleared ${mappings.length} specialty mappings`);
            resolve();
          };
          clearRequest.onerror = () => {
            console.error(`❌ Failed to clear specialty mappings`);
            reject(clearRequest.error);
          };
        };
        
        getAllRequest.onerror = () => {
          console.error(`❌ Failed to get specialty mappings`);
          reject(getAllRequest.error);
        };
      });
    } catch (error) {
      console.error(`❌ Error clearing specialty mappings:`, error);
      throw error;
    }
  }

  // Blend Template Methods
  /**
   * Save a blend template
   */
  async saveBlendTemplate(template: any): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['blendTemplates'], 'readwrite');
    const store = transaction.objectStore('blendTemplates');
    
    return new Promise((resolve, reject) => {
      const request = store.put(template);
      
      request.onsuccess = () => {
        console.log('✅ Blend template saved successfully:', template.name);
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Error saving blend template:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all blend templates
   */
  async getAllBlendTemplates(): Promise<any[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['blendTemplates'], 'readonly');
    const store = transaction.objectStore('blendTemplates');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('✅ Retrieved blend templates:', request.result.length);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('❌ Error retrieving blend templates:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a blend template
   */
  async deleteBlendTemplate(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['blendTemplates'], 'readwrite');
    const store = transaction.objectStore('blendTemplates');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('✅ Blend template deleted successfully:', id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Error deleting blend template:', request.error);
        reject(request.error);
      };
    });
  }

  // FMV Calculation Methods
  /**
   * Get all FMV calculations
   */
  async getAllFMVCalculations(): Promise<any[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['fmvCalculations'], 'readonly');
    const store = transaction.objectStore('fmvCalculations');
    const index = store.index('created');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Sort by created date descending
      const calculations: any[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          calculations.push(cursor.value);
          cursor.continue();
        } else {
          console.log('✅ Retrieved FMV calculations:', calculations.length);
          resolve(calculations);
        }
      };
      
      request.onerror = () => {
        console.error('❌ Error retrieving FMV calculations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save an FMV calculation
   */
  async saveFMVCalculation(calculation: any): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['fmvCalculations'], 'readwrite');
    const store = transaction.objectStore('fmvCalculations');
    
    // Ensure calculation has required fields
    const calculationToSave = {
      ...calculation,
      id: calculation.id || `fmv_${Date.now()}`,
      created: calculation.created || new Date(),
      lastModified: new Date()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(calculationToSave);
      
      request.onsuccess = () => {
        console.log('✅ FMV calculation saved successfully:', calculationToSave.id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Error saving FMV calculation:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete an FMV calculation
   */
  async deleteFMVCalculation(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['fmvCalculations'], 'readwrite');
    const store = transaction.objectStore('fmvCalculations');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('✅ FMV calculation deleted successfully:', id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Error deleting FMV calculation:', request.error);
        reject(request.error);
      };
    });
  }

  // Cache Methods for Analytics
  async saveToCache(key: string, data: any): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const cacheItem = {
        key,
        data,
        timestamp: Date.now()
      };
      
      const request = store.put(cacheItem);
      
      request.onsuccess = () => {
        console.log('✅ Cache saved:', key);
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Error saving cache:', request.error);
        reject(request.error);
      };
    });
  }

  async getFromCache(key: string): Promise<any> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log('✅ Cache retrieved:', key);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('❌ Error retrieving cache:', request.error);
        reject(request.error);
      };
    });
  }

  async clearCache(key?: string): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      let request: IDBRequest;
      
      if (key) {
        request = store.delete(key);
      } else {
        request = store.clear();
      }
      
      request.onsuccess = () => {
        console.log('✅ Cache cleared:', key || 'all');
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Error clearing cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Batch query method for executing multiple IndexedDB queries in parallel
   * This optimizes performance by batching related queries together
   * 
   * @param queries - Array of query functions to execute in parallel
   * @returns Promise that resolves with an array of results in the same order as queries
   * 
   * @example
   * ```typescript
   * const [surveys, mappings, columnMappings] = await service.batchQuery([
   *   () => service.getAllSurveys(),
   *   () => service.getAllSpecialtyMappings(),
   *   () => service.getAllColumnMappings()
   * ]);
   * ```
   */
  async batchQuery<T extends any[]>(
    queries: Array<() => Promise<any>>
  ): Promise<T> {
    await this.ensureDB();
    
    console.log(`🚀 IndexedDBService: Executing ${queries.length} queries in parallel`);
    const startTime = performance.now();
    
    try {
      const results = await Promise.all(
        queries.map(async (queryFn, index) => {
          const queryStartTime = performance.now();
          try {
            const result = await queryFn();
            const queryDuration = performance.now() - queryStartTime;
            console.log(`✅ Query ${index + 1}/${queries.length} completed in ${queryDuration.toFixed(2)}ms`);
            return result;
          } catch (error) {
            console.error(`❌ Query ${index + 1}/${queries.length} failed:`, error);
            throw error;
          }
        })
      );
      
      const totalDuration = performance.now() - startTime;
      console.log(`✅ IndexedDBService: All ${queries.length} queries completed in ${totalDuration.toFixed(2)}ms`);
      
      return results as T;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      console.error(`❌ IndexedDBService: Batch query failed after ${totalDuration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
}


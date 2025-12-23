/**
 * Firestore Service for Firebase Backend Storage
 * 
 * Enterprise-grade Firestore implementation with user-scoped data isolation.
 * Mirrors IndexedDBService interface for seamless migration.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  QueryConstraint,
  onSnapshot,
  Unsubscribe,
  runTransaction,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseAvailable } from '../config/firebase';
import { getFirebaseAuth } from '../config/firebase';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../features/mapping/types/mapping';
import { IColumnMapping } from '../types/column';
import { ISurveyRow } from '../types/survey';
import { ProviderType, DataCategory } from '../types/provider';
import { readCSVFile, parseCSVLine } from '../shared/utils';

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
  providerType?: ProviderType | string;
  dataCategory?: DataCategory;
  source?: string;
  surveyLabel?: string;
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
  [key: string]: any;
}

/**
 * Firestore Service - User-scoped data storage
 */
export class FirestoreService {
  private db: ReturnType<typeof getFirebaseDb> | null = null;
  private auth: ReturnType<typeof getFirebaseAuth> | null = null;
  private userId: string | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly QUOTA_RETRY_DELAY = 5000; // 5 seconds for quota errors
  private readonly BATCH_DELAY = 100; // 100ms delay between batches to respect rate limits
  private readonly MAX_QUOTA_RETRIES = 5; // More retries for quota errors
  private offlineQueue: Array<() => Promise<void>> = [];
  private isOnline = true;

  constructor() {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not available. Check environment variables.');
    }
    this.db = getFirebaseDb();
    this.auth = getFirebaseAuth();
    this.userId = this.auth.currentUser?.uid || null;

    // Listen for auth state changes
    this.auth.onAuthStateChanged((user) => {
      this.userId = user?.uid || null;
    });

    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processOfflineQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Retry wrapper for Firestore operations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        if (attempt < retries) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
          console.warn(`⚠️ ${operationName} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(`❌ ${operationName} failed after ${retries + 1} attempts:`, lastError);
    throw lastError || new Error(`${operationName} failed`);
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('permission-denied') ||
      message.includes('not-found') ||
      message.includes('invalid-argument') ||
      message.includes('already-exists')
    );
  }

  /**
   * Check if error is a quota/resource-exhausted error
   */
  private isQuotaError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const code = (error as any)?.code;
    return (
      message.includes('quota exceeded') ||
      message.includes('resource-exhausted') ||
      code === 'resource-exhausted' ||
      code === 'quota-exceeded'
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process offline queue when coming back online
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`📤 Processing ${this.offlineQueue.length} queued operations...`);
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of queue) {
      try {
        await operation();
      } catch (error) {
        console.error('❌ Failed to process queued operation:', error);
        // Re-queue if still failing
        this.offlineQueue.push(operation);
      }
    }
  }

  /**
   * Execute operation with offline queue support
   */
  private async executeWithOfflineQueue<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.isOnline) {
      return new Promise((resolve, reject) => {
        this.offlineQueue.push(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        console.log(`📦 Queued ${operationName} for later execution (offline)`);
      });
    }

    return await this.withRetry(operation, operationName);
  }

  /**
   * Get user-scoped collection path
   */
  private getUserPath(collectionName: string): string {
    if (!this.userId) {
      throw new Error('User not authenticated. Please sign in.');
    }
    return `users/${this.userId}/${collectionName}`;
  }

  /**
   * Convert Firestore timestamp to Date
   */
  private toDate(timestamp: any): Date {
    if (timestamp?.toDate) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    return new Date();
  }

  /**
   * Convert Date to Firestore timestamp
   */
  private toTimestamp(date: Date | string | number): Timestamp {
    const dateObj = date instanceof Date ? date : new Date(date);
    return Timestamp.fromDate(dateObj);
  }

  /**
   * Remove undefined values from object (Firestore doesn't allow undefined)
   * Also handles null values in metadata that might cause issues
   * This is critical - Firestore will reject any document with undefined values
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }
    
    // Handle Date and Timestamp objects - don't recurse into them
    if (obj instanceof Date || obj instanceof Timestamp) {
      return obj;
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip undefined values completely - this is the key fix
        if (value !== undefined) {
          // Recursively clean nested objects (like metadata)
          const cleanedValue = this.removeUndefinedValues(value);
          // Only add if the cleaned value is not undefined
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Initialize service (no-op for Firestore, but maintains interface compatibility)
   */
  async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    console.log('✅ FirestoreService initialized for user:', this.userId);
  }

  // ==================== Survey Methods ====================

  async getAllSurveys(): Promise<Survey[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const surveysRef = collection(this.db, this.getUserPath('surveys'));
    const snapshot = await getDocs(surveysRef);
    
    const surveys = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        uploadDate: this.toDate(data.uploadDate),
        createdAt: data.createdAt ? this.toDate(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? this.toDate(data.updatedAt) : undefined,
      } as Survey;
    });

    console.log('📊 FirestoreService: Retrieved surveys:', surveys.length);
    return surveys;
  }

  async createSurvey(survey: Partial<Survey> & { id: string }): Promise<Survey> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    return await this.executeWithOfflineQueue(async () => {
      const surveyRef = doc(this.db!, this.getUserPath('surveys'), survey.id);
      
      // CRITICAL: Remove all undefined values before saving to Firestore
      // Firestore will reject any document with undefined values
      const cleanedSurvey = this.removeUndefinedValues(survey);
      
      // Build the survey data object
      const surveyDataRaw = {
        ...cleanedSurvey,
        uploadDate: this.toTimestamp(survey.uploadDate || new Date()),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      // Clean again after adding Firestore fields
      const surveyData = this.removeUndefinedValues(surveyDataRaw);
      
      // Final safety check: manually filter out any undefined values
      // This is a belt-and-suspenders approach to ensure no undefined slips through
      const safeData: any = {};
      for (const [key, value] of Object.entries(surveyData)) {
        if (value !== undefined) {
          // Also clean nested objects (like metadata)
          if (typeof value === 'object' && value !== null && !(value instanceof Date) && !(value instanceof Timestamp)) {
            const cleanedNested = this.removeUndefinedValues(value);
            safeData[key] = cleanedNested;
          } else {
            safeData[key] = value;
          }
        }
      }

      // Log what we're about to save (for debugging)
      console.log('🔍 FirestoreService: Saving survey data (cleaned):', {
        id: safeData.id,
        name: safeData.name,
        hasSurveyLabel: 'surveyLabel' in safeData,
        surveyLabelValue: safeData.surveyLabel,
        metadataKeys: safeData.metadata ? Object.keys(safeData.metadata) : []
      });

      await setDoc(surveyRef, safeData);
      console.log('✅ FirestoreService: Created survey:', survey.id);
      
      // Log audit event
      await this.logAuditEvent('create', 'survey', survey.id, { name: survey.name });
      
      return {
        ...survey,
        uploadDate: survey.uploadDate || new Date(),
      } as Survey;
    }, 'createSurvey');
  }

  async getSurveyById(surveyId: string): Promise<Survey | null> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const surveyRef = doc(this.db, this.getUserPath('surveys'), surveyId);
    const snapshot = await getDoc(surveyRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      uploadDate: this.toDate(data.uploadDate),
      createdAt: data.createdAt ? this.toDate(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? this.toDate(data.updatedAt) : undefined,
    } as Survey;
  }

  async deleteSurvey(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const surveyRef = doc(this.db, this.getUserPath('surveys'), id);
    await deleteDoc(surveyRef);
    console.log('✅ FirestoreService: Deleted survey:', id);
  }

  async deleteWithVerification(surveyId: string): Promise<{
    success: boolean;
    deletedSurvey: boolean;
    deletedDataRows: number;
    deletedMappings: number;
    error?: string;
  }> {
    try {
      // First verify survey exists
      const survey = await this.getSurveyById(surveyId);
      if (!survey) {
        return {
          success: false,
          deletedSurvey: false,
          deletedDataRows: 0,
          deletedMappings: 0,
          error: `Survey ${surveyId} not found`
        };
      }

      // Count data rows before deletion
      const dataBefore = await this.getSurveyData(surveyId);
      const dataRowCount = dataBefore.rows.length;

      // Delete survey and cascade
      await this.cascadeDelete(surveyId);

      return {
        success: true,
        deletedSurvey: true,
        deletedDataRows: dataRowCount,
        deletedMappings: 0 // Firestore handles cascading automatically
      };
    } catch (error) {
      return {
        success: false,
        deletedSurvey: false,
        deletedDataRows: 0,
        deletedMappings: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cascadeDelete(surveyId: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const batch = writeBatch(this.db);

    // Delete survey
    const surveyRef = doc(this.db, this.getUserPath('surveys'), surveyId);
    batch.delete(surveyRef);

    // Delete all survey data
    const dataRef = collection(this.db, this.getUserPath('surveyData'));
    const dataQuery = query(dataRef, where('surveyId', '==', surveyId));
    const dataSnapshot = await getDocs(dataQuery);
    dataSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    console.log('✅ FirestoreService: Cascade deleted survey:', surveyId);
  }

  async deleteAllSurveys(): Promise<void> {
    const surveys = await this.getAllSurveys();
    const batch = writeBatch(this.db!);
    
    surveys.forEach(survey => {
      const surveyRef = doc(this.db!, this.getUserPath('surveys'), survey.id);
      batch.delete(surveyRef);
    });

    await batch.commit();
    console.log('✅ FirestoreService: Deleted all surveys');
  }

  async forceClearDatabase(): Promise<void> {
    // Delete all collections for this user
    const collections = ['surveys', 'surveyData', 'specialtyMappings', 'columnMappings', 
                       'variableMappings', 'regionMappings', 'providerTypeMappings'];
    
    for (const collName of collections) {
      const collRef = collection(this.db!, this.getUserPath(collName));
      const snapshot = await getDocs(collRef);
      const batch = writeBatch(this.db!);
      
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    console.log('✅ FirestoreService: Cleared all database');
  }

  // ==================== Survey Data Methods ====================

  async getSurveyData(
    surveyId: string, 
    filters: any = {}, 
    pagination: any = {}
  ): Promise<{ rows: ISurveyRow[] }> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    console.log(`🔍 FirestoreService: Fetching survey data for ${surveyId}`, { filters, pagination });

    const dataRef = collection(this.db, this.getUserPath('surveyData'));
    const constraints: QueryConstraint[] = [
      where('surveyId', '==', surveyId)
    ];

    // Add filters - CRITICAL: Order matters for composite indexes
    // Always add surveyId first, then specialty, providerType, region
    if (filters.specialty) {
      constraints.push(where('specialty', '==', filters.specialty));
    }
    if (filters.providerType) {
      constraints.push(where('providerType', '==', filters.providerType));
    }
    if (filters.region) {
      constraints.push(where('region', '==', filters.region));
    }

    // Add pagination with default limit for performance
    const queryLimit = pagination.limit || 10000; // Default to 10k for large datasets
    constraints.push(limit(queryLimit));
    
    if (pagination.orderBy) {
      constraints.push(orderBy(pagination.orderBy, pagination.orderDirection || 'asc'));
    } else {
      // Default ordering for consistent results
      constraints.push(orderBy('createdAt', 'asc'));
    }

    const startTime = performance.now();
    const q = query(dataRef, ...constraints);
    const snapshot = await getDocs(q);
    const fetchTime = performance.now() - startTime;
    
    console.log(`⚡ FirestoreService: Fetched ${snapshot.docs.length} rows in ${fetchTime.toFixed(2)}ms`);
    
    // Optimize data transformation
    const rows = snapshot.docs.map(doc => {
      const data = doc.data();
      // Remove Firestore metadata fields and return just the row data
      const { id, surveyId: _surveyId, createdAt, ...rowData } = data;
      return rowData as ISurveyRow;
    });
    
    return { rows };
  }

  async saveSurveyData(surveyId: string, rows: ISurveyRow[], onProgress?: (percent: number) => void): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    return await this.executeWithOfflineQueue(async () => {
      const batchSize = 500; // Firestore batch limit
      const totalBatches = Math.ceil(rows.length / batchSize);
      let completedBatches = 0;

      console.log(`📤 FirestoreService: Saving ${rows.length} rows in ${totalBatches} batches...`);

      const startTime = Date.now();
      const collectionPath = this.getUserPath('surveyData');

      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        // Pre-calculate batch start index for efficient ID generation
        const batchStartIndex = i;
        
        // Helper function to create and populate a batch
        const createBatch = () => {
          const batch = writeBatch(this.db!);
          chunk.forEach((row, index) => {
            // Use simple counter-based ID - no Date.now() needed
            // Firestore will handle uniqueness and the index ensures no collisions within a batch
            const dataId = `${surveyId}_${batchStartIndex + index}`;
            const rowRef = doc(this.db!, collectionPath, dataId);
            
            const rowData = this.removeUndefinedValues({
              id: dataId,
              surveyId,
              ...row,
              createdAt: Timestamp.now(),
            });
            
            batch.set(rowRef, rowData);
          });
          return batch;
        };

        // Retry logic with special handling for quota errors
        // Note: Firestore batches can only be committed once, so we recreate them on retry
        let batchCommitted = false;
        let retryAttempt = 0;
        const maxRetries = this.MAX_QUOTA_RETRIES;
        
        while (!batchCommitted && retryAttempt <= maxRetries) {
          try {
            const batch = createBatch();
            await batch.commit();
            batchCommitted = true;
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
            
            // Check if it's a quota error
            if (this.isQuotaError(err)) {
              if (retryAttempt < maxRetries) {
                // Exponential backoff for quota errors: 5s, 10s, 20s, 40s, 80s
                const delay = this.QUOTA_RETRY_DELAY * Math.pow(2, retryAttempt);
                console.warn(`⚠️ Quota exceeded on batch ${batchNumber}/${totalBatches}. Retrying in ${delay / 1000}s... (attempt ${retryAttempt + 1}/${maxRetries + 1})`);
                await this.sleep(delay);
                retryAttempt++;
                continue;
              } else {
                // Max retries exceeded for quota error
                console.error(`❌ Quota exceeded: Failed to commit batch ${batchNumber}/${totalBatches} after ${maxRetries + 1} attempts (${elapsedSeconds}s)`);
                throw new Error(
                  `Firestore quota exceeded. This may be due to:\n` +
                  `- Daily write limit reached (20,000 writes/day on free tier)\n` +
                  `- Rate limiting (too many writes too quickly)\n\n` +
                  `Please try again later or upgrade your Firebase plan.`
                );
              }
            } else {
              // Non-quota error - use standard retry logic
              if (retryAttempt < this.MAX_RETRIES) {
                const delay = this.RETRY_DELAY * Math.pow(2, retryAttempt);
                console.warn(`⚠️ Failed to commit batch ${batchNumber}/${totalBatches} (attempt ${retryAttempt + 1}/${this.MAX_RETRIES + 1}), retrying in ${delay}ms...`);
                await this.sleep(delay);
                retryAttempt++;
                continue;
              } else {
                console.error(`❌ Failed to commit batch ${batchNumber}/${totalBatches} after ${retryAttempt + 1} attempts (${elapsedSeconds}s):`, error);
                throw error;
              }
            }
          }
        }
        
        completedBatches++;
        
        // Report progress: 0-100% mapped to the data saving phase (70-100% of total upload)
        // This means 70% = start of save, 100% = end of save
        const progressPercent = 70 + (completedBatches / totalBatches) * 30;
        onProgress?.(Math.min(progressPercent, 100));
        
        // Only log every 5 batches or on last batch to reduce console noise for large uploads
        if (completedBatches % 5 === 0 || completedBatches === totalBatches) {
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const rowsPerSecond = Math.round((i + chunk.length) / elapsedSeconds);
          console.log(`📊 FirestoreService: Saved batch ${completedBatches}/${totalBatches} (${Math.round(progressPercent)}%) - ${rowsPerSecond} rows/sec`);
        }
        
        // Add delay between batches to respect rate limits (except for last batch)
        if (i + batchSize < rows.length) {
          await this.sleep(this.BATCH_DELAY);
        }
      }

      console.log('✅ FirestoreService: Saved survey data:', rows.length, 'rows');
      
      // Log audit event
      await this.logAuditEvent('update', 'surveyData', surveyId, { rowCount: rows.length });
    }, 'saveSurveyData');
  }

  // ==================== Upload Survey ====================

  async uploadSurvey(
    file: File,
    surveyName: string,
    surveyYear: number,
    surveyType: string,
    providerType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ surveyId: string; rowCount: number }> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    onProgress?.(10);

    // Parse CSV file with encoding detection
    const { text, encoding, issues, normalized } = await readCSVFile(file);
    
    if (issues.length > 0) {
      console.warn('📤 FirestoreService: Encoding issues detected:', issues);
    }
    if (normalized) {
      console.log('📤 FirestoreService: Character normalization applied');
    }

    // Parse CSV text into rows
    const rows = this.parseCSV(text);
    onProgress?.(50);

    // Create survey
    const surveyId = `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const survey: Survey = {
      id: surveyId,
      name: surveyName,
      year: surveyYear.toString(),
      type: surveyType,
      uploadDate: new Date(),
      rowCount: rows.length,
      specialtyCount: new Set(rows.map(r => r.specialty)).size,
      dataPoints: rows.length,
      colorAccent: '#6366f1',
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        providerType,
        encoding,
      },
      providerType: providerType as ProviderType,
    };

    await this.createSurvey(survey);
    onProgress?.(70);

    // Save survey data with progress reporting
    await this.saveSurveyData(surveyId, rows, onProgress);
    onProgress?.(100);

    return { surveyId, rowCount: rows.length };
  }

  /**
   * Parse CSV text into rows
   */
  private parseCSV(text: string): ISurveyRow[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Parse header
    const header = parseCSVLine(lines[0]);
    const rows: ISurveyRow[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== header.length) continue; // Skip malformed rows

      const row: any = {};
      header.forEach((key, index) => {
        row[key] = values[index] || '';
      });
      rows.push(row as ISurveyRow);
    }

    return rows;
  }

  // ==================== Specialty Mapping Methods ====================

  async getAllSpecialtyMappings(providerType?: string): Promise<ISpecialtyMapping[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath('specialtyMappings'));
    const constraints: QueryConstraint[] = [];
    
    if (providerType) {
      constraints.push(where('providerType', '==', providerType));
    }

    const q = constraints.length > 0 
      ? query(mappingsRef, ...constraints)
      : query(mappingsRef);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ISpecialtyMapping[];
  }

  async createSpecialtyMapping(mapping: ISpecialtyMapping): Promise<ISpecialtyMapping> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('specialtyMappings'), mapping.id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData);

    return mapping;
  }

  async updateSpecialtyMapping(id: string, updates: Partial<ISpecialtyMapping>): Promise<ISpecialtyMapping> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('specialtyMappings'), id);
    const currentDoc = await getDoc(mappingRef);
    
    if (!currentDoc.exists()) {
      throw new Error(`Specialty mapping with id ${id} not found`);
    }

    const currentData = currentDoc.data();
    const updatedMapping = this.removeUndefinedValues({
      ...currentData,
      ...updates,
      updatedAt: Timestamp.now(),
    });

    await setDoc(mappingRef, updatedMapping, { merge: true });
    
    // Convert Firestore Timestamps to Dates for return
    return {
      ...updatedMapping,
      id,
      createdAt: currentData.createdAt ? this.toDate(currentData.createdAt) : new Date(),
      updatedAt: new Date(),
    } as ISpecialtyMapping;
  }

  async deleteSpecialtyMapping(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('specialtyMappings'), id);
    await deleteDoc(mappingRef);
  }

  async clearAllSpecialtyMappings(): Promise<void> {
    const mappings = await this.getAllSpecialtyMappings();
    const batch = writeBatch(this.db!);
    
    mappings.forEach(mapping => {
      const mappingRef = doc(this.db!, this.getUserPath('specialtyMappings'), mapping.id);
      batch.delete(mappingRef);
    });

    await batch.commit();
  }

  // ==================== Column Mapping Methods ====================

  async getAllColumnMappings(providerType?: string): Promise<IColumnMapping[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath('columnMappings'));
    const constraints: QueryConstraint[] = [];
    
    if (providerType) {
      constraints.push(where('providerType', '==', providerType));
    }

    const q = constraints.length > 0 
      ? query(mappingsRef, ...constraints)
      : query(mappingsRef);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as IColumnMapping[];
  }

  async createColumnMapping(mapping: IColumnMapping): Promise<IColumnMapping> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('columnMappings'), mapping.id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData);

    return mapping;
  }

  async deleteColumnMapping(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('columnMappings'), id);
    await deleteDoc(mappingRef);
  }

  async clearAllColumnMappings(): Promise<void> {
    const mappings = await this.getAllColumnMappings();
    const batch = writeBatch(this.db!);
    
    mappings.forEach(mapping => {
      const mappingRef = doc(this.db!, this.getUserPath('columnMappings'), mapping.id);
      batch.delete(mappingRef);
    });

    await batch.commit();
  }

  async getUnmappedColumns(providerType?: string): Promise<any[]> {
    // Implementation would query survey data to find unmapped columns
    // For now, return empty array
    return [];
  }

  // ==================== Variable Mapping Methods ====================

  async getVariableMappings(providerType?: string): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath('variableMappings'));
    const constraints: QueryConstraint[] = [];
    
    if (providerType) {
      constraints.push(where('providerType', '==', providerType));
    }

    const q = constraints.length > 0 
      ? query(mappingsRef, ...constraints)
      : query(mappingsRef);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Detect variable type from variable name
   */
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

  async getUnmappedVariables(providerType?: string): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    console.log('🔍 FirestoreService.getUnmappedVariables: Called with providerType:', providerType);
    
    try {
      const surveys = await this.getAllSurveys();
      console.log('🔍 FirestoreService.getUnmappedVariables: Total surveys found:', surveys.length);
      
      if (surveys.length === 0) {
        return [];
      }
      
      const mappings = await this.getVariableMappings(providerType);
      
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceVariables?.forEach((source: any) => {
          mappedNames.add(source.originalVariableName?.toLowerCase() || '');
        });
      });

      const unmapped: any[] = [];
      const variableCounts = new Map<string, { count: number; sources: Set<string> }>();

      for (const survey of surveys) {
        // Filter surveys by data category (Provider Type) if specified
        if (providerType !== undefined) {
          let surveyMatchesProviderType = false;
          
          const isCallPay = this.isCallPaySurvey(survey);
          const isMoonlighting = this.isMoonlightingSurvey(survey);
          const effectiveProviderType = this.getEffectiveProviderType(survey);
          
          if (providerType === 'CALL') {
            surveyMatchesProviderType = isCallPay;
          } else if (providerType === 'PHYSICIAN') {
            const isPhysicianCompensation = (effectiveProviderType === 'PHYSICIAN') && 
                                         !isCallPay && 
                                         !isMoonlighting &&
                                         this.isCompensationSurvey(survey);
            surveyMatchesProviderType = isPhysicianCompensation;
          } else if (providerType === 'APP') {
            surveyMatchesProviderType = (effectiveProviderType === 'APP') && 
                                     !isCallPay && 
                                     !isMoonlighting;
          } else {
            surveyMatchesProviderType = effectiveProviderType === providerType || 
                                     survey.providerType === providerType;
          }
          
          if (!surveyMatchesProviderType) {
            continue;
          }
        }
        
        const { rows } = await this.getSurveyData(survey.id);
        
        // Get survey source with proper fallbacks
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
        
        rows.forEach(row => {
          const variable = row.variable || row.Variable || row['Variable Name'];
          if (variable && typeof variable === 'string' && !mappedNames.has(variable.toLowerCase())) {
            const key = variable.toLowerCase();
            const current = variableCounts.get(key) || { count: 0, sources: new Set() };
            current.count++;
            current.sources.add(surveySource);
            variableCounts.set(key, current);
          }
        });
      }

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

      console.log('🔍 FirestoreService.getUnmappedVariables: Processing complete:', {
        providerType,
        totalSurveys: surveys.length,
        totalUnmappedVariables: unmapped.length
      });

      return unmapped;
    } catch (error) {
      console.error('❌ FirestoreService.getUnmappedVariables: Error:', error);
      throw error;
    }
  }

  async createVariableMapping(mapping: any): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('variableMappings'), mapping.id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData);

    return mapping;
  }

  async updateVariableMapping(id: string, mapping: any): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('variableMappings'), id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData, { merge: true });

    return mapping;
  }

  async deleteVariableMapping(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('variableMappings'), id);
    await deleteDoc(mappingRef);
  }

  async clearAllVariableMappings(): Promise<void> {
    const mappings = await this.getVariableMappings();
    const batch = writeBatch(this.db!);
    
    mappings.forEach(mapping => {
      const mappingRef = doc(this.db!, this.getUserPath('variableMappings'), mapping.id);
      batch.delete(mappingRef);
    });

    await batch.commit();
  }

  // ==================== Provider Type Mapping Methods ====================

  async getProviderTypeMappings(providerType?: string): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath('providerTypeMappings'));
    const q = providerType 
      ? query(mappingsRef, where('providerType', '==', providerType))
      : query(mappingsRef);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getUnmappedProviderTypes(providerType?: string): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    console.log('🔍 FirestoreService.getUnmappedProviderTypes: Called with providerType:', providerType);
    
    try {
      const surveys = await this.getAllSurveys();
      console.log('🔍 FirestoreService.getUnmappedProviderTypes: Total surveys found:', surveys.length);
      
      if (surveys.length === 0) {
        return [];
      }
      
      const mappings = await this.getProviderTypeMappings(providerType);
      
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceProviderTypes?.forEach((source: any) => {
          // Handle both old and new structure
          const providerTypeName = source.providerType || source.name || '';
          if (providerTypeName) {
            mappedNames.add(providerTypeName.toLowerCase());
          }
        });
      });

      const unmapped: any[] = [];
      const providerTypeCounts = new Map<string, { count: number; sources: Set<string> }>();

      for (const survey of surveys) {
        // Filter surveys by provider type if specified
        // Use the same logic as getUnmappedSpecialties to properly exclude Call Pay surveys
        if (providerType !== undefined) {
          let surveyMatchesProviderType = false;
          
          const isCallPay = this.isCallPaySurvey(survey);
          const isMoonlighting = this.isMoonlightingSurvey(survey);
          const effectiveProviderType = this.getEffectiveProviderType(survey);
          
          if (providerType === 'CALL') {
            surveyMatchesProviderType = isCallPay;
          } else if (providerType === 'PHYSICIAN') {
            const isPhysicianCompensation = (effectiveProviderType === 'PHYSICIAN') && 
                                         !isCallPay && 
                                         !isMoonlighting &&
                                         this.isCompensationSurvey(survey);
            surveyMatchesProviderType = isPhysicianCompensation;
          } else if (providerType === 'APP') {
            surveyMatchesProviderType = (effectiveProviderType === 'APP') && 
                                     !isCallPay && 
                                     !isMoonlighting;
          } else {
            surveyMatchesProviderType = effectiveProviderType === providerType || 
                                     survey.providerType === providerType;
          }
          
          if (!surveyMatchesProviderType) {
            continue;
          }
        }
        
        const { rows } = await this.getSurveyData(survey.id);
        
        // Get survey source with proper fallbacks
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
        
        rows.forEach(row => {
          // Look for provider type in different possible column names
          const rowProviderType = row.providerType || row['Provider Type'] || row.provider_type || row['provider_type'];
          if (rowProviderType && typeof rowProviderType === 'string' && !mappedNames.has(rowProviderType.toLowerCase())) {
            const key = rowProviderType.toLowerCase();
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

      console.log('🔍 FirestoreService.getUnmappedProviderTypes: Processing complete:', {
        providerType,
        totalSurveys: surveys.length,
        totalUnmappedProviderTypes: unmapped.length
      });

      return unmapped;
    } catch (error) {
      console.error('❌ FirestoreService.getUnmappedProviderTypes: Error:', error);
      throw error;
    }
  }

  async createProviderTypeMapping(mapping: any): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('providerTypeMappings'), mapping.id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData);

    return mapping;
  }

  async updateProviderTypeMapping(id: string, mapping: any): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('providerTypeMappings'), id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData, { merge: true });

    return mapping;
  }

  async deleteProviderTypeMapping(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('providerTypeMappings'), id);
    await deleteDoc(mappingRef);
  }

  async clearAllProviderTypeMappings(): Promise<void> {
    const mappings = await this.getProviderTypeMappings();
    const batch = writeBatch(this.db!);
    
    mappings.forEach(mapping => {
      const mappingRef = doc(this.db!, this.getUserPath('providerTypeMappings'), mapping.id);
      batch.delete(mappingRef);
    });

    await batch.commit();
  }

  // ==================== Region Mapping Methods ====================

  async getRegionMappings(providerType?: string): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath('regionMappings'));
    const q = providerType 
      ? query(mappingsRef, where('providerType', '==', providerType))
      : query(mappingsRef);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getUnmappedRegions(providerType?: string): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    console.log('🔍 FirestoreService.getUnmappedRegions: Called with providerType:', providerType);
    
    try {
      const surveys = await this.getAllSurveys();
      console.log('🔍 FirestoreService.getUnmappedRegions: Total surveys found:', surveys.length);
      
      if (surveys.length === 0) {
        return [];
      }
      
      const mappings = await this.getRegionMappings(providerType);
      
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceRegions?.forEach((source: any) => {
          mappedNames.add(source.region?.toLowerCase() || '');
        });
      });

      const unmapped: any[] = [];
      const regionCounts = new Map<string, { count: number; sources: Set<string> }>();

      for (const survey of surveys) {
        // Filter surveys by provider type if specified
        if (providerType !== undefined) {
          let surveyMatchesProviderType = false;
          
          const isCallPay = this.isCallPaySurvey(survey);
          const isMoonlighting = this.isMoonlightingSurvey(survey);
          const effectiveProviderType = this.getEffectiveProviderType(survey);
          
          if (providerType === 'CALL') {
            surveyMatchesProviderType = isCallPay;
          } else if (providerType === 'PHYSICIAN') {
            const isPhysicianCompensation = (effectiveProviderType === 'PHYSICIAN') && 
                                         !isCallPay && 
                                         !isMoonlighting &&
                                         this.isCompensationSurvey(survey);
            surveyMatchesProviderType = isPhysicianCompensation;
          } else if (providerType === 'APP') {
            surveyMatchesProviderType = (effectiveProviderType === 'APP') && 
                                     !isCallPay && 
                                     !isMoonlighting;
          } else {
            surveyMatchesProviderType = effectiveProviderType === providerType || 
                                     survey.providerType === providerType;
          }
          
          if (!surveyMatchesProviderType) {
            continue;
          }
        }
        
        const { rows } = await this.getSurveyData(survey.id);
        
        // Get survey source with proper fallbacks
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
        
        rows.forEach(row => {
          // ENTERPRISE FIX: Handle both WIDE format (direct properties) and LONG format (nested in data)
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

      console.log('🔍 FirestoreService.getUnmappedRegions: Processing complete:', {
        providerType,
        totalSurveys: surveys.length,
        totalUnmappedRegions: unmapped.length
      });

      return unmapped;
    } catch (error) {
      console.error('❌ FirestoreService.getUnmappedRegions: Error:', error);
      throw error;
    }
  }

  async createRegionMapping(mapping: any): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('regionMappings'), mapping.id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData);

    return mapping;
  }

  async updateRegionMapping(id: string, mapping: any): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('regionMappings'), id);
    const mappingData = this.removeUndefinedValues({
      ...mapping,
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData, { merge: true });

    return mapping;
  }

  async deleteRegionMapping(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingRef = doc(this.db, this.getUserPath('regionMappings'), id);
    await deleteDoc(mappingRef);
  }

  async clearAllRegionMappings(): Promise<void> {
    const mappings = await this.getRegionMappings();
    const batch = writeBatch(this.db!);
    
    mappings.forEach(mapping => {
      const mappingRef = doc(this.db!, this.getUserPath('regionMappings'), mapping.id);
      batch.delete(mappingRef);
    });

    await batch.commit();
  }

  // ==================== Learned Mappings Methods ====================

  async getLearnedMappings(
    type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType',
    providerType?: string
  ): Promise<Record<string, string>> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath(`learnedMappings/${type}`));
    const constraints: QueryConstraint[] = [];
    
    if (providerType) {
      constraints.push(where('providerType', '==', providerType));
    }

    const q = constraints.length > 0 
      ? query(mappingsRef, ...constraints)
      : query(mappingsRef);
    
    const snapshot = await getDocs(q);
    const result: Record<string, string> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      result[data.original] = data.corrected;
    });

    return result;
  }

  async saveLearnedMapping(
    type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType',
    original: string,
    corrected: string,
    providerType?: string,
    surveySource?: string
  ): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingId = `${type}_${original}_${corrected}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const mappingRef = doc(this.db, this.getUserPath(`learnedMappings/${type}`), mappingId);
    
    const mappingData = this.removeUndefinedValues({
      original,
      corrected,
      providerType: providerType || null,
      surveySource: surveySource || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(mappingRef, mappingData);
  }

  async removeLearnedMapping(
    type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType',
    original: string
  ): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    // Find and delete the mapping
    const mappingsRef = collection(this.db, this.getUserPath(`learnedMappings/${type}`));
    const q = query(mappingsRef, where('original', '==', original));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(this.db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async clearLearnedMappings(
    type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'
  ): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath(`learnedMappings/${type}`));
    const snapshot = await getDocs(mappingsRef);
    const batch = writeBatch(this.db);
    
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async getLearnedMappingsWithSource(
    type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType',
    providerType?: string
  ): Promise<Array<{original: string, corrected: string, surveySource: string}>> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const mappingsRef = collection(this.db, this.getUserPath(`learnedMappings/${type}`));
    const constraints: QueryConstraint[] = [];
    
    if (providerType) {
      constraints.push(where('providerType', '==', providerType));
    }

    const q = constraints.length > 0 
      ? query(mappingsRef, ...constraints)
      : query(mappingsRef);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        original: data.original,
        corrected: data.corrected,
        surveySource: data.surveySource || '',
      };
    });
  }

  // ==================== Unmapped Methods ====================

  /**
   * Helper method to determine if a survey is a Call Pay survey
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
   * Get effective provider type from survey
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

  async getUnmappedSpecialties(providerType?: string): Promise<IUnmappedSpecialty[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    console.log('🔍 FirestoreService.getUnmappedSpecialties: Called with providerType:', providerType);
    console.log('🔍 FirestoreService.getUnmappedSpecialties: User ID:', this.userId);
    
    try {
      const surveys = await this.getAllSurveys();
      console.log('🔍 FirestoreService.getUnmappedSpecialties: Total surveys found:', surveys.length);
    
    // ENTERPRISE FIX: Handle case when no surveys exist
    if (surveys.length === 0) {
      return [];
    }
    
    // ENTERPRISE FIX: When providerType is undefined (showing all categories),
    // we still need to get all mappings to check for mapped specialties.
    // However, we should NOT filter surveys by providerType when building unmapped list.
    const mappings = await this.getAllSpecialtyMappings(providerType);
    
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

    const unmapped: IUnmappedSpecialty[] = [];
    const specialtyCounts = new Map<string, { count: number; sources: Set<string> }>();

    console.log('🔍 FirestoreService.getUnmappedSpecialties: Starting survey processing with filter:', providerType);
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
        console.log(`🔍 FirestoreService.getUnmappedSpecialties: Including Call Pay survey: ${survey.type || survey.name}, providerType: ${survey.providerType}`);
      }
      
      console.log(`🔍 FirestoreService.getUnmappedSpecialties: Processing survey ${survey.id} (${survey.name || survey.type}), providerType: ${survey.providerType}`);
      const { rows } = await this.getSurveyData(survey.id);
      console.log(`🔍 FirestoreService.getUnmappedSpecialties: Retrieved ${rows.length} rows from survey ${survey.id}`);
      
      if (rows.length === 0) {
        console.warn(`⚠️ FirestoreService.getUnmappedSpecialties: Survey ${survey.id} has no data rows!`);
        continue;
      }
      
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
        console.log(`🔍 FirestoreService.getUnmappedSpecialties: Processing Call Pay survey source: ${surveySource}`);
      }
      
      rows.forEach(row => {
        // ENTERPRISE STANDARD: No row-level filtering needed
        // Survey-level filtering already ensures data separation
        // If a survey was uploaded as PHYSICIAN/APP, ALL rows belong to that provider type
        
        const specialty = row.specialty || row.Specialty || row['Provider Type'];
        
        // ENTERPRISE FIX: Check if specialty is mapped for this specific survey source
        // Only consider it mapped if there are actual mappings for this specific survey source
        const isMappedForThisSource = specialty && typeof specialty === 'string' && 
          mappedNamesBySource.has(surveySource) && 
          mappedNamesBySource.get(surveySource)!.has(specialty.toLowerCase());
        
        if (specialty && typeof specialty === 'string' && !isMappedForThisSource) {
          const key = specialty.toLowerCase();
          const current = specialtyCounts.get(key) || { count: 0, sources: new Set() };
          current.count++;
          current.sources.add(surveySource);
          specialtyCounts.set(key, current);
          
          // ENTERPRISE DEBUG: Log Call Pay specialties being added
          if (survey.providerType === 'CALL') {
            console.log(`🔍 FirestoreService.getUnmappedSpecialties: Adding unmapped Call Pay specialty: "${specialty}" from ${surveySource}`);
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
          surveySource: surveySource as any, // SurveySource type
          providerType: providerType as any // Store provider type for display
        });
      });
    });
    
    console.log('🔍 FirestoreService.getUnmappedSpecialties: Processing complete:', {
      providerType,
      totalSurveys: surveys.length,
      processedSurveys: processedCount,
      excludedSurveys: excludedCount,
      totalUnmappedSpecialties: unmapped.length
    });

    return unmapped;
    } catch (error) {
      console.error('❌ FirestoreService.getUnmappedSpecialties: Error:', error);
      throw error;
    }
  }

  // ==================== Cache Methods ====================

  async saveToCache(key: string, data: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const cacheRef = doc(this.db, this.getUserPath('cache'), key);
    const cacheData = this.removeUndefinedValues({
      data,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
      createdAt: Timestamp.now(),
    });
    await setDoc(cacheRef, cacheData);
  }

  async getFromCache(key: string): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const cacheRef = doc(this.db, this.getUserPath('cache'), key);
    const snapshot = await getDoc(cacheRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    const expiresAt = data.expiresAt?.toDate();
    
    if (expiresAt && expiresAt < new Date()) {
      // Cache expired, delete it
      await deleteDoc(cacheRef);
      return null;
    }

    return data.data;
  }

  async clearCache(key?: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    if (key) {
      const cacheRef = doc(this.db, this.getUserPath('cache'), key);
      await deleteDoc(cacheRef);
    } else {
      const cacheRef = collection(this.db, this.getUserPath('cache'));
      const snapshot = await getDocs(cacheRef);
      const batch = writeBatch(this.db);
      
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }

  // ==================== Blend Templates Methods ====================

  async getAllBlendTemplates(): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const templatesRef = collection(this.db, this.getUserPath('blendTemplates'));
    const snapshot = await getDocs(templatesRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? this.toDate(data.createdAt) : new Date(),
      };
    });
  }

  async saveBlendTemplate(template: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const templateRef = doc(this.db, this.getUserPath('blendTemplates'), template.id);
    const templateData = this.removeUndefinedValues({
      ...template,
      createdAt: template.createdAt ? this.toTimestamp(template.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(templateRef, templateData);
    console.log('✅ FirestoreService: Saved blend template:', template.id);
  }

  async deleteBlendTemplate(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const templateRef = doc(this.db, this.getUserPath('blendTemplates'), id);
    await deleteDoc(templateRef);
    console.log('✅ FirestoreService: Deleted blend template:', id);
  }

  // ==================== Specialty Mapping Sources Methods ====================

  async getSpecialtyMappingSources(mappingId: string): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const sourcesRef = collection(this.db, this.getUserPath('specialtyMappingSources'));
    const q = query(sourcesRef, where('mappingId', '==', mappingId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? this.toDate(doc.data().createdAt) : new Date(),
    }));
  }

  async saveSpecialtyMappingSource(source: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const sourceRef = doc(this.db, this.getUserPath('specialtyMappingSources'), source.id);
    const sourceData = this.removeUndefinedValues({
      ...source,
      createdAt: source.createdAt ? this.toTimestamp(source.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(sourceRef, sourceData);
    console.log('✅ FirestoreService: Saved specialty mapping source:', source.id);
  }

  async deleteSpecialtyMappingSource(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const sourceRef = doc(this.db, this.getUserPath('specialtyMappingSources'), id);
    await deleteDoc(sourceRef);
    console.log('✅ FirestoreService: Deleted specialty mapping source:', id);
  }

  async deleteSpecialtyMappingSourcesByMappingId(mappingId: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const sourcesRef = collection(this.db, this.getUserPath('specialtyMappingSources'));
    const q = query(sourcesRef, where('mappingId', '==', mappingId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(this.db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('✅ FirestoreService: Deleted specialty mapping sources for mapping:', mappingId);
  }

  // ==================== Custom Reports Methods ====================

  async getAllCustomReports(): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const reportsRef = collection(this.db, this.getUserPath('customReports'));
    const q = query(reportsRef, orderBy('created', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created: data.created ? this.toDate(data.created) : new Date(),
      };
    });
  }

  async saveCustomReport(report: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const reportRef = doc(this.db, this.getUserPath('customReports'), report.id);
    const reportData = this.removeUndefinedValues({
      ...report,
      created: report.created ? this.toTimestamp(report.created) : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(reportRef, reportData);
    console.log('✅ FirestoreService: Saved custom report:', report.id);
  }

  async deleteCustomReport(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const reportRef = doc(this.db, this.getUserPath('customReports'), id);
    await deleteDoc(reportRef);
    console.log('✅ FirestoreService: Deleted custom report:', id);
  }

  // ==================== User Preferences Methods ====================

  async getUserPreferences(): Promise<Record<string, any>> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const preferencesRef = collection(this.db, this.getUserPath('preferences'));
    const snapshot = await getDocs(preferencesRef);
    
    const preferences: Record<string, any> = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      preferences[doc.id] = data.value || data;
    });

    return preferences;
  }

  async getUserPreference(key: string): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const preferenceRef = doc(this.db, this.getUserPath('preferences'), key);
    const snapshot = await getDoc(preferenceRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return data.value || data;
  }

  async saveUserPreferences(preferences: Record<string, any>): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    const batch = writeBatch(this.db);
    
    Object.entries(preferences).forEach(([key, value]) => {
      const preferenceRef = doc(this.db!, this.getUserPath('preferences'), key);
      const prefData = this.removeUndefinedValues({
        value,
        updatedAt: Timestamp.now(),
      });
      batch.set(preferenceRef, prefData, { merge: true });
    });

    await batch.commit();
    console.log('✅ FirestoreService: Saved user preferences');
  }

  async saveUserPreference(key: string, value: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const preferenceRef = doc(this.db, this.getUserPath('preferences'), key);
    const prefData = this.removeUndefinedValues({
      value,
      updatedAt: Timestamp.now(),
    });
    await setDoc(preferenceRef, prefData, { merge: true });
    console.log('✅ FirestoreService: Saved user preference:', key);
  }

  async updateUserPreferences(updates: Record<string, any>): Promise<void> {
    await this.saveUserPreferences(updates);
  }

  async deleteUserPreference(key: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const preferenceRef = doc(this.db, this.getUserPath('preferences'), key);
    await deleteDoc(preferenceRef);
    console.log('✅ FirestoreService: Deleted user preference:', key);
  }

  // ==================== Audit Logging Methods ====================

  async logAuditEvent(action: string, resourceType: string, resourceId: string, details?: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const logId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logRef = doc(this.db, this.getUserPath('auditLogs'), logId);
    
    const logData = this.removeUndefinedValues({
      action,
      resourceType,
      resourceId,
      details: details || {},
      userId: this.userId,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
    await setDoc(logRef, logData);
    
    console.log('📝 FirestoreService: Logged audit event:', action, resourceType, resourceId);
  }

  async getAuditLogs(limitCount: number = 100): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const logsRef = collection(this.db, this.getUserPath('auditLogs'));
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? this.toDate(data.timestamp) : new Date(),
        createdAt: data.createdAt ? this.toDate(data.createdAt) : new Date(),
      };
    });
  }

  async getAuditLogsByAction(action: string, limitCount: number = 100): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const logsRef = collection(this.db, this.getUserPath('auditLogs'));
    const q = query(
      logsRef,
      where('action', '==', action),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? this.toDate(data.timestamp) : new Date(),
        createdAt: data.createdAt ? this.toDate(data.createdAt) : new Date(),
      };
    });
  }

  async getAuditLogsByResource(resourceType: string, resourceId: string, limitCount: number = 100): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const logsRef = collection(this.db, this.getUserPath('auditLogs'));
    const q = query(
      logsRef,
      where('resourceType', '==', resourceType),
      where('resourceId', '==', resourceId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? this.toDate(data.timestamp) : new Date(),
        createdAt: data.createdAt ? this.toDate(data.createdAt) : new Date(),
      };
    });
  }

  // ==================== Health Check ====================

  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    try {
      if (!this.db || !this.userId) {
        return { status: 'unhealthy', timestamp: Date.now() };
      }

      // Try a simple read operation
      const testRef = doc(this.db, this.getUserPath('surveys'), 'health-check');
      await getDoc(testRef);

      return { status: 'healthy', timestamp: Date.now() };
    } catch (error) {
      console.error('Firestore health check failed:', error);
      return { status: 'unhealthy', timestamp: Date.now() };
    }
  }
}


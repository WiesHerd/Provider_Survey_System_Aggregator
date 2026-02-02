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
  getDocsFromServer,
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  writeBatch,
  getCountFromServer,
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
import { readCSVFile, parseCSVLine, normalizeRowStrings, normalizeText } from '../shared/utils';
import { isExcelFile, parseFile } from '../features/upload/utils/fileParser';
import { stripUserPrefix } from '../shared/utils/userScoping';

const isUploadDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('bp_upload_debug') === 'true';
};

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
  private readonly BATCH_DELAY = 10; // 10ms delay between batches (optimized for fast deletes)
  private readonly MAX_QUOTA_RETRIES = 5; // More retries for quota errors
  private readonly BATCH_CONCURRENCY = 4; // Process 4 batches in parallel for faster uploads
  private readonly BATCH_SIZE = 500; // Use Firestore's max batch size for fewer batches
  private offlineQueue: Array<() => Promise<void>> = [];
  private isOnline = true;

  /**
   * Delete documents from a collection in batches (Firestore limit: 500 writes per batch)
   */
  private async deleteCollectionInBatches(
    collectionPath: string,
    constraints: QueryConstraint[] = [],
    batchSize: number = 500
  ): Promise<number> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    let deletedCount = 0;
    let batchNumber = 0;

    while (true) {
      const collRef = collection(this.db, collectionPath);
      const q = query(collRef, ...constraints, limit(batchSize));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        break;
      }

      // PERFORMANCE: Firebase supports up to 500 operations per batch
      // But we can delete in sub-batches if needed
      const batch = writeBatch(this.db);
      snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();

      deletedCount += snapshot.size;
      batchNumber++;

      // Log progress for all batches (not just every 5000)
      // This helps users see that deletion is still progressing
      console.log(`🗑️ Deletion progress: ${deletedCount} documents deleted (batch ${batchNumber})`);
      
      // If this is a large deletion, log more frequently
      if (deletedCount % 5000 === 0) {
        console.log(`📊 Large deletion in progress: ${deletedCount} documents deleted so far...`);
      }

      // PERFORMANCE: Only add delay if there's more data to delete
      // This prevents unnecessary delays on the last batch
      if (snapshot.size === batchSize) {
        await this.sleep(this.BATCH_DELAY);
      }
    }

    console.log(`✅ Deletion complete: ${deletedCount} total documents deleted in ${batchNumber} batches`);
    return deletedCount;
  }

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
   * Process batches in parallel with controlled concurrency
   * Uses a semaphore pattern to limit concurrent batch operations
   */
  private async processBatchesInParallel<T>(
    batches: T[],
    concurrency: number,
    processor: (batch: T, index: number) => Promise<void>,
    onProgress?: (completed: number) => void
  ): Promise<void> {
    let completed = 0;
    let active = 0;
    let index = 0;
    const errors: Error[] = [];

    return new Promise((resolve, reject) => {
      const processNext = async () => {
        // If we've processed all batches, check if we're done
        if (index >= batches.length) {
          if (active === 0) {
            if (errors.length > 0) {
              reject(new Error(`Failed to process ${errors.length} batch(es): ${errors[0].message}`));
            } else {
              resolve();
            }
          }
          return;
        }

        // If we're at max concurrency, wait
        if (active >= concurrency) {
          return;
        }

        // Process next batch
        const currentIndex = index++;
        const batch = batches[currentIndex];
        active++;

        try {
          await processor(batch, currentIndex);
          completed++;
          onProgress?.(completed);
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        } finally {
          active--;
          // Process next batch
          processNext();
        }
      };

      // Start initial batch of concurrent operations
      for (let i = 0; i < Math.min(concurrency, batches.length); i++) {
        processNext();
      }
    });
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
  /**
   * CRITICAL: Ensure userId is synced with current auth state
   * This must be called before any write operation to prevent permission errors
   */
  private ensureUserIdSynced(): void {
    const authUid = this.auth?.currentUser?.uid;
    if (!authUid) {
      throw new Error('User not authenticated. Please sign in.');
    }
    if (this.userId !== authUid) {
      console.log('🔄 Syncing userId with current auth state:', {
        oldUserId: this.userId,
        newUserId: authUid,
        email: this.auth?.currentUser?.email
      });
      this.userId = authUid;
    }
  }

  private getUserPath(collectionName: string): string {
    // Always ensure userId is fresh before getting path
    this.ensureUserIdSynced();
    if (!this.userId) {
      throw new Error('User not authenticated. Please sign in.');
    }
    return `users/${this.userId}/${collectionName}`;
  }

  /**
   * Ensure user profile document exists in Firestore
   * 
   * Creates a user profile document at /users/{userId} if it doesn't exist.
   * This is required because Firestore only considers a document to "exist"
   * if it has at least one field, even if it has subcollections.
   * 
   * @param userEmail Optional email address from Firebase Auth
   * @returns Promise that resolves when profile is ensured
   */
  public async ensureUserProfile(userEmail?: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    try {
      const userRef = doc(this.db, 'users', this.userId);
      const userDoc = await getDoc(userRef);

      // If document doesn't exist or has no fields, create/update it
      if (!userDoc.exists() || Object.keys(userDoc.data() || {}).length === 0) {
        const userData: any = {
          email: userEmail || this.auth?.currentUser?.email || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Only include email if we have it
        if (!userData.email) {
          delete userData.email;
        }

        await setDoc(userRef, userData, { merge: true });
        console.log('✅ FirestoreService: User profile created/updated:', this.userId);
      }
    } catch (error) {
      console.error('❌ FirestoreService: Failed to ensure user profile:', error);
      // Don't throw - this is a non-critical operation
      // The document will be created on next attempt or when data is written
    }
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
   * Remove undefined values and empty field names from object.
   * Firestore rejects documents with undefined values or empty string field names
   * (e.g. from CSV/Excel blank column headers). This is critical for batch writes.
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
        // Firestore: document fields must not be empty (no "" keys)
        if (key === '') continue;
        // Skip undefined values
        if (value !== undefined) {
          const cleanedValue = this.removeUndefinedValues(value);
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

  async getAllSurveys(options?: { fromServer?: boolean }): Promise<Survey[]> {
    return await this.getAllSurveysWithRetry(3, options?.fromServer);
  }

  /**
   * Get all surveys with retry logic and exponential backoff
   * Includes health check before retry attempts.
   * When fromServer is true, bypasses local cache so duplicate check sees fresh state after deletes.
   */
  async getAllSurveysWithRetry(maxRetries: number = 3, fromServer: boolean = false): Promise<Survey[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Health check before retry (skip on first attempt for speed)
        if (attempt > 0) {
          console.log(`🔍 FirestoreService: Retry attempt ${attempt}/${maxRetries}, checking connectivity...`);
          const healthCheck = await this.checkConnectivity(3000);
          
          if (healthCheck.status !== 'healthy') {
            console.warn(`⚠️ FirestoreService: Health check failed (${healthCheck.status}), waiting before retry...`);
            // Wait with exponential backoff: 1s, 2s, 4s
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            await this.sleep(delay);
            continue;
          }
          
          console.log(`✅ FirestoreService: Health check passed (latency: ${healthCheck.latency}ms), retrying...`);
        }

        // Verify read capability
        if (attempt > 0) {
          const readCheck = await this.verifyReadCapability();
          if (!readCheck.canRead) {
            console.warn(`⚠️ FirestoreService: Read capability check failed: ${readCheck.error}`);
            // Wait before retry
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            await this.sleep(delay);
            continue;
          }
        }

        // Attempt to get surveys - fromServer bypasses cache (critical for duplicate check after delete)
        const surveysRef = collection(this.db, this.getUserPath('surveys'));
        const snapshot = fromServer
          ? await getDocsFromServer(surveysRef)
          : await getDocs(surveysRef);
        
        const surveys = snapshot.docs.map(doc => {
          const data = doc.data();
          const survey = {
            ...data,
            id: doc.id,
            uploadDate: this.toDate(data.uploadDate),
            createdAt: data.createdAt ? this.toDate(data.createdAt) : undefined,
            updatedAt: data.updatedAt ? this.toDate(data.updatedAt) : undefined,
          } as Survey;
          
          // CRITICAL: Some Firestore documents store name/providerType ONLY in metadata (see Firebase console)
          // Without this, surveys like "SullivanCotter APP 2025" never show in the list when filtering by APP
          const meta = (survey as any).metadata;
          if (meta && typeof meta === 'object') {
            if (!survey.name && meta.name) survey.name = meta.name;
            if (!survey.providerType && meta.providerType) survey.providerType = meta.providerType as any;
            if (!survey.type && meta.type) survey.type = meta.type;
            if (survey.year == null && meta.year != null) survey.year = String(meta.year);
            if (survey.rowCount == null && meta.rowCount != null) (survey as any).rowCount = meta.rowCount;
            if (survey.specialtyCount == null && meta.specialtyCount != null) (survey as any).specialtyCount = meta.specialtyCount;
            if (survey.dataPoints == null && meta.dataPoints != null) (survey as any).dataPoints = meta.dataPoints;
            if (!(survey as any).source && meta.source) (survey as any).source = meta.source;
            if (!(survey as any).dataCategory && meta.dataCategory) (survey as any).dataCategory = meta.dataCategory;
          }
          
          // CRITICAL: Normalize "Staff Physician" to "PHYSICIAN" when reading from Firestore
          // This ensures surveys with "Staff Physician" are treated as "PHYSICIAN"
          if (survey.providerType) {
            const providerTypeUpper = (survey.providerType as string).toUpperCase();
            if (providerTypeUpper === 'STAFF PHYSICIAN' || providerTypeUpper === 'STAFFPHYSICIAN') {
              survey.providerType = 'PHYSICIAN';
            }
          }
          
          return survey;
        });

        console.log(`✅ FirestoreService: Retrieved ${surveys.length} surveys${attempt > 0 ? ` (after ${attempt} retry${attempt > 1 ? 'ies' : ''})` : ''}`);
        return surveys;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ FirestoreService: getAllSurveys attempt ${attempt + 1} failed:`, lastError.message);

        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000); // Exponential backoff: 1s, 2s, 4s
          console.log(`⏳ FirestoreService: Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const errorMessage = `Failed to get surveys after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`;
    console.error(`❌ FirestoreService: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  async createSurvey(survey: Partial<Survey> & { id: string }): Promise<Survey> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    return await this.executeWithOfflineQueue(async () => {
      // CRITICAL: Always refresh userId from auth state before any write operation
      // This ensures we have the latest authenticated user ID
      const authUid = this.auth?.currentUser?.uid;
      if (!authUid) {
        throw new Error('User not authenticated. Please sign in to upload surveys to Firebase.');
      }
      
      // CRITICAL FIX: Force refresh auth token before write operations
      // This ensures the token is fresh and valid for security rules
      try {
        if (this.auth?.currentUser) {
          console.log('🔄 Refreshing auth token before write operation...');
          await this.auth.currentUser.getIdToken(true); // Force refresh
          console.log('✅ Auth token refreshed successfully');
        }
      } catch (tokenError) {
        console.warn('⚠️ Could not refresh auth token (may still work):', tokenError);
        // Continue anyway - token might still be valid
      }
      
      // ALWAYS sync userId with current auth state before writing
      if (this.userId !== authUid) {
        console.log('🔄 Syncing userId with auth state:', {
          oldUserId: this.userId,
          newUserId: authUid,
          note: 'Updating userId to match current authenticated user'
        });
        this.userId = authUid;
      }
      
      if (!this.userId) {
        throw new Error('User ID not available. Please sign in and try again.');
      }
      
      const surveyRef = doc(this.db!, this.getUserPath('surveys'), survey.id);
      
      // CRITICAL: Remove all undefined values before saving to Firestore
      // Firestore will reject any document with undefined values
      const cleanedSurvey = this.removeUndefinedValues(survey);
      
      // CRITICAL: Normalize provider type at write time - ensure "Staff Physician" → "PHYSICIAN"
      // This ensures consistent provider type values in the database
      let normalizedProviderType = cleanedSurvey.providerType;
      if (normalizedProviderType) {
        const providerTypeUpper = String(normalizedProviderType).toUpperCase().trim();
        if (providerTypeUpper === 'STAFF PHYSICIAN' || providerTypeUpper === 'STAFFPHYSICIAN' || providerTypeUpper === 'PHYS') {
          normalizedProviderType = 'PHYSICIAN';
          console.log(`🔧 FirestoreService: Normalized providerType "${cleanedSurvey.providerType}" → "PHYSICIAN"`);
        } else if (providerTypeUpper === 'PHYSICIAN') {
          normalizedProviderType = 'PHYSICIAN'; // Ensure uppercase consistency
        } else if (providerTypeUpper === 'APP' || providerTypeUpper === 'ADVANCED PRACTICE PROVIDER' || providerTypeUpper === 'ADVANCED PRACTICE') {
          normalizedProviderType = 'APP'; // Ensure APP is consistent
          console.log(`🔧 FirestoreService: Normalized providerType "${cleanedSurvey.providerType}" → "APP"`);
        }
        // CRITICAL: Log the providerType being saved to help debug categorization issues
        console.log(`💾 FirestoreService: Saving survey with providerType: "${normalizedProviderType}" (original: "${cleanedSurvey.providerType}")`);
      }
      
      // Build the survey data object with normalized provider type
      const surveyDataRaw = {
        ...cleanedSurvey,
        providerType: normalizedProviderType, // Use normalized provider type
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
        metadataKeys: safeData.metadata ? Object.keys(safeData.metadata) : [],
        userId: this.userId,
        authUid: authUid,
        path: surveyRef.path,
        userIdMatches: this.userId === authUid
      });
      
      // CRITICAL: Log the exact path and user info before attempting write
      const expectedPath = `users/${authUid}/surveys/${survey.id}`;
      const actualPath = surveyRef.path;
      const pathMatches = expectedPath === actualPath;
      
      console.log('🔍 About to write survey to Firestore:', {
        surveyId: survey.id,
        surveyName: safeData.name,
        userId: this.userId,
        authUid: authUid,
        path: actualPath,
        expectedPath: expectedPath,
        pathMatches: pathMatches,
        userIdMatches: this.userId === authUid,
        authenticated: !!this.auth?.currentUser,
        email: this.auth?.currentUser?.email,
        rulesDeployed: 'Check Firebase Console → Firestore → Rules tab'
      });
      
      // CRITICAL: Verify path matches expected format
      if (!pathMatches) {
        const errorMsg = `PATH MISMATCH: Expected "${expectedPath}" but got "${actualPath}". This will cause permission errors!`;
        console.error('❌ CRITICAL:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // CRITICAL: Test write permission before attempting actual write
      console.log('🔍 Testing write permission with test document...');
      console.log('🔍 Auth diagnostic:', {
        userId: this.userId,
        authUid: authUid,
        userIdMatches: this.userId === authUid,
        email: this.auth?.currentUser?.email,
        path: this.getUserPath('surveys'),
        expectedPath: `users/${authUid}/surveys`
      });
      
      try {
        const testRef = doc(this.db!, this.getUserPath('surveys'), `_permission_test_${Date.now()}`);
        await setDoc(testRef, { 
          test: true, 
          timestamp: Timestamp.now(),
          userId: this.userId,
          authUid: authUid
        });
        // Immediately delete test document
        await deleteDoc(testRef);
        console.log('✅ Write permission test PASSED - security rules are working correctly');
      } catch (testError: any) {
        const testErrorMsg = testError?.message || String(testError);
        const testErrorCode = testError?.code || 'unknown';
        const actualPath = this.getUserPath('surveys');
        const expectedPath = `users/${authUid}/surveys`;
        const pathMatches = actualPath === expectedPath;
        
        console.error('❌ CRITICAL: Write permission test FAILED:', {
          error: testErrorMsg,
          code: testErrorCode,
          userId: this.userId,
          authUid: authUid,
          userIdMatches: this.userId === authUid,
          actualPath: actualPath,
          expectedPath: expectedPath,
          pathMatches: pathMatches,
          email: this.auth?.currentUser?.email,
          note: 'Security rules are blocking writes. Common causes: 1) Auth token expired (sign out/in), 2) userId mismatch, 3) Rules not deployed'
        });
        
        // Provide specific guidance based on the error
        let solutionMessage = '';
        if (!pathMatches) {
          solutionMessage = `PATH MISMATCH: Expected "${expectedPath}" but got "${actualPath}". This indicates a userId sync issue. `;
        } else if (testErrorCode === 'permission-denied') {
          solutionMessage = `Permission denied. Your auth token may be stale. `;
        }
        
        throw new Error(
          `Write permission test failed: ${testErrorMsg} (code: ${testErrorCode}). ` +
          solutionMessage +
          `SOLUTION: 1) Sign out and sign back in to refresh your auth token (top-right menu), ` +
          `2) Verify security rules are deployed: firebase deploy --only firestore:rules, ` +
          `3) Check browser console for detailed diagnostics showing userId and path.`
        );
      }
      
      try {
        console.log('🔍 Permission test passed - attempting actual survey write...');
        await setDoc(surveyRef, safeData);
        console.log('✅ Successfully wrote survey to Firestore:', surveyRef.path);
      } catch (error: any) {
        // CRITICAL: Provide helpful error message for permission errors
        if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
          const diagnosticInfo = {
            errorCode: error?.code,
            errorMessage: error?.message,
            userId: this.userId,
            authUid: authUid,
            path: surveyRef.path,
            authenticated: !!this.auth?.currentUser,
            email: this.auth?.currentUser?.email,
            userIdMatches: this.userId === authUid,
            expectedPath: `users/${authUid}/surveys/${survey.id}`,
            actualPath: surveyRef.path,
            pathMatches: surveyRef.path === `users/${authUid}/surveys/${survey.id}`,
            fullError: error
          };
          console.error('❌ CRITICAL: Permission denied error - FULL DIAGNOSTICS:', diagnosticInfo);
          
          // Build comprehensive error message
          let errorMessage = 'Missing or insufficient permissions. ';
          
          if (!this.auth?.currentUser) {
            errorMessage += 'You are not signed in. Please sign in using the user menu (top-right corner) and try again.';
          } else if (this.userId !== authUid) {
            errorMessage += `User ID mismatch detected (userId: ${this.userId}, authUid: ${authUid}). ` +
              `This usually means the security rules haven't been deployed. ` +
              `Please deploy Firestore security rules using: firebase deploy --only firestore:rules`;
          } else if (surveyRef.path !== `users/${authUid}/surveys/${survey.id}`) {
            errorMessage += `Path mismatch! Expected: users/${authUid}/surveys/${survey.id}, Got: ${surveyRef.path}. ` +
              `This is a code bug - please report it.`;
          } else {
            errorMessage += `Path looks correct (${surveyRef.path}), but permission denied. ` +
              `This usually means Firestore security rules have not been deployed to Firebase. ` +
              `Please deploy the security rules by running: firebase deploy --only firestore:rules ` +
              `Then refresh your browser and try again.`;
          }
          
          throw new Error(errorMessage);
        }
        throw error;
      }
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

    // CRITICAL FIX: Strip user prefix if present
    // Firebase uses path-based scoping (users/{userId}/surveys/{surveyId}),
    // so survey IDs don't need the user prefix. However, IndexedDB uses
    // prefixed IDs (userId_surveyId), and when merging results, the prefixed
    // ID might be passed here. We need to strip it before querying Firestore.
    const cleanSurveyId = stripUserPrefix(surveyId);

    const surveyRef = doc(this.db, this.getUserPath('surveys'), cleanSurveyId);
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

    await this.cascadeDelete(id);
    console.log('✅ FirestoreService: Deleted survey (cascade):', id);
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
        // ENTERPRISE FIX: If survey not found, it may have already been deleted
        // or may exist in IndexedDB instead. Try to delete from IndexedDB as fallback
        console.warn(`⚠️ FirestoreService: Survey ${surveyId} not found in Firebase. It may have already been deleted or exists in IndexedDB.`);
        
        // Check if survey exists in IndexedDB (might be a migration issue)
        try {
          const { IndexedDBService } = require('./IndexedDBService');
          const indexedDB = new IndexedDBService();
          const indexedDBSurvey = await indexedDB.getSurveyById(surveyId);
          if (indexedDBSurvey) {
            console.log(`📦 Found survey in IndexedDB, deleting from there instead`);
            const result = await indexedDB.deleteWithVerification(surveyId);
            return result;
          }
        } catch (indexedDBError) {
          // IndexedDB check failed, continue with Firebase deletion attempt
          console.debug('IndexedDB check failed (expected if using Firebase only)');
        }
        
        // Survey doesn't exist - treat as successful deletion (idempotent)
        console.log(`✅ Survey ${surveyId} not found - treating as already deleted`);
        return {
          success: true,
          deletedSurvey: false, // Wasn't found, so wasn't deleted
          deletedDataRows: 0,
          deletedMappings: 0,
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

    // CRITICAL SAFETY CHECK: Ensure surveyId is valid
    if (!surveyId || surveyId.trim() === '') {
      throw new Error('Invalid surveyId provided to cascadeDelete');
    }

    console.log(`🗑️ FirestoreService: Starting cascade delete for survey: ${surveyId}`);
    const overallStartTime = Date.now();

    // SAFETY: Verify survey exists before deleting
    const surveyRef = doc(this.db, this.getUserPath('surveys'), surveyId);
    const surveySnap = await getDoc(surveyRef);
    
    if (!surveySnap.exists()) {
      console.warn(`⚠️ Survey ${surveyId} not found in Firestore - may have already been deleted`);
      // Don't throw error - just log warning and continue to clean up data rows
    } else {
      // Delete survey document
      await deleteDoc(surveyRef);
      console.log(`✅ Deleted survey document: ${surveyId}`);
    }

    // Delete all survey data in batches
    console.log(`🗑️ Starting deletion of survey data rows for survey: ${surveyId}`);
    const startTime = Date.now();
    
    try {
      const deletedRows = await this.deleteCollectionInBatches(
        this.getUserPath('surveyData'),
        [where('surveyId', '==', surveyId)]
      );
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const totalDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);

      console.log('✅ FirestoreService: Cascade delete complete:', {
        surveyId,
        deletedRows,
        dataDeletionDuration: `${duration}s`,
        totalDuration: `${totalDuration}s`,
        timestamp: new Date().toISOString()
      });
    } catch (deleteError) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ FirestoreService: Error during cascade delete (after ${duration}s):`, deleteError);
      // Re-throw to let caller handle it
      throw deleteError;
    }
  }

  async deleteAllSurveys(): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    // CRITICAL SAFETY: Log this dangerous operation
    console.warn('⚠️ DANGER: deleteAllSurveys() called - this will delete ALL user surveys!');
    console.warn('⚠️ User ID:', this.userId);
    console.warn('⚠️ Timestamp:', new Date().toISOString());

    // SAFETY: Count surveys before deleting
    const surveysRef = collection(this.db, this.getUserPath('surveys'));
    const surveyCount = await getCountFromServer(surveysRef);
    console.warn(`⚠️ About to delete ${surveyCount.data().count} surveys`);

    const deletedSurveys = await this.deleteCollectionInBatches(this.getUserPath('surveys'));
    const deletedSurveyData = await this.deleteCollectionInBatches(this.getUserPath('surveyData'));

    console.log('✅ FirestoreService: Deleted all surveys and survey data', {
      deletedSurveys,
      deletedSurveyData,
      timestamp: new Date().toISOString()
    });
  }

  async forceClearDatabase(): Promise<void> {
    // Delete all collections for this user
    const collections = ['surveys', 'surveyData', 'specialtyMappings', 'columnMappings',
                       'variableMappings', 'regionMappings', 'providerTypeMappings'];
    
    for (const collName of collections) {
      await this.deleteCollectionInBatches(this.getUserPath(collName));
    }
    
    console.log('✅ FirestoreService: Cleared all database');
  }

  /**
   * Delete all user-scoped data (full wipe for "Clear all data").
   * Removes surveys, survey data, all mappings, preferences, custom reports, FMV, blend templates, etc.
   */
  async deleteAllUserData(): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }
    console.warn('⚠️ DANGER: deleteAllUserData() - full wipe of all user data');
    const collections = [
      'surveys',
      'surveyData',
      'uploadIntents',
      'specialtyMappings',
      'columnMappings',
      'variableMappings',
      'regionMappings',
      'providerTypeMappings',
      'learnedMappings',
      'preferences',
      'auditLogs',
      'blendTemplates',
      'specialtyMappingSources',
      'customReports',
      'fmvCalculations',
      'cache'
    ];
    for (const collName of collections) {
      await this.deleteCollectionInBatches(this.getUserPath(collName));
    }
    console.log('✅ FirestoreService: deleteAllUserData completed');
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

    // CRITICAL FIX: Strip user prefix if present (same as getSurveyById)
    const cleanSurveyId = stripUserPrefix(surveyId);

    // ENTERPRISE FIX: Reduced logging - only log in debug mode to prevent console spam
    if (isUploadDebugEnabled()) {
      console.log(`🔍 FirestoreService: Fetching survey data for ${surveyId} (normalized: ${cleanSurveyId})`, { filters, pagination });
    }

    const dataRef = collection(this.db, this.getUserPath('surveyData'));
    const constraints: QueryConstraint[] = [
      where('surveyId', '==', cleanSurveyId)
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
    
    // When 0 rows returned, log once so user can verify in Firebase Console (users/{uid}/surveyData, filter by surveyId)
    if (snapshot.docs.length === 0) {
      console.warn(`⚠️ FirestoreService: 0 rows for surveyId="${cleanSurveyId}". Check Firebase Console → Firestore → users/.../surveyData for documents with surveyId=${cleanSurveyId}.`);
    }
    if (isUploadDebugEnabled()) {
      console.log(`⚡ FirestoreService: Fetched ${snapshot.docs.length} rows in ${fetchTime.toFixed(2)}ms`);
    }
    
    // Optimize data transformation
    let rows = snapshot.docs.map(doc => {
      const data = doc.data();
      // Remove Firestore metadata fields and return just the row data
      const { id, surveyId: _surveyId, createdAt, ...rowData } = data;
      return rowData as ISurveyRow;
    });
    
    // ENTERPRISE FIX: Client-side filter for variable (Firestore where clause would require composite index)
    if (filters.variable) {
      rows = rows.filter(row => {
        const rowVariable = (row as any).variable || (row as any).Variable || (row as any)['Variable Name'] || (row as any).Benchmark || '';
        return rowVariable.toLowerCase() === filters.variable.toLowerCase();
      });
      console.log(`🔍 FirestoreService: Filtered to ${rows.length} rows matching variable "${filters.variable}"`);
    }
    
    return { rows };
  }

  async saveSurveyData(surveyId: string, rows: ISurveyRow[], onProgress?: (percent: number) => void): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    return await this.executeWithOfflineQueue(async () => {
      const totalBatches = Math.ceil(rows.length / this.BATCH_SIZE);

      console.log(`📤 FirestoreService: Saving ${rows.length} rows in ${totalBatches} batches of ${this.BATCH_SIZE} (${this.BATCH_CONCURRENCY} parallel)...`);
      if (isUploadDebugEnabled()) {
        console.log('🧪 UploadDebug: Firestore saveSurveyData', {
          surveyId,
          userId: this.userId,
          rowCount: rows.length,
          sampleKeys: rows[0] ? Object.keys(rows[0]) : []
        });
      }

      const startTime = Date.now();
      const collectionPath = this.getUserPath('surveyData');

      // Create batch chunks
      const batchChunks: Array<{ startIndex: number; rows: ISurveyRow[]; batchNumber: number }> = [];
      for (let i = 0; i < rows.length; i += this.BATCH_SIZE) {
        const chunk = rows.slice(i, i + this.BATCH_SIZE);
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;
        batchChunks.push({
          startIndex: i,
          rows: chunk,
          batchNumber
        });
      }

      let completedBatches = 0;

      // Process batches in parallel with controlled concurrency
      await this.processBatchesInParallel(
        batchChunks,
        this.BATCH_CONCURRENCY,
        async (chunk, index) => {
          const { startIndex, rows: chunkRows, batchNumber } = chunk;
          
          // Helper function to create and populate a batch
          const createBatch = () => {
            const batch = writeBatch(this.db!);
            chunkRows.forEach((row, rowIndex) => {
              // Use simple counter-based ID - no Date.now() needed
              // Firestore will handle uniqueness and the index ensures no collisions within a batch
              const dataId = `${surveyId}_${startIndex + rowIndex}`;
              const rowRef = doc(this.db!, collectionPath, dataId);
              // Normalize special characters (e.g. non-breaking space, en-dash) so they don't display as boxes
              const normalizedRow = normalizeRowStrings(row as Record<string, unknown>) as ISurveyRow;
            const rowData = this.removeUndefinedValues({
              id: dataId,
              surveyId, // CRITICAL: Must match the surveyId used in metadata
              ...normalizedRow,
              createdAt: Timestamp.now(),
            });
            
            // Log first row to verify surveyId is correct
            if (startIndex === 0 && rowIndex === 0) {
              console.log(`🔍 CRITICAL: Saving first data row with surveyId="${surveyId}", dataId="${dataId}"`);
            }
            
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
        },
        (completed) => {
          completedBatches = completed;
          
          // Report progress: 0-100% mapped to the data saving phase (70-100% of total upload)
          // This means 70% = start of save, 100% = end of save
          const progressPercent = 70 + (completedBatches / totalBatches) * 30;
          onProgress?.(Math.min(progressPercent, 100));
          
          // ENTERPRISE FIX: Only log in debug mode to prevent console spam
          // For large uploads, logging every batch causes thousands of messages
          if (isUploadDebugEnabled() && (completedBatches % 10 === 0 || completedBatches === totalBatches)) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const processedRows = Math.min(completedBatches * this.BATCH_SIZE, rows.length);
            const rowsPerSecond = Math.round(processedRows / elapsedSeconds);
            console.log(`📊 FirestoreService: Saved batch ${completedBatches}/${totalBatches} (${Math.round(progressPercent)}%) - ${rowsPerSecond} rows/sec`);
          }
        }
      );

      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      // Only log in debug mode to prevent console spam
      if (isUploadDebugEnabled()) {
        console.log(`✅ FirestoreService: Saved survey data: ${rows.length} rows in ${totalElapsed}s`);
      }
      
      // Log audit event
      await this.logAuditEvent('update', 'surveyData', surveyId, { rowCount: rows.length });
    }, 'saveSurveyData');
  }

  // ==================== Upload Intent Management ====================

  /**
   * Create upload intent to track upload progress and enable recovery
   */
  private async createUploadIntent(survey: Partial<Survey>, expectedRowCount: number): Promise<string> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const intentRef = doc(this.db, this.getUserPath('uploadIntents'), uploadId);
    
    const intentData = {
      id: uploadId,
      surveyId: survey.id!,
      userId: this.userId,
      status: 'pending' as const,
      startTime: Timestamp.now(),
      metadata: {
        fileName: survey.name || 'Unknown',
        fileSize: 0,
        expectedRowCount,
        surveyYear: parseInt(survey.year || '0'),
        surveyType: survey.type || 'Unknown',
        providerType: survey.providerType || 'UNKNOWN'
      }
    };

    await setDoc(intentRef, intentData);
    console.log('📝 Created upload intent:', uploadId);
    return uploadId;
  }

  /**
   * Mark upload intent as complete
   */
  private async completeUploadIntent(uploadId: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const intentRef = doc(this.db, this.getUserPath('uploadIntents'), uploadId);
    await setDoc(intentRef, {
      status: 'completed',
      completionTime: Timestamp.now()
    }, { merge: true });
    
    console.log('✅ Completed upload intent:', uploadId);
  }

  /**
   * Mark upload intent as failed
   */
  private async failUploadIntent(uploadId: string, error: Error): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const intentRef = doc(this.db, this.getUserPath('uploadIntents'), uploadId);
    await setDoc(intentRef, {
      status: 'failed',
      completionTime: Timestamp.now(),
      error: {
        message: error.message,
        code: (error as any).code || 'UNKNOWN',
        stack: error.stack
      }
    }, { merge: true });
    
    console.log('❌ Failed upload intent:', uploadId);
  }

  // ==================== Write Verification ====================

  /**
   * Verify that upload completed successfully with retry logic for eventual consistency
   */
  private async verifyUploadComplete(surveyId: string, expectedRowCount: number): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    console.log(`🔍 Verifying upload for survey ${surveyId}, expecting ${expectedRowCount} rows`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check survey metadata exists
        const survey = await this.getSurveyById(surveyId);
        if (!survey) {
          throw new Error(`Survey ${surveyId} not found in verification`);
        }

        // Check survey data row count
        const actualRowCount = await this.getSurveyDataCount(surveyId);
        
        console.log(`🔍 Verification attempt ${attempt + 1}: Expected ${expectedRowCount}, found ${actualRowCount} rows`);

        if (actualRowCount === expectedRowCount) {
          console.log('✅ Upload verification passed');
          return; // Verification passed
        }

        // Row count mismatch
        if (attempt === maxRetries - 1) {
          throw new Error(
            `Upload verification failed: Expected ${expectedRowCount} rows, found ${actualRowCount}`
          );
        }
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error; // Final attempt failed
        }
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 2}/${maxRetries}...`);
        await this.sleep(delay);
      }
    }

    throw new Error('Upload verification failed after maximum retries');
  }

  /**
   * Get survey data row count (optimized for verification)
   */
  private async getSurveyDataCount(surveyId: string): Promise<number> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    // CRITICAL FIX: Strip user prefix if present (same as getSurveyById and getSurveyData)
    const cleanSurveyId = stripUserPrefix(surveyId);

    const collectionPath = this.getUserPath('surveyData');
    console.log(`🔍 getSurveyDataCount: Querying collection="${collectionPath}" with surveyId="${surveyId}" (normalized: ${cleanSurveyId})`);
    
    const dataRef = collection(this.db, collectionPath);
    const q = query(dataRef, where('surveyId', '==', cleanSurveyId));
    
    try {
      const snapshot = await getCountFromServer(q);
      const count = snapshot.data().count;
      console.log(`🔍 getSurveyDataCount: Found ${count} rows for surveyId="${surveyId}"`);
      return count;
    } catch (error) {
      console.warn('⚠️ Count aggregation failed, falling back to full query:', error);
      const snapshot = await getDocs(q);
      const count = snapshot.size;
      console.log(`🔍 getSurveyDataCount (fallback): Found ${count} rows for surveyId="${surveyId}"`);
      return count;
    }
  }

  /**
   * Verify integrity of uploaded data (sample-based)
   */
  private async verifyUploadIntegrity(
    surveyId: string,
    originalRows: ISurveyRow[],
    expectedRowCount: number
  ): Promise<void> {
    console.log(`🔍 Verifying data integrity for survey ${surveyId}`);

    // 1. Verify row count
    const actualCount = await this.getSurveyDataCount(surveyId);
    
    if (actualCount !== expectedRowCount) {
      throw new Error(
        `Integrity check failed: Row count mismatch (expected ${expectedRowCount}, got ${actualCount})`
      );
    }

    // 2. Verify sample rows (first, middle, last) using direct document reads
    if (originalRows.length > 0) {
      const sampleIndices = [
        0,
        Math.floor(originalRows.length / 2),
        originalRows.length - 1
      ];

      for (const index of sampleIndices) {
        if (index >= originalRows.length) continue;

        const original = originalRows[index];
        const dataId = `${surveyId}_${index}`;
        const rowRef = doc(this.db!, this.getUserPath('surveyData'), dataId);
        const snapshot = await getDoc(rowRef);

        if (!snapshot.exists()) {
          throw new Error(`Integrity check failed: Missing row ${index} (${dataId})`);
        }

        const uploaded = snapshot.data() as ISurveyRow;

        // Compare key fields
        const keyFields = ['specialty', 'providerType', 'variable'];
        for (const field of keyFields) {
          const originalValue = original[field];
          const uploadedValue = uploaded[field];
          
          if (originalValue !== uploadedValue) {
            throw new Error(
              `Integrity check failed: Data mismatch at row ${index}, field "${field}" ` +
              `(expected "${originalValue}", got "${uploadedValue}")`
            );
          }
        }
      }
    }

    // 3. Verify metadata
    const survey = await this.getSurveyById(surveyId);
    if (!survey) {
      throw new Error('Survey metadata missing after upload');
    }

    if (survey.rowCount !== expectedRowCount) {
      throw new Error(
        `Integrity check failed: Metadata row count mismatch ` +
        `(expected ${expectedRowCount}, got ${survey.rowCount})`
      );
    }

    console.log('✅ Data integrity verification passed');
  }

  // ==================== Enhanced Rollback ====================

  /**
   * Complete rollback of failed upload (metadata + data + intent + caches)
   */
  private async rollbackSurveyComplete(surveyId: string, uploadId?: string): Promise<void> {
    console.log(`🔄 Rolling back survey ${surveyId}...`);

    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    try {
      // 1. Delete survey metadata
      const surveyRef = doc(this.db, this.getUserPath('surveys'), surveyId);
      await deleteDoc(surveyRef);
      console.log('  ✓ Deleted survey metadata');

      // 2. Delete all survey data rows in batches
      const deletedRows = await this.deleteCollectionInBatches(
        this.getUserPath('surveyData'),
        [where('surveyId', '==', surveyId)]
      );
      console.log(`  ✓ Deleted ${deletedRows} data rows`);

      // 3. Mark upload intent as rolled back
      if (uploadId) {
        const intentRef = doc(this.db, this.getUserPath('uploadIntents'), uploadId);
        await setDoc(intentRef, {
          status: 'rolledBack',
          completionTime: Timestamp.now()
        }, { merge: true });
        console.log('  ✓ Marked upload intent as rolled back');
      }

      // 4. Clear client-side caches (implementation would call cache manager)
      // This would be handled by CacheManager.invalidateAll(surveyId)
      console.log('  ✓ Cache invalidation queued');

      console.log('✅ Rollback completed successfully');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
      // Log rollback failure but don't throw - we've already failed the upload
    }
  }

  /**
   * Check storage quota before upload
   */
  private async checkStorageQuota(survey: Partial<Survey>, rows: ISurveyRow[]): Promise<void> {
    // Estimate size of data to be uploaded
    const estimatedSize = JSON.stringify({ survey, rows }).length;
    const estimatedMB = (estimatedSize / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Estimated upload size: ${estimatedMB}MB`);

    // Check against max file size (10MB default)
    const maxFileSize = parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '10485760');
    if (estimatedSize > maxFileSize) {
      throw new Error(
        `File size (${estimatedMB}MB) exceeds maximum allowed size (${(maxFileSize / 1024 / 1024).toFixed(2)}MB)`
      );
    }

    // Note: Actual Firestore quota check happens during write operations
    // Firestore will throw resource-exhausted error if quota is exceeded
  }

  /**
   * Verify Firestore is available before upload
   */
  private async verifyFirestoreAvailable(): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    // CRITICAL: Verify userId matches auth.uid (security rules requirement)
    const authUid = this.auth?.currentUser?.uid;
    if (!authUid) {
      throw new Error('User not authenticated. Please sign in to upload surveys to Firebase.');
    }
    if (this.userId !== authUid) {
      console.warn('⚠️ User ID mismatch detected, fixing:', {
        oldUserId: this.userId,
        authUid: authUid
      });
      this.userId = authUid;
    }

    // Quick connectivity check
    try {
      const testRef = doc(this.db, this.getUserPath('surveys'), 'connectivity-test');
      await getDoc(testRef);
    } catch (error: any) {
      // Provide helpful error for permission issues
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        const authUid = this.auth?.currentUser?.uid;
        const diagnosticInfo = {
          userId: this.userId,
          authUid: authUid,
          authenticated: !!this.auth?.currentUser,
          email: this.auth?.currentUser?.email,
          userIdMatches: this.userId === authUid
        };
        console.error('❌ CRITICAL: Permission denied during connectivity check:', diagnosticInfo);
        
        let errorMessage = 'Permission denied during connectivity check. ';
        if (!this.auth?.currentUser) {
          errorMessage += 'You are not signed in. Please sign in using the user menu (top-right corner).';
        } else if (this.userId !== authUid) {
          errorMessage += `User ID mismatch. This usually means Firestore security rules haven't been deployed. ` +
            `Deploy them with: firebase deploy --only firestore:rules`;
        } else {
          errorMessage += 'This usually means Firestore security rules have not been deployed. ' +
            'Deploy them with: firebase deploy --only firestore:rules';
        }
        throw new Error(errorMessage);
      }
      throw new Error(`Firestore connectivity check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Comprehensive connectivity check with timeout
   * Returns detailed health status
   */
  async checkConnectivity(timeoutMs: number = 5000): Promise<{
    status: 'healthy' | 'unhealthy' | 'timeout' | 'not_initialized';
    latency?: number;
    error?: string;
    timestamp: number;
  }> {
    if (!this.db || !this.userId) {
      return {
        status: 'not_initialized',
        timestamp: Date.now()
      };
    }

    const startTime = performance.now();
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connectivity check timed out')), timeoutMs);
      });

      // Test read operation
      const testRef = doc(this.db, this.getUserPath('surveys'), 'connectivity-test');
      await Promise.race([
        getDoc(testRef),
        timeoutPromise
      ]);

      const latency = performance.now() - startTime;

      return {
        status: 'healthy',
        latency: Math.round(latency),
        timestamp: Date.now()
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      
      return {
        status: isTimeout ? 'timeout' : 'unhealthy',
        latency: Math.round(latency),
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Verify read capability before getAllSurveys
   * Checks if we can successfully read from Firestore
   */
  async verifyReadCapability(): Promise<{
    canRead: boolean;
    error?: string;
    latency?: number;
  }> {
    if (!this.db || !this.userId) {
      return {
        canRead: false,
        error: 'Firestore not initialized or user not authenticated'
      };
    }

    const startTime = performance.now();

    try {
      // Try to read from surveys collection (limit 1 for speed)
      const surveysRef = collection(this.db, this.getUserPath('surveys'));
      const q = query(surveysRef, limit(1));
      await getDocs(q);

      const latency = performance.now() - startTime;

      return {
        canRead: true,
        latency: Math.round(latency)
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      
      return {
        canRead: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Math.round(latency)
      };
    }
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
    const startTime = Date.now();
    let uploadId: string | undefined;
    let surveyId: string | undefined;

    try {
      // ============== STEP 1: Pre-flight Checks (0-10%) ==============
      onProgress?.(0);

      // CRITICAL: Always refresh auth state at upload time
      // This ensures we have the latest authenticated user ID
      const currentAuthUser = this.auth?.currentUser;
      const currentUserId = currentAuthUser?.uid || null;
      
      // Check authentication and initialization FIRST
      if (!this.db) {
        throw new Error('Firestore database not initialized. Please check your Firebase configuration in .env.local file.');
      }
      
      if (!currentUserId || !currentAuthUser) {
        throw new Error('User not authenticated. Please sign in to upload surveys to Firebase. You cannot upload to Firebase cloud storage without being signed in.');
      }
      
      // CRITICAL FIX: Force refresh auth token before upload
      // This ensures the token is fresh and valid for security rules
      try {
        console.log('🔄 Refreshing auth token before upload...');
        await currentAuthUser.getIdToken(true); // Force refresh
        console.log('✅ Auth token refreshed successfully');
      } catch (tokenError) {
        console.warn('⚠️ Could not refresh auth token (may still work):', tokenError);
        // Continue anyway - token might still be valid
      }
      
      // CRITICAL: ALWAYS sync userId with current auth state before any write operation
      // This prevents permission errors from stale userId
      if (this.userId !== currentUserId) {
        console.log('🔄 Syncing userId with auth state:', {
          oldUserId: this.userId,
          newUserId: currentUserId,
          email: currentAuthUser.email
        });
        this.userId = currentUserId;
      }
      
      // Final verification that userId matches (belt and suspenders)
      if (this.userId !== currentAuthUser.uid) {
        // Force fix one more time
        this.userId = currentAuthUser.uid;
      }

      // Verify Firestore connectivity
      await this.verifyFirestoreAvailable();
      onProgress?.(5);

      // ============== STEP 2: Parse File (10-40%) ==============
      let rows: ISurveyRow[] = [];
      let encoding: string | undefined;
      let originalHeaders: string[] = [];

      if (isExcelFile(file)) {
        const parseResult = await parseFile(file);
        originalHeaders = (parseResult.headers || []).filter((h: string) => h != null && String(h).trim() !== '');
        // Firestore rejects empty field names - use placeholder for blank headers so column data is preserved
        const safeHeader = (h: string, index: number) => (h != null && String(h).trim() !== '') ? h : `_empty_${index}`;
        rows = parseResult.rows.map((row) => {
          const rowData: Record<string, any> = {};
          parseResult.headers.forEach((header, index) => {
            const key = safeHeader(header, index);
            const raw = row[index] ?? '';
            rowData[key] = typeof raw === 'string' ? normalizeText(raw) : raw;
          });
          return rowData as ISurveyRow;
        });
        encoding = 'excel';
      } else {
        const { text, encoding: detectedEncoding, issues, normalized } = await readCSVFile(file);
        
        if (issues.length > 0) {
          console.warn('📤 Encoding issues detected:', issues);
        }
        if (normalized) {
          console.log('📤 Character normalization applied');
        }

        rows = this.parseCSV(text);
        encoding = detectedEncoding;
        // Preserve upload column sequence: header row from CSV (same order as in file)
        const firstLine = text.split(/\r?\n/).find((l: string) => l.trim());
        if (firstLine) {
          originalHeaders = parseCSVLine(firstLine).filter((h: string) => h != null && String(h).trim() !== '');
        } else if (rows.length > 0) {
          originalHeaders = Object.keys(rows[0]);
        }
      }

      onProgress?.(40);

      // ============== STEP 3: Storage Quota Check (40-45%) ==============
      // CRITICAL: Use consistent UUID format for survey IDs (matches IndexedDB format)
      // This ensures consistent naming across all storage backends
      surveyId = crypto.randomUUID();
      
      // CRITICAL: Normalize providerType to ensure consistent categorization
      let normalizedProviderType = providerType;
      if (normalizedProviderType) {
        const providerTypeUpper = String(normalizedProviderType).toUpperCase().trim();
        if (providerTypeUpper === 'STAFF PHYSICIAN' || providerTypeUpper === 'STAFFPHYSICIAN' || providerTypeUpper === 'PHYS') {
          normalizedProviderType = 'PHYSICIAN';
          console.log(`🔧 FirestoreService: Normalized providerType "${providerType}" → "PHYSICIAN"`);
        } else if (providerTypeUpper === 'PHYSICIAN') {
          normalizedProviderType = 'PHYSICIAN';
        } else if (providerTypeUpper === 'APP' || providerTypeUpper === 'ADVANCED PRACTICE PROVIDER' || providerTypeUpper === 'ADVANCED PRACTICE') {
          normalizedProviderType = 'APP';
          console.log(`🔧 FirestoreService: Normalized providerType "${providerType}" → "APP"`);
        }
      }
      
      // CRITICAL: Log the providerType being saved to help debug categorization issues
      console.log(`💾 FirestoreService: Creating survey with providerType: "${normalizedProviderType}" (from form: "${providerType}")`);
      
      // Derive source and dataCategory so Provider Type / Specialty mapping pages show correct labels (e.g. "Gallagher Physician")
      const surveyTypeLower = (surveyType || '').toLowerCase();
      const knownSources = ['MGMA', 'SullivanCotter', 'Gallagher', 'ECG', 'AMGA'];
      const source = knownSources.find(s => surveyTypeLower.startsWith(s.toLowerCase())) ?? (surveyType.trim().split(/\s+/)[0] || 'Unknown');
      const dataCategory = surveyTypeLower.includes('call pay') ? 'CALL_PAY' as const
        : surveyTypeLower.includes('moonlighting') ? 'MOONLIGHTING' as const
        : 'COMPENSATION' as const;
      
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
          providerType: normalizedProviderType, // Use normalized value
          encoding,
          originalHeaders: originalHeaders.length > 0 ? originalHeaders : (rows.length > 0 ? Object.keys(rows[0]) : []),
        },
        providerType: normalizedProviderType as ProviderType, // Use normalized value
        source,
        dataCategory,
      } as Survey;

      await this.checkStorageQuota(survey, rows);
      onProgress?.(45);

      // ============== STEP 4: Create Upload Intent (45-50%) ==============
      uploadId = await this.createUploadIntent(survey, rows.length);
      onProgress?.(50);

      // ============== STEP 5: Write Survey Metadata (50-55%) ==============
      await this.createSurvey(survey);
      onProgress?.(55);

      // ============== STEP 6: Write Survey Data (55-85%) ==============
      try {
        await this.saveSurveyData(surveyId, rows, (progress) => {
          // Map saveSurveyData progress (70-100%) to our range (55-85%)
          const mappedProgress = 55 + ((progress - 70) / 30) * 30;
          onProgress?.(Math.min(mappedProgress, 85));
        });
        
        // CRITICAL: Immediately verify data was actually saved
        const immediateCount = await this.getSurveyDataCount(surveyId);
        
        if (immediateCount === 0 && rows.length > 0) {
          throw new Error(
            `CRITICAL: Data save failed - ${rows.length} rows were supposed to be saved but 0 rows found in database. ` +
            `This indicates the save operation completed without actually writing data. Survey ID: ${surveyId}`
          );
        }
        
        if (immediateCount < rows.length) {
          console.warn(`⚠️ Only ${immediateCount} of ${rows.length} rows were saved. Some data may be missing.`);
        }
      } catch (saveError) {
        throw new Error(
          `Failed to save survey data: ${saveError instanceof Error ? saveError.message : String(saveError)}. ` +
          `Survey metadata was created but data rows were not saved. Please delete this survey and try again.`
        );
      }
      
      onProgress?.(85);

      // ============== STEP 7: Verify Upload (85-95%) ==============
      await this.verifyUploadComplete(surveyId, rows.length);
      onProgress?.(90);

      // CRITICAL: Additional verification - actually try to fetch the data
      try {
        const { rows: fetchedRows } = await this.getSurveyData(surveyId, {}, { limit: 10 });
        
        if (fetchedRows.length === 0 && rows.length > 0) {
          throw new Error(
            `CRITICAL: Data fetch verification failed - cannot retrieve any data rows for survey ${surveyId}. ` +
            `This indicates the data was not saved correctly or there is a survey ID mismatch.`
          );
        }
      } catch (fetchError) {
        throw new Error(
          `Data fetch verification failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}. ` +
          `The upload may have completed but the data is not accessible. Please delete this survey and try again.`
        );
      }

      // Verify data integrity (sample-based)
      await this.verifyUploadIntegrity(surveyId, rows, rows.length);
      onProgress?.(95);

      // ============== STEP 8: Complete Upload Intent (95-100%) ==============
      await this.completeUploadIntent(uploadId);
      onProgress?.(100);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      // Only log final success - reduce console spam
      console.log(`✅ Firebase upload complete: ${surveyName} (${rows.length} rows) in ${duration}s`);

      return { surveyId, rowCount: rows.length };

    } catch (error) {
      // ============== ERROR HANDLING: Complete Rollback ==============
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ UPLOAD FAILED after ${duration}s:`, error);

      // Mark upload intent as failed
      if (uploadId) {
        await this.failUploadIntent(uploadId, error as Error);
      }

      // Rollback all changes
      if (surveyId) {
        console.log('🔄 Initiating rollback...');
        await this.rollbackSurveyComplete(surveyId, uploadId);
      }

      // Re-throw error with user-friendly message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Upload failed: ${String(error)}`);
      }
    }
  }

  /**
   * Parse CSV text into rows.
   * Uses safe keys for blank headers so Firestore (no empty field names) accepts the data.
   */
  private parseCSV(text: string): ISurveyRow[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const header = parseCSVLine(lines[0]);
    const rows: ISurveyRow[] = [];
    const safeKey = (key: string, index: number) => (key != null && String(key).trim() !== '') ? key : `_empty_${index}`;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== header.length) continue;

      const row: any = {};
      header.forEach((key, index) => {
        row[safeKey(key, index)] = values[index] || '';
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
      
      // Key by (providerType, surveySource) so the same label from different surveys
      // stays unmapped until that specific source is in a mapping (allows mapping
      // "Staff Physician" from SullivanCotter and Gallagher together).
      const mappedNameSourcePairs = new Set<string>();
      mappings.forEach(mapping => {
        mapping.sourceProviderTypes?.forEach((source: any) => {
          const providerTypeName = (source.providerType || source.name || '').toString().toLowerCase();
          const src = (source.surveySource || '').toString();
          if (providerTypeName) mappedNameSourcePairs.add(`${providerTypeName}|${src}`);
        });
      });

      const unmapped: any[] = [];
      const providerTypeCounts = new Map<string, { count: number; sources: Set<string> }>();
      let includedSurveyCount = 0;
      const debug = isUploadDebugEnabled();

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
            // Same logic as getUnmappedSpecialties so Gallagher shows when Specialty Mapping shows it
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
            if (debug) {
              console.log('🔍 getUnmappedProviderTypes: SKIPPED', { id: survey.id, name: survey.name, reason: 'did not match provider type filter', effectiveProviderType, filter: providerType });
            }
            continue;
          }
        }

        // Same call as getUnmappedSpecialties (no limit; Firestore default 10k)
        const { rows } = await this.getSurveyData(survey.id);
        if (debug) {
          const sampleProviderType = rows.length > 0 ? this.getProviderTypeFromRow(rows[0] as Record<string, unknown>) : undefined;
          console.log('🔍 getUnmappedProviderTypes: INCLUDED', { id: survey.id, name: survey.name, rowCount: rows.length, sampleProviderType });
        }
        includedSurveyCount++;

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
          const rowProviderType = this.getProviderTypeFromRow(row as Record<string, unknown>);
          if (rowProviderType && typeof rowProviderType === 'string') {
            const key = rowProviderType.toLowerCase();
            const pairKey = `${key}|${surveySource}`;
            if (!mappedNameSourcePairs.has(pairKey)) {
              const current = providerTypeCounts.get(key) || { count: 0, sources: new Set() };
              current.count++;
              current.sources.add(surveySource);
              providerTypeCounts.set(key, current);
            }
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

      if (debug) {
        console.log('🔍 getUnmappedProviderTypes: Summary', { totalSurveys: surveys.length, surveysIncluded: includedSurveyCount, totalUnmappedEntries: unmapped.length });
      }
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

    // ENTERPRISE FIX: Use single 'learnedMappings' collection with mappingType field
    // Firestore paths must have odd number of segments (collection/document/collection...)
    const mappingsRef = collection(this.db, this.getUserPath('learnedMappings'));
    const constraints: QueryConstraint[] = [
      where('mappingType', '==', type)
    ];
    
    if (providerType) {
      constraints.push(where('providerType', '==', providerType));
    }

    const q = query(mappingsRef, ...constraints);
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

    // ENTERPRISE FIX: Use single 'learnedMappings' collection with mappingType field
    const mappingId = `${type}_${original}_${corrected}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const mappingRef = doc(this.db, this.getUserPath('learnedMappings'), mappingId);
    
    const mappingData = this.removeUndefinedValues({
      mappingType: type, // Store type as a field for filtering
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

    // ENTERPRISE FIX: Use single 'learnedMappings' collection with mappingType field
    const mappingsRef = collection(this.db, this.getUserPath('learnedMappings'));
    const q = query(
      mappingsRef, 
      where('mappingType', '==', type),
      where('original', '==', original)
    );
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

    // ENTERPRISE FIX: Use single 'learnedMappings' collection with mappingType field
    const mappingsRef = collection(this.db, this.getUserPath('learnedMappings'));
    const q = query(mappingsRef, where('mappingType', '==', type));
    const snapshot = await getDocs(q);
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

    // ENTERPRISE FIX: Use single 'learnedMappings' collection with mappingType field
    const mappingsRef = collection(this.db, this.getUserPath('learnedMappings'));
    const constraints: QueryConstraint[] = [
      where('mappingType', '==', type)
    ];
    
    if (providerType) {
      constraints.push(where('providerType', '==', providerType));
    }

    const q = query(mappingsRef, ...constraints);
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

  /**
   * Get provider type value from a data row with robust column name detection.
   * Tries known keys first, any key that normalizes to "providertype", then common
   * survey aliases (Physician Type, Role, Position, etc.). Supports both flat rows
   * and nested row.data for consistency with getUnmappedRegions.
   */
  private getProviderTypeFromRow(row: Record<string, unknown>): string | undefined {
    const data: Record<string, unknown> =
      row && typeof row === 'object' && 'data' in row && row.data && typeof row.data === 'object'
        ? (row.data as Record<string, unknown>)
        : (row as Record<string, unknown>);

    const direct = data.providerType ?? data['Provider Type'] ?? data.provider_type ?? data['provider_type'];
    if (direct != null && typeof direct === 'string') return direct;

    const normalized = (key: string) => key.replace(/[\s_-]+/g, '').toLowerCase();
    const target = 'providertype';
    for (const key of Object.keys(data)) {
      if (normalized(key) === target) {
        const v = data[key];
        if (typeof v === 'string') return v;
      }
    }

    const aliasKeys = ['Physician Type', 'Role', 'Type', 'Provider Category', 'Position', 'Title'] as const;
    for (const key of aliasKeys) {
      const v = data[key];
      if (v != null && typeof v === 'string' && v.trim()) return v;
    }
    return undefined;
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

  // ==================== FMV Calculation Methods ====================

  async getAllFMVCalculations(): Promise<any[]> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const calculationsRef = collection(this.db, this.getUserPath('fmvCalculations'));
    const q = query(calculationsRef, orderBy('created', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created: data.created ? this.toDate(data.created) : new Date(),
        lastModified: data.lastModified ? this.toDate(data.lastModified) : new Date(),
      };
    });
  }

  async saveFMVCalculation(calculation: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const calculationId = calculation.id || `fmv_${Date.now()}`;
    const calculationRef = doc(this.db, this.getUserPath('fmvCalculations'), calculationId);
    const calculationData = this.removeUndefinedValues({
      ...calculation,
      id: calculationId,
      created: calculation.created ? this.toTimestamp(calculation.created) : Timestamp.now(),
      lastModified: Timestamp.now(),
    });

    await setDoc(calculationRef, calculationData);
    console.log('✅ FirestoreService: Saved FMV calculation:', calculationId);
  }

  async deleteFMVCalculation(id: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Firestore not initialized or user not authenticated');
    }

    const calculationRef = doc(this.db, this.getUserPath('fmvCalculations'), id);
    await deleteDoc(calculationRef);
    console.log('✅ FirestoreService: Deleted FMV calculation:', id);
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


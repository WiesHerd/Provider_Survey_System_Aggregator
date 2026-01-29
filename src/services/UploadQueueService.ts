/**
 * Background Upload Queue Service
 * 
 * Enterprise-grade background upload processing that:
 * - Runs uploads in background without blocking UI
 * - Shows toast notifications for progress
 * - Allows users to continue working during upload
 * - Handles retries and errors gracefully
 * - Persists queue state across page reloads
 */

import { getDataService } from './DataService';
import { parseFile } from '../features/upload/utils/fileParser';

export interface UploadJob {
  id: string;
  file: File;
  fileName: string;
  surveyYear: number;
  surveyType: string;
  providerType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;
  surveyId?: string;
  rowCount?: number;
}

type UploadJobListener = (job: UploadJob) => void;

/**
 * Background Upload Queue Service
 * Singleton pattern - use getUploadQueueService() to access
 */
class UploadQueueService {
  private queue: UploadJob[] = [];
  private isProcessing = false;
  private listeners: Set<UploadJobListener> = new Set();
  private dataService = getDataService();

  constructor() {
    // Restore queue from localStorage on init
    this.restoreQueue();
  }

  /**
   * Add files to upload queue
   * Returns immediately - uploads happen in background
   */
  async addToQueue(
    files: File[],
    metadata: {
      surveyYear: number;
      surveyType: string;
      providerType: string;
      surveyName?: string; // Optional survey name (falls back to fileName if not provided)
    }
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const file of files) {
      const job: UploadJob = {
        id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        fileName: metadata.surveyName || file.name, // Use surveyName if provided, otherwise file name
        surveyYear: metadata.surveyYear,
        surveyType: metadata.surveyType,
        providerType: metadata.providerType,
        status: 'queued',
        progress: 0
      };

      this.queue.push(job);
      jobIds.push(job.id);
      this.notifyListeners(job);
    }

    // Save queue state
    this.saveQueue();

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobIds;
  }

  /**
   * Process upload queue in background
   * Non-blocking - runs asynchronously
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.find(j => j.status === 'queued');
      if (!job) break;

      try {
        // CRITICAL DIAGNOSTIC: Pre-flight checks before upload
        console.log('🔍 UploadQueueService: Running pre-flight diagnostic checks...');
        
        // Check 1: Verify Firebase is available and user is authenticated
        try {
          const { isFirebaseAvailable, getFirebaseAuth } = await import('../config/firebase');
          const { getCurrentStorageMode, StorageMode } = await import('../config/storage');
          
          const storageMode = getCurrentStorageMode();
          console.log('🔍 Diagnostic: Storage mode:', storageMode);
          
          if (storageMode === StorageMode.FIREBASE) {
            // Check 2: Verify Firebase is available
            if (!isFirebaseAvailable()) {
              const errorMsg = 'Firebase is not available. Please check your Firebase configuration in .env.local file.';
              console.error('❌ CRITICAL: Firebase not available:', errorMsg);
              throw new Error(errorMsg);
            }
            console.log('✅ Diagnostic: Firebase is available');
            
            // Check 3: Verify user is authenticated (CRITICAL for Firebase uploads)
            const auth = getFirebaseAuth();
            const currentUser = auth?.currentUser;
            if (!currentUser || !currentUser.uid) {
              const errorMsg = 'You must be signed in to upload surveys to Firebase. Please click the user menu in the top-right corner to sign in, then try uploading again.';
              console.error('❌ CRITICAL: User not authenticated for Firebase upload:', {
                hasAuth: !!auth,
                hasCurrentUser: !!currentUser,
                hasUid: !!currentUser?.uid,
                note: 'Upload will fail - authentication required for Firebase'
              });
              throw new Error(errorMsg);
            }
            console.log('✅ Diagnostic: User authenticated:', {
              email: currentUser.email,
              uid: currentUser.uid
            });
          } else {
            console.log('ℹ️ Diagnostic: Using IndexedDB mode (offline)');
          }
        } catch (diagnosticError) {
          console.error('❌ UploadQueueService: Pre-flight diagnostic failed:', diagnosticError);
          throw new Error(`Pre-flight check failed: ${diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError)}`);
        }
        
        console.log('✅ UploadQueueService: Pre-flight checks passed');
        
        // Update job status
        job.status = 'processing';
        job.startTime = Date.now();
        job.progress = 0;
        this.notifyListeners(job);
        this.saveQueue();

        // Parse file (async, non-blocking)
        job.progress = 10;
        this.notifyListeners(job);
        
        const parseResult = await parseFile(job.file);
        
        job.progress = 30;
        this.notifyListeners(job);

        // CRITICAL DIAGNOSTIC: Log upload start with full context
        console.log('🚀 UploadQueueService: Starting upload to database...', {
          fileName: job.fileName,
          surveyYear: job.surveyYear,
          surveyType: job.surveyType,
          providerType: job.providerType,
          fileSize: job.file.size,
          timestamp: new Date().toISOString()
        });

        // Upload to database (with progress tracking)
        const result = await this.dataService.uploadSurvey(
          job.file,
          job.fileName,
          job.surveyYear,
          job.surveyType,
          job.providerType,
          // Progress callback
          (progress: number) => {
            // Map upload progress (30-90%)
            job.progress = 30 + (progress * 0.6);
            this.notifyListeners(job);
          }
        );

        // CRITICAL DIAGNOSTIC: Log successful upload result and verify storage location
        console.log('✅ UploadQueueService: Upload completed successfully', {
          surveyId: result.surveyId,
          rowCount: result.rowCount,
          fileName: job.fileName,
          duration: job.startTime ? Date.now() - job.startTime : 0
        });
        
        // CRITICAL: Verify which storage the survey was actually saved to
        try {
          const { getCurrentStorageMode, StorageMode } = await import('../config/storage');
          const { getDataService } = await import('./DataService');
          const storageMode = getCurrentStorageMode();
          const dataService = getDataService();
          const actualMode = (dataService as any).mode || storageMode;
          
          console.log('🔍 UploadQueueService: Verifying storage location...', {
            expectedMode: storageMode,
            actualMode: actualMode,
            isFirebase: actualMode === StorageMode.FIREBASE
          });
          
          if (actualMode !== StorageMode.FIREBASE) {
            console.error('⚠️ CRITICAL: Survey uploaded to IndexedDB, NOT Firebase!', {
              surveyId: result.surveyId,
              storageLocation: 'IndexedDB (local browser storage)',
              note: 'Survey is NOT in Firebase cloud storage'
            });
          } else {
            console.log('✅ UploadQueueService: Survey confirmed saved to Firebase');
          }
        } catch (verifyError) {
          console.warn('⚠️ UploadQueueService: Could not verify storage location:', verifyError);
        }

        // Verify we got a valid surveyId
        if (!result.surveyId) {
          throw new Error('Upload completed but no surveyId was returned. This indicates the upload failed silently.');
        }

        // Complete job
        job.status = 'completed';
        job.progress = 100;
        job.endTime = Date.now();
        job.surveyId = result.surveyId;
        job.rowCount = result.rowCount;
        this.notifyListeners(job);
        this.saveQueue();

        // CRITICAL DIAGNOSTIC: Verify survey exists in database after upload
        console.log('🔍 UploadQueueService: Verifying survey exists in database...');
        try {
          const allSurveys = await this.dataService.getAllSurveys();
          const uploadedSurvey = allSurveys.find(s => s.id === result.surveyId);
          if (uploadedSurvey) {
            console.log('✅ UploadQueueService: Survey verified in database:', {
              id: uploadedSurvey.id,
              name: uploadedSurvey.name,
              providerType: uploadedSurvey.providerType
            });
          } else {
            console.error('❌ UploadQueueService: CRITICAL - Survey not found in database after upload!', {
              expectedSurveyId: result.surveyId,
              totalSurveysInDB: allSurveys.length,
              allSurveyIds: allSurveys.map(s => s.id)
            });
          }
        } catch (verifyError) {
          console.error('❌ UploadQueueService: Failed to verify survey in database:', verifyError);
        }

        // Remove from queue after 5 seconds
        setTimeout(() => {
          this.queue = this.queue.filter(j => j.id !== job.id);
          this.saveQueue();
        }, 5000);

      } catch (error) {
        // Handle error with detailed logging
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        // CRITICAL DIAGNOSTIC: Log full error context
        console.error(`❌ UploadQueueService: Upload FAILED for ${job.fileName}:`, {
          error: errorMessage,
          stack: errorStack,
          fileName: job.fileName,
          surveyYear: job.surveyYear,
          surveyType: job.surveyType,
          providerType: job.providerType,
          duration: job.startTime ? Date.now() - job.startTime : 0,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorDetails: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : error
        });
        
        // Log full error stack for debugging
        if (error instanceof Error && error.stack) {
          console.error('📋 Full error stack trace:', error.stack);
        }
        
        // Check for common failure reasons
        if (errorMessage.includes('not authenticated') || errorMessage.includes('sign in')) {
          console.error('🔍 DIAGNOSTIC: Upload failed due to authentication issue');
        }
        if (errorMessage.includes('Firestore') || errorMessage.includes('Firebase')) {
          console.error('🔍 DIAGNOSTIC: Upload failed due to Firebase/Firestore issue');
        }
        if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
          console.error('🔍 DIAGNOSTIC: Upload failed due to storage quota/limit');
        }
        
        job.status = 'failed';
        job.error = errorMessage;
        job.endTime = Date.now();
        this.notifyListeners(job);
        this.saveQueue();
      }

      // Small delay between jobs to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Get all jobs in queue
   */
  getQueue(): UploadJob[] {
    return [...this.queue];
  }

  /**
   * Get active jobs (queued or processing)
   */
  getActiveJobs(): UploadJob[] {
    return this.queue.filter(j => j.status === 'queued' || j.status === 'processing');
  }

  /**
   * Subscribe to job updates
   */
  subscribe(listener: UploadJobListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of job update
   */
  private notifyListeners(job: UploadJob): void {
    this.listeners.forEach(listener => listener(job));
  }

  /**
   * Save queue to localStorage for persistence
   */
  private saveQueue(): void {
    try {
      // Only save metadata (not File objects)
      const metadata = this.queue.map(job => ({
        id: job.id,
        fileName: job.fileName,
        surveyYear: job.surveyYear,
        surveyType: job.surveyType,
        providerType: job.providerType,
        status: job.status,
        progress: job.progress,
        error: job.error,
        startTime: job.startTime,
        endTime: job.endTime,
        surveyId: job.surveyId,
        rowCount: job.rowCount
      }));
      localStorage.setItem('upload_queue', JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save upload queue:', error);
    }
  }

  /**
   * Restore queue from localStorage
   */
  private restoreQueue(): void {
    try {
      const saved = localStorage.getItem('upload_queue');
      if (!saved) return;

      const metadata = JSON.parse(saved);
      // Only restore completed/failed jobs for display
      // Queued/processing jobs are lost on page reload (files are gone)
      this.queue = metadata.filter((job: any) => 
        job.status === 'completed' || job.status === 'failed'
      );
    } catch (error) {
      console.warn('Failed to restore upload queue:', error);
    }
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): void {
    this.queue = this.queue.filter(j => j.status !== 'completed');
    this.saveQueue();
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = this.queue.find(j => j.id === jobId);
    if (!job || job.status !== 'failed') return;

    job.status = 'queued';
    job.error = undefined;
    job.progress = 0;
    this.notifyListeners(job);
    this.saveQueue();

    if (!this.isProcessing) {
      this.processQueue();
    }
  }
}

// Singleton instance
let uploadQueueService: UploadQueueService | null = null;

/**
 * Get upload queue service instance (singleton)
 */
export function getUploadQueueService(): UploadQueueService {
  if (!uploadQueueService) {
    uploadQueueService = new UploadQueueService();
  }
  return uploadQueueService;
}

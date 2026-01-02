/**
 * Enterprise-Grade Upload Checkpoint System
 * 
 * Manages upload state persistence and recovery:
 * - Stores checkpoint after each successful batch
 * - Allows resume from last successful checkpoint
 * - Cleans up partial data on cancel
 */

export interface UploadCheckpoint {
  uploadId: string;
  surveyId?: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  rowsProcessed: number;
  batchesCompleted: number;
  totalBatches: number;
  lastBatchIndex: number;
  timestamp: number;
  metadata: {
    surveyName: string;
    surveyYear: number;
    surveyType: string;
    providerType: string;
    headers: string[];
  };
  state: 'in_progress' | 'paused' | 'failed' | 'completed';
  error?: {
    message: string;
    type: string;
    recoverable: boolean;
  };
}

const CHECKPOINT_STORAGE_KEY = 'upload_checkpoints';
const MAX_CHECKPOINT_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Save upload checkpoint to localStorage
 */
export function saveCheckpoint(checkpoint: UploadCheckpoint): void {
  try {
    const checkpoints = getCheckpoints();
    const existingIndex = checkpoints.findIndex(cp => cp.uploadId === checkpoint.uploadId);
    
    if (existingIndex >= 0) {
      checkpoints[existingIndex] = checkpoint;
    } else {
      checkpoints.push(checkpoint);
    }
    
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoints));
    console.log(`💾 Checkpoint saved: ${checkpoint.uploadId} (${checkpoint.rowsProcessed}/${checkpoint.totalRows} rows)`);
  } catch (error) {
    console.error('Failed to save checkpoint:', error);
  }
}

/**
 * Get all checkpoints
 */
export function getCheckpoints(): UploadCheckpoint[] {
  try {
    const stored = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!stored) return [];
    
    const checkpoints: UploadCheckpoint[] = JSON.parse(stored);
    
    // Filter out old checkpoints
    const now = Date.now();
    const validCheckpoints = checkpoints.filter(cp => 
      (now - cp.timestamp) < MAX_CHECKPOINT_AGE
    );
    
    // Update storage if we filtered any out
    if (validCheckpoints.length !== checkpoints.length) {
      localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(validCheckpoints));
    }
    
    return validCheckpoints;
  } catch (error) {
    console.error('Failed to get checkpoints:', error);
    return [];
  }
}

/**
 * Get checkpoint by upload ID
 */
export function getCheckpoint(uploadId: string): UploadCheckpoint | null {
  const checkpoints = getCheckpoints();
  return checkpoints.find(cp => cp.uploadId === uploadId) || null;
}

/**
 * Get checkpoints by state
 */
export function getCheckpointsByState(state: UploadCheckpoint['state']): UploadCheckpoint[] {
  const checkpoints = getCheckpoints();
  return checkpoints.filter(cp => cp.state === state);
}

/**
 * Delete checkpoint
 */
export function deleteCheckpoint(uploadId: string): void {
  try {
    const checkpoints = getCheckpoints();
    const filtered = checkpoints.filter(cp => cp.uploadId !== uploadId);
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(filtered));
    console.log(`🗑️ Checkpoint deleted: ${uploadId}`);
  } catch (error) {
    console.error('Failed to delete checkpoint:', error);
  }
}

/**
 * Mark checkpoint as completed
 */
export function markCheckpointCompleted(uploadId: string): void {
  const checkpoint = getCheckpoint(uploadId);
  if (checkpoint) {
    checkpoint.state = 'completed';
    checkpoint.rowsProcessed = checkpoint.totalRows;
    checkpoint.batchesCompleted = checkpoint.totalBatches;
    saveCheckpoint(checkpoint);
  }
}

/**
 * Mark checkpoint as failed
 */
export function markCheckpointFailed(
  uploadId: string,
  error: { message: string; type: string; recoverable: boolean }
): void {
  const checkpoint = getCheckpoint(uploadId);
  if (checkpoint) {
    checkpoint.state = 'failed';
    checkpoint.error = error;
    saveCheckpoint(checkpoint);
  }
}

/**
 * Mark checkpoint as paused
 */
export function markCheckpointPaused(uploadId: string): void {
  const checkpoint = getCheckpoint(uploadId);
  if (checkpoint) {
    checkpoint.state = 'paused';
    saveCheckpoint(checkpoint);
  }
}

/**
 * Update checkpoint progress
 */
export function updateCheckpointProgress(
  uploadId: string,
  progress: {
    rowsProcessed: number;
    batchesCompleted: number;
    lastBatchIndex: number;
  }
): void {
  const checkpoint = getCheckpoint(uploadId);
  if (checkpoint) {
    checkpoint.rowsProcessed = progress.rowsProcessed;
    checkpoint.batchesCompleted = progress.batchesCompleted;
    checkpoint.lastBatchIndex = progress.lastBatchIndex;
    checkpoint.timestamp = Date.now();
    saveCheckpoint(checkpoint);
  }
}

/**
 * Create new checkpoint
 */
export function createCheckpoint(
  uploadId: string,
  file: File,
  metadata: UploadCheckpoint['metadata'],
  totalRows: number,
  totalBatches: number
): UploadCheckpoint {
  const checkpoint: UploadCheckpoint = {
    uploadId,
    fileName: file.name,
    fileSize: file.size,
    totalRows,
    rowsProcessed: 0,
    batchesCompleted: 0,
    totalBatches,
    lastBatchIndex: -1,
    timestamp: Date.now(),
    metadata,
    state: 'in_progress'
  };
  
  saveCheckpoint(checkpoint);
  return checkpoint;
}

/**
 * Check if checkpoint can be resumed
 */
export function canResumeCheckpoint(checkpoint: UploadCheckpoint): boolean {
  return (
    checkpoint.state === 'failed' || 
    checkpoint.state === 'paused'
  ) && (
    checkpoint.rowsProcessed < checkpoint.totalRows
  ) && (
    checkpoint.error?.recoverable !== false
  );
}

/**
 * Clean up old checkpoints
 */
export function cleanupOldCheckpoints(): void {
  const checkpoints = getCheckpoints();
  const now = Date.now();
  const validCheckpoints = checkpoints.filter(cp => 
    (now - cp.timestamp) < MAX_CHECKPOINT_AGE
  );
  
  if (validCheckpoints.length !== checkpoints.length) {
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(validCheckpoints));
    console.log(`🧹 Cleaned up ${checkpoints.length - validCheckpoints.length} old checkpoints`);
  }
}

/**
 * Get resume data from checkpoint
 */
export function getResumeData(checkpoint: UploadCheckpoint): {
  startRowIndex: number;
  startBatchIndex: number;
  rowsRemaining: number;
} {
  return {
    startRowIndex: checkpoint.rowsProcessed,
    startBatchIndex: checkpoint.lastBatchIndex + 1,
    rowsRemaining: checkpoint.totalRows - checkpoint.rowsProcessed
  };
}

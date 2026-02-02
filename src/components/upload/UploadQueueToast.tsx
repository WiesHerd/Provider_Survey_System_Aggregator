/**
 * Upload Queue Toast Notifications
 * 
 * Shows non-blocking toast notifications for background uploads:
 * - Compact notification for each upload in progress
 * - Success/failure notifications
 * - Allows users to continue working while uploads complete
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress, IconButton } from '@mui/material';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { getUploadQueueService, UploadJob } from '../../services/UploadQueueService';
import { useToast } from '../../contexts/ToastContext';

/** Job IDs for which SurveyUpload already showed the success toast (so we don't duplicate). */
const jobIdsWithToastShownByUploadPage = new Set<string>();

/**
 * Call from SurveyUpload when it shows the success toast so UploadQueueToast does not show a duplicate.
 */
export function markJobSuccessToastShown(jobId: string): void {
  jobIdsWithToastShownByUploadPage.add(jobId);
}

/**
 * Upload Queue Toast Component
 * Listens to upload queue and shows toast notifications
 */
export const UploadQueueToast: React.FC = () => {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const toast = useToast();
  const uploadQueue = getUploadQueueService();

  useEffect(() => {
    // Subscribe to queue updates
    const unsubscribe = uploadQueue.subscribe((job) => {
      setJobs(uploadQueue.getQueue());

      // Show toast notifications for status changes
      if (job.status === 'completed') {
        // Error toast only if upload went to IndexedDB but we expected Firebase
        const checkStorageLocation = async () => {
          try {
            const { getCurrentStorageMode, StorageMode } = await import('../../config/storage');
            const { getDataService } = await import('../../services/DataService');
            const storageMode = getCurrentStorageMode();
            const dataService = getDataService();
            const actualMode = (dataService as any).mode || storageMode;
            
            if (actualMode !== StorageMode.FIREBASE && job.surveyId) {
              const { getFirebaseDb } = await import('../../config/firebase');
              const { getFirebaseAuth } = await import('../../config/firebase');
              const { doc, getDoc } = await import('firebase/firestore');
              const db = getFirebaseDb();
              const auth = getFirebaseAuth();
              const userId = auth?.currentUser?.uid;
              
              if (db && userId) {
                const surveyRef = doc(db, `users/${userId}/surveys/${job.surveyId}`);
                const surveySnap = await getDoc(surveyRef);
                if (!surveySnap.exists()) {
                  toast.error(
                    'Upload Saved Locally Only',
                    `${job.fileName} was saved to local storage (IndexedDB) but NOT to Firebase cloud storage. Check console for details.`,
                    15000
                  );
                }
              }
            }
          } catch {
            // Non-critical: no toast on check failure
          }
        };
        checkStorageLocation();

        // Fallback success toast when user is not on upload page (SurveyUpload unmounted).
        // Delay so that if user is on upload page, SurveyUpload shows first and we skip.
        const FALLBACK_SUCCESS_TOAST_DELAY_MS = 2500;
        setTimeout(() => {
          if (!jobIdsWithToastShownByUploadPage.has(job.id)) {
            toast.success(
              'Upload Complete',
              `${job.fileName} uploaded successfully (${(job.rowCount ?? 0).toLocaleString()} rows)`,
              5000
            );
          }
        }, FALLBACK_SUCCESS_TOAST_DELAY_MS);
      } else if (job.status === 'failed') {
        toast.error(
          'Upload Failed',
          `${job.fileName}: ${job.error}`,
          10000
        );
      }
    });

    // Initial load
    setJobs(uploadQueue.getQueue());

    return unsubscribe;
  }, [uploadQueue, toast]);

  // Don't render anything - toasts are shown by ToastContext
  return null;
};

/**
 * Upload Progress Indicator (can be shown in header/toolbar)
 */
export const UploadProgressIndicator: React.FC = () => {
  const [activeJobs, setActiveJobs] = useState<UploadJob[]>([]);
  const uploadQueue = getUploadQueueService();

  useEffect(() => {
    const unsubscribe = uploadQueue.subscribe(() => {
      setActiveJobs(uploadQueue.getActiveJobs());
    });

    setActiveJobs(uploadQueue.getActiveJobs());
    return unsubscribe;
  }, [uploadQueue]);

  if (activeJobs.length === 0) {
    return null;
  }

  const processingJob = activeJobs.find(j => j.status === 'processing');

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        p: 2,
        minWidth: 300,
        maxWidth: 400,
        zIndex: 9999
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          Uploading Surveys
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {activeJobs.filter(j => j.status === 'processing').length} of {activeJobs.length}
        </Typography>
      </Box>

      {processingJob && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {processingJob.fileName}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={processingJob.progress} 
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {Math.round(processingJob.progress)}% complete
          </Typography>
        </>
      )}

      {activeJobs.length > 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {activeJobs.length - 1} more in queue
        </Typography>
      )}
    </Box>
  );
};

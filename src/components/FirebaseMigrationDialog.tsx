/**
 * Firebase Migration Dialog Component
 * 
 * Provides a UI for migrating surveys from IndexedDB to Firebase
 */

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, LinearProgress, Typography, Box, Alert } from '@mui/material';
import { migrateSurveysToFirebase, verifyMigration } from '../utils/migrateToFirebase';
import { isFirebaseAvailable } from '../config/firebase';

interface FirebaseMigrationDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (migrated: number, errors: string[]) => void;
}

export const FirebaseMigrationDialog: React.FC<FirebaseMigrationDialogProps> = ({
  open,
  onClose,
  onComplete
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentSurvey: string; status: 'idle' | 'migrating' | 'complete' | 'error'; errors: string[] }>({ current: 0, total: 0, currentSurvey: '', status: 'idle', errors: [] });
  const [result, setResult] = useState<{ success: boolean; migrated: number; errors: string[] } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ indexedDBCount: number; firebaseCount: number; match: boolean } | null>(null);

  const handleMigrate = async () => {
    if (!isFirebaseAvailable()) {
      setResult({
        success: false,
        migrated: 0,
        errors: ['Firebase is not configured. Please set up Firebase first.']
      });
      return;
    }

    setIsMigrating(true);
    setProgress({ current: 0, total: 0, currentSurvey: '', status: 'migrating', errors: [] });
    setResult(null);

    try {
      const migrationResult = await migrateSurveysToFirebase((prog) => {
        setProgress(prog);
      });

      setResult(migrationResult);
      setIsMigrating(false);

      if (onComplete) {
        onComplete(migrationResult.migrated, migrationResult.errors);
      }
    } catch (error) {
      console.error('Migration error:', error);
      setResult({
        success: false,
        migrated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      setIsMigrating(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const verifyResult = await verifyMigration();
      setVerificationResult(verifyResult);
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    if (!isMigrating) {
      setProgress({ current: 0, total: 0, currentSurvey: '', status: 'idle', errors: [] });
      setResult(null);
      setVerificationResult(null);
      onClose();
    }
  };

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Migrate Surveys to Firebase Cloud Storage
      </DialogTitle>
      <DialogContent>
        {!isFirebaseAvailable() && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Firebase is not configured. Please set up Firebase first by adding environment variables to .env.local
          </Alert>
        )}

        {!result && !isMigrating && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This will migrate all your surveys and survey data from IndexedDB (local storage) to Firebase (cloud storage).
              Your data will be accessible from any device and automatically backed up.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleMigrate}
              disabled={!isFirebaseAvailable()}
              fullWidth
            >
              Start Migration
            </Button>
          </Box>
        )}

        {isMigrating && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Migrating {progress.current} of {progress.total} surveys...
            </Typography>
            {progress.currentSurvey && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current: {progress.currentSurvey}
              </Typography>
            )}
            <LinearProgress variant="determinate" value={progressPercent} sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary">
              {Math.round(progressPercent)}% complete
            </Typography>
          </Box>
        )}

        {result && (
          <Box>
            {result.success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully migrated {result.migrated} surveys to Firebase!
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                Migration completed with {result.errors.length} error(s). {result.migrated} surveys were migrated.
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Errors:</Typography>
                {result.errors.map((error, index) => (
                  <Typography key={index} variant="caption" color="error" display="block">
                    • {error}
                  </Typography>
                ))}
              </Box>
            )}

            <Button
              variant="outlined"
              onClick={handleVerify}
              disabled={isVerifying}
              fullWidth
              sx={{ mb: 2 }}
            >
              {isVerifying ? 'Verifying...' : 'Verify Migration'}
            </Button>

            {verificationResult && (
              <Alert severity={verificationResult.match ? 'success' : 'warning'} sx={{ mb: 2 }}>
                IndexedDB: {verificationResult.indexedDBCount} surveys | 
                Firebase: {verificationResult.firebaseCount} surveys
                {verificationResult.match ? ' ✅ Match!' : ' ⚠️ Counts do not match'}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isMigrating}>
          {result ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


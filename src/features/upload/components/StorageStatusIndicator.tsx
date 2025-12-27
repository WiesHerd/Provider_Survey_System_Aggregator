/**
 * Storage Status Indicator Component
 * 
 * Displays current storage mode and provides diagnostics for Firebase configuration
 */

import React, { memo, useEffect, useState } from 'react';
import { Alert, Box, Typography, Chip } from '@mui/material';
import { CloudIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { getStorageDiagnostics, getStorageStatusMessage, StorageDiagnostics } from '../../../shared/utils/storageDiagnostics';
import { StorageMode } from '../../../services/DataService';

/**
 * Storage Status Indicator
 * 
 * Shows current storage mode and provides helpful diagnostics
 */
export const StorageStatusIndicator: React.FC = memo(() => {
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);

  useEffect(() => {
    // Get diagnostics on mount and when storage mode might change
    const updateDiagnostics = () => {
      const diag = getStorageDiagnostics();
      setDiagnostics(diag);
    };

    updateDiagnostics();
    
    // Update periodically to catch auth state changes
    const interval = setInterval(updateDiagnostics, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (!diagnostics) {
    return null;
  }

  const isFirebase = diagnostics.currentMode === StorageMode.FIREBASE;
  const statusColor = diagnostics.status === 'ok' ? 'success' : 
                     diagnostics.status === 'warning' ? 'warning' : 'error';

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity={statusColor} 
        icon={isFirebase ? <CloudIcon className="w-5 h-5" /> : <ComputerDesktopIcon className="w-5 h-5" />}
        sx={{ 
          borderRadius: '8px',
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              Storage Mode: {getStorageStatusMessage(diagnostics)}
            </Typography>
            
            {diagnostics.recommendations.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {diagnostics.recommendations.map((rec, index) => (
                  <Typography key={index} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {rec}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
          
          <Chip 
            label={isFirebase ? 'Cloud' : 'Local'} 
            size="small"
            color={isFirebase ? 'primary' : 'default'}
            sx={{ borderRadius: '6px' }}
          />
        </Box>

        {/* Show missing env vars if Firebase is requested but not configured */}
        {diagnostics.configuredMode === StorageMode.FIREBASE && diagnostics.missingEnvVars.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
              Missing Environment Variables:
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace' }}>
              {diagnostics.missingEnvVars.join(', ')}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Create <code>.env.local</code> file with Firebase credentials (see <code>env.example</code>)
            </Typography>
          </Box>
        )}

        {/* Show authentication status if Firebase is enabled */}
        {diagnostics.configuredMode === StorageMode.FIREBASE && diagnostics.firebaseConfigured && !diagnostics.firebaseAuthenticated && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Firebase is configured but user is not authenticated. Please sign in to use cloud storage.
            </Typography>
          </Box>
        )}
      </Alert>
    </Box>
  );
});

StorageStatusIndicator.displayName = 'StorageStatusIndicator';


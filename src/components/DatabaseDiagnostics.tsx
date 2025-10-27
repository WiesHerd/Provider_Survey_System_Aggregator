/**
 * Database Diagnostics Component
 * Helps diagnose IndexedDB issues in corporate environments
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export const DatabaseDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const newResults: DiagnosticResult[] = [];

    // Test 1: IndexedDB Support
    if (typeof window !== 'undefined' && window.indexedDB) {
      newResults.push({
        test: 'IndexedDB Support',
        status: 'pass',
        message: 'IndexedDB is supported in this browser',
        details: `Available: ${!!window.indexedDB}`
      });
    } else {
      newResults.push({
        test: 'IndexedDB Support',
        status: 'fail',
        message: 'IndexedDB is not supported in this browser',
        details: 'This is likely a corporate browser restriction or very old browser'
      });
    }

    // Test 2: Storage Quota
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (used / quota) * 100 : 0;
        
        newResults.push({
          test: 'Storage Quota',
          status: percentage > 90 ? 'warning' : 'pass',
          message: `Storage usage: ${Math.round(percentage)}%`,
          details: `Used: ${Math.round(used / 1024 / 1024)}MB, Quota: ${Math.round(quota / 1024 / 1024)}MB`
        });
      } catch (error) {
        newResults.push({
          test: 'Storage Quota',
          status: 'warning',
          message: 'Could not check storage quota',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      newResults.push({
        test: 'Storage Quota',
        status: 'warning',
        message: 'Storage quota API not available',
        details: 'Cannot check storage usage'
      });
    }

    // Test 3: IndexedDB Open Test
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        const testDB = 'TestDB_' + Date.now();
        const request = indexedDB.open(testDB, 1);
        
        await new Promise((resolve, reject) => {
          request.onsuccess = () => {
            request.result.close();
            indexedDB.deleteDatabase(testDB);
            resolve(true);
          };
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error('Database blocked'));
        });

        newResults.push({
          test: 'IndexedDB Open Test',
          status: 'pass',
          message: 'Successfully opened and closed IndexedDB',
          details: 'Database operations are working'
        });
      } catch (error) {
        newResults.push({
          test: 'IndexedDB Open Test',
          status: 'fail',
          message: 'Failed to open IndexedDB',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 4: Corporate Environment Detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isCorporate = userAgent.includes('microsoft') || 
                       userAgent.includes('internet explorer') ||
                       userAgent.includes('edge/legacy') ||
                       userAgent.includes('chrome') && userAgent.includes('edg/');

    newResults.push({
      test: 'Corporate Environment',
      status: isCorporate ? 'warning' : 'pass',
      message: isCorporate ? 'Corporate browser detected' : 'Standard browser environment',
      details: `User Agent: ${navigator.userAgent}`
    });

    // Test 5: Console Access
    const hasConsole = typeof console !== 'undefined' && console.log;
    newResults.push({
      test: 'Console Access',
      status: hasConsole ? 'pass' : 'warning',
      message: hasConsole ? 'Console is available for debugging' : 'Console may be restricted',
      details: 'Check browser developer tools'
    });

    setResults(newResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />;
      case 'fail':
        return <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#ef4444' }} />;
      case 'warning':
        return <InformationCircleIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h6">Database Diagnostics</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={runDiagnostics}
          disabled={isRunning}
          sx={{ borderRadius: '6px' }}
        >
          {isRunning ? 'Running...' : 'Run Again'}
        </Button>
      </Box>

      {results.length === 0 && !isRunning && (
        <Alert severity="info">
          Click "Run Again" to start diagnostics
        </Alert>
      )}

      {isRunning && (
        <Alert severity="info">
          Running diagnostics...
        </Alert>
      )}

      {results.map((result, index) => (
        <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {getStatusIcon(result.status)}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {result.test}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {result.message}
          </Typography>
          {result.details && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
              {result.details}
            </Typography>
          )}
        </Box>
      ))}

      {results.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Next Steps:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • If IndexedDB is not supported, try a different browser
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • If storage quota is full, clear browser data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • If in corporate environment, contact IT about browser restrictions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Check browser console (F12) for detailed error messages
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

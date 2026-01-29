/**
 * Firebase Status Indicator Component
 * 
 * Shows connection status (connected/disconnected/syncing)
 * Displays last successful sync time
 * Warns when offline or experiencing issues
 * Provides manual refresh option
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { FirestoreService } from '../services/FirestoreService';
import { isFirebaseAvailable } from '../config/firebase';

export interface FirebaseStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error' | 'checking';

interface StatusInfo {
  status: ConnectionStatus;
  lastSyncTime?: Date;
  latency?: number;
  error?: string;
}

/**
 * Firebase Status Indicator Component
 */
export const FirebaseStatusIndicator: React.FC<FirebaseStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const [statusInfo, setStatusInfo] = useState<StatusInfo>({ status: 'checking' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [firestoreService, setFirestoreService] = useState<FirestoreService | null>(null);

  // Initialize Firestore service
  useEffect(() => {
    if (!isFirebaseAvailable()) {
      setStatusInfo({ status: 'disconnected', error: 'Firebase not configured' });
      return;
    }

    try {
      const service = new FirestoreService();
      setFirestoreService(service);
    } catch (error) {
      setStatusInfo({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to initialize Firebase' 
      });
    }
  }, []);

  // Check connection status
  const checkStatus = useCallback(async () => {
    if (!firestoreService) return;

    try {
      setStatusInfo(prev => ({ ...prev, status: 'checking' }));
      
      const healthCheck = await firestoreService.checkConnectivity(3000);
      
      if (healthCheck.status === 'healthy') {
        setStatusInfo({
          status: 'connected',
          lastSyncTime: new Date(),
          latency: healthCheck.latency
        });
      } else {
        setStatusInfo({
          status: 'error',
          error: healthCheck.error || 'Connection check failed',
          latency: healthCheck.latency
        });
      }
    } catch (error) {
      setStatusInfo({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [firestoreService]);

  // Initial status check
  useEffect(() => {
    if (firestoreService) {
      checkStatus();
    }
  }, [firestoreService, checkStatus]);

  // Periodic status check (every 30 seconds)
  useEffect(() => {
    if (!firestoreService || statusInfo.status === 'disconnected') return;

    const interval = setInterval(() => {
      checkStatus();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [firestoreService, checkStatus, statusInfo.status]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await checkStatus();
    setIsRefreshing(false);
  }, [checkStatus]);

  // Format last sync time
  const formatLastSync = (date?: Date): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    return date.toLocaleDateString();
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (statusInfo.status) {
      case 'connected':
        return {
          icon: <CheckCircleIcon className="h-4 w-4" />,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          label: 'Connected'
        };
      case 'syncing':
        return {
          icon: <CloudArrowUpIcon className="h-4 w-4 animate-pulse" />,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          label: 'Syncing...'
        };
      case 'error':
        return {
          icon: <ExclamationTriangleIcon className="h-4 w-4" />,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          label: 'Connection Issue'
        };
      case 'checking':
        return {
          icon: <CloudIcon className="h-4 w-4 animate-pulse" />,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'Checking...'
        };
      default:
        return {
          icon: <CloudIcon className="h-4 w-4" />,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'Disconnected'
        };
    }
  };

  const display = getStatusDisplay();

  if (!isFirebaseAvailable()) {
    return null; // Don't show if Firebase is not available
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${display.border} ${display.bg} ${className}`}>
      <div className={`${display.color}`}>
        {display.icon}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${display.color}`}>
          {display.label}
        </span>
        {showDetails && statusInfo.lastSyncTime && (
          <span className="text-xs text-gray-500">
            • {formatLastSync(statusInfo.lastSyncTime)}
          </span>
        )}
        {showDetails && statusInfo.latency && (
          <span className="text-xs text-gray-500">
            • {statusInfo.latency}ms
          </span>
        )}
        {statusInfo.error && showDetails && (
          <span className="text-xs text-amber-600" title={statusInfo.error}>
            • {statusInfo.error.substring(0, 30)}...
          </span>
        )}
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`ml-1 p-0.5 ${display.color} hover:opacity-70 transition-opacity disabled:opacity-50`}
        title="Refresh connection status"
      >
        <ArrowPathIcon className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

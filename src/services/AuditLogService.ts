/**
 * Enterprise Audit Log Service for IndexedDB
 * 
 * Provides audit logging capabilities for IndexedDB operations,
 * similar to Firebase audit logging but for client-side storage.
 */

import { getUserId } from '../shared/utils/userScoping';
import { ErrorLoggingService } from '../shared/services/ErrorLoggingService';
import { logger } from '../shared/utils/logger';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  success: boolean;
  error?: string;
}

/**
 * Audit Log Service for IndexedDB
 */
export class AuditLogService {
  private static instance: AuditLogService;
  private logs: AuditLogEntry[] = [];
  private readonly MAX_LOGS = 10000;
  private readonly STORAGE_KEY = 'auditLogs';
  private errorLogger: ErrorLoggingService;

  private constructor() {
    this.errorLogger = ErrorLoggingService.getInstance();
    this.loadLogsFromStorage();
  }

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Log an audit event
   */
  public async logAuditEvent(
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId: getUserId(),
      action,
      resourceType,
      resourceId,
      details,
      success,
      error
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Save to storage
    this.saveLogsToStorage();

    // Log errors to error logging service
    if (!success && error) {
      this.errorLogger.logError(
        `Audit event failed: ${action} on ${resourceType}:${resourceId}`,
        new Error(error),
        {
          component: 'AuditLogService',
          action: 'logAuditEvent'
        },
        details
      );
    }

    logger.log(`📝 Audit: ${action} ${resourceType}:${resourceId}`, details);
  }

  /**
   * Get audit logs
   */
  public async getAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    return this.logs
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit logs by action
   */
  public async getAuditLogsByAction(action: string, limit: number = 100): Promise<AuditLogEntry[]> {
    return this.logs
      .filter(log => log.action === action)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit logs by resource
   */
  public async getAuditLogsByResource(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.logs
      .filter(log => log.resourceType === resourceType && log.resourceId === resourceId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit logs by user
   */
  public async getAuditLogsByUser(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit statistics
   */
  public getAuditStatistics(): {
    totalLogs: number;
    successfulActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    resourcesByType: Record<string, number>;
  } {
    const actionsByType: Record<string, number> = {};
    const resourcesByType: Record<string, number> = {};
    let successfulActions = 0;
    let failedActions = 0;

    this.logs.forEach(log => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      resourcesByType[log.resourceType] = (resourcesByType[log.resourceType] || 0) + 1;
      
      if (log.success) {
        successfulActions++;
      } else {
        failedActions++;
      }
    });

    return {
      totalLogs: this.logs.length,
      successfulActions,
      failedActions,
      actionsByType,
      resourcesByType
    };
  }

  /**
   * Clear audit logs
   */
  public clearAuditLogs(): void {
    this.logs = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Save logs to local storage
   */
  private saveLogsToStorage(): void {
    try {
      const logsToSave = this.logs.slice(-this.MAX_LOGS);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logsToSave));
    } catch (error) {
      console.error('Failed to save audit logs to storage:', error);
    }
  }

  /**
   * Load logs from local storage
   */
  private loadLogsFromStorage(): void {
    try {
      const logsJson = localStorage.getItem(this.STORAGE_KEY);
      if (logsJson) {
        this.logs = JSON.parse(logsJson);
      }
    } catch (error) {
      console.error('Failed to load audit logs from storage:', error);
      this.logs = [];
    }
  }
}







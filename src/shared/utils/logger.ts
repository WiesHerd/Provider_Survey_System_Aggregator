/**
 * Enterprise Logging Utility
 * 
 * Provides environment-aware logging that:
 * - Logs in development mode for debugging
 * - Silences logs in production for performance and security
 * - Always logs errors (critical for production debugging)
 * 
 * Usage:
 *   import { logger } from '@/shared/utils/logger';
 *   logger.log('Debug message', data);
 *   logger.error('Error message', error);
 *   logger.warn('Warning message');
 */

/**
 * Logger interface for consistent logging across the application
 */
export const logger = {
  /**
   * Log informational messages (development only)
   * @param args - Arguments to log
   */
  log: (...args: any[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
    // In production, logs are silently ignored for performance
  },

  /**
   * Log error messages (always logged, even in production)
   * Errors should always be visible for debugging production issues
   * @param args - Arguments to log
   */
  error: (...args: any[]): void => {
    console.error(...args);
    // Always log errors - critical for production debugging
  },

  /**
   * Log warning messages (development only)
   * @param args - Arguments to log
   */
  warn: (...args: any[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
    // In production, warnings are silently ignored
  },

  /**
   * Log debug messages (development only)
   * @param args - Arguments to log
   */
  debug: (...args: any[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },

  /**
   * Log information messages with structured data (development only)
   * @param message - Message to log
   * @param data - Structured data object
   */
  info: (message: string, data?: any): void => {
    if (process.env.NODE_ENV === 'development') {
      if (data) {
        console.log(`ℹ️ ${message}`, data);
      } else {
        console.log(`ℹ️ ${message}`);
      }
    }
  },

  /**
   * Log performance metrics (development only)
   * @param label - Performance label
   * @param duration - Duration in milliseconds
   */
  performance: (label: string, duration: number): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }
  },
};

/**
 * Type-safe logger interface for TypeScript
 */
export type Logger = typeof logger;



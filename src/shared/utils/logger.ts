/**
 * Production-Safe Logging Utility
 * 
 * Provides conditional logging that automatically disables console logs in production.
 * Only critical errors are logged in production mode.
 * 
 * This utility also overrides global console methods in production to prevent
 * any console.log statements from executing, even if they weren't migrated to use logger.
 * 
 * Usage:
 *   import { logger } from '@/shared/utils/logger';
 *   logger.debug('Debug message'); // Only in development
 *   logger.info('Info message'); // Only in development
 *   logger.warn('Warning message'); // Only in development
 *   logger.error('Error message'); // Always logged
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Production console override - prevents all console.log/debug/info/warn in production
 * This ensures that even if code uses console.log directly, it won't execute in production
 * 
 * This runs immediately when the module loads, before any other code executes.
 * The logger is imported first in index.tsx to ensure this override happens early.
 */
if (isProduction) {
  // Create no-op functions
  const noop = () => {};
  
  // Override console methods to be no-ops in production
  // This works in both browser and Node.js environments
  try {
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    // Suppress warnings in production (only critical errors via console.error will show)
    console.warn = noop;
  } catch (e) {
    // If console is read-only (some environments), silently fail
    // The logger methods below will still work correctly
  }
}

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  log: (...args: any[]) => void;
}

/**
 * Production-safe logger implementation
 * 
 * - Development: All logs enabled
 * - Production: Only errors logged, all others disabled
 */
export const logger: Logger = {
  /**
   * Debug logging - only in development
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Info logging - only in development
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Warning logging - only in development
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Error logging - always enabled (even in production)
   * Critical errors should always be logged
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * General logging - only in development
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
};

/**
 * Legacy console replacement for gradual migration
 * 
 * Use this to replace console.log statements:
 *   import { log } from '@/shared/utils/logger';
 *   log('message'); // Replaces console.log('message');
 */
export const log = logger.log;
export const debug = logger.debug;
export const info = logger.info;
export const warn = logger.warn;
export const error = logger.error;

/**
 * Check if logging is enabled
 */
export const isLoggingEnabled = (): boolean => {
  return isDevelopment;
};

/**
 * Production mode check
 */
export const isProductionMode = (): boolean => {
  return isProduction;
};



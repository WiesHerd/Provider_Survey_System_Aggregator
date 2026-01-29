/**
 * Health Check Service
 * 
 * Pre-upload system validation to ensure Firebase, auth, and storage are ready.
 * Enterprise-grade health checks with detailed diagnostics.
 */

import { getFirebaseAuth, getFirebaseDb, isFirebaseAvailable } from '../config/firebase';
import { HealthReport } from '../types/upload';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export class HealthCheckService {
  /**
   * Run comprehensive pre-upload health checks
   */
  static async runPreUploadChecks(): Promise<HealthReport> {
    const timestamp = new Date();
    const issues: string[] = [];
    
    // Check Firebase availability
    const firebaseAvailable = await this.checkFirebaseAvailability(issues);
    
    // Check authentication status
    const authValid = await this.checkAuthenticationValid(issues);
    
    // Check storage quota
    const storageQuotaAvailable = await this.checkStorageQuota(issues);
    
    // Check IndexedDB
    const indexedDBWorking = await this.checkIndexedDB(issues);
    
    // Estimate network speed (optional, quick check)
    const networkSpeed = await this.estimateNetworkSpeed();
    
    return {
      firebaseAvailable,
      authValid,
      storageQuotaAvailable,
      indexedDBWorking,
      networkSpeed,
      timestamp,
      issues
    };
  }

  /**
   * Check if Firebase is available and connected
   */
  private static async checkFirebaseAvailability(issues: string[]): Promise<boolean> {
    try {
      if (!isFirebaseAvailable()) {
        issues.push('Firebase is not configured. Check environment variables.');
        return false;
      }

      // Try a simple Firestore read
      const db = getFirebaseDb();
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        issues.push('No user authenticated');
        return false;
      }

      // Try to read a test document (doesn't need to exist)
      const testRef = doc(db, `users/${userId}/health-check`, 'test');
      await getDoc(testRef);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      issues.push(`Firebase connection failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  private static async checkAuthenticationValid(issues: string[]): Promise<boolean> {
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;

      if (!user) {
        issues.push('User not authenticated');
        return false;
      }

      // Check if email is verified (optional)
      if (!user.emailVerified) {
        issues.push('Email not verified (warning only)');
      }

      // Try to get fresh token
      await user.getIdToken(true);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      issues.push(`Authentication check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Check available storage quota
   */
  private static async checkStorageQuota(issues: string[]): Promise<number> {
    try {
      // Check Firestore quota (estimate based on write test)
      const db = getFirebaseDb();
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        issues.push('Cannot check storage quota: not authenticated');
        return 0;
      }

      // Try a write/delete operation to test quota
      const testRef = doc(db, `users/${userId}/health-check`, 'quota-test');
      const testData = { test: true, timestamp: new Date() };
      
      await setDoc(testRef, testData);
      await deleteDoc(testRef);

      // If write succeeded, assume we have quota (Firebase doesn't expose exact quota)
      // Estimate conservatively: assume 10MB available for uploads
      return 10_000_000; // 10MB in bytes
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's a quota error
      if (errorMessage.includes('quota') || errorMessage.includes('resource-exhausted')) {
        issues.push('Storage quota exceeded or very low');
        return 0;
      }

      issues.push(`Storage quota check failed: ${errorMessage}`);
      return -1; // Unknown quota
    }
  }

  /**
   * Check if IndexedDB is working
   */
  private static async checkIndexedDB(issues: string[]): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        issues.push('IndexedDB not available in this environment');
        return false;
      }

      // Try to open/create a test database
      const testDbName = 'health-check-test';
      const request = window.indexedDB.open(testDbName, 1);

      return new Promise<boolean>((resolve) => {
        request.onsuccess = () => {
          const db = request.result;
          db.close();
          
          // Clean up test database
          window.indexedDB.deleteDatabase(testDbName);
          
          resolve(true);
        };

        request.onerror = () => {
          issues.push('IndexedDB test failed');
          resolve(false);
        };

        request.onblocked = () => {
          issues.push('IndexedDB is blocked');
          resolve(false);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      issues.push(`IndexedDB check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Estimate network speed (quick check)
   */
  private static async estimateNetworkSpeed(): Promise<number | undefined> {
    try {
      // Quick network check: measure time to fetch small data
      const startTime = performance.now();
      
      // Try to fetch a small amount of data from Firebase
      const db = getFirebaseDb();
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        return undefined;
      }

      const testRef = doc(db, `users/${userId}/health-check`, 'speed-test');
      await getDoc(testRef);

      const endTime = performance.now();
      const duration = endTime - startTime; // milliseconds

      // Estimate: assume 1KB data transfer, calculate bytes per second
      const estimatedBytes = 1024; // 1KB
      const bytesPerSecond = (estimatedBytes / duration) * 1000;

      return bytesPerSecond;
    } catch (error) {
      // Network speed check failed, but not critical
      return undefined;
    }
  }

  /**
   * Assert that health check passed all critical checks
   * @throws Error if health check failed
   */
  static assertHealthy(report: HealthReport): void {
    const criticalIssues: string[] = [];

    // Critical: Firebase must be available
    if (!report.firebaseAvailable) {
      criticalIssues.push('Firebase is not available');
    }

    // Critical: User must be authenticated
    if (!report.authValid) {
      criticalIssues.push('User not authenticated');
    }

    // Critical: Must have storage quota
    if (report.storageQuotaAvailable === 0) {
      criticalIssues.push('Storage quota exceeded');
    }

    // Warning: At least one storage option should work
    if (!report.firebaseAvailable && !report.indexedDBWorking) {
      criticalIssues.push('Both Firebase and IndexedDB unavailable - cannot upload');
    }

    if (criticalIssues.length > 0) {
      throw new Error(
        `System health check failed:\n${criticalIssues.map(issue => `- ${issue}`).join('\n')}`
      );
    }
  }

  /**
   * Check if a specific file size can be uploaded
   */
  static canUploadFileSize(fileSize: number, report: HealthReport): boolean {
    // Check if file size exceeds available quota
    if (report.storageQuotaAvailable > 0 && fileSize > report.storageQuotaAvailable) {
      return false;
    }

    // Check if file size exceeds maximum (10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxFileSize) {
      return false;
    }

    return true;
  }

  /**
   * Get health status summary for display
   */
  static getHealthSummary(report: HealthReport): string {
    const parts: string[] = [];

    parts.push(`Firebase: ${report.firebaseAvailable ? '✅ Available' : '❌ Unavailable'}`);
    parts.push(`Authentication: ${report.authValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (report.storageQuotaAvailable >= 0) {
      const quotaMB = (report.storageQuotaAvailable / 1024 / 1024).toFixed(2);
      parts.push(`Storage Quota: ${quotaMB}MB available`);
    } else {
      parts.push(`Storage Quota: Unknown`);
    }

    parts.push(`IndexedDB: ${report.indexedDBWorking ? '✅ Working' : '❌ Not working'}`);

    if (report.networkSpeed) {
      const speedKbps = (report.networkSpeed / 1024).toFixed(2);
      parts.push(`Network: ~${speedKbps} KB/s`);
    }

    if (report.issues.length > 0) {
      parts.push(`\nIssues (${report.issues.length}):`);
      report.issues.forEach(issue => {
        parts.push(`  - ${issue}`);
      });
    }

    return parts.join('\n');
  }
}

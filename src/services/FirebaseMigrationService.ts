/**
 * Firebase Migration Service
 * 
 * Migrates data from localStorage and IndexedDB to Firebase Firestore
 * Provides user notification and progress tracking during migration
 */

import { getDataService } from './DataService';
import { StorageMode } from '../config/storage';
import { isFirebaseAvailable } from '../config/firebase';

interface MigrationResult {
  success: boolean;
  migratedItems: {
    customReports: number;
    reportPreferences: number;
    userPreferences: number;
  };
  errors: string[];
}

export class FirebaseMigrationService {
  private static instance: FirebaseMigrationService;
  private isMigrating = false;

  public static getInstance(): FirebaseMigrationService {
    if (!FirebaseMigrationService.instance) {
      FirebaseMigrationService.instance = new FirebaseMigrationService();
    }
    return FirebaseMigrationService.instance;
  }

  /**
   * Check if migration is needed
   */
  public async checkMigrationNeeded(): Promise<boolean> {
    if (!isFirebaseAvailable()) {
      return false;
    }

    // Check if there's any localStorage data to migrate
    const hasCustomReports = this.hasLocalStorageData('customReports') || 
                             this.hasLocalStorageData('enhancedCustomReports');
    const hasReportPreferences = this.hasReportPreferences();
    const hasUserPreferences = this.hasUserPreferences();

    return hasCustomReports || hasReportPreferences || hasUserPreferences;
  }

  /**
   * Migrate all localStorage data to Firebase
   */
  public async migrateLocalStorageToFirebase(
    onProgress?: (message: string, percent: number) => void
  ): Promise<MigrationResult> {
    if (this.isMigrating) {
      throw new Error('Migration already in progress');
    }

    if (!isFirebaseAvailable()) {
      return {
        success: false,
        migratedItems: { customReports: 0, reportPreferences: 0, userPreferences: 0 },
        errors: ['Firebase is not available. Please configure Firebase first.']
      };
    }

    this.isMigrating = true;
    const result: MigrationResult = {
      success: true,
      migratedItems: { customReports: 0, reportPreferences: 0, userPreferences: 0 },
      errors: []
    };

    try {
      const dataService = getDataService(StorageMode.FIREBASE);

      // Migrate custom reports
      onProgress?.('Migrating custom reports...', 10);
      try {
        const customReportsCount = await this.migrateCustomReports(dataService);
        result.migratedItems.customReports = customReportsCount;
        onProgress?.(`Migrated ${customReportsCount} custom reports`, 40);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Custom reports migration failed: ${errorMsg}`);
        console.error('❌ Custom reports migration error:', error);
      }

      // Migrate report preferences
      onProgress?.('Migrating report preferences...', 50);
      try {
        const reportPrefsCount = await this.migrateReportPreferences(dataService);
        result.migratedItems.reportPreferences = reportPrefsCount;
        onProgress?.(`Migrated ${reportPrefsCount} report preferences`, 70);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Report preferences migration failed: ${errorMsg}`);
        console.error('❌ Report preferences migration error:', error);
      }

      // Migrate user preferences
      onProgress?.('Migrating user preferences...', 80);
      try {
        const userPrefsCount = await this.migrateUserPreferences(dataService);
        result.migratedItems.userPreferences = userPrefsCount;
        onProgress?.(`Migrated ${userPrefsCount} user preferences`, 95);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`User preferences migration failed: ${errorMsg}`);
        console.error('❌ User preferences migration error:', error);
      }

      onProgress?.('Migration complete!', 100);
      result.success = result.errors.length === 0;

      // Clear localStorage after successful migration
      if (result.success) {
        this.clearMigratedLocalStorage();
      }

      return result;
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Migration failed: ${errorMsg}`);
      console.error('❌ Migration error:', error);
      return result;
    } finally {
      this.isMigrating = false;
    }
  }

  /**
   * Migrate custom reports from localStorage
   */
  private async migrateCustomReports(dataService: any): Promise<number> {
    let count = 0;

    // Migrate from 'customReports' key
    const customReports = this.getLocalStorageData('customReports');
    if (Array.isArray(customReports)) {
      for (const report of customReports) {
        try {
          if (report.id) {
            await dataService.saveCustomReport(report);
            count++;
          }
        } catch (error) {
          console.error('Error migrating custom report:', error);
        }
      }
    }

    // Migrate from 'enhancedCustomReports' key
    const enhancedReports = this.getLocalStorageData('enhancedCustomReports');
    if (Array.isArray(enhancedReports)) {
      for (const report of enhancedReports) {
        try {
          if (report.id) {
            await dataService.saveCustomReport(report);
            count++;
          }
        } catch (error) {
          console.error('Error migrating enhanced custom report:', error);
        }
      }
    }

    return count;
  }

  /**
   * Migrate report preferences from localStorage
   */
  private async migrateReportPreferences(dataService: any): Promise<number> {
    let count = 0;
    const preferences: Record<string, any> = {};

    // Find all report preference keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('reportConfig_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const prefKey = key.replace('reportConfig_', '');
            preferences[`reportConfig_${prefKey}`] = JSON.parse(value);
            count++;
          }
        } catch (error) {
          console.error(`Error migrating report preference ${key}:`, error);
        }
      }
    }

    if (Object.keys(preferences).length > 0) {
      await dataService.saveUserPreferences(preferences);
    }

    return count;
  }

  /**
   * Migrate user preferences from localStorage
   */
  private async migrateUserPreferences(dataService: any): Promise<number> {
    let count = 0;
    const preferences: Record<string, any> = {};

    // Find all preference keys (excluding report preferences)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('preference_') && !key.startsWith('reportConfig_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            preferences[key] = JSON.parse(value);
            count++;
          }
        } catch (error) {
          console.error(`Error migrating user preference ${key}:`, error);
        }
      }
    }

    if (Object.keys(preferences).length > 0) {
      await dataService.saveUserPreferences(preferences);
    }

    return count;
  }

  /**
   * Clear migrated localStorage data
   */
  private clearMigratedLocalStorage(): void {
    // Clear custom reports
    localStorage.removeItem('customReports');
    localStorage.removeItem('enhancedCustomReports');

    // Clear report preferences
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('reportConfig_') || key.startsWith('preference_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log('✅ Cleared migrated localStorage data');
  }

  /**
   * Check if localStorage has data for a given key
   */
  private hasLocalStorageData(key: string): boolean {
    try {
      const data = localStorage.getItem(key);
      return data !== null && data !== undefined && data !== '';
    } catch {
      return false;
    }
  }

  /**
   * Get data from localStorage
   */
  private getLocalStorageData(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if report preferences exist
   */
  private hasReportPreferences(): boolean {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('reportConfig_')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user preferences exist
   */
  private hasUserPreferences(): boolean {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('preference_') && !key.startsWith('reportConfig_')) {
        return true;
      }
    }
    return false;
  }
}

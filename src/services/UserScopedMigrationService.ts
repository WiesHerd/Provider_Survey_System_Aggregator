/**
 * User-Scoped Data Migration Service
 * 
 * Migrates existing global IndexedDB data to user-scoped keys
 * to ensure data isolation between users in production.
 */

import { getUserId, isUserAuthenticated, userScopedKey } from '../shared/utils/userScoping';
import { IndexedDBService } from './IndexedDBService';

export interface MigrationResult {
  success: boolean;
  surveysMigrated: number;
  mappingsMigrated: number;
  dataRowsMigrated: number;
  errors: string[];
}

/**
 * User-Scoped Migration Service
 * Handles migration of global data to user-scoped storage
 */
export class UserScopedMigrationService {
  private static instance: UserScopedMigrationService;
  private isMigrationComplete = false;
  private isMigrationRunning = false;

  public static getInstance(): UserScopedMigrationService {
    if (!UserScopedMigrationService.instance) {
      UserScopedMigrationService.instance = new UserScopedMigrationService();
    }
    return UserScopedMigrationService.instance;
  }

  /**
   * Check if migration is needed
   */
  public async checkMigrationNeeded(): Promise<boolean> {
    if (this.isMigrationComplete) {
      return false;
    }

    try {
      const db = await this.openDatabase();
      if (!db.objectStoreNames.contains('surveys')) {
        return false;
      }

      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const surveys = request.result || [];
          const userId = getUserId();
          const userPrefix = `${userId}_`;
          // Check if any survey ID doesn't start with user prefix (needs migration)
          const needsMigration = surveys.some((survey: any) => !survey.id.startsWith(userPrefix));
          resolve(needsMigration);
        };
        request.onerror = () => {
          resolve(false);
        };
      });
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Migrate all global data to user-scoped storage
   */
  public async migrateToUserScoped(): Promise<MigrationResult> {
    if (this.isMigrationComplete) {
      return {
        success: true,
        surveysMigrated: 0,
        mappingsMigrated: 0,
        dataRowsMigrated: 0,
        errors: []
      };
    }

    if (this.isMigrationRunning) {
      throw new Error('Migration already in progress');
    }

    this.isMigrationRunning = true;
    const userId = getUserId();
    const errors: string[] = [];

    console.log(`🔄 Starting user-scoped data migration for user: ${userId}`);

    try {
      const db = await this.openDatabase();
      
      // Migrate surveys
      const surveysResult = await this.migrateSurveys(db, userId);
      
      // Migrate mappings
      const mappingsResult = await this.migrateMappings(db, userId);
      
      // Migrate survey data
      const dataResult = await this.migrateSurveyData(db, userId);

      const result: MigrationResult = {
        success: errors.length === 0,
        surveysMigrated: surveysResult.count,
        mappingsMigrated: mappingsResult.count,
        dataRowsMigrated: dataResult.count,
        errors
      };

      if (result.success) {
        this.isMigrationComplete = true;
        console.log(`✅ User-scoped migration completed successfully`);
      } else {
        console.error(`❌ User-scoped migration completed with errors:`, errors);
      }

      return result;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        surveysMigrated: 0,
        mappingsMigrated: 0,
        dataRowsMigrated: 0,
        errors
      };
    } finally {
      this.isMigrationRunning = false;
    }
  }

  /**
   * Migrate surveys to user-scoped storage
   */
  private async migrateSurveys(db: IDBDatabase, userId: string): Promise<{ count: number }> {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('surveys')) {
        resolve({ count: 0 });
        return;
      }

      // First, get all surveys and check which ones need migration
      const readTransaction = db.transaction(['surveys'], 'readonly');
      const readStore = readTransaction.objectStore('surveys');
      const readRequest = readStore.getAll();

      readRequest.onsuccess = () => {
        const surveys = readRequest.result || [];
        const userPrefix = `${userId}_`;
        
        // Filter surveys that need migration and check if target already exists
        const surveysToMigrate: Array<{ legacy: any; userScopedId: string }> = [];
        const checkPromises: Promise<void>[] = [];

        surveys.forEach((survey: any) => {
          // Only migrate surveys that don't have user-scoped IDs
          if (!survey.id.startsWith(userPrefix)) {
            const legacyId = survey.id;
            const userScopedId = userScopedKey(legacyId);
            
            // Check if user-scoped survey already exists
            const checkRequest = readStore.get(userScopedId);
            const checkPromise = new Promise<void>((resolveCheck) => {
              checkRequest.onsuccess = () => {
                const existingSurvey = checkRequest.result;
                
                if (!existingSurvey) {
                  // Survey doesn't exist with user-scoped ID, needs migration
                  surveysToMigrate.push({ legacy: survey, userScopedId });
                } else {
                  console.log(`⏭️ Survey ${legacyId} already migrated, skipping`);
                }
                resolveCheck();
              };
              
              checkRequest.onerror = () => {
                // If check fails, assume it doesn't exist and needs migration
                surveysToMigrate.push({ legacy: survey, userScopedId });
                resolveCheck();
              };
            });
            
            checkPromises.push(checkPromise);
          }
        });

        // Wait for all checks to complete, then perform migration
        Promise.all(checkPromises).then(() => {
          if (surveysToMigrate.length === 0) {
            console.log(`✅ No surveys need migration (all already migrated)`);
            resolve({ count: 0 });
            return;
          }

          // Now perform the migration in a write transaction
          const writeTransaction = db.transaction(['surveys'], 'readwrite');
          const writeStore = writeTransaction.objectStore('surveys');
          let migratedCount = 0;
          let errorCount = 0;

          surveysToMigrate.forEach(({ legacy, userScopedId }) => {
            const legacyId = legacy.id;
            
            // Create new survey with user-scoped ID
            const migratedSurvey = {
              ...legacy,
              id: userScopedId,
              migratedAt: new Date(),
              originalId: legacyId // Store original ID for reference
            };
            
            // Use put to handle both insert and update (won't throw if exists)
            const putRequest = writeStore.put(migratedSurvey);
            putRequest.onsuccess = () => {
              // Delete old survey with legacy ID (only if different)
              if (legacyId !== userScopedId) {
                const deleteRequest = writeStore.delete(legacyId);
                deleteRequest.onsuccess = () => {
                  migratedCount++;
                };
                deleteRequest.onerror = () => {
                  console.error(`❌ Failed to delete legacy survey ${legacyId}:`, deleteRequest.error);
                  migratedCount++; // Still count as migrated even if delete fails
                };
              } else {
                migratedCount++;
              }
            };
            putRequest.onerror = () => {
              // Check if error is "key already exists" - this means it was migrated between check and write
              const error = putRequest.error;
              if (error && error.name === 'ConstraintError') {
                console.log(`⏭️ Survey ${legacyId} was migrated concurrently, skipping`);
                migratedCount++; // Count as migrated
              } else {
                console.error(`❌ Failed to migrate survey ${legacyId}:`, error);
                errorCount++;
              }
            };
          });

          writeTransaction.oncomplete = () => {
            console.log(`✅ Migrated ${migratedCount} surveys to user-scoped storage`);
            resolve({ count: migratedCount });
          };

          writeTransaction.onerror = () => {
            console.error('❌ Survey migration transaction failed:', writeTransaction.error);
            resolve({ count: migratedCount });
          };
        });
      };

      readRequest.onerror = () => {
        console.error('❌ Failed to get surveys for migration:', readRequest.error);
        resolve({ count: 0 });
      };
    });
  }

  /**
   * Migrate mappings to user-scoped storage
   */
  private async migrateMappings(db: IDBDatabase, userId: string): Promise<{ count: number }> {
    const mappingStores = ['specialtyMappings', 'columnMappings', 'variableMappings', 'regionMappings', 'providerTypeMappings'];
    let totalMigrated = 0;

    for (const storeName of mappingStores) {
      if (!db.objectStoreNames.contains(storeName)) {
        continue;
      }

      const count = await new Promise<number>((resolve) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const mappings = request.result || [];
          let migratedCount = 0;

          mappings.forEach((mapping: any) => {
            if (!mapping.userId) {
              const updatedMapping = {
                ...mapping,
                userId,
                migratedAt: new Date()
              };
              
              const putRequest = store.put(updatedMapping);
              putRequest.onsuccess = () => {
                migratedCount++;
              };
            }
          });

          transaction.oncomplete = () => {
            resolve(migratedCount);
          };

          transaction.onerror = () => {
            resolve(0);
          };
        };

        request.onerror = () => {
          resolve(0);
        };
      });

      totalMigrated += count;
    }

    console.log(`✅ Migrated ${totalMigrated} mappings to user-scoped storage`);
    return { count: totalMigrated };
  }

  /**
   * Migrate survey data to user-scoped storage
   */
  private async migrateSurveyData(db: IDBDatabase, userId: string): Promise<{ count: number }> {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('surveyData')) {
        resolve({ count: 0 });
        return;
      }

      // First, get all survey data and check which ones need migration
      const readTransaction = db.transaction(['surveyData'], 'readonly');
      const readStore = readTransaction.objectStore('surveyData');
      const readRequest = readStore.getAll();

      readRequest.onsuccess = () => {
        const dataRows = readRequest.result || [];
        const userPrefix = `${userId}_`;
        
        // Filter rows that need migration and check if target already exists
        const rowsToMigrate: Array<{ legacy: any; userScopedId: string; userScopedSurveyId: string }> = [];
        const checkPromises: Promise<void>[] = [];

        dataRows.forEach((row: any) => {
          // Migrate survey data to use user-scoped survey IDs
          const legacySurveyId = row.surveyId;
          if (legacySurveyId && !legacySurveyId.startsWith(userPrefix)) {
            const userScopedSurveyId = userScopedKey(legacySurveyId);
            const legacyId = row.id;
            const userScopedId = userScopedKey(legacyId);
            
            // Check if user-scoped row already exists
            const checkRequest = readStore.get(userScopedId);
            const checkPromise = new Promise<void>((resolveCheck) => {
              checkRequest.onsuccess = () => {
                const existingRow = checkRequest.result;
                
                if (!existingRow) {
                  // Row doesn't exist with user-scoped ID, needs migration
                  rowsToMigrate.push({ legacy: row, userScopedId, userScopedSurveyId });
                } else {
                  console.log(`⏭️ Survey data row ${legacyId} already migrated, skipping`);
                }
                resolveCheck();
              };
              
              checkRequest.onerror = () => {
                // If check fails, assume it doesn't exist and needs migration
                rowsToMigrate.push({ legacy: row, userScopedId, userScopedSurveyId });
                resolveCheck();
              };
            });
            
            checkPromises.push(checkPromise);
          }
        });

        // Wait for all checks to complete, then perform migration
        Promise.all(checkPromises).then(() => {
          if (rowsToMigrate.length === 0) {
            console.log(`✅ No survey data rows need migration (all already migrated)`);
            resolve({ count: 0 });
            return;
          }

          // Now perform the migration in a write transaction
          const writeTransaction = db.transaction(['surveyData'], 'readwrite');
          const writeStore = writeTransaction.objectStore('surveyData');
          let migratedCount = 0;
          let errorCount = 0;

          rowsToMigrate.forEach(({ legacy, userScopedId, userScopedSurveyId }) => {
            const legacyId = legacy.id;
            const legacySurveyId = legacy.surveyId;
            
            const migratedRow = {
              ...legacy,
              id: userScopedId,
              surveyId: userScopedSurveyId,
              migratedAt: new Date(),
              originalId: legacyId,
              originalSurveyId: legacySurveyId
            };
            
            // Use put to handle both insert and update (won't throw if exists)
            const putRequest = writeStore.put(migratedRow);
            putRequest.onsuccess = () => {
              // Delete old row (only if different)
              if (legacyId !== userScopedId) {
                const deleteRequest = writeStore.delete(legacyId);
                deleteRequest.onsuccess = () => {
                  migratedCount++;
                };
                deleteRequest.onerror = () => {
                  console.error(`❌ Failed to delete legacy survey data row ${legacyId}:`, deleteRequest.error);
                  migratedCount++; // Still count as migrated even if delete fails
                };
              } else {
                migratedCount++;
              }
            };
            putRequest.onerror = () => {
              // Check if error is "key already exists" - this means it was migrated between check and write
              const error = putRequest.error;
              if (error && error.name === 'ConstraintError') {
                console.log(`⏭️ Survey data row ${legacyId} was migrated concurrently, skipping`);
                migratedCount++; // Count as migrated
              } else {
                console.error(`❌ Failed to migrate survey data row ${legacyId}:`, error);
                errorCount++;
              }
            };
          });

          writeTransaction.oncomplete = () => {
            console.log(`✅ Migrated ${migratedCount} survey data rows to user-scoped storage`);
            resolve({ count: migratedCount });
          };

          writeTransaction.onerror = () => {
            resolve({ count: migratedCount });
          };
        });
      };

      readRequest.onerror = () => {
        resolve({ count: 0 });
      };
    });
  }

  /**
   * Open database connection
   * CRITICAL FIX: Open without version first to detect existing version
   * This prevents "version less than existing" errors
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // First, check existing version
      const checkRequest = indexedDB.open('SurveyAggregatorDB');
      
      checkRequest.onsuccess = () => {
        const existingDb = checkRequest.result;
        const existingVersion = existingDb.version;
        existingDb.close();
        
        // Open without version to use existing version (prevents version mismatch errors)
        const request = indexedDB.open('SurveyAggregatorDB');
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      };
      
      checkRequest.onerror = () => {
        // If check fails, try opening with version 9 (current)
        const request = indexedDB.open('SurveyAggregatorDB', 9);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      };
    });
  }

  /**
   * Filter data by user ID (helper for queries)
   */
  public static filterByUserId<T extends { userId?: string }>(data: T[], userId: string): T[] {
    return data.filter(item => !item.userId || item.userId === userId);
  }
}



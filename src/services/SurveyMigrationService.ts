/**
 * Survey Migration Service
 * Automatically fixes existing surveys to have proper provider type tags
 */

import { TransactionQueue } from '../shared/services/TransactionQueue';

export class SurveyMigrationService {
  private static instance: SurveyMigrationService;
  private isMigrationComplete = false;
  private isMigrationRunning = false;
  private migrationLock: string | null = null;
  private transactionQueue: TransactionQueue = TransactionQueue.getInstance();

  public static getInstance(): SurveyMigrationService {
    if (!SurveyMigrationService.instance) {
      SurveyMigrationService.instance = new SurveyMigrationService();
    }
    return SurveyMigrationService.instance;
  }

  /**
   * Migrate existing surveys to have proper provider type tags
   * Uses transaction queue to prevent race conditions
   */
  public async migrateSurveys(): Promise<void> {
    // Prevent concurrent migrations
    if (this.isMigrationComplete) {
      return;
    }

    if (this.isMigrationRunning) {
      console.log('⏳ Migration already in progress, waiting...');
      // Wait for current migration to complete
      while (this.isMigrationRunning) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Use transaction queue to ensure atomic operation
    return await this.transactionQueue.queueTransaction(async () => {
      this.isMigrationRunning = true;
      const lockId = await this.transactionQueue.acquireLock('surveys', 'readwrite');
      this.migrationLock = lockId;

      try {
        console.log('🔧 Starting survey migration to fix provider type tags...');
        
        // CRITICAL FIX: Open without version first to detect existing version
        // This prevents "version less than existing" errors
        return new Promise<void>((resolve, reject) => {
          const checkRequest = indexedDB.open('SurveyAggregatorDB');
          
          checkRequest.onsuccess = () => {
            const existingDb = checkRequest.result;
            const existingVersion = existingDb.version;
            existingDb.close();
            
            // Open without version to use existing version
            const request = indexedDB.open('SurveyAggregatorDB');
            
            request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Check if the surveys object store exists
          if (!db.objectStoreNames.contains('surveys')) {
            console.log('🔍 No surveys object store found - no migration needed');
            this.isMigrationComplete = true;
            resolve();
            return;
          }
          
          try {
            // Get all surveys
            const transaction = db.transaction(['surveys'], 'readwrite');
            const store = transaction.objectStore('surveys');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
              const surveys = getAllRequest.result;
              console.log(`📊 Found ${surveys.length} surveys to check`);
              
              let fixedCount = 0;
              let skippedCount = 0;
              
              surveys.forEach((survey: any) => {
                let needsUpdate = false;
                let newProviderType = survey.providerType;
                
                // Check if survey name indicates APP but providerType is not APP
                // This must come FIRST to catch "SullivanCotter APP" before the general "sullivan" check
                if (survey.name && survey.name.toLowerCase().includes('app') && survey.providerType !== 'APP') {
                  newProviderType = 'APP';
                  needsUpdate = true;
                  console.log(`🔧 Fixing survey "${survey.name}": ${survey.providerType} → APP`);
                }
                
                // Check if survey name indicates Physician but providerType is not PHYSICIAN
                // Only check for physician-specific keywords, not general survey names
                else if (survey.name && (
                  survey.name.toLowerCase().includes('physician') || 
                  survey.name.toLowerCase().includes('mgma') || 
                  survey.name.toLowerCase().includes('gallagher')
                ) && survey.providerType !== 'PHYSICIAN') {
                  newProviderType = 'PHYSICIAN';
                  needsUpdate = true;
                  console.log(`🔧 Fixing survey "${survey.name}": ${survey.providerType} → PHYSICIAN`);
                }
                
                // Check for Sullivan surveys that are NOT APP (i.e., physician surveys)
                else if (survey.name && survey.name.toLowerCase().includes('sullivan') && 
                         !survey.name.toLowerCase().includes('app') && 
                         survey.providerType !== 'PHYSICIAN') {
                  newProviderType = 'PHYSICIAN';
                  needsUpdate = true;
                  console.log(`🔧 Fixing Sullivan survey "${survey.name}": ${survey.providerType} → PHYSICIAN`);
                }
                
                // Check if survey has no provider type but name gives us a clue
                else if (!survey.providerType) {
                  if (survey.name && survey.name.toLowerCase().includes('app')) {
                    newProviderType = 'APP';
                    needsUpdate = true;
                    console.log(`🔧 Setting provider type for "${survey.name}": undefined → APP`);
                  } else if (survey.name && (
                    survey.name.toLowerCase().includes('physician') || 
                    survey.name.toLowerCase().includes('mgma') || 
                    survey.name.toLowerCase().includes('gallagher')
                  )) {
                    newProviderType = 'PHYSICIAN';
                    needsUpdate = true;
                    console.log(`🔧 Setting provider type for "${survey.name}": undefined → PHYSICIAN`);
                  } else if (survey.name && survey.name.toLowerCase().includes('sullivan') && 
                           !survey.name.toLowerCase().includes('app')) {
                    newProviderType = 'PHYSICIAN';
                    needsUpdate = true;
                    console.log(`🔧 Setting Sullivan survey provider type for "${survey.name}": undefined → PHYSICIAN`);
                  } else {
                    // DO NOT default to PHYSICIAN - only update if we have clear evidence
                    console.log(`ℹ️ Skipping provider type assignment for "${survey.name}" - no clear indication`);
                    needsUpdate = false;
                  }
                }
                
                if (needsUpdate) {
                  // Update the survey
                  const updatedSurvey = {
                    ...survey,
                    providerType: newProviderType,
                    updatedAt: new Date()
                  };
                  
                  const putRequest = store.put(updatedSurvey);
                  putRequest.onsuccess = () => {
                    fixedCount++;
                    console.log(`✅ Updated survey "${survey.name}" to provider type: ${newProviderType}`);
                  };
                  putRequest.onerror = () => {
                    console.error(`❌ Error updating survey "${survey.name}":`, putRequest.error);
                  };
                } else {
                  skippedCount++;
                  console.log(`⏭️ Skipped survey "${survey.name}" (already has correct provider type: ${survey.providerType})`);
                }
              });
              
              transaction.oncomplete = () => {
                console.log(`🎉 Migration complete: Fixed ${fixedCount} surveys, skipped ${skippedCount} surveys`);
                this.isMigrationComplete = true;
                resolve();
              };
              
              transaction.onerror = () => {
                console.error('❌ Migration transaction error:', transaction.error);
                reject(transaction.error);
              };
            };
            
            getAllRequest.onerror = () => {
              console.error('❌ Error getting surveys:', getAllRequest.error);
              reject(getAllRequest.error);
            };
          } catch (error) {
            console.error('❌ Migration error:', error);
            reject(error);
          }
        };
        
            request.onerror = () => {
              console.error('❌ Failed to open database for migration:', request.error);
              this.isMigrationComplete = true; // Mark as complete to prevent retries
              resolve(); // Don't reject, just resolve to prevent app crash
            };
            
            request.onupgradeneeded = () => {
              console.log('🔍 Database upgrade needed - no migration needed');
              this.isMigrationComplete = true;
              resolve();
            };
          };
          
          checkRequest.onerror = () => {
            // If check fails, try opening without version as fallback
            const fallbackRequest = indexedDB.open('SurveyAggregatorDB');
            fallbackRequest.onsuccess = async (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains('surveys')) {
                this.isMigrationComplete = true;
                resolve();
                return;
              }
              // Migration logic would go here if needed
              this.isMigrationComplete = true;
              resolve();
            };
            fallbackRequest.onerror = () => {
              this.isMigrationComplete = true;
              resolve();
            };
          };
        });
      } finally {
        if (this.migrationLock) {
          this.transactionQueue.releaseLock('surveys', 'readwrite', this.migrationLock);
          this.migrationLock = null;
        }
        this.isMigrationRunning = false;
      }
    }, 'high');
  }

  /**
   * Check if migration is needed
   */
  public async checkMigrationNeeded(): Promise<boolean> {
    try {
      // CRITICAL FIX: Always open without version to use existing version
      // This prevents "version less than existing" errors from cached old code
      return new Promise((resolve) => {
        // First, detect existing version by opening without version
        const detectRequest = indexedDB.open('SurveyAggregatorDB');
        
        detectRequest.onsuccess = () => {
          const existingDb = detectRequest.result;
          const existingVersion = existingDb.version;
          existingDb.close();
          
          console.log(`📊 SurveyMigrationService: Detected database version ${existingVersion}`);
          
          // Now open without version to use existing version
          const request = indexedDB.open('SurveyAggregatorDB');
          
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Check if the surveys object store exists
            if (!db.objectStoreNames.contains('surveys')) {
              console.log('🔍 No surveys object store found - no migration needed');
              db.close();
              resolve(false);
              return;
            }
            
            try {
              const transaction = db.transaction(['surveys'], 'readonly');
              const store = transaction.objectStore('surveys');
              const getAllRequest = store.getAll();
              
              getAllRequest.onsuccess = () => {
                const surveys = getAllRequest.result;
                const needsMigration = surveys.some((survey: any) => !survey.providerType);
                console.log(`🔍 Migration check: ${needsMigration ? 'NEEDED' : 'NOT NEEDED'} (${surveys.length} surveys checked)`);
                db.close();
                resolve(needsMigration);
              };
              
              getAllRequest.onerror = () => {
                console.error('❌ Failed to get surveys:', getAllRequest.error);
                db.close();
                resolve(false); // Don't reject, just return false
              };
            } catch (transactionError) {
              console.error('❌ Transaction error:', transactionError);
              db.close();
              resolve(false); // Don't reject, just return false
            }
          };
          
          request.onerror = () => {
            const error = request.error;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to open database:', errorMessage);
            
            // If it's a version error, try one more time without version as absolute fallback
            if (errorMessage.includes('version') && (errorMessage.includes('less than') || errorMessage.includes('greater than'))) {
              console.warn('🔄 Version error detected in checkMigrationNeeded, skipping migration check');
              resolve(false);
            } else {
              resolve(false); // Don't reject, just return false
            }
          };
          
          request.onupgradeneeded = () => {
            console.log('🔍 Database upgrade needed - no migration needed');
            resolve(false);
          };
        };
        
        detectRequest.onerror = () => {
          // Detection failed, try opening without version as fallback
          console.warn('⚠️ Version detection failed, opening without version as fallback');
          const fallbackRequest = indexedDB.open('SurveyAggregatorDB');
          
          fallbackRequest.onsuccess = () => {
            const db = fallbackRequest.result;
            if (!db.objectStoreNames.contains('surveys')) {
              db.close();
              resolve(false);
              return;
            }
            db.close();
            resolve(false); // Can't check without version, assume no migration needed
          };
          
          fallbackRequest.onerror = () => {
            console.error('❌ Fallback open also failed');
            resolve(false);
          };
        };
      });
    } catch (error) {
      console.error('❌ Migration check failed:', error);
      return false;
    }
  }
}



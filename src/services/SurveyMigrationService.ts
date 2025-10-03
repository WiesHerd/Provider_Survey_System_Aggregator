/**
 * Survey Migration Service
 * Automatically fixes existing surveys to have proper provider type tags
 */

export class SurveyMigrationService {
  private static instance: SurveyMigrationService;
  private isMigrationComplete = false;

  public static getInstance(): SurveyMigrationService {
    if (!SurveyMigrationService.instance) {
      SurveyMigrationService.instance = new SurveyMigrationService();
    }
    return SurveyMigrationService.instance;
  }

  /**
   * Migrate existing surveys to have proper provider type tags
   */
  public async migrateSurveys(): Promise<void> {
    if (this.isMigrationComplete) {
      return;
    }

    try {
      console.log('🔧 Starting survey migration to fix provider type tags...');
      
      // Open IndexedDB
      const request = indexedDB.open('SurveyAggregatorDB', 1);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
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
                    // Default to PHYSICIAN for surveys without clear indication
                    newProviderType = 'PHYSICIAN';
                    needsUpdate = true;
                    console.log(`🔧 Setting default provider type for "${survey.name}": undefined → PHYSICIAN`);
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
          console.error('❌ Error opening database:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if migration is needed
   */
  public async checkMigrationNeeded(): Promise<boolean> {
    try {
      const request = indexedDB.open('SurveyAggregatorDB', 1);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['surveys'], 'readonly');
          const store = transaction.objectStore('surveys');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            const surveys = getAllRequest.result;
            const needsMigration = surveys.some((survey: any) => !survey.providerType);
            console.log(`🔍 Migration check: ${needsMigration ? 'NEEDED' : 'NOT NEEDED'} (${surveys.length} surveys checked)`);
            resolve(needsMigration);
          };
          
          getAllRequest.onerror = () => {
            reject(getAllRequest.error);
          };
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Migration check failed:', error);
      return false;
    }
  }
}



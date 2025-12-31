/**
 * Migration Utility - Migrate Surveys from IndexedDB to Firebase
 * 
 * This script migrates all surveys and survey data from IndexedDB to Firebase Firestore.
 * Run this in the browser console or create a migration component.
 */

import { getDataService } from '../services/DataService';
import { StorageMode } from '../config/storage';
import { isFirebaseAvailable } from '../config/firebase';

interface MigrationProgress {
  current: number;
  total: number;
  currentSurvey: string;
  status: 'idle' | 'migrating' | 'complete' | 'error';
  errors: string[];
}

/**
 * Migrate all surveys from IndexedDB to Firebase
 */
export async function migrateSurveysToFirebase(
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ success: boolean; migrated: number; errors: string[] }> {
  // Check if Firebase is available
  if (!isFirebaseAvailable()) {
    const error = 'Firebase is not configured. Please set up Firebase first.';
    console.error('❌', error);
    return { success: false, migrated: 0, errors: [error] };
  }

  const errors: string[] = [];
  let migratedCount = 0;

  try {
    // Get IndexedDB service
    const indexedDBService = getDataService(StorageMode.INDEXED_DB);
    
    // Get Firebase service
    const firebaseService = getDataService(StorageMode.FIREBASE);

    // Get all surveys from IndexedDB
    console.log('📥 Fetching surveys from IndexedDB...');
    const surveys = await indexedDBService.getAllSurveys();
    
    if (surveys.length === 0) {
      console.log('ℹ️ No surveys found in IndexedDB to migrate.');
      return { success: true, migrated: 0, errors: [] };
    }

    console.log(`📊 Found ${surveys.length} surveys to migrate`);

    // Migrate each survey
    for (let i = 0; i < surveys.length; i++) {
      const survey = surveys[i];
      
      onProgress?.({
        current: i + 1,
        total: surveys.length,
        currentSurvey: survey.name,
        status: 'migrating',
        errors: []
      });

      try {
        console.log(`\n🔄 Migrating survey ${i + 1}/${surveys.length}: ${survey.name}`);
        
        // Check if survey already exists in Firebase
        try {
          const existing = await firebaseService.getSurveyById(survey.id);
          if (existing) {
            console.log(`⏭️  Survey ${survey.name} already exists in Firebase, skipping...`);
            continue;
          }
        } catch (error) {
          // Survey doesn't exist, continue with migration
        }

        // Create survey in Firebase
        console.log(`  💾 Creating survey record in Firebase...`);
        await firebaseService.createSurvey(survey);
        console.log(`  ✅ Survey record created`);

        // Get survey data from IndexedDB
        console.log(`  📥 Fetching survey data from IndexedDB...`);
        const { rows } = await indexedDBService.getSurveyData(survey.id);
        console.log(`  📊 Found ${rows.length} rows to migrate`);

        if (rows.length > 0) {
          // Save survey data to Firebase with progress
          console.log(`  💾 Saving ${rows.length} rows to Firebase...`);
          await firebaseService.saveSurveyData(survey.id, rows, (progress) => {
            if (progress % 10 === 0 || progress === 100) {
              console.log(`  📊 Progress: ${progress}%`);
            }
          });
          console.log(`  ✅ All ${rows.length} rows saved to Firebase`);
        }

        migratedCount++;
        console.log(`✅ Successfully migrated survey: ${survey.name}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const fullError = `Failed to migrate survey "${survey.name}": ${errorMsg}`;
        console.error(`❌ ${fullError}`, error);
        errors.push(fullError);
      }
    }

    onProgress?.({
      current: surveys.length,
      total: surveys.length,
      currentSurvey: '',
      status: 'complete',
      errors
    });

    console.log(`\n🎉 Migration complete!`);
    console.log(`✅ Migrated: ${migratedCount}/${surveys.length} surveys`);
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.forEach(err => console.log(`   - ${err}`));
    }

    return {
      success: errors.length === 0,
      migrated: migratedCount,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Migration failed:', errorMsg, error);
    return {
      success: false,
      migrated: migratedCount,
      errors: [`Migration failed: ${errorMsg}`, ...errors]
    };
  }
}

/**
 * Verify migration by comparing survey counts
 */
export async function verifyMigration(): Promise<{
  indexedDBCount: number;
  firebaseCount: number;
  match: boolean;
}> {
  try {
    const indexedDBService = getDataService(StorageMode.INDEXED_DB);
    const firebaseService = getDataService(StorageMode.FIREBASE);

    const indexedDBSurveys = await indexedDBService.getAllSurveys();
    const firebaseSurveys = await firebaseService.getAllSurveys();

    const match = indexedDBSurveys.length === firebaseSurveys.length;

    console.log('🔍 Migration Verification:');
    console.log(`  IndexedDB surveys: ${indexedDBSurveys.length}`);
    console.log(`  Firebase surveys: ${firebaseSurveys.length}`);
    console.log(`  Match: ${match ? '✅' : '❌'}`);

    return {
      indexedDBCount: indexedDBSurveys.length,
      firebaseCount: firebaseSurveys.length,
      match
    };
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}






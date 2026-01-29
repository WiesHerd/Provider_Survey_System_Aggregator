/**
 * Upload Diagnostics Utility
 * 
 * Run this in the browser console to diagnose upload issues:
 * 
 * import { runUploadDiagnostics } from './utils/uploadDiagnostics';
 * runUploadDiagnostics();
 */

export async function runUploadDiagnostics(): Promise<void> {
  console.log('🔍 ========================================');
  console.log('🔍 UPLOAD DIAGNOSTICS');
  console.log('🔍 ========================================\n');

  const results: { check: string; status: '✅' | '❌' | '⚠️'; message: string }[] = [];

  // Check 1: Firebase Availability
  try {
    const { isFirebaseAvailable } = await import('../config/firebase');
    const isAvailable = isFirebaseAvailable();
    if (isAvailable) {
      results.push({ check: 'Firebase Available', status: '✅', message: 'Firebase is configured and available' });
    } else {
      results.push({ check: 'Firebase Available', status: '❌', message: 'Firebase is NOT available - check your configuration' });
    }
  } catch (error) {
    results.push({ check: 'Firebase Available', status: '❌', message: `Error checking Firebase: ${error}` });
  }

  // Check 2: User Authentication
  try {
    const { getFirebaseAuth } = await import('../config/firebase');
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;
    if (currentUser && currentUser.uid) {
      results.push({ 
        check: 'User Authentication', 
        status: '✅', 
        message: `User authenticated: ${currentUser.email} (${currentUser.uid})` 
      });
    } else {
      results.push({ 
        check: 'User Authentication', 
        status: '❌', 
        message: 'User is NOT authenticated - you must sign in to upload' 
      });
    }
  } catch (error) {
    results.push({ check: 'User Authentication', status: '❌', message: `Error checking auth: ${error}` });
  }

  // Check 3: Storage Mode
  try {
    const { getCurrentStorageMode, StorageMode } = await import('../config/storage');
    const { getDataService } = await import('../services/DataService');
    const mode = getCurrentStorageMode();
    const dataService = getDataService();
    const actualMode = (dataService as any).mode || mode;
    
    if (actualMode === StorageMode.FIREBASE) {
      results.push({ check: 'Storage Mode', status: '✅', message: 'Using Firebase (cloud storage)' });
    } else {
      results.push({ 
        check: 'Storage Mode', 
        status: '⚠️', 
        message: `Using IndexedDB (offline mode) - uploads will be saved locally, NOT in Firebase cloud storage!` 
      });
    }
    
    // Check if mode was switched during session
    if (mode === StorageMode.FIREBASE && actualMode === StorageMode.INDEXED_DB) {
      results.push({ 
        check: 'Storage Mode Switch', 
        status: '❌', 
        message: 'CRITICAL: Storage mode was switched from Firebase to IndexedDB during this session. Uploads are going to local storage, NOT Firebase!' 
      });
    }
  } catch (error) {
    results.push({ check: 'Storage Mode', status: '❌', message: `Error checking storage mode: ${error}` });
  }

  // Check 4: Firestore Database
  try {
    const { getFirebaseDb } = await import('../config/firebase');
    const db = getFirebaseDb();
    if (db) {
      results.push({ check: 'Firestore Database', status: '✅', message: 'Firestore database is initialized' });
    } else {
      results.push({ check: 'Firestore Database', status: '❌', message: 'Firestore database is NOT initialized' });
    }
  } catch (error) {
    results.push({ check: 'Firestore Database', status: '❌', message: `Error checking Firestore: ${error}` });
  }

  // Check 5: DataService
  try {
    const { getDataService } = await import('../services/DataService');
    const dataService = getDataService();
    results.push({ check: 'DataService', status: '✅', message: 'DataService is initialized' });
  } catch (error) {
    results.push({ check: 'DataService', status: '❌', message: `Error checking DataService: ${error}` });
  }

  // Check 6: Upload Queue Service
  try {
    const { getUploadQueueService } = await import('../services/UploadQueueService');
    const queue = getUploadQueueService();
    const activeJobs = queue.getActiveJobs();
    const allJobs = queue.getQueue();
    results.push({ 
      check: 'Upload Queue', 
      status: '✅', 
      message: `Upload queue is active (${activeJobs.length} active, ${allJobs.length} total jobs)` 
    });
    
    if (allJobs.length > 0) {
      console.log('\n📋 Current upload queue jobs:');
      allJobs.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.fileName} - ${job.status} (${job.progress}%)`);
        if (job.error) {
          console.log(`     Error: ${job.error}`);
        }
        if (job.status === 'completed' && job.surveyId) {
          console.log(`     Survey ID: ${job.surveyId}, Rows: ${job.rowCount}`);
        }
      });
    }
  } catch (error) {
    results.push({ check: 'Upload Queue', status: '❌', message: `Error checking upload queue: ${error}` });
  }
  
  // Check 7: Verify recent uploads are in Firebase (not just IndexedDB)
  try {
    const { getDataService } = await import('../services/DataService');
    const { getCurrentStorageMode, StorageMode } = await import('../config/storage');
    const dataService = getDataService();
    const storageMode = getCurrentStorageMode();
    
    if (storageMode === StorageMode.FIREBASE) {
      const allSurveys = await dataService.getAllSurveys();
      const recentSurveys = allSurveys
        .filter(s => {
          const uploadDate = s.uploadDate instanceof Date ? s.uploadDate : new Date(s.uploadDate);
          const hoursAgo = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60);
          return hoursAgo < 24; // Surveys uploaded in last 24 hours
        })
        .slice(0, 5); // Check up to 5 recent surveys
      
      if (recentSurveys.length > 0) {
        console.log('\n🔍 Checking if recent surveys are in Firebase...');
        const { getFirebaseDb } = await import('../config/firebase');
        const { getFirebaseAuth } = await import('../config/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = getFirebaseDb();
        const auth = getFirebaseAuth();
        const userId = auth?.currentUser?.uid;
        
        if (db && userId) {
          let foundInFirebase = 0;
          let foundInIndexedDBOnly = 0;
          
          for (const survey of recentSurveys) {
            try {
              const surveyRef = doc(db, `users/${userId}/surveys/${survey.id}`);
              const surveySnap = await getDoc(surveyRef);
              if (surveySnap.exists()) {
                foundInFirebase++;
              } else {
                foundInIndexedDBOnly++;
                console.log(`  ⚠️ Survey "${survey.name}" (${survey.id}) is in IndexedDB but NOT in Firebase!`);
              }
            } catch (checkError) {
              console.warn(`  ⚠️ Could not check survey ${survey.id}:`, checkError);
            }
          }
          
          if (foundInIndexedDBOnly > 0) {
            results.push({ 
              check: 'Firebase Storage Verification', 
              status: '❌', 
              message: `CRITICAL: ${foundInIndexedDBOnly} recent survey(s) are in IndexedDB but NOT in Firebase! Uploads are going to local storage instead of cloud.` 
            });
          } else if (foundInFirebase > 0) {
            results.push({ 
              check: 'Firebase Storage Verification', 
              status: '✅', 
              message: `All ${foundInFirebase} recent survey(s) are confirmed in Firebase cloud storage` 
            });
          }
        }
      }
    }
  } catch (error) {
    results.push({ check: 'Firebase Storage Verification', status: '⚠️', message: `Could not verify: ${error}` });
  }

  // Print Results
  console.log('\n📊 DIAGNOSTIC RESULTS:\n');
  results.forEach(result => {
    console.log(`${result.status} ${result.check}: ${result.message}`);
  });

  // Summary
  const failed = results.filter(r => r.status === '❌');
  const warnings = results.filter(r => r.status === '⚠️');
  
  console.log('\n📋 SUMMARY:');
  console.log(`   ✅ Passed: ${results.filter(r => r.status === '✅').length}`);
  console.log(`   ⚠️  Warnings: ${warnings.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n❌ CRITICAL ISSUES FOUND:');
    failed.forEach(f => {
      console.log(`   - ${f.check}: ${f.message}`);
    });
    console.log('\n💡 These issues must be fixed before uploads will work.');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => {
      console.log(`   - ${w.check}: ${w.message}`);
    });
  }

  console.log('\n🔍 ========================================\n');
}

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).runUploadDiagnostics = runUploadDiagnostics;
  console.log('💡 Tip: Run uploadDiagnostics() in the console to check your Firebase setup');
}

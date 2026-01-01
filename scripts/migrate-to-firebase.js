/**
 * Quick Migration Script - Run in Browser Console
 * 
 * Copy and paste this entire script into your browser console to migrate surveys to Firebase
 */

(async function migrateToFirebase() {
  console.log('🚀 Starting Firebase Migration...');
  console.log('📋 Make sure Firebase is configured in .env.local');
  
  // Check if Firebase is available
  const { isFirebaseAvailable } = await import('../src/config/firebase');
  if (!isFirebaseAvailable()) {
    console.error('❌ Firebase is not configured. Please set up Firebase first.');
    console.log('📝 See FIREBASE_CLOUD_SETUP.md for setup instructions');
    return;
  }

  // Import migration function
  const { migrateSurveysToFirebase, verifyMigration } = await import('../src/utils/migrateToFirebase');
  
  // Run migration with progress updates
  console.log('🔄 Starting migration...');
  const result = await migrateSurveysToFirebase((progress) => {
    if (progress.status === 'migrating') {
      const percent = Math.round((progress.current / progress.total) * 100);
      console.log(`📊 ${percent}% - Migrating: ${progress.currentSurvey} (${progress.current}/${progress.total})`);
    }
  });

  // Show results
  console.log('\n📊 Migration Results:');
  console.log(`✅ Success: ${result.success}`);
  console.log(`📦 Migrated: ${result.migrated} surveys`);
  if (result.errors.length > 0) {
    console.log(`❌ Errors: ${result.errors.length}`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }

  // Verify migration
  console.log('\n🔍 Verifying migration...');
  const verification = await verifyMigration();
  console.log('📊 Verification Results:');
  console.log(`   IndexedDB: ${verification.indexedDBCount} surveys`);
  console.log(`   Firebase: ${verification.firebaseCount} surveys`);
  console.log(`   Match: ${verification.match ? '✅' : '❌'}`);

  if (result.success && verification.match) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Your surveys are now in Firebase cloud storage');
    console.log('🌐 Data is accessible from any device');
  } else {
    console.log('\n⚠️ Migration completed with issues. Please check the errors above.');
  }
})();






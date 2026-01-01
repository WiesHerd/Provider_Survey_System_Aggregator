/**
 * Firebase Upload Diagnostic Script
 * Run this in browser console to check Firebase setup
 */

console.log('🔍 Firebase Upload Diagnostic Check');
console.log('=====================================');

// Check 1: Environment variables
console.log('\n1. Environment Variables:');
const requiredVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_STORAGE_MODE'
];

requiredVars.forEach(varName => {
  const value = process?.env?.[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${varName.includes('KEY') || varName.includes('ID') ? '***' : value}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
  }
});

// Check 2: Firebase availability
console.log('\n2. Firebase Availability:');
try {
  const { isFirebaseAvailable, getFirebaseAuth, getFirebaseDb } = require('./src/config/firebase');
  const isAvailable = isFirebaseAvailable();
  console.log(`  ${isAvailable ? '✅' : '❌'} Firebase is ${isAvailable ? 'available' : 'NOT available'}`);
  
  if (isAvailable) {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    console.log(`  ✅ Auth instance: ${auth ? 'OK' : 'MISSING'}`);
    console.log(`  ✅ Firestore instance: ${db ? 'OK' : 'MISSING'}`);
  }
} catch (error) {
  console.log(`  ❌ Error checking Firebase: ${error.message}`);
}

// Check 3: Authentication status
console.log('\n3. Authentication Status:');
try {
  const { getFirebaseAuth } = require('./src/config/firebase');
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  
  if (currentUser) {
    console.log(`  ✅ User authenticated: ${currentUser.email}`);
    console.log(`  ✅ User ID: ${currentUser.uid}`);
  } else {
    console.log(`  ❌ User NOT authenticated`);
    console.log(`  ⚠️  You must sign in to upload surveys`);
  }
} catch (error) {
  console.log(`  ❌ Error checking auth: ${error.message}`);
}

// Check 4: Storage mode
console.log('\n4. Storage Mode:');
try {
  const { getDataService } = require('./src/services/DataService');
  const dataService = getDataService();
  const mode = dataService.getMode();
  console.log(`  Current mode: ${mode}`);
  console.log(`  ${mode === 'firebase' ? '✅' : '⚠️'} Using ${mode === 'firebase' ? 'Firebase/Firestore' : 'IndexedDB'}`);
} catch (error) {
  console.log(`  ❌ Error checking storage mode: ${error.message}`);
}

// Check 5: FirestoreService initialization
console.log('\n5. FirestoreService Status:');
try {
  const { FirestoreService } = require('./src/services/FirestoreService');
  const firestoreService = new FirestoreService();
  console.log(`  ✅ FirestoreService created`);
  
  // Try to check if initialized
  firestoreService.initialize().then(() => {
    console.log(`  ✅ FirestoreService initialized`);
  }).catch(error => {
    console.log(`  ❌ FirestoreService initialization failed: ${error.message}`);
  });
} catch (error) {
  console.log(`  ❌ Error creating FirestoreService: ${error.message}`);
}

console.log('\n=====================================');
console.log('💡 If you see errors above, fix them before uploading');
console.log('💡 Make sure REACT_APP_STORAGE_MODE=firebase is set');
console.log('💡 Make sure you are signed in (check Authentication tab in Firebase Console)');






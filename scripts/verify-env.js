/**
 * Verify Firebase Environment Variables
 * Run this to check if environment variables are loaded correctly
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Firebase Environment Variables...\n');

const requiredVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_STORAGE_MODE'
];

const optionalVars = [
  'REACT_APP_FIREBASE_MEASUREMENT_ID'
];

let allGood = true;

console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const displayValue = varName.includes('API_KEY') || varName.includes('APP_ID')
      ? `${value.substring(0, 10)}...` 
      : value;
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${varName}: MISSING`);
    allGood = false;
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value}`);
  } else {
    console.log(`  ⚠️  ${varName}: Not set (optional)`);
  }
});

console.log('\n📊 Storage Mode:');
const storageMode = process.env.REACT_APP_STORAGE_MODE;
if (storageMode === 'firebase') {
  console.log('  ✅ Using Firebase Firestore backend');
} else if (storageMode === 'indexeddb') {
  console.log('  ℹ️  Using IndexedDB (local storage)');
} else {
  console.log('  ⚠️  Storage mode not set, will auto-detect');
}

if (allGood) {
  console.log('\n✅ All required environment variables are set!');
  console.log('🚀 Your app is ready to use Firebase.');
} else {
  console.log('\n❌ Some required environment variables are missing.');
  console.log('📝 Make sure .env.local file exists and contains all required variables.');
  process.exit(1);
}


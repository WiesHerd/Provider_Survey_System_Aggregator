/**
 * Storage Location Checker Utility
 * 
 * Helps users determine where their survey data is stored
 * (IndexedDB or Firebase Firestore)
 */

import { getDataService } from '../../services/DataService';
import { StorageMode } from '../../config/storage';
import { isFirebaseAvailable } from '../../config/firebase';

export interface StorageLocationInfo {
  mode: StorageMode;
  location: 'IndexedDB' | 'Firebase Firestore' | 'Unknown';
  databaseName?: string;
  hasData: boolean;
  surveyCount: number;
  instructions: string[];
}

/**
 * Check where survey data is currently stored
 */
export async function checkStorageLocation(): Promise<StorageLocationInfo> {
  const dataService = getDataService();
  const mode = dataService.getMode();
  
  let location: 'IndexedDB' | 'Firebase Firestore' | 'Unknown';
  let databaseName: string | undefined;
  let hasData = false;
  let surveyCount = 0;
  const instructions: string[] = [];

  try {
    const surveys = await dataService.getAllSurveys();
    surveyCount = surveys.length;
    hasData = surveys.length > 0;
  } catch (error) {
    console.error('Error checking surveys:', error);
  }

  if (mode === StorageMode.FIREBASE) {
    location = 'Firebase Firestore';
    databaseName = 'Firestore Database';
    instructions.push('📍 Your data is stored in Firebase Firestore (cloud storage)');
    instructions.push('🔐 Data is user-scoped and requires authentication');
    instructions.push('');
    instructions.push('To view your data:');
    instructions.push('1. Go to https://console.firebase.google.com');
    instructions.push('2. Select your Firebase project');
    instructions.push('3. Navigate to Firestore Database');
    instructions.push('4. Look for: users/{yourUserId}/surveys');
    instructions.push('5. Look for: users/{yourUserId}/surveyData');
  } else {
    location = 'IndexedDB';
    databaseName = 'SurveyAggregatorDB';
    instructions.push('📍 Your data is stored in IndexedDB (browser storage)');
    instructions.push('💾 Data is stored locally in your browser');
    instructions.push('');
    instructions.push('To view your data:');
    instructions.push('1. Open Chrome DevTools (Press F12)');
    instructions.push('2. Go to the "Application" tab');
    instructions.push('3. Expand "Storage" → "IndexedDB"');
    instructions.push('4. Expand "SurveyAggregatorDB"');
    instructions.push('5. Check "surveys" object store for survey metadata');
    instructions.push('6. Check "surveyData" object store for survey rows');
    instructions.push('');
    instructions.push('⚠️ Note: IndexedDB data is browser-specific');
    instructions.push('   - Data is NOT synced across devices');
    instructions.push('   - Data is NOT backed up automatically');
    instructions.push('   - Clearing browser data will delete your surveys');
  }

  return {
    mode,
    location,
    databaseName,
    hasData,
    surveyCount,
    instructions
  };
}

/**
 * Display storage location info in console (for browser console use)
 */
export async function displayStorageLocation(): Promise<void> {
  const info = await checkStorageLocation();
  
  console.log('🔍 Survey Data Storage Location Check\n');
  console.log('═══════════════════════════════════════');
  console.log(`📦 Storage Mode: ${info.mode}`);
  console.log(`📍 Location: ${info.location}`);
  if (info.databaseName) {
    console.log(`🗄️  Database: ${info.databaseName}`);
  }
  console.log(`📊 Surveys Found: ${info.surveyCount}`);
  console.log(`✅ Has Data: ${info.hasData ? 'Yes' : 'No'}`);
  console.log('═══════════════════════════════════════\n');
  
  info.instructions.forEach(instruction => {
    console.log(instruction);
  });
  
  console.log('\n💡 Tip: You can also check the browser console on app load');
  console.log('   Look for messages like "📥 DataService: Getting all surveys from IndexedDB..."');
  console.log('   or "📥 DataService: Getting all surveys from Firestore..."');
}

/**
 * Quick check function for browser console
 * Usage: Just type checkStorage() in the browser console
 */
if (typeof window !== 'undefined') {
  (window as any).checkStorage = displayStorageLocation;
  (window as any).checkStorageLocation = checkStorageLocation;
}







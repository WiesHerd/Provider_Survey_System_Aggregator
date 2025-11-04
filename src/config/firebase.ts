/**
 * Firebase Configuration
 * 
 * Enterprise-grade Firebase initialization with error handling and validation.
 * Uses environment variables for security - never commit API keys to git.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

/**
 * Validates that all required Firebase environment variables are present
 * Returns false if any required keys are missing
 */
const validateFirebaseConfig = (): boolean => {
  const requiredKeys = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
  ];

  const missingKeys = requiredKeys.filter(key => !process.env[key]);

  if (missingKeys.length > 0) {
    console.warn('⚠️ Firebase environment variables not found');
    console.warn('📝 Create .env.local file with Firebase credentials');
    console.log('🔧 Missing keys:', missingKeys);
    return false;
  }

  console.log('✅ Firebase configuration loaded from environment variables');
  return true;
};

// Initialize Firebase only if configuration is valid
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const isConfigValid = validateFirebaseConfig();

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
}

/**
 * Check if Firebase is available and configured
 */
export const isFirebaseAvailable = (): boolean => {
  return app !== null && auth !== null && db !== null;
};

/**
 * Get Firebase auth instance
 * @throws Error if Firebase is not configured
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Check environment variables.');
  }
  return auth;
};

/**
 * Get Firestore instance
 * @throws Error if Firebase is not configured
 */
export const getFirebaseDb = (): Firestore => {
  if (!db) {
    throw new Error('Firestore not initialized. Check environment variables.');
  }
  return db;
};

export { app, auth, db };


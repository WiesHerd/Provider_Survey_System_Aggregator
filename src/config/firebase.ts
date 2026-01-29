/**
 * Firebase Configuration
 * 
 * Enterprise-grade Firebase initialization with error handling and validation.
 * Uses environment variables for security - never commit API keys to git.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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
 * AND validates their format for correctness
 * Returns object with validation result and error messages
 */
const validateFirebaseConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for missing values (including empty strings)
  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID?.trim();
  const storageBucket = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId = process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.REACT_APP_FIREBASE_APP_ID?.trim();

  // Check for missing or empty values
  if (!apiKey) errors.push('REACT_APP_FIREBASE_API_KEY is missing or empty');
  if (!authDomain) errors.push('REACT_APP_FIREBASE_AUTH_DOMAIN is missing or empty');
  if (!projectId) errors.push('REACT_APP_FIREBASE_PROJECT_ID is missing or empty');
  if (!storageBucket) errors.push('REACT_APP_FIREBASE_STORAGE_BUCKET is missing or empty');
  if (!messagingSenderId) errors.push('REACT_APP_FIREBASE_MESSAGING_SENDER_ID is missing or empty');
  if (!appId) errors.push('REACT_APP_FIREBASE_APP_ID is missing or empty');

  // Validate formats if values are present
  if (apiKey && apiKey.length < 30) {
    errors.push('REACT_APP_FIREBASE_API_KEY format appears invalid (too short)');
  }

  if (authDomain && !authDomain.includes('.firebaseapp.com') && !authDomain.includes('firebaseio.com')) {
    errors.push('REACT_APP_FIREBASE_AUTH_DOMAIN should contain .firebaseapp.com or .firebaseio.com');
  }

  if (projectId && (projectId.includes(' ') || projectId.includes('_'))) {
    errors.push('REACT_APP_FIREBASE_PROJECT_ID format appears invalid (should use hyphens, not spaces/underscores)');
  }

  if (
    storageBucket &&
    !storageBucket.includes('.appspot.com') &&
    !storageBucket.includes('.firebasestorage.app') &&
    storageBucket !== ''
  ) {
    errors.push('REACT_APP_FIREBASE_STORAGE_BUCKET should contain .appspot.com or .firebasestorage.app');
  }

  if (messagingSenderId && !/^\d+$/.test(messagingSenderId)) {
    errors.push('REACT_APP_FIREBASE_MESSAGING_SENDER_ID should be numeric');
  }

  if (appId && !appId.startsWith('1:')) {
    errors.push('REACT_APP_FIREBASE_APP_ID format appears invalid (should start with "1:")');
  }

  // Report results
  if (errors.length > 0) {
    console.warn('⚠️ Firebase configuration validation failed');
    console.warn('📝 Create .env.local file with valid Firebase credentials');
    console.warn('🔧 Validation errors:');
    errors.forEach(error => console.warn(`   - ${error}`));
    return { valid: false, errors };
  }

  console.log('✅ Firebase configuration validated successfully');
  return { valid: true, errors: [] };
};

// Initialize Firebase only if configuration is valid
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const configValidation = validateFirebaseConfig();

if (configValidation.valid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');

    // App Check configuration
    const appCheckSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    
    if (process.env.NODE_ENV === 'production') {
      // PRODUCTION: App Check is REQUIRED
      if (!appCheckSiteKey) {
        console.error('❌ CRITICAL: App Check site key missing in production');
        console.error('🔧 Set REACT_APP_RECAPTCHA_SITE_KEY in environment variables');
        throw new Error('App Check is required in production but REACT_APP_RECAPTCHA_SITE_KEY is not set');
      }

      try {
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });

        if (!appCheck) {
          throw new Error('App Check initialization returned null');
        }

        console.log('✅ Firebase App Check initialized and enforced (PRODUCTION)');
      } catch (appCheckError) {
        console.error('❌ CRITICAL: App Check initialization failed in production');
        console.error('This is a security requirement and upload will fail');
        throw appCheckError;
      }
    } else if (appCheckSiteKey) {
      // DEVELOPMENT: App Check is OPTIONAL but will use it if configured
      try {
        // Set debug token if provided
        const debugToken = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
        if (debugToken) {
          (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
          console.log('🧪 App Check debug token set for development');
        }

        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        console.log('✅ Firebase App Check initialized (DEVELOPMENT)');
      } catch (appCheckError) {
        console.warn('⚠️ Firebase App Check initialization failed in development:', appCheckError);
        console.warn('This is not critical in development but should be fixed for production');
      }
    } else {
      console.log('ℹ️ App Check not configured (development only)');
    }
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


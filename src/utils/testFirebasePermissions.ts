/**
 * Test Firebase Permissions
 * 
 * This utility helps diagnose Firebase permission issues by testing
 * write permissions directly.
 */

import { getFirebaseDb, getFirebaseAuth, isFirebaseAvailable } from '../config/firebase';
import { doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';

export async function testFirebaseWritePermissions(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  if (!isFirebaseAvailable()) {
    return {
      success: false,
      error: 'Firebase is not available'
    };
  }

  const db = getFirebaseDb();
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;

  if (!user || !user.uid) {
    return {
      success: false,
      error: 'User is not authenticated. Please sign in.',
      details: {
        hasAuth: !!auth,
        hasUser: !!user,
        uid: user?.uid
      }
    };
  }

  const userId = user.uid;
  const testDocId = `_permission_test_${Date.now()}`;
  const testPath = `users/${userId}/surveys/${testDocId}`;

  try {
    console.log('🧪 Testing Firebase write permissions...', {
      userId,
      email: user.email,
      path: testPath
    });

    // Try to write a test document
    const testRef = doc(db, testPath);
    await setDoc(testRef, {
      test: true,
      timestamp: Timestamp.now(),
      userId: userId,
      email: user.email
    });

    console.log('✅ Test write succeeded');

    // Verify we can read it back
    const snapshot = await getDoc(testRef);
    if (!snapshot.exists()) {
      return {
        success: false,
        error: 'Write succeeded but document not found on read',
        details: { path: testPath }
      };
    }

    console.log('✅ Test read succeeded');

    // Clean up - delete the test document
    await deleteDoc(testRef);
    console.log('✅ Test document deleted');

    return {
      success: true,
      details: {
        userId,
        email: user.email,
        path: testPath,
        message: 'All permission tests passed!'
      }
    };
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || String(error);

    console.error('❌ Permission test failed:', {
      error: errorMessage,
      code: errorCode,
      userId,
      path: testPath,
      authenticated: !!user
    });

    return {
      success: false,
      error: errorMessage,
      details: {
        code: errorCode,
        userId,
        path: testPath,
        authenticated: !!user,
        email: user.email,
        suggestion: errorCode === 'permission-denied' 
          ? 'Security rules are blocking writes. Deploy rules: firebase deploy --only firestore:rules'
          : 'Check Firebase configuration and authentication'
      }
    };
  }
}

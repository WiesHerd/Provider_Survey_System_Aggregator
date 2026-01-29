/**
 * Firebase Permissions Diagnostic Tool
 * 
 * Helps diagnose why Firebase permission errors are occurring.
 * Run this in the browser console to get detailed diagnostics.
 */

import { getFirebaseAuth, getFirebaseDb, isFirebaseAvailable } from '../config/firebase';
import { doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';

export async function diagnoseFirebasePermissions(): Promise<{
  success: boolean;
  diagnostics: {
    firebaseAvailable: boolean;
    authenticated: boolean;
    userId?: string;
    email?: string;
    rulesDeployed?: boolean;
    pathMatch?: boolean;
    testWrite?: boolean;
    error?: string;
    suggestions: string[];
  };
}> {
  const diagnostics: any = {
    firebaseAvailable: false,
    authenticated: false,
    suggestions: []
  };

  // Check 1: Firebase available
  diagnostics.firebaseAvailable = isFirebaseAvailable();
  if (!diagnostics.firebaseAvailable) {
    diagnostics.suggestions.push('Firebase is not available. Check your .env.local file for Firebase configuration.');
    return { success: false, diagnostics };
  }

  // Check 2: User authenticated
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  diagnostics.authenticated = !!user && !!user.uid;
  
  if (!diagnostics.authenticated || !user || !user.uid) {
    diagnostics.suggestions.push('You are not signed in. Click the user menu (top-right) and sign in.');
    return { success: false, diagnostics };
  }

  // TypeScript: user is guaranteed to be non-null here due to check above
  diagnostics.userId = user.uid;
  diagnostics.email = user.email || undefined;

  // Check 3: Test write permission
  const db = getFirebaseDb();
  if (!db) {
    diagnostics.suggestions.push('Firestore database not initialized. Check Firebase configuration.');
    return { success: false, diagnostics };
  }

  const testDocId = `_diagnostic_test_${Date.now()}`;
  const testPath = `users/${user.uid}/surveys/${testDocId}`;
  const testRef = doc(db, testPath);

  try {
    // Try to write
    await setDoc(testRef, {
      test: true,
      timestamp: Timestamp.now(),
      userId: user.uid,
      diagnostic: true
    });
    diagnostics.testWrite = true;

    // Try to read it back
    const snapshot = await getDoc(testRef);
    if (snapshot.exists()) {
      diagnostics.rulesDeployed = true;
      diagnostics.pathMatch = true;
      
      // Clean up
      await deleteDoc(testRef);
      
      return {
        success: true,
        diagnostics: {
          ...diagnostics,
          suggestions: ['All checks passed! Firebase permissions are working correctly.']
        }
      };
    } else {
      diagnostics.rulesDeployed = false;
      diagnostics.suggestions.push('Write succeeded but document not found on read. This indicates a rules issue.');
      return { success: false, diagnostics };
    }
  } catch (error: any) {
    diagnostics.testWrite = false;
    diagnostics.error = error?.message || String(error);
    const errorCode = error?.code || 'unknown';

    if (errorCode === 'permission-denied') {
      diagnostics.rulesDeployed = false;
      diagnostics.suggestions.push(
        '❌ CRITICAL: Security rules are blocking writes. ' +
        'SOLUTION: Deploy security rules by running: firebase deploy --only firestore:rules'
      );
      diagnostics.suggestions.push(
        'If rules are already deployed, try: 1) Sign out and sign back in, 2) Clear browser cache, 3) Check Firebase Console → Firestore → Rules tab'
      );
    } else if (errorCode === 'unauthenticated') {
      diagnostics.suggestions.push('Authentication token expired. Sign out and sign back in.');
    } else {
      diagnostics.suggestions.push(`Unexpected error: ${errorCode}. Check browser console for details.`);
    }

    return { success: false, diagnostics };
  }
}

/**
 * Run diagnostics and log results to console
 */
export async function runFirebaseDiagnostics(): Promise<void> {
  console.log('🔍 Running Firebase Permissions Diagnostics...\n');
  
  const result = await diagnoseFirebasePermissions();
  
  console.log('📊 DIAGNOSTIC RESULTS:');
  console.log('====================');
  console.log(`Firebase Available: ${result.diagnostics.firebaseAvailable ? '✅' : '❌'}`);
  console.log(`User Authenticated: ${result.diagnostics.authenticated ? '✅' : '❌'}`);
  
  if (result.diagnostics.userId) {
    console.log(`User ID: ${result.diagnostics.userId}`);
  }
  if (result.diagnostics.email) {
    console.log(`Email: ${result.diagnostics.email}`);
  }
  console.log(`Rules Deployed: ${result.diagnostics.rulesDeployed ? '✅' : '❌'}`);
  console.log(`Test Write: ${result.diagnostics.testWrite ? '✅' : '❌'}`);
  
  if (result.diagnostics.error) {
    console.log(`Error: ${result.diagnostics.error}`);
  }
  
  console.log('\n💡 SUGGESTIONS:');
  result.diagnostics.suggestions.forEach((suggestion, i) => {
    console.log(`${i + 1}. ${suggestion}`);
  });
  
  console.log('\n====================\n');
  
  if (result.success) {
    console.log('✅ All checks passed! Firebase permissions are working correctly.');
  } else {
    console.log('❌ Issues detected. Follow the suggestions above to fix.');
  }
}

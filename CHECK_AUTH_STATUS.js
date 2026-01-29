/**
 * Quick Auth Status Check
 * 
 * Run this in your browser console (F12) to check if you're authenticated:
 * 
 * Copy and paste this entire file into the console, or run:
 * 
 * (async () => {
 *   const { getFirebaseAuth } = await import('./src/config/firebase');
 *   const auth = getFirebaseAuth();
 *   const user = auth?.currentUser;
 *   
 *   console.log('🔍 Authentication Status:');
 *   console.log('  - Auth object exists:', !!auth);
 *   console.log('  - Current user exists:', !!user);
 *   console.log('  - User ID:', user?.uid || 'NOT SET');
 *   console.log('  - Email:', user?.email || 'NOT SET');
 *   console.log('  - Email verified:', user?.emailVerified || false);
 *   
 *   if (!user) {
 *     console.error('❌ NOT AUTHENTICATED - You must sign in to upload surveys!');
 *     console.log('👉 Action: Click the user menu in the top-right corner and sign in');
 *   } else {
 *     console.log('✅ AUTHENTICATED - You should be able to upload surveys');
 *   }
 * })();
 */

// For direct browser console use:
(async () => {
  try {
    // Try to access Firebase auth
    const firebaseModule = await import('./src/config/firebase.js');
    const { getFirebaseAuth, isFirebaseAvailable } = firebaseModule;
    
    console.log('🔍 ========================================');
    console.log('🔍 AUTHENTICATION STATUS CHECK');
    console.log('🔍 ========================================\n');
    
    // Check Firebase availability
    const firebaseAvailable = isFirebaseAvailable();
    console.log('Firebase Available:', firebaseAvailable ? '✅ YES' : '❌ NO');
    
    if (!firebaseAvailable) {
      console.error('\n❌ Firebase is not available. Check your .env.local configuration.');
      return;
    }
    
    // Check authentication
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    
    console.log('\n📋 Authentication Details:');
    console.log('  - Auth object exists:', !!auth ? '✅' : '❌');
    console.log('  - Current user exists:', !!user ? '✅' : '❌');
    
    if (user) {
      console.log('  - User ID:', user.uid);
      console.log('  - Email:', user.email || 'NOT SET');
      console.log('  - Email verified:', user.emailVerified ? '✅' : '❌');
      console.log('  - Display name:', user.displayName || 'NOT SET');
      
      console.log('\n✅ YOU ARE AUTHENTICATED');
      console.log('   You should be able to upload surveys to Firebase.');
      console.log('   If uploads are still failing, check:');
      console.log('   1. Security rules are deployed (run: firebase deploy --only firestore:rules)');
      console.log('   2. Browser console for detailed error messages');
    } else {
      console.log('\n❌ YOU ARE NOT AUTHENTICATED');
      console.log('   You must sign in to upload surveys to Firebase.');
      console.log('\n👉 TO FIX:');
      console.log('   1. Look at the top-right corner of the app');
      console.log('   2. Click the user menu (your email or "Sign In" button)');
      console.log('   3. Sign in with your email and password');
      console.log('   4. Try uploading again');
    }
    
    console.log('\n🔍 ========================================');
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
    console.log('\n👉 Try opening the browser console (F12) and look for authentication errors');
  }
})();

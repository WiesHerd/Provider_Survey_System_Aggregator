# Diagnose Firebase Permission Errors

## Quick Diagnostic Steps

### Step 1: Check Browser Console
Open your browser console (F12 → Console tab) and look for these messages:

**Good Signs:**
- `✅ Diagnostic: User authenticated: your-email@example.com`
- `✅ Write permission test PASSED`
- `✅ Survey saved to Firebase`

**Bad Signs:**
- `❌ CRITICAL: User not authenticated`
- `❌ Write permission test FAILED`
- `Firebase permission error: Missing or insufficient permissions`

### Step 2: Run Console Diagnostic
Copy and paste this into your browser console (F12 → Console):

```javascript
(async () => {
  try {
    // Get Firebase auth
    const { getFirebaseAuth, isFirebaseAvailable, getFirebaseDb } = await import('./src/config/firebase.js');
    
    console.log('🔍 ========================================');
    console.log('🔍 FIREBASE AUTH DIAGNOSTIC');
    console.log('🔍 ========================================\n');
    
    // Check Firebase availability
    const available = isFirebaseAvailable();
    console.log('Firebase Available:', available ? '✅ YES' : '❌ NO');
    
    if (!available) {
      console.error('❌ Firebase is not configured. Check your .env.local file.');
      return;
    }
    
    // Check authentication
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    
    console.log('\n📋 Authentication Status:');
    console.log('  - Auth object exists:', !!auth ? '✅' : '❌');
    console.log('  - Current user exists:', !!user ? '✅' : '❌');
    
    if (user) {
      console.log('  - User ID:', user.uid);
      console.log('  - Email:', user.email || 'NOT SET');
      console.log('  - Email verified:', user.emailVerified ? '✅' : '❌');
      
      // Test write permission
      console.log('\n🔍 Testing write permission...');
      try {
        const db = getFirebaseDb();
        const { doc, setDoc, deleteDoc, Timestamp } = await import('firebase/firestore');
        
        const testPath = `users/${user.uid}/surveys/_permission_test_${Date.now()}`;
        const testRef = doc(db, testPath);
        
        await setDoc(testRef, {
          test: true,
          timestamp: Timestamp.now(),
          userId: user.uid
        });
        
        await deleteDoc(testRef);
        
        console.log('✅ Write permission test PASSED');
        console.log('   Your authentication is working correctly!');
        console.log('\n👉 If uploads are still failing:');
        console.log('   1. Sign out and sign back in to refresh auth token');
        console.log('   2. Check browser console for detailed error messages');
        console.log('   3. Verify security rules: firebase deploy --only firestore:rules');
      } catch (writeError) {
        console.error('❌ Write permission test FAILED');
        console.error('   Error:', writeError.message);
        console.error('   Code:', writeError.code || 'unknown');
        console.error('   Path:', `users/${user.uid}/surveys/...`);
        console.log('\n👉 TO FIX:');
        console.log('   1. Sign out and sign back in (top-right menu)');
        console.log('   2. Deploy security rules: firebase deploy --only firestore:rules');
        console.log('   3. Check Firebase Console → Firestore → Rules tab');
      }
    } else {
      console.error('\n❌ YOU ARE NOT AUTHENTICATED');
      console.log('\n👉 TO FIX:');
      console.log('   1. Click the user menu in the top-right corner');
      console.log('   2. Click "Sign In"');
      console.log('   3. Enter your email and password');
      console.log('   4. Try uploading again');
    }
    
    console.log('\n🔍 ========================================');
  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
    console.log('\n👉 Try opening the browser console (F12) and look for authentication errors');
  }
})();
```

### Step 3: Check Auth Token
Your auth token might be stale. Try this:

1. **Sign Out:**
   - Click your user menu (top-right corner)
   - Click "Sign Out"
   - Wait for confirmation

2. **Sign Back In:**
   - Click "Sign In"
   - Enter your email and password
   - Wait for confirmation

3. **Try Upload Again:**
   - After signing back in, try uploading your survey
   - Check the console for the new diagnostic messages

### Step 4: Verify Security Rules
Make sure security rules are deployed:

```bash
firebase deploy --only firestore:rules
```

Then verify in Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select your project: **Provider Survey Aggregator**
3. Go to **Firestore Database** → **Rules** tab
4. You should see your security rules

## Common Issues & Solutions

### Issue: "User not authenticated"
**Solution:** Sign in using the user menu (top-right corner)

### Issue: "Write permission test FAILED"
**Solution:** 
1. Sign out and sign back in (refreshes auth token)
2. Deploy security rules: `firebase deploy --only firestore:rules`
3. Check that `userId` matches `auth.uid` in console logs

### Issue: "Path mismatch"
**Solution:** This indicates a userId sync issue. The improved diagnostics will show the exact mismatch. Usually fixed by signing out and back in.

### Issue: Rules deployed but still failing
**Solution:**
1. Sign out and sign back in (most common fix)
2. Clear browser cache and cookies
3. Check browser console for detailed error messages
4. Verify your Firebase project ID in `.env.local` matches the deployed project

## Still Not Working?

If you've tried all the above:
1. Check the browser console (F12) for the detailed diagnostic output
2. Look for messages showing `userId`, `authUid`, `pathMatches`, etc.
3. Share the console output and I can help debug further

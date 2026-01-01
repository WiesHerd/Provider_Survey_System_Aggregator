// Run this in your browser console to check storage mode
// Copy and paste this entire script into the browser console

(async function checkStorageMode() {
  console.log('🔍 Checking storage mode...\n');
  
  // Check IndexedDB
  try {
    const dbName = 'SurveyAggregatorDB';
    const request = indexedDB.open(dbName);
    
    request.onsuccess = () => {
      const db = request.result;
      const objectStores = Array.from(db.objectStoreNames);
      
      console.log('✅ IndexedDB Found:', dbName);
      console.log('📦 Object Stores:', objectStores);
      
      if (objectStores.length > 0) {
        console.log('\n🎯 Storage Mode: INDEXED_DB (Browser-based storage)');
        console.log('📍 Location: Browser IndexedDB');
        console.log('\nTo view data:');
        console.log('1. Open Chrome DevTools (F12)');
        console.log('2. Go to Application tab → Storage → IndexedDB');
        console.log('3. Expand "SurveyAggregatorDB"');
        console.log('4. Check "surveys" and "surveyData" object stores');
      } else {
        console.log('⚠️ IndexedDB exists but has no object stores');
      }
      
      db.close();
    };
    
    request.onerror = () => {
      console.log('❌ IndexedDB not found or not accessible');
      checkFirebase();
    };
    
    request.onupgradeneeded = () => {
      console.log('⚠️ IndexedDB needs upgrade - database may not exist yet');
    };
  } catch (error) {
    console.log('❌ Error checking IndexedDB:', error);
    checkFirebase();
  }
  
  // Check Firebase (if available)
  function checkFirebase() {
    if (typeof window !== 'undefined' && window.firebase) {
      console.log('\n✅ Firebase SDK detected');
      console.log('🎯 Storage Mode: FIREBASE (Cloud storage)');
      console.log('📍 Location: Firebase Firestore Database');
      console.log('\nTo view data:');
      console.log('1. Go to Firebase Console: https://console.firebase.google.com');
      console.log('2. Select your project');
      console.log('3. Go to Firestore Database');
      console.log('4. Navigate to: users/{userId}/surveys');
      console.log('5. Navigate to: users/{userId}/surveyData');
    } else {
      console.log('\n❌ Firebase SDK not detected');
      console.log('🎯 Storage Mode: INDEXED_DB (Default)');
    }
  }
  
  // Wait a bit for IndexedDB check
  await new Promise(resolve => setTimeout(resolve, 500));
})();







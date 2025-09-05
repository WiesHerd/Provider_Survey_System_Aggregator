// Clear all data from IndexedDB
const clearIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('SurveyAggregatorDB');
    
    request.onsuccess = () => {
      console.log('✅ IndexedDB cleared successfully');
      resolve();
    };
    
    request.onerror = () => {
      console.error('❌ Error clearing IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onblocked = () => {
      console.log('⚠️ IndexedDB clear blocked - close all browser tabs and try again');
      reject(new Error('IndexedDB clear blocked'));
    };
  });
};

// Run the clear function
clearIndexedDB()
  .then(() => {
    console.log('🎉 All data cleared! You can now re-upload your surveys.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to clear IndexedDB:', error);
    process.exit(1);
  });
